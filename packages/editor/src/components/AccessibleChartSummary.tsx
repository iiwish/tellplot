import type { ViewNodeId } from '../domain/ids';
import type { Annotation } from '../domain/model';
import {
  formatWaterfallDatumAmount,
  visibleWaterfallAnnotation,
} from '../export/waterfallChartSpec';
import type { WaterfallDatumKind, WaterfallProjection } from '../waterfall/waterfallTypes';
import type { EditorLocale } from './formatAmount';

interface AccessibleChartSummaryProps {
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly projection: WaterfallProjection;
  readonly title: string;
  readonly locale: EditorLocale;
  readonly currency?: string | undefined;
}

interface SummaryCopy {
  readonly label: string;
  readonly annotation: string;
  readonly intro: (title: string, count: number) => string;
  readonly kindLabels: Readonly<Record<WaterfallDatumKind, string>>;
}

const SUMMARY_COPY: Readonly<Record<EditorLocale, SummaryCopy>> = {
  'zh-CN': {
    label: '图表摘要',
    annotation: '注释',
    intro: (title, count) => `${title}，共 ${count} 个可见节点。`,
    kindLabels: {
      start: '起点',
      positive: '正向贡献',
      negative: '负向贡献',
      subtotal: '小计',
      group: '分组',
      end: '终点',
    },
  },
  'en-US': {
    label: 'Chart summary',
    annotation: 'annotation',
    intro: (title, count) => `${title}, ${count} visible nodes.`,
    kindLabels: {
      start: 'start',
      positive: 'positive contribution',
      negative: 'negative contribution',
      subtotal: 'subtotal',
      group: 'group',
      end: 'end',
    },
  },
};

/** Ordered text equivalent for the currently visible waterfall projection. */
export function AccessibleChartSummary({
  annotations,
  projection,
  title,
  locale,
  currency,
}: AccessibleChartSummaryProps): React.JSX.Element {
  const copy = SUMMARY_COPY[locale];
  return (
    <section aria-label={copy.label} className="tp-visually-hidden" role="region">
      <p>{copy.intro(title, projection.length)}</p>
      <ol>
        {projection.map(datum => {
          const annotation = visibleWaterfallAnnotation(annotations, datum.nodeId);
          return (
            <li key={datum.nodeId}>
              {datum.label}, {copy.kindLabels[datum.kind]},{' '}
              {formatWaterfallDatumAmount(datum, locale, currency)}
              {annotation === '' ? null : `, ${copy.annotation}: ${annotation}`}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
