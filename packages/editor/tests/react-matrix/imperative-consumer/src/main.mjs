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
  throw new Error('Imperative matrix initial view is invalid');
}
const host = document.querySelector('#root');
if (!(host instanceof HTMLElement)) {
  throw new Error('Imperative matrix host is missing');
}

let lastView;
let lastCommand;
let currentView = initial.value;
let currentDefaultView;
let viewMode = 'controlled';
let currentAppearance;
let currentConfig = baseConfig;
let editor;
const options = () => ({
  config: {
    ...currentConfig,
    data: structuredClone(currentConfig.data),
    appearance: currentAppearance,
  },
  ...(viewMode === 'controlled' ? { view: currentView } : {}),
  ...(viewMode === 'default' ? { defaultView: currentDefaultView } : {}),
  onViewChange(view) {
    lastView = view;
    if (viewMode === 'controlled') {
      queueMicrotask(() => {
        currentView = structuredClone(view);
        editor.update(options());
      });
    }
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

const waitForRegistry = async labels => {
  const expected = labels.join('|');
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
  throw new Error(`Imperative matrix did not render registry ${expected}`);
};

const viewReceipt = view =>
  JSON.stringify({
    schemaVersion: view.schemaVersion,
    datasetId: view.datasetId,
    chartType: view.chartType,
    revision: view.revision,
    rootOrder: view.rootOrder,
    groups: view.groups,
    collapsedGroupIds: view.collapsedGroupIds,
    pinnedItemIds: view.pinnedItemIds,
    annotations: view.annotations,
    emphasis: view.emphasis,
  });

const waitForView = async (expected, phase) => {
  const expectedReceipt = viewReceipt(expected);
  const deadline = Date.now() + 5_000;
  let stableSamples = 0;
  while (Date.now() < deadline) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const current = editor.getView();
    stableSamples = viewReceipt(current) === expectedReceipt ? stableSamples + 1 : 0;
    if (stableSamples === 2) {
      return current;
    }
  }
  throw new Error(`Imperative matrix did not settle ${phase}: ${expectedReceipt}`);
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
  async exportComparisonSvg() {
    const result = await editor.exportImage({ format: 'svg', filename: 'comparison' });
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
  async beginComparisonScenario() {
    lastView = undefined;
    lastCommand = undefined;
    currentAppearance = { legend: true, animation: { enabled: false } };
    currentConfig = { type: 'column', data: comparisonData, height: 680 };
    currentView = structuredClone(comparisonView);
    currentDefaultView = structuredClone(comparisonView);
    viewMode = 'default';
    editor.update(options());
    await waitForRegistry(['Current', 'Plan']);
    await waitForView(comparisonView, 'comparison defaultView seed');
    const row = host.querySelector('[data-node-id="alpha"]');
    if (!(row instanceof HTMLElement)) {
      throw new Error('Imperative comparison row is unavailable');
    }
    row.dispatchEvent(
      new KeyboardEvent('keydown', { altKey: true, bubbles: true, key: 'ArrowDown' }),
    );
    await waitForRevision(1);
    const movedOrder = [...editor.getView().rootOrder];
    const undo = host.querySelector('button[aria-label="撤销"], button[aria-label="Undo"]');
    if (!(undo instanceof HTMLButtonElement) || undo.disabled) {
      throw new Error('Imperative comparison history is unavailable');
    }
    undo.click();
    await waitForRevision(2);
    const undoOrder = [...editor.getView().rootOrder];
    const beforeDefaultUpdate = editor.getView();
    currentDefaultView = {
      ...structuredClone(comparisonView),
      revision: 9,
      rootOrder: ['beta', 'alpha'],
    };
    editor.update(options());
    const afterDefaultUpdate = await waitForView(
      beforeDefaultUpdate,
      'defaultView-only update preserving the current view',
    );
    currentView = structuredClone(afterDefaultUpdate);
    currentDefaultView = undefined;
    viewMode = 'controlled';
    editor.update(options());
    const controlledView = await waitForView(afterDefaultUpdate, 'defaultView to controlled');
    currentView = {
      ...structuredClone(controlledView),
      annotations: { ...controlledView.annotations, alpha: 'Host controlled note' },
    };
    editor.update(options());
    const standaloneView = await waitForView(currentView, 'host-controlled annotation');
    viewMode = 'uncontrolled';
    editor.update(options());
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
    currentView = structuredClone(editor.getView());
    const reorderedSeries = [...comparisonData.series].reverse();
    currentConfig = {
      ...currentConfig,
      data: {
        ...comparisonData,
        series: reorderedSeries,
        items: comparisonData.items.map(item => ({ ...item, values: [...item.values].reverse() })),
      },
    };
    editor.update(options());
    await waitForRegistry(['Plan', 'Current']);
    host.querySelector('[data-node-id="alpha"]')?.click();
    await waitForRegistry(['Plan', 'Current']);
    return {
      registry: host.querySelector('[data-summary-kind="series-registry"]')?.textContent,
      inspectorOrder: Array.from(
        host.querySelectorAll('[data-inspector-values] [data-series-id]'),
      ).map(element => element.getAttribute('data-series-id')),
      view: editor.getView(),
    };
  },
  async expandComparisonRegistry() {
    currentConfig = {
      ...currentConfig,
      data: {
        ...currentConfig.data,
        series: [
          ...currentConfig.data.series,
          { id: 'forecast', label: 'Forecast' },
          { id: 'stretch', label: 'Stretch' },
        ],
        items: currentConfig.data.items.map(item => ({
          ...item,
          values: [
            ...item.values,
            { seriesId: 'forecast', amount: 9 },
            { seriesId: 'stretch', amount: 13 },
          ],
        })),
      },
    };
    editor.update(options());
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    host.querySelector('[data-node-id="alpha"]')?.click();
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    return {
      registry: host.querySelector('[data-summary-kind="series-registry"]')?.textContent,
      inspectorOrder: Array.from(
        host.querySelectorAll('[data-inspector-values] [data-series-id]'),
      ).map(element => element.getAttribute('data-series-id')),
      seriesCount: host.querySelectorAll('[data-series-id]').length,
      view: editor.getView(),
    };
  },
  async emptyComparison() {
    currentConfig = {
      ...currentConfig,
      data: { ...currentConfig.data, items: [] },
    };
    currentView = {
      ...structuredClone(editor.getView()),
      rootOrder: [],
      groups: {},
      collapsedGroupIds: [],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    };
    viewMode = 'controlled';
    editor.update(options());
    await waitForView(currentView, 'empty comparison');
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    return { view: editor.getView() };
  },
  unmount() {
    editor.destroy();
    host.dataset.unmounted = 'true';
  },
};
