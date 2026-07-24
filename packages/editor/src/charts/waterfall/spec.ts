import type { G2Spec, Mark } from '@antv/g2';

import {
  DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT,
  resolveFinancialChartAppearance,
  type FinancialChartAppearance,
  type ResolvedFinancialChartNumberFormat,
  type ResolvedFinancialChartValueLabelAppearance,
} from '../../config/chartAppearance';
import type { GroupId, ViewNodeId } from '../../domain/ids';
import type { Annotation, Emphasis } from '../../domain/model';
import {
  createExpandedGroupRegionLabelMark,
  createExpandedGroupRegionMark,
  type ExpandedGroupRegion,
} from '../groupRegions';
import { formatAmount, type EditorLocale } from '../../components/formatAmount';
import { createForegroundLabelStyle } from '../labelStyle';
import type { WaterfallDatum, WaterfallDatumKind, WaterfallProjection } from './types';

const DENSE_CANVAS_THRESHOLD = 80;
const VALUE_LABEL_THRESHOLD = 40;
const COLOR_DOMAIN: readonly WaterfallDatumKind[] = [
  'start',
  'positive',
  'negative',
  'subtotal',
  'group',
  'end',
];

interface WaterfallValueLabelDatum {
  readonly labelId: string;
  readonly categoryId: ViewNodeId;
  readonly anchor: number;
  readonly text: string;
  readonly rises: boolean;
}

interface WaterfallChartSpecOptions {
  readonly projection: WaterfallProjection;
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

export function visibleWaterfallAnnotation(
  annotations: Readonly<Record<ViewNodeId, Annotation>>,
  nodeId: ViewNodeId,
): string {
  const value = Object.getOwnPropertyDescriptor(annotations, nodeId)?.value as unknown;
  return typeof value === 'string' ? value.trim() : '';
}

export function shouldShowWaterfallValueLabels(
  projection: WaterfallProjection,
  compactViewport = false,
): boolean {
  return !compactViewport && projection.length <= VALUE_LABEL_THRESHOLD;
}

export function formatWaterfallDatumAmount(
  datum: WaterfallDatum,
  locale: EditorLocale,
  currency?: string,
  numberFormat: ResolvedFinancialChartNumberFormat = DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT,
): string {
  const amount = formatAmount(datum.amount, locale, currency, numberFormat);
  const contribution =
    datum.kind === 'positive' || datum.kind === 'negative' || datum.kind === 'group';
  return contribution && datum.amount > 0 ? `+${amount}` : amount;
}

function createWaterfallValueLabelMark(
  projection: WaterfallProjection,
  locale: EditorLocale,
  currency: string | undefined,
  numberFormat: ResolvedFinancialChartNumberFormat,
  labelStyle: ResolvedFinancialChartValueLabelAppearance,
): Mark {
  const data: readonly WaterfallValueLabelDatum[] = projection.map(datum => ({
    labelId: `value-label:${datum.nodeId}`,
    categoryId: datum.nodeId,
    anchor: datum.end,
    text: formatWaterfallDatumAmount(datum, locale, currency, numberFormat),
    rises: datum.end >= datum.start,
  }));
  const outside = labelStyle.placement === 'outside';
  return {
    type: 'text',
    data,
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
      },
      y: { type: 'linear', nice: true, zero: true },
    },
    style: {
      ...createForegroundLabelStyle(labelStyle),
      dy: (datum: WaterfallValueLabelDatum) =>
        datum.rises === outside ? -labelStyle.offset : labelStyle.offset,
      textAlign: 'center',
      textBaseline: (datum: WaterfallValueLabelDatum) =>
        datum.rises === outside ? 'bottom' : 'top',
    },
    tooltip: false,
    animate: false,
  };
}

