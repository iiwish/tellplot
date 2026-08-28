import type { G2Spec, Mark } from '@antv/g2';

import type {
  Annotation,
  CategoricalComparisonChartAppearance,
  CategoricalComparisonProjection,
  CategoricalComparisonSeries,
  Emphasis,
  GroupId,
  SeriesId,
  ViewNodeId,
} from '@tellplot/core';
import { formatAmount, type EditorLocale } from '../../editor/formatAmount';
import {
  createComparisonExpandedGroupRegionLabelMark,
  createExpandedGroupRegionMark,
  type ExpandedGroupRegion,
} from '../groupRegions';
import { createSafeComparisonTooltipInteraction, encodeTooltipHtml } from '../safeTooltip';
import { zeroBasedValueDomain } from '../valueDomain';
import { resolveComparisonAppearance } from './comparisonAppearance';
import {
  createComparisonAnnotationMarks,
  createComparisonValueLabelMark,
} from './comparisonLabels';

export const COMPARISON_INTERVAL_MARK_KEY = 'categorical-comparison-interval';
const COMPARISON_HELPER_SCALE_PREFIX = 'categorical-comparison-helper';
const DENSE_CANVAS_THRESHOLD = 80;
const VALUE_LABEL_THRESHOLD = 40;

export interface ComparisonMarkDatum {
  readonly nodeId: ViewNodeId;
  readonly categoryLabel: string;
  readonly seriesId: SeriesId;
  readonly seriesLabel: string;
  readonly amount: number;
  readonly elementKey: string;
  readonly locked: boolean;
  readonly nodeKind: 'category' | 'group';
  readonly categoryOrder: number;
  readonly seriesOrder: number;
}

export interface ComparisonChartSpecOptions {
  readonly projection: CategoricalComparisonProjection;
  readonly series: readonly CategoricalComparisonSeries[];
  readonly chartType: 'bar' | 'column';
  readonly title?: string;
  readonly locale: EditorLocale;
  readonly currency: string | undefined;
  readonly reducedMotion: boolean;
  readonly showValueLabels: boolean;
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
  readonly appearance?: CategoricalComparisonChartAppearance | undefined;
  readonly groupRegions?: readonly ExpandedGroupRegion[] | undefined;
  readonly activeGroupRegionId?: GroupId | undefined;
}

/** Keeps G2 component identity tied only to the structural series registry. */
export function comparisonStructuralIdentity(
  series: readonly CategoricalComparisonSeries[],
): string {
  return JSON.stringify(['categorical-comparison', ...series.map(entry => entry.id)]);
}

/** Converts renderer-neutral categories into one category-major, series-minor mark sequence. */
export function flattenComparisonProjection(
  projection: CategoricalComparisonProjection,
): readonly ComparisonMarkDatum[] {
  return projection.flatMap((datum, categoryOrder) =>
    datum.values.map((value, seriesOrder) => ({
      nodeId: datum.nodeId,
      categoryLabel: datum.label,
      seriesId: value.seriesId,
      seriesLabel: value.label,
      amount: value.amount,
      elementKey: JSON.stringify(['comparison-element', datum.nodeId, value.seriesId]),
      locked: datum.locked,
      nodeKind: datum.kind,
      categoryOrder,
      seriesOrder,
    })),
  );
}

export function shouldShowComparisonValueLabels(
  projection: CategoricalComparisonProjection,
  compactViewport = false,
): boolean {
  return (
    !compactViewport &&
    projection.reduce((count, datum) => count + datum.values.length, 0) <= VALUE_LABEL_THRESHOLD
  );
}

