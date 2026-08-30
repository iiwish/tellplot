import { describe, expect, it } from 'vitest';

import {
  createEditorSession,
  executeCommand,
  parseEditorCommand,
  projectCategoricalComparison,
  redoSession,
  undoSession,
  validateEditorInvariants,
  type CategoricalComparisonSourceData,
  type EditorCommand,
  type EditorSession,
  type ViewSpec,
} from '../../src';

const source = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'comparison-command-invariants',
  series: [
    { id: 'actual', label: 'Actual' },
    { id: 'budget', label: 'Budget' },
  ],
  items: [
    {
      id: 'alpha',
      label: 'Alpha',
      values: [
        { seriesId: 'actual', amount: 8 },
        { seriesId: 'budget', amount: 80 },
      ],
    },
    {
      id: 'beta',
      label: 'Beta',
      values: [
        { seriesId: 'actual', amount: -3 },
        { seriesId: 'budget', amount: 7 },
      ],
    },
    {
      id: 'gamma',
      label: 'Gamma',
      values: [
        { seriesId: 'actual', amount: 5 },
        { seriesId: 'budget', amount: -2 },
      ],
    },
  ],
} as const satisfies CategoricalComparisonSourceData;

function session(): EditorSession {
  const result = createEditorSession(source);
  if (!result.ok) {
    throw new Error('Expected a comparison session');
  }
  return result.value;
}

function command(input: Omit<EditorCommand, 'schemaVersion' | 'source'>): EditorCommand {
  return { ...input, schemaVersion: '1.0.0', source: 'host' } as EditorCommand;
}

function viewContent(view: ViewSpec): unknown {
  return { ...view, revision: 0 };
}

