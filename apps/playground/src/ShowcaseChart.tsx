import type { ChartConfig, SourceData } from 'tellplot';
import { ChartEditor } from 'tellplot/react';

import { EXAMPLE_CATALOG, type ShowcaseChartType, type ShowcaseExampleId } from './exampleCatalog';
import {
  DEMO_CATEGORICAL_COLORS,
  DEMO_COMPARISON_PALETTE,
  DEMO_WATERFALL_COLORS,
} from './demoPresentation';
import { getPlaygroundFixture } from './fixtures';
import { createShowcaseDefaultView } from './showcaseView';

export interface ShowcaseChartProps {
  readonly exampleId: ShowcaseExampleId;
  readonly compact?: boolean;
  readonly interactive?: boolean;
  readonly testId?: string;
}

export function createShowcaseConfig(
  sourceData: SourceData,
  type: ShowcaseChartType,
  title: string,
  compact: boolean,
  interactive: boolean,
): ChartConfig | null {
  const common = {
    data: sourceData,
    height: '100%',
    locale: 'zh-CN' as const,
    appearance: {
      title,
      axes: { category: !compact, value: true },
      labels: interactive
        ? {
            value: {
              display: 'always' as const,
              placement: 'outside' as const,
              offset: compact ? 3 : 5,
            },
            group: 'never' as const,
          }
        : compact
          ? { value: 'never' as const, group: 'never' as const }
          : {
              value: { display: 'auto' as const, placement: 'outside' as const, offset: 5 },
              group: 'never' as const,
            },
      tooltip: true,
      animation: { enabled: true, duration: 220 },
      groupRegion: { enabled: interactive || !compact, opacity: interactive ? 0.08 : 0.05 },
      numberFormat: {
        minimumFractionDigits: 0,
        maximumFractionDigits: sourceData.currency === undefined ? 2 : 0,
        currencyDisplay: 'narrowSymbol' as const,
      },
    },
    editor: {
      readOnly: !interactive,
      panels: { outline: false, inspector: false, toolbar: false },
    },
  };

  if (
    sourceData.schemaVersion === '2.0.0' &&
    sourceData.dataKind === 'categorical' &&
    (type === 'bar' || type === 'column')
  ) {
    return {
      ...common,
      type,
      data: sourceData,
      appearance: {
        ...common.appearance,
        colors: DEMO_CATEGORICAL_COLORS,
      },
    };
  }
  if (sourceData.schemaVersion === '3.0.0' && (type === 'bar' || type === 'column')) {
    return {
      ...common,
      type,
      data: sourceData,
      appearance: {
        ...common.appearance,
        labels: compact
          ? { value: 'never' as const, group: 'never' as const }
          : common.appearance.labels,
        colors: {
          series: sourceData.series.map((series, index) => ({
            seriesId: series.id,
            color: DEMO_COMPARISON_PALETTE[index] ?? DEMO_COMPARISON_PALETTE[0],
          })),
          group: DEMO_WATERFALL_COLORS.group,
        },
        legend: true,
      },
    };
  }
  if (
    type === 'waterfall' &&
    (sourceData.schemaVersion === '1.0.0' || sourceData.dataKind === 'waterfall')
  ) {
    return {
      ...common,
      type,
      data: sourceData,
      appearance: {
        ...common.appearance,
        colors: DEMO_WATERFALL_COLORS,
      },
    };
  }
  return null;
}

export function ShowcaseChart({
  exampleId,
  compact = false,
  interactive = false,
  testId,
}: ShowcaseChartProps): React.JSX.Element {
  const example = EXAMPLE_CATALOG.find(candidate => candidate.id === exampleId);
  if (example === undefined) {
    return <p role="alert">示例不存在</p>;
  }

  const sourceData = getPlaygroundFixture(example.fixtureSearch);
  const config = createShowcaseConfig(
    sourceData,
    example.chartType,
    example.title,
    compact,
    interactive,
  );
  if (config === null) {
    return <p role="alert">示例数据无法渲染</p>;
  }

  const defaultView = createShowcaseDefaultView(sourceData, example.chartType, interactive);

  return (
    <div
      className="showcase-chart"
      data-example-id={example.id}
      data-interactive={interactive ? 'true' : 'false'}
      data-default-group={defaultView === undefined ? undefined : '增长驱动'}
      data-testid={testId}
      {...(interactive ? {} : { inert: true })}
    >
      <ChartEditor
        key={`${example.id}-${interactive ? 'interactive' : 'static'}`}
        config={config}
        {...(defaultView === undefined ? {} : { defaultView })}
      />
    </div>
  );
}
