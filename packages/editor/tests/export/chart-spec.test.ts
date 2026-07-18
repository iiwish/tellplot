import { describe, expect, it } from 'vitest';

import { createInitialViewSpec } from '../../src/domain/createInitialViewSpec';
import { createWaterfallChartSpec } from '../../src/export/waterfallChartSpec';
import { projectWaterfall } from '../../src/waterfall/projectWaterfall';
import type { WaterfallDatum } from '../../src/waterfall/waterfallTypes';
import { financialSourceData } from '../fixtures/financialSourceData';

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

describe('waterfall chart emphasis', () => {
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
    const annotationLabel = labels[1];
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
});