export function createWaterfallChartSpec({
  projection,
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
}: WaterfallChartSpecOptions): G2Spec {
  const resolvedAppearance = resolveFinancialChartAppearance(appearance, title ?? '');
  const labelById = new Map(projection.map(datum => [datum.nodeId, datum.label]));
  const denseCanvas = projection.length > DENSE_CANVAS_THRESHOLD;
  const barInset = denseCanvas ? 0.5 : 3;
  const baseFillOpacity = denseCanvas ? 1 : 0.96;
  const baseLineWidth = denseCanvas ? 0 : 1;
  const baseStroke = denseCanvas ? 'transparent' : '#FFFFFF';
  const hasVisibleAnnotations = projection.some(
    datum => visibleWaterfallAnnotation(annotations, datum.nodeId) !== '',
  );
  const displayValueLabels =
    resolvedAppearance.valueLabels === 'always' ||
    (resolvedAppearance.valueLabels === 'auto' && showValueLabels);
  const annotationLabel = {
    text: (datum: WaterfallDatum) => visibleWaterfallAnnotation(annotations, datum.nodeId),
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
    appearance: resolvedAppearance,
    reducedMotion,
    denseCanvas,
    activeGroupId: activeGroupRegionId,
  });
  const groupRegionLabelMark = createExpandedGroupRegionLabelMark({
    regions: groupRegions,
    categoryDomain: projection.map(datum => datum.nodeId),
    appearance: resolvedAppearance,
    reducedMotion,
    denseCanvas,
    activeGroupId: activeGroupRegionId,
  });
  const valueLabelMark = displayValueLabels
    ? createWaterfallValueLabelMark(
        projection,
        locale,
        currency,
        resolvedAppearance.numberFormat,
        resolvedAppearance.valueLabelStyle,
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
    children: [
      ...(groupRegionMark === undefined ? [] : [groupRegionMark]),
      {
        type: 'interval',
        data: [...projection],
        encode: {
          x: 'nodeId',
          y: ['start', 'end'],
          color: 'kind',
          key: 'nodeId',
        },
        scale: {
          x: { type: 'band', padding: 0.24 },
          y: { type: 'linear', nice: true, zero: true },
          color: {
            type: 'ordinal',
            domain: [...COLOR_DOMAIN],
            range: COLOR_DOMAIN.map(kind => resolvedAppearance.palette[kind]),
          },
        },
        axis: {
          x: resolvedAppearance.axis.x
            ? {
                title: false,
                labelFill: '#5F6B65',
                labelAutoHide: true,
                labelAutoRotate: false,
                labelFormatter: (value: unknown) => labelById.get(String(value)) ?? String(value),
              }
            : false,
          y: resolvedAppearance.axis.y
            ? {
                title: false,
                labelFill: '#5F6B65',
                labelFormatter: (value: unknown) =>
                  formatAmount(Number(value), locale, currency, resolvedAppearance.numberFormat),
              }
            : false,
        },
        legend: { color: false },
        labels: [...(hasVisibleAnnotations ? [annotationLabel] : [])],
        style: {
          fillOpacity: (datum: WaterfallDatum) =>
            emphasis[datum.nodeId] === 'muted'
              ? 0.28
              : emphasis[datum.nodeId] === 'highlight'
                ? 1
                : baseFillOpacity,
          insetLeft: barInset,
          insetRight: barInset,
          lineWidth: (datum: WaterfallDatum) =>
            activeGroupRegionId === datum.nodeId || emphasis[datum.nodeId] === 'highlight'
              ? 3
              : baseLineWidth,
          stroke: (datum: WaterfallDatum) =>
            activeGroupRegionId === datum.nodeId
              ? resolvedAppearance.palette.group
              : emphasis[datum.nodeId] === 'highlight'
                ? '#18211D'
                : baseStroke,
        },
        tooltip: resolvedAppearance.tooltip,
        animate:
          reducedMotion || denseCanvas || !resolvedAppearance.animation.enabled
            ? false
            : {
                enter: {
                  type: 'growInY',
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
