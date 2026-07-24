import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoricalCanvas } from '../../src/components/CategoricalCanvas';
import type { CategoricalProjection } from '../../src/charts/categorical/types';
import type { ViewSpec } from '../../src/domain/model';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];
    static sceneElements: unknown[] = [];
    static renderError: Error | undefined;

    readonly options = vi.fn((): this => this);
    readonly render = vi.fn((): Promise<void> =>
      Chart.renderError === undefined ? Promise.resolve() : Promise.reject(Chart.renderError),
    );
    readonly on = vi.fn((name: string, listener: (event: unknown) => void): this => {
      void name;
      void listener;
      return this;
    });
    readonly off = vi.fn((): this => this);
    readonly finishAnimation = vi.fn((): void => undefined);
    readonly getContext = vi.fn(() => ({
      animations: [{ finish: this.finishAnimation }],
      canvas: {
        document: { getElementsByClassName: () => Chart.sceneElements },
      },
    }));
    readonly destroy = vi.fn((): void => undefined);

    constructor(readonly config: unknown) {
      Chart.instances.push(this);
    }
  }
  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));

const projection = [
  {
    nodeId: 'a',
    label: 'Alpha',
    amount: 10,
    kind: 'positive',
    sourceIds: ['a'],
    locked: false,
    order: 0,
  },
  {
    nodeId: 'b',
    label: 'Beta',
    amount: 20,
    kind: 'positive',
    sourceIds: ['b'],
    locked: false,
    order: 1,
  },
  {
    nodeId: 'c',
    label: 'Gamma',
    amount: -5,
    kind: 'negative',
    sourceIds: ['c'],
    locked: false,
    order: 2,
  },
] as const satisfies CategoricalProjection;

const viewSpec = {
  schemaVersion: '2.0.0',
  datasetId: 'categorical-canvas-fixture',
  chartType: 'bar',
  revision: 0,
  rootOrder: ['a', 'b', 'c'],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
} as const satisfies ViewSpec;

type MockChart = InstanceType<typeof g2Mock.Chart>;

function emit(chart: MockChart, name: string, event: unknown): void {
  const listener = chart.on.mock.calls.find(([registered]) => registered === name)?.[1];
  if (listener === undefined) {
    throw new Error(`Missing mocked G2 listener for ${name}`);
  }
  listener(event);
}

function appendCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  Object.defineProperties(canvas, {
    hasPointerCapture: { configurable: true, value: () => true },
    releasePointerCapture: { configurable: true, value: vi.fn() },
    setPointerCapture: { configurable: true, value: vi.fn() },
  });
  screen.getByTestId('tellplot-chart').append(canvas);
  return canvas;
}

function elementEvent(
  nodeId: string,
  pointerId: number,
  x: number,
  y: number,
  bounds: { readonly min: readonly [number, number]; readonly max: readonly [number, number] },
): unknown {
  return {
    pointerId,
    canvas: { x, y },
    data: { data: { nodeId } },
    target: { getBounds: () => bounds },
  };
}

beforeEach(() => {
  g2Mock.Chart.instances = [];
  g2Mock.Chart.renderError = undefined;
  g2Mock.Chart.sceneElements = [
    {
      __data__: { data: { nodeId: 'a' } },
      getBounds: () => ({ min: [10, 20], max: [90, 60] }),
    },
    {
      __data__: { data: { nodeId: 'b' } },
      getBounds: () => ({ min: [10, 100], max: [90, 140] }),
    },
    {
      __data__: { data: { nodeId: 'c' } },
      getBounds: () => ({ min: [10, 180], max: [90, 220] }),
    },
  ];
});

