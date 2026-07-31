import type { G2Spec } from '@antv/g2';
import { describe, expect, it } from 'vitest';

import {
  createCategoricalChartSpec,
  formatCategoricalDatumAmount,
  shouldShowCategoricalValueLabels,
  visibleCategoricalAnnotation,
} from '../../src/charts/categorical/spec';
import type { CategoricalDatum, CategoricalProjection, ViewNodeId } from '@tellplot/core';

const projection = [
  {
    nodeId: 'positive',
    label: 'Positive',
    amount: 12,
    kind: 'positive',
    sourceIds: ['positive'],
    locked: false,
    order: 0,
  },
  {
    nodeId: 'negative',
    label: 'Negative',
    amount: -4,
    kind: 'negative',
    sourceIds: ['negative'],
    locked: false,
    order: 1,
  },
  {
    nodeId: 'group',
    label: 'Group',
    amount: 8,
    kind: 'group',
    sourceIds: ['positive', 'negative'],
    locked: true,
    order: 2,
  },
] as const satisfies CategoricalProjection;

interface IntervalSpecView {
  readonly type?: unknown;
  readonly data?: readonly unknown[];
  readonly coordinate?: unknown;
  readonly encode?: Readonly<Record<string, unknown>>;
  readonly scale?: {
    readonly x?: Readonly<Record<string, unknown>>;
    readonly y?: Readonly<Record<string, unknown>>;
    readonly color?: Readonly<Record<string, unknown>>;
  };
  readonly axis?: {
    readonly x?: false | Readonly<Record<string, unknown>>;
    readonly y?: false | Readonly<Record<string, unknown>>;
  };
  readonly labels?: readonly Readonly<Record<string, unknown>>[];
  readonly style?: Readonly<Record<string, unknown>>;
  readonly tooltip?: unknown;
  readonly animate?: unknown;
}

function interval(spec: G2Spec): IntervalSpecView {
  return ((spec as { readonly children?: readonly unknown[] }).children?.[0] ??
    {}) as IntervalSpecView;
}

interface ValueLabelMarkView {
  readonly data?: readonly CategoricalValueLabelDatum[];
  readonly coordinate?: unknown;
  readonly encode?: Readonly<Record<string, unknown>>;
  readonly style?: Readonly<Record<string, unknown>>;
  readonly zIndex?: unknown;
}

interface CategoricalValueLabelDatum {
  readonly labelId: string;
  readonly categoryId: string;
  readonly anchor: number;
  readonly text: string;
  readonly positive: boolean;
}

function valueLabelMark(spec: G2Spec): ValueLabelMarkView | undefined {
  const children = (spec as { readonly children?: readonly unknown[] }).children;
  return children?.find(child => {
    const mark = child as { readonly type?: unknown; readonly zIndex?: unknown };
    return mark.type === 'text' && mark.zIndex === 5;
  }) as ValueLabelMarkView | undefined;
}

function datumAccessor<TResult>(
  value: unknown,
  name: string,
): (datum: CategoricalDatum) => TResult {
  if (typeof value !== 'function') {
    throw new Error(`Expected ${name} to be a datum accessor`);
  }
  return value as (datum: CategoricalDatum) => TResult;
}

function valueLabelAccessor<TResult>(
  value: unknown,
  name: string,
): (datum: CategoricalValueLabelDatum) => TResult {
  if (typeof value !== 'function') {
    throw new Error(`Expected ${name} to be a value-label datum accessor`);
  }
  return value as (datum: CategoricalValueLabelDatum) => TResult;
}

