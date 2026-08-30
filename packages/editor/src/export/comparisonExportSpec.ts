import type {
  Annotation,
  CategoricalComparisonChartAppearance,
  CategoricalComparisonProjection,
  CategoricalComparisonSeries,
  Emphasis,
  ViewNodeId,
} from '@tellplot/core';
import {
  createComparisonChartSpec,
  shouldShowComparisonValueLabels,
} from '../charts/categorical/comparisonSpec';
import type { ExpandedGroupRegion } from '../charts/groupRegions';
import type { EditorLocale } from '../editor/formatAmount';

export interface ComparisonExportSpecOptions {
  readonly projection: CategoricalComparisonProjection;
  readonly series: readonly CategoricalComparisonSeries[];
  readonly chartType: 'bar' | 'column';
  readonly title: string;
  readonly locale: EditorLocale;
  readonly currency: string | undefined;
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
  readonly appearance?: CategoricalComparisonChartAppearance | undefined;
  readonly groupRegions?: readonly ExpandedGroupRegion[] | undefined;
}

/** Builds export output from the canonical comparison spec with all interaction and motion disabled. */
export function createComparisonExportSpec(
  options: ComparisonExportSpecOptions,
): ReturnType<typeof createComparisonChartSpec> {
  return createComparisonChartSpec({
    ...options,
    reducedMotion: true,
    showValueLabels: shouldShowComparisonValueLabels(options.projection),
    appearance: {
      ...options.appearance,
      tooltip: false,
      animation: { ...options.appearance?.animation, enabled: false },
    },
  });
}
