import { fireEvent } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChartConfig, ViewSpec } from '@tellplot/core';
import {
  createChartSurface,
  type ChartSurfaceCallbacks,
  type ChartSurfaceState,
} from '../../src/editor/chartSurface';
import { editorMessages } from '../../src/editor/messages';
import type { ChartRenderIssue } from '../../src/editor/types';

const runtimeMock = vi.hoisted(() => {
  interface RuntimeOptions {
    readonly events: readonly {
      readonly name: string;
      readonly listener: (event: unknown) => void;
    }[];
    readonly onRenderSettled: (settlement: {
      readonly value: unknown;
      readonly status: 'success' | 'failure';
      readonly latest: boolean;
      readonly generation?: number;
      readonly origin?: 'render' | 'resize';
      readonly geometryAuthoritative?: boolean;
    }) => void;
    readonly onGeometryInvalidated?: (invalidation: {
      readonly generation: number;
      readonly reason: 'render' | 'resize' | 'dispose';
    }) => void;
  }

  interface RuntimeRecord {
    readonly options: RuntimeOptions;
    readonly requests: unknown[];
    context: unknown;
    generation: number;
    structuralIdentity: unknown;
    readonly dismissTooltip: ReturnType<typeof vi.fn>;
  }

  const records: RuntimeRecord[] = [];
  const create = vi.fn((options: RuntimeOptions) => {
    const record: RuntimeRecord = {
      options,
      requests: [],
      context: undefined,
      generation: 0,
      structuralIdentity: undefined,
      dismissTooltip: vi.fn(),
    };
    records.push(record);
    return {
      request: vi.fn((request: unknown) => {
        const details = request as {
          readonly structuralIdentity?: unknown;
          readonly invalidateGeometry?: boolean;
        };
        const identity = details.structuralIdentity;
        if (identity !== record.structuralIdentity) {
          record.structuralIdentity = identity;
          record.generation += 1;
        }
        if (details.invalidateGeometry !== false) {
          record.options.onGeometryInvalidated?.({
            generation: record.generation,
            reason: 'render',
          });
        }
        record.requests.push(request);
      }),
      finishAnimations: vi.fn(),
      dismissTooltip: record.dismissTooltip,
      getContext: vi.fn(() => record.context),
      getGeneration: vi.fn(() => record.generation),
      dispose: vi.fn(() => {
        record.generation += 1;
        record.options.onGeometryInvalidated?.({
          generation: record.generation,
          reason: 'dispose',
        });
      }),
    };
  });

  return { create, records };
});

vi.mock('../../src/rendering/g2/chartRuntime', () => ({
  createG2ChartRuntime: runtimeMock.create,
}));

const config: ChartConfig = {
  type: 'bar',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'chart-surface-fixture',
    items: [],
  },
};

const view: ViewSpec = {
  schemaVersion: '2.0.0',
  chartType: 'bar',
  datasetId: config.data.datasetId,
  revision: 0,
  rootOrder: [],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
};

const state: ChartSurfaceState = {
  config,
  view,
  chart: { family: 'categorical', generation: 'scalar', chartType: 'bar', projection: [] },
  messages: editorMessages('en-US'),
};

const comparisonState: ChartSurfaceState = {
  config: {
    type: 'column',
    data: {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: 'comparison-chart-surface',
      series: [
        { id: 'actual', label: 'Actual' },
        { id: 'budget', label: 'Budget' },
      ],
      items: [
        {
          id: 'alpha',
          label: 'Alpha',
          values: [
            { seriesId: 'actual', amount: 10 },
            { seriesId: 'budget', amount: -8 },
          ],
        },
        {
          id: 'beta',
          label: 'Beta',
          values: [
            { seriesId: 'actual', amount: 20 },
            { seriesId: 'budget', amount: -12 },
          ],
        },
      ],
    },
  },
  view: {
    schemaVersion: '3.0.0',
    chartType: 'column',
    datasetId: 'comparison-chart-surface',
    revision: 0,
    rootOrder: ['alpha', 'beta'],
    groups: {},
    collapsedGroupIds: [],
    pinnedItemIds: [],
    annotations: {},
    emphasis: {},
  },
  chart: {
    family: 'categorical',
    generation: 'comparison',
    chartType: 'column',
    projection: [
      {
        nodeId: 'alpha',
        label: 'Alpha',
        values: [
          { seriesId: 'actual', label: 'Actual', amount: 10 },
          { seriesId: 'budget', label: 'Budget', amount: -8 },
        ],
        kind: 'category',
        sourceIds: ['alpha'],
        locked: false,
        order: 0,
      },
      {
        nodeId: 'beta',
        label: 'Beta',
        values: [
          { seriesId: 'actual', label: 'Actual', amount: 20 },
          { seriesId: 'budget', label: 'Budget', amount: -12 },
        ],
        kind: 'category',
        sourceIds: ['beta'],
        locked: false,
        order: 1,
      },
    ],
  },
  messages: editorMessages('en-US'),
};

