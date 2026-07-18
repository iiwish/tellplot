import { describe, expect, it } from 'vitest';

import {
  createEditorSession,
  executeCommand,
  validateViewSpec,
  type CommandResult,
  type EditorSession,
  type GroupId,
  type MoveItemCommand,
  type SourceItemId,
  type ViewSpec,
} from '../../src';
import { validateEditorInvariants } from '../../src/domain/invariants';
import { commandSourceData } from '../fixtures/commandSourceData';

function session(): EditorSession {
  const result = createEditorSession(commandSourceData);
  if (!result.ok) {
    throw new Error('Expected fixture session');
  }
  return result.value;
}

function move(id: string, baseRevision: number, itemId: string, index: number): MoveItemCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'moveItem',
    source: 'direct',
    baseRevision,
    payload: { itemId, target: { containerId: 'root', index } },
  };
}

function assertAtomicFailure(result: CommandResult, input: EditorSession): void {
  expect(result.ok).toBe(false);
  expect(result.session).toBe(input);
  expect(result.session.viewSpec).toBe(input.viewSpec);
  expect(result.session.undoStack).toBe(input.undoStack);
  expect(result.session.redoStack).toBe(input.redoStack);
  expect(result.session.processedActionIds).toBe(input.processedActionIds);
}

describe('editor invariant gate', () => {
  it('accepts a valid view and reports the existing stable validation issues', () => {
    const start = session();
    const valid = validateEditorInvariants(start.sourceData, start.viewSpec);
    expect(valid).toEqual({ ok: true, value: start.viewSpec, errors: [] });

    const missing: ViewSpec = { ...start.viewSpec, rootOrder: ['a', 'b', 'c', 'd'] };
    const result = validateEditorInvariants(start.sourceData, missing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(issue => issue.reason === 'MISSING_SOURCE_REFERENCE')).toBe(true);
    }
  });

  it.each([
    {
      name: 'duplicate root node',
      change: (view: ViewSpec): ViewSpec => ({
        ...view,
        rootOrder: ['a', 'a', 'b', 'c', 'd', 'e'],
      }),
    },
    {
      name: 'cross-segment root order',
      change: (view: ViewSpec): ViewSpec => ({ ...view, rootOrder: ['d', 'a', 'b', 'c', 'e'] }),
    },
    {
      name: 'undersized group',
      change: (view: ViewSpec): ViewSpec => ({
        ...view,
        rootOrder: ['group', 'b', 'c', 'd', 'e'],
        groups: { group: { id: 'group', label: 'Group', childIds: ['a'] } },
      }),
    },
    {
      name: 'duplicate membership',
      change: (view: ViewSpec): ViewSpec => ({
        ...view,
        rootOrder: ['group-1', 'group-2', 'c', 'd', 'e'],
        groups: {
          'group-1': { id: 'group-1', label: 'One', childIds: ['a', 'b'] },
          'group-2': { id: 'group-2', label: 'Two', childIds: ['a', 'b'] },
        },
      }),
    },
  ])('rejects a tampered session before apply: $name', ({ change }) => {
    const valid = session();
    const tampered: EditorSession = { ...valid, viewSpec: change(valid.viewSpec) };
    const result = executeCommand(tampered, move('attempt', 0, 'a', 0));

    assertAtomicFailure(result, tampered);
    if (!result.ok) {
      expect(result.error.code).toBe('INVARIANT_VIOLATION');
    }
  });

  it('reports a stale base revision before inspecting a tampered session view', () => {
    const valid = session();
    const tampered: EditorSession = {
      ...valid,
      viewSpec: { ...valid.viewSpec, rootOrder: ['a'] },
    };
    const result = executeCommand(tampered, move('stale-tampered', 99, 'a', 0));

    assertAtomicFailure(result, tampered);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: 'REVISION_CONFLICT',
        path: '/baseRevision',
        details: { expectedRevision: 99, actualRevision: 0 },
      });
    }
  });

  it('keeps source identity, coverage and source-order amount conservation after success', () => {
    const start = session();
    const result = executeCommand(start, move('move', 0, 'c', 0));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.session.sourceData).toBe(start.sourceData);
    expect(validateViewSpec(result.session.viewSpec, start.sourceData).ok).toBe(true);

    const sourceAmounts = new Map(
      start.sourceData.items
        .filter(item => item.kind === 'contribution')
        .map(item => [item.id, item.amount] as const),
    );
    const covered = result.session.viewSpec.rootOrder.flatMap(nodeId => {
      const group = result.session.viewSpec.groups[nodeId as GroupId];
      return group?.childIds ?? [nodeId as SourceItemId];
    });
    const total = start.sourceData.items
      .filter(item => item.kind === 'contribution')
      .reduce(
        (sum, item) => sum + (covered.includes(item.id) ? (sourceAmounts.get(item.id) ?? 0) : 0),
        0,
      );
    const expected = start.sourceData.items
      .filter(item => item.kind === 'contribution')
      .reduce((sum, item) => sum + item.amount, 0);

    expect(new Set(covered)).toEqual(new Set(sourceAmounts.keys()));
    expect(total).toBe(expected);
  });
});
