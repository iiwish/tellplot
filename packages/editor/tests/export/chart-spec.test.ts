import { describe, expect, it } from 'vitest';

import { createInitialViewSpec, projectWaterfall, type WaterfallDatum } from '@tellplot/core';
import { createWaterfallChartSpec } from '../../src/charts/waterfall/spec';
import { shouldShowWaterfallValueLabels } from '../../src/charts/waterfall/spec';
import { financialSourceData } from '../fixtures/financialSourceData';

interface WaterfallValueLabelDatum {
  readonly labelId: string;
  readonly categoryId: string;
  readonly anchor: number;
  readonly text: string;
  readonly rises: boolean;
}

function styleAccessor(
  style: Readonly<Record<string, unknown>>,
  key: string,
): (datum: WaterfallDatum) => unknown {
  const value = style[key];
  if (typeof value !== 'function') {
    throw new Error(`Expected ${key} to be a datum style accessor`);
  }
  return value as (datum: WaterfallDatum) => unknown;
}

function waterfallValueLabelMark(spec: unknown):
  | {
      readonly data?: readonly WaterfallValueLabelDatum[];
      readonly encode?: Readonly<Record<string, unknown>>;
      readonly style?: Readonly<Record<string, unknown>>;
      readonly zIndex?: unknown;
    }
  | undefined {
  const children = (spec as { readonly children?: readonly unknown[] }).children;
  return children?.find(child => {
    const mark = child as { readonly type?: unknown; readonly zIndex?: unknown };
    return mark.type === 'text' && mark.zIndex === 5;
  }) as
    | {
        readonly data?: readonly WaterfallValueLabelDatum[];
        readonly encode?: Readonly<Record<string, unknown>>;
        readonly style?: Readonly<Record<string, unknown>>;
        readonly zIndex?: unknown;
      }
    | undefined;
}

