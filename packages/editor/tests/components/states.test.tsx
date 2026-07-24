import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitialViewSpec, type SourceData, type ViewSpec } from '../../src';
import { FinancialChartEditor } from '../../src/components/FinancialChartEditor';
import { WaterfallCanvas } from '../../src/components/WaterfallCanvas';
import { projectWaterfall } from '../../src/charts/waterfall/projection';
import { anchorsOnlySourceData, financialSourceData } from '../fixtures/financialSourceData';
import { commandSourceData } from '../fixtures/commandSourceData';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];
    static optionsQueue: (() => void)[] = [];
    static renderQueue: (() => Promise<void>)[] = [];
    static sceneElements: unknown[] = [];

    static reset(): void {
      Chart.instances = [];
      Chart.optionsQueue = [];
      Chart.renderQueue = [];
      Chart.sceneElements = [
        {
          __data__: { data: { nodeId: 'cost-pressure' } },
          getBounds: vi.fn(() => ({ min: [100, 0], max: [140, 100] })),
        },
      ];
    }

    readonly options = vi.fn((options: unknown): this => {
      void options;
      Chart.optionsQueue.shift()?.();
      return this;
    });
    readonly render = vi.fn(
      (): Promise<void> => Chart.renderQueue.shift()?.() ?? Promise.resolve(),
    );
    readonly on = vi.fn((event: string, listener: (event: unknown) => void): this => {
      void event;
      void listener;
      return this;
    });
    readonly off = vi.fn((event: string, listener: (event: unknown) => void): this => {
      void event;
      void listener;
      return this;
    });
    readonly finishAnimation = vi.fn((): void => undefined);
    readonly getContext = vi.fn(() => ({
      animations: [{ finish: this.finishAnimation }],
      canvas: {
        document: {
          getElementsByClassName: vi.fn(() => Chart.sceneElements),
        },
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

interface Deferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (reason?: unknown) => void;
}

function deferred(): Deferred {
  let resolve: () => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = () => resolvePromise();
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

type MockChart = InstanceType<typeof g2Mock.Chart>;

function emitChartEvent(chart: MockChart, eventName: string, event: unknown): void {
  const registration = chart.on.mock.calls.find(([name]) => name === eventName);
  const listener = registration?.[1];
  if (listener === undefined) {
    throw new Error(`Missing mocked G2 listener for ${eventName}`);
  }
  listener(event);
}

function semanticChartEvent({
  nodeId,
  pointerId,
  x,
  y = 24,
  minX = 0,
  maxX = 80,
}: {
  readonly nodeId: string;
  readonly pointerId: number;
  readonly x: number;
  readonly y?: number;
  readonly minX?: number;
  readonly maxX?: number;
}): unknown {
  const event: Record<string, unknown> = {
    canvas: { x, y },
    data: { data: { nodeId } },
    pointerId,
    target: {
      getBounds: vi.fn(() => ({ min: [minX, 0], max: [maxX, 100] })),
    },
  };
  Object.defineProperty(event, 'nativeEvent', {
    get: () => {
      throw new Error('nativeEvent must not be inspected');
    },
  });
  return event;
}

function plotChartEvent(pointerId: number, x = 120, y = 24): unknown {
  return { canvas: { x, y }, pointerId };
}

interface PointerCaptureCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly setPointerCapture: ReturnType<typeof vi.fn<(pointerId: number) => void>>;
  readonly releasePointerCapture: ReturnType<typeof vi.fn<(pointerId: number) => void>>;
}

function appendPointerCaptureCanvas(): PointerCaptureCanvas {
  const host = screen.getByTestId('tellplot-chart');
  const canvas = document.createElement('canvas');
  const setPointerCapture = vi.fn<(pointerId: number) => void>();
  const releasePointerCapture = vi.fn<(pointerId: number) => void>();
  Object.defineProperties(canvas, {
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: releasePointerCapture },
    setPointerCapture: { configurable: true, value: setPointerCapture },
  });
  host.append(canvas);
  return { canvas, setPointerCapture, releasePointerCapture };
}

function nativePointerEvent(type: string, pointerId: number, clientX = 0, clientY = 0): Event {
  const event = new Event(type);
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
    pointerId: { value: pointerId },
  });
  return event;
}

function initialView(sourceData: SourceData = financialSourceData): ViewSpec {
  const result = createInitialViewSpec(sourceData);
  if (!result.ok) {
    throw new Error('Expected a valid component test fixture');
  }
  return result.value;
}

function editorState(): string | null {
  return document.querySelector('[data-tellplot]')?.getAttribute('data-editor-state') ?? null;
}

beforeEach(() => {
  g2Mock.Chart.reset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  g2Mock.Chart.reset();
});

