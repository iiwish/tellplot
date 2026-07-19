import { createRef, StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FinancialChartEditor,
  createInitialViewSpec,
  type FinancialChartEditorHandle,
  type ViewSpec,
} from '../../src';
import { AccessibleChartSummary } from '../../src/components/AccessibleChartSummary';
import { projectWaterfall } from '../../src/waterfall/projectWaterfall';
import { commandSourceData } from '../fixtures/commandSourceData';
import { financialSourceData } from '../fixtures/financialSourceData';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];

    readonly canvas: HTMLCanvasElement;
    readonly options = vi.fn((options: unknown): this => {
      void options;
      return this;
    });
    readonly render = vi.fn((): Promise<void> => Promise.resolve());
    readonly on = vi.fn((): this => this);
    readonly off = vi.fn((): this => this);
    readonly destroy = vi.fn((): void => undefined);
    readonly getContext = vi.fn(() => ({ animations: [] }));

    constructor(config: unknown) {
      const { container } = config as { readonly container: HTMLElement };
      this.canvas = container.ownerDocument.createElement('canvas');
      this.canvas.width = 400;
      this.canvas.height = 240;
      container.append(this.canvas);
      Chart.instances.push(this);
    }
  }
  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));
vi.mock('@antv/g-svg', () => ({
  Renderer: class Renderer {
    readonly type = 'svg';
  },
}));

function initialView(): ViewSpec {
  const result = createInitialViewSpec(financialSourceData);
  if (!result.ok) {
    throw new Error('Expected a valid accessibility fixture');
  }
  return result.value;
}

function nestedView(collapsedGroupIds: readonly string[]): ViewSpec {
  const result = createInitialViewSpec(commandSourceData);
  if (!result.ok) {
    throw new Error('Expected a valid nested accessibility fixture');
  }
  return {
    ...result.value,
    rootOrder: ['outer', 'd', 'e'],
    groups: {
      inner: { id: 'inner', label: 'Inner', childIds: ['a', 'b'] },
      outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
    },
    collapsedGroupIds,
  };
}

