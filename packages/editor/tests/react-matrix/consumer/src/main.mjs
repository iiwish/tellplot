import { FinancialChartEditor } from '@tellplot/editor';
import '@tellplot/editor/styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';

import './host.css';

const sourceData = {
  schemaVersion: '1.0.0',
  datasetId: 'react-runtime-consumer',
  currency: 'CNY',
  items: [
    { id: 'opening-profit', label: 'Opening profit', amount: 1_000, kind: 'start' },
    { id: 'sales-growth', label: 'Sales growth', amount: 200, kind: 'contribution' },
    { id: 'cost-pressure', label: 'Cost pressure', amount: -120, kind: 'contribution' },
    { id: 'ending-profit', label: 'Ending profit', amount: 1_080, kind: 'end' },
  ],
};

const host = document.querySelector('#root');
if (!(host instanceof HTMLElement)) {
  throw new Error('React matrix host is missing');
}

const root = createRoot(host);
root.render(
  React.createElement(FinancialChartEditor, {
    sourceData,
    height: 680,
  }),
);

globalThis.__tellplotReactMatrix = {
  reactVersion: React.version,
  unmount() {
    root.unmount();
    host.dataset.unmounted = 'true';
  },
};