describe('comparison narrative invariants', () => {
  it('keeps commands, history and projection category/group-only without mutating source', () => {
    const initial = session();
    expect(initial.sourceData).toBe(source);
    const sourceSnapshot = structuredClone(source);

    const grouped = executeCommand(
      initial,
      command({
        id: 'group-alpha-beta',
        type: 'createGroup',
        baseRevision: 0,
        payload: {
          groupId: 'alpha-beta',
          label: 'Alpha and beta',
          nodeIds: ['alpha', 'beta'],
          initiallyCollapsed: true,
        },
      }),
    );
    expect(grouped.ok).toBe(true);
    if (!grouped.ok) {
      throw new Error('Expected group command to succeed');
    }
    expect(grouped.session.sourceData).toBe(source);
    expect(validateEditorInvariants(source, grouped.viewSpec).ok).toBe(true);

    const projection = projectCategoricalComparison(source, grouped.viewSpec);
    expect(projection).toMatchObject({
      ok: true,
      value: [
        {
          nodeId: 'alpha-beta',
          kind: 'group',
          sourceIds: ['alpha', 'beta'],
          values: [
            { seriesId: 'actual', amount: 5 },
            { seriesId: 'budget', amount: 87 },
          ],
        },
        { nodeId: 'gamma', kind: 'category', sourceIds: ['gamma'] },
      ],
    });
    if (projection.ok) {
      expect(projection.value.every(datum => !Object.hasOwn(datum, 'amount'))).toBe(true);
      expect(projection.value.flatMap(datum => datum.sourceIds).some(id => id === 'actual')).toBe(
        false,
      );
    }

    const pinned = executeCommand(
      grouped.session,
      command({
        id: 'pin-gamma',
        type: 'pinItem',
        baseRevision: 1,
        payload: { itemId: 'gamma' },
      }),
    );
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) {
      throw new Error('Expected pin command to succeed');
    }
    expect(pinned.session.sourceData).toBe(source);

    const undone = undoSession(pinned.session, {
      id: 'undo-pin-gamma',
      source: 'keyboard',
      baseRevision: 2,
    });
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.session.sourceData).toBe(source);
      expect(viewContent(undone.viewSpec)).toEqual(viewContent(grouped.viewSpec));
    }
    expect(source).toEqual(sourceSnapshot);
  });

  it('does not promote series identifiers or commands into narrative state', () => {
    const initial = session();
    const seriesCommand = command({
      id: 'pin-series',
      type: 'pinItem',
      baseRevision: 0,
      payload: { itemId: 'actual' },
    });

    const result = executeCommand(initial, seriesCommand);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'ITEM_NOT_FOUND',
        path: '/payload/itemId',
      },
    });
    expect(result.session).toBe(initial);
    expect(result.session.sourceData).toBe(source);

    expect(
      parseEditorCommand({
        schemaVersion: '1.0.0',
        id: 'select-series',
        type: 'selectSeries',
        source: 'host',
        baseRevision: 0,
        payload: { seriesId: 'actual' },
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'INVALID_COMMAND', reason: 'INVALID_TYPE', path: '/type' },
    });
  });

  it('keeps category and series namespaces distinct when their string identifiers match', () => {
    const sharedNamespaceSource = {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: 'comparison-shared-namespace',
      series: [
        { id: 'actual', label: 'Actual series' },
        { id: 'budget', label: 'Budget series' },
      ],
      items: [
        {
          id: 'actual',
          label: 'Actual category',
          values: [
            { seriesId: 'actual', amount: 4 },
            { seriesId: 'budget', amount: 9 },
          ],
        },
        {
          id: 'other',
          label: 'Other category',
          values: [
            { seriesId: 'actual', amount: 2 },
            { seriesId: 'budget', amount: 3 },
          ],
        },
      ],
    } as const satisfies CategoricalComparisonSourceData;
    const created = createEditorSession(sharedNamespaceSource);
    if (!created.ok) {
      throw new Error('Expected a shared-namespace session');
    }

    const pinned = executeCommand(
      created.value,
      command({
        id: 'pin-shared-category',
        type: 'pinItem',
        baseRevision: 0,
        payload: { itemId: 'actual' },
      }),
    );
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) {
      throw new Error('Expected the category identifier to remain pinnable');
    }
    const projected = projectCategoricalComparison(sharedNamespaceSource, pinned.viewSpec);
    expect(projected).toMatchObject({
      ok: true,
      value: [
        {
          nodeId: 'actual',
          sourceIds: ['actual'],
          locked: true,
          values: [
            { seriesId: 'actual', label: 'Actual series', amount: 4 },
            { seriesId: 'budget', label: 'Budget series', amount: 9 },
          ],
        },
        { nodeId: 'other', sourceIds: ['other'] },
      ],
    });

    const seriesOnly = executeCommand(
      pinned.session,
      command({
        id: 'pin-series-only',
        type: 'pinItem',
        baseRevision: 1,
        payload: { itemId: 'budget' },
      }),
    );
    expect(seriesOnly).toMatchObject({
      ok: false,
      error: { code: 'ITEM_NOT_FOUND', path: '/payload/itemId' },
    });
  });

  it('preserves nested comparison groups through moveGroup, undo and redo', () => {
    const nestedSource = {
      ...source,
      datasetId: 'comparison-nested-history',
      items: [
        ...source.items,
        {
          id: 'delta',
          label: 'Delta',
          values: [
            { seriesId: 'actual', amount: 1 },
            { seriesId: 'budget', amount: 2 },
          ],
        },
      ],
    } as const satisfies CategoricalComparisonSourceData;
    const created = createEditorSession(nestedSource);
    if (!created.ok) {
      throw new Error('Expected a nested comparison session');
    }
    const inner = executeCommand(
      created.value,
      command({
        id: 'create-inner',
        type: 'createGroup',
        baseRevision: 0,
        payload: {
          groupId: 'inner',
          label: 'Inner',
          nodeIds: ['alpha', 'beta'],
          initiallyCollapsed: false,
        },
      }),
    );
    if (!inner.ok) {
      throw new Error('Expected inner group creation');
    }
    const outer = executeCommand(
      inner.session,
      command({
        id: 'create-outer',
        type: 'createGroup',
        baseRevision: 1,
        payload: {
          groupId: 'outer',
          label: 'Outer',
          nodeIds: ['inner', 'gamma'],
          initiallyCollapsed: false,
        },
      }),
    );
    if (!outer.ok) {
      throw new Error('Expected outer group creation');
    }
    expect(outer.viewSpec.groups['outer']?.childIds).toEqual(['inner', 'gamma']);

    const moved = executeCommand(
      outer.session,
      command({
        id: 'move-outer',
        type: 'moveGroup',
        baseRevision: 2,
        payload: { groupId: 'outer', target: { containerId: 'root', index: 1 } },
      }),
    );
    expect(moved.ok).toBe(true);
    if (!moved.ok) {
      throw new Error('Expected nested group move');
    }
    expect(moved.viewSpec.rootOrder).toEqual(['delta', 'outer']);
    expect(moved.session.sourceData).toBe(nestedSource);

    const undone = undoSession(moved.session, {
      id: 'undo-move-outer',
      source: 'keyboard',
      baseRevision: 3,
    });
    expect(undone.ok).toBe(true);
    if (!undone.ok) {
      throw new Error('Expected nested move undo');
    }
    expect(viewContent(undone.viewSpec)).toEqual(viewContent(outer.viewSpec));

    const redone = redoSession(undone.session, {
      id: 'redo-move-outer',
      source: 'keyboard',
      baseRevision: 4,
    });
    expect(redone.ok).toBe(true);
    if (redone.ok) {
      expect(redone.viewSpec.rootOrder).toEqual(['delta', 'outer']);
      expect(redone.session.sourceData).toBe(nestedSource);
      expect(validateEditorInvariants(nestedSource, redone.viewSpec).ok).toBe(true);
    }
  });
});