function componentGuides(
  options: ComparisonChartSpecOptions,
  seriesLabelById: ReadonlyMap<SeriesId, string>,
  resolved: ReturnType<typeof resolveComparisonAppearance>,
) {
  return {
    axis:
      options.chartType === 'column'
        ? {
            x: resolved.common.axis.x
              ? {
                  title: false,
                  labelFill: '#5F6B65',
                  labelAutoHide: true,
                  labelAutoRotate: false,
                  labelSpacing: 6,
                  labelFormatter: (nodeId: unknown) =>
                    options.projection.find(datum => datum.nodeId === String(nodeId))?.label ??
                    String(nodeId),
                }
              : false,
            y: resolved.common.axis.y
              ? {
                  title: false,
                  labelFill: '#5F6B65',
                  labelFormatter: (amount: unknown) =>
                    formatAmount(
                      Number(amount),
                      options.locale,
                      options.currency,
                      resolved.common.numberFormat,
                    ),
                }
              : false,
          }
        : {
            x: resolved.common.axis.y
              ? {
                  title: false,
                  labelFill: '#5F6B65',
                  labelAutoHide: true,
                  labelAutoRotate: false,
                  labelSpacing: 6,
                  labelFormatter: (nodeId: unknown) =>
                    options.projection.find(datum => datum.nodeId === String(nodeId))?.label ??
                    String(nodeId),
                }
              : false,
            y: resolved.common.axis.x
              ? {
                  title: false,
                  labelFill: '#5F6B65',
                  labelFormatter: (amount: unknown) =>
                    formatAmount(
                      Number(amount),
                      options.locale,
                      options.currency,
                      resolved.common.numberFormat,
                    ),
                }
              : false,
          },
    legend: {
      color: resolved.legend
        ? {
            labelFormatter: (seriesId: unknown) =>
              seriesLabelById.get(String(seriesId)) ?? String(seriesId),
          }
        : false,
    },
  };
}

function mainInterval(
  options: ComparisonChartSpecOptions,
  data: readonly ComparisonMarkDatum[],
  scales: {
    readonly x: Readonly<Record<string, unknown>>;
    readonly y: Readonly<Record<string, unknown>>;
    readonly series: Readonly<Record<string, unknown>>;
    readonly color: Readonly<Record<string, unknown>>;
  },
  guides: ReturnType<typeof componentGuides>,
  resolved: ReturnType<typeof resolveComparisonAppearance>,
  denseCanvas: boolean,
): Mark {
  const transposed = options.chartType === 'bar';
  const value = {
    key: COMPARISON_INTERVAL_MARK_KEY,
    type: 'interval',
    data: [...data],
    ...(transposed ? { coordinate: { transform: [{ type: 'transpose' as const }] } } : {}),
    encode: {
      x: 'nodeId',
      y: 'amount',
      series: 'seriesId',
      color: 'seriesId',
      key: 'elementKey',
    },
    transform: [{ type: 'dodgeX' as const, groupBy: 'x' as const, padding: 0.08 }],
    scale: scales,
    axis: guides.axis,
    legend: guides.legend,
    labels: [],
    style: {
      fillOpacity: (datum: ComparisonMarkDatum) =>
        options.emphasis[datum.nodeId] === 'muted'
          ? 0.28
          : options.emphasis[datum.nodeId] === 'highlight'
            ? 1
            : denseCanvas
              ? 1
              : 0.96,
      insetLeft: denseCanvas ? 0.5 : 1,
      insetRight: denseCanvas ? 0.5 : 1,
      lineWidth: (datum: ComparisonMarkDatum) =>
        options.activeGroupRegionId === datum.nodeId ||
        options.emphasis[datum.nodeId] === 'highlight'
          ? 3
          : denseCanvas
            ? 0
            : 1,
      stroke: (datum: ComparisonMarkDatum) =>
        options.activeGroupRegionId === datum.nodeId
          ? resolved.common.palette.group
          : options.emphasis[datum.nodeId] === 'highlight'
            ? '#18211D'
            : denseCanvas
              ? 'transparent'
              : '#FFFFFF',
    },
    tooltip: resolved.common.tooltip
      ? {
          title: (datum: ComparisonMarkDatum) => encodeTooltipHtml(datum.categoryLabel),
          items: [
            (datum: ComparisonMarkDatum) => ({
              name: encodeTooltipHtml(datum.seriesLabel),
              value: encodeTooltipHtml(
                formatAmount(
                  datum.amount,
                  options.locale,
                  options.currency,
                  resolved.common.numberFormat,
                ),
              ),
            }),
          ],
        }
      : false,
    animate:
      options.reducedMotion || denseCanvas || !resolved.common.animation.enabled
        ? false
        : {
            enter: {
              type: options.chartType === 'bar' ? 'growInX' : 'growInY',
              duration: resolved.common.animation.duration,
              easing: 'cubic-bezier(0.2, 0, 0, 1)',
            },
            update: {
              type: 'morphing',
              duration: resolved.common.animation.duration,
              easing: 'cubic-bezier(0.2, 0, 0, 1)',
            },
            exit: {
              type: 'fadeOut',
              duration: resolved.common.animation.duration,
              easing: 'cubic-bezier(0.2, 0, 0, 1)',
            },
          },
  };
  return value as unknown as Mark;
}