describe('categorical G2 direction contract', () => {
  it('lets auto labels yield on compact viewports', () => {
    expect(shouldShowCategoricalValueLabels(projection)).toBe(true);
    expect(shouldShowCategoricalValueLabels(projection, true)).toBe(false);
  });

  it('uses one interval data/encode contract and changes only direction-sensitive fields', () => {
    const column = interval(
      createCategoricalChartSpec({
        projection,
        chartType: 'column',
        locale: 'en-US',
        currency: 'USD',
        reducedMotion: false,
        showValueLabels: true,
        annotations: {},
        emphasis: {},
      }),
    );
    const bar = interval(
      createCategoricalChartSpec({
        projection,
        chartType: 'bar',
        locale: 'en-US',
        currency: 'USD',
        reducedMotion: false,
        showValueLabels: true,
        annotations: {},
        emphasis: {},
      }),
    );

    expect(column).toMatchObject({
      type: 'interval',
      data: projection,
      encode: { x: 'nodeId', y: 'amount', color: 'kind', key: 'nodeId' },
      scale: {
        x: { type: 'band', padding: 0.24 },
        y: { type: 'linear', nice: true, zero: true },
      },
    });
    expect(bar.data).toEqual(column.data);
    expect(bar.encode).toEqual(column.encode);
    expect(column.coordinate).toBeUndefined();
    expect(bar.coordinate).toEqual({ transform: [{ type: 'transpose' }] });
    expect(column.scale?.x?.['reverse']).toBeUndefined();
    expect(bar.scale?.x?.['reverse']).toBe(true);
  });

  it('maps public axis settings by actual visual axis after transpose', () => {
    const appearance = { axis: { x: false, y: true } } as const;
    const column = interval(
      createCategoricalChartSpec({
        projection,
        chartType: 'column',
        locale: 'zh-CN',
        currency: undefined,
        reducedMotion: true,
        showValueLabels: false,
        annotations: {},
        emphasis: {},
        appearance,
      }),
    );
    const bar = interval(
      createCategoricalChartSpec({
        projection,
        chartType: 'bar',
        locale: 'zh-CN',
        currency: undefined,
        reducedMotion: true,
        showValueLabels: false,
        annotations: {},
        emphasis: {},
        appearance,
      }),
    );

    expect(column.axis?.x).toBe(false);
    expect(column.axis?.y).toEqual(expect.objectContaining({ labelFill: '#5F6B65' }));
    expect(bar.axis?.x).toEqual(expect.objectContaining({ labelFill: '#5F6B65' }));
    expect(bar.axis?.y).toBe(false);
  });
});

