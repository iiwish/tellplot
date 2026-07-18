import { describe, expect, it } from 'vitest';

import {
  createEditorSession,
  executeCommand,
  redoSession,
  undoSession,
  type CommandResult,
  type EditorSession,
  type HistoryEntry,
  type MoveItemCommand,
  type PinItemCommand,
  type SessionActionMeta,
  type SetAnnotationCommand,
} from '../../src';
import { commandSourceData } from '../fixtures/commandSourceData';

function session(historyLimit?: number): EditorSession {
  const result = createEditorSession(
    commandSourceData,
    historyLimit === undefined ? undefined : { historyLimit },
  );
  if (!result.ok) {
    throw new Error('Expected a valid session fixture');
  }
  return result.value;
}

function success(result: CommandResult): EditorSession {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}`);
  }
  return result.session;
}

function action(id: string, baseRevision: number, source: SessionActionMeta['source'] = 'host') {
  return { id, source, baseRevision } satisfies SessionActionMeta;
}

function move(id: string, baseRevision: number, itemId: string, index: number): MoveItemCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'moveItem',
    source: 'outline',
    baseRevision,
    payload: { itemId, target: { containerId: 'root', index } },
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

function note(id: string, baseRevision: number, text: string): SetAnnotationCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'setAnnotation',
    source: 'direct',
    baseRevision,
    payload: { nodeId: 'a', text },
  };
}

function content(sessionValue: EditorSession): unknown {
  return { ...sessionValue.viewSpec, revision: 0 };
}

describe('undo and redo', () => {
  it('restores snapshot content while revisions remain monotonic', () => {
    const initial = session();
    const moved = success(executeCommand(initial, move('move', 0, 'c', 0)));
    const undoResult = undoSession(moved, action('undo', 1, 'keyboard'));
    const undone = success(undoResult);
    const redoResult = redoSession(undone, action('redo', 2, 'keyboard'));
    const redone = success(redoResult);

    expect(content(undone)).toEqual(content(initial));
    expect(undone.viewSpec.revision).toBe(2);
    expect(content(redone)).toEqual(content(moved));
    expect(redone.viewSpec.revision).toBe(3);
    expect(redone.sourceData).toBe(initial.sourceData);
    if (undoResult.ok && redoResult.ok) {
      expect(undoResult.event).toMatchObject({
        commandId: 'undo',
        type: 'undo',
        source: 'keyboard',
        previousRevision: 1,
        nextRevision: 2,
        noOp: false,
      });
      expect(redoResult.event.type).toBe('redo');
    }
  });

  it('clears redo on a new write but preserves it after a rejection or no-op', () => {
    const initial = session();
    const moved = success(executeCommand(initial, move('move', 0, 'c', 0)));
    const undone = success(undoSession(moved, action('undo', 1)));
    const redoIdentity = undone.redoStack;

    const rejected = executeCommand(undone, move('bad', 2, 'missing', 0));
    expect(rejected.ok).toBe(false);
    expect(rejected.session).toBe(undone);

    const noOp = success(executeCommand(undone, move('noop', 2, 'a', 0)));
    expect(noOp.redoStack).toBe(redoIdentity);
    expect(noOp.viewSpec).toBe(undone.viewSpec);
    expect(success(redoSession(noOp, action('redo', 2))).redoStack).toEqual([]);

    const branched = success(executeCommand(undone, pin('pin', 2, 'a')));
    expect(branched.redoStack).toEqual([]);
    const empty = redoSession(branched, action('empty-redo', 3));
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.error.code).toBe('HISTORY_EMPTY');
    }
  });

  it('rejects empty, duplicate and stale history actions atomically', () => {
    const initial = session();
    const empty = undoSession(initial, action('empty', 0));
    expect(empty.ok).toBe(false);
    expect(empty.session).toBe(initial);
    if (!empty.ok) {
      expect(empty.error).toMatchObject({ code: 'HISTORY_EMPTY', path: '/undoStack' });
    }

    const moved = success(executeCommand(initial, move('move', 0, 'c', 0)));
    const stale = undoSession(moved, action('stale', 0));
    expect(stale.ok).toBe(false);
    if (!stale.ok) {
      expect(stale.error.code).toBe('REVISION_CONFLICT');
    }
    const undone = success(undoSession(moved, action('history-id', 1)));
    const duplicate = redoSession(undone, action('history-id', 2));
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error.code).toBe('DUPLICATE_COMMAND_ID');
    }
    expect(duplicate.session).toBe(undone);
  });

  it('rejects malformed history action metadata before inspecting history', () => {
    const initial = session();
    const withSymbol = { id: 'symbol', source: 'host', baseRevision: 0 };
    Object.defineProperty(withSymbol, Symbol('private'), { enumerable: true, value: true });
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('private history proxy');
        },
      },
    );
    const cases: readonly unknown[] = [
      null,
      withSymbol,
      { id: ' ', source: 'host', baseRevision: 0 },
      { id: 'invalid-source', source: 'invalid', baseRevision: 0 },
      { id: 'invalid-revision', source: 'host', baseRevision: -1 },
      { id: 'extra', source: 'host', baseRevision: 0, extra: true },
      hostile,
    ];

    for (const input of cases) {
      const result = undoSession(initial, input as SessionActionMeta);
      expect(result.ok).toBe(false);
      expect(result.session).toBe(initial);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_COMMAND');
        expect(JSON.stringify(result.error)).not.toContain('private history');
      }
    }
  });

  it('rejects invalid current and restored snapshots without partial history changes', () => {
    const initial = session();
    const moved = success(executeCommand(initial, move('move', 0, 'c', 0)));
    const invalidView = { ...moved.viewSpec, rootOrder: ['a'] };
    const invalidCurrent: EditorSession = { ...moved, viewSpec: invalidView };
    const currentResult = undoSession(invalidCurrent, action('invalid-current', 1));
    expect(currentResult.ok).toBe(false);
    expect(currentResult.session).toBe(invalidCurrent);
    if (!currentResult.ok) {
      expect(currentResult.error.code).toBe('INVARIANT_VIOLATION');
    }

    const entry = moved.undoStack.at(-1);
    expect(entry).toBeDefined();
    if (entry === undefined) {
      return;
    }
    const invalidEntry: HistoryEntry = { ...entry, before: invalidView };
    const invalidSnapshot: EditorSession = { ...moved, undoStack: [invalidEntry] };
    const snapshotResult = undoSession(invalidSnapshot, action('invalid-snapshot', 1));
    expect(snapshotResult.ok).toBe(false);
    expect(snapshotResult.session).toBe(invalidSnapshot);
    if (!snapshotResult.ok) {
      expect(snapshotResult.error.code).toBe('INVARIANT_VIOLATION');
    }

    const unreadableEntry: HistoryEntry = {
      ...entry,
      before: new Proxy(entry.before, {
        get(target, property, receiver) {
          if (property === 'groups') {
            throw new Error('private snapshot');
          }
          return Reflect.get(target, property, receiver) as unknown;
        },
      }),
    };
    const unreadableSnapshot: EditorSession = { ...moved, undoStack: [unreadableEntry] };
    const unreadableResult = undoSession(unreadableSnapshot, action('unreadable-snapshot', 1));
    expect(unreadableResult.ok).toBe(false);
    expect(unreadableResult.session).toBe(unreadableSnapshot);
    if (!unreadableResult.ok) {
      expect(JSON.stringify(unreadableResult.error)).not.toContain('private snapshot');
    }
  });
});

describe('bounded history', () => {
  it('keeps only the newest entries and bounds redo independently', () => {
    let current = session(2);
    current = success(executeCommand(current, note('one', 0, 'one')));
    current = success(executeCommand(current, note('two', 1, 'two')));
    current = success(executeCommand(current, note('three', 2, 'three')));

    expect(current.undoStack).toHaveLength(2);
    const firstUndo = success(undoSession(current, action('undo-1', 3)));
    const secondUndo = success(undoSession(firstUndo, action('undo-2', 4)));
    expect(secondUndo.viewSpec.annotations['a']).toBe('one');
    expect(secondUndo.redoStack).toHaveLength(2);

    const exhausted = undoSession(secondUndo, action('undo-3', 5));
    expect(exhausted.ok).toBe(false);
    if (!exhausted.ok) {
      expect(exhausted.error.code).toBe('HISTORY_EMPTY');
    }
  });

  it('allows state changes with historyLimit zero and disables undo storage', () => {
    const initial = session(0);
    const moved = success(executeCommand(initial, move('move', 0, 'c', 0)));

    expect(moved.viewSpec.revision).toBe(1);
    expect(moved.undoStack).toEqual([]);
    const result = undoSession(moved, action('undo', 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HISTORY_EMPTY');
    }
  });

  it('does not store SourceData or sensitive command payloads in entries', () => {
    const initial = session();
    const annotated = success(
      executeCommand(initial, note('private-note', 0, 'secret annotation')),
    );
    const entry = annotated.undoStack[0];

    expect(entry).toBeDefined();
    expect(entry).not.toHaveProperty('sourceData');
    expect(entry).not.toHaveProperty('payload');
    expect(entry).toMatchObject({
      action: { id: 'private-note', type: 'setAnnotation', source: 'direct' },
      affectedNodeIds: ['a'],
    });
    expect(JSON.stringify(entry?.action)).not.toContain('secret annotation');
  });

  it('rejects revision overflow for commands, undo and redo', () => {
    const initial = session();
    const overflow: EditorSession = {
      ...initial,
      viewSpec: { ...initial.viewSpec, revision: Number.MAX_SAFE_INTEGER },
    };
    const commandResult = executeCommand(
      overflow,
      pin('overflow-command', Number.MAX_SAFE_INTEGER, 'a'),
    );
    expect(commandResult.ok).toBe(false);
    if (!commandResult.ok) {
      expect(commandResult.error.code).toBe('REVISION_OVERFLOW');
    }
    const noOpAtLimit = executeCommand(
      overflow,
      move('overflow-noop', Number.MAX_SAFE_INTEGER, 'a', 0),
    );
    expect(noOpAtLimit.ok).toBe(true);
    if (noOpAtLimit.ok) {
      expect(noOpAtLimit.session.viewSpec).toBe(overflow.viewSpec);
      expect(noOpAtLimit.session.viewSpec.revision).toBe(Number.MAX_SAFE_INTEGER);
    }

    const moved = success(executeCommand(initial, move('move', 0, 'c', 0)));
    const undoOverflow: EditorSession = {
      ...moved,
      viewSpec: { ...moved.viewSpec, revision: Number.MAX_SAFE_INTEGER },
    };
    const undoResult = undoSession(undoOverflow, action('overflow-undo', Number.MAX_SAFE_INTEGER));
    expect(undoResult.ok).toBe(false);
    if (!undoResult.ok) {
      expect(undoResult.error.code).toBe('REVISION_OVERFLOW');
    }

    const undone = success(undoSession(moved, action('undo', 1)));
    const redoOverflow: EditorSession = {
      ...undone,
      viewSpec: { ...undone.viewSpec, revision: Number.MAX_SAFE_INTEGER },
    };
    const redoResult = redoSession(redoOverflow, action('overflow-redo', Number.MAX_SAFE_INTEGER));
    expect(redoResult.ok).toBe(false);
    if (!redoResult.ok) {
      expect(redoResult.error.code).toBe('REVISION_OVERFLOW');
    }
  });
});
