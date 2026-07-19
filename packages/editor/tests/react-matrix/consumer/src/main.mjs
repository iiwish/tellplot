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
const renderEditor = chartAppearance => {
  root.render(
    React.createElement(FinancialChartEditor, {
      chartAppearance,
      height: 680,
      sourceData,
    }),
  );
};

renderEditor();

globalThis.__tellplotReactMatrix = {
  configure() {
    renderEditor({
      title: 'Configured bridge',
      palette: {
        start: '#d946ef',
        positive: '#d946ef',
        negative: '#d946ef',
        subtotal: '#d946ef',
        group: '#d946ef',
        end: '#d946ef',
      },
      axis: { x: false, y: true },
      valueLabels: 'never',
      tooltip: true,
      animation: { enabled: false, duration: 0 },
      numberFormat: {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        currencyDisplay: 'code',
      },
    });
  },
  reactVersion: React.version,
  unmount() {
    root.unmount();
    host.dataset.unmounted = 'true';
  },
};
