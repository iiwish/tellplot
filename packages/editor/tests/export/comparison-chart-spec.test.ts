import type { G2Spec } from '@antv/g2';
import { describe, expect, it } from 'vitest';

import type {
  CategoricalComparisonChartAppearance,
  CategoricalComparisonProjection,
  CategoricalComparisonSeries,
} from '@tellplot/core';
import {
  COMPARISON_INTERVAL_MARK_KEY,
  comparisonStructuralIdentity,
  createComparisonChartSpec,
  flattenComparisonProjection,
  shouldShowComparisonValueLabels,
} from '../../src/charts/categorical/comparisonSpec';

const series = [
  { id: 'actual', label: 'Actual <unsafe>' },
  { id: 'budget', label: 'Budget' },
] as const satisfies readonly CategoricalComparisonSeries[];

const projection = [
  {
    nodeId: 'north:west',
    label: 'North <West>',
    values: [
      { seriesId: 'actual', label: 'Actual <unsafe>', amount: 12 },
      { seriesId: 'budget', label: 'Budget', amount: -8 },
    ],
    kind: 'category',
    sourceIds: ['north:west'],
    locked: false,
    order: 0,
  },
  {
    nodeId: 'zero',
    label: 'Zero',
    values: [
      { seriesId: 'actual', label: 'Actual <unsafe>', amount: 0 },
      { seriesId: 'budget', label: 'Budget', amount: 0 },
    ],
    kind: 'group',
    sourceIds: ['zero-a', 'zero-b'],
    locked: true,
    order: 1,
  },
] as const satisfies CategoricalComparisonProjection;

const appearance = {
  colors: {
    series: [
      { seriesId: 'budget', color: '#112233' },
      { seriesId: 'actual', color: '#445566' },
    ],
    group: '#778899',
  },
  legend: true,
  labels: {
    value: { display: 'always', placement: 'outside', offset: 6 },
    group: 'auto',
  },
  tooltip: true,
  animation: { enabled: false },
} as const satisfies CategoricalComparisonChartAppearance;

interface MarkView {
  readonly key?: string;
  readonly type?: string;
  readonly data?: readonly Readonly<Record<string, unknown>>[];
  readonly encode?: Readonly<Record<string, unknown>>;
  readonly transform?: readonly Readonly<Record<string, unknown>>[];
  readonly scale?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly axis?: unknown;
  readonly legend?: unknown;
  readonly labels?: readonly Readonly<Record<string, unknown>>[];
  readonly style?: Readonly<Record<string, unknown>>;
  readonly tooltip?: unknown;
  readonly animate?: unknown;
  readonly coordinate?: unknown;
}

function children(spec: G2Spec): readonly MarkView[] {
  return (spec as { readonly children?: readonly MarkView[] }).children ?? [];
}

function mark(spec: G2Spec, key: string): MarkView {
  const result = children(spec).find(candidate => candidate.key === key);
  if (result === undefined) {
    throw new Error(`Expected comparison child mark ${key}`);
  }
  return result;
}

function labelPosition(markView: MarkView): (datum: { readonly amount: number }) => string {
  const position = markView.labels?.[0]?.['position'];
  if (typeof position !== 'function') {
    throw new Error('Expected a comparison label position accessor');
  }
  return position as (datum: { readonly amount: number }) => string;
}

function repeatedProjection(categoryCount: number, seriesCount: 2 | 4) {
  return Array.from({ length: categoryCount }, (_, categoryIndex) => ({
    nodeId: `category-${categoryIndex}`,
    label: `Category ${categoryIndex}`,
    values: Array.from({ length: seriesCount }, (_, seriesIndex) => ({
      seriesId: `series-${seriesIndex}`,
      label: `Series ${seriesIndex}`,
      amount: categoryIndex + seriesIndex,
    })),
    kind: 'category' as const,
    sourceIds: [`category-${categoryIndex}`],
    locked: false,
    order: categoryIndex,
  })) satisfies CategoricalComparisonProjection;
}

