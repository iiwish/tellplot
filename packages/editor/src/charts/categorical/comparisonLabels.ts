import type {
  Annotation,
  CategoricalComparisonProjection,
  ResolvedFinancialChartNumberFormat,
  ResolvedFinancialChartValueLabelAppearance,
  SeriesId,
  ViewNodeId,
} from '@tellplot/core';
import { formatAmount, type EditorLocale } from '../../editor/formatAmount';
import { comparisonFlipToInteriorLabelTransform } from '../../rendering/g2/comparisonLabelTransform';
import { createForegroundLabelStyle } from '../labelStyle';
import { visibleCategoricalAnnotation } from './spec';

export type ComparisonLabelMark = Readonly<Record<string, unknown>>;

export const COMPARISON_VALUE_LABEL_MARK_KEY = 'categorical-comparison-value-labels';
export const COMPARISON_ANNOTATION_ENDPOINT_MARK_KEY = 'categorical-comparison-annotation-endpoint';
export const COMPARISON_ANNOTATION_BASELINE_MARK_KEY = 'categorical-comparison-annotation-baseline';

interface ComparisonLabelDatum {
  readonly helperKey: string;
  readonly nodeId: ViewNodeId;
  readonly seriesId: SeriesId;
  readonly amount: number;
  readonly text: string;
}

interface ComparisonAnnotationDatum {
  readonly helperKey: string;
  readonly nodeId: ViewNodeId;
  readonly seriesId?: SeriesId;
  readonly amount: number;
  readonly text: string;
}

export interface ComparisonLabelScaleOptions {
  readonly x: Readonly<Record<string, unknown>>;
  readonly y: Readonly<Record<string, unknown>>;
  readonly series: Readonly<Record<string, unknown>>;
}

interface ComparisonLabelMarkOptions {
  readonly projection: CategoricalComparisonProjection;
  readonly chartType: 'bar' | 'column';
  readonly locale: EditorLocale;
  readonly currency: string | undefined;
  readonly numberFormat: ResolvedFinancialChartNumberFormat;
  readonly labelStyle: ResolvedFinancialChartValueLabelAppearance;
  readonly scales: ComparisonLabelScaleOptions;
}

interface ComparisonAnnotationMarkOptions extends ComparisonLabelMarkOptions {
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
}

function labelTransform(transposed: boolean) {
  return [
    { type: comparisonFlipToInteriorLabelTransform, transposed },
    { type: 'exceedAdjust' as const, bounds: 'main' as const },
  ];
}

function labelPosition(
  transposed: boolean,
  amount: number,
  placement: ResolvedFinancialChartValueLabelAppearance['placement'],
): 'right' | 'left' | 'top' | 'bottom' {
  const outside = placement === 'outside';
  if (transposed) {
    return amount >= 0 === outside ? 'right' : 'left';
  }
  return amount >= 0 === outside ? 'top' : 'bottom';
}

function attachedLabel(
  transposed: boolean,
  labelStyle: ResolvedFinancialChartValueLabelAppearance,
  placement: ResolvedFinancialChartValueLabelAppearance['placement'],
) {
  return {
    text: 'text',
    position: (datum: { readonly amount: number }) =>
      labelPosition(transposed, datum.amount, placement),
    transform: labelTransform(transposed),
    style: {
      ...createForegroundLabelStyle(labelStyle),
      offset: labelStyle.offset,
    },
  };
}

function pointMark(
  key: string,
  data: readonly (ComparisonLabelDatum | ComparisonAnnotationDatum)[],
  chartType: 'bar' | 'column',
  scales: ComparisonLabelScaleOptions,
  labelStyle: ResolvedFinancialChartValueLabelAppearance,
  seriesPositioned: boolean,
  placement: ResolvedFinancialChartValueLabelAppearance['placement'],
): ComparisonLabelMark {
  const transposed = chartType === 'bar';
  const value = {
    key,
    type: 'point',
    data: [...data],
    ...(transposed ? { coordinate: { transform: [{ type: 'transpose' as const }] } } : {}),
    encode: {
      x: 'nodeId',
      y: 'amount',
      ...(seriesPositioned ? { series: 'seriesId' } : {}),
      key: 'helperKey',
    },
    ...(seriesPositioned
      ? { transform: [{ type: 'dodgeX' as const, groupBy: 'x' as const, padding: 0.08 }] }
      : {}),
    scale: {
      x: scales.x,
      y: scales.y,
      ...(seriesPositioned ? { series: scales.series } : {}),
    },
    axis: false,
    legend: false,
    labels: [attachedLabel(transposed, labelStyle, placement)],
    style: { opacity: 0, pointerEvents: 'none' as const },
    tooltip: false,
    animate: false,
  };
  return value;
}

export function createComparisonValueLabelMark(
  options: ComparisonLabelMarkOptions,
): ComparisonLabelMark | undefined {
  if (options.projection.length === 0) {
    return undefined;
  }
  const data: ComparisonLabelDatum[] = options.projection.flatMap(datum =>
    datum.values.map(value => ({
      helperKey: JSON.stringify(['comparison-value-label', datum.nodeId, value.seriesId]),
      nodeId: datum.nodeId,
      seriesId: value.seriesId,
      amount: value.amount,
      text: formatAmount(value.amount, options.locale, options.currency, options.numberFormat),
    })),
  );
  return pointMark(
    COMPARISON_VALUE_LABEL_MARK_KEY,
    data,
    options.chartType,
    options.scales,
    options.labelStyle,
    true,
    options.labelStyle.placement,
  );
}

export function createComparisonAnnotationMarks(
  options: ComparisonAnnotationMarkOptions,
): readonly ComparisonLabelMark[] {
  const endpoint: ComparisonAnnotationDatum[] = [];
  const baseline: ComparisonAnnotationDatum[] = [];
  for (const datum of options.projection) {
    const text = visibleCategoricalAnnotation(options.annotations, datum.nodeId);
    if (text === '') {
      continue;
    }
    const selected = datum.values.reduce<(typeof datum.values)[number] | undefined>(
      (current, value) =>
        current === undefined || Math.abs(value.amount) > Math.abs(current.amount)
          ? value
          : current,
      undefined,
    );
    if (selected === undefined || datum.values.every(value => value.amount === 0)) {
      baseline.push({
        helperKey: JSON.stringify(['comparison-annotation-baseline', datum.nodeId]),
        nodeId: datum.nodeId,
        amount: 0,
        text,
      });
    } else {
      endpoint.push({
        helperKey: JSON.stringify([
          'comparison-annotation-endpoint',
          datum.nodeId,
          selected.seriesId,
        ]),
        nodeId: datum.nodeId,
        seriesId: selected.seriesId,
        amount: selected.amount,
        text,
      });
    }
  }
  return [
    ...(endpoint.length === 0
      ? []
      : [
          pointMark(
            COMPARISON_ANNOTATION_ENDPOINT_MARK_KEY,
            endpoint,
            options.chartType,
            options.scales,
            options.labelStyle,
            true,
            'outside',
          ),
        ]),
    ...(baseline.length === 0
      ? []
      : [
          pointMark(
            COMPARISON_ANNOTATION_BASELINE_MARK_KEY,
            baseline,
            options.chartType,
            options.scales,
            options.labelStyle,
            false,
            'outside',
          ),
        ]),
  ];
}
