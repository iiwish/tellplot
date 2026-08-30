import {
  createEditor,
  createInitialViewSpec,
  type CategoricalComparisonChartConfig,
  type CategoricalComparisonSourceData,
  type CategoricalComparisonViewSpec,
  type ChartConfig,
  type EditorInstance,
  type ViewSpec,
} from 'tellplot';
import { validateChartConfig } from 'tellplot/core';
import { ChartEditor as ReactChartEditor, type ChartEditorHandle } from 'tellplot/react';
import { ChartEditor as VueChartEditor, type ChartEditorExposed } from 'tellplot/vue';
import 'tellplot/styles.css';

const config = {
  type: 'column',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'package-consumer',
    items: [{ id: 'revenue', label: 'Revenue', amount: 128 }],
  },
} as const satisfies ChartConfig;

const result = validateChartConfig(config);
const initial = createInitialViewSpec(config.data, { chartType: config.type });

const comparisonData = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'comparison-package-consumer',
  series: [
    { id: 'actual', label: 'Actual' },
    { id: 'budget', label: 'Budget' },
  ],
  items: [
    {
      id: 'revenue',
      label: 'Revenue',
      values: [
        { seriesId: 'actual', amount: 128 },
        { seriesId: 'budget', amount: 135 },
      ],
    },
  ],
} as const satisfies CategoricalComparisonSourceData;

export const comparisonConfig = {
  type: 'column',
  data: comparisonData,
  appearance: { legend: true, colors: { series: [{ seriesId: 'actual', color: '#0072B2' }] } },
} as const satisfies CategoricalComparisonChartConfig;

export const comparisonView: CategoricalComparisonViewSpec = {
  schemaVersion: '3.0.0',
  datasetId: comparisonData.datasetId,
  chartType: 'column',
  revision: 0,
  rootOrder: ['revenue'],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
};

export function mount(container: HTMLElement): EditorInstance {
  return createEditor(container, { config });
}

export function ReactConsumer(): React.JSX.Element {
  return <ReactChartEditor config={config} />;
}

export const vueConsumer = VueChartEditor;
export const typeProofs: readonly [
  ViewSpec | undefined,
  ChartEditorHandle | undefined,
  ChartEditorExposed | undefined,
] = [initial.ok ? initial.value : undefined, undefined, undefined];
export const validationResult = result;