function comparisonElement(
  nodeId: 'alpha' | 'beta',
  seriesId: 'actual' | 'budget',
  min: readonly [number, number],
  max: readonly [number, number],
): Record<string, unknown> {
  const elementKey = JSON.stringify(['comparison-element', nodeId, seriesId]);
  return {
    markType: 'interval',
    __data__: {
      viewKey: 'categorical-comparison-view',
      markKey: 'categorical-comparison-interval',
      key: elementKey,
      data: { nodeId, seriesId, elementKey },
    },
    getBounds: () => ({ min, max }),
  };
}

function comparisonContext(includeBudget = true): unknown {
  return {
    canvas: {
      document: {
        getElementsByClassName: () => [
          comparisonElement('beta', 'actual', [50, 10], [60, 70]),
          comparisonElement('alpha', 'actual', [10, 20], [20, 70]),
          ...(includeBudget
            ? [
                comparisonElement('beta', 'budget', [62, 40], [72, 80]),
                comparisonElement('alpha', 'budget', [22, 50], [32, 90]),
              ]
            : []),
          {
            markType: 'point',
            __data__: {
              viewKey: 'categorical-comparison-view',
              markKey: 'categorical-comparison-value-label-anchor',
              data: { nodeId: 'alpha', seriesId: 'actual' },
            },
            getBounds: () => ({ min: [15, 20], max: [15, 20] }),
          },
        ],
      },
    },
  };
}

function createCallbacks() {
  return {
    onMove: vi.fn<ChartSurfaceCallbacks['onMove']>(),
    onSelect: vi.fn<ChartSurfaceCallbacks['onSelect']>(),
    onMarqueeSelection: vi.fn<ChartSurfaceCallbacks['onMarqueeSelection']>(),
    onToggleGroup: vi.fn<ChartSurfaceCallbacks['onToggleGroup']>(),
    onUngroup: vi.fn<ChartSurfaceCallbacks['onUngroup']>(),
    onCancel: vi.fn<ChartSurfaceCallbacks['onCancel']>(),
    onInteractionChange: vi.fn<ChartSurfaceCallbacks['onInteractionChange']>(),
    onInteractionAbort: vi.fn<ChartSurfaceCallbacks['onInteractionAbort']>(),
    onRenderError: vi.fn<ChartSurfaceCallbacks['onRenderError']>(),
  } satisfies ChartSurfaceCallbacks;
}

function latestRuntime(): (typeof runtimeMock.records)[number] {
  const runtime = runtimeMock.records.at(-1);
  if (runtime === undefined) {
    throw new Error('Expected a chart runtime');
  }
  return runtime;
}

function latestRequestValue(runtime: (typeof runtimeMock.records)[number]): unknown {
  const request = runtime.requests.at(-1) as { readonly value?: unknown } | undefined;
  if (request === undefined || !('value' in request)) {
    throw new Error('Expected a chart render request');
  }
  return request.value;
}

beforeEach(() => {
  runtimeMock.records.length = 0;
  runtimeMock.create.mockClear();
  document.body.replaceChildren();
});