beforeEach(() => {
  g2Mock.Chart.instances = [];
  const context = {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FinancialChartEditor public handle', () => {
  it('restores a panel overlay to a pointer opener that the browser did not focus', async () => {
    render(<FinancialChartEditor sourceData={financialSourceData} />);

    for (const panel of [
      { open: '打开结构大纲', dialog: '结构大纲', close: '关闭结构大纲' },
      { open: '打开检查器', dialog: '检查器', close: '关闭检查器' },
    ]) {
      const opener = screen.getByRole('button', { name: panel.open });
      expect(document.activeElement).not.toBe(opener);
      fireEvent.click(opener);

      const dialog = await screen.findByRole('dialog', { name: panel.dialog });
      expect(
        document.querySelector('[data-tellplot="editor"]')?.getAttribute('data-overlay-open'),
      ).toBe('true');
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole('button', { name: panel.close })),
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => expect(document.body.contains(dialog)).toBe(false));
      expect(
        document.querySelector('[data-tellplot="editor"]')?.getAttribute('data-overlay-open'),
      ).toBeNull();
      expect(document.activeElement).toBe(opener);
    }
  });

  it('includes visible annotations in the ordered accessible chart summary', async () => {
    const view = {
      ...initialView(),
      annotations: { 'revenue-growth': '董事会口径已复核' },
    };
    render(<FinancialChartEditor sourceData={financialSourceData} viewSpec={view} />);

    const summary = await screen.findByRole('region', { name: '图表摘要' });
    expect(summary.textContent).toContain('收入增长');
    expect(summary.textContent).toContain('董事会口径已复核');
  });

  it('ignores inherited annotation keys while exposing an own visible annotation', () => {
    const projection = projectWaterfall(financialSourceData, initialView());
    if (!projection.ok) {
      throw new Error('Expected a valid own-property annotation projection');
    }
    const inherited = Object.create({ 'revenue-growth': '原型链注释不可见' }) as Record<
      string,
      string
    >;
    const { rerender } = render(
      <AccessibleChartSummary
        annotations={inherited}
        projection={projection.value}
        title="经营变动瀑布图"
        locale="zh-CN"
        currency={financialSourceData.currency}
      />,
    );

    expect(screen.getByRole('region', { name: '图表摘要' }).textContent).not.toContain(
      '原型链注释不可见',
    );

    Object.defineProperty(inherited, 'revenue-growth', {
      configurable: true,
      enumerable: true,
      value: '自有注释可见',
    });
    rerender(
      <AccessibleChartSummary
        annotations={inherited}
        projection={projection.value}
        title="经营变动瀑布图"
        locale="zh-CN"
        currency={financialSourceData.currency}
      />,
    );

    expect(screen.getByRole('region', { name: '图表摘要' }).textContent).toContain('自有注释可见');
  });

  it('renders PNG from the latest controlled revision instead of copying a stale live canvas', async () => {
    const ref = createRef<FinancialChartEditorHandle>();
    const first = initialView();
    const { rerender } = render(
      <FinancialChartEditor ref={ref} sourceData={financialSourceData} viewSpec={first} />,
    );
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));

    const latest: ViewSpec = {
      ...first,
      revision: 2,
      rootOrder: ['cost-pressure', 'revenue-growth', 'tax-impact'],
      annotations: { 'revenue-growth': '最新董事会口径' },
    };
    rerender(<FinancialChartEditor ref={ref} sourceData={financialSourceData} viewSpec={latest} />);

    const result = await ref.current?.exportImage({ format: 'png', filename: 'latest' });

    expect(result?.mimeType).toBe('image/png');
    expect(g2Mock.Chart.instances).toHaveLength(2);
    const exportSpec = g2Mock.Chart.instances[1]?.options.mock.calls[0]?.[0] as
      | {
          readonly title?: string | { readonly title?: string };
          readonly children?: readonly {
            readonly data?: readonly { readonly nodeId: string }[];
            readonly labels?: readonly Readonly<Record<string, unknown>>[];
          }[];
        }
      | undefined;
    const title = exportSpec?.title;
    expect(typeof title === 'string' ? title : title?.title).toBe('经营变动瀑布图');
    expect(exportSpec?.children?.[0]?.data?.map(datum => datum.nodeId).slice(0, 3)).toEqual([
      'opening-profit',
      'cost-pressure',
      'revenue-growth',
    ]);
    const annotation = exportSpec?.children?.[0]?.labels?.find(
      label => label['position'] === 'inside',
    )?.['text'];
    const revenue = exportSpec?.children?.[0]?.data?.find(
      datum => datum.nodeId === 'revenue-growth',
    );
    expect(typeof annotation).toBe('function');
    expect(
      typeof annotation === 'function' && revenue !== undefined ? annotation(revenue) : undefined,
    ).toBe('最新董事会口径');
  });

  it('focuses the workbench, returns the current controlled view and exports PNG without download', async () => {
    const ref = createRef<FinancialChartEditorHandle>();
    const first = initialView();
    const { rerender } = render(
      <StrictMode>
        <FinancialChartEditor ref={ref} sourceData={financialSourceData} viewSpec={first} />
      </StrictMode>,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    const next = { ...first, revision: 4 };
    rerender(
      <StrictMode>
        <FinancialChartEditor ref={ref} sourceData={financialSourceData} viewSpec={next} />
      </StrictMode>,
    );

    expect(ref.current?.getViewSpec()).toBe(next);
    ref.current?.focus();
    expect(document.activeElement).toBe(document.querySelector('[data-tellplot="editor"]'));

    const result = await ref.current?.exportImage({ format: 'png', filename: 'bridge' });
    expect(result).toMatchObject({
      mimeType: 'image/png',
      suggestedFilename: 'bridge.png',
      width: 800,
      height: 480,
    });
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('rejects invalid and unmounted export with privacy-safe structured errors', async () => {
    const invalidRef = createRef<FinancialChartEditorHandle>();
    render(
      <FinancialChartEditor
        ref={invalidRef}
        sourceData={financialSourceData}
        viewSpec={initialView()}
        defaultViewSpec={initialView()}
      />,
    );
    await waitFor(() => expect(invalidRef.current).not.toBeNull());
    await expect(invalidRef.current?.exportImage({ format: 'png' })).rejects.toMatchObject({
      code: 'EXPORT_UNAVAILABLE',
      path: '/export',
    });

    const mountedRef = createRef<FinancialChartEditorHandle>();
    const mounted = render(
      <FinancialChartEditor ref={mountedRef} sourceData={financialSourceData} />,
    );
    await waitFor(() => expect(mountedRef.current).not.toBeNull());
    const retained = mountedRef.current;
    mounted.unmount();
    await expect(retained?.exportImage({ format: 'png' })).rejects.toMatchObject({
      code: 'EXPORT_UNAVAILABLE',
      path: '/export',
    });
  });

  it('cleans up the offscreen SVG renderer after a structured render failure', async () => {
    const ref = createRef<FinancialChartEditorHandle>();
    render(<FinancialChartEditor ref={ref} sourceData={financialSourceData} />);
    await waitFor(() => expect(ref.current).not.toBeNull());

    await expect(ref.current?.exportImage({ format: 'svg' })).rejects.toMatchObject({
      code: 'EXPORT_FAILED',
      path: '/export/svg',
    });
    expect(document.body.querySelector('[style*="-10000px"]')).toBeNull();
  });

  it('rejects export while a live reorder preview is active', async () => {
    const ref = createRef<FinancialChartEditorHandle>();
    render(<FinancialChartEditor ref={ref} sourceData={financialSourceData} />);
    await waitFor(() => expect(ref.current).not.toBeNull());
    const chartStage = screen.getByTestId('tellplot-chart-stage');
    chartStage.setAttribute('data-interaction-state', 'dragging');

    await expect(ref.current?.exportImage({ format: 'png' })).rejects.toMatchObject({
      code: 'EXPORT_UNAVAILABLE',
      path: '/export',
    });
  });

  it('keeps an ordered text equivalent for every visible datum', async () => {
    render(<FinancialChartEditor sourceData={financialSourceData} />);
    const summary = await screen.findByRole('region', { name: '图表摘要' });
    const items = [...summary.querySelectorAll('li')].map(item => item.textContent);
    expect(items).toHaveLength(financialSourceData.items.length);
    expect(items[0]).toContain('期初利润');
    expect(items.at(-1)).toContain('期末利润');
  });

  it('summarizes only the visible aggregate when a group is collapsed', async () => {
    const base = initialView();
    const grouped: ViewSpec = {
      ...base,
      rootOrder: ['profit-drivers', 'tax-impact'],
      groups: {
        'profit-drivers': {
          id: 'profit-drivers',
          label: '经营驱动',
          childIds: ['revenue-growth', 'cost-pressure'],
        },
      },
      collapsedGroupIds: ['profit-drivers'],
    };
    const { rerender } = render(
      <FinancialChartEditor sourceData={financialSourceData} viewSpec={grouped} />,
    );

    const collapsed = await screen.findByRole('region', { name: '图表摘要' });
    expect(collapsed.textContent).toContain('经营驱动');
    expect(collapsed.textContent).not.toContain('收入增长');
    expect(collapsed.textContent).not.toContain('成本压力');

    rerender(
      <FinancialChartEditor
        sourceData={financialSourceData}
        viewSpec={{ ...grouped, collapsedGroupIds: [] }}
      />,
    );
    const expanded = screen.getByRole('region', { name: '图表摘要' });
    expect(expanded.textContent).not.toContain('经营驱动');
    expect(expanded.textContent).toContain('收入增长');
    expect(expanded.textContent).toContain('成本压力');
  });

  it('summarizes the recursive visible projection without exposing hidden descendants', async () => {
    const { rerender } = render(
      <FinancialChartEditor sourceData={commandSourceData} viewSpec={nestedView(['inner'])} />,
    );

    const summary = await screen.findByRole('region', { name: '图表摘要' });
    const visibleLabels = (): string[] =>
      [...summary.querySelectorAll('li')].map(item => item.textContent?.split(',')[0] ?? '');

    expect(summary.querySelector('p')?.textContent).toContain('共 7 个可见节点');
    expect(visibleLabels()).toEqual([
      'Opening',
      'Inner',
      'Gamma confidential',
      'Subtotal',
      'Delta confidential',
      'Epsilon confidential',
      'Ending',
    ]);
    expect(summary.querySelectorAll('li')[1]?.textContent).toContain('Inner, 分组');
    expect(summary.textContent).not.toContain('Alpha confidential');
    expect(summary.textContent).not.toContain('Beta confidential');
    expect(summary.textContent).not.toContain('Outer');

    rerender(
      <FinancialChartEditor
        sourceData={commandSourceData}
        viewSpec={nestedView(['inner', 'outer'])}
      />,
    );
    await waitFor(() =>
      expect(summary.querySelector('p')?.textContent).toContain('共 6 个可见节点'),
    );
    expect(visibleLabels()).toEqual([
      'Opening',
      'Outer',
      'Subtotal',
      'Delta confidential',
      'Epsilon confidential',
      'Ending',
    ]);
    expect(summary.querySelectorAll('li')[1]?.textContent).toContain('Outer, 分组');
    expect(summary.textContent).not.toContain('Inner');
    expect(summary.textContent).not.toContain('Gamma confidential');

    rerender(<FinancialChartEditor sourceData={commandSourceData} viewSpec={nestedView([])} />);
    await waitFor(() =>
      expect(summary.querySelector('p')?.textContent).toContain('共 8 个可见节点'),
    );
    expect(visibleLabels()).toEqual([
      'Opening',
      'Alpha confidential',
      'Beta confidential',
      'Gamma confidential',
      'Subtotal',
      'Delta confidential',
      'Epsilon confidential',
      'Ending',
    ]);
    expect(summary.textContent).not.toContain('Inner');
    expect(summary.textContent).not.toContain('Outer');
  });
});

describe('FinancialChartEditor chart appearance accessibility', () => {
  it('uses the configured title and number format in the ordered text equivalent', async () => {
    render(
      <FinancialChartEditor
        chartAppearance={{
          title: 'Board bridge',
          numberFormat: {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
            currencyDisplay: 'code',
          },
        }}
        locale="en-US"
        sourceData={financialSourceData}
      />,
    );

    const summary = await screen.findByRole('region', { name: 'Chart summary' });
    expect(summary.querySelector('p')?.textContent).toContain('Board bridge');
    expect(summary.textContent).toContain('CNY');
    expect(summary.textContent).toContain('1,000.0');
  });
});
