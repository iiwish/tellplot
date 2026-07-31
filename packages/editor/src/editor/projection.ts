import {
  projectCategorical,
  projectWaterfall,
  validationIssue,
  type CategoricalProjection,
  type ChartConfig,
  type ValidationIssue,
  type ViewSpec,
  type WaterfallProjection,
} from '@tellplot/core';
import type { EditorMessages } from './messages';

export type EditorChartProjection =
  | {
      readonly family: 'waterfall';
      readonly chartType: 'waterfall';
      readonly projection: WaterfallProjection;
    }
  | {
      readonly family: 'categorical';
      readonly chartType: 'bar' | 'column';
      readonly projection: CategoricalProjection;
    };

export type EditorProjectionResult =
  | { readonly ok: true; readonly value: EditorChartProjection }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

export function projectEditorChart(config: ChartConfig, view: ViewSpec): EditorProjectionResult {
  const sourceData = config.data;
  if (sourceData.schemaVersion === '2.0.0' && sourceData.dataKind === 'categorical') {
    const result = projectCategorical(sourceData, view);
    if (!result.ok) {
      return result;
    }
    if (view.chartType !== 'bar' && view.chartType !== 'column') {
      return {
        ok: false,
        errors: [validationIssue('SOURCE_CONFLICT', 'INCOMPATIBLE_CHART_TYPE', '/chartType')],
      };
    }
    return {
      ok: true,
      value: { family: 'categorical', chartType: view.chartType, projection: result.value },
    };
  }

  const result = projectWaterfall(sourceData, view);
  return result.ok
    ? {
        ok: true,
        value: { family: 'waterfall', chartType: 'waterfall', projection: result.value },
      }
    : result;
}

export function chartTitle(
  messages: EditorMessages,
  chartType: EditorChartProjection['chartType'],
): string {
  return chartType === 'bar'
    ? messages.barTitle
    : chartType === 'column'
      ? messages.columnTitle
      : messages.waterfallTitle;
}
