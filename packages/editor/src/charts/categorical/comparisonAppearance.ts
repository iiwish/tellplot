import {
  resolveFinancialChartAppearance,
  type CategoricalComparisonChartAppearance,
  type CategoricalComparisonSeries,
  type FinancialChartAppearance,
  type ResolvedFinancialChartAppearance,
  type SeriesId,
} from '@tellplot/core';

const DEFAULT_COMPARISON_COLORS = Object.freeze([
  '#0072B2',
  '#D55E00',
  '#009E73',
  '#CC79A7',
] as const);

export interface ResolvedComparisonAppearance {
  readonly common: ResolvedFinancialChartAppearance;
  readonly seriesDomain: readonly SeriesId[];
  readonly seriesRange: readonly string[];
  readonly legend: boolean;
}

function present<TValue>(key: string, value: TValue | undefined): Record<string, TValue> {
  return value === undefined ? {} : { [key]: value };
}

function toCommonAppearance(
  appearance: CategoricalComparisonChartAppearance | undefined,
): FinancialChartAppearance {
  const valueLabel = appearance?.labels?.value;
  const groupLabel = appearance?.labels?.group;
  const valueOptions = typeof valueLabel === 'object' ? valueLabel : undefined;
  const groupOptions = typeof groupLabel === 'object' ? groupLabel : undefined;
  return {
    ...present('title', appearance?.title),
    ...(appearance?.colors?.group === undefined
      ? {}
      : { palette: { group: appearance.colors.group } }),
    ...(appearance?.axes === undefined
      ? {}
      : {
          axis: {
            ...present('x', appearance.axes.category),
            ...present('y', appearance.axes.value),
          },
        }),
    ...present('valueLabels', typeof valueLabel === 'string' ? valueLabel : valueOptions?.display),
    ...(valueOptions === undefined
      ? {}
      : {
          valueLabelStyle: {
            ...present('placement', valueOptions.placement),
            ...present('offset', valueOptions.offset),
            ...present('color', valueOptions.color),
            ...present('fontSize', valueOptions.fontSize),
            ...present('fontWeight', valueOptions.fontWeight),
            ...present('background', valueOptions.background),
            ...present('backgroundColor', valueOptions.backgroundColor),
            ...present('backgroundOpacity', valueOptions.backgroundOpacity),
          },
        }),
    ...present('tooltip', appearance?.tooltip ?? true),
    ...(appearance?.animation === undefined ? {} : { animation: appearance.animation }),
    ...(appearance?.groupRegion === undefined && groupLabel === undefined
      ? {}
      : {
          groupRegion: {
            ...present('enabled', appearance?.groupRegion?.enabled),
            ...present('fillOpacity', appearance?.groupRegion?.opacity),
            ...present(
              'label',
              typeof groupLabel === 'string' ? groupLabel : groupOptions?.display,
            ),
            ...(groupOptions === undefined
              ? {}
              : {
                  labelStyle: {
                    ...present('placement', groupOptions.placement),
                    ...present('offset', groupOptions.offset),
                    ...present('color', groupOptions.color),
                    ...present('fontSize', groupOptions.fontSize),
                    ...present('fontWeight', groupOptions.fontWeight),
                    ...present('background', groupOptions.background),
                    ...present('backgroundColor', groupOptions.backgroundColor),
                    ...present('backgroundOpacity', groupOptions.backgroundOpacity),
                  },
                }),
          },
        }),
    ...(appearance?.numberFormat === undefined ? {} : { numberFormat: appearance.numberFormat }),
  };
}

/** Resolves the private, complete source-ordinal comparison presentation. */
export function resolveComparisonAppearance(
  series: readonly CategoricalComparisonSeries[],
  appearance: CategoricalComparisonChartAppearance | undefined,
  fallbackTitle: string,
): ResolvedComparisonAppearance {
  const overrides = new Map(
    (appearance?.colors?.series ?? []).map(entry => [entry.seriesId, entry.color]),
  );
  return Object.freeze({
    common: resolveFinancialChartAppearance(toCommonAppearance(appearance), fallbackTitle),
    seriesDomain: Object.freeze(series.map(entry => entry.id)),
    seriesRange: Object.freeze(
      series.map(
        (entry, index) =>
          overrides.get(entry.id) ??
          (DEFAULT_COMPARISON_COLORS[index] as (typeof DEFAULT_COMPARISON_COLORS)[number]),
      ),
    ),
    legend: appearance?.legend ?? true,
  });
}