describe('waterfall chart emphasis', () => {
  it('lets auto labels yield on compact viewports while always remains a spec-level override', () => {
    const projection = [
      {
        nodeId: 'only',
        label: 'Only',
        amount: 10,
        start: 0,
        end: 10,
        kind: 'positive',
        sourceIds: ['only'],
        groupPath: [],
        depth: 0,
        locked: false,
        order: 0,
      },
    ] as const;

    expect(shouldShowWaterfallValueLabels(projection)).toBe(true);
    expect(shouldShowWaterfallValueLabels(projection, true)).toBe(false);
  });

  it('uses the same highlight and muted styles for the screen and export chart spec', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid emphasis fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid emphasis projection');
    }
    const spec = createWaterfallChartSpec({
      projection: projection.value,
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: true,
      annotations: {},
      emphasis: {
        'revenue-growth': 'highlight',
        'cost-pressure': 'muted',
      },
    });
    const child = (spec as { readonly children?: readonly unknown[] }).children?.[0] as
      { readonly style?: Readonly<Record<string, unknown>> } | undefined;
    const style = child?.style;
    if (style === undefined) {
      throw new Error('Expected an interval style contract');
    }
    const fillOpacity = styleAccessor(style, 'fillOpacity');
    const lineWidth = styleAccessor(style, 'lineWidth');
    const stroke = styleAccessor(style, 'stroke');
    const highlighted = projection.value.find(datum => datum.nodeId === 'revenue-growth');
    const muted = projection.value.find(datum => datum.nodeId === 'cost-pressure');
    const normal = projection.value.find(datum => datum.nodeId === 'tax-impact');
    if (highlighted === undefined || muted === undefined || normal === undefined) {
      throw new Error('Expected emphasis fixture data');
    }

    expect(fillOpacity(highlighted)).toBe(1);
    expect(lineWidth(highlighted)).toBe(3);
    expect(stroke(highlighted)).toBe('#18211D');
    expect(fillOpacity(muted)).toBe(0.28);
    expect(lineWidth(muted)).toBe(1);
    expect(stroke(muted)).toBe('#FFFFFF');
    expect(fillOpacity(normal)).toBe(0.96);
    expect(lineWidth(normal)).toBe(1);
    expect(stroke(normal)).toBe('#FFFFFF');
  });

  it('sets readable axis label colors on the shared screen and export spec', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid axis fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid axis projection');
    }
    const spec = createWaterfallChartSpec({
      projection: projection.value,
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: true,
      annotations: {},
      emphasis: {},
    });
    const child = (spec as { readonly children?: readonly unknown[] }).children?.[0] as
      | {
          readonly axis?: {
            readonly x?: Readonly<Record<string, unknown>>;
            readonly y?: Readonly<Record<string, unknown>>;
          };
        }
      | undefined;
    expect(child?.axis?.x?.['labelFill']).toBe('#5F6B65');
    expect(child?.axis?.y?.['labelFill']).toBe('#5F6B65');
  });

  it('formats known and hostile axis values plus both value-label directions', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid formatter fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid formatter projection');
    }
    const spec = createWaterfallChartSpec({
      projection: projection.value,
      locale: 'en-US',
      currency: 'USD',
      reducedMotion: true,
      showValueLabels: true,
      annotations: {},
      emphasis: {},
    });
    const child = (spec as { readonly children?: readonly unknown[] }).children?.[0] as
      | {
          readonly axis?: { readonly x?: Readonly<Record<string, unknown>> };
          readonly labels?: readonly Readonly<Record<string, unknown>>[];
        }
      | undefined;
    const valueLabelMark = waterfallValueLabelMark(spec);
    const xFormatter = child?.axis?.x?.['labelFormatter'];
    const valueBaseline = valueLabelMark?.style?.['textBaseline'];
    const valueOffset = valueLabelMark?.style?.['dy'];
    if (
      typeof xFormatter !== 'function' ||
      typeof valueBaseline !== 'function' ||
      typeof valueOffset !== 'function'
    ) {
      throw new Error('Expected foreground waterfall value-label accessors');
    }
    const positive = projection.value.find(datum => datum.end >= datum.start);
    const negative = projection.value.find(datum => datum.end < datum.start);
    if (positive === undefined || negative === undefined) {
      throw new Error('Expected positive and negative waterfall marks');
    }
    const positiveLabel = valueLabelMark?.data?.find(datum => datum.categoryId === positive.nodeId);
    const negativeLabel = valueLabelMark?.data?.find(datum => datum.categoryId === negative.nodeId);
    if (positiveLabel === undefined || negativeLabel === undefined) {
      throw new Error('Expected interaction-neutral waterfall value-label data');
    }

    expect((xFormatter as (value: unknown) => string)(positive.nodeId)).toBe(positive.label);
    expect((xFormatter as (value: unknown) => string)('missing')).toBe('missing');
    expect(valueLabelMark?.encode).toEqual({
      x: 'categoryId',
      y: 'anchor',
      text: 'text',
      key: 'labelId',
    });
    expect(positiveLabel.text).toContain('$');
    expect(positiveLabel.anchor).toBe(positive.end);
    expect(negativeLabel.anchor).toBe(negative.end);
    expect(positiveLabel).not.toHaveProperty('nodeId');
    expect(negativeLabel).not.toHaveProperty('nodeId');
    expect((valueBaseline as (datum: WaterfallValueLabelDatum) => string)(positiveLabel)).toBe(
      'top',
    );
    expect((valueBaseline as (datum: WaterfallValueLabelDatum) => string)(negativeLabel)).toBe(
      'bottom',
    );
    expect((valueOffset as (datum: WaterfallValueLabelDatum) => number)(positiveLabel)).toBe(2);
    expect((valueOffset as (datum: WaterfallValueLabelDatum) => number)(negativeLabel)).toBe(-2);
    expect(valueLabelMark).toEqual(
      expect.objectContaining({
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
    expect(child?.labels).toEqual([]);
  });
});