describe('chart surface render recovery', () => {
  it('moves a renderer-sized mark ghost with the active chart pointer', () => {
    const callbacks = createCallbacks();
    const dragState: ChartSurfaceState = {
      config: {
        type: 'column',
        data: {
          schemaVersion: '2.0.0',
          dataKind: 'categorical',
          datasetId: 'drag-ghost-fixture',
          items: [
            { id: 'a', label: 'Alpha', amount: 10 },
            { id: 'b', label: 'Beta', amount: 20 },
          ],
        },
      },
      view: {
        schemaVersion: '2.0.0',
        chartType: 'column',
        datasetId: 'drag-ghost-fixture',
        revision: 0,
        rootOrder: ['a', 'b'],
        groups: {},
        collapsedGroupIds: [],
        pinnedItemIds: [],
        annotations: {},
        emphasis: {},
      },
      chart: {
        family: 'categorical',
        generation: 'scalar',
        chartType: 'column',
        projection: [
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
        ],
      },
      messages: editorMessages('en-US'),
    };
    const surface = createChartSurface(document, callbacks);
    surface.update(dragState);
    const runtime = latestRuntime();
    runtime.context = {
      canvas: {
        document: {
          getElementsByClassName: () => [
            {
              __data__: { data: { nodeId: 'a' } },
              getBounds: () => ({ min: [10, 20], max: [30, 80] }),
            },
            {
              __data__: { data: { nodeId: 'b' } },
              getBounds: () => ({ min: [40, 20], max: [60, 80] }),
            },
          ],
        },
      },
    };
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
    });
    runtime.options.events
      .find(event => event.name === 'element:pointerdown')
      ?.listener({
        pointerId: 14,
        canvas: { x: 20, y: 50 },
        data: { data: { nodeId: 'a' } },
        target: { getBounds: () => ({ min: [10, 20], max: [30, 80] }) },
      });
    runtime.options.events
      .find(event => event.name === 'plot:pointermove')
      ?.listener({
        pointerId: 14,
        canvas: { x: 50, y: 60 },
      });

    const overlay = surface.element.querySelector<HTMLElement>(
      '[data-testid="chart-drag-overlay"]',
    );
    expect(overlay?.dataset['axis']).toBe('x');
    expect(overlay?.dataset['kind']).toBe('positive');
    expect(overlay?.style.width).toBe('20px');
    expect(overlay?.style.height).toBe('60px');
    expect(overlay?.style.transform).toBe('translate3d(40px, 30px, 0)');
    expect(overlay?.style.getPropertyValue('--tp-chart-drag-fill')).toBe('#168363');
    expect(overlay?.querySelector('.tp-chart-drag-overlay__label')?.textContent).toBe('Alpha');
    surface.destroy();
  });

  it('clears stale inline actions when interaction state is cancelled or updated', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(state);
    const actions = surface.element.querySelector<HTMLElement>(
      '.tp-chart-stage__plot-shell > :last-child',
    );
    expect(actions).not.toBeNull();
    if (actions === null) {
      return;
    }
    const exposeStaleAction = (): void => {
      actions.hidden = false;
      surface.element.dataset['groupActionsVisible'] = 'true';
      actions.classList.add('tp-chart-group-actions');
      actions.style.left = '20px';
      actions.style.top = '30px';
      actions.append(document.createElement('button'));
    };

    exposeStaleAction();
    surface.cancelInteraction();

    expect(actions.hidden).toBe(true);
    expect(actions.childElementCount).toBe(0);
    expect(actions.classList.contains('tp-chart-group-actions')).toBe(false);
    expect(actions.style.left).toBe('');
    expect(actions.style.top).toBe('');
    expect(surface.element.dataset['groupActionsVisible']).toBeUndefined();

    exposeStaleAction();
    surface.update({
      ...state,
      config: { ...state.config, editor: { readOnly: true } },
    });

    expect(actions.hidden).toBe(true);
    expect(actions.childElementCount).toBe(0);
    expect(actions.classList.contains('tp-chart-group-actions')).toBe(false);
    surface.destroy();
  });

  it('only inspects idle hover events that originate inside its plot', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    document.body.append(surface.element);
    const groupState: ChartSurfaceState = {
      config: {
        type: 'column',
        data: {
          schemaVersion: '2.0.0',
          dataKind: 'categorical',
          datasetId: 'group-hover-fixture',
          items: [
            { id: 'a', label: 'Alpha', amount: 10 },
            { id: 'b', label: 'Beta', amount: 20 },
          ],
        },
      },
      view: {
        schemaVersion: '2.0.0',
        chartType: 'column',
        datasetId: 'group-hover-fixture',
        revision: 1,
        rootOrder: ['group'],
        groups: { group: { id: 'group', label: 'Group', childIds: ['a', 'b'] } },
        collapsedGroupIds: ['group'],
        pinnedItemIds: [],
        annotations: {},
        emphasis: {},
      },
      chart: {
        family: 'categorical',
        generation: 'scalar',
        chartType: 'column',
        projection: [
          {
            nodeId: 'group',
            label: 'Group',
            amount: 30,
            kind: 'group',
            sourceIds: ['a', 'b'],
            locked: false,
            order: 0,
          },
        ],
      },
      messages: editorMessages('en-US'),
    };
    surface.update(groupState);
    const runtime = latestRuntime();
    runtime.context = {
      canvas: {
        document: {
          getElementsByClassName: () => [
            {
              __data__: { data: { nodeId: 'group' } },
              getBounds: () => ({ min: [0, 0], max: [100, 100] }),
            },
          ],
        },
      },
    };
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
    });
    const plot = surface.element.querySelector<HTMLElement>('[data-testid="tellplot-chart"]');
    const actions = surface.element.querySelector<HTMLElement>(
      '.tp-chart-stage__plot-shell > :last-child',
    );
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    });
    plot?.append(canvas);
    const unrelated = document.createElement('button');
    const overlay = document.createElement('div');
    surface.element.append(overlay);
    document.body.append(unrelated);

    fireEvent.pointerMove(unrelated, { pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 20, clientY: 20 });

    expect(actions?.hidden).toBe(true);
    expect(actions?.childElementCount).toBe(0);

    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 20, clientY: 20 });

    expect(actions?.hidden).toBe(false);
    const controls = [...(actions?.querySelectorAll('button') ?? [])];
    expect(controls).toHaveLength(2);
    expect(controls.map(control => control.getAttribute('aria-label'))).toEqual([
      'Expand group: Group',
      'Ungroup: Group',
    ]);
    expect(controls.map(control => control.textContent)).toEqual(['', '']);
    expect(
      controls.every(control => {
        const icon = control.querySelector('.tp-chart-group-action-icon[aria-hidden="true"]');
        return (
          icon?.tagName.toLowerCase() === 'svg' && icon.getAttribute('viewBox') === '0 0 16 16'
        );
      }),
    ).toBe(true);
    expect(actions?.dataset['axis']).toBe('x');
    expect(actions?.dataset['placement']).toBe('bottom-right');
    expect(actions?.dataset['flow']).toBe('horizontal');
    expect(actions?.style.left).toBe('96px');
    expect(actions?.style.top).toBe('96px');
    expect(surface.element.dataset['groupActionsVisible']).toBe('true');
    surface.destroy();
  });

  it('blocks pointer input while G2 still exposes an incompatible previous scene', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(state);
    const runtime = latestRuntime();
    const pointerDown = runtime.options.events.find(event => event.name === 'plot:pointerdown');
    const firstValue = latestRequestValue(runtime);
    runtime.options.onRenderSettled({ value: firstValue, status: 'success', latest: true });

    const columnState: ChartSurfaceState = {
      config: { ...config, type: 'column' },
      view: { ...view, chartType: 'column' },
      chart: {
        family: 'categorical',
        generation: 'scalar',
        chartType: 'column',
        projection: [],
      },
      messages: state.messages,
    };
    surface.update(columnState);
    callbacks.onInteractionChange.mockClear();
    pointerDown?.listener({ pointerId: 8, canvas: { x: 20, y: 30 } });

    expect(surface.element.dataset['interactionState']).toBe('idle');
    expect(callbacks.onInteractionChange).not.toHaveBeenCalled();

    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
    });
    pointerDown?.listener({ pointerId: 9, canvas: { x: 20, y: 30 } });

    expect(surface.element.dataset['interactionState']).toBe('selecting');
    expect(callbacks.onInteractionChange).toHaveBeenLastCalledWith({ state: 'selecting' });
    surface.destroy();
  });

  it('ignores non-primary buttons across native and G2 pointer entrypoints', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    document.body.append(surface.element);
    surface.update(state);
    const runtime = latestRuntime();
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
    });
    const plot = surface.element.querySelector<HTMLElement>('[data-testid="tellplot-chart"]');
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    });
    plot?.append(canvas);

    fireEvent.pointerDown(canvas, { button: 2, pointerId: 10, clientX: 20, clientY: 20 });
    runtime.options.events
      .find(event => event.name === 'plot:pointerdown')
      ?.listener({ button: 1, pointerId: 11, canvas: { x: 30, y: 30 } });

    expect(surface.element.dataset['interactionState']).toBe('idle');
    expect(callbacks.onInteractionChange).not.toHaveBeenCalledWith({ state: 'selecting' });
    surface.destroy();
  });

  it('cancels an active pointer session when its pointer leaves the top-level document', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    document.body.append(surface.element);
    surface.update(state);
    const runtime = latestRuntime();
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
    });
    runtime.options.events
      .find(event => event.name === 'plot:pointerdown')
      ?.listener({ button: 0, pointerId: 12, canvas: { x: 20, y: 30 } });

    expect(surface.element.dataset['interactionState']).toBe('selecting');
    fireEvent.pointerMove(document, {
      buttons: 0,
      pointerId: 12,
      pointerType: 'mouse',
    });

    expect(surface.element.dataset['interactionState']).toBe('idle');
    expect(callbacks.onCancel).toHaveBeenCalledWith('cancelled');
    surface.destroy();
  });

  it('commits an outside marquee while cancelling an outside item drag', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    const selectionState: ChartSurfaceState = {
      config: {
        type: 'column',
        data: {
          schemaVersion: '2.0.0',
          dataKind: 'categorical',
          datasetId: 'outside-marquee-fixture',
          items: [
            { id: 'a', label: 'Alpha', amount: 10 },
            { id: 'b', label: 'Beta', amount: -20 },
          ],
        },
      },
      view: {
        schemaVersion: '2.0.0',
        chartType: 'column',
        datasetId: 'outside-marquee-fixture',
        revision: 0,
        rootOrder: ['a', 'b'],
        groups: {},
        collapsedGroupIds: [],
        pinnedItemIds: [],
        annotations: {},
        emphasis: {},
      },
      chart: {
        family: 'categorical',
        generation: 'scalar',
        chartType: 'column',
        projection: [
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
            amount: -20,
            kind: 'negative',
            sourceIds: ['b'],
            locked: false,
            order: 1,
          },
        ],
      },
      messages: editorMessages('en-US'),
    };
    surface.update(selectionState);
    const runtime = latestRuntime();
    runtime.context = {
      canvas: {
        document: {
          getElementsByClassName: () => [
            {
              __data__: { data: { nodeId: 'a' } },
              getBounds: () => ({ min: [10, 10], max: [30, 80] }),
            },
            {
              __data__: { data: { nodeId: 'b' } },
              getBounds: () => ({ min: [40, 10], max: [60, 80] }),
            },
          ],
        },
      },
    };
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
    });
    const pointerDown = runtime.options.events.find(event => event.name === 'plot:pointerdown');
    const pointerUpOutside = runtime.options.events.find(
      event => event.name === 'plot:pointerupoutside',
    );

    pointerDown?.listener({ pointerId: 12, canvas: { x: 5, y: 5 } });
    pointerUpOutside?.listener({ pointerId: 12, canvas: { x: 65, y: 100 } });

    expect(callbacks.onMarqueeSelection).toHaveBeenCalledWith(['a', 'b']);
    expect(callbacks.onCancel).not.toHaveBeenCalled();
    expect(surface.element.dataset['interactionState']).toBe('idle');

    callbacks.onMarqueeSelection.mockClear();
    const elementPointerDown = runtime.options.events.find(
      event => event.name === 'element:pointerdown',
    );
    elementPointerDown?.listener({
      pointerId: 13,
      canvas: { x: 20, y: 20 },
      data: { data: { nodeId: 'a' } },
      target: { getBounds: () => ({ min: [10, 10], max: [30, 80] }) },
    });
    pointerUpOutside?.listener({ pointerId: 13, canvas: { x: 65, y: 100 } });

    expect(callbacks.onMarqueeSelection).not.toHaveBeenCalled();
    expect(callbacks.onCancel).toHaveBeenCalledWith('cancelled');
    surface.destroy();
  });

  it('aborts an active interaction when the authoritative render fails', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    document.body.append(surface.element);
    surface.update(state);
    const runtime = latestRuntime();
    const pointerDown = runtime.options.events.find(event => event.name === 'plot:pointerdown');
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
      generation: runtime.generation,
    });
    pointerDown?.listener({ pointerId: 7, canvas: { x: 20, y: 30 } });

    expect(surface.element.dataset['interactionState']).toBe('selecting');
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'failure',
      latest: true,
    });

    expect(surface.element.dataset['interactionState']).toBe('idle');
    expect(callbacks.onInteractionAbort).toHaveBeenCalledOnce();
    expect(callbacks.onInteractionChange).toHaveBeenLastCalledWith({ state: 'selecting' });
    surface.destroy();
  });

  it('aborts a failed preview render and restores the authoritative scene', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    document.body.append(surface.element);
    surface.update(state);
    const runtime = latestRuntime();
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
    });
    const pointerDown = runtime.options.events.find(event => event.name === 'plot:pointerdown');
    pointerDown?.listener({ pointerId: 7, canvas: { x: 20, y: 30 } });
    surface.preview({
      ...state,
      chart: { family: 'categorical', generation: 'scalar', chartType: 'bar', projection: [] },
    });
    const failedPreview = latestRequestValue(runtime);

    runtime.options.onRenderSettled({
      value: failedPreview,
      status: 'failure',
      latest: true,
    });

    expect(surface.element.dataset['interactionState']).toBe('idle');
    expect(callbacks.onInteractionAbort).toHaveBeenCalledOnce();
    expect(callbacks.onRenderError).toHaveBeenCalledWith({
      code: 'CHART_RENDER_ERROR',
      path: '/chart',
    });
    const recovery = latestRequestValue(runtime) as { readonly authoritative?: unknown };
    expect(recovery.authoritative).toBe(true);

    runtime.options.onRenderSettled({ value: recovery, status: 'success', latest: true });

    expect(surface.element.dataset['renderState']).toBe('ready');
    expect(callbacks.onRenderError).toHaveBeenLastCalledWith(null);
    surface.destroy();
  });

  it('reports an immutable stable issue across failure and recovery callbacks', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(state);
    const runtime = latestRuntime();
    const value = latestRequestValue(runtime);

    runtime.options.onRenderSettled({ value, status: 'failure', latest: true });
    const issue = callbacks.onRenderError.mock.calls[0]?.[0] as ChartRenderIssue | undefined;
    expect(issue).toEqual({ code: 'CHART_RENDER_ERROR', path: '/chart' });
    expect(Object.isFrozen(issue)).toBe(true);
    expect(issue === undefined ? true : Reflect.set(issue, 'path', '/tampered')).toBe(false);

    runtime.options.onRenderSettled({ value, status: 'success', latest: true });
    runtime.options.onRenderSettled({ value, status: 'failure', latest: true });

    expect(callbacks.onRenderError).toHaveBeenLastCalledWith({
      code: 'CHART_RENDER_ERROR',
      path: '/chart',
    });
    surface.destroy();
  });

  it('uses every registered comparison series as one category drag with a 2D union ghost', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(comparisonState);
    const runtime = latestRuntime();
    runtime.context = comparisonContext();
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
      generation: runtime.generation,
    });
    const elementDown = runtime.options.events.find(event => event.name === 'element:pointerdown');
    const move = runtime.options.events.find(event => event.name === 'plot:pointermove');
    const up = runtime.options.events.find(event => event.name === 'plot:pointerup');

    elementDown?.listener({
      pointerId: 21,
      canvas: { x: 25, y: 60 },
      data: {
        data: {
          nodeId: 'alpha',
          seriesId: 'budget',
          elementKey: '["comparison-element","alpha","budget"]',
        },
      },
    });
    move?.listener({ pointerId: 21, canvas: { x: 65, y: 60 } });

    const overlay = surface.element.querySelector<HTMLElement>(
      '[data-testid="chart-drag-overlay"]',
    );
    expect(overlay?.style.width).toBe('22px');
    expect(overlay?.style.height).toBe('70px');
    expect(overlay?.style.transform).toBe('translate3d(50px, 20px, 0)');
    expect(surface.element.dataset['interactionState']).toBe('dragging');

    runtime.context = comparisonContext(false);
    elementDown?.listener({ pointerId: 99, canvas: { x: 0, y: 0 } });
    expect(surface.element.dataset['interactionState']).toBe('dragging');

    up?.listener({ pointerId: 21, canvas: { x: 65, y: 60 } });

    expect(callbacks.onMove).toHaveBeenCalledOnce();
    expect(callbacks.onMove).toHaveBeenCalledWith('alpha', { containerId: 'root', index: 1 });
    expect(callbacks.onSelect).not.toHaveBeenCalled();
    surface.destroy();
  });

  it('fails comparison chart interaction closed for a partial receipt', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(comparisonState);
    const runtime = latestRuntime();
    runtime.context = comparisonContext(false);
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
      generation: runtime.generation,
    });
    runtime.options.events
      .find(event => event.name === 'element:pointerdown')
      ?.listener({
        pointerId: 22,
        canvas: { x: 15, y: 40 },
        data: {
          data: {
            nodeId: 'alpha',
            seriesId: 'actual',
            elementKey: '["comparison-element","alpha","actual"]',
          },
        },
      });

    expect(surface.element.dataset['interactionState']).toBe('idle');
    expect(callbacks.onSelect).not.toHaveBeenCalled();
    expect(callbacks.onMove).not.toHaveBeenCalled();
    surface.destroy();
  });

  it('treats an inactive comparison cluster gap as marquee and cancels on geometry invalidation', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(comparisonState);
    const runtime = latestRuntime();
    runtime.context = comparisonContext();
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
      generation: runtime.generation,
    });
    const plotDown = runtime.options.events.find(event => event.name === 'plot:pointerdown');
    plotDown?.listener({ pointerId: 23, canvas: { x: 21, y: 30 } });

    expect(surface.element.dataset['interactionState']).toBe('selecting');
    runtime.options.onGeometryInvalidated?.({ generation: runtime.generation, reason: 'resize' });

    expect(surface.element.dataset['interactionState']).toBe('idle');
    expect(callbacks.onInteractionChange).toHaveBeenLastCalledWith({ state: 'idle' });
    expect(callbacks.onInteractionAbort).not.toHaveBeenCalled();
    expect(callbacks.onRenderError).not.toHaveBeenCalled();
    expect(runtime.dismissTooltip).toHaveBeenCalled();
    expect(callbacks.onMove).not.toHaveBeenCalled();
    expect(callbacks.onMarqueeSelection).not.toHaveBeenCalled();
    surface.destroy();
  });

  it('keeps comparison blocked for non-authoritative resize geometry without a render error', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(comparisonState);
    const runtime = latestRuntime();
    runtime.context = comparisonContext();
    const value = latestRequestValue(runtime);

    runtime.options.onRenderSettled({
      value,
      status: 'success',
      latest: true,
      generation: runtime.generation,
      origin: 'resize',
      geometryAuthoritative: false,
    });
    runtime.options.events
      .find(event => event.name === 'element:pointerdown')
      ?.listener({
        pointerId: 24,
        canvas: { x: 15, y: 40 },
        data: {
          data: {
            nodeId: 'alpha',
            seriesId: 'actual',
            elementKey: '["comparison-element","alpha","actual"]',
          },
        },
      });

    expect(surface.element.dataset['interactionState']).toBe('idle');
    expect(surface.element.dataset['renderState']).toBe('rendering');
    expect(callbacks.onRenderError).not.toHaveBeenCalled();
    expect(callbacks.onMove).not.toHaveBeenCalled();
    expect(callbacks.onSelect).not.toHaveBeenCalled();

    runtime.options.onRenderSettled({
      value,
      status: 'success',
      latest: true,
      generation: runtime.generation,
      origin: 'resize',
      geometryAuthoritative: true,
    });
    expect(surface.element.dataset['renderState']).toBe('ready');
    surface.destroy();
  });

  it('preserves scalar ready state for non-authoritative resize geometry', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(state);
    const runtime = latestRuntime();

    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
      generation: runtime.generation,
      origin: 'resize',
      geometryAuthoritative: false,
    });

    expect(surface.element.dataset['renderState']).toBe('ready');
    expect(callbacks.onRenderError).not.toHaveBeenCalled();
    surface.destroy();
  });

  it('blocks comparison interaction until an authoritative null-preview restore settles', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(comparisonState);
    const runtime = latestRuntime();
    runtime.context = comparisonContext();
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
      generation: runtime.generation,
      geometryAuthoritative: true,
    });

    surface.preview(comparisonState);
    const previewRequest = runtime.requests.at(-1) as {
      readonly value?: { readonly authoritative?: unknown };
      readonly invalidateGeometry?: unknown;
    };
    expect(previewRequest.value?.authoritative).toBe(false);
    expect(previewRequest.invalidateGeometry).toBe(false);

    surface.preview(null);
    const restoreRequest = runtime.requests.at(-1) as {
      readonly value?: { readonly authoritative?: unknown };
      readonly invalidateGeometry?: unknown;
    };
    expect(restoreRequest.value?.authoritative).toBe(true);
    expect(restoreRequest.invalidateGeometry).toBe(true);
    expect(surface.element.dataset['renderState']).toBe('rendering');

    const elementDown = runtime.options.events.find(event => event.name === 'element:pointerdown');
    const move = runtime.options.events.find(event => event.name === 'plot:pointermove');
    const event = {
      pointerId: 26,
      canvas: { x: 15, y: 40 },
      data: {
        data: {
          nodeId: 'alpha',
          seriesId: 'actual',
          elementKey: '["comparison-element","alpha","actual"]',
        },
      },
    };
    elementDown?.listener(event);
    move?.listener({ pointerId: 26, canvas: { x: 65, y: 60 } });
    expect(surface.element.dataset['interactionState']).toBe('idle');

    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
      generation: runtime.generation,
      geometryAuthoritative: true,
    });
    expect(surface.element.dataset['renderState']).toBe('ready');
    elementDown?.listener(event);
    move?.listener({ pointerId: 26, canvas: { x: 65, y: 60 } });
    expect(surface.element.dataset['interactionState']).toBe('dragging');
    surface.destroy();
  });

  it('owns comparison preview restores without rendering a bare null preview', () => {
    const surface = createChartSurface(document, createCallbacks());
    surface.update(comparisonState);
    const runtime = latestRuntime();
    const initialRequestCount = runtime.requests.length;

    surface.preview(null);
    expect(runtime.requests).toHaveLength(initialRequestCount);

    surface.preview(comparisonState);
    expect(runtime.requests).toHaveLength(initialRequestCount + 1);
    surface.preview(null);
    expect(runtime.requests).toHaveLength(initialRequestCount + 2);
    expect(
      (
        runtime.requests.at(-1) as {
          readonly value?: { readonly authoritative?: unknown };
        }
      ).value?.authoritative,
    ).toBe(true);

    surface.update(comparisonState);
    const updatedRequestCount = runtime.requests.length;
    surface.preview(null);
    expect(runtime.requests).toHaveLength(updatedRequestCount);

    surface.preview(comparisonState);
    surface.destroy();
    const destroyedRequestCount = runtime.requests.length;
    surface.preview(null);
    expect(runtime.requests).toHaveLength(destroyedRequestCount);
  });

  it('keeps an active comparison drag across a null preview until idle restore', () => {
    const callbacks = createCallbacks();
    const surface = createChartSurface(document, callbacks);
    surface.update(comparisonState);
    const runtime = latestRuntime();
    runtime.context = comparisonContext();
    runtime.options.onRenderSettled({
      value: latestRequestValue(runtime),
      status: 'success',
      latest: true,
      generation: runtime.generation,
      geometryAuthoritative: true,
    });
    const elementDown = runtime.options.events.find(event => event.name === 'element:pointerdown');
    const move = runtime.options.events.find(event => event.name === 'plot:pointermove');
    const up = runtime.options.events.find(event => event.name === 'plot:pointerup');
    const event = {
      pointerId: 27,
      canvas: { x: 15, y: 40 },
      data: {
        data: {
          nodeId: 'alpha',
          seriesId: 'actual',
          elementKey: '["comparison-element","alpha","actual"]',
        },
      },
    };

    elementDown?.listener(event);
    move?.listener({ pointerId: 27, canvas: { x: 65, y: 60 } });
    expect(surface.element.dataset['interactionState']).toBe('dragging');
    expect(callbacks.onInteractionChange).toHaveBeenLastCalledWith({
      state: 'dragging',
      itemId: 'alpha',
      target: expect.objectContaining({ nodeId: 'beta' }),
    });
    surface.preview(comparisonState);

    move?.listener({ pointerId: 27, canvas: { x: 25, y: 60 } });
    expect(callbacks.onInteractionChange).toHaveBeenLastCalledWith({
      state: 'dragging',
      itemId: 'alpha',
      target: null,
    });
    surface.preview(null);
    const invalidTargetRestore = runtime.requests.at(-1) as {
      readonly value?: { readonly authoritative?: unknown };
      readonly invalidateGeometry?: unknown;
    };
    expect(invalidTargetRestore.value?.authoritative).toBe(false);
    expect(invalidTargetRestore.invalidateGeometry).toBe(false);
    expect(surface.element.dataset['interactionState']).toBe('dragging');

    move?.listener({ pointerId: 27, canvas: { x: 65, y: 60 } });
    surface.preview(comparisonState);
    up?.listener({ pointerId: 27, canvas: { x: 65, y: 60 } });
    expect(callbacks.onMove).toHaveBeenCalledOnce();
    expect(surface.element.dataset['interactionState']).toBe('idle');

    surface.preview(null);
    const idleRestore = runtime.requests.at(-1) as {
      readonly value?: { readonly authoritative?: unknown };
      readonly invalidateGeometry?: unknown;
    };
    expect(idleRestore.value?.authoritative).toBe(true);
    expect(idleRestore.invalidateGeometry).toBe(true);
    const restoredRequestCount = runtime.requests.length;
    surface.preview(null);
    expect(runtime.requests).toHaveLength(restoredRequestCount);
    surface.destroy();
  });

  it('preserves scalar bare null preview rendering', () => {
    const surface = createChartSurface(document, createCallbacks());
    surface.update(state);
    const runtime = latestRuntime();
    const initialRequestCount = runtime.requests.length;

    surface.preview(null);

    expect(runtime.requests).toHaveLength(initialRequestCount + 1);
    expect(
      (
        runtime.requests.at(-1) as {
          readonly value?: { readonly authoritative?: unknown };
          readonly invalidateGeometry?: unknown;
        }
      ).value?.authoritative,
    ).toBe(true);
    expect(
      (runtime.requests.at(-1) as { readonly invalidateGeometry?: unknown }).invalidateGeometry,
    ).toBe(true);
    surface.destroy();
  });
});
