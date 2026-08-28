import { fireEvent, getByRole, within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CategoricalComparisonChartConfig,
  CategoricalComparisonViewSpec,
  ChartConfig,
  ViewSpec,
} from '@tellplot/core';
import { createEditor, type EditorOptions } from '../../src/index';

const g2Mock = vi.hoisted(() => {
  class Chart {
    readonly options = vi.fn((): this => this);
    readonly render = vi.fn((): Promise<void> => Promise.resolve());
    readonly destroy = vi.fn((): void => undefined);
    readonly on = vi.fn((): this => this);
    readonly off = vi.fn((): this => this);
    readonly getContext = vi.fn(() => ({ animations: [], canvas: undefined }));

    constructor(options: { readonly container: HTMLElement }) {
      options.container.append(options.container.ownerDocument.createElement('canvas'));
    }
  }
  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));

const config = {
  type: 'column',
  locale: 'en-US',
  data: {
    schemaVersion: '3.0.0',
    dataKind: 'categorical',
    datasetId: 'comparison-workbench',
    currency: 'USD',
    series: [
      { id: 'actual', label: 'Actual' },
      { id: 'budget', label: 'Budget' },
    ],
    items: [
      {
        id: 'north',
        label: 'North',
        values: [
          { seriesId: 'actual', amount: 12 },
          { seriesId: 'budget', amount: 10 },
        ],
      },
      {
        id: 'south',
        label: 'South',
        values: [
          { seriesId: 'actual', amount: 8 },
          { seriesId: 'budget', amount: 11 },
        ],
      },
      {
        id: 'west',
        label: 'West',
        values: [
          { seriesId: 'actual', amount: -4 },
          { seriesId: 'budget', amount: 6 },
        ],
      },
    ],
  },
  appearance: {
    legend: false,
    animation: { enabled: false },
    numberFormat: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
} as const satisfies CategoricalComparisonChartConfig;

function view(collapsed: boolean): CategoricalComparisonViewSpec {
  return {
    schemaVersion: '3.0.0',
    datasetId: 'comparison-workbench',
    chartType: 'column',
    revision: 0,
    rootOrder: ['group', 'west'],
    groups: {
      group: { id: 'group', label: 'North and South', childIds: ['north', 'south'] },
    },
    collapsedGroupIds: collapsed ? ['group'] : [],
    pinnedItemIds: ['west'],
    annotations: { group: 'Regional note', west: 'West note' },
    emphasis: { group: 'muted', west: 'highlight' },
  };
}

const scalarConfig = {
  type: 'column',
  locale: 'en-US',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'comparison-workbench',
    currency: 'USD',
    items: [
      { id: 'north', label: 'North', amount: 12 },
      { id: 'south', label: 'South', amount: 8 },
      { id: 'west', label: 'West', amount: -4 },
    ],
  },
} as const satisfies ChartConfig;

function scalarView(grouped: boolean): ViewSpec {
  return {
    schemaVersion: '2.0.0',
    datasetId: 'comparison-workbench',
    chartType: 'column',
    revision: 0,
    rootOrder: grouped ? ['scalar-group', 'west'] : ['north', 'south', 'west'],
    groups: grouped
      ? {
          'scalar-group': {
            id: 'scalar-group',
            label: 'North and South',
            childIds: ['north', 'south'],
          },
        }
      : {},
    collapsedGroupIds: grouped ? ['scalar-group'] : [],
    pinnedItemIds: [],
    annotations: {},
    emphasis: {},
  };
}

let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function editorRoot(): HTMLElement {
  const root = host.querySelector<HTMLElement>('[data-tellplot="editor"]');
  if (root === null) {
    throw new Error('Editor root is unavailable.');
  }
  return root;
}

function mockEditorBounds(): void {
  const originalBounds = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset['tellplot'] === 'editor'
      ? ({
          x: 0,
          y: 0,
          top: 0,
          right: 1000,
          bottom: 680,
          left: 0,
          width: 1000,
          height: 680,
          toJSON: () => ({}),
        } as DOMRect)
      : originalBounds.call(this);
  });
}

function selectRow(nodeId: string): void {
  const row = editorRoot().querySelector<HTMLElement>(
    `[role="treeitem"][data-node-id="${nodeId}"]`,
  );
  if (row === null) {
    throw new Error(`Outline row ${nodeId} is unavailable.`);
  }
  fireEvent.click(row);
}

