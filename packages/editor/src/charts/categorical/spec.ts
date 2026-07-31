import type { G2Spec, Mark } from '@antv/g2';

import {
  DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT,
  resolveFinancialChartAppearance,
  type FinancialChartAppearance,
  type ResolvedFinancialChartNumberFormat,
  type ResolvedFinancialChartValueLabelAppearance,
} from '@tellplot/core';
import type { GroupId, ViewNodeId } from '@tellplot/core';
import type { Annotation, ChartType, Emphasis } from '@tellplot/core';
import {
  createExpandedGroupRegionLabelMark,
  createExpandedGroupRegionMark,
  type ExpandedGroupRegion,
} from '../groupRegions';
import { formatAmount, type EditorLocale } from '../../editor/formatAmount';
import { createForegroundLabelStyle } from '../labelStyle';
import { createSafeAmountTooltip, createSafeTooltipInteraction } from '../safeTooltip';
import { zeroBasedValueDomain } from '../valueDomain';
import type { CategoricalDatum, CategoricalDatumKind, CategoricalProjection } from '@tellplot/core';

const DENSE_CANVAS_THRESHOLD = 80;
const VALUE_LABEL_THRESHOLD = 40;
const COLOR_DOMAIN: readonly CategoricalDatumKind[] = ['positive', 'negative', 'group'];

interface CategoricalValueLabelDatum {
  readonly labelId: string;
  readonly categoryId: ViewNodeId;
  readonly anchor: number;
  readonly text: string;
  readonly positive: boolean;
}

export interface CategoricalChartSpecOptions {
  readonly projection: CategoricalProjection;
  readonly chartType: Extract<ChartType, 'bar' | 'column'>;
  readonly title?: string;
  readonly locale: EditorLocale;
  readonly currency: string | undefined;
  readonly reducedMotion: boolean;
  readonly showValueLabels: boolean;
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
  readonly appearance?: FinancialChartAppearance | undefined;
  readonly groupRegions?: readonly ExpandedGroupRegion[] | undefined;
  readonly activeGroupRegionId?: GroupId | undefined;
}