describe('categorical G2 appearance and semantics', () => {
  it('supports outside label placement and bounded text styling in both directions', () => {
    const appearance = {
      valueLabels: 'always',
      valueLabelStyle: {
        placement: 'outside',
        offset: 6,
        color: '#102A43',
        fontSize: 14,
        fontWeight: 700,
        background: true,
        backgroundColor: '#FFFFFF',
        backgroundOpacity: 0.86,
      },
    } as const;
    const barMark = valueLabelMark(
      createCategoricalChartSpec({
        projection,
        chartType: 'bar',
        locale: 'zh-CN',
        currency: undefined,
        reducedMotion: true,
        showValueLabels: true,
        annotations: {},
        emphasis: {},
        appearance,
      }),
    );
    const columnMark = valueLabelMark(
      createCategoricalChartSpec({
        projection,
        chartType: 'column',
        locale: 'zh-CN',
        currency: undefined,
        reducedMotion: true,
        showValueLabels: true,
        annotations: {},
        emphasis: {},
        appearance,
      }),
    );
    const positive = barMark?.data?.find(datum => datum.positive);
    const negative = barMark?.data?.find(datum => !datum.positive);
    const barDx = valueLabelAccessor<number>(barMark?.style?.['dx'], 'bar outside offset');
    const barAlign = valueLabelAccessor<string>(
      barMark?.style?.['textAlign'],
      'bar outside alignment',
    );
    const columnDy = valueLabelAccessor<number>(columnMark?.style?.['dy'], 'column outside offset');
    const columnBaseline = valueLabelAccessor<string>(
      columnMark?.style?.['textBaseline'],
      'column outside baseline',
    );
    if (positive === undefined || negative === undefined) {
      throw new Error('Expected styled categorical labels');
    }

    expect(barDx(positive)).toBe(6);
    expect(barDx(negative)).toBe(-6);
    expect(barAlign(positive)).toBe('start');
    expect(barAlign(negative)).toBe('end');
    expect(columnDy(positive)).toBe(-6);
    expect(columnDy(negative)).toBe(6);
    expect(columnBaseline(positive)).toBe('bottom');
    expect(columnBaseline(negative)).toBe('top');
    expect(barMark?.style).toMatchObject({
      background: true,
      backgroundFill: '#FFFFFF',
      backgroundOpacity: 0.86,
      backgroundPadding: [2, 4],
      backgroundRadius: 3,
      fill: '#102A43',
      fontSize: 14,
      fontWeight: 700,
    });
  });

  it('maps palette, labels, annotations, emphasis, Tooltip and native animation', () => {
    const spec = createCategoricalChartSpec({
      projection,
      chartType: 'bar',
      title: 'Fallback title',
      locale: 'en-US',
      currency: 'USD',
      reducedMotion: false,
      showValueLabels: true,
      annotations: { positive: '  Renewal focus  ', negative: '   ', hidden: 'Hidden' },
      emphasis: { positive: 'highlight', negative: 'muted' },
      appearance: {
        title: 'Configured categories',
        palette: { positive: '#00A36C', negative: '#D23B3B', group: '#8A5A00' },
        valueLabels: 'always',
        tooltip: true,
        animation: { enabled: true, duration: 240 },
        numberFormat: {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
          currencyDisplay: 'code',
        },
      },
    });
    const typedSpec = spec as { readonly title?: { readonly title?: string } };
    const child = interval(spec);
    const amountMark = valueLabelMark(spec);

    expect(typedSpec.title?.title).toBe('Configured categories');
    expect(child.scale?.color).toEqual({
      type: 'ordinal',
      domain: ['positive', 'negative', 'group'],
      range: ['#00A36C', '#D23B3B', '#8A5A00'],
    });
    expect(child.tooltip).toMatchObject({
      title: expect.any(Function),
      items: [expect.any(Function)],
    });
    expect(child.animate).toEqual({
      enter: {
        type: 'growInX',
        duration: 240,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      update: {
        type: 'morphing',
        duration: 240,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      exit: {
        type: 'fadeOut',
        duration: 240,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    });

    const labels = child.labels;
    if (labels === undefined || labels.length !== 1 || amountMark === undefined) {
      throw new Error('Expected a foreground amount mark and one annotation label');
    }
    const amountAlign = valueLabelAccessor<string>(
      amountMark.style?.['textAlign'],
      'amount alignment',
    );
    const amountOffset = valueLabelAccessor<number>(amountMark.style?.['dx'], 'amount offset');
    const annotationText = datumAccessor<string>(labels[0]?.['text'], 'annotation label');
    const positiveLabel = amountMark.data?.find(datum => datum.categoryId === 'positive');
    const negativeLabel = amountMark.data?.find(datum => datum.categoryId === 'negative');
    if (positiveLabel === undefined || negativeLabel === undefined) {
      throw new Error('Expected interaction-neutral categorical value-label data');
    }
    expect(amountMark.encode).toEqual({
      x: 'categoryId',
      y: 'anchor',
      text: 'text',
      key: 'labelId',
    });
    expect(positiveLabel.text).toContain('USD');
    expect(positiveLabel.anchor).toBe(projection[0].amount);
    expect(negativeLabel.anchor).toBe(projection[1].amount);
    expect(positiveLabel).not.toHaveProperty('nodeId');
    expect(negativeLabel).not.toHaveProperty('nodeId');
    expect(amountAlign(positiveLabel)).toBe('end');
    expect(amountAlign(negativeLabel)).toBe('start');
    expect(amountOffset(positiveLabel)).toBe(-2);
    expect(amountOffset(negativeLabel)).toBe(2);
    expect(amountMark).toEqual(
      expect.objectContaining({
        coordinate: { transform: [{ type: 'transpose' }] },
        zIndex: 5,
        style: expect.objectContaining({
          background: false,
          lineJoin: 'round',
          lineWidth: 1.5,
          pointerEvents: 'none',
          stroke: 'rgba(255, 255, 255, 0.92)',
        }),
      }),
    );
    expect(annotationText(projection[0])).toBe('Renewal focus');
    expect(annotationText(projection[1])).toBe('');
    expect(labels[0]).toMatchObject({ position: 'inside', style: { pointerEvents: 'none' } });

    const style = child.style;
    if (style === undefined) {
      throw new Error('Expected semantic interval styles');
    }
    const fillOpacity = datumAccessor<number>(style['fillOpacity'], 'fillOpacity');
    const lineWidth = datumAccessor<number>(style['lineWidth'], 'lineWidth');
    const stroke = datumAccessor<string>(style['stroke'], 'stroke');
    expect(fillOpacity(projection[0])).toBe(1);
    expect(lineWidth(projection[0])).toBe(3);
    expect(stroke(projection[0])).toBe('#18211D');
    expect(fillOpacity(projection[1])).toBe(0.28);
    expect(fillOpacity(projection[2])).toBe(0.96);
    expect(lineWidth(projection[2])).toBe(1);
    expect(stroke(projection[2])).toBe('#FFFFFF');
  });

  it('uses column label/animation direction and lets reduced motion override appearance', () => {
    const animated = interval(
      createCategoricalChartSpec({
        projection,
        chartType: 'column',
        locale: 'zh-CN',
        currency: undefined,
        reducedMotion: false,
        showValueLabels: true,
        annotations: {},
        emphasis: {},
        appearance: { valueLabels: 'always' },
      }),
    );
    const reduced = interval(
      createCategoricalChartSpec({
        projection,
        chartType: 'column',
        locale: 'zh-CN',
        currency: undefined,
        reducedMotion: true,
        showValueLabels: true,
        annotations: {},
        emphasis: {},
        appearance: { animation: { enabled: true, duration: 800 } },
      }),
    );
    const amountMark = valueLabelMark(
      createCategoricalChartSpec({
        projection,
        chartType: 'column',
        locale: 'zh-CN',
        currency: undefined,
        reducedMotion: false,
        showValueLabels: true,
        annotations: {},
        emphasis: {},
        appearance: { valueLabels: 'always' },
      }),
    );
    const baseline = valueLabelAccessor<string>(
      amountMark?.style?.['textBaseline'],
      'column baseline',
    );
    const offset = valueLabelAccessor<number>(amountMark?.style?.['dy'], 'column offset');
    const positiveLabel = amountMark?.data?.find(datum => datum.categoryId === 'positive');
    const negativeLabel = amountMark?.data?.find(datum => datum.categoryId === 'negative');
    if (positiveLabel === undefined || negativeLabel === undefined) {
      throw new Error('Expected column value-label data');
    }
    expect(baseline(positiveLabel)).toBe('top');
    expect(baseline(negativeLabel)).toBe('bottom');
    expect(offset(positiveLabel)).toBe(2);
    expect(offset(negativeLabel)).toBe(-2);
    expect(animated.animate).toEqual(
      expect.objectContaining({ enter: expect.objectContaining({ type: 'growInY' }) }),
    );
    expect(reduced.animate).toBe(false);
  });

  it('keeps auto value labels bounded while preserving visible annotations', () => {
    const denseProjection = Array.from({ length: 41 }, (_, order) => ({
      nodeId: `node-${order}`,
      label: `Node ${order}`,
      amount: order,
      kind: 'positive' as const,
      sourceIds: [`node-${order}`],
      locked: false,
      order,
    })) satisfies CategoricalProjection;
    expect(shouldShowCategoricalValueLabels(projection)).toBe(true);
    expect(shouldShowCategoricalValueLabels(denseProjection)).toBe(false);

    const child = interval(
      createCategoricalChartSpec({
        projection: denseProjection,
        chartType: 'column',
        locale: 'en-US',
        currency: undefined,
        reducedMotion: false,
        showValueLabels: false,
        annotations: { 'node-0': 'Visible note' },
        emphasis: {},
      }),
    );
    expect(child.labels).toHaveLength(1);
    expect(child.labels?.[0]).toMatchObject({ position: 'inside' });
  });

  it('covers defensive annotations, formatters, hidden axes and disabled animation', () => {
    const inherited = Object.create({ positive: 'Inherited' }) as Readonly<
      Record<ViewNodeId, string>
    >;
    const nonString = { positive: 42 } as unknown as Readonly<Record<ViewNodeId, string>>;
    const hostile = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error('private annotation proxy');
        },
      },
    ) as Readonly<Record<ViewNodeId, string>>;
    expect(visibleCategoricalAnnotation(inherited, 'positive')).toBe('');
    expect(visibleCategoricalAnnotation(nonString, 'positive')).toBe('');
    expect(visibleCategoricalAnnotation(hostile, 'positive')).toBe('');
    expect(formatCategoricalDatumAmount(projection[0], 'en-US')).toBe('12');

    const columnSpec = createCategoricalChartSpec({
      projection,
      chartType: 'column',
      locale: 'en-US',
      currency: undefined,
      reducedMotion: false,
      showValueLabels: true,
      annotations: hostile,
      emphasis: {},
      appearance: {
        axis: { x: true, y: false },
        valueLabels: 'never',
        animation: { enabled: false },
      },
    });
    const column = interval(columnSpec);
    expect((columnSpec as { readonly title?: unknown }).title).toBeUndefined();
    expect(column.axis?.x).toEqual(expect.objectContaining({ labelFill: '#5F6B65' }));
    expect(column.axis?.y).toBe(false);
    expect(column.labels).toEqual([]);
    expect(column.tooltip).toBe(false);
    expect(column.animate).toBe(false);

    const columnXAxis = column.axis?.x;
    if (columnXAxis === false || columnXAxis === undefined) {
      throw new Error('Expected visible column category-axis options');
    }
    const categoryFormatter = columnXAxis['labelFormatter'];
    if (typeof categoryFormatter !== 'function') {
      throw new Error('Expected a category-axis formatter');
    }
    expect(categoryFormatter('positive')).toBe('Positive');
    expect(categoryFormatter('missing')).toBe('missing');

    const bar = interval(
      createCategoricalChartSpec({
        projection,
        chartType: 'bar',
        locale: 'en-US',
        currency: 'USD',
        reducedMotion: false,
        showValueLabels: false,
        annotations: {},
        emphasis: {},
        appearance: { axis: { x: true, y: false }, valueLabels: 'never' },
      }),
    );
    expect(bar.axis?.x).toBe(false);
    expect(bar.axis?.y).toEqual(expect.objectContaining({ labelFill: '#5F6B65' }));
    const barYAxis = bar.axis?.y;
    if (barYAxis === false || barYAxis === undefined) {
      throw new Error('Expected visible bar value-axis options');
    }
    const valueFormatter = barYAxis['labelFormatter'];
    if (typeof valueFormatter !== 'function') {
      throw new Error('Expected a value-axis formatter');
    }
    expect(valueFormatter(12)).toContain('$');
  });

  it('applies dense chart styles and disables non-essential animation', () => {
    const denseProjection = Array.from({ length: 81 }, (_, order) => ({
      nodeId: `dense-${order}`,
      label: `Dense ${order}`,
      amount: order,
      kind: 'positive' as const,
      sourceIds: [`dense-${order}`],
      locked: false,
      order,
    })) satisfies CategoricalProjection;
    const child = interval(
      createCategoricalChartSpec({
        projection: denseProjection,
        chartType: 'column',
        locale: 'en-US',
        currency: undefined,
        reducedMotion: false,
        showValueLabels: true,
        annotations: { 'dense-0': 'Dense annotation' },
        emphasis: {},
        appearance: { valueLabels: 'never', animation: { enabled: true } },
      }),
    );
    expect(child.animate).toBe(false);
    expect(child.labels).toHaveLength(1);
    expect(child.labels?.[0]).toMatchObject({
      style: { fontSize: 9, wordWrapWidth: 48 },
    });
    expect(child.style?.['insetLeft']).toBe(0.5);
    expect(child.style?.['insetRight']).toBe(0.5);
    const fillOpacity = datumAccessor<number>(child.style?.['fillOpacity'], 'dense fillOpacity');
    const lineWidth = datumAccessor<number>(child.style?.['lineWidth'], 'dense lineWidth');
    const stroke = datumAccessor<string>(child.style?.['stroke'], 'dense stroke');
    const firstDatum = denseProjection[0];
    if (firstDatum === undefined) {
      throw new Error('Expected a dense projection fixture datum');
    }
    expect(fillOpacity(firstDatum)).toBe(1);
    expect(lineWidth(firstDatum)).toBe(0);
    expect(stroke(firstDatum)).toBe('transparent');
  });

  it.each(['column', 'bar'] as const)(
    'places the bounded group background behind the %s interval and its label above',
    chartType => {
      const spec = createCategoricalChartSpec({
        projection,
        chartType,
        locale: 'en-US',
        currency: undefined,
        reducedMotion: true,
        showValueLabels: false,
        appearance: { groupRegion: { label: 'auto' } },
        annotations: {},
        emphasis: {},
        groupRegions: [
          {
            regionId: 'group-region:pair',
            groupId: 'pair',
            label: 'Pair',
            depth: 1,
            startNodeId: 'positive',
            endNodeId: 'negative',
            valueStart: -4,
            valueEnd: 12,
            labelValue: 12,
          },
        ],
      });
      const children = (
        spec as {
          readonly children?: readonly {
            readonly type?: unknown;
            readonly coordinate?: unknown;
            readonly scale?: { readonly y?: { readonly domain?: readonly number[] } };
          }[];
        }
      ).children;

      expect(children?.map(child => child.type)).toEqual(['range', 'interval', 'text']);
      expect(children?.map(child => child.scale?.y?.domain)).toEqual([
        [-4, 12],
        [-4, 12],
        [-4, 12],
      ]);
      expect(children?.[0]?.coordinate).toEqual(
        chartType === 'bar' ? { transform: [{ type: 'transpose' }] } : undefined,
      );
      expect(children?.[2]?.coordinate).toEqual(
        chartType === 'bar' ? { transform: [{ type: 'transpose' }] } : undefined,
      );
    },
  );
});
