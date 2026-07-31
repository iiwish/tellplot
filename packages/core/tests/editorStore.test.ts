import { describe, expect, it, vi } from 'vitest';

import {
  createEditorStore,
  type ChartConfig,
  type EditorCommand,
  type EditorStoreOptions,
  type ViewSpec,
} from '../src/index';

const config: ChartConfig = {
  type: 'bar',
  data: {
    schemaVersion: '2.0.0',
    datasetId: 'store-fixture',
    dataKind: 'categorical',
    items: [
      { id: 'a', label: 'A', amount: 10 },
      { id: 'b', label: 'B', amount: 20 },
    ],
  },
};

function moveCommand(itemId: 'a' | 'b' = 'a', targetIndex = 1, baseRevision = 0): EditorCommand {
  return {
    schemaVersion: '1.0.0',
    id: `move-${itemId}-${targetIndex}-${baseRevision}`,
    type: 'moveItem',
    source: 'host',
    baseRevision,
    payload: { itemId, target: { containerId: 'root', index: targetIndex } },
  };
}

describe('createEditorStore', () => {
  it('owns an uncontrolled deterministic session and notifies subscribers', () => {
    const onViewChange = vi.fn();
    const store = createEditorStore({ config, onViewChange });
    const listener = vi.fn();
    store.subscribe(listener);

    const result = store.dispatch(moveCommand());

    expect(result?.ok).toBe(true);
    expect(store.getSnapshot().view?.rootOrder).toEqual(['b', 'a']);
    expect(onViewChange).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('avoids host command identifiers when generating default history actions', () => {
    const store = createEditorStore({ config });
    const result = store.dispatch({ ...moveCommand(), id: 'tellplot:undo:1' });

    expect(result?.ok).toBe(true);
    const undone = store.undo();

    expect(undone?.ok).toBe(true);
    expect(undone?.ok === true ? undone.event.commandId : undefined).toBe('tellplot:undo:2');
    expect(store.getSnapshot().view?.rootOrder).toEqual(['a', 'b']);
  });

  it('keeps a controlled view visible until the host updates it', () => {
    const uncontrolled = createEditorStore({ config });
    const view = uncontrolled.getSnapshot().view as ViewSpec;
    uncontrolled.destroy();
    const onViewChange = vi.fn();
    const store = createEditorStore({ config, view, onViewChange });

    const result = store.dispatch(moveCommand());

    expect(result?.ok).toBe(true);
    expect(store.getSnapshot().view?.rootOrder).toEqual(['a', 'b']);
    expect(onViewChange.mock.calls[0]?.[0].rootOrder).toEqual(['b', 'a']);

    store.update({ config, view: onViewChange.mock.calls[0]?.[0] as ViewSpec, onViewChange });
    expect(store.getSnapshot().view?.rootOrder).toEqual(['b', 'a']);
    expect(store.getSnapshot().canUndo).toBe(true);
  });

  it('accepts a structurally equal controlled candidate without losing history', () => {
    const uncontrolled = createEditorStore({ config });
    const view = uncontrolled.getSnapshot().view as ViewSpec;
    uncontrolled.destroy();
    const onViewChange = vi.fn();
    const store = createEditorStore({ config, view, onViewChange });

    expect(store.dispatch(moveCommand())?.ok).toBe(true);
    const candidate = structuredClone(onViewChange.mock.calls[0]?.[0] as ViewSpec);
    store.update({ config, view: candidate, onViewChange });

    expect(store.getSnapshot()).toMatchObject({
      status: 'ready',
      mode: 'controlled',
      canUndo: true,
    });
    expect(store.undo()?.ok).toBe(true);
  });

  it('retains controlled history when the host reorders set-like view fields', () => {
    const seed = createEditorStore({ config });
    const view = seed.getSnapshot().view as ViewSpec;
    seed.destroy();
    let candidate = view;
    const onViewChange = vi.fn((next: ViewSpec) => {
      candidate = next;
    });
    const store = createEditorStore({ config, view, onViewChange });

    expect(
      store.dispatch({
        schemaVersion: '1.0.0',
        id: 'pin-a',
        type: 'pinItem',
        source: 'host',
        baseRevision: 0,
        payload: { itemId: 'a' },
      })?.ok,
    ).toBe(true);
    store.update({ config, view: candidate, onViewChange });
    expect(
      store.dispatch({
        schemaVersion: '1.0.0',
        id: 'pin-b',
        type: 'pinItem',
        source: 'host',
        baseRevision: 1,
        payload: { itemId: 'b' },
      })?.ok,
    ).toBe(true);

    store.update({
      config,
      view: { ...candidate, pinnedItemIds: [...candidate.pinnedItemIds].reverse() },
      onViewChange,
    });

    expect(store.getSnapshot().canUndo).toBe(true);
    const undone = store.undo();
    expect(undone?.ok).toBe(true);
    expect(undone?.ok === true ? undone.viewSpec.pinnedItemIds : []).toEqual(['a']);
  });

  it('preserves a compatible uncontrolled view and history for equivalent cloned data', () => {
    const store = createEditorStore({ config });
    expect(store.dispatch(moveCommand())?.ok).toBe(true);

    store.update({ config: structuredClone(config) });

    expect(store.getSnapshot().view?.rootOrder).toEqual(['b', 'a']);
    expect(store.getSnapshot().canUndo).toBe(true);
  });

  it('treats defaultView as an initial value when config changes to another dataset', () => {
    const seed = createEditorStore({ config });
    const defaultView = seed.getSnapshot().view as ViewSpec;
    seed.destroy();
    const onConfigRejected = vi.fn();
    const nextConfig: ChartConfig = {
      type: 'bar',
      data: {
        schemaVersion: '2.0.0',
        datasetId: 'replacement-fixture',
        dataKind: 'categorical',
        items: [{ id: 'replacement', label: 'Replacement', amount: 30 }],
      },
    };
    const store = createEditorStore({ config, defaultView, onConfigRejected });

    store.update({ config: nextConfig, defaultView, onConfigRejected });

    expect(store.getSnapshot()).toMatchObject({ status: 'ready', mode: 'uncontrolled' });
    expect(store.getSnapshot().view).toMatchObject({
      datasetId: 'replacement-fixture',
      rootOrder: ['replacement'],
    });
    expect(onConfigRejected).not.toHaveBeenCalled();
  });

  it('retains a compatible view but resets history when source content changes', () => {
    const store = createEditorStore({ config });
    expect(store.dispatch(moveCommand())?.ok).toBe(true);

    store.update({
      config: {
        ...config,
        data: {
          ...config.data,
          items: config.data.items.map(item =>
            item.id === 'a' ? { ...item, amount: item.amount + 5 } : item,
          ),
        },
      },
    });

    expect(store.getSnapshot().view?.rootOrder).toEqual(['b', 'a']);
    expect(store.getSnapshot().canUndo).toBe(false);
  });

  it('reports invalid controlled views without throwing or exposing an empty diagnostic', () => {
    const onConfigRejected = vi.fn();
    const store = createEditorStore({ config });
    const invalidOptions = { config, view: null, onConfigRejected } as unknown as Parameters<
      typeof store.update
    >[0];

    expect(() => store.update(invalidOptions)).not.toThrow();
    expect(store.getSnapshot()).toMatchObject({ status: 'invalid', issues: [expect.any(Object)] });
    expect(store.getSnapshot().issues[0]).toMatchObject({
      code: 'INVALID_VIEW_SPEC',
      path: '/',
    });
    expect(onConfigRejected).toHaveBeenCalledWith(store.getSnapshot().issues);
  });

  it('reports dataset and exact chart-type conflicts through the rejection callback', () => {
    const seed = createEditorStore({ config });
    const view = seed.getSnapshot().view as ViewSpec;
    seed.destroy();
    const onConfigRejected = vi.fn();
    const store = createEditorStore({ config });

    store.update({ config, view: { ...view, datasetId: 'another-dataset' }, onConfigRejected });
    expect(store.getSnapshot().issues[0]).toMatchObject({
      code: 'SOURCE_CONFLICT',
      reason: 'DATASET_ID_MISMATCH',
      path: '/datasetId',
    });
    expect(onConfigRejected).toHaveBeenLastCalledWith(store.getSnapshot().issues);

    const columnView = { ...view, chartType: 'column' } as ViewSpec;
    store.update({ config, view: columnView, onConfigRejected });
    expect(store.getSnapshot().issues[0]).toMatchObject({
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_CHART_TYPE',
      path: '/chartType',
    });
    expect(onConfigRejected).toHaveBeenCalledTimes(2);
  });

  it('reports invalid initial options through the rejection callback', () => {
    const onConfigRejected = vi.fn();
    const options = { config, view: null, onConfigRejected } as unknown as Parameters<
      typeof createEditorStore
    >[0];

    const store = createEditorStore(options);

    expect(store.getSnapshot().status).toBe('invalid');
    expect(onConfigRejected).toHaveBeenCalledWith(store.getSnapshot().issues);
  });

  it('reports mutually exclusive controlled and default views', () => {
    const seed = createEditorStore({ config });
    const view = seed.getSnapshot().view as ViewSpec;
    seed.destroy();
    const onConfigRejected = vi.fn();
    const store = createEditorStore({ config });

    store.update({ config, view, defaultView: structuredClone(view), onConfigRejected });

    expect(store.getSnapshot().issues).toEqual([
      expect.objectContaining({
        code: 'INVALID_CHART_CONFIG',
        path: '/view',
        details: { configuration: 'mutually-exclusive-view-props' },
      }),
    ]);
    expect(onConfigRejected).toHaveBeenCalledWith(store.getSnapshot().issues);
  });

  it('executes each controlled command from the latest host-accepted view', () => {
    const uncontrolled = createEditorStore({ config });
    const view = uncontrolled.getSnapshot().view as ViewSpec;
    uncontrolled.destroy();
    const onViewChange = vi.fn();
    const onCommandRejected = vi.fn();
    const store = createEditorStore({ config, view, onViewChange, onCommandRejected });

    const first = store.dispatch(moveCommand());
    expect(first?.ok).toBe(true);
    expect(store.getSnapshot().view).toEqual(view);

    const second = store.dispatch(moveCommand('b', 0, view.revision));
    expect(second?.ok).toBe(true);
    expect(onCommandRejected).not.toHaveBeenCalled();
    expect(onViewChange.mock.calls[1]?.[0].revision).toBe(1);
    expect(onViewChange.mock.calls[1]?.[0].rootOrder).toEqual(['b', 'a']);
  });

  it('rejects a duplicate controlled command before the host accepts its candidate', () => {
    const seed = createEditorStore({ config });
    const view = seed.getSnapshot().view as ViewSpec;
    seed.destroy();
    const onCommand = vi.fn();
    const onViewChange = vi.fn();
    const onCommandRejected = vi.fn();
    const store = createEditorStore({
      config,
      view,
      onCommand,
      onViewChange,
      onCommandRejected,
    });
    const command = { ...moveCommand(), id: 'controlled-once' };

    expect(store.dispatch(command)?.ok).toBe(true);
    const duplicate = store.dispatch(command);

    expect(duplicate).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_COMMAND_ID', commandId: 'controlled-once' },
    });
    expect(onCommand).toHaveBeenCalledOnce();
    expect(onViewChange).toHaveBeenCalledOnce();
    expect(onCommandRejected).toHaveBeenCalledOnce();
  });

  it('rejects duplicate controlled undo and redo actions before host acceptance', () => {
    const seed = createEditorStore({ config });
    const view = seed.getSnapshot().view as ViewSpec;
    seed.destroy();
    let candidate = view;
    const onViewChange = vi.fn((next: ViewSpec) => {
      candidate = next;
    });
    const onCommandRejected = vi.fn();
    const store = createEditorStore({ config, view, onViewChange, onCommandRejected });

    expect(store.dispatch(moveCommand())?.ok).toBe(true);
    store.update({ config, view: candidate, onViewChange, onCommandRejected });
    const undoAction = { id: 'controlled-undo', source: 'host' as const, baseRevision: 1 };
    expect(store.undo(undoAction)?.ok).toBe(true);
    expect(store.undo(undoAction)).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_COMMAND_ID', commandId: 'controlled-undo' },
    });

    store.update({ config, view: candidate, onViewChange, onCommandRejected });
    const redoAction = { id: 'controlled-redo', source: 'host' as const, baseRevision: 2 };
    expect(store.redo(redoAction)?.ok).toBe(true);
    expect(store.redo(redoAction)).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_COMMAND_ID', commandId: 'controlled-redo' },
    });
    expect(onCommandRejected).toHaveBeenCalledTimes(2);
  });

  it('avoids pending controlled identifiers for generated history actions', () => {
    const seed = createEditorStore({ config });
    const view = seed.getSnapshot().view as ViewSpec;
    seed.destroy();
    let candidate = view;
    const onViewChange = vi.fn((next: ViewSpec) => {
      candidate = next;
    });
    const store = createEditorStore({ config, view, onViewChange });

    expect(store.dispatch(moveCommand())?.ok).toBe(true);
    store.update({ config, view: candidate, onViewChange });
    expect(
      store.dispatch({
        schemaVersion: '1.0.0',
        id: 'tellplot:undo:1',
        type: 'pinItem',
        source: 'host',
        baseRevision: 1,
        payload: { itemId: 'a' },
      })?.ok,
    ).toBe(true);

    const undone = store.undo();

    expect(undone?.ok).toBe(true);
    expect(undone?.ok === true ? undone.event.commandId : undefined).toBe('tellplot:undo:2');
  });

  it('discards an unaccepted controlled candidate when the host repeats its view', () => {
    const uncontrolled = createEditorStore({ config });
    const view = uncontrolled.getSnapshot().view as ViewSpec;
    uncontrolled.destroy();
    const onViewChange = vi.fn();
    const store = createEditorStore({ config, view, onViewChange });

    expect(store.dispatch(moveCommand())?.ok).toBe(true);
    store.update({ config, view, onViewChange });

    const next = store.dispatch(moveCommand('b', 0, view.revision));
    expect(next?.ok).toBe(true);
    expect(next?.ok === true ? next.viewSpec.revision : -1).toBe(1);
  });

  it('publishes selection created by a controlled command only after host acceptance', () => {
    const seed = createEditorStore({ config });
    const view = seed.getSnapshot().view as ViewSpec;
    seed.destroy();
    const onViewChange = vi.fn();
    const onSelectionChange = vi.fn();
    const store = createEditorStore({ config, view, onViewChange, onSelectionChange });

    const result = store.dispatch({
      schemaVersion: '1.0.0',
      id: 'create-controlled-group',
      type: 'createGroup',
      source: 'host',
      baseRevision: view.revision,
      payload: {
        groupId: 'group-ab',
        label: 'AB',
        nodeIds: ['a', 'b'],
        initiallyCollapsed: false,
      },
    });
    expect(result?.ok).toBe(true);

    store.select({ nodeId: 'group-ab', nodeIds: ['group-ab'], sourceIds: ['a', 'b'] });

    expect(store.getSnapshot().selection).toBeNull();
    expect(onSelectionChange).not.toHaveBeenCalled();

    const acceptedView = onViewChange.mock.calls[0]?.[0] as ViewSpec;
    store.update({ config, view: acceptedView, onViewChange, onSelectionChange });

    expect(store.getSnapshot().selection).toEqual({
      nodeId: 'group-ab',
      nodeIds: ['group-ab'],
      sourceIds: ['a', 'b'],
    });
    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onSelectionChange).toHaveBeenCalledWith({
      nodeId: 'group-ab',
      nodeIds: ['group-ab'],
      sourceIds: ['a', 'b'],
    });
  });

  it('persists selection reconciliation and notifies the host exactly once', () => {
    const onSelectionChange = vi.fn();
    const store = createEditorStore({ config, onSelectionChange });
    store.select({ nodeId: 'a', nodeIds: ['a'], sourceIds: ['a'] });
    const withoutSelectedItem: ChartConfig = {
      ...config,
      data: {
        ...config.data,
        items: config.data.items.filter(item => item.id !== 'a'),
      },
    };

    store.update({ config: withoutSelectedItem, onSelectionChange });

    expect(store.getSnapshot().selection).toBeNull();
    expect(onSelectionChange).toHaveBeenNthCalledWith(2, null);

    store.update({ config, onSelectionChange });

    expect(store.getSnapshot().selection).toBeNull();
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
  });

  it('owns canonical config and view values after receiving mutable host inputs', () => {
    const mutableConfig = structuredClone(config) as {
      type: 'bar';
      data: {
        schemaVersion: '2.0.0';
        datasetId: string;
        dataKind: 'categorical';
        items: { id: string; label: string; amount: number }[];
      };
    };
    const seed = createEditorStore({ config });
    const mutableView = structuredClone(seed.getSnapshot().view as ViewSpec) as ViewSpec;
    seed.destroy();
    const store = createEditorStore({ config: mutableConfig, view: mutableView });

    const firstItem = mutableConfig.data.items[0];
    if (firstItem === undefined) {
      throw new Error('Expected fixture item');
    }
    firstItem.label = 'Mutated host label';
    (mutableView.rootOrder as string[]).reverse();

    expect(store.getSnapshot().config?.data.items[0]?.label).toBe('A');
    expect(store.getSnapshot().view?.rootOrder).toEqual(['a', 'b']);
  });

  it('preserves reserved object-property names as inert data in detached snapshots', () => {
    const configWithReservedMetadata = JSON.parse(`{
      "type": "bar",
      "data": {
        "schemaVersion": "2.0.0",
        "datasetId": "reserved-property-fixture",
        "dataKind": "categorical",
        "items": [
          { "id": "a", "label": "A", "amount": 10, "metadata": { "__proto__": "kept" } },
          { "id": "b", "label": "B", "amount": 20 }
        ]
      }
    }`) as ChartConfig;
    const viewWithReservedGroup = JSON.parse(`{
      "schemaVersion": "2.0.0",
      "datasetId": "reserved-property-fixture",
      "chartType": "bar",
      "revision": 0,
      "rootOrder": ["__proto__"],
      "groups": {
        "__proto__": { "id": "__proto__", "label": "Reserved", "childIds": ["a", "b"] }
      },
      "collapsedGroupIds": [],
      "pinnedItemIds": [],
      "annotations": {},
      "emphasis": {}
    }`) as ViewSpec;

    const store = createEditorStore({
      config: configWithReservedMetadata,
      view: viewWithReservedGroup,
    });
    const snapshot = store.getSnapshot();
    const metadata = snapshot.config?.data.items[0]?.metadata;

    expect(snapshot.status).toBe('ready');
    expect(Object.getOwnPropertyDescriptor(metadata, '__proto__')?.value).toBe('kept');
    expect(
      Object.getOwnPropertyDescriptor(snapshot.view?.groups, '__proto__')?.value,
    ).toMatchObject({
      id: '__proto__',
      childIds: ['a', 'b'],
    });
    expect(Object.getPrototypeOf(snapshot.view?.groups)).toBe(Object.prototype);
  });

  it('returns cached deeply frozen snapshots and command results', () => {
    const store = createEditorStore({ config });
    const firstSnapshot = store.getSnapshot();

    expect(store.getSnapshot()).toBe(firstSnapshot);
    expect(Object.isFrozen(firstSnapshot)).toBe(true);
    expect(Object.isFrozen(firstSnapshot.config?.data.items)).toBe(true);
    expect(Object.isFrozen(firstSnapshot.view?.rootOrder)).toBe(true);
    expect(() => (firstSnapshot.view?.rootOrder as string[]).reverse()).toThrow();

    const result = store.dispatch(moveCommand());
    expect(result?.ok).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.session)).toBe(true);
    expect(Object.isFrozen(result?.ok === true ? result.viewSpec.rootOrder : undefined)).toBe(true);
    expect(() => {
      if (result?.ok === true) {
        (result.viewSpec.rootOrder as string[]).reverse();
      }
    }).toThrow();
    expect(store.getSnapshot().view?.rootOrder).toEqual(['b', 'a']);
  });

  it('publishes deeply frozen callback values that cannot pollute later callbacks or state', () => {
    const callbackChecks: boolean[] = [];
    const onCommand = vi.fn((event: { readonly commandId: string }) => {
      callbackChecks.push(Object.isFrozen(event));
      expect(() =>
        Object.defineProperty(event, 'commandId', { value: 'mutated', configurable: true }),
      ).toThrow();
    });
    const onViewChange = vi.fn((view: ViewSpec, event: { readonly commandId: string }) => {
      callbackChecks.push(
        Object.isFrozen(view),
        Object.isFrozen(view.rootOrder),
        Object.isFrozen(event),
      );
      expect(event.commandId).toBe('move-a-1-0');
    });
    const onCommandRejected = vi.fn(
      (error: { readonly details: Readonly<Record<string, unknown>> }) => {
        callbackChecks.push(Object.isFrozen(error), Object.isFrozen(error.details));
      },
    );
    const onConfigRejected = vi.fn((issues: readonly { readonly details: object }[]) => {
      callbackChecks.push(Object.isFrozen(issues), Object.isFrozen(issues[0]?.details));
    });
    const onSelectionChange = vi.fn((selection: { readonly nodeIds: readonly string[] } | null) => {
      callbackChecks.push(Object.isFrozen(selection), Object.isFrozen(selection?.nodeIds));
    });
    const store = createEditorStore({
      config,
      onCommand,
      onViewChange,
      onCommandRejected,
      onConfigRejected,
      onSelectionChange,
    });

    expect(store.dispatch(moveCommand())?.ok).toBe(true);
    expect(store.dispatch(moveCommand())?.ok).toBe(false);
    store.select({ nodeId: 'a', nodeIds: ['a'], sourceIds: ['a'] });
    store.update({
      config: null as unknown as ChartConfig,
      onCommand,
      onViewChange,
      onCommandRejected,
      onConfigRejected,
      onSelectionChange,
    });

    expect(callbackChecks.every(Boolean)).toBe(true);
    expect(store.getSnapshot().status).toBe('invalid');
  });

  it('rejects accessor-based initial options without evaluating or leaking the accessor', () => {
    const onConfigRejected = vi.fn();
    const hostileOptions = {
      get config(): ChartConfig {
        throw new Error('private initial option text');
      },
      onConfigRejected,
    };

    let store: ReturnType<typeof createEditorStore> | undefined;
    expect(() => {
      store = createEditorStore(hostileOptions);
    }).not.toThrow();

    expect(store?.getSnapshot()).toMatchObject({
      status: 'invalid',
      issues: [{ code: 'INVALID_CHART_CONFIG', reason: 'NON_PLAIN_DATA', path: '/config' }],
    });
    expect(onConfigRejected).toHaveBeenCalledOnce();
    expect(JSON.stringify(onConfigRejected.mock.calls)).not.toContain(
      'private initial option text',
    );
  });

  it('rejects hostile update options atomically without replacing state or callbacks', () => {
    const existingRejection = vi.fn();
    const hostileRejection = vi.fn();
    const store = createEditorStore({ config, onConfigRejected: existingRejection });
    const before = store.getSnapshot();
    const hostileOptions = {
      config,
      get view(): ViewSpec {
        throw new Error('private update option text');
      },
      onConfigRejected: hostileRejection,
    } as EditorStoreOptions;

    expect(() => store.update(hostileOptions)).not.toThrow();

    expect(store.getSnapshot()).toBe(before);
    expect(store.getSnapshot().status).toBe('ready');
    expect(existingRejection).toHaveBeenCalledOnce();
    expect(hostileRejection).not.toHaveBeenCalled();
    expect(JSON.stringify(existingRejection.mock.calls)).not.toContain(
      'private update option text',
    );

    store.update({ config, onConfigRejected: existingRejection });
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', mode: 'uncontrolled' });
  });

  it('releases subscribers and rejects mutations after destroy', () => {
    const store = createEditorStore({ config });
    const listener = vi.fn();
    store.subscribe(listener);

    store.destroy();

    expect(store.getSnapshot().status).toBe('destroyed');
    expect(store.dispatch(moveCommand())).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