export function visibleCategoricalAnnotation(
  annotations: Readonly<Record<ViewNodeId, Annotation>>,
  nodeId: ViewNodeId,
): string {
  try {
    const value = Object.getOwnPropertyDescriptor(annotations, nodeId)?.value as unknown;
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

export function shouldShowCategoricalValueLabels(
  projection: CategoricalProjection,
  compactViewport = false,
): boolean {
  return !compactViewport && projection.length <= VALUE_LABEL_THRESHOLD;
}

export function formatCategoricalDatumAmount(
  datum: CategoricalDatum,
  locale: EditorLocale,
  currency?: string,
  numberFormat: ResolvedFinancialChartNumberFormat = DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT,
): string {
  return formatAmount(datum.amount, locale, currency, numberFormat);
}

function createCategoricalValueLabelMark(
  projection: CategoricalProjection,
  chartType: Extract<ChartType, 'bar' | 'column'>,
  locale: EditorLocale,
  currency: string | undefined,
  numberFormat: ResolvedFinancialChartNumberFormat,
  labelStyle: ResolvedFinancialChartValueLabelAppearance,
  valueDomain: readonly [number, number],
): Mark {
  const transposed = chartType === 'bar';
  const outside = labelStyle.placement === 'outside';
  const data: readonly CategoricalValueLabelDatum[] = projection.map(datum => ({
    labelId: `value-label:${datum.nodeId}`,
    categoryId: datum.nodeId,
    anchor: datum.amount,
    text: formatCategoricalDatumAmount(datum, locale, currency, numberFormat),
    positive: datum.amount >= 0,
  }));
  return {
    type: 'text',
    data,
    ...(transposed ? { coordinate: { transform: [{ type: 'transpose' as const }] } } : {}),
    encode: {
      x: 'categoryId',
      y: 'anchor',
      text: 'text',
      key: 'labelId',
    },
    zIndex: 5,
    scale: {
      x: {
        type: 'band',
        domain: projection.map(datum => datum.nodeId),
        padding: 0.24,
        ...(transposed ? { reverse: true } : {}),
      },
      y: { type: 'linear', nice: true, zero: true, domain: [...valueDomain] },
    },
    style: {
      ...createForegroundLabelStyle(labelStyle),
      dx: (datum: CategoricalValueLabelDatum) =>
        transposed ? (datum.positive === outside ? labelStyle.offset : -labelStyle.offset) : 0,
      dy: (datum: CategoricalValueLabelDatum) =>
        transposed ? 0 : datum.positive === outside ? -labelStyle.offset : labelStyle.offset,
      textAlign: (datum: CategoricalValueLabelDatum) =>
        transposed ? (datum.positive === outside ? 'start' : 'end') : 'center',
      textBaseline: (datum: CategoricalValueLabelDatum) =>
        transposed ? 'middle' : datum.positive === outside ? 'bottom' : 'top',
    },
    tooltip: false,
    animate: false,
  };
}

export function createCategoricalChartSpec({
  projection,
  chartType,
  title,
  locale,
  currency,
  reducedMotion,
  showValueLabels,
  annotations,
  emphasis,
  appearance,
  groupRegions = [],
  activeGroupRegionId,
}: CategoricalChartSpecOptions): G2Spec {
  const resolvedAppearance = resolveFinancialChartAppearance(appearance, title ?? '');
  const labelById = new Map(projection.map(datum => [datum.nodeId, datum.label]));
  const denseCanvas = projection.length > DENSE_CANVAS_THRESHOLD;
  const barInset = denseCanvas ? 0.5 : 3;
  const baseFillOpacity = denseCanvas ? 1 : 0.96;
  const baseLineWidth = denseCanvas ? 0 : 1;
  const baseStroke = denseCanvas ? 'transparent' : '#FFFFFF';
  const hasVisibleAnnotations = projection.some(
    datum => visibleCategoricalAnnotation(annotations, datum.nodeId) !== '',
  );
  const valueDomain = zeroBasedValueDomain(projection.map(datum => datum.amount));
  const displayValueLabels =
    resolvedAppearance.valueLabels === 'always' ||
    (resolvedAppearance.valueLabels === 'auto' && showValueLabels);
  const categoryAxis = {
    title: false,
    labelFill: '#5F6B65',
    labelAutoHide: true,
    labelAutoRotate: false,
    labelFormatter: (value: unknown) => labelById.get(String(value)) ?? String(value),
  };
  const valueAxis = {
    title: false,
    labelFill: '#5F6B65',
    labelFormatter: (value: unknown) =>
      formatAmount(Number(value), locale, currency, resolvedAppearance.numberFormat),
  };
  const annotationLabel = {
    text: (datum: CategoricalDatum) => visibleCategoricalAnnotation(annotations, datum.nodeId),
    position: 'inside',
    style: {
      fill: '#FFFFFF',
      fontSize: denseCanvas ? 9 : 10,
      fontWeight: 600,
      lineWidth: 3,
      maxLines: 2,
      pointerEvents: 'none',
      stroke: 'rgba(24, 33, 29, 0.64)',
      textOverflow: 'ellipsis',
      wordWrap: true,
      wordWrapWidth: denseCanvas ? 48 : 88,
    },
  };
  const groupRegionMark = createExpandedGroupRegionMark({
    regions: groupRegions,
    categoryDomain: projection.map(datum => datum.nodeId),
    valueDomain,
    appearance: resolvedAppearance,
    reducedMotion,
    denseCanvas,
    transposed: chartType === 'bar',
    activeGroupId: activeGroupRegionId,
  });
  const groupRegionLabelMark = createExpandedGroupRegionLabelMark({
    regions: groupRegions,
    categoryDomain: projection.map(datum => datum.nodeId),
    valueDomain,
    appearance: resolvedAppearance,
    reducedMotion,
    denseCanvas,
    transposed: chartType === 'bar',
    activeGroupId: activeGroupRegionId,
  });
  const valueLabelMark = displayValueLabels
    ? createCategoricalValueLabelMark(
        projection,
        chartType,
        locale,
        currency,
        resolvedAppearance.numberFormat,
        resolvedAppearance.valueLabelStyle,
        valueDomain,
      )
    : undefined;

  return {
    type: 'view',
    ...(title === undefined
      ? {}
      : {
          title: {
            title: resolvedAppearance.title,
            size: 40,
            align: 'left',
            titleFill: '#18211D',
            titleFontSize: 18,
            titleFontWeight: 650,
          },
        }),
    labelTransform: [{ type: 'overlapHide' }],
    ...(resolvedAppearance.tooltip ? { interaction: createSafeTooltipInteraction() } : {}),
    children: [
      ...(groupRegionMark === undefined ? [] : [groupRegionMark]),
      {
        type: 'interval',
        data: [...projection],
        ...(chartType === 'bar'
          ? { coordinate: { transform: [{ type: 'transpose' as const }] } }
          : {}),
        encode: {
          x: 'nodeId',
          y: 'amount',
          color: 'kind',
          key: 'nodeId',
        },
        scale: {
          x: {
            type: 'band',
            padding: 0.24,
            ...(chartType === 'bar' ? { reverse: true } : {}),
          },
          y: { type: 'linear', nice: true, zero: true, domain: [...valueDomain] },
          color: {
            type: 'ordinal',
            domain: [...COLOR_DOMAIN],
            range: COLOR_DOMAIN.map(kind => resolvedAppearance.palette[kind]),
          },
        },
        axis:
          chartType === 'column'
            ? {
                x: resolvedAppearance.axis.x ? categoryAxis : false,
                y: resolvedAppearance.axis.y ? valueAxis : false,
              }
            : {
                x: resolvedAppearance.axis.y ? categoryAxis : false,
                y: resolvedAppearance.axis.x ? valueAxis : false,
              },
        legend: { color: false },
        labels: [...(hasVisibleAnnotations ? [annotationLabel] : [])],
        style: {
          fillOpacity: (datum: CategoricalDatum) =>
            emphasis[datum.nodeId] === 'muted'
              ? 0.28
              : emphasis[datum.nodeId] === 'highlight'
                ? 1
                : baseFillOpacity,
          insetLeft: barInset,
          insetRight: barInset,
          lineWidth: (datum: CategoricalDatum) =>
            activeGroupRegionId === datum.nodeId || emphasis[datum.nodeId] === 'highlight'
              ? 3
              : baseLineWidth,
          stroke: (datum: CategoricalDatum) =>
            activeGroupRegionId === datum.nodeId
              ? resolvedAppearance.palette.group
              : emphasis[datum.nodeId] === 'highlight'
                ? '#18211D'
                : baseStroke,
        },
        tooltip: createSafeAmountTooltip<CategoricalDatum>(
          resolvedAppearance.tooltip,
          locale,
          currency,
          resolvedAppearance.numberFormat,
        ),
        animate:
          reducedMotion || denseCanvas || !resolvedAppearance.animation.enabled
            ? false
            : {
                enter: {
                  type: chartType === 'bar' ? 'growInX' : 'growInY',
                  duration: resolvedAppearance.animation.duration,
                  easing: 'cubic-bezier(0.2, 0, 0, 1)',
                },
                update: {
                  type: 'morphing',
                  duration: resolvedAppearance.animation.duration,
                  easing: 'cubic-bezier(0.2, 0, 0, 1)',
                },
                exit: {
                  type: 'fadeOut',
                  duration: resolvedAppearance.animation.duration,
                  easing: 'cubic-bezier(0.2, 0, 0, 1)',
                },
              },
      },
      ...(valueLabelMark === undefined ? [] : [valueLabelMark]),
      ...(groupRegionLabelMark === undefined ? [] : [groupRegionLabelMark]),
    ],
  };
}