/** Produces the canonical private screen/export comparison spec. */
export function createComparisonChartSpec(options: ComparisonChartSpecOptions): G2Spec {
  const resolved = resolveComparisonAppearance(
    options.series,
    options.appearance,
    options.title ?? '',
  );
  const data = flattenComparisonProjection(options.projection);
  const categoryDomain = options.projection.map(datum => datum.nodeId);
  const valueDomain = zeroBasedValueDomain(data.map(datum => datum.amount));
  const seriesLabelById = new Map(options.series.map(entry => [entry.id, entry.label]));
  const transposed = options.chartType === 'bar';
  const denseCanvas = data.length > DENSE_CANVAS_THRESHOLD;
  const scales = {
    x: {
      type: 'band',
      domain: categoryDomain,
      padding: 0.24,
      reverse: transposed,
    },
    y: { type: 'linear', nice: true, zero: true, domain: [...valueDomain] },
    series: {
      type: 'band',
      domain: [...resolved.seriesDomain],
      paddingInner: 0.08,
      paddingOuter: 0,
    },
    color: {
      type: 'ordinal',
      domain: [...resolved.seriesDomain],
      range: [...resolved.seriesRange],
    },
  } as const;
  const labelScales = {
    x: { ...scales.x, key: `${COMPARISON_HELPER_SCALE_PREFIX}-x` },
    y: { ...scales.y, key: `${COMPARISON_HELPER_SCALE_PREFIX}-y` },
    series: { ...scales.series, key: `${COMPARISON_HELPER_SCALE_PREFIX}-series` },
  };
  const guides = componentGuides(options, seriesLabelById, resolved);
  const displayValueLabels =
    resolved.common.valueLabels === 'always' ||
    (resolved.common.valueLabels === 'auto' && options.showValueLabels);
  const valueLabels = displayValueLabels
    ? createComparisonValueLabelMark({
        projection: options.projection,
        chartType: options.chartType,
        locale: options.locale,
        currency: options.currency,
        numberFormat: resolved.common.numberFormat,
        labelStyle: resolved.common.valueLabelStyle,
        scales: labelScales,
      })
    : undefined;
  const annotationMarks = createComparisonAnnotationMarks({
    projection: options.projection,
    chartType: options.chartType,
    locale: options.locale,
    currency: options.currency,
    numberFormat: resolved.common.numberFormat,
    labelStyle: resolved.common.valueLabelStyle,
    scales: labelScales,
    annotations: options.annotations,
  });
  const regions = options.groupRegions ?? [];
  const groupRegion = createExpandedGroupRegionMark({
    regions,
    categoryDomain,
    valueDomain,
    appearance: resolved.common,
    reducedMotion: options.reducedMotion,
    denseCanvas,
    transposed,
    activeGroupId: options.activeGroupRegionId,
  });
  const groupLabel = createComparisonExpandedGroupRegionLabelMark({
    regions,
    categoryDomain,
    valueDomain,
    appearance: resolved.common,
    reducedMotion: options.reducedMotion,
    denseCanvas,
    transposed,
    activeGroupId: options.activeGroupRegionId,
  });
  const isolatedGroupLabel =
    groupLabel === undefined
      ? undefined
      : ({
          ...(groupLabel as unknown as Readonly<Record<string, unknown>>),
          scale: { x: labelScales.x, y: labelScales.y },
        } as unknown as Mark);

  return {
    key: 'categorical-comparison-view',
    type: 'view',
    ...(options.title === undefined
      ? {}
      : {
          title: {
            title: resolved.common.title,
            size: 40,
            align: 'left',
            titleFill: '#18211D',
            titleFontSize: 18,
            titleFontWeight: 650,
          },
        }),
    interaction: createSafeComparisonTooltipInteraction(
      options.series.map(entry => entry.label),
      resolved.common.tooltip,
    ),
    children: [
      ...(groupRegion === undefined ? [] : [groupRegion]),
      mainInterval(options, data, scales, guides, resolved, denseCanvas),
      ...(valueLabels === undefined ? [] : [valueLabels]),
      ...annotationMarks,
      ...(isolatedGroupLabel === undefined ? [] : [isolatedGroupLabel]),
    ],
  } as G2Spec;
}
