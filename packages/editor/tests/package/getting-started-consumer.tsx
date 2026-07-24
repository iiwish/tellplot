import { ChartEditor, type ChartConfig } from '@tellplot/editor';
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

export function RevenueChart() {
  return <ChartEditor config={config} />;
}
