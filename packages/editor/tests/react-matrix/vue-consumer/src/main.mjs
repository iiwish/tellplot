import { createInitialViewSpec } from '@tellplot/core';
import { ChartEditor } from '@tellplot/vue';
import '@tellplot/vue/styles.css';
import { createApp, h, ref, version } from 'vue';

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
  throw new Error('Vue matrix initial view is invalid');
}

const host = document.querySelector('#root');
if (!(host instanceof HTMLElement)) {
  throw new Error('Vue matrix host is missing');
}

const appearance = ref(undefined);
const view = ref(initial.value);
const editorRef = ref(null);
let lastView;
let lastCommand;
const app = createApp({
  setup() {
    return () =>
      h(ChartEditor, {
        ref: editorRef,
        config: { ...baseConfig, data: structuredClone(data), appearance: appearance.value },
        view: view.value,
        'onUpdate:view'(nextView) {
          lastView = nextView;
          view.value = nextView;
        },
        onCommand(event) {
          lastCommand = event;
        },
      });
  },
});
app.mount(host);

const waitForRevision = async revision => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (editorRef.value?.getView().revision === revision) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  throw new Error(`Vue matrix did not reach revision ${revision}`);
};

globalThis.__tellplotFrameworkMatrix = {
  configure() {
    appearance.value = {
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
  },
  frameworkVersion: version,
  async exportSvg() {
    const result = await editorRef.value?.exportImage({ format: 'svg' });
    if (result === undefined) {
      throw new Error('Vue matrix editor expose is unavailable');
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
      throw new Error('Vue matrix scenario row is unavailable');
    }
    row.dispatchEvent(
      new KeyboardEvent('keydown', { altKey: true, bubbles: true, key: 'ArrowDown' }),
    );
    await waitForRevision(1);
    if (lastView === undefined || lastCommand === undefined || editorRef.value === null) {
      throw new Error('Vue matrix scenario did not publish its shared result');
    }
    const moved = {
      view: editorRef.value.getView(),
      callbackView: lastView,
      command: lastCommand,
    };
    const undo = host.querySelector('button[aria-label="撤销"], button[aria-label="Undo"]');
    if (!(undo instanceof HTMLButtonElement) || undo.disabled) {
      throw new Error('Vue matrix controlled history is unavailable');
    }
    undo.click();
    await waitForRevision(2);
    return {
      ...moved,
      undoView: editorRef.value.getView(),
      undoCallbackView: lastView,
      undoCommand: lastCommand,
    };
  },
  unmount() {
    app.unmount();
    host.dataset.unmounted = 'true';
  },
};
