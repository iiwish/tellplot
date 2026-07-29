import type { ViewNodeId } from '../domain/ids';
import type { Annotation, ChartType } from '../domain/model';
import type { ResolvedFinancialChartNumberFormat } from '../config/chartAppearance';
import {
  formatCategoricalDatumAmount,
  visibleCategoricalAnnotation,
} from '../charts/categorical/spec';
import type { CategoricalDatumKind, CategoricalProjection } from '../charts/categorical/types';
import { formatWaterfallDatumAmount, visibleWaterfallAnnotation } from '../charts/waterfall/spec';
import type { WaterfallDatumKind, WaterfallProjection } from '../charts/waterfall/types';
import type { EditorLocale } from './formatAmount';

interface AccessibleChartSummaryBaseProps {
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly title: string;
  readonly locale: EditorLocale;
  readonly currency?: string | undefined;
  readonly numberFormat?: ResolvedFinancialChartNumberFormat;
}

type AccessibleChartSummaryProps = AccessibleChartSummaryBaseProps &
  (
    | {
        readonly chartType?: 'waterfall';
        readonly projection: WaterfallProjection;
      }
    | {
        readonly chartType: Extract<ChartType, 'bar' | 'column'>;
        readonly projection: CategoricalProjection;
      }
  );

interface SummaryCopy {
  readonly label: string;
  readonly annotation: string;
  readonly intro: (title: string, count: number) => string;
  readonly waterfallKindLabels: Readonly<Record<WaterfallDatumKind, string>>;
  readonly categoricalKindLabels: Readonly<Record<CategoricalDatumKind, string>>;
}

const SUMMARY_COPY: Readonly<Record<EditorLocale, SummaryCopy>> = {
  'zh-CN': {
    label: '图表摘要',
    annotation: '注释',
    intro: (title, count) => `${title}，共 ${count} 个可见节点。`,
    waterfallKindLabels: {
      start: '起点',
      positive: '正向贡献',
      negative: '负向贡献',
      subtotal: '小计',
      group: '分组',
      end: '终点',
    },
    categoricalKindLabels: {
      positive: '正值分类',
      negative: '负值分类',
      group: '分组',
    },
  },
  'en-US': {
    label: 'Chart summary',
    annotation: 'annotation',
    intro: (title, count) => `${title}, ${count} visible nodes.`,
    waterfallKindLabels: {
      start: 'start',
      positive: 'positive contribution',
      negative: 'negative contribution',
      subtotal: 'subtotal',
      group: 'group',
      end: 'end',
    },
    categoricalKindLabels: {
      positive: 'positive category',
      negative: 'negative category',
      group: 'group',
    },
  },
};

/** Ordered text equivalent for the currently visible chart projection. */
export function AccessibleChartSummary({
  annotations,
  chartType = 'waterfall',
  projection,
  title,
  locale,
  currency,
  numberFormat,
}: AccessibleChartSummaryProps): React.JSX.Element {
  const copy = SUMMARY_COPY[locale];
  const items =
    chartType === 'waterfall'
      ? (projection as WaterfallProjection).map(datum => {
          const annotation = visibleWaterfallAnnotation(annotations, datum.nodeId);
          return {
            nodeId: datum.nodeId,
            text: `${datum.label}, ${copy.waterfallKindLabels[datum.kind]}, ${formatWaterfallDatumAmount(
              datum,
              locale,
              currency,
              numberFormat,
            )}${annotation === '' ? '' : `, ${copy.annotation}: ${annotation}`}`,
          };
        })
      : (projection as CategoricalProjection).map(datum => {
          const annotation = visibleCategoricalAnnotation(annotations, datum.nodeId);
          return {
            nodeId: datum.nodeId,
            text: `${datum.label}, ${copy.categoricalKindLabels[datum.kind]}, ${formatCategoricalDatumAmount(
              datum,
              locale,
              currency,
              numberFormat,
            )}${annotation === '' ? '' : `, ${copy.annotation}: ${annotation}`}`,
          };
        });
  return (
    <section aria-label={copy.label} className="tp-visually-hidden" role="region">
      <p>{copy.intro(title, projection.length)}</p>
      <ol>
        {items.map(item => (
          <li key={item.nodeId}>{item.text}</li>
        ))}
      </ol>
    </section>
  );
}