describe('FinancialChartEditor states', () => {
  it('keeps controlled undo and redo history available through the toolbar', async () => {
    function ControlledEditor(): React.JSX.Element {
      const [viewSpec, setViewSpec] = useState(initialView);
      return (
        <FinancialChartEditor
          sourceData={financialSourceData}
          viewSpec={viewSpec}
          onViewSpecChange={setViewSpec}
        />
      );
    }

    render(<ControlledEditor />);
    const initialOrder = within(screen.getByRole('tree', { name: '结构大纲' }))
      .getAllByRole('treeitem')
      .map(row => row.getAttribute('data-node-id'));
    const revenue = screen.getByRole('treeitem', { name: /收入增长/ });
    revenue.focus();
    fireEvent.keyDown(revenue, { altKey: true, key: 'ArrowDown' });
    await waitFor(() =>
      expect(document.querySelector('[data-tellplot]')?.getAttribute('data-view-revision')).toBe(
        '1',
      ),
    );

    const undo = screen.getByRole('button', { name: '撤销' });
    expect(undo.hasAttribute('disabled')).toBe(false);
    fireEvent.click(undo);
    await waitFor(() =>
      expect(document.querySelector('[data-tellplot]')?.getAttribute('data-view-revision')).toBe(
        '2',
      ),
    );
    expect(
      within(screen.getByRole('tree', { name: '结构大纲' }))
        .getAllByRole('treeitem')
        .map(row => row.getAttribute('data-node-id')),
    ).toEqual(initialOrder);

    const redo = screen.getByRole('button', { name: '重做' });
    expect(redo.hasAttribute('disabled')).toBe(false);
    fireEvent.click(redo);
    await waitFor(() =>
      expect(document.querySelector('[data-tellplot]')?.getAttribute('data-view-revision')).toBe(
        '3',
      ),
    );
    expect(undo.hasAttribute('disabled')).toBe(false);
  });

  it('renders the complete ready workbench and a privacy-safe text equivalent', async () => {
    render(<FinancialChartEditor sourceData={financialSourceData} />);

    await waitFor(() => expect(editorState()).toBe('ready'));
    expect(screen.getByRole('toolbar', { name: '编辑器工具栏' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '撤销' }).getAttribute('title')).toBe(
      '没有可撤销的修改',
    );
    expect(screen.queryByRole('button', { name: '导出' })).toBeNull();
    expect(screen.getByRole('tree', { name: '结构大纲' })).toBeTruthy();
    expect(screen.getByTestId('tellplot-chart-stage')).toBeTruthy();
    expect(screen.getByTestId('tellplot-chart')).toBeTruthy();
    expect(screen.getByRole('complementary', { name: '检查器' })).toBeTruthy();

    const summary = screen.getByRole('region', { name: '图表摘要' });
    expect(summary.textContent).toContain('收入增长');
    expect(summary.textContent).toContain('成本压力');
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    await waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
    expect(g2Mock.Chart.instances[0]?.options).toHaveBeenCalledWith(
      expect.objectContaining({ labelTransform: [{ type: 'overlapHide' }] }),
    );
  });

  it('keeps the default split layout and allows every chrome panel to be hidden', async () => {
    const { rerender } = render(<FinancialChartEditor sourceData={financialSourceData} />);

    await waitFor(() => expect(editorState()).toBe('ready'));
    const editor = document.querySelector<HTMLElement>('[data-tellplot="editor"]');
    const workbench = document.querySelector<HTMLElement>('.tp-workbench');
    expect(editor?.dataset['outlinePlacement']).toBe('left');
    expect(editor?.dataset['inspectorMode']).toBe('static');
    expect(workbench?.dataset['leftPanel']).toBe('outline');
    expect(workbench?.dataset['rightPanel']).toBe('inspector');

    rerender(
      <FinancialChartEditor
        sourceData={financialSourceData}
        panels={{ outline: false, inspector: false, toolbar: false }}
      />,
    );

    expect(screen.queryByRole('tree', { name: '结构大纲' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: '检查器' })).toBeNull();
    expect(screen.queryByRole('toolbar', { name: '编辑器工具栏' })).toBeNull();
    expect(editor?.dataset['toolbarVisible']).toBe('false');
    expect(workbench?.dataset['leftPanel']).toBe('none');
    expect(workbench?.dataset['rightPanel']).toBe('none');
    expect(screen.getByTestId('tellplot-chart-stage')).toBeTruthy();
  });

  it('renders outline and inspector as an accessible right-side tab rail', async () => {
    render(
      <FinancialChartEditor
        sourceData={financialSourceData}
        layout={{ outlinePlacement: 'right', inspectorMode: 'tab' }}
      />,
    );

    await waitFor(() => expect(editorState()).toBe('ready'));
    const workbench = document.querySelector<HTMLElement>('.tp-workbench');
    expect(workbench?.dataset['leftPanel']).toBe('none');
    expect(workbench?.dataset['rightPanel']).toBe('tabs');
    const tabs = screen.getByRole('tablist', { name: '结构大纲 / 检查器' });
    const outlineTab = within(tabs).getByRole('tab', { name: '结构大纲' });
    const inspectorTab = within(tabs).getByRole('tab', { name: '检查器' });
    expect(outlineTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tree', { name: '结构大纲' })).toBeTruthy();
    expect(screen.queryByRole('complementary', { name: '检查器' })).toBeNull();

    fireEvent.click(inspectorTab);
    expect(inspectorTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('tree', { name: '结构大纲' })).toBeNull();
    expect(screen.getByRole('tabpanel', { name: '检查器' })).toBeTruthy();
  });

  it('avoids an empty tab strip when only one right-rail panel is enabled', async () => {
    render(
      <FinancialChartEditor
        sourceData={financialSourceData}
        panels={{ outline: false, inspector: true }}
        layout={{ outlinePlacement: 'right', inspectorMode: 'tab' }}
      />,
    );

    await waitFor(() => expect(editorState()).toBe('ready'));
    expect(screen.queryByRole('tablist', { name: '结构大纲 / 检查器' })).toBeNull();
    expect(screen.queryByRole('tree', { name: '结构大纲' })).toBeNull();
    expect(screen.getByRole('complementary', { name: '检查器' })).toBeTruthy();
    expect(document.querySelector<HTMLElement>('.tp-workbench')?.dataset['rightPanel']).toBe(
      'inspector',
    );
  });

  it('keeps both anchors visible in the compact empty state', async () => {
    render(<FinancialChartEditor sourceData={anchorsOnlySourceData} />);

    await waitFor(() => expect(editorState()).toBe('empty'));
    expect(screen.getByText('暂无贡献项')).toBeTruthy();
    const outline = screen.getByRole('tree', { name: '结构大纲' });
    expect(within(outline).getByText('起点')).toBeTruthy();
    expect(within(outline).getByText('终点')).toBeTruthy();
    expect(screen.getByTestId('tellplot-chart')).toBeTruthy();
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    await waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
  });

  it('blocks G2 and exposes only stable code and path for invalid source data', async () => {
    const invalidSourceData: SourceData = {
      ...financialSourceData,
      items: financialSourceData.items.map(item =>
        item.id === 'cost-pressure'
          ? {
              ...item,
              label: '机密成本项目',
              amount: Number.POSITIVE_INFINITY,
              sourceRef: 'private:ledger:cost',
            }
          : item,
      ),
    };

    render(<FinancialChartEditor sourceData={invalidSourceData} />);

    await waitFor(() => expect(editorState()).toBe('invalid'));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('INVALID_SOURCE_DATA');
    expect(alert.textContent).toContain('/items/2/amount');
    expect(alert.textContent).not.toContain('机密成本项目');
    expect(alert.textContent).not.toContain('private:ledger:cost');
    expect(g2Mock.Chart.instances).toHaveLength(0);
    expect(screen.getByRole('toolbar', { name: '编辑器工具栏' })).toBeTruthy();
  });

  it('renders a deterministic invalid configuration state without creating G2', async () => {
    const viewSpec = initialView();

    render(
      <FinancialChartEditor
        sourceData={financialSourceData}
        viewSpec={viewSpec}
        defaultViewSpec={viewSpec}
      />,
    );

    await waitFor(() => expect(editorState()).toBe('invalid'));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('INVALID_CONFIGURATION');
    expect(alert.textContent).toContain('/viewSpec');
    expect(g2Mock.Chart.instances).toHaveLength(0);
  });

  it('localizes editor chrome and reports invalid status truthfully', async () => {
    const viewSpec = initialView();

    render(
      <FinancialChartEditor
        locale="en-US"
        sourceData={financialSourceData}
        viewSpec={viewSpec}
        defaultViewSpec={viewSpec}
      />,
    );

    await waitFor(() => expect(editorState()).toBe('invalid'));
    expect(screen.getByRole('toolbar', { name: 'Editor toolbar' })).toBeTruthy();
    expect(screen.getAllByText('Data cannot be rendered').length).toBeGreaterThan(0);
    expect(screen.queryByText('已校验')).toBeNull();
    expect(screen.queryByText('数据无法渲染')).toBeNull();
  });

  it('localizes chart chrome while preserving source labels', async () => {
    render(<FinancialChartEditor locale="en-US" sourceData={financialSourceData} />);

    await waitFor(() => expect(editorState()).toBe('ready'));
    expect(screen.getByText('Financial waterfall')).toBeTruthy();
    expect(screen.getByText('Operating bridge')).toBeTruthy();
    const summary = screen.getByRole('region', { name: 'Chart summary' });
    expect(summary.textContent).toContain('收入增长');
    expect(summary.textContent).toContain('positive contribution');
    expect(summary.textContent).not.toContain('正向贡献');
  });

  it('re-localizes the current feedback instead of retaining a stale message', async () => {
    const { rerender } = render(
      <FinancialChartEditor locale="zh-CN" sourceData={financialSourceData} />,
    );

    await waitFor(() => expect(editorState()).toBe('ready'));
    expect(document.querySelector('.tp-command-feedback')?.textContent).toContain(
      '结构与金额锚点有效',
    );

    rerender(<FinancialChartEditor locale="en-US" sourceData={financialSourceData} />);
    await waitFor(() =>
      expect(document.querySelector('.tp-command-feedback')?.textContent).toContain(
        'Structure and amount anchors are valid',
      ),
    );
    expect(document.querySelector('.tp-command-feedback')?.textContent).not.toContain(
      '结构与金额锚点有效',
    );
  });

  it('uses the locked committed-motion curve and a compact rounded label halo', async () => {
    render(<FinancialChartEditor sourceData={financialSourceData} />);

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const options = g2Mock.Chart.instances[0]?.options.mock.calls[0]?.[0] as
      | {
          readonly children?: readonly {
            readonly animate?: unknown;
            readonly labels?: readonly { readonly style?: Readonly<Record<string, unknown>> }[];
            readonly style?: Readonly<Record<string, unknown>>;
            readonly zIndex?: unknown;
          }[];
        }
      | undefined;
    const interval = options?.children?.[0];
    const valueLabels = options?.children?.find(child => child.zIndex === 5);
    expect(interval?.animate).toEqual({
      enter: {
        type: 'growInY',
        duration: 160,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      update: {
        type: 'morphing',
        duration: 160,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      exit: {
        type: 'fadeOut',
        duration: 160,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    });
    expect(valueLabels?.style).toMatchObject({
      fill: '#18211D',
      background: false,
      lineJoin: 'round',
      lineWidth: 1.5,
      stroke: 'rgba(255, 255, 255, 0.92)',
    });
  });

  it('lets auto labels yield on mobile while always remains an explicit override', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        (query: string): MediaQueryList =>
          ({
            matches: query === '(max-width: 759px)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(() => true),
          }) as unknown as MediaQueryList,
      ),
    );

    const { rerender } = render(<FinancialChartEditor sourceData={financialSourceData} />);

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    const options = chart?.options.mock.calls[0]?.[0] as
      { readonly children?: readonly { readonly zIndex?: unknown }[] } | undefined;
    expect(options?.children?.some(child => child.zIndex === 5)).toBe(false);
    expect(screen.getByRole('region', { name: '图表摘要' }).textContent).toContain('收入增长');

    rerender(
      <FinancialChartEditor
        chartAppearance={{ valueLabels: 'always' }}
        sourceData={financialSourceData}
      />,
    );
    await waitFor(() => expect(chart?.render).toHaveBeenCalledTimes(2));
    const forced = chart?.options.mock.calls.at(-1)?.[0] as
      { readonly children?: readonly { readonly zIndex?: unknown }[] } | undefined;
    expect(forced?.children?.some(child => child.zIndex === 5)).toBe(true);
  });

  it('uses a 32px mobile target around a narrow G2 mark without stealing distant marquee space', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        (query: string): MediaQueryList =>
          ({
            matches: query === '(max-width: 759px)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(() => true),
          }) as unknown as MediaQueryList,
      ),
    );
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected a valid mobile target projection');
    }
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'revenue-growth' } },
        getBounds: vi.fn(() => ({ min: [100, 100], max: [110, 110] })),
      },
    ];
    const onSelectNode = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onMove={vi.fn()}
        onMarqueeSelection={vi.fn()}
        onSelectNode={onSelectNode}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    const capture = appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(chart, 'plot:pointerdown', plotChartEvent(57, 92, 105));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(57, 92, 105));
    });
    expect(capture.setPointerCapture).toHaveBeenCalledWith(57);
    expect(onSelectNode).toHaveBeenCalledWith('revenue-growth');
    expect(screen.queryByTestId('chart-marquee')).toBeNull();

    act(() => {
      emitChartEvent(chart, 'plot:pointerdown', plotChartEvent(58, 70, 70));
    });
    expect(screen.getByTestId('chart-marquee')).toBeTruthy();
  });

  it('omits value labels for a dense desktop projection while retaining every mark', async () => {
    const projection = projectWaterfall(financialSourceData, initialView());
    if (!projection.ok) {
      throw new Error('Expected valid dense projection source');
    }
    const contribution = projection.value.find(datum => datum.kind === 'positive');
    if (contribution === undefined) {
      throw new Error('Expected a contribution datum');
    }
    const denseProjection = Array.from({ length: 202 }, (_, index) => ({
      ...contribution,
      nodeId: `dense-${index}`,
      label: `Dense ${index}`,
      sourceIds: [`dense-${index}`],
      order: index,
    }));

    render(<WaterfallCanvas projection={denseProjection} />);

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    expect(g2Mock.Chart.instances[0]?.options).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({ nodeId: 'dense-0' }),
              expect.objectContaining({ nodeId: 'dense-201' }),
            ]),
            animate: false,
            labels: [],
          }),
        ],
      }),
    );
    expect(screen.getByText('202 个可见节点')).toBeTruthy();
  });

  it('contains a G2 render rejection without leaking the external error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    g2Mock.Chart.renderQueue.push(() =>
      Promise.reject(new Error('private renderer failure with financial context')),
    );
    const { unmount } = render(<FinancialChartEditor sourceData={financialSourceData} />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('CHART_RENDER_ERROR');
    expect(alert.textContent).toContain('/chart');
    expect(alert.textContent).not.toContain('private renderer failure');
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('private renderer failure');
    expect(g2Mock.Chart.instances).toHaveLength(1);
    expect(g2Mock.Chart.instances[0]?.destroy).not.toHaveBeenCalled();

    unmount();
    expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce();
  });

  it('clears a prior render issue after the same projection renders successfully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    g2Mock.Chart.renderQueue.push(
      () => Promise.reject(new Error('first render failure')),
      () => Promise.resolve(),
    );
    const { rerender } = render(
      <FinancialChartEditor locale="zh-CN" sourceData={financialSourceData} />,
    );

    await screen.findByText('CHART_RENDER_ERROR');
    rerender(<FinancialChartEditor locale="en-US" sourceData={financialSourceData} />);

    await waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledTimes(2));
    expect(g2Mock.Chart.instances).toHaveLength(1);
    await waitFor(() => expect(screen.queryByText('CHART_RENDER_ERROR')).toBeNull());
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});