describe('CategoricalCanvas', () => {
  it('uses Y scene bounds for a bar drag and emits one semantic move target', async () => {
    const onMove = vi.fn(() => true);
    const onInteractionChange = vi.fn();
    render(
      <CategoricalCanvas
        chartType="bar"
        projection={projection}
        viewSpec={viewSpec}
        onInteractionChange={onInteractionChange}
        onMove={onMove}
      />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    appendCanvas();
    const chart = g2Mock.Chart.instances[0] as MockChart;
    emit(
      chart,
      'element:pointerdown',
      elementEvent('b', 7, 40, 120, { min: [10, 100], max: [90, 140] }),
    );
    emit(chart, 'plot:pointermove', { pointerId: 7, canvas: { x: 900, y: 160 } });
    emit(chart, 'plot:pointerup', { pointerId: 7, canvas: { x: -900, y: 160 } });

    expect(onMove).toHaveBeenCalledWith('b', { containerId: 'root', index: 2 }, 'direct');
    expect(onInteractionChange).toHaveBeenCalledWith({
      state: 'dragging',
      itemId: 'b',
      target: { nodeId: 'c', placement: 'after' },
    });
  });

  it('uses all visible G2 category bounds to resolve a cross-group drag target', async () => {
    const onMove = vi.fn(() => true);
    const groupedView: ViewSpec = {
      ...viewSpec,
      rootOrder: ['pair', 'c'],
      groups: { pair: { id: 'pair', label: 'Pair', childIds: ['a', 'b'] } },
    };
    render(
      <CategoricalCanvas
        chartType="bar"
        projection={projection}
        viewSpec={groupedView}
        onMove={onMove}
      />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    appendCanvas();
    const chart = g2Mock.Chart.instances[0] as MockChart;
    emit(
      chart,
      'element:pointerdown',
      elementEvent('b', 17, 40, 120, { min: [10, 100], max: [90, 140] }),
    );
    emit(chart, 'plot:pointermove', { pointerId: 17, canvas: { x: 40, y: 160 } });
    emit(chart, 'plot:pointerup', { pointerId: 17, canvas: { x: 40, y: 160 } });

    expect(onMove).toHaveBeenCalledWith('b', { containerId: 'root', index: 2 }, 'direct');
  });

  it('cancels a stale render revision instead of committing old scene bounds', async () => {
    const onMove = vi.fn(() => true);
    const onCancel = vi.fn();
    const rendered = render(
      <CategoricalCanvas
        chartType="bar"
        projection={projection}
        viewSpec={viewSpec}
        onCancel={onCancel}
        onMove={onMove}
      />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    appendCanvas();
    const chart = g2Mock.Chart.instances[0] as MockChart;
    emit(
      chart,
      'element:pointerdown',
      elementEvent('b', 8, 40, 120, { min: [10, 100], max: [90, 140] }),
    );
    rendered.rerender(
      <CategoricalCanvas
        chartType="bar"
        projection={[projection[0], projection[2], projection[1]]}
        viewSpec={{ ...viewSpec, revision: 1, rootOrder: ['a', 'c', 'b'] }}
        onCancel={onCancel}
        onMove={onMove}
      />,
    );
    emit(chart, 'plot:pointermove', { pointerId: 8, canvas: { x: 40, y: 160 } });
    emit(chart, 'plot:pointerup', { pointerId: 8, canvas: { x: 40, y: 160 } });

    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledWith('cancelled');
  });

  it('keeps the accessible summary and reports only a structured render failure', async () => {
    const onRenderError = vi.fn();
    g2Mock.Chart.renderError = new Error('sensitive renderer detail');
    render(
      <CategoricalCanvas
        chartType="column"
        projection={projection}
        viewSpec={{ ...viewSpec, chartType: 'column' }}
        onRenderError={onRenderError}
      />,
    );

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('CHART_RENDER_ERROR');
    expect(alert.textContent).toContain('/chart');
    expect(alert.textContent).not.toContain('sensitive renderer detail');
    expect(screen.getByRole('region', { name: '图表摘要' }).textContent).toContain('Alpha');
    expect(onRenderError).toHaveBeenCalledWith({
      code: 'CHART_RENDER_ERROR',
      path: '/chart',
    });
  });

  it('selects on click but rejects a pinned drag with a stable reason', async () => {
    const onCancel = vi.fn();
    const onMove = vi.fn(() => true);
    const onSelectNode = vi.fn();
    const pinnedProjection: CategoricalProjection = [
      projection[0],
      { ...projection[1], locked: true },
      projection[2],
    ];
    render(
      <CategoricalCanvas
        chartType="bar"
        projection={pinnedProjection}
        viewSpec={{ ...viewSpec, pinnedItemIds: ['b'] }}
        onCancel={onCancel}
        onMove={onMove}
        onSelectNode={onSelectNode}
      />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    appendCanvas();
    const chart = g2Mock.Chart.instances[0] as MockChart;
    emit(
      chart,
      'element:pointerdown',
      elementEvent('a', 21, 40, 40, { min: [10, 20], max: [90, 60] }),
    );
    emit(chart, 'plot:pointerup', { pointerId: 21, canvas: { x: 40, y: 40 } });
    expect(onSelectNode).toHaveBeenCalledWith('a');

    emit(
      chart,
      'element:pointerdown',
      elementEvent('b', 22, 40, 120, { min: [10, 100], max: [90, 140] }),
    );
    emit(chart, 'plot:pointermove', { pointerId: 22, canvas: { x: 40, y: 160 } });
    expect(onCancel).toHaveBeenCalledWith('item-locked');
    expect(onMove).not.toHaveBeenCalled();
  });
});
