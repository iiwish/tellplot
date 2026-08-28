import { fireEvent, getByRole, queryByRole, waitFor, within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChartConfig, ViewSpec } from '@tellplot/core';
import { createEditor, type EditorOptions } from '../../src/index';

const g2Mock = vi.hoisted(() => {
  const instances: Chart[] = [];
  const renderQueue: (() => Promise<void>)[] = [];
  class Chart {
    readonly context: { animations: readonly unknown[]; canvas: unknown } = {
      animations: [],
      canvas: undefined,
    };
    readonly options = vi.fn((): this => this);
    readonly render = vi.fn((): Promise<void> => renderQueue.shift()?.() ?? Promise.resolve());
    readonly destroy = vi.fn((): void => undefined);
    readonly on = vi.fn((): this => this);
    readonly off = vi.fn((): this => this);
    readonly getContext = vi.fn(() => this.context);

    constructor(options: { readonly container: HTMLElement }) {
      instances.push(this);
      options.container.append(options.container.ownerDocument.createElement('canvas'));
    }
  }
  return { Chart, instances, renderQueue };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));

const config: ChartConfig = {
  type: 'bar',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'runtime-fixture',
    items: [
      { id: 'a', label: 'Alpha', amount: 10 },
      { id: 'b', label: 'Beta', amount: 20 },
      { id: 'c', label: 'Gamma', amount: -5 },
    ],
  },
};

const replacementConfig: ChartConfig = {
  type: 'bar',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'replacement-runtime-fixture',
    items: [
      { id: 'd', label: 'Delta', amount: 30 },
      { id: 'e', label: 'Epsilon', amount: 40 },
    ],
  },
};

const comparisonConfig: ChartConfig = {
  type: 'column',
  data: {
    schemaVersion: '3.0.0',
    dataKind: 'categorical',
    datasetId: 'comparison-runtime-fixture',
    series: [
      { id: 'actual', label: 'Actual' },
      { id: 'budget', label: 'Budget' },
    ],
    items: [
      {
        id: 'north',
        label: 'North',
        values: [
          { seriesId: 'actual', amount: 12 },
          { seriesId: 'budget', amount: 10 },
        ],
      },
      {
        id: 'south',
        label: 'South',
        values: [
          { seriesId: 'actual', amount: -4 },
          { seriesId: 'budget', amount: 6 },
        ],
      },
    ],
  },
  appearance: { labels: { value: 'never' }, animation: { enabled: false } },
};

let host: HTMLDivElement;

beforeEach(() => {
  g2Mock.renderQueue.length = 0;
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  document.body.replaceChildren();
  Reflect.deleteProperty(document, 'elementFromPoint');
  vi.restoreAllMocks();
});

