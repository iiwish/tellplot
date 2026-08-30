import { createInitialViewSpec } from 'tellplot';
import { ChartEditor } from 'tellplot/vue';
import 'tellplot/styles.css';
import { createApp, h, nextTick, ref, shallowRef, version } from 'vue';

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
const comparisonData = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'framework-matrix-comparison',
  currency: 'USD',
  series: [
    { id: 'current', label: 'Current' },
    { id: 'plan', label: 'Plan' },
  ],
  items: [
    {
      id: 'alpha',
      label: 'Alpha',
      values: [
        { seriesId: 'current', amount: 12 },
        { seriesId: 'plan', amount: 10 },
      ],
    },
    {
      id: 'beta',
      label: 'Beta',
      values: [
        { seriesId: 'current', amount: 8 },
        { seriesId: 'plan', amount: 11 },
      ],
    },
  ],
};
const comparisonView = {
  schemaVersion: '3.0.0',
  datasetId: comparisonData.datasetId,
  chartType: 'column',
  revision: 0,
  rootOrder: ['alpha', 'beta'],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
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
const defaultView = ref(undefined);
const viewMode = ref('controlled');
const config = shallowRef({ ...baseConfig, data: structuredClone(data) });
const editorRef = ref(null);
let lastView;
let lastCommand;
const app = createApp({
  setup() {
    return () =>
      h(ChartEditor, {
        ref: editorRef,
        config: {
          ...config.value,
          data: structuredClone(config.value.data),
          appearance: appearance.value,
        },
        ...(viewMode.value === 'controlled' ? { view: view.value } : {}),
        ...(viewMode.value === 'default' ? { defaultView: defaultView.value } : {}),
        'onUpdate:view'(nextView) {
          lastView = nextView;
          if (viewMode.value === 'controlled') {
            view.value = nextView;
          }
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

const waitForRegistry = async labels => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const text = host.querySelector('[data-summary-kind="series-registry"]')?.textContent ?? '';
    const order = labels.map(label => text.indexOf(label));
    if (
      order.every(index => index >= 0) &&
      order.every((index, position) => position === 0 || index > order[position - 1])
    ) {
      return;
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  throw new Error(`Vue matrix did not render registry ${labels.join('|')}`);
};

const viewReceipt = currentView =>
  JSON.stringify({
    schemaVersion: currentView.schemaVersion,
    datasetId: currentView.datasetId,
    chartType: currentView.chartType,
    revision: currentView.revision,
    rootOrder: currentView.rootOrder,
    groups: currentView.groups,
    collapsedGroupIds: currentView.collapsedGroupIds,
    pinnedItemIds: currentView.pinnedItemIds,
    annotations: currentView.annotations,
    emphasis: currentView.emphasis,
  });

const waitForView = async (expected, phase) => {
  const expectedReceipt = viewReceipt(expected);
  const deadline = Date.now() + 5_000;
  let stableSamples = 0;
  while (Date.now() < deadline) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const current = editorRef.value?.getView();
    stableSamples =
      current !== undefined && viewReceipt(current) === expectedReceipt ? stableSamples + 1 : 0;
    if (stableSamples === 2) {
      return current;
    }
  }
  throw new Error(`Vue matrix did not settle ${phase}: ${expectedReceipt}`);
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
  async exportComparisonSvg() {
    const result = await editorRef.value?.exportImage({ format: 'svg', filename: 'comparison' });
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
  async beginComparisonScenario() {
    lastView = undefined;
    lastCommand = undefined;
    appearance.value = { legend: true, animation: { enabled: false } };
    config.value = { type: 'column', data: comparisonData, height: 680 };
    view.value = structuredClone(comparisonView);
    defaultView.value = structuredClone(comparisonView);
    viewMode.value = 'default';
    await nextTick();
    await waitForRegistry(['Current', 'Plan']);
    await waitForView(comparisonView, 'comparison defaultView seed');
    const row = host.querySelector('[data-node-id="alpha"]');
    if (!(row instanceof HTMLElement)) {
      throw new Error('Vue comparison row is unavailable');
    }
    row.dispatchEvent(
      new KeyboardEvent('keydown', { altKey: true, bubbles: true, key: 'ArrowDown' }),
    );
    await waitForRevision(1);
    const movedOrder = [...editorRef.value.getView().rootOrder];
    const undo = host.querySelector('button[aria-label="撤销"], button[aria-label="Undo"]');
    if (!(undo instanceof HTMLButtonElement) || undo.disabled) {
      throw new Error('Vue comparison history is unavailable');
    }
    undo.click();
    await waitForRevision(2);
    const undoOrder = [...editorRef.value.getView().rootOrder];
    const beforeDefaultUpdate = editorRef.value.getView();
    defaultView.value = {
      ...structuredClone(comparisonView),
      revision: 9,
      rootOrder: ['beta', 'alpha'],
    };
    await nextTick();
    const afterDefaultUpdate = await waitForView(
      beforeDefaultUpdate,
      'defaultView-only update preserving the current view',
    );
    view.value = structuredClone(afterDefaultUpdate);
    defaultView.value = undefined;
    viewMode.value = 'controlled';
    await nextTick();
    const controlledView = await waitForView(afterDefaultUpdate, 'defaultView to controlled');
    view.value = {
      ...structuredClone(controlledView),
      annotations: { ...controlledView.annotations, alpha: 'Host controlled note' },
    };
    await nextTick();
    const standaloneView = await waitForView(view.value, 'host-controlled annotation');
    viewMode.value = 'uncontrolled';
    await nextTick();
    const uncontrolledView = await waitForView(standaloneView, 'controlled to uncontrolled seed');
    return {
      movedOrder,
      undoOrder,
      beforeDefaultUpdate,
      afterDefaultUpdate,
      controlledView,
      standaloneView,
      uncontrolledView,
      callbackView: lastView,
      callbackCommand: lastCommand,
      registry: host.querySelector('[data-summary-kind="series-registry"]')?.textContent,
    };
  },
  async reorderComparisonRegistry() {
    config.value = {
      ...config.value,
      data: {
        ...comparisonData,
        series: [...comparisonData.series].reverse(),
        items: comparisonData.items.map(item => ({ ...item, values: [...item.values].reverse() })),
      },
    };
    await nextTick();
    await waitForRegistry(['Plan', 'Current']);
    host.querySelector('[data-node-id="alpha"]')?.click();
    await waitForRegistry(['Plan', 'Current']);
    return {
      registry: host.querySelector('[data-summary-kind="series-registry"]')?.textContent,
      inspectorOrder: Array.from(
        host.querySelectorAll('[data-inspector-values] [data-series-id]'),
      ).map(element => element.getAttribute('data-series-id')),
      view: editorRef.value.getView(),
    };
  },
  async expandComparisonRegistry() {
    config.value = {
      ...config.value,
      data: {
        ...config.value.data,
        series: [
          ...config.value.data.series,
          { id: 'forecast', label: 'Forecast' },
          { id: 'stretch', label: 'Stretch' },
        ],
        items: config.value.data.items.map(item => ({
          ...item,
          values: [
            ...item.values,
            { seriesId: 'forecast', amount: 9 },
            { seriesId: 'stretch', amount: 13 },
          ],
        })),
      },
    };
    await nextTick();
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    host.querySelector('[data-node-id="alpha"]')?.click();
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    return {
      registry: host.querySelector('[data-summary-kind="series-registry"]')?.textContent,
      inspectorOrder: Array.from(
        host.querySelectorAll('[data-inspector-values] [data-series-id]'),
      ).map(element => element.getAttribute('data-series-id')),
      seriesCount: host.querySelectorAll('[data-series-id]').length,
      view: editorRef.value.getView(),
    };
  },
  async emptyComparison() {
    config.value = {
      ...config.value,
      data: { ...config.value.data, items: [] },
    };
    view.value = {
      ...structuredClone(editorRef.value.getView()),
      rootOrder: [],
      groups: {},
      collapsedGroupIds: [],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    };
    viewMode.value = 'controlled';
    await nextTick();
    await waitForView(view.value, 'empty comparison');
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    return { view: editorRef.value.getView() };
  },
  unmount() {
    app.unmount();
    host.dataset.unmounted = 'true';
  },
};
