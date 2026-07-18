import { describe, expect, it } from 'vitest';

import type { EditorCommand } from '../../src/domain/commands';
import { executeCommand } from '../../src/domain/executeCommand';
import { undoSession } from '../../src/domain/history';
import type { SourceData, ViewSpec } from '../../src/domain/model';
import { createEditorSession } from '../../src/domain/session';
import { parseViewSpec, serializeViewSpec } from '../../src/domain/persistence';
import { validateViewSpec } from '../../src/domain/validation';

const sourceData: SourceData = {
  schemaVersion: '1.0.0',
  datasetId: 'recursive-groups',
  items: [
    { id: 'start', label: 'Start', amount: 100, kind: 'start' },
    { id: 'a', label: 'A', amount: 10, kind: 'contribution' },
    { id: 'b', label: 'B', amount: -4, kind: 'contribution' },
    { id: 'c', label: 'C', amount: 6, kind: 'contribution' },
    { id: 'd', label: 'D', amount: -2, kind: 'contribution' },
    { id: 'end', label: 'End', amount: 110, kind: 'end' },
  ],
};

function baseView(): ViewSpec {
  return {
    schemaVersion: '1.0.0',
    datasetId: sourceData.datasetId,
    chartType: 'waterfall',
    revision: 0,
    rootOrder: ['inner', 'c', 'd'],
    groups: {
      inner: { id: 'inner', label: 'Inner', childIds: ['a', 'b'] },
    },
    collapsedGroupIds: ['inner'],
    pinnedItemIds: [],
    annotations: {},
    emphasis: {},
  };
}

function command<T extends EditorCommand['type']>(
  type: T,
  payload: Extract<EditorCommand, { type: T }>['payload'],
): Extract<EditorCommand, { type: T }> {
  return {
    schemaVersion: '1.0.0',
    id: `command-${type}`,
    type,
    source: 'direct',
    baseRevision: 0,
    payload,
  } as Extract<EditorCommand, { type: T }>;
}