describe('createEditor', () => {
  it('routes comparison projection to one private interval and recreates only structural registries', async () => {
    const initialInstanceCount = g2Mock.instances.length;
    const editor = createEditor(host, { config: comparisonConfig });
    await waitFor(() => expect(g2Mock.instances.length).toBe(initialInstanceCount + 1));
    const initialChart = g2Mock.instances.at(-1);
    await waitFor(() => expect(initialChart?.options).toHaveBeenCalled());
    const optionCalls = initialChart?.options.mock.calls as unknown as readonly (readonly [
      unknown,
    ])[];
    const spec = optionCalls.at(-1)?.[0] as {
      readonly children?: readonly { readonly key?: string; readonly type?: string }[];
    };
    const intervals = spec.children?.filter(
      child => child.key === 'categorical-comparison-interval',
    );
    expect(intervals).toHaveLength(1);
    expect(intervals?.[0]).toMatchObject({
      key: 'categorical-comparison-interval',
      type: 'interval',
    });
    expect(host.querySelector('[data-testid="tellplot-chart-stage"]')?.textContent).not.toContain(
      '22',
    );

    editor.update({
      config: {
        ...comparisonConfig,
        data: {
          ...comparisonConfig.data,
          series: comparisonConfig.data.series.map(series => ({
            ...series,
            label: `${series.label} renamed`,
          })),
        },
      },
    });
    await waitFor(() => expect(initialChart?.options.mock.calls.length).toBeGreaterThan(1));
    expect(g2Mock.instances.length).toBe(initialInstanceCount + 1);

    editor.update({
      config: {
        ...comparisonConfig,
        data: {
          ...comparisonConfig.data,
          series: [...comparisonConfig.data.series].reverse(),
          items: comparisonConfig.data.items.map(item => ({
            ...item,
            values: [...item.values].reverse(),
          })),
        },
      },
    });
    await waitFor(() => expect(g2Mock.instances.length).toBe(initialInstanceCount + 2));
    expect(initialChart?.destroy).toHaveBeenCalledOnce();
    editor.destroy();
  });

  it('mounts the complete workbench and updates through shared commands', async () => {
    const views: ViewSpec[] = [];
    const editor = createEditor(host, { config, onViewChange: view => views.push(view) });

    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    expect(root?.dataset['editorState']).toBe('ready');
    expect(getByRole(root as HTMLElement, 'toolbar', { name: '编辑器工具栏' })).toBeTruthy();
    const tree = getByRole(root as HTMLElement, 'tree', { name: '结构大纲' });
    expect(within(tree).getAllByRole('treeitem')).toHaveLength(3);
    expect(getByRole(root as HTMLElement, 'complementary', { name: '检查器' })).toBeTruthy();

    const beta = within(tree).getByRole('treeitem', { name: /Beta/ });
    beta.focus();
    fireEvent.keyDown(beta, { altKey: true, key: 'ArrowDown' });

    expect(editor.getView().rootOrder).toEqual(['a', 'c', 'b']);
    expect(views.at(-1)?.rootOrder).toEqual(['a', 'c', 'b']);
    expect(root?.dataset['viewRevision']).toBe('1');
    expect(
      getByRole(root as HTMLElement, 'button', { name: '撤销' }).hasAttribute('disabled'),
    ).toBe(false);
  });

  it('uses embeddable landmarks and does not recreate unchanged live feedback', () => {
    const editor = createEditor(host, { config });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const feedbackCode = root?.querySelector('.tp-command-feedback strong');
    const feedbackMessage = root?.querySelector('.tp-command-feedback span');
    const toolbarStatus = root?.querySelector('.tp-toolbar-status');

    expect(root).not.toBeNull();
    expect(root?.querySelector('main')).toBeNull();
    expect(toolbarStatus?.hasAttribute('role')).toBe(false);
    expect(toolbarStatus?.hasAttribute('aria-label')).toBe(false);

    fireEvent.click(getByRole(root as HTMLElement, 'treeitem', { name: /Beta/ }));

    expect(root?.querySelector('.tp-command-feedback strong')).toBe(feedbackCode);
    expect(root?.querySelector('.tp-command-feedback span')).toBe(feedbackMessage);
    editor.destroy();
  });

  it('keeps generated direct command identifiers distinct from host commands', () => {
    const editor = createEditor(host, { config });
    const initialView = editor.getView();
    const moved = editor.dispatch({
      schemaVersion: '1.0.0',
      id: 'tp-direct-1',
      type: 'moveItem',
      source: 'host',
      baseRevision: initialView.revision,
      payload: { itemId: 'c', target: { containerId: 'root', index: 0 } },
    });

    expect(moved?.ok).toBe(true);
    const undone = editor.undo();

    expect(undone?.ok).toBe(true);
    expect(undone?.ok === true ? undone.event.commandId : undefined).toBe('tp-direct-2');
    expect(editor.getView().rootOrder).toEqual(initialView.rootOrder);
    editor.destroy();
  });

  it('keeps generated command identifiers distinct from pending controlled host commands', () => {
    const seed = createEditor(host, { config });
    const controlledView = seed.getView();
    seed.destroy();
    const onViewChange = vi.fn();
    const onCommandRejected = vi.fn();
    const editor = createEditor(host, {
      config,
      view: controlledView,
      onViewChange,
      onCommandRejected,
    });
    const pending = editor.dispatch({
      schemaVersion: '1.0.0',
      id: 'tp-keyboard-1',
      type: 'moveItem',
      source: 'host',
      baseRevision: controlledView.revision,
      payload: { itemId: 'c', target: { containerId: 'root', index: 0 } },
    });
    expect(pending?.ok).toBe(true);

    fireEvent.keyDown(getByRole(host, 'treeitem', { name: /Beta/ }), {
      altKey: true,
      key: 'ArrowDown',
    });

    const keyboardEvent = onViewChange.mock.calls.at(-1)?.[1] as
      { readonly commandId?: string } | undefined;
    expect(keyboardEvent?.commandId).toBe('tp-keyboard-2');
    expect(onCommandRejected).not.toHaveBeenCalled();
    editor.destroy();
  });

  it('applies the documented default and minimum numeric editor heights', () => {
    const editor = createEditor(host, { config: { ...config, height: 200 } });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');

    expect(root?.style.height).toBe('480px');
    editor.update({ config: { ...config, height: '50vh' } });
    expect(root?.style.height).toBe('50vh');
    editor.update({ config });
    expect(root?.style.height).toBe('680px');
    editor.destroy();
  });

  it('supports controlled updates without duplicating the runtime', () => {
    const uncontrolled = createEditor(host, { config });
    const view = uncontrolled.getView();
    uncontrolled.destroy();
    host.replaceChildren();
    const onViewChange = vi.fn();
    const editor = createEditor(host, { config, view, onViewChange });
    const beta = getByRole(host, 'treeitem', { name: /Beta/ });

    fireEvent.keyDown(beta, { altKey: true, key: 'ArrowDown' });

    expect(editor.getView().rootOrder).toEqual(['a', 'b', 'c']);
    const candidate = onViewChange.mock.calls[0]?.[0] as ViewSpec;
    editor.update({ config, view: candidate, onViewChange });
    expect(editor.getView().rootOrder).toEqual(['a', 'c', 'b']);
    expect(host.querySelectorAll('[data-tellplot="editor"]')).toHaveLength(1);
  });

  it('renders an invalid runtime config without throwing or retaining container ownership', () => {
    const invalidOptions = { config: null } as unknown as EditorOptions;

    const invalid = createEditor(host, invalidOptions);

    expect(host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-editor-state')).toBe(
      'invalid',
    );
    expect(getByRole(host, 'alert')).toBeTruthy();
    invalid.destroy();

    const valid = createEditor(host, { config });
    expect(host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-editor-state')).toBe(
      'ready',
    );
    valid.destroy();
  });

  it('reserves container ownership before initialization callbacks can reenter', () => {
    let nestedError: unknown;
    const outer = createEditor(host, {
      config: null as unknown as ChartConfig,
      onConfigRejected: () => {
        try {
          createEditor(host, { config });
        } catch (error) {
          nestedError = error;
        }
      },
    });

    expect(nestedError).toEqual(
      expect.objectContaining({ name: 'TellPlotEditorError', code: 'CONTAINER_OWNED' }),
    );
    expect(host.querySelectorAll('[data-tellplot="editor"]')).toHaveLength(1);
    outer.destroy();

    const replacement = createEditor(host, { config });
    expect(host.querySelectorAll('[data-tellplot="editor"]')).toHaveLength(1);
    replacement.destroy();
  });

  it('rejects non-HTMLElement containers with a stable error', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.append(svg);

    expect(() => createEditor(svg as unknown as HTMLElement, { config })).toThrowError(
      expect.objectContaining({
        name: 'TellPlotEditorError',
        code: 'CONTAINER_UNAVAILABLE',
      }),
    );
    expect(svg.childElementCount).toBe(0);
  });

  it('renders and reports invalid controlled views with stable diagnostics', () => {
    const seed = createEditor(host, { config });
    const view = seed.getView();
    seed.destroy();
    const onConfigRejected = vi.fn();
    const editor = createEditor(host, {
      config,
      view: { ...view, datasetId: 'another-dataset' },
      onConfigRejected,
    });

    expect(host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-editor-state')).toBe(
      'invalid',
    );
    expect(getByRole(host, 'alert').textContent).toContain('SOURCE_CONFLICT');
    expect(onConfigRejected).toHaveBeenCalledWith([
      expect.objectContaining({
        code: 'SOURCE_CONFLICT',
        reason: 'DATASET_ID_MISMATCH',
        path: '/datasetId',
      }),
    ]);
    expect(() => editor.getView()).toThrowError(
      expect.objectContaining({ name: 'TellPlotEditorError', code: 'VIEW_UNAVAILABLE' }),
    );

    const invalidUpdate = { config, view: null, onConfigRejected } as unknown as EditorOptions;
    expect(() => editor.update(invalidUpdate)).not.toThrow();
    expect(getByRole(host, 'alert').textContent).toContain('INVALID_VIEW_SPEC');
    editor.destroy();
  });

  it('reports chart render failures without leaking renderer errors and recovers', async () => {
    const onRenderError = vi.fn();
    const editor = createEditor(host, { config, onRenderError });
    await waitFor(() => {
      expect(host.querySelector('[data-testid="tellplot-chart"] canvas')).not.toBeNull();
      expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
        'dataset.renderState',
        'ready',
      );
    });
    const chart = g2Mock.instances.at(-1);
    expect(chart).not.toBeUndefined();
    if (chart === undefined) {
      return;
    }
    chart.render.mockRejectedValueOnce(new Error('private renderer details'));

    editor.update({ config: { ...config, height: 720 }, onRenderError });

    await waitFor(() => {
      expect(getByRole(host, 'alert').textContent).toContain('CHART_RENDER_ERROR');
    });
    expect(getByRole(host, 'alert').textContent).not.toContain('private renderer details');
    expect(onRenderError).toHaveBeenCalledWith({ code: 'CHART_RENDER_ERROR', path: '/chart' });

    editor.update({ config: { ...config, height: 721 }, onRenderError });
    await waitFor(() => {
      expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
        'dataset.renderState',
        'ready',
      );
      expect(queryByRole(host, 'alert')).toBeNull();
    });
    expect(onRenderError).toHaveBeenLastCalledWith(null);
    editor.destroy();
  });

  it('lets a visible chart gesture interrupt an in-flight G2 animation', async () => {
    let finishRender: (() => void) | undefined;
    g2Mock.renderQueue.push(
      () =>
        new Promise<void>(resolve => {
          finishRender = resolve;
        }),
    );
    const editor = createEditor(host, { config });
    await waitFor(() => {
      expect(g2Mock.instances.at(-1)?.render).toHaveBeenCalledOnce();
    });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const stage = host.querySelector<HTMLElement>('[data-testid="tellplot-chart-stage"]');
    const canvas = host.querySelector<HTMLCanvasElement>('[data-testid="tellplot-chart"] canvas');
    const chart = g2Mock.instances.at(-1);
    expect(root).not.toBeNull();
    expect(stage?.dataset['renderState']).toBe('rendering');
    expect(canvas).not.toBeNull();
    expect(chart).not.toBeUndefined();
    if (root === null || canvas === null || chart === undefined) {
      finishRender?.();
      editor.destroy();
      return;
    }
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 150,
      width: 300,
      height: 150,
      toJSON: () => ({}),
    });
    const sceneElement = (nodeId: string, minY: number, maxY: number) => ({
      __data__: { data: { nodeId } },
      getBounds: () => ({ min: [10, minY], max: [80, maxY] }),
    });
    const finishAnimation = vi.fn();
    chart.context.animations = [{ finish: finishAnimation }];
    chart.context.canvas = {
      document: {
        getElementsByClassName: () => [
          sceneElement('a', 10, 30),
          sceneElement('b', 40, 60),
          sceneElement('c', 70, 90),
        ],
      },
    };

    fireEvent.pointerDown(canvas, { button: 0, pointerId: 31, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(document, { pointerId: 31, clientX: 20, clientY: 50 });

    expect(finishAnimation).toHaveBeenCalledOnce();
    expect(root.dataset['interactionState']).toBe('dragging');
    fireEvent.pointerCancel(document, { pointerId: 31 });
    finishRender?.();
    await waitFor(() => expect(stage?.dataset['renderState']).toBe('ready'));
    editor.destroy();
  });

  it('returns the editor shell to idle when an authoritative render fails mid-gesture', async () => {
    const editor = createEditor(host, { config });
    await waitFor(() => {
      expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
        'dataset.renderState',
        'ready',
      );
    });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const canvas = host.querySelector<HTMLCanvasElement>('[data-testid="tellplot-chart"] canvas');
    const chart = g2Mock.instances.at(-1);
    expect(root).not.toBeNull();
    expect(canvas).not.toBeNull();
    expect(chart).not.toBeUndefined();
    if (root === null || canvas === null || chart === undefined) {
      editor.destroy();
      return;
    }
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 150,
      width: 300,
      height: 150,
      toJSON: () => ({}),
    });
    chart.context.canvas = {
      document: {
        getElementsByClassName: () => [
          {
            __data__: { data: { nodeId: 'a' } },
            getBounds: () => ({ min: [100, 20], max: [180, 50] }),
          },
          {
            __data__: { data: { nodeId: 'b' } },
            getBounds: () => ({ min: [100, 70], max: [180, 100] }),
          },
        ],
      },
    };

    fireEvent.pointerDown(canvas, { button: 0, pointerId: 32, clientX: 120, clientY: 30 });
    fireEvent.pointerMove(document, { pointerId: 32, clientX: 120, clientY: 80 });
    expect(root.dataset['interactionState']).toBe('dragging');
    expect(root.dataset['interactionSource']).toBe('direct');

    const retry = host.querySelector<HTMLButtonElement>('.tp-chart-stage__error button');
    expect(retry).not.toBeNull();
    chart.render.mockRejectedValueOnce(new Error('private renderer details'));
    fireEvent.click(retry as HTMLButtonElement);

    await waitFor(() => expect(getByRole(host, 'alert')).toBeTruthy());

    expect(root.dataset['interactionState']).toBe('idle');
    expect(root.hasAttribute('data-interaction-source')).toBe(false);
    expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
      'dataset.interactionState',
      'idle',
    );
    expect(host.querySelector('.tp-command-feedback strong')?.textContent).toBe(
      'CHART_RENDER_ERROR',
    );

    const failedRenderCount = chart.render.mock.calls.length;
    chart.render.mockRejectedValueOnce(new Error('second private renderer failure'));
    editor.update({ config: { ...config, locale: 'en-US', height: 720 } });
    await waitFor(() => expect(chart.render.mock.calls.length).toBeGreaterThan(failedRenderCount));
    expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
      'dataset.renderState',
      'error',
    );
    expect(host.querySelector('.tp-command-feedback span')?.textContent).toBe(
      'Chart rendering failed. Try again.',
    );

    fireEvent.click(retry as HTMLButtonElement);
    await waitFor(() => {
      expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
        'dataset.renderState',
        'ready',
      );
    });
    expect(host.querySelector('.tp-command-feedback strong')?.textContent).toBe('READY');
    expect(host.querySelector('.tp-command-feedback span')?.textContent).toBe(
      'Structure and amount anchors are valid',
    );

    fireEvent.pointerDown(canvas, { button: 0, pointerId: 33, clientX: 120, clientY: 30 });
    fireEvent.pointerMove(document, { pointerId: 33, clientX: 120, clientY: 80 });
    expect(host.querySelector('.tp-command-feedback strong')?.textContent).toBe('MOVE_PENDING');

    editor.update({ config: { ...config, height: 721 } });

    expect(root.dataset['interactionState']).toBe('idle');
    expect(host.querySelector('.tp-command-feedback strong')?.textContent).toBe('READY');
    editor.destroy();
  });

  it('surfaces a stable editor render error and permits a same-state update to recover', () => {
    const editor = createEditor(host, { config });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const workbench = root?.querySelector<HTMLElement>('.tp-workbench');
    expect(root).not.toBeNull();
    expect(workbench).not.toBeNull();
    if (root === null || workbench === null || workbench === undefined) {
      return;
    }
    const replaceChildren = workbench.replaceChildren.bind(workbench);
    const replaceChildrenSpy = vi.spyOn(workbench, 'replaceChildren');
    replaceChildrenSpy.mockImplementationOnce((): void => {
      throw new Error('private DOM failure');
    });
    replaceChildrenSpy.mockImplementation((...nodes): void => {
      replaceChildren(...nodes);
    });

    expect(() => editor.update({ config: { ...config, height: 720 } })).toThrowError(
      expect.objectContaining({ name: 'TellPlotEditorError', code: 'EDITOR_RENDER_FAILED' }),
    );
    expect(getByRole(root, 'alert').textContent).toContain('EDITOR_RENDER_FAILED');
    expect(getByRole(root, 'alert').textContent).not.toContain('private DOM failure');

    editor.update({ config: { ...config, height: 720 } });
    expect(root.dataset['editorState']).toBe('ready');
    expect(queryByRole(root, 'alert')).toBeNull();
    editor.destroy();
  });

  it('returns a stable initialization error without mutating the host', () => {
    const unreadableOptions = new Proxy(
      { config },
      {
        getOwnPropertyDescriptor(target, property) {
          if (property === 'config') {
            throw new Error('host getter failed');
          }
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      },
    );

    expect(() => createEditor(host, unreadableOptions)).toThrowError(
      expect.objectContaining({
        name: 'TellPlotEditorError',
        code: 'EDITOR_INITIALIZATION_FAILED',
        message: 'TellPlot editor could not be initialized.',
      }),
    );
    expect(host.childElementCount).toBe(0);

    const unreadableConfig = new Proxy(config, {
      getOwnPropertyDescriptor(target, property) {
        if (property === 'type') {
          throw new Error('host config descriptor failed');
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
    expect(() => createEditor(host, { config: unreadableConfig })).toThrowError(
      expect.objectContaining({
        name: 'TellPlotEditorError',
        code: 'EDITOR_INITIALIZATION_FAILED',
        message: 'TellPlot editor could not be initialized.',
      }),
    );
    expect(host.childElementCount).toBe(0);

    const valid = createEditor(host, { config });
    expect(valid.getView().revision).toBe(0);
    valid.destroy();
  });

  it('rejects an accessor-backed render callback before mounting and leaves the host reusable', () => {
    const secret = 'private initial callback getter';
    let getterCalls = 0;
    const options = { config } as EditorOptions;
    Object.defineProperty(options, 'onRenderError', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error(secret);
      },
    });

    let thrown: unknown;
    try {
      createEditor(host, options);
    } catch (error) {
      thrown = error;
    }

    expect(getterCalls).toBe(0);
    expect(thrown).toEqual(
      expect.objectContaining({
        name: 'TellPlotEditorError',
        code: 'EDITOR_INITIALIZATION_FAILED',
      }),
    );
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).not.toContain(secret);
    expect(host.childElementCount).toBe(0);

    const valid = createEditor(host, { config });
    expect(valid.getView().revision).toBe(0);
    valid.destroy();
  });

  it('rejects unknown options and non-function callbacks without mounting', () => {
    const unknownOption = { config, experimental: true } as unknown as EditorOptions;
    expect(() => createEditor(host, unknownOption)).toThrowError(
      expect.objectContaining({
        name: 'TellPlotEditorError',
        code: 'EDITOR_INITIALIZATION_FAILED',
      }),
    );
    expect(host.childElementCount).toBe(0);

    const invalidCallback = {
      config,
      onRenderError: 'not-a-function',
    } as unknown as EditorOptions;
    expect(() => createEditor(host, invalidCallback)).toThrowError(
      expect.objectContaining({
        name: 'TellPlotEditorError',
        code: 'EDITOR_INITIALIZATION_FAILED',
      }),
    );
    expect(host.childElementCount).toBe(0);
  });

  it('rejects unreadable update callbacks atomically without exposing proxy failures', async () => {
    const onRenderError = vi.fn();
    const editor = createEditor(host, { config, onRenderError });
    await waitFor(() => {
      expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
        'dataset.renderState',
        'ready',
      );
    });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const chart = g2Mock.instances.at(-1);
    const secret = 'private update callback descriptor';
    const unreadable = new Proxy<EditorOptions>(
      { config: { ...config, height: 720 }, onRenderError: vi.fn() },
      {
        getOwnPropertyDescriptor(target, property) {
          if (property === 'onRenderError') {
            throw new Error(secret);
          }
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      },
    );

    let thrown: unknown;
    try {
      editor.update(unreadable);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toEqual(
      expect.objectContaining({ name: 'TellPlotEditorError', code: 'EDITOR_RENDER_FAILED' }),
    );
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).not.toContain(secret);
    expect(root?.style.height).toBe('680px');
    expect(editor.getView().revision).toBe(0);
    expect(chart).not.toBeUndefined();
    if (chart !== undefined) {
      chart.render.mockRejectedValueOnce(new Error('private renderer details'));
      const retry = host.querySelector<HTMLButtonElement>('.tp-chart-stage__error button');
      fireEvent.click(retry as HTMLButtonElement);
      await waitFor(() =>
        expect(onRenderError).toHaveBeenCalledWith({
          code: 'CHART_RENDER_ERROR',
          path: '/chart',
        }),
      );
    }
    editor.destroy();
  });

  it('rejects invalid update callback types atomically and retains the active callback', async () => {
    const onRenderError = vi.fn();
    const editor = createEditor(host, { config, onRenderError });
    await waitFor(() => {
      expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
        'dataset.renderState',
        'ready',
      );
    });
    const chart = g2Mock.instances.at(-1);
    const invalidUpdate = {
      config: { ...config, height: 720 },
      onRenderError: 'not-a-function',
    } as unknown as EditorOptions;

    expect(() => editor.update(invalidUpdate)).toThrowError(
      expect.objectContaining({ name: 'TellPlotEditorError', code: 'EDITOR_RENDER_FAILED' }),
    );
    expect(host.querySelector<HTMLElement>('[data-tellplot="editor"]')?.style.height).toBe('680px');
    expect(editor.getView().revision).toBe(0);

    expect(chart).not.toBeUndefined();
    if (chart !== undefined) {
      chart.render.mockRejectedValueOnce(new Error('private renderer details'));
      fireEvent.click(
        host.querySelector<HTMLButtonElement>('.tp-chart-stage__error button') as HTMLButtonElement,
      );
      await waitFor(() =>
        expect(onRenderError).toHaveBeenCalledWith({
          code: 'CHART_RENDER_ERROR',
          path: '/chart',
        }),
      );
    }
    editor.destroy();
  });

  it('cancels an outline drag before applying a controlled update', () => {
    const seed = createEditor(host, { config });
    const initialView = seed.getView();
    const moved = seed.dispatch({
      schemaVersion: '1.0.0',
      id: 'external-update',
      type: 'moveItem',
      source: 'host',
      baseRevision: initialView.revision,
      payload: { itemId: 'c', target: { containerId: 'root', index: 0 } },
    });
    expect(moved?.ok).toBe(true);
    const externalView = moved?.ok === true ? moved.viewSpec : initialView;
    seed.destroy();

    const onViewChange = vi.fn();
    const editor = createEditor(host, { config, view: initialView, onViewChange });
    const source = host.querySelector<HTMLElement>('[data-node-id="a"]');
    const target = host.querySelector<HTMLElement>('[data-node-id="b"]');
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    document.elementFromPoint = vi.fn(() => target);

    fireEvent.pointerDown(source as HTMLElement, {
      button: 0,
      pointerId: 7,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(document, { pointerId: 7, clientX: 12, clientY: 12 });
    expect(
      host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-interaction-state'),
    ).toBe('dragging');
    expect(host.querySelector('[data-testid="outline-drag-overlay"]')).not.toBeNull();

    editor.update({ config, view: externalView, onViewChange });

    expect(
      host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-interaction-state'),
    ).toBe('idle');
    expect(host.querySelector('[data-testid="outline-drag-overlay"]')).toBeNull();
    fireEvent.pointerUp(document, { pointerId: 7, clientX: 12, clientY: 12 });
    expect(onViewChange).not.toHaveBeenCalled();
    expect(editor.getView().rootOrder).toEqual(['c', 'a', 'b']);
  });

  it('rejects outline drop targets owned by another editor instance', () => {
    const secondHost = document.createElement('div');
    document.body.append(secondHost);
    const first = createEditor(host, { config });
    const second = createEditor(secondHost, { config });
    const firstSource = host.querySelector<HTMLElement>('.tp-outline-row[data-node-id="a"]');
    const secondTarget = secondHost.querySelector<HTMLElement>('.tp-outline-row[data-node-id="b"]');
    expect(firstSource).not.toBeNull();
    expect(secondTarget).not.toBeNull();
    document.elementFromPoint = vi.fn(() => secondTarget);

    fireEvent.pointerDown(firstSource as HTMLElement, {
      button: 0,
      pointerId: 71,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(document, { pointerId: 71, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(document, { pointerId: 71, clientX: 20, clientY: 20 });

    expect(first.getView().rootOrder).toEqual(['a', 'b', 'c']);
    expect(second.getView().rootOrder).toEqual(['a', 'b', 'c']);
    expect(secondTarget?.hasAttribute('data-drop-indicator')).toBe(false);
    expect(secondTarget?.hasAttribute('data-drop-inside')).toBe(false);
    expect(host.querySelector('.tp-command-feedback strong')?.textContent).toBe('ACTION_CANCELLED');
    first.destroy();
    second.destroy();
  });

  it('keeps an outline drag active across a semantically equivalent update', () => {
    const orderedConfig: ChartConfig = {
      ...config,
      appearance: {
        title: 'Runtime fixture',
        colors: { positive: '#168363', negative: '#d5524a' },
        tooltip: true,
      },
      editor: {
        readOnly: false,
        historyLimit: 50,
        panels: { outline: true, inspector: true },
      },
    };
    const reorderedConfig: ChartConfig = {
      ...structuredClone(config),
      editor: {
        panels: { inspector: true, outline: true },
        historyLimit: 50,
        readOnly: false,
      },
      appearance: {
        tooltip: true,
        colors: { negative: '#d5524a', positive: '#168363' },
        title: 'Runtime fixture',
      },
    };
    const editor = createEditor(host, { config: orderedConfig });
    const source = host.querySelector<HTMLElement>('[data-node-id="a"]');
    const target = host.querySelector<HTMLElement>('[data-node-id="b"]');
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    document.elementFromPoint = vi.fn(() => target);

    fireEvent.pointerDown(source as HTMLElement, {
      button: 0,
      pointerId: 8,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(document, { pointerId: 8, clientX: 12, clientY: 12 });
    expect(
      host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-interaction-state'),
    ).toBe('dragging');

    editor.update({ config: reorderedConfig, onViewChange: vi.fn() });

    expect(
      host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-interaction-state'),
    ).toBe('dragging');
    expect(host.querySelector('[data-testid="outline-drag-overlay"]')).not.toBeNull();
    fireEvent.pointerCancel(document, { pointerId: 8 });
  });

  it('keeps an outline drag active when controlled membership arrays are reordered', () => {
    const seed = createEditor(host, { config });
    const view: ViewSpec = { ...seed.getView(), pinnedItemIds: ['a', 'b'] };
    seed.destroy();
    const editor = createEditor(host, { config, view });
    const source = host.querySelector<HTMLElement>('[data-node-id="c"]');
    const target = host.querySelector<HTMLElement>('[data-node-id="b"]');
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    document.elementFromPoint = vi.fn(() => target);

    fireEvent.pointerDown(source as HTMLElement, {
      button: 0,
      pointerId: 9,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(document, { pointerId: 9, clientX: 12, clientY: 12 });
    expect(
      host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-interaction-state'),
    ).toBe('dragging');

    editor.update({ config, view: { ...view, pinnedItemIds: ['b', 'a'] } });

    expect(
      host.querySelector('[data-tellplot="editor"]')?.getAttribute('data-interaction-state'),
    ).toBe('dragging');
    expect(host.querySelector('[data-testid="outline-drag-overlay"]')).not.toBeNull();
    fireEvent.pointerCancel(document, { pointerId: 9 });
  });

  it('localizes transient panel controls in English', () => {
    const editor = createEditor(host, { config: { ...config, locale: 'en-US' } });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    expect(root).not.toBeNull();

    fireEvent.click(getByRole(root as HTMLElement, 'button', { name: 'Open structure outline' }));

    const dialog = getByRole(root as HTMLElement, 'dialog', { name: 'Structure outline' });
    expect(getByRole(dialog, 'button', { name: 'Close structure outline' })).toBeTruthy();
    expect(
      getByRole(root as HTMLElement, 'button', { name: 'Structure outline backdrop' }),
    ).toBeTruthy();
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    expect(dialog.contains(document.activeElement)).toBe(true);
    editor.destroy();
  });

  it('clears chart group actions before a panel overlay opens', () => {
    const editor = createEditor(host, { config });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const actions = root?.querySelector<HTMLElement>('.tp-chart-stage__plot-shell > :last-child');
    expect(actions).not.toBeNull();
    if (root === null || actions === null || actions === undefined) {
      editor.destroy();
      return;
    }
    actions.hidden = false;
    actions.classList.add('tp-chart-group-actions');
    actions.style.left = '20px';
    actions.append(document.createElement('button'));

    fireEvent.click(getByRole(root, 'button', { name: '打开检查器' }));

    expect(actions.hidden).toBe(true);
    expect(actions.childElementCount).toBe(0);
    const dialog = getByRole(root, 'dialog', { name: '检查器' });
    fireEvent.click(getByRole(dialog, 'button', { name: '关闭检查器' }));
    expect(actions.hidden).toBe(true);
    expect(actions.childElementCount).toBe(0);
    editor.destroy();
  });

  it('resets localized feedback when locale or data context changes', () => {
    const editor = createEditor(host, { config });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const beta = getByRole(root as HTMLElement, 'treeitem', { name: /Beta/ });
    beta.focus();
    fireEvent.keyDown(beta, { altKey: true, key: 'ArrowDown' });
    expect(root?.querySelector('.tp-command-feedback span')?.textContent).toBe(
      '已移动，顺序已更新',
    );

    editor.update({ config: { ...config, locale: 'en-US' } });

    expect(root?.querySelector('.tp-command-feedback strong')?.textContent).toBe('READY');
    expect(root?.querySelector('.tp-command-feedback span')?.textContent).toBe(
      'Structure and amount anchors are valid',
    );
    fireEvent.click(getByRole(root as HTMLElement, 'button', { name: 'Undo' }));
    expect(root?.querySelector('.tp-command-feedback span')?.textContent).toBe(
      'Previous change undone',
    );

    editor.update({ config: replacementConfig });

    expect(root?.querySelector('.tp-command-feedback strong')?.textContent).toBe('READY');
    expect(root?.querySelector('.tp-command-feedback span')?.textContent).toBe(
      '结构与金额锚点有效',
    );
    editor.destroy();
  });

  it('preserves overlays for routine updates and closes them when data context changes', () => {
    const editor = createEditor(host, { config });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    expect(root).not.toBeNull();

    fireEvent.click(getByRole(root as HTMLElement, 'button', { name: '打开结构大纲' }));
    expect(getByRole(root as HTMLElement, 'dialog', { name: '结构大纲' })).toBeTruthy();
    expect(root?.dataset['overlayOpen']).toBe('true');

    editor.update({ config: { ...config, height: 720 } });

    expect(getByRole(root as HTMLElement, 'dialog', { name: '结构大纲' })).toBeTruthy();
    expect(root?.dataset['overlayOpen']).toBe('true');

    editor.update({ config: replacementConfig });

    expect(queryByRole(root as HTMLElement, 'dialog', { name: '结构大纲' })).toBeNull();
    expect(root?.hasAttribute('data-overlay-open')).toBe(false);
  });

  it('closes a transient panel when an update disables that panel', async () => {
    const editor = createEditor(host, { config });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    expect(root).not.toBeNull();

    fireEvent.click(getByRole(host, 'button', { name: '打开检查器' }));
    await Promise.resolve();
    expect(getByRole(host, 'dialog', { name: '检查器' })).toBeTruthy();

    editor.update({
      config: { ...config, editor: { panels: { inspector: false } } },
    });
    await Promise.resolve();

    expect(queryByRole(host, 'dialog', { name: '检查器' })).toBeNull();
    expect(queryByRole(host, 'button', { name: '打开检查器' })).toBeNull();
    expect(document.activeElement).toBe(root);

    editor.update({ config });
    fireEvent.click(getByRole(host, 'button', { name: '打开结构大纲' }));
    await Promise.resolve();
    expect(getByRole(host, 'dialog', { name: '结构大纲' })).toBeTruthy();

    editor.update({
      config: { ...config, editor: { panels: { outline: false } } },
    });
    await Promise.resolve();

    expect(queryByRole(host, 'dialog', { name: '结构大纲' })).toBeNull();
    expect(queryByRole(host, 'button', { name: '打开结构大纲' })).toBeNull();
    expect(document.activeElement).toBe(root);
    editor.destroy();
  });

  it('keeps the foreground modal authoritative when a background editor rerenders', async () => {
    const secondHost = document.createElement('div');
    document.body.append(secondHost);
    const first = createEditor(host, { config });
    const second = createEditor(secondHost, { config });

    fireEvent.click(getByRole(host, 'button', { name: '打开检查器' }));
    await Promise.resolve();
    fireEvent.click(getByRole(secondHost, 'button', { name: '打开检查器' }));
    await Promise.resolve();

    const foreground = getByRole(secondHost, 'dialog', { name: '检查器' });
    const background = host.querySelector<HTMLElement>('[role="dialog"]');
    expect(background?.closest('.tp-overlay-layer')?.hasAttribute('inert')).toBe(true);
    expect(background?.hasAttribute('aria-modal')).toBe(false);
    expect(foreground.closest('.tp-overlay-layer')?.hasAttribute('inert')).toBe(false);
    expect(foreground.getAttribute('aria-modal')).toBe('true');
    expect(foreground.contains(document.activeElement)).toBe(true);

    first.update({ config: { ...config, height: 720 } });
    await Promise.resolve();

    expect(foreground.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    await Promise.resolve();

    expect(queryByRole(secondHost, 'dialog', { name: '检查器' })).toBeNull();
    const revealed = getByRole(host, 'dialog', { name: '检查器' });
    expect(revealed.closest('.tp-overlay-layer')?.hasAttribute('inert')).toBe(false);
    expect(revealed.getAttribute('aria-modal')).toBe('true');
    expect(revealed.contains(document.activeElement)).toBe(true);

    fireEvent.click(getByRole(secondHost, 'button', { name: '打开检查器' }));
    await Promise.resolve();
    expect(
      getByRole(secondHost, 'dialog', { name: '检查器' }).contains(document.activeElement),
    ).toBe(true);
    second.destroy();
    await Promise.resolve();
    expect(getByRole(host, 'dialog', { name: '检查器' }).contains(document.activeElement)).toBe(
      true,
    );

    first.destroy();
  });

  it('preserves inspector drafts, caret, focus, and scroll across routine updates', async () => {
    const editor = createEditor(host, { config });
    fireEvent.click(getByRole(host, 'treeitem', { name: /Alpha/ }));
    fireEvent.click(getByRole(host, 'button', { name: '打开检查器' }));
    await Promise.resolve();

    let dialog = getByRole(host, 'dialog', { name: '检查器' });
    let annotation = within(dialog).getByRole<HTMLTextAreaElement>('textbox', { name: '注释' });
    const scroll = dialog.querySelector<HTMLElement>('.tp-inspector-scroll');
    expect(scroll).not.toBeNull();
    annotation.focus();
    fireEvent.input(annotation, { target: { value: 'Draft context' } });
    annotation.setSelectionRange(2, 7);
    if (scroll !== null) {
      scroll.scrollTop = 41;
    }

    const updatedConfig: ChartConfig = {
      ...config,
      locale: 'en-US',
      height: 720,
      appearance: { title: 'Updated chart' },
    };
    editor.update({ config: updatedConfig });
    await Promise.resolve();

    dialog = getByRole(host, 'dialog', { name: 'Inspector' });
    annotation = within(dialog).getByRole<HTMLTextAreaElement>('textbox', { name: 'Annotation' });
    expect(annotation.value).toBe('Draft context');
    expect(document.activeElement).toBe(annotation);
    expect(annotation.selectionStart).toBe(2);
    expect(annotation.selectionEnd).toBe(7);
    expect(dialog.querySelector<HTMLElement>('.tp-inspector-scroll')?.scrollTop).toBe(41);

    const view = editor.getView();
    editor.update({
      config: updatedConfig,
      view: { ...view, annotations: { ...view.annotations, a: 'Host rewrite' } },
    });
    await Promise.resolve();

    dialog = getByRole(host, 'dialog', { name: 'Inspector' });
    annotation = within(dialog).getByRole<HTMLTextAreaElement>('textbox', { name: 'Annotation' });
    expect(annotation.value).toBe('Host rewrite');

    fireEvent.input(annotation, { target: { value: 'Stale local rewrite' } });
    fireEvent.click(getByRole(host, 'treeitem', { name: /Gamma/ }));
    await Promise.resolve();

    dialog = getByRole(host, 'dialog', { name: 'Inspector' });
    annotation = within(dialog).getByRole<HTMLTextAreaElement>('textbox', { name: 'Annotation' });
    expect(annotation.value).toBe('');
    expect(dialog.contains(document.activeElement)).toBe(true);
    editor.destroy();
  });

  it('keeps a controlled annotation submission stable until the host commits it', async () => {
    const seed = createEditor(host, { config });
    const initialView = seed.getView();
    seed.destroy();
    host.replaceChildren();
    let candidate: ViewSpec | undefined;
    const editor = createEditor(host, {
      config,
      view: initialView,
      onViewChange: view => {
        candidate = view;
      },
    });
    fireEvent.click(getByRole(host, 'treeitem', { name: /Alpha/ }));
    fireEvent.click(getByRole(host, 'button', { name: '打开检查器' }));
    await Promise.resolve();

    let dialog = getByRole(host, 'dialog', { name: '检查器' });
    let annotation = within(dialog).getByRole<HTMLTextAreaElement>('textbox', { name: '注释' });
    fireEvent.input(annotation, { target: { value: 'Controlled draft' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存注释' }));

    expect(editor.getView().annotations['a']).toBeUndefined();
    expect(candidate?.annotations['a']).toBe('Controlled draft');
    editor.update({ config: { ...config, height: 720 }, view: initialView });
    await Promise.resolve();

    dialog = getByRole(host, 'dialog', { name: '检查器' });
    annotation = within(dialog).getByRole<HTMLTextAreaElement>('textbox', { name: '注释' });
    expect(annotation.value).toBe('Controlled draft');
    expect(within(dialog).getByRole('button', { name: '保存注释' }).hasAttribute('disabled')).toBe(
      true,
    );

    expect(candidate).not.toBeUndefined();
    editor.update({ config: { ...config, height: 720 }, view: candidate as ViewSpec });
    expect(editor.getView().annotations['a']).toBe('Controlled draft');
    editor.destroy();
  });

  it('preserves semantic focus and caret when the static workbench rerenders', async () => {
    const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.dataset['tellplot'] === 'editor') {
        return {
          x: 0,
          y: 0,
          top: 0,
          right: 1180,
          bottom: 680,
          left: 0,
          width: 1180,
          height: 680,
          toJSON: () => ({}),
        };
      }
      return getBoundingClientRect.call(this);
    });
    const editor = createEditor(host, { config });
    fireEvent.click(getByRole(host, 'treeitem', { name: /Alpha/ }));
    const inspector = getByRole(host, 'complementary', { name: '检查器' });
    let annotation = within(inspector).getByRole<HTMLTextAreaElement>('textbox', { name: '注释' });
    const scroll = inspector.querySelector<HTMLElement>('.tp-inspector-scroll');
    annotation.focus();
    fireEvent.input(annotation, { target: { value: 'Static draft' } });
    annotation.setSelectionRange(1, 6);
    if (scroll !== null) {
      scroll.scrollTop = 33;
    }

    editor.update({ config: { ...config, height: 720 } });
    await Promise.resolve();

    const updatedInspector = getByRole(host, 'complementary', { name: '检查器' });
    annotation = within(updatedInspector).getByRole<HTMLTextAreaElement>('textbox', {
      name: '注释',
    });
    expect(annotation.value).toBe('Static draft');
    expect(document.activeElement).toBe(annotation);
    expect(annotation.selectionStart).toBe(1);
    expect(annotation.selectionEnd).toBe(6);
    expect(updatedInspector.querySelector<HTMLElement>('.tp-inspector-scroll')?.scrollTop).toBe(33);

    const save = within(updatedInspector).getByRole('button', { name: '保存注释' });
    save.focus();
    fireEvent.click(save);
    await Promise.resolve();
    expect(document.activeElement).not.toBe(document.body);
    expect(host.contains(document.activeElement)).toBe(true);
    editor.destroy();
  });

  it('preserves inspector group drafts and semantic outline focus across rerenders', async () => {
    const editor = createEditor(host, { config });
    const tree = getByRole(host, 'tree', { name: '结构大纲' });
    fireEvent.click(within(tree).getByRole('treeitem', { name: /Alpha/ }));
    fireEvent.click(
      within(getByRole(host, 'tree', { name: '结构大纲' })).getByRole('checkbox', {
        name: '选择 Beta',
      }),
    );
    fireEvent.click(getByRole(host, 'button', { name: '打开检查器' }));
    await Promise.resolve();

    let inspector = getByRole(host, 'dialog', { name: '检查器' });
    let label = within(inspector).getByRole<HTMLInputElement>('textbox', { name: '分组名称' });
    label.focus();
    fireEvent.input(label, { target: { value: 'Primary' } });

    editor.update({ config: { ...config, height: 720 } });
    await Promise.resolve();

    inspector = getByRole(host, 'dialog', { name: '检查器' });
    label = within(inspector).getByRole<HTMLInputElement>('textbox', { name: '分组名称' });
    expect(label.value).toBe('Primary');
    expect(document.activeElement).toBe(label);
    fireEvent.click(within(inspector).getByRole('button', { name: '创建分组' }));
    expect(Object.values(editor.getView().groups).map(group => group.label)).toContain('Primary');

    fireEvent.keyDown(document, { key: 'Escape' });
    await Promise.resolve();
    fireEvent.click(getByRole(host, 'button', { name: '打开结构大纲' }));
    await Promise.resolve();
    let outline = getByRole(host, 'dialog', { name: '结构大纲' });
    let disclosure = within(outline).getByRole<HTMLButtonElement>('button', {
      name: '折叠 Primary',
    });
    disclosure.focus();

    editor.update({ config: { ...config, height: 721 } });
    await Promise.resolve();

    outline = getByRole(host, 'dialog', { name: '结构大纲' });
    disclosure = within(outline).getByRole<HTMLButtonElement>('button', {
      name: '折叠 Primary',
    });
    expect(document.activeElement).toBe(disclosure);
    editor.destroy();
  });

  it('discards a pending chart group before applying an update', async () => {
    const editor = createEditor(host, { config });
    await waitFor(() => {
      expect(host.querySelector('[data-testid="tellplot-chart"] canvas')).not.toBeNull();
    });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const canvas = host.querySelector<HTMLCanvasElement>('[data-testid="tellplot-chart"] canvas');
    const chart = g2Mock.instances.at(-1);
    expect(root).not.toBeNull();
    expect(canvas).not.toBeNull();
    expect(chart).not.toBeUndefined();
    if (canvas === null || chart === undefined) {
      return;
    }
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 200,
      width: 300,
      height: 200,
      toJSON: () => ({}),
    });
    const sceneElement = (nodeId: string, minY: number, maxY: number) => ({
      __data__: { data: { nodeId } },
      getBounds: () => ({ min: [10, minY], max: [40, maxY] }),
    });
    chart.context.canvas = {
      document: {
        getElementsByClassName: () => [sceneElement('a', 10, 30), sceneElement('b', 40, 60)],
      },
    };

    fireEvent.pointerDown(canvas, { button: 0, pointerId: 23, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(document, { pointerId: 23, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(document, { pointerId: 23, clientX: 100, clientY: 100 });

    expect(getByRole(root as HTMLElement, 'dialog', { name: '创建折叠分组' })).toBeTruthy();

    editor.update({ config: replacementConfig });

    expect(queryByRole(root as HTMLElement, 'dialog', { name: '创建折叠分组' })).toBeNull();
  });

  it('traps focus, preserves drafts, and respects read-only direct group updates', async () => {
    const editor = createEditor(host, { config });
    await waitFor(() => {
      expect(host.querySelector('[data-testid="tellplot-chart"] canvas')).not.toBeNull();
    });
    const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const canvas = host.querySelector<HTMLCanvasElement>('[data-testid="tellplot-chart"] canvas');
    const chart = g2Mock.instances.at(-1);
    const returnFocus = getByRole(host, 'treeitem', { name: /Alpha/ });
    expect(root).not.toBeNull();
    expect(canvas).not.toBeNull();
    expect(chart).not.toBeUndefined();
    if (root === null || canvas === null || chart === undefined) {
      return;
    }
    returnFocus.focus();
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 200,
      width: 300,
      height: 200,
      toJSON: () => ({}),
    });
    const sceneElement = (nodeId: string, minY: number, maxY: number) => ({
      __data__: { data: { nodeId } },
      getBounds: () => ({ min: [10, minY], max: [40, maxY] }),
    });
    chart.context.canvas = {
      document: {
        getElementsByClassName: () => [sceneElement('a', 10, 30), sceneElement('b', 40, 60)],
      },
    };

    fireEvent.pointerDown(canvas, { button: 0, pointerId: 24, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(document, { pointerId: 24, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(document, { pointerId: 24, clientX: 100, clientY: 100 });
    await Promise.resolve();

    let dialog = getByRole(root, 'dialog', { name: '创建折叠分组' });
    let input = getByRole<HTMLInputElement>(dialog, 'textbox', { name: '分组名称' });
    expect(document.activeElement).toBe(input);

    fireEvent.input(input, { target: { value: 'Draft group' } });
    editor.update({ config: { ...config, height: 720 } });
    dialog = getByRole(root, 'dialog', { name: '创建折叠分组' });
    input = getByRole<HTMLInputElement>(dialog, 'textbox', { name: '分组名称' });
    const create = getByRole(dialog, 'button', { name: '创建分组' });
    expect(input.value).toBe('Draft group');
    expect(create.hasAttribute('disabled')).toBe(false);
    create.focus();
    expect(document.activeElement).toBe(create);

    editor.update({ config: { ...config, height: 720, editor: { readOnly: true } } });
    await Promise.resolve();
    dialog = getByRole(root, 'dialog', { name: '创建折叠分组' });
    input = getByRole<HTMLInputElement>(dialog, 'textbox', { name: '分组名称' });
    expect(input.value).toBe('Draft group');
    expect(input.readOnly).toBe(true);
    expect(getByRole(dialog, 'button', { name: '创建分组' }).hasAttribute('disabled')).toBe(true);
    expect(document.activeElement).toBe(input);
    fireEvent.submit(dialog);
    expect(Object.keys(editor.getView().groups)).toHaveLength(0);

    editor.update({ config: { ...config, height: 720 } });
    dialog = getByRole(root, 'dialog', { name: '创建折叠分组' });
    input = getByRole<HTMLInputElement>(dialog, 'textbox', { name: '分组名称' });
    const enabledCreate = getByRole(dialog, 'button', { name: '创建分组' });
    expect(input.value).toBe('Draft group');
    expect(input.readOnly).toBe(false);
    expect(enabledCreate.hasAttribute('disabled')).toBe(false);

    enabledCreate.focus();
    fireEvent.keyDown(enabledCreate, { key: 'Tab' });
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(enabledCreate);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await Promise.resolve();
    expect(queryByRole(root, 'dialog', { name: '创建折叠分组' })).toBeNull();
    expect(document.activeElement).toBe(root);
    editor.destroy();
  });

  it('keeps form control ids unique across editor instances and transient panels', async () => {
    const secondHost = document.createElement('div');
    document.body.append(secondHost);
    const first = createEditor(host, { config });
    const second = createEditor(secondHost, { config });

    fireEvent.click(getByRole(host, 'treeitem', { name: /Alpha/ }));
    fireEvent.click(getByRole(secondHost, 'treeitem', { name: /Alpha/ }));
    fireEvent.click(getByRole(host, 'button', { name: '打开检查器' }));
    fireEvent.click(getByRole(secondHost, 'button', { name: '打开检查器' }));
    await Promise.resolve();

    const ids = Array.from(document.querySelectorAll<HTMLElement>('[id]')).map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const label of document.querySelectorAll<HTMLLabelElement>('label[for]')) {
      expect(document.getElementById(label.htmlFor)).not.toBeNull();
    }

    first.destroy();
    second.destroy();
  });

  it('groups selections, edits annotations, and shares undo history', () => {
    const editor = createEditor(host, { config });
    const tree = getByRole(host, 'tree', { name: '结构大纲' });
    fireEvent.click(within(tree).getByRole('treeitem', { name: /Alpha/ }));
    fireEvent.click(
      within(getByRole(host, 'tree', { name: '结构大纲' })).getByRole('checkbox', {
        name: '选择 Beta',
      }),
    );

    const label = getByRole(host, 'textbox', { name: '分组名称' });
    fireEvent.input(label, { target: { value: 'Primary' } });
    fireEvent.click(getByRole(host, 'button', { name: '创建分组' }));

    expect(Object.values(editor.getView().groups).map(group => group.label)).toContain('Primary');
    fireEvent.click(getByRole(host, 'treeitem', { name: /Gamma/ }));
    const annotation = getByRole(host, 'textbox', { name: '注释' });
    fireEvent.input(annotation, { target: { value: 'Watch margin' } });
    fireEvent.click(getByRole(host, 'button', { name: '保存注释' }));
    expect(editor.getView().annotations['c']).toBe('Watch margin');

    fireEvent.click(getByRole(host, 'button', { name: '撤销' }));
    expect(editor.getView().annotations['c']).toBeUndefined();
  });

  it('makes inspector group drafts read-only when the host disables editing', () => {
    const editor = createEditor(host, { config });
    const tree = getByRole(host, 'tree', { name: '结构大纲' });
    fireEvent.click(within(tree).getByRole('treeitem', { name: /Alpha/ }));
    fireEvent.click(
      within(getByRole(host, 'tree', { name: '结构大纲' })).getByRole('checkbox', {
        name: '选择 Beta',
      }),
    );
    let groupLabel = getByRole<HTMLInputElement>(host, 'textbox', { name: '分组名称' });
    fireEvent.input(groupLabel, { target: { value: 'Read-only draft' } });

    editor.update({ config: { ...config, editor: { readOnly: true } } });

    groupLabel = getByRole<HTMLInputElement>(host, 'textbox', { name: '分组名称' });
    expect(groupLabel.value).toBe('Read-only draft');
    expect(groupLabel.readOnly).toBe(true);
    expect(getByRole(host, 'button', { name: '创建分组' }).hasAttribute('disabled')).toBe(true);
    editor.destroy();
  });

  it('destroys resources idempotently and rejects container double ownership', async () => {
    const editor = createEditor(host, { config });
    expect(() => createEditor(host, { config })).toThrow(/already owns/u);

    await Promise.resolve();
    await Promise.resolve();
    const chart = g2Mock.instances.at(-1);

    editor.destroy();
    editor.destroy();

    expect(host.childElementCount).toBe(0);
    expect(() => editor.getView()).toThrow(/destroyed/u);
    expect(chart?.destroy).toHaveBeenCalledTimes(1);
    expect(queryByRole(host, 'tree')).toBeNull();
  });

  it('aborts pending offscreen exports when destroyed', async () => {
    const editor = createEditor(host, { config });
    await waitFor(() =>
      expect(host.querySelector('[data-testid="tellplot-chart-stage"]')).toHaveProperty(
        'dataset.renderState',
        'ready',
      ),
    );
    let releaseExportRender: () => void = () => undefined;
    g2Mock.renderQueue.push(
      () =>
        new Promise<void>(resolve => {
          releaseExportRender = resolve;
        }),
    );
    const pending = editor.exportImage({ format: 'png' });
    const rejected = expect(pending).rejects.toMatchObject({
      name: 'TellPlotExportError',
      code: 'EXPORT_UNAVAILABLE',
      path: '/export',
    });

    await waitFor(() =>
      expect(document.querySelector('[data-tellplot-offscreen-chart="canvas"]')).not.toBeNull(),
    );
    const exportChart = g2Mock.instances.at(-1);
    editor.destroy();

    expect(document.querySelector('[data-tellplot-offscreen-chart]')).toBeNull();
    expect(exportChart?.destroy).toHaveBeenCalledOnce();
    releaseExportRender();
    await rejected;
    expect(exportChart?.destroy).toHaveBeenCalledOnce();
  });
});
