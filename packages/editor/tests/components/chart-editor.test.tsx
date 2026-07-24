import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ChartEditor,
  createInitialViewSpec,
  type ChartConfig,
  type ChartEditorHandle,
} from '../../src';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];

    readonly options = vi.fn((options: unknown): this => {
      void options;
      return this;
    });
    readonly render = vi.fn((): Promise<void> => Promise.resolve());
    readonly on = vi.fn((): this => this);
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

const barConfig = {
  type: 'bar',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'public-bar',
    items: [
      { id: 'east', label: 'East', amount: 128 },
      { id: 'west', label: 'West', amount: 96 },
    ],
  },
  locale: 'en-US',
  appearance: {
    title: 'Revenue by region',
    axes: { category: true, value: false },
    labels: { value: 'always', group: 'never' },
  },
  editor: {
    panels: { outline: false, inspector: false, toolbar: false },
  },
} as const satisfies ChartConfig;

beforeEach(() => {
  g2Mock.Chart.instances = [];
});

describe('ChartEditor public facade', () => {
  it('renders the chart type declared by config without manual ViewSpec initialization', async () => {
    render(<ChartEditor config={barConfig} />);

    await waitFor(() =>
      expect(document.querySelector('[data-tellplot]')?.getAttribute('data-editor-state')).toBe(
        'ready',
      ),
    );
    expect(document.querySelector('[data-tellplot]')?.getAttribute('data-chart-type')).toBe('bar');
    expect(screen.getByText('Revenue by region')).toBeTruthy();
    expect(screen.queryByRole('tree', { name: 'Structure outline' })).toBeNull();
  });

  it('reports invalid JavaScript config without constructing a G2 chart', async () => {
    const onConfigRejected = vi.fn();
    const invalid = {
      ...barConfig,
      appearance: { title: 'Broken', tooltip: 'yes' },
    } as unknown as ChartConfig;

    render(<ChartEditor config={invalid} onConfigRejected={onConfigRejected} />);

    expect(
      document.querySelector('[data-tellplot="editor"]')?.getAttribute('data-editor-state'),
    ).toBe('invalid');
    expect(screen.getByRole('alert').textContent).toContain('INVALID_CHART_CONFIG');
    expect(screen.getByRole('alert').textContent).toContain('/appearance/tooltip');
    await waitFor(() => expect(onConfigRejected).toHaveBeenCalledTimes(1));
    expect(g2Mock.Chart.instances).toHaveLength(0);
  });

  it('supports controlled view state and exposes the public getView handle', async () => {
    const created = createInitialViewSpec(barConfig.data, { chartType: 'bar' });
    if (!created.ok) {
      throw new Error('Expected fixture view to be valid.');
    }
    const ref = createRef<ChartEditorHandle>();

    render(<ChartEditor ref={ref} config={barConfig} view={created.value} />);

    await waitFor(() => expect(ref.current?.getView()).toEqual(created.value));
  });

  it('rejects a controlled view from a different chart family', async () => {
    const onConfigRejected = vi.fn();
    const conflictingView = {
      schemaVersion: '2.0.0',
      chartType: 'column',
      datasetId: 'public-bar',
      revision: 0,
      rootOrder: ['east', 'west'],
      groups: {},
      collapsedGroupIds: [],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    } as const;

    render(
      <ChartEditor config={barConfig} view={conflictingView} onConfigRejected={onConfigRejected} />,
    );

    expect(screen.getByRole('alert').textContent).toContain('/view/chartType');
    await waitFor(() => expect(onConfigRejected).toHaveBeenCalledTimes(1));
    expect(g2Mock.Chart.instances).toHaveLength(0);
  });
});