describe('G2 lifecycle', () => {
  it('does not leak a stale dynamically imported chart during StrictMode effect replay', async () => {
    const projection = projectWaterfall(financialSourceData, initialView());
    if (!projection.ok) {
      throw new Error('Expected valid strict lifecycle projection');
    }
    const { unmount } = render(
      <StrictMode>
        <WaterfallCanvas projection={projection.value} />
      </StrictMode>,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    await waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());

    unmount();
    expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce();
  });

  it('keeps one chart across projection updates and destroys it exactly once', async () => {
    const viewSpec = initialView();
    const reorderedView: ViewSpec = {
      ...viewSpec,
      revision: 1,
      rootOrder: ['cost-pressure', 'revenue-growth', 'tax-impact'],
    };
    const { rerender, unmount } = render(
      <FinancialChartEditor sourceData={financialSourceData} viewSpec={viewSpec} />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const first = g2Mock.Chart.instances[0];
    rerender(<FinancialChartEditor sourceData={financialSourceData} viewSpec={reorderedView} />);

    await waitFor(() => expect(first?.render).toHaveBeenCalledTimes(2));
    expect(g2Mock.Chart.instances).toHaveLength(1);
    expect(first?.options).toHaveBeenCalledTimes(2);
    expect(first?.destroy).not.toHaveBeenCalled();

    unmount();
    expect(first?.destroy).toHaveBeenCalledOnce();
  });

  it('ignores stale asynchronous render failures after a projection is replaced', async () => {
    const pending = deferred();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    g2Mock.Chart.renderQueue.push(
      () => pending.promise,
      () => Promise.resolve(),
    );
    const viewSpec = initialView();
    const reorderedView: ViewSpec = {
      ...viewSpec,
      revision: 1,
      rootOrder: ['cost-pressure', 'revenue-growth', 'tax-impact'],
    };
    const { rerender } = render(
      <FinancialChartEditor sourceData={financialSourceData} viewSpec={viewSpec} />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    rerender(<FinancialChartEditor sourceData={financialSourceData} viewSpec={reorderedView} />);
    expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce();
    await waitFor(() => expect(g2Mock.Chart.instances[0]?.finishAnimation).toHaveBeenCalledOnce());
    await act(async () => {
      pending.reject(new Error('stale private renderer failure'));
      await Promise.resolve();
    });
    await waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(editorState()).toBe('ready'));

    expect(screen.queryByText('CHART_RENDER_ERROR')).toBeNull();
    expect(editorState()).toBe('ready');
    expect(consoleError).not.toHaveBeenCalled();
    expect(g2Mock.Chart.instances).toHaveLength(1);
    expect(g2Mock.Chart.instances[0]?.destroy).not.toHaveBeenCalled();
  });

  it('does not let a stale success clear the latest active render failure', async () => {
    const pending = deferred();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    g2Mock.Chart.renderQueue.push(
      () => pending.promise,
      () => Promise.reject(new Error('latest private renderer failure')),
    );
    const viewSpec = initialView();
    const reorderedView: ViewSpec = {
      ...viewSpec,
      revision: 1,
      rootOrder: ['cost-pressure', 'revenue-growth', 'tax-impact'],
    };
    const { rerender } = render(
      <FinancialChartEditor sourceData={financialSourceData} viewSpec={viewSpec} />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    rerender(<FinancialChartEditor sourceData={financialSourceData} viewSpec={reorderedView} />);
    expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce();
    expect(screen.queryByText('CHART_RENDER_ERROR')).toBeNull();

    await act(async () => {
      pending.resolve();
      await Promise.resolve();
    });

    await screen.findByText('CHART_RENDER_ERROR');
    expect(g2Mock.Chart.instances).toHaveLength(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('contains a synchronous options failure and recovers on the next request', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    g2Mock.Chart.optionsQueue.push(() => {
      throw new Error('private synchronous options failure');
    });
    const projection = projectWaterfall(financialSourceData, initialView());
    if (!projection.ok) {
      throw new Error('Expected valid lifecycle projection');
    }
    const { rerender } = render(<WaterfallCanvas locale="zh-CN" projection={projection.value} />);

    await screen.findByText('CHART_RENDER_ERROR');
    expect(g2Mock.Chart.instances[0]?.render).not.toHaveBeenCalled();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      'private synchronous options failure',
    );

    rerender(<WaterfallCanvas locale="en-US" projection={projection.value} />);

    await waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText('CHART_RENDER_ERROR')).toBeNull());
    expect(g2Mock.Chart.instances).toHaveLength(1);
    expect(g2Mock.Chart.instances[0]?.destroy).not.toHaveBeenCalled();
  });

  it('registers semantic G2 listeners once and removes the same callbacks on cleanup', async () => {
    const { rerender, unmount } = render(
      <FinancialChartEditor locale="zh-CN" sourceData={financialSourceData} />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    await waitFor(() => expect(chart?.on.mock.calls.length).toBeGreaterThan(0));
    const registrations = chart?.on.mock.calls ?? [];
    rerender(<FinancialChartEditor locale="en-US" sourceData={financialSourceData} />);
    await waitFor(() => expect(chart?.render).toHaveBeenCalledTimes(2));
    expect(chart?.on).toHaveBeenCalledTimes(registrations.length);

    unmount();

    expect(chart?.off).toHaveBeenCalledTimes(registrations.length);
    for (const [eventName, listener] of registrations) {
      expect(chart?.off).toHaveBeenCalledWith(eventName, listener);
    }
    expect(chart?.destroy).toHaveBeenCalledOnce();
  });

  it('ignores a pending render failure after unmount and destroys the chart once', async () => {
    const pending = deferred();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    g2Mock.Chart.renderQueue.push(() => pending.promise);
    const { unmount } = render(<FinancialChartEditor sourceData={financialSourceData} />);

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    unmount();
    expect(chart?.destroy).toHaveBeenCalledOnce();

    await act(async () => {
      pending.reject(new Error('private failure after unmount'));
      await Promise.resolve();
    });

    expect(chart?.destroy).toHaveBeenCalledOnce();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('updates locale and reduced motion on one chart instance', async () => {
    const projection = projectWaterfall(financialSourceData, initialView());
    if (!projection.ok) {
      throw new Error('Expected valid lifecycle projection');
    }
    const { rerender, unmount } = render(
      <WaterfallCanvas locale="zh-CN" projection={projection.value} reducedMotion={false} />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    rerender(<WaterfallCanvas locale="en-US" projection={projection.value} reducedMotion={true} />);

    await waitFor(() => expect(chart?.render).toHaveBeenCalledTimes(2));
    expect(g2Mock.Chart.instances).toHaveLength(1);
    expect(chart?.options).toHaveBeenCalledTimes(2);
    expect(chart?.finishAnimation).toHaveBeenCalledOnce();
    unmount();
    expect(chart?.destroy).toHaveBeenCalledOnce();
  });

  it('updates the bounded public chart appearance on one G2 instance', async () => {
    const { rerender } = render(
      <FinancialChartEditor
        chartAppearance={{
          title: 'Configured bridge',
          palette: { positive: '#00A36C' },
          axis: { x: false },
          valueLabels: 'never',
          tooltip: true,
          animation: { duration: 220 },
          numberFormat: { maximumFractionDigits: 1 },
        }}
        sourceData={financialSourceData}
      />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    await waitFor(() => expect(chart?.render).toHaveBeenCalledOnce());
    expect(screen.getByRole('heading', { name: 'Configured bridge' })).toBeTruthy();
    expect(chart?.options).toHaveBeenLastCalledWith(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            axis: expect.objectContaining({ x: false }),
            labels: [],
            tooltip: true,
          }),
        ],
      }),
    );
    const firstScreenSpec = chart?.options.mock.calls.at(-1)?.[0] as
      { readonly title?: unknown } | undefined;
    expect(firstScreenSpec?.title).toBeUndefined();

    rerender(
      <FinancialChartEditor
        chartAppearance={{ title: 'Second bridge', valueLabels: 'always' }}
        sourceData={financialSourceData}
      />,
    );

    await waitFor(() => expect(chart?.render).toHaveBeenCalledTimes(2));
    expect(g2Mock.Chart.instances).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Second bridge' })).toBeTruthy();
    const secondScreenSpec = chart?.options.mock.calls.at(-1)?.[0] as
      { readonly children?: readonly { readonly zIndex?: unknown }[] } | undefined;
    expect(secondScreenSpec?.children?.some(child => child.zIndex === 5)).toBe(true);
  });

  it('does not report a pending render rejection after disposal', async () => {
    const pending = deferred();
    const onRenderError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const projection = projectWaterfall(financialSourceData, initialView());
    if (!projection.ok) {
      throw new Error('Expected valid lifecycle projection');
    }
    g2Mock.Chart.renderQueue.push(() => pending.promise);
    const { unmount } = render(
      <WaterfallCanvas projection={projection.value} onRenderError={onRenderError} />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    unmount();

    await act(async () => {
      pending.reject(new Error('private disposed rejection'));
      await Promise.resolve();
    });

    expect(onRenderError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce();
  });
});

describe('G2 direct pointer adapter', () => {
  it('draws a blank-area marquee and publishes intersected semantic nodes on release', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid marquee projection');
    }
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'revenue-growth' } },
        getBounds: vi.fn(() => ({ min: [20, 20], max: [70, 90] })),
      },
      {
        __data__: { data: { nodeId: 'cost-pressure' } },
        getBounds: vi.fn(() => ({ min: [90, 10], max: [140, 80] })),
      },
    ];
    const onMarqueeSelection = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onMarqueeSelection={onMarqueeSelection}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    const capture = appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(chart, 'plot:pointerdown', plotChartEvent(41, 0, 0));
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(41, 150, 100));
    });
    expect(capture.setPointerCapture).toHaveBeenCalledWith(41);
    const marquee = screen.getByTestId('chart-marquee');
    expect(marquee.style.left).toBe('0px');
    expect(marquee.style.top).toBe('0px');
    expect(marquee.style.width).toBe('150px');
    expect(marquee.style.height).toBe('100px');

    act(() => {
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(41, 150, 100));
    });
    expect(onMarqueeSelection).toHaveBeenCalledWith(['revenue-growth', 'cost-pressure']);
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(41);
    expect(screen.queryByTestId('chart-marquee')).toBeNull();
  });

  it('creates and collapses a chart-marquee group as one direct command', async () => {
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'revenue-growth' } },
        getBounds: vi.fn(() => ({ min: [20, 20], max: [70, 90] })),
      },
      {
        __data__: { data: { nodeId: 'cost-pressure' } },
        getBounds: vi.fn(() => ({ min: [90, 10], max: [140, 80] })),
      },
    ];
    const events: { readonly type: string; readonly source: string }[] = [];
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={financialSourceData}
        onCommand={event => events.push(event)}
        onViewSpecChange={view => views.push(view)}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(chart, 'plot:pointerdown', plotChartEvent(42, 0, 0));
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(42, 150, 100));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(42, 150, 100));
    });
    const dialog = await screen.findByRole('dialog', { name: '创建折叠分组' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '分组名称' }), {
      target: { value: '经营驱动' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建分组' }));

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]).toMatchObject({ type: 'createGroup', source: 'direct' });
    expect(views).toHaveLength(1);
    const groupId = Object.keys(views[0]?.groups ?? {})[0];
    expect(groupId).toBeDefined();
    expect(views[0]?.groups[groupId as string]?.childIds).toEqual([
      'revenue-growth',
      'cost-pressure',
    ]);
    expect(views[0]?.collapsedGroupIds).toEqual([groupId]);
    expect(views[0]?.revision).toBe(1);
    expect(screen.queryByRole('dialog', { name: '创建折叠分组' })).toBeNull();
  });

  it('shows dual DOM group actions for a collapsed group that starts an expanded parent', async () => {
    const nestedView: ViewSpec = {
      ...initialView(commandSourceData),
      rootOrder: ['outer', 'd', 'e'],
      groups: {
        inner: {
          id: 'inner',
          label: 'Inner drivers',
          childIds: ['a', 'b'],
        },
        outer: {
          id: 'outer',
          label: 'Outer drivers',
          childIds: ['inner', 'c'],
        },
      },
      collapsedGroupIds: ['inner'],
    };
    const projection = projectWaterfall(commandSourceData, nestedView);
    if (!projection.ok) {
      throw new Error('Expected valid nested action projection');
    }
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'inner' } },
        getBounds: vi.fn(() => ({ min: [30, 40], max: [90, 120] })),
      },
    ];
    const onToggleGroup = vi.fn();
    const onUngroup = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={nestedView}
        onToggleGroup={onToggleGroup}
        onUngroup={onUngroup}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerover',
        semanticChartEvent({ nodeId: 'inner', pointerId: 51, x: 60, minX: 30, maxX: 90 }),
      );
    });
    fireEvent.click(screen.getByRole('button', { name: '展开分组: Inner drivers' }));
    fireEvent.click(screen.getByRole('button', { name: '折叠分组: Outer drivers' }));
    fireEvent.click(screen.getByRole('button', { name: '取消分组: Inner drivers' }));

    expect(onToggleGroup).toHaveBeenNthCalledWith(1, 'inner', false);
    expect(onToggleGroup).toHaveBeenNthCalledWith(2, 'outer', true);
    expect(onUngroup).toHaveBeenCalledWith('inner');
  });

  it('keeps expanded-group actions after a click and hides them only after drag intent', async () => {
    const groupedView: ViewSpec = {
      ...initialView(commandSourceData),
      rootOrder: ['pair', 'c', 'd', 'e'],
      groups: {
        pair: { id: 'pair', label: 'Pair drivers', childIds: ['a', 'b'] },
      },
    };
    const projection = projectWaterfall(commandSourceData, groupedView);
    if (!projection.ok) {
      throw new Error('Expected valid group-action projection');
    }
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'a' } },
        getBounds: vi.fn(() => ({ min: [30, 40], max: [90, 120] })),
      },
      {
        __data__: { data: { nodeId: 'b' } },
        getBounds: vi.fn(() => ({ min: [110, 40], max: [170, 120] })),
      },
    ];
    const onMove = vi.fn(() => true);
    const onSelectNode = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={groupedView}
        onMove={onMove}
        onSelectNode={onSelectNode}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerover',
        semanticChartEvent({ nodeId: 'a', pointerId: 61, x: 60, minX: 30, maxX: 90 }),
      );
    });
    expect(screen.getByRole('button', { name: '折叠分组: Pair drivers' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '取消分组: Pair drivers' })).toBeTruthy();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'a', pointerId: 62, x: 60, minX: 30, maxX: 90 }),
      );
      emitChartEvent(chart, 'plot:pointerdown', plotChartEvent(62, 60));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(62, 60));
    });
    expect(onSelectNode).toHaveBeenCalledWith('a');
    expect(screen.getByRole('button', { name: '折叠分组: Pair drivers' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '取消分组: Pair drivers' })).toBeTruthy();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'a', pointerId: 63, x: 60, minX: 30, maxX: 90 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(63, 125));
    });
    expect(document.querySelector('.tp-chart-group-actions')).toBeNull();
  });

  it('moves a grouped waterfall item outside at the source group boundary', async () => {
    const groupedView: ViewSpec = {
      ...initialView(commandSourceData),
      rootOrder: ['pair', 'c', 'd', 'e'],
      groups: {
        pair: { id: 'pair', label: 'Pair drivers', childIds: ['a', 'b'] },
      },
    };
    const projection = projectWaterfall(commandSourceData, groupedView);
    if (!projection.ok) {
      throw new Error('Expected valid grouped drag projection');
    }
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'a' } },
        getBounds: vi.fn(() => ({ min: [20, 20], max: [60, 90] })),
      },
      {
        __data__: { data: { nodeId: 'b' } },
        getBounds: vi.fn(() => ({ min: [70, 20], max: [110, 90] })),
      },
      {
        __data__: { data: { nodeId: 'c' } },
        getBounds: vi.fn(() => ({ min: [140, 20], max: [180, 90] })),
      },
    ];
    const onInteractionChange = vi.fn();
    const onMove = vi.fn(() => true);
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={groupedView}
        onInteractionChange={onInteractionChange}
        onMove={onMove}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'b', pointerId: 64, x: 90, minX: 70, maxX: 110 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(64, 111));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(64, 111));
    });

    expect(onInteractionChange).toHaveBeenCalledWith({
      state: 'dragging',
      itemId: 'b',
      target: { nodeId: 'pair', placement: 'after' },
    });
    expect(onMove).toHaveBeenCalledWith('b', { containerId: 'root', index: 1 }, 'direct');
  });

  it('routes chart ungroup through one direct command and preserves the parent group', async () => {
    const nestedView: ViewSpec = {
      ...initialView(commandSourceData),
      rootOrder: ['outer', 'd', 'e'],
      groups: {
        inner: { id: 'inner', label: 'Inner drivers', childIds: ['a', 'b'] },
        outer: { id: 'outer', label: 'Outer drivers', childIds: ['inner', 'c'] },
      },
      collapsedGroupIds: ['inner'],
    };
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'inner' } },
        getBounds: vi.fn(() => ({ min: [30, 40], max: [90, 120] })),
      },
    ];
    const events: { readonly type: string; readonly source: string }[] = [];
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        defaultViewSpec={nestedView}
        sourceData={commandSourceData}
        onCommand={event => events.push(event)}
        onViewSpecChange={view => views.push(view)}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    act(() => {
      emitChartEvent(
        chart,
        'element:pointerover',
        semanticChartEvent({ nodeId: 'inner', pointerId: 54, x: 60, minX: 30, maxX: 90 }),
      );
    });
    fireEvent.click(screen.getByRole('button', { name: '取消分组: Inner drivers' }));

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]).toMatchObject({ type: 'ungroup', source: 'direct' });
    expect(views[0]?.groups['inner']).toBeUndefined();
    expect(views[0]?.groups['outer']?.childIds).toEqual(['a', 'b', 'c']);
    expect(views[0]?.collapsedGroupIds).toEqual([]);
    await waitFor(() => expect(document.querySelector('.tp-chart-group-actions')).toBeNull());
  });

  it('clears a parent drag preview when invalid input unmounts the active canvas', async () => {
    const invalidSourceData: SourceData = {
      ...financialSourceData,
      items: financialSourceData.items.map(item =>
        item.id === 'cost-pressure' ? { ...item, amount: Number.POSITIVE_INFINITY } : item,
      ),
    };
    const { rerender } = render(<FinancialChartEditor sourceData={financialSourceData} />);

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();
    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 13, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(13, 45));
    });
    expect(document.querySelector('[data-tellplot]')?.getAttribute('data-interaction-state')).toBe(
      'dragging',
    );

    rerender(<FinancialChartEditor sourceData={invalidSourceData} />);
    await waitFor(() => expect(editorState()).toBe('invalid'));
    await waitFor(() =>
      expect(
        document.querySelector('[data-tellplot]')?.getAttribute('data-interaction-state'),
      ).toBe('idle'),
    );

    rerender(<FinancialChartEditor sourceData={financialSourceData} />);
    await waitFor(() => expect(editorState()).toBe('ready'));
    expect(document.querySelector('.tp-command-feedback')?.textContent).not.toContain(
      'MOVE_PREVIEW',
    );
  });

  it('selects a locked mark on click and rejects only a horizontal drag attempt', async () => {
    const viewSpec: ViewSpec = {
      ...initialView(),
      pinnedItemIds: ['revenue-growth'],
    };
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid locked direct interaction projection');
    }
    const onCancel = vi.fn();
    const onInteractionChange = vi.fn();
    const onMove = vi.fn(() => true);
    const onSelectNode = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onCancel={onCancel}
        onInteractionChange={onInteractionChange}
        onMove={onMove}
        onSelectNode={onSelectNode}
      />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'opening-profit', pointerId: 13, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(13, 40));
    });

    expect(onSelectNode).toHaveBeenCalledOnce();
    expect(onSelectNode).toHaveBeenCalledWith('opening-profit');
    expect(onCancel).not.toHaveBeenCalled();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'operating-profit', pointerId: 14, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(14, 44));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(14, 44));
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'ending-profit', pointerId: 15, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(15, 36));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(15, 36));
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 16, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(16, 45));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(16, 45));
    });

    expect(onCancel.mock.calls).toEqual([['item-locked'], ['item-locked'], ['item-locked']]);
    expect(onInteractionChange).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onSelectNode).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('chart-drag-overlay')).toBeNull();
    expect(screen.getByTestId('tellplot-chart-stage').getAttribute('data-interaction-state')).toBe(
      'idle',
    );
  });

  it('releases a locked press outside the canvas before the next draggable press', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid locked press lifecycle projection');
    }
    const onCancel = vi.fn();
    const onMove = vi.fn(() => true);
    const onSelectNode = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onCancel={onCancel}
        onMove={onMove}
        onSelectNode={onSelectNode}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    const capture = appendPointerCaptureCanvas();
    Object.defineProperty(capture.canvas, 'getBoundingClientRect', {
      configurable: true,
      value: vi.fn(() => ({ bottom: 100, left: 0, right: 200, top: 0 })),
    });

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'opening-profit', pointerId: 58, x: 40 }),
      );
      capture.canvas.dispatchEvent(nativePointerEvent('pointerup', 58, 40, 200));
    });

    expect(capture.releasePointerCapture).toHaveBeenCalledWith(58);
    expect(onSelectNode).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 59, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(59, 135));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(59, 135));
    });

    expect(onMove).toHaveBeenCalledOnce();
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(59);
  });

  it('keeps chart click selection available in read-only mode', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid read-only selection projection');
    }
    const onCancel = vi.fn();
    const onMove = vi.fn(() => true);
    const onSelectNode = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        readOnly
        onCancel={onCancel}
        onMove={onMove}
        onSelectNode={onSelectNode}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 60, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(60, 40));
    });

    expect(onSelectNode).toHaveBeenCalledWith('revenue-growth');
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('finishes current G2 animations before starting a new direct pointer action', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid animation interruption projection');
    }
    render(
      <WaterfallCanvas projection={projection.value} viewSpec={viewSpec} onMove={() => true} />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();
    expect(chart.finishAnimation).not.toHaveBeenCalled();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 15, x: 40 }),
      );
    });

    expect(chart.finishAnimation).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('chart-drag-overlay')).toBeNull();
    act(() => {
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(15, 44));
    });
    expect(screen.getByTestId('chart-drag-overlay')).toBeTruthy();
  });

  it('treats a stationary bar press as selection without committing a move', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid click selection projection');
    }
    const onMove = vi.fn(() => true);
    const onSelectNode = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onMove={onMove}
        onSelectNode={onSelectNode}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();
    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 52, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(52, 40, 24));
    });
    expect(onSelectNode).toHaveBeenCalledWith('revenue-growth');
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ignores vertical-only travel when distinguishing a chart click from reorder', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid vertical-only pointer projection');
    }
    const onMove = vi.fn(() => true);
    const onSelectNode = vi.fn();
    const onCancel = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onCancel={onCancel}
        onMove={onMove}
        onSelectNode={onSelectNode}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();
    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 55, x: 40, y: 24 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(55, 40, 300));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(55, 40, 300));
    });
    expect(onSelectNode).toHaveBeenCalledWith('revenue-growth');
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('mirrors a chart semantic target into the outline during direct manipulation', async () => {
    render(<FinancialChartEditor sourceData={financialSourceData} />);

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 16, x: 40 }),
      );
      emitChartEvent(
        chart,
        'element:pointermove',
        semanticChartEvent({
          nodeId: 'cost-pressure',
          pointerId: 16,
          x: 135,
          minX: 100,
          maxX: 140,
        }),
      );
    });

    const targetRow = screen.getByRole('treeitem', { name: /成本压力/ });
    await waitFor(() => expect(targetRow.getAttribute('data-drop-indicator')).toBe('after'));
    expect(targetRow.getAttribute('data-interaction-state')).toBe('idle');
    expect(screen.getByTestId('tellplot-chart').getAttribute('data-drop-indicator')).toBe('after');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    });
    await waitFor(() => expect(targetRow.hasAttribute('data-drop-indicator')).toBe(false));
  });

  it('previews reorder from the dragged bar width using x only before the pointer reaches the target', async () => {
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'revenue-growth' } },
        getBounds: vi.fn(() => ({ min: [20, 20], max: [70, 90] })),
      },
      {
        __data__: { data: { nodeId: 'cost-pressure' } },
        getBounds: vi.fn(() => ({ min: [100, 240], max: [140, 300] })),
      },
      {
        __data__: { data: { nodeId: 'tax-impact' } },
        getBounds: vi.fn(() => ({ min: [170, 40], max: [210, 120] })),
      },
    ];
    render(<FinancialChartEditor sourceData={financialSourceData} />);
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({
          nodeId: 'revenue-growth',
          pointerId: 54,
          x: 45,
          y: 50,
          minX: 20,
          maxX: 70,
        }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(54, 74.99, -500));
    });
    expect(screen.getByTestId('tellplot-chart').hasAttribute('data-drop-indicator')).toBe(false);

    act(() => {
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(54, 75, 2_000));
    });
    const chartHost = screen.getByTestId('tellplot-chart');
    const targetRow = screen.getByRole('treeitem', { name: /成本压力/ });
    await waitFor(() => expect(chartHost.getAttribute('data-drop-node-id')).toBe('cost-pressure'));
    expect(chartHost.getAttribute('data-drop-indicator')).toBe('after');
    expect(chartHost.style.getPropertyValue('--tp-chart-drop-x')).toBe('140px');
    expect(targetRow.getAttribute('data-drop-indicator')).toBe('after');
  });

  it('keeps a sub-threshold horizontal jitter as a click even when bar edges touch', async () => {
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'revenue-growth' } },
        getBounds: vi.fn(() => ({ min: [20, 20], max: [70, 90] })),
      },
      {
        __data__: { data: { nodeId: 'cost-pressure' } },
        getBounds: vi.fn(() => ({ min: [71, 20], max: [111, 90] })),
      },
    ];
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid sub-threshold projection');
    }
    const onInteractionChange = vi.fn();
    const onMove = vi.fn(() => true);
    const onSelectNode = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onInteractionChange={onInteractionChange}
        onMove={onMove}
        onSelectNode={onSelectNode}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({
          nodeId: 'revenue-growth',
          pointerId: 56,
          x: 45,
          minX: 20,
          maxX: 70,
        }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(56, 46));
    });

    expect(screen.queryByTestId('chart-drag-overlay')).toBeNull();
    expect(screen.getByTestId('tellplot-chart').hasAttribute('data-drop-indicator')).toBe(false);
    expect(onInteractionChange).not.toHaveBeenCalled();

    act(() => {
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(56, 46));
    });
    expect(onMove).not.toHaveBeenCalled();
    expect(onSelectNode).toHaveBeenCalledWith('revenue-growth');
  });

  it('clears a crossed target when the pointer returns before release', async () => {
    g2Mock.Chart.sceneElements = [
      {
        __data__: { data: { nodeId: 'revenue-growth' } },
        getBounds: vi.fn(() => ({ min: [20, 20], max: [70, 90] })),
      },
      {
        __data__: { data: { nodeId: 'cost-pressure' } },
        getBounds: vi.fn(() => ({ min: [100, 20], max: [140, 90] })),
      },
    ];
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid return-drag projection');
    }
    const onCancel = vi.fn();
    const onInteractionChange = vi.fn();
    const onMove = vi.fn(() => true);
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onCancel={onCancel}
        onInteractionChange={onInteractionChange}
        onMove={onMove}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({
          nodeId: 'revenue-growth',
          pointerId: 57,
          x: 45,
          minX: 20,
          maxX: 70,
        }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(57, 75));
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(57, 45));
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(57, 45));
    });

    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenLastCalledWith('cancelled');
    expect(onInteractionChange.mock.calls).toEqual([
      [
        {
          state: 'dragging',
          itemId: 'revenue-growth',
          target: { nodeId: 'cost-pressure', placement: 'after' },
        },
      ],
      [{ state: 'dragging', itemId: 'revenue-growth', target: null }],
      [{ state: 'idle' }],
    ]);
  });

  it('reprojects affected bars before release and commits only on pointer up', async () => {
    const views: ViewSpec[] = [];
    render(
      <FinancialChartEditor
        sourceData={financialSourceData}
        onViewSpecChange={view => views.push(view)}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    appendPointerCaptureCanvas();
    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 53, x: 40 }),
      );
      emitChartEvent(
        chart,
        'element:pointermove',
        semanticChartEvent({
          nodeId: 'cost-pressure',
          pointerId: 53,
          x: 135,
          minX: 100,
          maxX: 140,
        }),
      );
    });

    expect(views).toHaveLength(0);
    await waitFor(() => expect(chart.render).toHaveBeenCalledTimes(2));
    const previewSpec = chart.options.mock.calls.at(-1)?.[0] as
      | {
          readonly children?: readonly {
            readonly data?: readonly { readonly nodeId?: string }[];
          }[];
        }
      | undefined;
    const previewOrder = previewSpec?.children?.[0]?.data?.map(datum => datum.nodeId) ?? [];
    expect(previewOrder.indexOf('cost-pressure')).toBeLessThan(
      previewOrder.indexOf('revenue-growth'),
    );

    act(() => {
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(53, 135, 24));
    });
    await waitFor(() => expect(views).toHaveLength(1));
    expect(views[0]?.rootOrder).toEqual(['cost-pressure', 'revenue-growth', 'tax-impact']);
  });

  it('cancels a direct drag when a new valid view and projection arrive', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    const replacementView: ViewSpec = {
      ...viewSpec,
      revision: 1,
      rootOrder: ['cost-pressure', 'revenue-growth', 'tax-impact'],
    };
    const replacementProjection = projectWaterfall(financialSourceData, replacementView);
    if (!projection.ok || !replacementProjection.ok) {
      throw new Error('Expected valid direct interaction projections');
    }
    const onMove = vi.fn(() => true);
    const onCancel = vi.fn();
    const { rerender } = render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onCancel={onCancel}
        onMove={onMove}
      />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    const capture = appendPointerCaptureCanvas();
    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 18, x: 40 }),
      );
      emitChartEvent(
        chart,
        'element:pointermove',
        semanticChartEvent({
          nodeId: 'cost-pressure',
          pointerId: 18,
          x: 135,
          minX: 100,
          maxX: 140,
        }),
      );
    });
    expect(screen.getByTestId('chart-drag-overlay')).toBeTruthy();

    rerender(
      <WaterfallCanvas
        projection={replacementProjection.value}
        viewSpec={replacementView}
        onCancel={onCancel}
        onMove={onMove}
      />,
    );

    await waitFor(() => expect(screen.queryByTestId('chart-drag-overlay')).toBeNull());
    expect(onCancel).toHaveBeenLastCalledWith('cancelled');
    act(() => {
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(18, 138));
    });
    expect(onMove).not.toHaveBeenCalled();
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(18);
  });

  it('uses semantic datum, scene bounds, canvas coordinates and one captured canvas to commit', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid direct interaction projection');
    }
    const onMove = vi.fn(() => true);
    const onInteractionChange = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onInteractionChange={onInteractionChange}
        onMove={onMove}
      />,
    );

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    const capture = appendPointerCaptureCanvas();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 17, x: 40 }),
      );
    });

    expect(capture.setPointerCapture).toHaveBeenCalledWith(17);
    expect(screen.queryByTestId('chart-drag-overlay')).toBeNull();
    expect(screen.getByTestId('tellplot-chart-stage').getAttribute('data-interaction-state')).toBe(
      'idle',
    );
    expect(screen.getByTestId('tellplot-chart').hasAttribute('data-drop-indicator')).toBe(false);
    expect(onInteractionChange).not.toHaveBeenCalled();

    act(() => {
      emitChartEvent(
        chart,
        'element:pointermove',
        semanticChartEvent({
          nodeId: 'cost-pressure',
          pointerId: 17,
          x: 135,
          minX: 100,
          maxX: 140,
        }),
      );
    });

    const host = screen.getByTestId('tellplot-chart');
    const overlay = screen.getByTestId('chart-drag-overlay');
    expect(host.getAttribute('data-drop-indicator')).toBe('after');
    expect(host.getAttribute('data-drop-node-id')).toBe('cost-pressure');
    expect(host.style.getPropertyValue('--tp-chart-drop-x')).toBe('140px');
    await waitFor(() => expect(overlay.style.transform).toBe('translate3d(135px, 24px, 0)'));
    expect(onInteractionChange).toHaveBeenCalledOnce();

    act(() => {
      for (let index = 0; index < 100; index += 1) {
        emitChartEvent(
          chart,
          'element:pointermove',
          semanticChartEvent({
            nodeId: 'cost-pressure',
            pointerId: 17,
            x: 136 + (index % 3),
            minX: 100,
            maxX: 140,
          }),
        );
      }
    });

    expect(onInteractionChange).toHaveBeenCalledOnce();
    expect(chart.render).toHaveBeenCalledOnce();
    expect(screen.getByTestId('chart-drag-overlay')).toBe(overlay);

    act(() => {
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(17, 138));
    });

    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith(
      'revenue-growth',
      { containerId: 'root', index: 1 },
      'direct',
    );
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(17);
    expect(screen.queryByTestId('chart-drag-overlay')).toBeNull();
    expect(host.hasAttribute('data-drop-indicator')).toBe(false);
    expect(host.style.getPropertyValue('--tp-chart-drop-x')).toBe('');
    expect(onInteractionChange).toHaveBeenLastCalledWith({ state: 'idle' });
  });

  it('uses one cleanup path for Escape, blur, native cancellation and targetless release', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid cancellation projection');
    }
    const onMove = vi.fn(() => true);
    const onCancel = vi.fn();
    render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onCancel={onCancel}
        onMove={onMove}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    const capture = appendPointerCaptureCanvas();
    const begin = (pointerId: number): void => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId, x: 40 }),
      );
    };
    const expectClean = (reason: 'cancelled' | 'invalid-target'): void => {
      expect(screen.queryByTestId('chart-drag-overlay')).toBeNull();
      expect(screen.getByTestId('tellplot-chart').hasAttribute('data-drop-indicator')).toBe(false);
      expect(onMove).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenLastCalledWith(reason);
    };

    act(() => {
      begin(21);
    });
    expect(screen.queryByTestId('chart-drag-overlay')).toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    });
    expectClean('cancelled');

    act(() => {
      begin(22);
      window.dispatchEvent(new Event('blur'));
    });
    expectClean('cancelled');

    act(() => {
      begin(23);
      capture.canvas.dispatchEvent(nativePointerEvent('pointercancel', 23));
    });
    expectClean('cancelled');

    act(() => {
      begin(24);
      capture.canvas.dispatchEvent(nativePointerEvent('lostpointercapture', 24));
    });
    expectClean('cancelled');

    act(() => {
      begin(25);
      emitChartEvent(chart, 'plot:pointerupoutside', plotChartEvent(25));
    });
    expectClean('cancelled');

    act(() => {
      begin(26);
      emitChartEvent(chart, 'plot:pointerup', plotChartEvent(26, 44));
    });
    expectClean('cancelled');

    expect(capture.setPointerCapture).toHaveBeenCalledTimes(6);
    expect(capture.releasePointerCapture).toHaveBeenCalledTimes(6);
  });

  it('detaches capture and suppresses callbacks when unmounted during an active drag', async () => {
    const viewSpec = initialView();
    const projection = projectWaterfall(financialSourceData, viewSpec);
    if (!projection.ok) {
      throw new Error('Expected valid active-unmount projection');
    }
    const onMove = vi.fn(() => true);
    const onCancel = vi.fn();
    const onInteractionChange = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { unmount } = render(
      <WaterfallCanvas
        projection={projection.value}
        viewSpec={viewSpec}
        onCancel={onCancel}
        onInteractionChange={onInteractionChange}
        onMove={onMove}
      />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    if (chart === undefined) {
      throw new Error('Expected a mocked chart instance');
    }
    const capture = appendPointerCaptureCanvas();
    act(() => {
      emitChartEvent(
        chart,
        'element:pointerdown',
        semanticChartEvent({ nodeId: 'revenue-growth', pointerId: 31, x: 40 }),
      );
      emitChartEvent(chart, 'plot:pointermove', plotChartEvent(31, 44));
    });
    expect(onInteractionChange).toHaveBeenCalledOnce();

    unmount();
    capture.canvas.dispatchEvent(nativePointerEvent('pointercancel', 31));
    emitChartEvent(chart, 'plot:pointerup', plotChartEvent(31));

    expect(capture.releasePointerCapture).toHaveBeenCalledOnce();
    expect(onInteractionChange).toHaveBeenCalledOnce();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(chart.destroy).toHaveBeenCalledOnce();
  });
});
