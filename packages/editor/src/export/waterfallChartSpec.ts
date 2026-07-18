import type { G2Spec } from '@antv/g2';

import type { ViewNodeId } from '../domain/ids';
import type { Annotation, Emphasis } from '../domain/model';
import type {
  WaterfallDatum,
  WaterfallDatumKind,
  WaterfallProjection,
} from '../waterfall/waterfallTypes';
import { formatAmount, type EditorLocale } from '../components/formatAmount';

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
const COLOR_RANGE = ['#5F6B65', '#168363', '#D5524A', '#315C8C', '#A46812', '#315C8C'];

interface WaterfallChartSpecOptions {
  readonly projection: WaterfallProjection;
  readonly title?: string;
  readonly locale: EditorLocale;
  readonly currency: string | undefined;
  readonly reducedMotion: boolean;
  readonly showValueLabels: boolean;
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
}

export function visibleWaterfallAnnotation(
  annotations: Readonly<Record<ViewNodeId, Annotation>>,
  nodeId: ViewNodeId,
): string {
  const value = Object.getOwnPropertyDescriptor(annotations, nodeId)?.value as unknown;
  return typeof value === 'string' ? value.trim() : '';
}

export function shouldShowWaterfallValueLabels(projection: WaterfallProjection): boolean {
  return projection.length <= VALUE_LABEL_THRESHOLD;
}

export function formatWaterfallDatumAmount(
  datum: WaterfallDatum,
  locale: EditorLocale,
  currency?: string,
): string {
  const amount = formatAmount(datum.amount, locale, currency);
  const contribution =
    datum.kind === 'positive' || datum.kind === 'negative' || datum.kind === 'group';
  return contribution && datum.amount > 0 ? `+${amount}` : amount;
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
}: WaterfallChartSpecOptions): G2Spec {
  const labelById = new Map(projection.map(datum => [datum.nodeId, datum.label]));
  const denseCanvas = projection.length > DENSE_CANVAS_THRESHOLD;
  const barInset = denseCanvas ? 0.5 : 3;
  const baseFillOpacity = denseCanvas ? 1 : 0.96;
  const baseLineWidth = denseCanvas ? 0 : 1;
  const baseStroke = denseCanvas ? 'transparent' : '#FFFFFF';
  const hasVisibleAnnotations = projection.some(
    datum => visibleWaterfallAnnotation(annotations, datum.nodeId) !== '',
  );
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

  return {
    type: 'view',
    ...(title === undefined
      ? {}
      : {
          title: {
            title,
            size: 40,
            align: 'left',
            titleFill: '#18211D',
            titleFontSize: 18,
            titleFontWeight: 650,
          },
        }),
    labelTransform: [{ type: 'overlapHide' }],
    children: [
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
            range: COLOR_RANGE,
          },
        },
        axis: {
          x: {
            title: false,
            labelFill: '#5F6B65',
            labelAutoHide: true,
            labelAutoRotate: false,
            labelFormatter: (value: unknown) => labelById.get(String(value)) ?? String(value),
          },
          y: {
            title: false,
            labelFill: '#5F6B65',
            labelFormatter: (value: unknown) => formatAmount(Number(value), locale, currency),
          },
        },
        legend: { color: false },
        labels: [
          ...(showValueLabels
            ? [
                {
                  text: (datum: WaterfallDatum) =>
                    formatWaterfallDatumAmount(datum, locale, currency),
                  position: (datum: WaterfallDatum) =>
                    datum.end >= datum.start ? 'top' : 'bottom',
                  style: {
                    fill: '#18211D',
                    fontSize: 11,
                    fontWeight: 600,
                    lineWidth: 3,
                    stroke: '#FFFFFF',
                  },
                },
              ]
            : []),
          ...(hasVisibleAnnotations ? [annotationLabel] : []),
        ],
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
            emphasis[datum.nodeId] === 'highlight' ? 3 : baseLineWidth,
          stroke: (datum: WaterfallDatum) =>
            emphasis[datum.nodeId] === 'highlight' ? '#18211D' : baseStroke,
        },
        tooltip: false,
        animate:
          reducedMotion || denseCanvas
            ? false
            : {
                enter: {
                  type: 'growInY',
                  duration: 160,
                  easing: 'cubic-bezier(0.2, 0, 0, 1)',
                },
                update: {
                  type: 'morphing',
                  duration: 160,
                  easing: 'cubic-bezier(0.2, 0, 0, 1)',
                },
                exit: {
                  type: 'fadeOut',
                  duration: 160,
                  easing: 'cubic-bezier(0.2, 0, 0, 1)',
                },
              },
      },
    ],
  };
}
