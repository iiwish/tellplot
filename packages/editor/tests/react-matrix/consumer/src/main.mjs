import { createInitialViewSpec } from 'tellplot';
import { ChartEditor } from 'tellplot/react';
import 'tellplot/styles.css';
import React, { createRef } from 'react';
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
let comparisonConfig = { type: 'column', data: comparisonData, height: 680 };
let comparisonViewMode = 'controlled';
let hostView = initial.value;
let hostDefaultView;
function MatrixEditor({ appearance, comparison = false }) {
  const activeView = hostView;
  return React.createElement(ChartEditor, {
    ref: editorRef,
    config: comparison
      ? { ...comparisonConfig, data: structuredClone(comparisonConfig.data), appearance }
      : { ...baseConfig, data: structuredClone(data), appearance },
    ...(comparison && comparisonViewMode === 'default'
      ? { defaultView: hostDefaultView }
      : comparisonViewMode === 'controlled'
        ? { view: activeView }
        : {}),
    onViewChange(nextView) {
      lastView = nextView;
      if (comparison ? comparisonViewMode === 'controlled' : true) {
        hostView = structuredClone(nextView);
        renderEditor(appearance, comparison);
      }
    },
    onCommand(event) {
      lastCommand = event;
    },
  });
}
const renderEditor = (appearance, comparison = false) => {
  root.render(
    React.createElement(MatrixEditor, {
      appearance,
      comparison,
    }),
  );
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
  throw new Error(`React matrix did not render registry ${labels.join('|')}`);
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
    const current = editorRef.current?.getView();
    stableSamples =
      current !== undefined && viewReceipt(current) === expectedReceipt ? stableSamples + 1 : 0;
    if (stableSamples === 2) {
      return current;
    }
  }
  throw new Error(`React matrix did not settle ${phase}: ${expectedReceipt}`);
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
  async exportComparisonSvg() {
    const result = await editorRef.current?.exportImage({ format: 'svg', filename: 'comparison' });
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
  async beginComparisonScenario() {
    lastView = undefined;
    lastCommand = undefined;
    comparisonConfig = { type: 'column', data: comparisonData, height: 680 };
    comparisonViewMode = 'default';
    hostDefaultView = structuredClone(comparisonView);
    hostView = structuredClone(comparisonView);
    renderEditor({ legend: true, animation: { enabled: false } }, true);
    await waitForRegistry(['Current', 'Plan']);
    await waitForView(comparisonView, 'comparison defaultView seed');
    const row = host.querySelector('[data-node-id="alpha"]');
    if (!(row instanceof HTMLElement)) {
      throw new Error('React comparison row is unavailable');
    }
    row.dispatchEvent(
      new KeyboardEvent('keydown', { altKey: true, bubbles: true, key: 'ArrowDown' }),
    );
    await waitForRevision(1);
    const movedOrder = [...editorRef.current.getView().rootOrder];
    const undo = host.querySelector('button[aria-label="撤销"], button[aria-label="Undo"]');
    if (!(undo instanceof HTMLButtonElement) || undo.disabled) {
      throw new Error('React comparison history is unavailable');
    }
    undo.click();
    await waitForRevision(2);
    const undoOrder = [...editorRef.current.getView().rootOrder];
    const beforeDefaultUpdate = editorRef.current.getView();
    hostDefaultView = {
      ...structuredClone(comparisonView),
      revision: 9,
      rootOrder: ['beta', 'alpha'],
    };
    renderEditor({ legend: true, animation: { enabled: false } }, true);
    const afterDefaultUpdate = await waitForView(
      beforeDefaultUpdate,
      'defaultView-only update preserving the current view',
    );
    hostView = structuredClone(afterDefaultUpdate);
    hostDefaultView = undefined;
    comparisonViewMode = 'controlled';
    renderEditor({ legend: true, animation: { enabled: false } }, true);
    const controlledView = await waitForView(afterDefaultUpdate, 'defaultView to controlled');
    hostView = {
      ...structuredClone(controlledView),
      annotations: { ...controlledView.annotations, alpha: 'Host controlled note' },
    };
    renderEditor({ legend: true, animation: { enabled: false } }, true);
    const standaloneView = await waitForView(hostView, 'host-controlled annotation');
    comparisonViewMode = 'uncontrolled';
    renderEditor({ legend: true, animation: { enabled: false } }, true);
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
    comparisonConfig = {
      ...comparisonConfig,
      data: {
        ...comparisonData,
        series: [...comparisonData.series].reverse(),
        items: comparisonData.items.map(item => ({ ...item, values: [...item.values].reverse() })),
      },
    };
    renderEditor({ legend: true, animation: { enabled: false } }, true);
    await waitForRegistry(['Plan', 'Current']);
    host.querySelector('[data-node-id="alpha"]')?.click();
    await waitForRegistry(['Plan', 'Current']);
    return {
      registry: host.querySelector('[data-summary-kind="series-registry"]')?.textContent,
      inspectorOrder: Array.from(
        host.querySelectorAll('[data-inspector-values] [data-series-id]'),
      ).map(element => element.getAttribute('data-series-id')),
      view: editorRef.current.getView(),
    };
  },
  async expandComparisonRegistry() {
    comparisonConfig = {
      ...comparisonConfig,
      data: {
        ...comparisonConfig.data,
        series: [
          ...comparisonConfig.data.series,
          { id: 'forecast', label: 'Forecast' },
          { id: 'stretch', label: 'Stretch' },
        ],
        items: comparisonConfig.data.items.map(item => ({
          ...item,
          values: [
            ...item.values,
            { seriesId: 'forecast', amount: 9 },
            { seriesId: 'stretch', amount: 13 },
          ],
        })),
      },
    };
    renderEditor({ legend: true, animation: { enabled: false } }, true);
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    host.querySelector('[data-node-id="alpha"]')?.click();
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    return {
      registry: host.querySelector('[data-summary-kind="series-registry"]')?.textContent,
      inspectorOrder: Array.from(
        host.querySelectorAll('[data-inspector-values] [data-series-id]'),
      ).map(element => element.getAttribute('data-series-id')),
      seriesCount: host.querySelectorAll('[data-series-id]').length,
      view: editorRef.current.getView(),
    };
  },
  async emptyComparison() {
    comparisonConfig = {
      ...comparisonConfig,
      data: { ...comparisonConfig.data, items: [] },
    };
    hostView = {
      ...structuredClone(editorRef.current.getView()),
      rootOrder: [],
      groups: {},
      collapsedGroupIds: [],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    };
    comparisonViewMode = 'controlled';
    renderEditor({ legend: true, animation: { enabled: false } }, true);
    await waitForView(hostView, 'empty comparison');
    await waitForRegistry(['Plan', 'Current', 'Forecast', 'Stretch']);
    return { view: editorRef.current.getView() };
  },
  unmount() {
    root.unmount();
    host.dataset.unmounted = 'true';
  },
};
