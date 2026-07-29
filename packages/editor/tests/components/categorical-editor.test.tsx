import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitialViewSpec, type CategoricalSourceData, type ViewSpec } from '../../src';
import { FinancialChartEditor } from '../../src/components/FinancialChartEditor';
import type { FinancialChartEditorHandle } from '../../src/react/editorTypes';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];

    readonly options = vi.fn((options: unknown): this => {
      void options;
      return this;
    });
    readonly render = vi.fn((): Promise<void> => Promise.resolve());
    readonly on = vi.fn((name: string, listener: (event: unknown) => void): this => {
      void name;
      void listener;
      return this;
    });
    readonly off = vi.fn((): this => this);
    readonly getContext = vi.fn(() => ({
      animations: [],
      canvas: { document: { getElementsByClassName: () => [] } },
    }));
    readonly destroy = vi.fn((): void => undefined);

    constructor(readonly config: unknown) {
      Chart.instances.push(this);
    }
  }
  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));

const categoricalSource = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'categorical-editor-fixture',
  currency: 'CNY',
  items: [
    { id: 'revenue', label: '收入', amount: 120 },
    { id: 'cost', label: '成本', amount: -70 },
    { id: 'profit', label: '利润', amount: 50 },
  ],
} as const satisfies CategoricalSourceData;

const emptyCategoricalSource = {
  ...categoricalSource,
  datasetId: 'empty-categorical-editor-fixture',
  items: [],
} as const satisfies CategoricalSourceData;

function categoricalView(chartType: 'bar' | 'column'): ViewSpec {
  const result = createInitialViewSpec(categoricalSource, { chartType });
  if (!result.ok) {
    throw new Error('Expected a categorical view fixture');
  }
  return result.value;
}

beforeEach(() => {
  g2Mock.Chart.instances = [];
});

describe('FinancialChartEditor categorical dispatch', () => {
  it('renders a source-only column with logical outline and accessible summary order', async () => {
    render(<FinancialChartEditor sourceData={categoricalSource} />);

    await waitFor(() =>
      expect(document.querySelector('[data-tellplot]')?.getAttribute('data-editor-state')).toBe(
        'ready',
      ),
    );
    expect(document.querySelector('[data-tellplot]')?.getAttribute('data-chart-type')).toBe(
      'column',
    );
    expect(screen.getByText('分类柱状图')).toBeTruthy();
    const outlineLabels = within(screen.getByRole('tree', { name: '结构大纲' }))
      .getAllByRole('treeitem')
      .map(row => row.getAttribute('data-node-id'));
    expect(outlineLabels).toEqual(['revenue', 'cost', 'profit']);
    const summary = screen.getByRole('region', { name: '图表摘要' });
    expect(summary.textContent?.indexOf('收入')).toBeLessThan(
      summary.textContent?.indexOf('成本') ?? -1,
    );
    expect(summary.textContent).toContain('正值分类');
    expect(summary.textContent).toContain('负值分类');

    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    expect(g2Mock.Chart.instances[0]?.options).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            type: 'interval',
            encode: expect.objectContaining({ x: 'nodeId', y: 'amount', key: 'nodeId' }),
          }),
          expect.objectContaining({ type: 'text', zIndex: 5 }),
        ],
      }),
    );
  });

  it('renders an explicit bar with transpose and keeps controlled keyboard/history behavior', async () => {
    function ControlledBar(): React.JSX.Element {
      const [viewSpec, setViewSpec] = useState(categoricalView('bar'));
      return (
        <FinancialChartEditor
          sourceData={categoricalSource}
          viewSpec={viewSpec}
          onViewSpecChange={setViewSpec}
        />
      );
    }

    render(<ControlledBar />);
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    expect(document.querySelector('[data-tellplot]')?.getAttribute('data-chart-type')).toBe('bar');
    expect(screen.getByText('分类条形图')).toBeTruthy();
    expect(g2Mock.Chart.instances[0]?.options).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            type: 'interval',
            coordinate: { transform: [{ type: 'transpose' }] },
          }),
          expect.objectContaining({
            type: 'text',
            zIndex: 5,
            coordinate: { transform: [{ type: 'transpose' }] },
          }),
        ],
      }),
    );

    const revenue = screen.getByRole('treeitem', { name: /收入/ });
    revenue.focus();
    fireEvent.keyDown(revenue, { altKey: true, key: 'ArrowDown' });
    await waitFor(() =>
      expect(document.querySelector('[data-tellplot]')?.getAttribute('data-view-revision')).toBe(
        '1',
      ),
    );
    expect(
      within(screen.getByRole('tree', { name: '结构大纲' }))
        .getAllByRole('treeitem')
        .map(row => row.getAttribute('data-node-id')),
    ).toEqual(['cost', 'revenue', 'profit']);

    fireEvent.click(screen.getByRole('button', { name: '撤销' }));
    await waitFor(() =>
      expect(
        within(screen.getByRole('tree', { name: '结构大纲' }))
          .getAllByRole('treeitem')
          .map(row => row.getAttribute('data-node-id')),
      ).toEqual(['revenue', 'cost', 'profit']),
    );
  });

  it('renders an exportable empty categorical surface without treating it as invalid', async () => {
    render(<FinancialChartEditor sourceData={emptyCategoricalSource} />);

    await waitFor(() =>
      expect(document.querySelector('[data-tellplot]')?.getAttribute('data-editor-state')).toBe(
        'empty',
      ),
    );
    expect(screen.getByText('暂无分类项')).toBeTruthy();
    expect(screen.getByRole('region', { name: '图表摘要' }).textContent).toContain('0 个可见节点');
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
  });

  it('rejects export while a categorical direct-manipulation preview is active', async () => {
    const editorRef = createRef<FinancialChartEditorHandle>();
    render(<FinancialChartEditor ref={editorRef} sourceData={categoricalSource} />);
    await waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));

    const canvas = document.createElement('canvas');
    Object.defineProperties(canvas, {
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: vi.fn() },
      setPointerCapture: { configurable: true, value: vi.fn() },
    });
    screen.getByTestId('tellplot-chart').append(canvas);
    const chart = g2Mock.Chart.instances[0];
    const emit = (name: string, event: unknown): void => {
      const listener = chart?.on.mock.calls.find(([registered]) => registered === name)?.[1];
      if (listener === undefined) {
        throw new Error(`Missing mocked G2 listener for ${name}`);
      }
      listener(event);
    };

    emit('element:pointerdown', {
      pointerId: 12,
      canvas: { x: 30, y: 40 },
      data: { data: { nodeId: 'revenue' } },
      target: { getBounds: () => ({ min: [10, 20], max: [50, 80] }) },
    });
    emit('plot:pointermove', { pointerId: 12, canvas: { x: 80, y: 40 } });
    await waitFor(() =>
      expect(
        document.querySelector('[data-tellplot]')?.getAttribute('data-interaction-state'),
      ).toBe('dragging'),
    );

    await expect(editorRef.current?.exportImage({ format: 'svg' })).rejects.toMatchObject({
      code: 'EXPORT_UNAVAILABLE',
      path: '/export',
    });
    fireEvent.keyDown(document, { key: 'Escape' });
  });
});
