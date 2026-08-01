import { createEditor, createInitialViewSpec } from 'tellplot';
import 'tellplot/styles.css';

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
const baseConfig = { type: 'waterfall', data, height: 680 };
const initial = createInitialViewSpec(data, { chartType: baseConfig.type });
if (!initial.ok) {
  throw new Error('Imperative matrix initial view is invalid');
}
const host = document.querySelector('#root');
if (!(host instanceof HTMLElement)) {
  throw new Error('Imperative matrix host is missing');
}

let lastView;
let lastCommand;
let currentView = initial.value;
let currentAppearance;
let editor;
const options = () => ({
  config: { ...baseConfig, data: structuredClone(data), appearance: currentAppearance },
  view: currentView,
  onViewChange(view) {
    lastView = view;
    queueMicrotask(() => {
      currentView = structuredClone(view);
      editor.update(options());
    });
  },
  onCommand(event) {
    lastCommand = event;
  },
});
editor = createEditor(host, options());

const waitForRevision = async revision => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (editor.getView().revision === revision) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  throw new Error(`Imperative matrix did not reach revision ${revision}`);
};

globalThis.__tellplotFrameworkMatrix = {
  configure() {
    currentAppearance = {
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
    };
    editor.update(options());
  },
  frameworkVersion: 'imperative',
  async exportSvg() {
    const result = await editor.exportImage({ format: 'svg' });
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
      throw new Error('Imperative matrix scenario row is unavailable');
    }
    row.dispatchEvent(
      new KeyboardEvent('keydown', { altKey: true, bubbles: true, key: 'ArrowDown' }),
    );
    await waitForRevision(1);
    if (lastView === undefined || lastCommand === undefined) {
      throw new Error('Imperative matrix scenario did not publish its shared result');
    }
    const moved = { view: editor.getView(), callbackView: lastView, command: lastCommand };
    const undo = host.querySelector('button[aria-label="撤销"], button[aria-label="Undo"]');
    if (!(undo instanceof HTMLButtonElement) || undo.disabled) {
      throw new Error('Imperative matrix controlled history is unavailable');
    }
    undo.click();
    await waitForRevision(2);
    return {
      ...moved,
      undoView: editor.getView(),
      undoCallbackView: lastView,
      undoCommand: lastCommand,
    };
  },
  unmount() {
    editor.destroy();
    host.dataset.unmounted = 'true';
  },
};