describe('waterfall chart appearance', () => {
  it('maps declarative label styling and outside placement onto the foreground mark', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid label-style fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid label-style projection');
    }
    const spec = createWaterfallChartSpec({
      projection: projection.value,
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: true,
      annotations: {},
      emphasis: {},
      appearance: {
        valueLabels: 'always',
        valueLabelStyle: {
          placement: 'outside',
          offset: 7,
          color: '#102A43',
          fontSize: 13,
          fontWeight: 700,
          background: true,
          backgroundColor: '#FFFFFF',
          backgroundOpacity: 0.88,
        },
      },
    });
    const mark = waterfallValueLabelMark(spec);
    const positive = mark?.data?.find(datum => datum.rises);
    const negative = mark?.data?.find(datum => !datum.rises);
    const dy = mark?.style?.['dy'];
    const baseline = mark?.style?.['textBaseline'];
    if (
      positive === undefined ||
      negative === undefined ||
      typeof dy !== 'function' ||
      typeof baseline !== 'function'
    ) {
      throw new Error('Expected styled waterfall label accessors');
    }

    expect(dy(positive)).toBe(-7);
    expect(dy(negative)).toBe(7);
    expect(baseline(positive)).toBe('bottom');
    expect(baseline(negative)).toBe('top');
    expect(mark?.style).toMatchObject({
      background: true,
      backgroundFill: '#FFFFFF',
      backgroundOpacity: 0.88,
      backgroundPadding: [2, 4],
      backgroundRadius: 3,
      fill: '#102A43',
      fontSize: 13,
      fontWeight: 700,
    });
    expect(spec).toHaveProperty('labelTransform');
  });

  it('maps only the bounded semantic configuration onto the shared G2 spec', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid appearance fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid appearance projection');
    }

    const spec = createWaterfallChartSpec({
      projection: projection.value,
      title: 'Default title',
      locale: 'en-US',
      currency: 'USD',
      reducedMotion: false,
      showValueLabels: true,
      annotations: {},
      emphasis: {},
      appearance: {
        title: 'Configured bridge',
        palette: { positive: '#00A36C', negative: '#D23B3B' },
        axis: { x: false, y: true },
        valueLabels: 'never',
        tooltip: true,
        animation: { enabled: true, duration: 240 },
        numberFormat: {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
          currencyDisplay: 'code',
        },
      },
    });
    const typedSpec = spec as {
      readonly title?: { readonly title?: string };
      readonly children?: readonly {
        readonly scale?: { readonly color?: { readonly range?: readonly string[] } };
        readonly axis?: {
          readonly x?: false | Readonly<Record<string, unknown>>;
          readonly y?: false | Readonly<Record<string, unknown>>;
        };
        readonly labels?: readonly unknown[];
        readonly tooltip?: unknown;
        readonly animate?: {
          readonly enter?: { readonly duration?: number };
          readonly update?: { readonly duration?: number };
          readonly exit?: { readonly duration?: number };
        };
      }[];
    };
    const child = typedSpec.children?.[0];

    expect(typedSpec.title?.title).toBe('Configured bridge');
    expect(child?.scale?.color?.range).toEqual([
      '#5F6B65',
      '#00A36C',
      '#D23B3B',
      '#315C8C',
      '#A46812',
      '#315C8C',
    ]);
    expect(child?.axis?.x).toBe(false);
    expect(child?.axis?.y).toEqual(expect.objectContaining({ labelFill: '#5F6B65' }));
    expect(child?.labels).toEqual([]);
    expect(child?.tooltip).toMatchObject({
      title: expect.any(Function),
      items: [expect.any(Function)],
    });
    expect(child?.animate?.enter?.duration).toBe(240);
    expect(child?.animate?.update?.duration).toBe(240);
    expect(child?.animate?.exit?.duration).toBe(240);

    const yFormatter = (child?.axis?.y as Readonly<Record<string, unknown>> | undefined)?.[
      'labelFormatter'
    ];
    if (typeof yFormatter !== 'function') {
      throw new Error('Expected the configured y-axis formatter');
    }
    expect((yFormatter as (value: unknown) => string)(1234.5)).toContain('USD');
  });

  it('lets reduced motion override an enabled custom animation', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid reduced-motion fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid reduced-motion projection');
    }

    const spec = createWaterfallChartSpec({
      projection: projection.value,
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: true,
      annotations: {},
      emphasis: {},
      appearance: { animation: { enabled: true, duration: 800 } },
    });
    const child = (spec as { readonly children?: readonly { readonly animate?: unknown }[] })
      .children?.[0];

    expect(child?.animate).toBe(false);
  });
});