describe('recursive groups', () => {
  it('round-trips a recursive tree without persisting derived parent or depth caches', () => {
    const nested: ViewSpec = {
      ...baseView(),
      rootOrder: ['outer', 'd'],
      groups: {
        ...baseView().groups,
        outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
      },
    };
    const serialized = serializeViewSpec(nested);
    expect(serialized).not.toContain('parent');
    expect(serialized).not.toContain('depth');
    expect(parseViewSpec(serialized, sourceData)).toEqual({
      ok: true,
      value: nested,
      errors: [],
    });
  });

  it('accepts a normalized recursive tree and rejects a cycle', () => {
    const nested: ViewSpec = {
      ...baseView(),
      rootOrder: ['outer', 'd'],
      groups: {
        ...baseView().groups,
        outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
      },
    };
    expect(validateViewSpec(nested, sourceData)).toEqual({ ok: true, value: nested, errors: [] });

    const cyclic: ViewSpec = {
      ...nested,
      rootOrder: ['outer', 'c', 'd'],
      groups: {
        inner: { id: 'inner', label: 'Inner', childIds: ['outer', 'a'] },
        outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'b'] },
      },
    };
    const invalid = validateViewSpec(cyclic, sourceData);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors.map(error => error.reason)).toContain('CYCLIC_GROUP_REFERENCE');
    }
  });

  it('creates an initially collapsed parent group as one undoable command', () => {
    const session = createEditorSession(sourceData, { viewSpec: baseView() });
    expect(session.ok).toBe(true);
    if (!session.ok) {
      return;
    }

    const result = executeCommand(
      session.value,
      command('createGroup', {
        groupId: 'outer',
        label: 'Outer',
        nodeIds: ['inner', 'c'],
        initiallyCollapsed: true,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.viewSpec.rootOrder).toEqual(['outer', 'd']);
    expect(result.viewSpec.groups['outer']?.childIds).toEqual(['inner', 'c']);
    expect(result.viewSpec.collapsedGroupIds).toEqual(['inner', 'outer']);
    expect(result.viewSpec.revision).toBe(1);
    expect(result.session.undoStack).toHaveLength(1);

    const undone = undoSession(result.session, {
      id: 'undo-create-outer',
      source: 'direct',
      baseRevision: 1,
    });
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.viewSpec).toEqual({ ...baseView(), revision: 2 });
    }
  });

  it('creates a child group inside an existing parent container', () => {
    const parentView: ViewSpec = {
      ...baseView(),
      rootOrder: ['parent', 'd'],
      groups: {
        parent: { id: 'parent', label: 'Parent', childIds: ['a', 'b', 'c'] },
      },
      collapsedGroupIds: [],
    };
    const session = createEditorSession(sourceData, { viewSpec: parentView });
    expect(session.ok).toBe(true);
    if (!session.ok) {
      return;
    }
    const result = executeCommand(
      session.value,
      command('createGroup', {
        groupId: 'child',
        label: 'Child',
        nodeIds: ['a', 'b'],
        initiallyCollapsed: false,
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.viewSpec.rootOrder).toEqual(['parent', 'd']);
      expect(result.viewSpec.groups['parent']?.childIds).toEqual(['child', 'c']);
      expect(result.viewSpec.groups['child']?.childIds).toEqual(['a', 'b']);
    }
  });

  it('rejects a create-group selection whose nodes have different parents', () => {
    const session = createEditorSession(sourceData, { viewSpec: baseView() });
    expect(session.ok).toBe(true);
    if (!session.ok) {
      return;
    }
    const result = executeCommand(
      session.value,
      command('createGroup', {
        groupId: 'invalid-parent',
        label: 'Invalid parent',
        nodeIds: ['a', 'c'],
        initiallyCollapsed: false,
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: 'INVALID_DROP_TARGET',
        reason: 'NON_CONTIGUOUS_SELECTION',
      });
      expect(result.session).toBe(session.value);
    }
  });

  it('ungroups only the requested parent and preserves descendant groups and collapse state', () => {
    const nested: ViewSpec = {
      ...baseView(),
      rootOrder: ['outer', 'd'],
      groups: {
        ...baseView().groups,
        outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
      },
      collapsedGroupIds: ['inner', 'outer'],
    };
    const session = createEditorSession(sourceData, { viewSpec: nested });
    expect(session.ok).toBe(true);
    if (!session.ok) {
      return;
    }

    const result = executeCommand(session.value, command('ungroup', { groupId: 'outer' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.viewSpec.rootOrder).toEqual(['inner', 'c', 'd']);
      expect(result.viewSpec.groups).toEqual({ inner: nested.groups['inner'] });
      expect(result.viewSpec.collapsedGroupIds).toEqual(['inner']);
    }
  });

  it('moves a group as a complete subtree and rejects moving it into a descendant', () => {
    const nested: ViewSpec = {
      ...baseView(),
      rootOrder: ['inner', 'c', 'd'],
    };
    const session = createEditorSession(sourceData, { viewSpec: nested });
    expect(session.ok).toBe(true);
    if (!session.ok) {
      return;
    }

    const moved = executeCommand(
      session.value,
      command('moveGroup', {
        groupId: 'inner',
        target: { containerId: 'root', index: 2 },
      }),
    );
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      expect(moved.viewSpec.rootOrder).toEqual(['c', 'd', 'inner']);
      expect(moved.viewSpec.groups['inner']?.childIds).toEqual(['a', 'b']);
    }

    const outer: ViewSpec = {
      ...baseView(),
      rootOrder: ['outer', 'd'],
      groups: {
        ...baseView().groups,
        outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
      },
    };
    const outerSession = createEditorSession(sourceData, { viewSpec: outer });
    expect(outerSession.ok).toBe(true);
    if (!outerSession.ok) {
      return;
    }
    const rejected = executeCommand(
      outerSession.value,
      command('moveGroup', {
        groupId: 'outer',
        target: { containerId: 'inner', index: 0 },
      }),
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error).toMatchObject({
        code: 'INVALID_DROP_TARGET',
        reason: 'CYCLIC_GROUP_TARGET',
      });
      expect(rejected.session).toBe(outerSession.value);
    }
  });

  it('rejects missing, pinned and too-small group movement targets without mutation', () => {
    const baseSession = createEditorSession(sourceData, { viewSpec: baseView() });
    expect(baseSession.ok).toBe(true);
    if (!baseSession.ok) {
      return;
    }
    const missing = executeCommand(
      baseSession.value,
      command('moveGroup', {
        groupId: 'missing',
        target: { containerId: 'root', index: 0 },
      }),
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe('GROUP_NOT_FOUND');
      expect(missing.session).toBe(baseSession.value);
    }

    const pinnedSession = createEditorSession(sourceData, {
      viewSpec: { ...baseView(), pinnedItemIds: ['a'] },
    });
    expect(pinnedSession.ok).toBe(true);
    if (pinnedSession.ok) {
      const pinned = executeCommand(
        pinnedSession.value,
        command('moveGroup', {
          groupId: 'inner',
          target: { containerId: 'root', index: 2 },
        }),
      );
      expect(pinned.ok).toBe(false);
      if (!pinned.ok) {
        expect(pinned.error).toMatchObject({ code: 'ITEM_LOCKED', reason: 'PINNED_ITEM' });
      }
    }

    const missingTarget = executeCommand(
      baseSession.value,
      command('moveGroup', {
        groupId: 'inner',
        target: { containerId: 'missing', index: 0 },
      }),
    );
    expect(missingTarget.ok).toBe(false);
    if (!missingTarget.ok) {
      expect(missingTarget.error.code).toBe('GROUP_NOT_FOUND');
    }

    const tooSmall = executeCommand(
      baseSession.value,
      command('moveItem', {
        itemId: 'a',
        target: { containerId: 'root', index: 0 },
      }),
    );
    expect(tooSmall.ok).toBe(false);
    if (!tooSmall.ok) {
      expect(tooSmall.error).toMatchObject({
        code: 'INVALID_DROP_TARGET',
        reason: 'GROUP_WOULD_BE_TOO_SMALL',
      });
    }
  });

  it('moves a nested group out while leaving a valid sibling group behind', () => {
    const view: ViewSpec = {
      ...baseView(),
      rootOrder: ['outer'],
      groups: {
        ...baseView().groups,
        outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c', 'd'] },
      },
    };
    const session = createEditorSession(sourceData, { viewSpec: view });
    expect(session.ok).toBe(true);
    if (!session.ok) {
      return;
    }
    const result = executeCommand(
      session.value,
      command('moveGroup', {
        groupId: 'inner',
        target: { containerId: 'root', index: 0 },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.viewSpec.rootOrder).toEqual(['inner', 'outer']);
      expect(result.viewSpec.groups['outer']?.childIds).toEqual(['c', 'd']);
    }
  });
});