describe('comparison G2 screen spec', () => {
  it('flattens category-major and series-minor with collision-safe element identities', () => {
    expect(flattenComparisonProjection(projection)).toEqual([
      expect.objectContaining({
        nodeId: 'north:west',
        seriesId: 'actual',
        amount: 12,
        categoryOrder: 0,
        seriesOrder: 0,
        elementKey: JSON.stringify(['comparison-element', 'north:west', 'actual']),
      }),
      expect.objectContaining({
        nodeId: 'north:west',
        seriesId: 'budget',
        amount: -8,
        categoryOrder: 0,
        seriesOrder: 1,
        elementKey: JSON.stringify(['comparison-element', 'north:west', 'budget']),
      }),
      expect.objectContaining({ nodeId: 'zero', seriesId: 'actual', categoryOrder: 1 }),
      expect.objectContaining({ nodeId: 'zero', seriesId: 'budget', categoryOrder: 1 }),
    ]);
  });

  it.each(['column', 'bar'] as const)(
    'uses one interactive interval with explicit %s domains, padding, palette and read-only legend',
    chartType => {
      const spec = createComparisonChartSpec({
        projection,
        series,
        chartType,
        locale: 'en-US',
        currency: 'USD',
        reducedMotion: false,
        showValueLabels: true,
        annotations: { 'north:west': 'Watch', zero: 'At baseline' },
        emphasis: {},
        appearance,
      });
      const interval = mark(spec, COMPARISON_INTERVAL_MARK_KEY);
      const interactiveIntervals = children(spec).filter(
        child => child.type === 'interval' && child.tooltip !== false,
      );

      expect(interactiveIntervals).toEqual([interval]);
      expect(interval).toMatchObject({
        type: 'interval',
        encode: {
          x: 'nodeId',
          y: 'amount',
          series: 'seriesId',
          color: 'seriesId',
          key: 'elementKey',
        },
        transform: [{ type: 'dodgeX', groupBy: 'x', padding: 0.08 }],
        scale: {
          x: {
            type: 'band',
            domain: ['north:west', 'zero'],
            padding: 0.24,
            reverse: chartType === 'bar',
          },
          y: { type: 'linear', zero: true, domain: [-8, 12] },
          series: {
            type: 'band',
            domain: ['actual', 'budget'],
            paddingInner: 0.08,
            paddingOuter: 0,
          },
          color: {
            type: 'ordinal',
            domain: ['actual', 'budget'],
            range: ['#445566', '#112233'],
          },
        },
      });
      expect(interval.coordinate).toEqual(
        chartType === 'bar' ? { transform: [{ type: 'transpose' }] } : undefined,
      );
      expect(
        (
          interval.axis as {
            readonly x?: { readonly labelAutoHide?: unknown; readonly labelSpacing?: unknown };
          }
        ).x,
      ).toMatchObject({ labelAutoHide: true, labelSpacing: 6 });
      expect(interval.legend).toMatchObject({
        color: { labelFormatter: expect.any(Function) },
      });
      const formatter = (interval.legend as { color: { labelFormatter: (id: unknown) => string } })
        .color.labelFormatter;
      expect(formatter('actual')).toBe('Actual <unsafe>');
      expect((spec as { readonly interaction?: unknown }).interaction).toMatchObject({
        legendFilter: false,
        legendHighlight: false,
        tooltip: { shared: true, sort: expect.any(Function) },
      });
      expect(interval.tooltip).toMatchObject({
        title: expect.any(Function),
        items: [expect.any(Function)],
      });
      const tooltip = interval.tooltip as {
        title: (datum: NonNullable<typeof interval.data>[number]) => string;
        items: [
          (datum: NonNullable<typeof interval.data>[number]) => { name: string; value: string },
        ];
      };
      const first = interval.data?.[0];
      const second = interval.data?.[1];
      if (first === undefined || second === undefined) {
        throw new Error('Expected flattened interval data');
      }
      expect(tooltip.title(first)).toBe('North &lt;West&gt;');
      expect(tooltip.items[0](first).name).toBe('Actual &lt;unsafe&gt;');
      const sort = (
        spec as { interaction: { tooltip: { sort: (item: { name?: string }) => number } } }
      ).interaction.tooltip.sort;
      expect(sort(tooltip.items[0](first))).toBe(0);
      expect(sort(tooltip.items[0](second))).toBe(1);
    },
  );

  it('keeps the original paint order with the main interval as the only guide owner', () => {
    const spec = createComparisonChartSpec({
      projection,
      series,
      chartType: 'column',
      locale: 'en-US',
      currency: 'USD',
      reducedMotion: true,
      showValueLabels: true,
      annotations: { 'north:west': 'Watch', zero: 'At baseline' },
      emphasis: {},
      appearance,
      groupRegions: [
        {
          regionId: 'group-region:comparison',
          groupId: 'comparison',
          label: 'Comparison',
          depth: 1,
          startNodeId: 'north:west',
          endNodeId: 'zero',
          valueStart: -8,
          valueEnd: 12,
          labelValue: 12,
        },
      ],
    });
    const marks = children(spec);
    const interval = mark(spec, COMPARISON_INTERVAL_MARK_KEY);
    const intervalIndex = marks.indexOf(interval);
    const helperKeys = [
      'categorical-comparison-value-labels',
      'categorical-comparison-annotation-endpoint',
      'categorical-comparison-annotation-baseline',
      'categorical-comparison-group-labels',
    ];
    const helpers = helperKeys.map(key => mark(spec, key));

    expect(marks.filter(candidate => candidate.key === COMPARISON_INTERVAL_MARK_KEY)).toEqual([
      interval,
    ]);
    expect(marks[0]?.type).toBe('range');
    expect(intervalIndex).toBe(1);
    expect(marks.slice(intervalIndex + 1).map(candidate => candidate.key)).toEqual(helperKeys);
    expect(marks.some(candidate => candidate.key === 'categorical-comparison-guide-owner')).toBe(
      false,
    );
    expect(interval.axis).not.toBe(false);
    expect(interval.legend).not.toBe(false);
    for (const helper of helpers) {
      expect(helper.axis).toBe(false);
      expect(helper.legend).toBe(false);
      for (const channel of ['x', 'y'] as const) {
        expect(helper.scale?.[channel]?.['key']).toBe(`categorical-comparison-helper-${channel}`);
        expect(helper.scale?.[channel]?.['key']).not.toBe(interval.scale?.[channel]?.['key']);
      }
      if (helper.encode?.['series'] !== undefined) {
        expect(helper.scale?.['series']?.['key']).toBe('categorical-comparison-helper-series');
        expect(helper.scale?.['series']?.['key']).not.toBe(interval.scale?.['series']?.['key']);
      }
    }
  });

  it('uses point-attached value and annotation labels with isolated identities and transform order', () => {
    const spec = createComparisonChartSpec({
      projection,
      series,
      chartType: 'column',
      locale: 'en-US',
      currency: undefined,
      reducedMotion: true,
      showValueLabels: true,
      annotations: { 'north:west': 'Watch', zero: 'At baseline' },
      emphasis: {},
      appearance,
    });
    const value = mark(spec, 'categorical-comparison-value-labels');
    const endpoint = mark(spec, 'categorical-comparison-annotation-endpoint');
    const baseline = mark(spec, 'categorical-comparison-annotation-baseline');

    for (const helper of [value, endpoint, baseline]) {
      expect(helper).toMatchObject({
        type: 'point',
        axis: false,
        legend: false,
        tooltip: false,
        animate: false,
        style: { opacity: 0, pointerEvents: 'none' },
      });
      expect(helper.labels?.[0]?.['transform']).toEqual([
        { type: expect.any(Function), transposed: false },
        { type: 'exceedAdjust', bounds: 'main' },
      ]);
    }
    expect(value.encode).toMatchObject({ x: 'nodeId', y: 'amount', series: 'seriesId' });
    expect(value.transform).toEqual([{ type: 'dodgeX', groupBy: 'x', padding: 0.08 }]);
    expect(value.scale?.['x']).toEqual({
      ...mark(spec, COMPARISON_INTERVAL_MARK_KEY).scale?.['x'],
      key: 'categorical-comparison-helper-x',
    });
    expect(value.scale?.['series']).toEqual({
      ...mark(spec, COMPARISON_INTERVAL_MARK_KEY).scale?.['series'],
      key: 'categorical-comparison-helper-series',
    });
    expect(value.data?.map(datum => datum['helperKey'])).toEqual([
      JSON.stringify(['comparison-value-label', 'north:west', 'actual']),
      JSON.stringify(['comparison-value-label', 'north:west', 'budget']),
      JSON.stringify(['comparison-value-label', 'zero', 'actual']),
      JSON.stringify(['comparison-value-label', 'zero', 'budget']),
    ]);
    expect(endpoint.data).toEqual([
      expect.objectContaining({ nodeId: 'north:west', seriesId: 'actual', amount: 12 }),
    ]);
    expect(baseline.data).toEqual([expect.objectContaining({ nodeId: 'zero', amount: 0 })]);
    expect(baseline.encode).not.toHaveProperty('series');
  });

  it('applies value placement without changing the annotation endpoint direction', () => {
    const create = (
      placement: 'auto' | 'inside' | 'outside',
      chartType: 'bar' | 'column' = 'column',
    ) =>
      createComparisonChartSpec({
        projection,
        series,
        chartType,
        locale: 'en-US',
        currency: undefined,
        reducedMotion: true,
        showValueLabels: true,
        annotations: { 'north:west': 'Watch' },
        emphasis: {},
        appearance: {
          ...appearance,
          labels: { ...appearance.labels, value: { display: 'always', placement } },
        },
      });

    for (const placement of ['auto', 'inside'] as const) {
      const spec = create(placement);
      const valuePosition = labelPosition(mark(spec, 'categorical-comparison-value-labels'));
      expect(valuePosition({ amount: 12 })).toBe('bottom');
      expect(valuePosition({ amount: -8 })).toBe('top');
      expect(
        labelPosition(mark(spec, 'categorical-comparison-annotation-endpoint'))({ amount: 12 }),
      ).toBe('top');
      const barSpec = create(placement, 'bar');
      const barValuePosition = labelPosition(mark(barSpec, 'categorical-comparison-value-labels'));
      expect(barValuePosition({ amount: 12 })).toBe('left');
      expect(barValuePosition({ amount: -8 })).toBe('right');
      expect(
        labelPosition(mark(barSpec, 'categorical-comparison-annotation-endpoint'))({ amount: 12 }),
      ).toBe('right');
    }
    const outsidePosition = labelPosition(
      mark(create('outside'), 'categorical-comparison-value-labels'),
    );
    expect(outsidePosition({ amount: 12 })).toBe('top');
    expect(outsidePosition({ amount: -8 })).toBe('bottom');
    const outsideBarPosition = labelPosition(
      mark(create('outside', 'bar'), 'categorical-comparison-value-labels'),
    );
    expect(outsideBarPosition({ amount: 12 })).toBe('right');
    expect(outsideBarPosition({ amount: -8 })).toBe('left');
  });

  it.each([
    ['inside', 'bottom', 'left'],
    ['outside', 'top', 'right'],
    ['auto', 'top', 'right'],
  ] as const)(
    'maps comparison group label %s placement in both orientations',
    (placement, columnPosition, barPosition) => {
      const create = (chartType: 'bar' | 'column') =>
        createComparisonChartSpec({
          projection,
          series,
          chartType,
          locale: 'en-US',
          currency: undefined,
          reducedMotion: true,
          showValueLabels: true,
          annotations: {},
          emphasis: {},
          appearance: {
            ...appearance,
            labels: { ...appearance.labels, group: { display: 'auto', placement } },
          },
          groupRegions: [
            {
              regionId: 'group-region:comparison',
              groupId: 'comparison',
              label: 'Comparison',
              depth: 1,
              startNodeId: 'north:west',
              endNodeId: 'zero',
              valueStart: -8,
              valueEnd: 12,
              labelValue: 12,
            },
          ],
        });
      expect(
        mark(create('column'), 'categorical-comparison-group-labels').labels?.[0]?.['position'],
      ).toBe(columnPosition);
      expect(
        mark(create('bar'), 'categorical-comparison-group-labels').labels?.[0]?.['position'],
      ).toBe(barPosition);
    },
  );

  it('breaks equal-absolute annotation endpoint ties by source order', () => {
    const tieProjection = [
      {
        ...projection[0],
        values: [
          { ...projection[0].values[0], amount: 12 },
          { ...projection[0].values[1], amount: -12 },
        ],
      },
    ] satisfies CategoricalComparisonProjection;
    const spec = createComparisonChartSpec({
      projection: tieProjection,
      series,
      chartType: 'column',
      locale: 'en-US',
      currency: undefined,
      reducedMotion: true,
      showValueLabels: false,
      annotations: { 'north:west': 'Tie' },
      emphasis: {},
      appearance,
    });
    expect(mark(spec, 'categorical-comparison-annotation-endpoint').data).toEqual([
      expect.objectContaining({ seriesId: 'actual', amount: 12 }),
    ]);
  });

  it('uses visible comparison mark count for auto label density', () => {
    expect(shouldShowComparisonValueLabels(repeatedProjection(20, 2))).toBe(true);
    expect(shouldShowComparisonValueLabels(repeatedProjection(21, 2))).toBe(false);
    expect(shouldShowComparisonValueLabels(repeatedProjection(10, 4))).toBe(true);
    expect(shouldShowComparisonValueLabels(repeatedProjection(11, 4))).toBe(false);
    expect(shouldShowComparisonValueLabels(repeatedProjection(10, 2), true)).toBe(false);
  });

  it('keeps empty data and a hidden legend explicit without fabricating a category', () => {
    const spec = createComparisonChartSpec({
      projection: [],
      series,
      chartType: 'column',
      locale: 'en-US',
      currency: undefined,
      reducedMotion: true,
      showValueLabels: true,
      annotations: {},
      emphasis: {},
      appearance: { legend: false, tooltip: false },
    });
    const interval = mark(spec, COMPARISON_INTERVAL_MARK_KEY);
    expect(interval.data).toEqual([]);
    expect(interval.scale?.['color']?.['domain']).toEqual(['actual', 'budget']);
    expect(interval.legend).toEqual({ color: false });
    expect(interval.tooltip).toBe(false);
    expect((spec as { interaction?: unknown }).interaction).toEqual({
      legendFilter: false,
      legendHighlight: false,
    });
  });

  it('changes structural identity only for series registry ID/order/count changes', () => {
    expect(comparisonStructuralIdentity(series)).toBe(
      comparisonStructuralIdentity([
        { id: 'actual', label: 'Actual renamed' },
        { id: 'budget', label: 'Budget renamed' },
      ]),
    );
    expect(comparisonStructuralIdentity([...series].reverse())).not.toBe(
      comparisonStructuralIdentity(series),
    );
    expect(
      comparisonStructuralIdentity([...series, { id: 'forecast', label: 'Forecast' }]),
    ).not.toBe(comparisonStructuralIdentity(series));
  });
});
