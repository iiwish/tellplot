import {
  createEditor,
  createInitialViewSpec,
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
