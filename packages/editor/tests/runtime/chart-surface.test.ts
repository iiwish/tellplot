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
    }) => void;
  }

  interface RuntimeRecord {
    readonly options: RuntimeOptions;
    readonly requests: unknown[];
    context: unknown;
  }

  const records: RuntimeRecord[] = [];
  const create = vi.fn((options: RuntimeOptions) => {
    const record: RuntimeRecord = { options, requests: [], context: undefined };
    records.push(record);
    return {
      request: vi.fn((request: unknown) => record.requests.push(request)),
      finishAnimations: vi.fn(),
      getContext: vi.fn(() => record.context),
      dispose: vi.fn(),
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
  chart: { family: 'categorical', chartType: 'bar', projection: [] },
  messages: editorMessages('en-US'),
};

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
      chart: { family: 'categorical', chartType: 'column', projection: [] },
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
      chart: { family: 'categorical', chartType: 'bar', projection: [] },
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
});