describe('waterfall chart annotations', () => {
  it('renders only non-empty annotations for visible projection nodes inside their bars', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid annotation fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid annotation projection');
    }
    const spec = createWaterfallChartSpec({
      projection: projection.value,
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: true,
      annotations: {
        'revenue-growth': '  重点客户续约  ',
        'cost-pressure': '   ',
        'tax-impact': '<script>alert(1)</script>',
        hidden: '不可见注释',
      },
      emphasis: {},
    });
    const child = (spec as { readonly children?: readonly unknown[] }).children?.[0] as
      { readonly labels?: readonly Readonly<Record<string, unknown>>[] } | undefined;
    const labels = child?.labels;
    if (labels === undefined) {
      throw new Error('Expected interval labels');
    }
    const annotationLabel = labels[0];
    const text = annotationLabel?.['text'];
    if (typeof text !== 'function') {
      throw new Error('Expected an annotation label accessor');
    }
    const annotationText = text as (datum: WaterfallDatum) => string;
    const revenue = projection.value.find(datum => datum.nodeId === 'revenue-growth');
    const cost = projection.value.find(datum => datum.nodeId === 'cost-pressure');
    const tax = projection.value.find(datum => datum.nodeId === 'tax-impact');
    if (revenue === undefined || cost === undefined || tax === undefined) {
      throw new Error('Expected annotation fixture data');
    }

    expect(annotationText(revenue)).toBe('重点客户续约');
    expect(annotationText(cost)).toBe('');
    expect(annotationText(tax)).toBe('<script>alert(1)</script>');
    expect(annotationLabel).toMatchObject({
      position: 'inside',
      style: {
        maxLines: 2,
        pointerEvents: 'none',
        textOverflow: 'ellipsis',
        wordWrap: true,
      },
    });
  });

  it('keeps annotation labels when amount labels are suppressed for compact charts', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid compact annotation fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid compact annotation projection');
    }
    const spec = createWaterfallChartSpec({
      projection: projection.value,
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: false,
      annotations: { 'revenue-growth': '重点客户续约' },
      emphasis: {},
    });
    const child = (spec as { readonly children?: readonly unknown[] }).children?.[0] as
      { readonly labels?: readonly Readonly<Record<string, unknown>>[] } | undefined;

    expect(child?.labels).toHaveLength(1);
    expect(child?.labels?.[0]).toMatchObject({ position: 'inside' });
  });

  it('reads only own string values and keeps long source text under bounded G2 label layout', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid special-id annotation fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok || projection.value[0] === undefined) {
      throw new Error('Expected a valid special-id annotation projection');
    }
    const specialDatum: WaterfallDatum = { ...projection.value[0], nodeId: 'toString' };
    const inheritedAnnotations = Object.create({ toString: '原型链内容不可见' }) as Readonly<
      Record<string, string>
    >;
    const inheritedSpec = createWaterfallChartSpec({
      projection: [specialDatum],
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: false,
      annotations: inheritedAnnotations,
      emphasis: {},
    });
    const inheritedChild = (inheritedSpec as { readonly children?: readonly unknown[] })
      .children?.[0] as { readonly labels?: readonly unknown[] } | undefined;

    expect(inheritedChild?.labels).toEqual([]);

    const longAnnotation = '长'.repeat(500);
    const ownAnnotations = Object.create({ toString: '原型链内容不可见' }) as Record<
      string,
      string
    >;
    Object.defineProperty(ownAnnotations, 'toString', {
      configurable: true,
      enumerable: true,
      value: longAnnotation,
    });
    const ownSpec = createWaterfallChartSpec({
      projection: [specialDatum],
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: false,
      annotations: ownAnnotations,
      emphasis: {},
    });
    const ownChild = (ownSpec as { readonly children?: readonly unknown[] }).children?.[0] as
      { readonly labels?: readonly Readonly<Record<string, unknown>>[] } | undefined;
    const label = ownChild?.labels?.[0];
    const text = label?.['text'];
    if (typeof text !== 'function') {
      throw new Error('Expected a special-id annotation accessor');
    }

    expect((text as (datum: WaterfallDatum) => string)(specialDatum)).toBe(longAnnotation);
    expect(label).toMatchObject({
      style: {
        maxLines: 2,
        textOverflow: 'ellipsis',
        wordWrap: true,
      },
    });
  });

  it('places the bounded group background behind the interval and its label above', () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid group-region fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid group-region projection');
    }
    const first = projection.value[1];
    const second = projection.value[2];
    if (first === undefined || second === undefined) {
      throw new Error('Expected visible group-region endpoints');
    }
    const spec = createWaterfallChartSpec({
      projection: projection.value,
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      reducedMotion: true,
      showValueLabels: false,
      appearance: { groupRegion: { label: 'auto' } },
      annotations: {},
      emphasis: {},
      groupRegions: [
        {
          regionId: 'group-region:growth',
          groupId: 'growth',
          label: 'Growth',
          depth: 1,
          startNodeId: first.nodeId,
          endNodeId: second.nodeId,
          valueStart: Math.min(first.start, first.end, second.start, second.end),
          valueEnd: Math.max(first.start, first.end, second.start, second.end),
          labelValue: Math.max(first.start, first.end),
        },
      ],
    });
    const children = (
      spec as {
        readonly children?: readonly {
          readonly type?: unknown;
          readonly scale?: { readonly y?: { readonly domain?: readonly number[] } };
        }[];
      }
    ).children;
    const expectedDomain = projection.value.reduce<readonly [number, number]>(
      ([minimum, maximum], datum) => [
        Math.min(minimum, datum.start, datum.end),
        Math.max(maximum, datum.start, datum.end),
      ],
      [0, 0],
    );

    expect(children?.map(child => child.type)).toEqual(['range', 'interval', 'text']);
    expect(children?.map(child => child.scale?.y?.domain)).toEqual([
      expectedDomain,
      expectedDomain,
      expectedDomain,
    ]);
  });
});
