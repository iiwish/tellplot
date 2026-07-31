import { createEditor, type ChartConfig, type EditorInstance } from '@tellplot/editor';
import '@tellplot/editor/styles.css';

const config = {
  type: 'column',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'revenue-by-region',
    items: [
      { id: 'east', label: 'East', amount: 128 },
      { id: 'west', label: 'West', amount: 96 },
      { id: 'north', label: 'North', amount: 74 },
    ],
  },
  locale: 'en-US',
} as const satisfies ChartConfig;

export function mountRevenueChart(container: HTMLElement): EditorInstance {
  return createEditor(container, { config });
}
