import { createInitialViewSpec } from '@tellplot/core';
import { ChartEditor } from '@tellplot/react';
import '@tellplot/react/styles.css';
import React, { createRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import './host.css';

const data = {
  schemaVersion: '1.0.0',
  datasetId: 'framework-matrix',
  currency: 'CNY',
  items: [
    { id: 'opening-profit', label: 'Opening profit', amount: 1_000, kind: 'start' },
    { id: 'sales-growth', label: 'Sales growth', amount: 200, kind: 'contribution' },
    { id: 'cost-pressure', label: 'Cost pressure', amount: -120, kind: 'contribution' },
    { id: 'ending-profit', label: 'Ending profit', amount: 1_080, kind: 'end' },
  ],
};
const baseConfig = {
  type: 'waterfall',
  data,
  height: 680,
};
const initial = createInitialViewSpec(data, { chartType: baseConfig.type });
if (!initial.ok) {
  throw new Error('React matrix initial view is invalid');
}

const host = document.querySelector('#root');
if (!(host instanceof HTMLElement)) {
  throw new Error('React matrix host is missing');
}

const root = createRoot(host);
const editorRef = createRef();
let lastView;
let lastCommand;
function MatrixEditor({ appearance }) {
  const [view, setView] = useState(initial.value);
  return React.createElement(ChartEditor, {
    ref: editorRef,
    config: {
      ...baseConfig,
      data: structuredClone(data),
      appearance,
    },
    view,
    onViewChange(nextView) {
      lastView = nextView;
      setView(structuredClone(nextView));
    },
    onCommand(event) {
      lastCommand = event;
    },
  });
}
const renderEditor = appearance => {
  root.render(React.createElement(MatrixEditor, { appearance }));
};

renderEditor();

const waitForRevision = async revision => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (editorRef.current?.getView().revision === revision) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  throw new Error(`React matrix did not reach revision ${revision}`);
};

globalThis.__tellplotFrameworkMatrix = {
  configure() {
    renderEditor({
      title: 'Configured bridge',
      colors: {
        start: '#d946ef',
        positive: '#d946ef',
        negative: '#d946ef',
        subtotal: '#d946ef',
        group: '#d946ef',
        end: '#d946ef',
      },
      axes: { category: false, value: true },
      labels: { value: 'never' },
      tooltip: true,
      animation: { enabled: false, duration: 0 },
      numberFormat: {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        currencyDisplay: 'code',
      },
    });
  },
  frameworkVersion: React.version,
  async exportSvg() {
    const result = await editorRef.current?.exportImage({ format: 'svg' });
    if (result === undefined) {
      throw new Error('React matrix editor ref is unavailable');
    }
    return {
      mimeType: result.mimeType,
      suggestedFilename: result.suggestedFilename,
      width: result.width,
      height: result.height,
      svg: await result.blob.text(),
    };
  },
  async runScenario() {
    const row = host.querySelector('[data-node-id="sales-growth"]');
    if (!(row instanceof HTMLElement)) {
      throw new Error('React matrix scenario row is unavailable');
    }
    row.dispatchEvent(
      new KeyboardEvent('keydown', { altKey: true, bubbles: true, key: 'ArrowDown' }),
    );
    await waitForRevision(1);
    if (lastView === undefined || lastCommand === undefined || editorRef.current === null) {
      throw new Error('React matrix scenario did not publish its shared result');
    }
    const moved = {
      view: editorRef.current.getView(),
      callbackView: lastView,
      command: lastCommand,
    };
    const undo = host.querySelector('button[aria-label="撤销"], button[aria-label="Undo"]');
    if (!(undo instanceof HTMLButtonElement) || undo.disabled) {
      throw new Error('React matrix controlled history is unavailable');
    }
    undo.click();
    await waitForRevision(2);
    return {
      ...moved,
      undoView: editorRef.current.getView(),
      undoCallbackView: lastView,
      undoCommand: lastCommand,
    };
  },
  unmount() {
    root.unmount();
    host.dataset.unmounted = 'true';
  },
};
