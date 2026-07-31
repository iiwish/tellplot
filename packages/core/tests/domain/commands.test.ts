import { describe, expect, it } from 'vitest';

import {
  createEditorSession,
  executeCommand,
  type CollapseGroupCommand,
  type CommandError,
  type CommandResult,
  type CreateGroupCommand,
  type EditorSession,
  type EditorSessionOptions,
  type ExpandGroupCommand,
  type MoveItemCommand,
  type PinItemCommand,
  type SetAnnotationCommand,
  type SourceData,
  type UngroupCommand,
  type UnpinItemCommand,
  type ValidationResult,
} from '../../src';
import { commandSourceData } from '../fixtures/commandSourceData';
import { anchorsOnlySourceData, financialSourceData } from '../fixtures/financialSourceData';

function sessionFrom(
  sourceData: SourceData = commandSourceData,
  options?: Parameters<typeof createEditorSession>[1],
): EditorSession {
  const result = createEditorSession(sourceData, options);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected a valid editor session');
  }
  return result.value;
}

function expectSuccess(result: CommandResult): EditorSession {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Expected command success, received ${result.error.code}`);
  }
  expect(result.viewSpec).toBe(result.session.viewSpec);
  return result.session;
}

function expectFailure(result: CommandResult, code: CommandError['code']): CommandError {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected command failure');
  }
  expect(result.error.code).toBe(code);
  return result.error;
}

function move(
  id: string,
  baseRevision: number,
  itemId: string,
  containerId: string,
  index: number,
): MoveItemCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'moveItem',
    source: 'outline',
    baseRevision,
    payload: { itemId, target: { containerId, index } },
  };
}

function group(
  id: string,
  baseRevision: number,
  groupId = 'group-1',
  itemIds: readonly string[] = ['a', 'b'],
  label = 'Drivers',
): CreateGroupCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'createGroup',
    source: 'direct',
    baseRevision,
    payload: { groupId, label, nodeIds: itemIds, initiallyCollapsed: false },
  };
}

function ungroup(id: string, baseRevision: number, groupId = 'group-1'): UngroupCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'ungroup',
    source: 'direct',
    baseRevision,
    payload: { groupId },
  };
}

function collapse(id: string, baseRevision: number, groupId = 'group-1'): CollapseGroupCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'collapseGroup',
    source: 'keyboard',
    baseRevision,
    payload: { groupId },
  };
}

function expand(id: string, baseRevision: number, groupId = 'group-1'): ExpandGroupCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'expandGroup',
    source: 'keyboard',
    baseRevision,
    payload: { groupId },
  };
}

function pin(id: string, baseRevision: number, itemId: string): PinItemCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'pinItem',
    source: 'host',
    baseRevision,
    payload: { itemId },
  };
}

function unpin(id: string, baseRevision: number, itemId: string): UnpinItemCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'unpinItem',
    source: 'host',
    baseRevision,
    payload: { itemId },
  };
}

function annotate(
  id: string,
  baseRevision: number,
  nodeId: string,
  text: string | null,
): SetAnnotationCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'setAnnotation',
    source: 'host',
    baseRevision,
    payload: { nodeId, text },
  };
}

describe('createEditorSession', () => {
  it('preserves source identity and creates a deterministic privacy-safe fingerprint', () => {
    const first = sessionFrom();
    const second = sessionFrom(structuredClone(commandSourceData));

    expect(first.sourceData).toBe(commandSourceData);
    expect(first.sourceFingerprint).toMatch(/^fnv1a64:[0-9a-f]{16}$/);
    expect(second.sourceFingerprint).toBe(first.sourceFingerprint);
    expect(first).toMatchObject({ historyLimit: 100, undoStack: [], redoStack: [] });
    expect(first.processedActionIds).toEqual([]);
    expect(JSON.stringify(first.sourceFingerprint)).not.toContain('Alpha confidential');
  });

  it('fingerprints valid sources with and without optional source fields', () => {
    const minimal = sessionFrom(anchorsOnlySourceData);
    const detailed = sessionFrom(financialSourceData);

    expect(minimal.sourceFingerprint).toMatch(/^fnv1a64:[0-9a-f]{16}$/);
    expect(detailed.sourceFingerprint).toMatch(/^fnv1a64:[0-9a-f]{16}$/);
    expect(detailed.sourceFingerprint).not.toBe(minimal.sourceFingerprint);
  });

  it('canonicalizes metadata by code-unit key order rather than insertion order', () => {
    const firstSource: SourceData = {
      ...financialSourceData,
      items: financialSourceData.items.map((item, index) =>
        index === 0
          ? { ...item, metadata: { z: 1, '\u00e4': 2, '\u4e2d': 4, '\ud83d\ude00': 5, a: 3 } }
          : item,
      ),
    };
    const secondSource: SourceData = {
      ...financialSourceData,
      items: financialSourceData.items.map((item, index) =>
        index === 0
          ? { ...item, metadata: { a: 3, '\ud83d\ude00': 5, '\u4e2d': 4, '\u00e4': 2, z: 1 } }
          : item,
      ),
    };

    expect(sessionFrom(firstSource).sourceFingerprint).toBe(
      sessionFrom(secondSource).sourceFingerprint,
    );
  });

  it('accepts a caller view and a zero history limit', () => {
    const initial = sessionFrom();
    const result = createEditorSession(commandSourceData, {
      viewSpec: initial.viewSpec,
      historyLimit: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.viewSpec).toBe(initial.viewSpec);
      expect(result.value.historyLimit).toBe(0);
    }

    const nullPrototypeOptions = Object.assign(
      Object.create(null) as EditorSessionOptions,
      { historyLimit: 0 } as const,
    );
    expect(createEditorSession(commandSourceData, nullPrototypeOptions).ok).toBe(true);
  });

  it.each([[-1], [1.5], [Number.NaN], [Number.MAX_SAFE_INTEGER + 1]])(
    'rejects invalid historyLimit %s without throwing',
    historyLimit => {
      const result: ValidationResult<EditorSession> = createEditorSession(commandSourceData, {
        historyLimit,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toMatchObject({
          code: 'INVALID_SESSION_OPTIONS',
          reason: 'INVALID_HISTORY_LIMIT',
          path: '/historyLimit',
        });
      }
    },
  );

  it('rejects an invalid supplied view through the existing validator', () => {
    const valid = sessionFrom();
    const result = createEditorSession(commandSourceData, {
      viewSpec: { ...valid.viewSpec, rootOrder: ['a'] },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(issue => issue.code === 'SOURCE_CONFLICT')).toBe(true);
    }
  });

  it('rejects unsafe option objects without invoking accessors or exposing proxy failures', () => {
    let getterCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, 'historyLimit', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('private option getter');
      },
    });
    const proxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('private option proxy');
        },
      },
    );
    const withSymbol = { [Symbol('private')]: true };

    for (const options of [new Date(0), accessor, proxy, withSymbol, { unknown: true }]) {
      const result = createEditorSession(commandSourceData, options as EditorSessionOptions);
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result)).not.toContain('private option');
    }
    expect(getterCalls).toBe(0);
  });

  it('treats prototype-like source and group IDs as ordinary own record keys', () => {
    const source: SourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'prototype-like-ids',
      items: [
        { id: 'start', label: 'Start', amount: 0, kind: 'start' },
        { id: 'constructor', label: 'Constructor', amount: 1, kind: 'contribution' },
        { id: 'toString', label: 'To string', amount: 2, kind: 'contribution' },
        { id: 'end', label: 'End', amount: 3, kind: 'end' },
      ],
    };
    const start = sessionFrom(source);
    const annotationNoOp = expectSuccess(
      executeCommand(start, annotate('prototype-note', 0, 'toString', null)),
    );
    const grouped = expectSuccess(
      executeCommand(
        annotationNoOp,
        group('prototype-group', 0, '__proto__', ['constructor', 'toString']),
      ),
    );

    expect(annotationNoOp.viewSpec).toBe(start.viewSpec);
    expect(Object.hasOwn(grouped.viewSpec.groups, '__proto__')).toBe(true);
    expect(grouped.viewSpec.groups['__proto__']?.childIds).toEqual(['constructor', 'toString']);
    const restored = expectSuccess(
      executeCommand(grouped, ungroup('prototype-ungroup', 1, '__proto__')),
    );
    expect(restored.viewSpec.rootOrder).toEqual(['constructor', 'toString']);
  });
});

describe('moveItem', () => {
  it('reorders root items using the target index after removal', () => {
    const start = sessionFrom();
    const result = executeCommand(start, move('move-1', 0, 'c', 'root', 0));
    const next = expectSuccess(result);

    expect(next.viewSpec.rootOrder).toEqual(['c', 'a', 'b', 'd', 'e']);
    expect(next.viewSpec.revision).toBe(1);
    if (result.ok) {
      expect(result.event).toEqual({
        commandId: 'move-1',
        type: 'moveItem',
        source: 'outline',
        previousRevision: 0,
        nextRevision: 1,
        affectedNodeIds: ['c'],
        noOp: false,
      });
    }
    expect(next.sourceData).toBe(start.sourceData);
  });

  it('moves items within, into and out of a group without mutating prior sessions', () => {
    const start = sessionFrom();
    const grouped = expectSuccess(executeCommand(start, group('group', 0)));
    const into = expectSuccess(executeCommand(grouped, move('into', 1, 'c', 'group-1', 2)));
    const within = expectSuccess(executeCommand(into, move('within', 2, 'c', 'group-1', 0)));
    const out = expectSuccess(executeCommand(within, move('out', 3, 'b', 'root', 1)));

    expect(grouped.viewSpec.groups['group-1']?.childIds).toEqual(['a', 'b']);
    expect(into.viewSpec.groups['group-1']?.childIds).toEqual(['a', 'b', 'c']);
    expect(within.viewSpec.groups['group-1']?.childIds).toEqual(['c', 'a', 'b']);
    expect(out.viewSpec.groups['group-1']?.childIds).toEqual(['c', 'a']);
    expect(out.viewSpec.rootOrder).toEqual(['group-1', 'b', 'd', 'e']);
    expect(start.viewSpec.rootOrder).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('returns a recorded no-op when the final container order is unchanged', () => {
    const start = sessionFrom();
    const result = executeCommand(start, move('same', 0, 'a', 'root', 0));
    const next = expectSuccess(result);

    expect(next.viewSpec).toBe(start.viewSpec);
    expect(next.undoStack).toBe(start.undoStack);
    expect(next.redoStack).toBe(start.redoStack);
    expect(next.processedActionIds).toEqual(['same']);
    if (result.ok) {
      expect(result.event.noOp).toBe(true);
      expect(result.event.nextRevision).toBe(0);
    }
  });

  it('rejects unknown, anchor, pinned, out-of-range and cross-segment moves', () => {
    const start = sessionFrom();
    expectFailure(
      executeCommand(start, move('missing', 0, 'missing', 'root', 0)),
      'ITEM_NOT_FOUND',
    );
    expectFailure(executeCommand(start, move('anchor', 0, 'start', 'root', 0)), 'ITEM_LOCKED');
    expectFailure(executeCommand(start, move('range', 0, 'a', 'root', 99)), 'INVALID_DROP_TARGET');
    expectFailure(executeCommand(start, move('segment', 0, 'd', 'root', 0)), 'INVALID_DROP_TARGET');

    const pinned = expectSuccess(executeCommand(start, pin('pin-a', 0, 'a')));
    expectFailure(executeCommand(pinned, move('pinned', 1, 'a', 'root', 1)), 'ITEM_LOCKED');

    const grouped = expectSuccess(executeCommand(start, group('group-two', 0)));
    const dissolved = expectSuccess(
      executeCommand(grouped, move('dissolve-source-group', 1, 'a', 'root', 1)),
    );
    expect(dissolved.viewSpec.groups['group-1']).toBeUndefined();
    expect(dissolved.viewSpec.rootOrder).toEqual(['b', 'a', 'c', 'd', 'e']);
    expectFailure(
      executeCommand(grouped, move('bad-container', 1, 'd', 'unknown', 0)),
      'GROUP_NOT_FOUND',
    );
  });
});

describe('group commands', () => {
  it('creates a root group in current display order and ungroups it in place', () => {
    const start = sessionFrom();
    const groupedResult = executeCommand(start, group('create', 0, 'drivers', ['b', 'a']));
    const grouped = expectSuccess(groupedResult);

    expect(grouped.viewSpec.rootOrder).toEqual(['drivers', 'c', 'd', 'e']);
    expect(grouped.viewSpec.groups['drivers']).toEqual({
      id: 'drivers',
      label: 'Drivers',
      childIds: ['a', 'b'],
    });
    if (groupedResult.ok) {
      expect(groupedResult.event.affectedNodeIds).toEqual(['drivers', 'a', 'b']);
    }

    const restored = expectSuccess(executeCommand(grouped, ungroup('remove', 1, 'drivers')));
    expect(restored.viewSpec.rootOrder).toEqual(start.viewSpec.rootOrder);
    expect(restored.viewSpec.groups).toEqual({});
  });

  it('removes group-owned collapsed, annotation and emphasis state on ungroup', () => {
    const base = sessionFrom();
    const seededView = {
      ...base.viewSpec,
      rootOrder: ['group-1', 'c', 'd', 'e'],
      groups: { 'group-1': { id: 'group-1', label: 'Drivers', childIds: ['a', 'b'] } },
      collapsedGroupIds: ['group-1'],
      annotations: { 'group-1': 'private annotation', a: 'child note' },
      emphasis: { 'group-1': 'highlight' as const, a: 'muted' as const },
    };
    const seeded = sessionFrom(commandSourceData, { viewSpec: seededView });
    const next = expectSuccess(executeCommand(seeded, ungroup('ungroup-clean', 0)));

    expect(next.viewSpec.collapsedGroupIds).toEqual([]);
    expect(next.viewSpec.annotations).toEqual({ a: 'child note' });
    expect(next.viewSpec.emphasis).toEqual({ a: 'muted' });
  });

  it('rejects invalid selections, IDs, labels, pinned members and pinned ungroup', () => {
    const start = sessionFrom();
    expectFailure(executeCommand(start, group('small', 0, 'g', ['a'])), 'GROUP_TOO_SMALL');
    expectFailure(
      executeCommand(start, group('non-contiguous', 0, 'g', ['a', 'c'])),
      'NON_CONTIGUOUS_GROUP_SELECTION',
    );
    expectFailure(executeCommand(start, group('cross', 0, 'g', ['c', 'd'])), 'INVALID_DROP_TARGET');
    expectFailure(executeCommand(start, group('source-id', 0, 'a')), 'GROUP_ID_CONFLICT');
    expectFailure(executeCommand(start, group('reserved-id', 0, 'root')), 'GROUP_ID_CONFLICT');
    expectFailure(
      executeCommand(start, group('blank-label', 0, 'g', ['a', 'b'], '  ')),
      'INVALID_COMMAND',
    );

    const pinned = expectSuccess(executeCommand(start, pin('pin', 0, 'a')));
    expectFailure(executeCommand(pinned, group('pinned-group', 1)), 'ITEM_LOCKED');

    const grouped = expectSuccess(executeCommand(start, group('create', 0)));
    const pinnedChild = expectSuccess(executeCommand(grouped, pin('pin-child', 1, 'a')));
    expectFailure(executeCommand(pinnedChild, ungroup('blocked-ungroup', 2)), 'ITEM_LOCKED');
    expectFailure(executeCommand(start, ungroup('unknown-group', 0)), 'GROUP_NOT_FOUND');
  });
});

describe('collapse, pin and annotation commands', () => {
  it('toggles group collapse and records repeated state as a no-op', () => {
    const grouped = expectSuccess(executeCommand(sessionFrom(), group('create', 0)));
    const collapsed = expectSuccess(executeCommand(grouped, collapse('collapse', 1)));
    const repeatedResult = executeCommand(collapsed, collapse('collapse-again', 2));
    const repeated = expectSuccess(repeatedResult);
    const expanded = expectSuccess(executeCommand(repeated, expand('expand', 2)));

    expect(collapsed.viewSpec.collapsedGroupIds).toEqual(['group-1']);
    expect(repeated.viewSpec).toBe(collapsed.viewSpec);
    expect(repeated.undoStack).toBe(collapsed.undoStack);
    expect(expanded.viewSpec.collapsedGroupIds).toEqual([]);
    if (repeatedResult.ok) {
      expect(repeatedResult.event.noOp).toBe(true);
    }
    expectFailure(executeCommand(sessionFrom(), collapse('missing', 0)), 'GROUP_NOT_FOUND');
  });

  it('pins root and group children and treats repeated pin/unpin as no-ops', () => {
    const start = sessionFrom();
    const pinned = expectSuccess(executeCommand(start, pin('pin', 0, 'a')));
    const repeated = expectSuccess(executeCommand(pinned, pin('pin-again', 1, 'a')));
    const unpinned = expectSuccess(executeCommand(repeated, unpin('unpin', 1, 'a')));
    const repeatedUnpin = expectSuccess(executeCommand(unpinned, unpin('unpin-again', 2, 'a')));

    expect(pinned.viewSpec.pinnedItemIds).toEqual(['a']);
    expect(repeated.viewSpec).toBe(pinned.viewSpec);
    expect(unpinned.viewSpec.pinnedItemIds).toEqual([]);
    expect(repeatedUnpin.viewSpec).toBe(unpinned.viewSpec);

    const grouped = expectSuccess(executeCommand(start, group('group', 0)));
    expectSuccess(executeCommand(grouped, pin('pin-child', 1, 'a')));
    expectFailure(executeCommand(start, pin('pin-anchor', 0, 'start')), 'ITEM_LOCKED');
    expectFailure(executeCommand(start, pin('pin-missing', 0, 'missing')), 'ITEM_NOT_FOUND');
  });

  it('sets source, anchor and group annotations while preserving non-empty text', () => {
    const start = sessionFrom();
    const sourceText = '  <b>private</b>  ';
    const annotated = expectSuccess(executeCommand(start, annotate('note', 0, 'a', sourceText)));
    const anchor = expectSuccess(
      executeCommand(annotated, annotate('anchor-note', 1, 'start', 'anchor')),
    );
    const same = expectSuccess(executeCommand(anchor, annotate('same-note', 2, 'a', sourceText)));
    const removed = expectSuccess(executeCommand(same, annotate('remove-note', 2, 'a', '   ')));

    expect(annotated.viewSpec.annotations['a']).toBe(sourceText);
    expect(anchor.viewSpec.annotations['start']).toBe('anchor');
    expect(same.viewSpec).toBe(anchor.viewSpec);
    expect(removed.viewSpec.annotations['a']).toBeUndefined();

    const grouped = expectSuccess(executeCommand(start, group('group', 0)));
    const groupNote = expectSuccess(
      executeCommand(grouped, annotate('group-note', 1, 'group-1', 'summary')),
    );
    expect(groupNote.viewSpec.annotations['group-1']).toBe('summary');
  });

  it('enforces annotation code points and known nodes without leaking text', () => {
    const start = sessionFrom();
    const fiveHundred = '😀'.repeat(500);
    const accepted = expectSuccess(executeCommand(start, annotate('max', 0, 'a', fiveHundred)));
    expect(accepted.viewSpec.annotations['a']).toBe(fiveHundred);

    const tooLong = 'sensitive'.repeat(63);
    const result = executeCommand(start, annotate('too-long', 0, 'a', tooLong));
    const error = expectFailure(result, 'INVALID_COMMAND');
    expect(error.reason).toBe('ANNOTATION_TOO_LONG');
    expect(JSON.stringify(error)).not.toContain(tooLong);
    expectFailure(
      executeCommand(start, annotate('unknown', 0, 'missing', 'text')),
      'NODE_NOT_FOUND',
    );
  });
});

describe('command envelope and atomicity', () => {
  it('checks duplicate IDs before revision and lets a rejected ID be reused', () => {
    const start = sessionFrom();
    const first = expectSuccess(executeCommand(start, pin('same-id', 0, 'a')));
    const duplicate = executeCommand(first, unpin('same-id', 0, 'a'));
    expectFailure(duplicate, 'DUPLICATE_COMMAND_ID');
    expect(duplicate.session).toBe(first);

    const rejected = executeCommand(start, move('reusable', 0, 'missing', 'root', 0));
    expectFailure(rejected, 'ITEM_NOT_FOUND');
    const reused = expectSuccess(executeCommand(start, pin('reusable', 0, 'a')));
    expect(reused.processedActionIds).toEqual(['reusable']);
  });

  it('rejects stale revisions and preserves every input identity', () => {
    const start = sessionFrom();
    const result = executeCommand(start, pin('stale', 2, 'a'));

    const error = expectFailure(result, 'REVISION_CONFLICT');
    expect(result.session).toBe(start);
    expect(error).toMatchObject({
      path: '/baseRevision',
      details: { expectedRevision: 2, actualRevision: 0 },
    });
  });

  it('validates closed-schema command data without invoking getters or leaking proxy errors', () => {
    const start = sessionFrom();
    let getterCalls = 0;
    const accessor = {
      schemaVersion: '1.0.0',
      id: 'accessor',
      type: 'pinItem',
      source: 'host',
      baseRevision: 0,
    };
    Object.defineProperty(accessor, 'payload', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('private getter text');
      },
    });

    const accessorResult = executeCommand(start, accessor as PinItemCommand);
    expectFailure(accessorResult, 'INVALID_COMMAND');
    expect(getterCalls).toBe(0);
    expect(JSON.stringify(accessorResult)).not.toContain('private getter text');

    const proxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('private proxy text');
        },
      },
    );
    const proxyResult = executeCommand(start, proxy as PinItemCommand);
    expectFailure(proxyResult, 'INVALID_COMMAND');
    expect(JSON.stringify(proxyResult)).not.toContain('private proxy text');

    const extra = { ...pin('extra', 0, 'a'), secret: 'private field' };
    expectFailure(executeCommand(start, extra), 'INVALID_COMMAND');
  });

  it('rejects malformed envelope and payload variants with stable privacy-safe errors', () => {
    const start = sessionFrom();
    const validPin = pin('raw', 0, 'a');
    const sparseIds = ['a', 'b'];
    delete sparseIds[1];
    const extraIds = ['a', 'b'];
    Object.defineProperty(extraIds, 'extra', { enumerable: true, value: true });
    const symbolIds = ['a', 'b'];
    Object.defineProperty(symbolIds, Symbol('private'), { enumerable: true, value: true });
    const accessorIds = ['a', 'b'];
    Object.defineProperty(accessorIds, '1', {
      enumerable: true,
      get() {
        throw new Error('private array getter');
      },
    });
    const commandWithSymbol = { ...validPin };
    Object.defineProperty(commandWithSymbol, Symbol('private'), { enumerable: true, value: true });
    const idTrap = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error('private id trap');
        },
      },
    );

    const cases: readonly unknown[] = [
      null,
      42,
      () => undefined,
      new Date(0),
      commandWithSymbol,
      { ...validPin, schemaVersion: 1 },
      { ...validPin, schemaVersion: '2.0.0' },
      { ...validPin, id: ' ' },
      { ...validPin, type: 'unknown' },
      { ...validPin, source: 'unknown' },
      { ...validPin, source: 'ai' },
      { ...validPin, baseRevision: -1 },
      { ...validPin, payload: null },
      { ...validPin, payload: { itemId: ' ' } },
      { ...move('raw-move', 0, 'a', 'root', 0), payload: null },
      { ...move('raw-move', 0, 'a', 'root', 0), payload: { itemId: 1, target: {} } },
      { ...move('raw-move', 0, 'a', 'root', 0), payload: { itemId: 'a', target: null } },
      {
        ...move('raw-move', 0, 'a', 'root', 0),
        payload: { itemId: 'a', target: { containerId: ' ', index: 0 } },
      },
      {
        ...move('raw-move', 0, 'a', 'root', 0),
        payload: { itemId: 'a', target: { containerId: 'root', index: 0.5 } },
      },
      { ...validPin, id: 'raw-move-group', type: 'moveGroup', payload: null },
      { ...group('raw-group', 0), payload: null },
      {
        ...group('raw-group', 0),
        payload: { groupId: ' ', label: 'x', nodeIds: [], initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 1, nodeIds: [], initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 'x', nodeIds: {}, initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 'x', nodeIds: sparseIds, initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 'x', nodeIds: extraIds, initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 'x', nodeIds: symbolIds, initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 'x', nodeIds: accessorIds, initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 'x', nodeIds: ['a', 'a'], initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 'x', nodeIds: ['a', 1], initiallyCollapsed: false },
      },
      {
        ...group('raw-group', 0),
        payload: { groupId: 'g', label: 'x', nodeIds: ['a', 'b'], initiallyCollapsed: 'no' },
      },
      { ...collapse('raw-collapse', 0), payload: null },
      { ...collapse('raw-collapse', 0), payload: { groupId: ' ' } },
      { ...annotate('raw-note', 0, 'a', null), payload: null },
      { ...annotate('raw-note', 0, 'a', null), payload: { nodeId: ' ', text: null } },
      { ...annotate('raw-note', 0, 'a', null), payload: { nodeId: 'a', text: 1 } },
      idTrap,
    ];

    for (const input of cases) {
      const result = executeCommand(start, input as PinItemCommand);
      const error = expectFailure(result, 'INVALID_COMMAND');
      expect(error.message.length).toBeGreaterThan(0);
      expect(result.session).toBe(start);
      expect(JSON.stringify(result)).not.toContain('private');
    }
  });
});
