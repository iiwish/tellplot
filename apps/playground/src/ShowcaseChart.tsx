import { ChartEditor } from 'tellplot/react';

import { EXAMPLE_CATALOG, type ShowcaseExampleId } from './exampleCatalog';
import { getPlaygroundFixture } from './fixtures';
import { createShowcaseConfig } from './showcaseConfig';
import { createShowcaseDefaultView } from './showcaseView';

export interface ShowcaseChartProps {
  readonly exampleId: ShowcaseExampleId;
  readonly compact?: boolean;
  readonly interactive?: boolean;
  readonly testId?: string;
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