describe('comparison workbench contract', () => {
  it('renders one Outline node per category/group with a series count and no total', () => {
    const editor = createEditor(host, { config, view: view(true) });
    const tree = getByRole(editorRoot(), 'tree', { name: 'Structure outline' });
    const rows = within(tree).getAllByRole('treeitem');

    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.getAttribute('data-node-id'))).toEqual(['group', 'west']);
    expect(rows.map(row => row.querySelector('.tp-row-value')?.textContent)).toEqual([
      '2 series',
      '2 series',
    ]);
    expect(tree.querySelector('[data-series-id]')).toBeNull();
    expect(tree.textContent).not.toContain('$20.0');
    editor.destroy();
  });

  it('distinguishes category, collapsed group, expanded group, and multi-selection Inspector data', () => {
    const editor = createEditor(host, { config, view: view(false) });

    selectRow('west');
    let inspector = getByRole(editorRoot(), 'complementary', { name: 'Inspector' });
    expect(
      inspector.querySelector('[data-inspector-kind]')?.getAttribute('data-inspector-kind'),
    ).toBe('category');
    expect(
      Array.from(inspector.querySelectorAll('[data-series-id]')).map(row => [
        row.getAttribute('data-series-id'),
        row.textContent,
      ]),
    ).toEqual([
      ['actual', 'Actual-$4.0'],
      ['budget', 'Budget$6.0'],
    ]);
    expect(
      within(inspector).getByRole<HTMLTextAreaElement>('textbox', { name: 'Annotation' }).value,
    ).toBe('West note');
    expect(inspector.textContent).toContain('Highlighted');
    expect(inspector.textContent).toContain('Pinned');

    selectRow('group');
    inspector = getByRole(editorRoot(), 'complementary', { name: 'Inspector' });
    expect(
      inspector.querySelector('[data-inspector-kind]')?.getAttribute('data-inspector-kind'),
    ).toBe('expanded-group');
    expect(inspector.querySelector('[data-series-id]')).toBeNull();
    expect(inspector.textContent).toContain('Expanded');
    expect(inspector.textContent).toContain('2 source categories');
    expect(
      within(inspector).getByRole<HTMLTextAreaElement>('textbox', { name: 'Annotation' }).value,
    ).toBe('Regional note');
    expect(inspector.textContent).toContain('Muted');

    editor.update({ config, view: view(true) });
    selectRow('group');
    inspector = getByRole(editorRoot(), 'complementary', { name: 'Inspector' });
    expect(
      inspector.querySelector('[data-inspector-kind]')?.getAttribute('data-inspector-kind'),
    ).toBe('collapsed-group');
    expect(
      Array.from(inspector.querySelectorAll('[data-series-id]')).map(row => row.textContent),
    ).toEqual(['Actual$20.0', 'Budget$21.0']);
    expect(inspector.textContent).toContain('Collapsed');

    editor.update({
      config,
      view: { ...view(true), pinnedItemIds: ['north'] },
    });
    selectRow('group');
    inspector = getByRole(editorRoot(), 'complementary', { name: 'Inspector' });
    expect(inspector.textContent).not.toContain('Pinned');
    expect(inspector.textContent).toContain('Locked');

    editor.update({ config, view: view(false) });
    selectRow('north');
    const tree = getByRole(editorRoot(), 'tree', { name: 'Structure outline' });
    fireEvent.click(within(tree).getByRole('checkbox', { name: 'Select South' }));
    inspector = getByRole(editorRoot(), 'complementary', { name: 'Inspector' });
    expect(
      inspector.querySelector('[data-inspector-kind]')?.getAttribute('data-inspector-kind'),
    ).toBe('multi-selection');
    expect(inspector.textContent).toContain('2 selected nodes');
    expect(inspector.textContent).toContain('2 source categories');
    expect(inspector.querySelector('[data-series-id]')).toBeNull();
    expect(within(inspector).queryByRole('textbox', { name: 'Annotation' })).toBeNull();
    expect(inspector.textContent).not.toContain('NorthCurrent selection');
    editor.destroy();
  });

  it('announces the complete registry and narrative DFS for nonempty and empty comparison sources', () => {
    const editor = createEditor(host, { config, view: view(false) });
    let summary = getByRole(editorRoot(), 'region', { name: 'Chart summary' });

    expect(summary.querySelector('[data-summary-kind="intro"]')?.textContent).toContain(
      '3 visible clusters and 2 series',
    );
    expect(summary.querySelector('[data-summary-kind="series-registry"]')?.textContent).toBe(
      'Series registry: Actual, Budget.',
    );
    expect(
      Array.from(summary.querySelectorAll('[data-summary-node-id]')).map(node => [
        node.getAttribute('data-summary-node-id'),
        node.getAttribute('data-summary-node-kind'),
      ]),
    ).toEqual([
      ['group', 'expanded-group'],
      ['north', 'category'],
      ['south', 'category'],
      ['west', 'category'],
    ]);
    expect(summary.textContent).toContain('Actual, $12.0; Budget, $10.0');
    expect(summary.textContent).toContain('West note');
    expect(summary.textContent).toContain('highlighted');
    expect(summary.textContent).toContain('pinned');

    const emptyConfig = {
      ...config,
      data: { ...config.data, datasetId: 'comparison-empty', items: [] },
    } as const satisfies ChartConfig;
    editor.update({ config: emptyConfig });
    summary = getByRole(editorRoot(), 'region', { name: 'Chart summary' });
    expect(summary.querySelector('[data-summary-kind="intro"]')?.textContent).toContain(
      '0 visible clusters and 2 series',
    );
    expect(summary.querySelector('[data-summary-kind="series-registry"]')?.textContent).toBe(
      'Series registry: Actual, Budget.',
    );
    expect(summary.querySelectorAll('[data-summary-node-id]')).toHaveLength(0);
    editor.destroy();
  });

  it('falls back from a disabled or hidden focus key through Outline, toolbar, heading, and root', async () => {
    const originalBounds = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.dataset['tellplot'] === 'editor'
        ? ({
            x: 0,
            y: 0,
            top: 0,
            right: 1000,
            bottom: 680,
            left: 0,
            width: 1000,
            height: 680,
            toJSON: () => ({}),
          } as DOMRect)
        : originalBounds.call(this);
    });
    const editor = createEditor(host, { config, view: view(false) });
    selectRow('west');
    const inspector = getByRole(editorRoot(), 'complementary', { name: 'Inspector' });
    const textarea = within(inspector).getByRole<HTMLTextAreaElement>('textbox', {
      name: 'Annotation',
    });
    fireEvent.input(textarea, { target: { value: 'Changed note' } });
    const save = within(inspector).getByRole<HTMLButtonElement>('button', {
      name: 'Save annotation',
    });
    save.focus();

    editor.update({ config: { ...config, editor: { readOnly: true } }, view: view(false) });
    await Promise.resolve();
    expect(document.activeElement).toBe(
      getByRole(editorRoot(), 'tree', { name: 'Structure outline' }).querySelector(
        '[role="treeitem"]',
      ),
    );

    const row = getByRole(editorRoot(), 'tree', {
      name: 'Structure outline',
    }).querySelector<HTMLElement>('[role="treeitem"]');
    row?.focus();
    editor.update({
      config: {
        ...config,
        editor: { panels: { outline: false, inspector: true, toolbar: true } },
      },
      view: view(false),
    });
    await Promise.resolve();
    expect(document.activeElement?.closest('header')?.getAttribute('role')).toBe('toolbar');

    (document.activeElement as HTMLElement | null)?.focus();
    editor.update({
      config: {
        ...config,
        editor: { panels: { outline: false, inspector: false, toolbar: false } },
      },
      view: view(false),
    });
    await Promise.resolve();
    expect(document.activeElement).toBe(
      editorRoot().querySelector('[data-focus-key="chart-heading"]'),
    );
    editor.destroy();
  });

  it('skips CSS-hidden toolbar triggers when comparison panel updates require focus fallback', async () => {
    const originalBounds = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.dataset['tellplot'] === 'editor'
        ? ({
            x: 0,
            y: 0,
            top: 0,
            right: 1200,
            bottom: 680,
            left: 0,
            width: 1200,
            height: 680,
            toJSON: () => ({}),
          } as DOMRect)
        : originalBounds.call(this);
    });
    const editor = createEditor(host, { config, view: view(false) });
    const row = getByRole(editorRoot(), 'tree', { name: 'Structure outline' }).querySelector(
      '[role="treeitem"]',
    );
    expect(row).not.toBeNull();
    (row as HTMLElement).focus();

    editor.update({
      config: {
        ...config,
        editor: { panels: { outline: false, inspector: true, toolbar: true } },
      },
      view: view(false),
    });
    await Promise.resolve();

    expect(document.activeElement).toBe(
      editorRoot().querySelector('[data-focus-key="chart-heading"]'),
    );
    expect(document.activeElement).not.toBe(
      editorRoot().querySelector('[data-focus-key="toolbar-inspector"]'),
    );
    editor.destroy();
  });

  it('retains comparison focus across consecutive pure v3 presentation updates', async () => {
    mockEditorBounds();
    const editor = createEditor(host, { config, view: view(false) });
    const west = editorRoot().querySelector<HTMLElement>('[role="treeitem"][data-node-id="west"]');
    expect(west).not.toBeNull();
    west?.focus();

    editor.update({ config: { ...config, height: 700 }, view: view(false) });
    editor.update({ config: { ...config, height: 720 }, view: view(false) });
    await Promise.resolve();

    expect(document.activeElement).toBe(
      editorRoot().querySelector('[role="treeitem"][data-node-id="west"]'),
    );
    editor.destroy();
  });

  it('retains comparison focus across a v2 to v3 transition and v3 presentation update', async () => {
    mockEditorBounds();
    const editor = createEditor(host, { config: scalarConfig, view: scalarView(false) });
    const north = editorRoot().querySelector<HTMLElement>(
      '[role="treeitem"][data-node-id="north"]',
    );
    expect(north).not.toBeNull();
    north?.focus();

    editor.update({ config, view: view(false) });
    editor.update({ config: { ...config, height: 720 }, view: view(false) });
    await Promise.resolve();

    expect(document.activeElement).toBe(
      editorRoot().querySelector('[role="treeitem"][data-node-id="north"]'),
    );
    editor.destroy();
  });

  it('keeps comparison fallback pending across invalid state into a valid v2 update', async () => {
    mockEditorBounds();
    const editor = createEditor(host, { config, view: view(false) });
    const comparisonGroup = editorRoot().querySelector<HTMLElement>(
      '[role="treeitem"][data-node-id="group"]',
    );
    expect(comparisonGroup).not.toBeNull();
    comparisonGroup?.focus();

    const invalid = { ...config, appearance: { legend: 'yes' } } as unknown as ChartConfig;
    editor.update({ config: invalid });
    editor.update({ config: scalarConfig, view: scalarView(false) });
    await Promise.resolve();
    expect(document.activeElement).toBe(
      editorRoot().querySelector('[role="treeitem"][data-node-id="north"]'),
    );

    editor.destroy();
  });

  it('uses comparison fallback once when a v3 to v2 transition removes the focus key', async () => {
    mockEditorBounds();
    const editor = createEditor(host, { config, view: view(false) });
    const comparisonGroup = editorRoot().querySelector<HTMLElement>(
      '[role="treeitem"][data-node-id="group"]',
    );
    expect(comparisonGroup).not.toBeNull();
    comparisonGroup?.focus();

    editor.update({ config: scalarConfig, view: scalarView(false) });
    editor.update({ config: { ...scalarConfig, height: 720 }, view: scalarView(false) });
    await Promise.resolve();
    expect(document.activeElement).toBe(
      editorRoot().querySelector('[role="treeitem"][data-node-id="north"]'),
    );

    const scalarNorth = document.activeElement;
    expect(scalarNorth).toBeInstanceOf(HTMLElement);
    editor.update({ config: scalarConfig, view: scalarView(true) });
    await Promise.resolve();
    expect(document.activeElement).toBe(editorRoot());
    editor.destroy();
  });

  it.each([
    {
      name: 'pure v3 presentation',
      initial: { config, view: view(false) },
      focusNodeId: 'west',
      first: { config: { ...config, height: 700 }, view: view(false) },
      second: { config: { ...config, height: 720 }, view: view(false) },
    },
    {
      name: 'v2 to v3 transition',
      initial: { config: scalarConfig, view: scalarView(false) },
      focusNodeId: 'north',
      first: { config, view: view(false) },
      second: { config: { ...config, height: 720 }, view: view(false) },
    },
    {
      name: 'v3 through invalid to v2',
      initial: { config, view: view(false) },
      focusNodeId: 'group',
      first: {
        config: { ...config, appearance: { legend: 'yes' } } as unknown as ChartConfig,
      },
      second: { config: scalarConfig, view: scalarView(false) },
    },
  ] satisfies readonly {
    readonly name: string;
    readonly initial: EditorOptions;
    readonly focusNodeId: string;
    readonly first: EditorOptions;
    readonly second: EditorOptions;
  }[])('cancels the pending $name restore when the host explicitly takes focus', async scenario => {
    mockEditorBounds();
    const editor = createEditor(host, scenario.initial);
    const focused = editorRoot().querySelector<HTMLElement>(
      `[role="treeitem"][data-node-id="${scenario.focusNodeId}"]`,
    );
    expect(focused).not.toBeNull();
    focused?.focus();

    editor.update(scenario.first);
    const external = document.createElement('button');
    external.textContent = 'Host action';
    document.body.append(external);
    external.focus();
    editor.update(scenario.second);
    await Promise.resolve();

    expect(document.activeElement).toBe(external);
    editor.destroy();

    const queuedEditor = createEditor(host, scenario.initial);
    const queuedFocused = editorRoot().querySelector<HTMLElement>(
      `[role="treeitem"][data-node-id="${scenario.focusNodeId}"]`,
    );
    expect(queuedFocused).not.toBeNull();
    queuedFocused?.focus();

    queuedEditor.update(scenario.first);
    external.focus();
    await Promise.resolve();

    expect(document.activeElement).toBe(external);
    queuedEditor.destroy();
  });

  it('preserves legacy focus timing across consecutive steady v2 updates', async () => {
    mockEditorBounds();
    const editor = createEditor(host, { config: scalarConfig, view: scalarView(true) });
    const scalarGroup = editorRoot().querySelector<HTMLElement>(
      '[role="treeitem"][data-node-id="scalar-group"]',
    );
    expect(scalarGroup).not.toBeNull();
    scalarGroup?.focus();

    editor.update({ config: scalarConfig, view: scalarView(false) });
    editor.update({ config: { ...scalarConfig, height: 720 }, view: scalarView(false) });
    await Promise.resolve();

    expect(document.activeElement).toBe(document.body);
    editor.destroy();
  });

  it('keeps a pending comparison restore through hostile atomic rejection', async () => {
    mockEditorBounds();
    const editor = createEditor(host, { config, view: view(false) });
    const west = editorRoot().querySelector<HTMLElement>('[role="treeitem"][data-node-id="west"]');
    expect(west).not.toBeNull();
    west?.focus();

    editor.update({ config: { ...config, height: 700 }, view: view(false) });
    const hostileOptions = {
      config,
      get view(): CategoricalComparisonViewSpec {
        throw new Error('private hostile value');
      },
    } as EditorOptions;
    expect(() => editor.update(hostileOptions)).toThrowError(
      expect.objectContaining({ code: 'EDITOR_RENDER_FAILED' }),
    );
    editor.update({ config: { ...config, height: 720 }, view: view(false) });
    await Promise.resolve();

    expect(document.activeElement).toBe(
      editorRoot().querySelector('[role="treeitem"][data-node-id="west"]'),
    );
    editor.destroy();
  });

  it('applies the v3 presentation and controlled-mode update matrix without synthetic callbacks', async () => {
    const onCommand = vi.fn();
    const onViewChange = vi.fn();
    const onSelectionChange = vi.fn();
    const onConfigRejected = vi.fn();
    const initialView = { ...view(false), pinnedItemIds: [] };
    const editor = createEditor(host, {
      config,
      defaultView: initialView,
      onCommand,
      onViewChange,
      onSelectionChange,
      onConfigRejected,
    });
    selectRow('west');
    const focused = editorRoot().querySelector<HTMLElement>('[data-node-id="west"]');
    focused?.focus();
    const moved = editor.dispatch({
      schemaVersion: '1.0.0',
      id: 'comparison-presentation-history',
      type: 'moveItem',
      source: 'host',
      baseRevision: 0,
      payload: { itemId: 'west', target: { containerId: 'root', index: 0 } },
    });
    expect(moved?.ok).toBe(true);
    onCommand.mockClear();
    onViewChange.mockClear();
    onSelectionChange.mockClear();

    const presentationConfig = {
      ...config,
      locale: 'zh-CN',
      height: 720,
      appearance: {
        title: 'Comparison presentation',
        colors: { series: [{ seriesId: 'actual', color: '#123456' }] },
        legend: true,
        axes: { category: false, value: true },
        labels: { value: 'never', group: 'never' },
        tooltip: false,
        animation: { enabled: false, duration: 0 },
        groupRegion: { enabled: false, opacity: 0.1 },
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 2 },
      },
      editor: {
        panels: { outline: true, inspector: true, toolbar: true },
        outline: { placement: 'right' },
        inspector: { mode: 'tabs' },
      },
    } as const satisfies ChartConfig;
    const movedView = editor.getView();
    editor.update({
      config: presentationConfig,
      defaultView: view(true),
      onCommand,
      onViewChange,
      onSelectionChange,
      onConfigRejected,
    });
    await Promise.resolve();
    expect(editor.getView()).toEqual(movedView);
    expect(editorRoot().dataset['viewRevision']).toBe('1');
    expect(document.activeElement).toBe(
      editorRoot().querySelector('[data-focus-key="toolbar-outline"]'),
    );
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();

    const controlledView = { ...movedView, revision: 7, rootOrder: ['group', 'west'] };
    editor.update({
      config: presentationConfig,
      view: controlledView,
      onCommand,
      onViewChange,
      onSelectionChange,
      onConfigRejected,
    });
    expect(editor.getView()).toEqual(controlledView);
    expect(editorRoot().dataset['viewRevision']).toBe('7');
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();

    editor.update({
      config: presentationConfig,
      defaultView: view(true),
      onCommand,
      onViewChange,
      onSelectionChange,
      onConfigRejected,
    });
    expect(editor.getView()).toEqual(controlledView);
    expect(editor.undo()?.ok).toBe(false);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();

    editor.update({
      config: { ...presentationConfig, editor: { ...presentationConfig.editor, readOnly: true } },
      onCommand,
      onViewChange,
      onSelectionChange,
      onConfigRejected,
    });
    expect(editorRoot().dataset['readOnly']).toBe('true');
    expect(editor.getView()).toEqual(controlledView);
    editor.update({
      config: { ...presentationConfig, editor: { ...presentationConfig.editor, readOnly: false } },
      onCommand,
      onViewChange,
      onSelectionChange,
      onConfigRejected,
    });
    expect(editorRoot().dataset['readOnly']).toBe('false');
    expect(editor.getView()).toEqual(controlledView);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onConfigRejected).not.toHaveBeenCalled();
    editor.destroy();
  });

  it('distinguishes ordinary invalid v3 updates from hostile atomic rejection', async () => {
    const onConfigRejected = vi.fn();
    const onCommand = vi.fn();
    const onSelectionChange = vi.fn();
    const onViewChange = vi.fn();
    const editor = createEditor(host, {
      config,
      onConfigRejected,
      onCommand,
      onSelectionChange,
      onViewChange,
    });
    selectRow('west');
    const acceptedRow = editorRoot().querySelector<HTMLElement>('[data-node-id="west"]');
    expect(acceptedRow).not.toBeNull();
    acceptedRow?.focus();
    const acceptedView = editor.getView();
    onSelectionChange.mockClear();
    const hostileOptions = {
      config,
      get view(): CategoricalComparisonViewSpec {
        throw new Error('private hostile value');
      },
      onConfigRejected,
      onCommand,
      onSelectionChange,
      onViewChange,
    } as EditorOptions;

    expect(() => editor.update(hostileOptions)).toThrowError(
      expect.objectContaining({ code: 'EDITOR_RENDER_FAILED' }),
    );
    expect(editor.getView()).toEqual(acceptedView);
    expect(editorRoot().dataset['editorState']).toBe('ready');
    expect(document.activeElement).toBe(acceptedRow);
    expect(acceptedRow?.getAttribute('aria-selected')).toBe('true');
    expect(onConfigRejected).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewChange).not.toHaveBeenCalled();

    const invalid = { ...config, appearance: { legend: 'yes' } } as unknown as ChartConfig;
    editor.update({
      config: invalid,
      onConfigRejected,
      onCommand,
      onSelectionChange,
      onViewChange,
    });
    await Promise.resolve();
    expect(editorRoot().dataset['editorState']).toBe('invalid');
    expect(document.activeElement).toBe(editorRoot());
    expect(editorRoot().querySelector('[data-node-id="west"]')).toBeNull();
    expect(onConfigRejected).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onViewChange).not.toHaveBeenCalled();
    expect(() => editor.getView()).toThrowError(
      expect.objectContaining({ code: 'VIEW_UNAVAILABLE' }),
    );
    editor.destroy();
  });
});
