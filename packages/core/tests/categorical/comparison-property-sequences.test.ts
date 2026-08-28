import { describe, expect, it } from 'vitest';

import {
  createEditorSession,
  executeCommand,
  projectCategoricalComparison,
  redoSession,
  undoSession,
  validateViewSpec,
  type CategoricalComparisonSourceData,
  type EditorCommand,
  type EditorSession,
  type SessionActionMeta,
  type ViewNodeId,
} from '../../src';

const source = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'comparison-property-sequences',
  series: [
    { id: 'actual', label: 'Actual' },
    { id: 'budget', label: 'Budget' },
    { id: 'forecast', label: 'Forecast' },
  ],
  items: [
    {
      id: 'a',
      label: 'A',
      values: [
        { seriesId: 'actual', amount: 11 },
        { seriesId: 'budget', amount: 101 },
        { seriesId: 'forecast', amount: -9 },
      ],
    },
    {
      id: 'b',
      label: 'B',
      values: [
        { seriesId: 'actual', amount: -3 },
        { seriesId: 'budget', amount: 17 },
        { seriesId: 'forecast', amount: 23 },
      ],
    },
    {
      id: 'c',
      label: 'C',
      values: [
        { seriesId: 'actual', amount: 5 },
        { seriesId: 'budget', amount: -7 },
        { seriesId: 'forecast', amount: 29 },
      ],
    },
    {
      id: 'd',
      label: 'D',
      values: [
        { seriesId: 'actual', amount: 2 },
        { seriesId: 'budget', amount: 31 },
        { seriesId: 'forecast', amount: -13 },
      ],
    },
  ],
} as const satisfies CategoricalComparisonSourceData;
const sourceSnapshot: CategoricalComparisonSourceData = structuredClone(source);

function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function initialSession(): EditorSession {
  const result = createEditorSession(source, { historyLimit: 32 });
  if (!result.ok) {
    throw new Error('Expected a comparison session');
  }
  return result.value;
}

function envelope<T extends Omit<EditorCommand, 'schemaVersion' | 'source'>>(
  input: T,
): EditorCommand {
  return { ...input, schemaVersion: '1.0.0', source: 'host' } as EditorCommand;
}

function commandFor(step: number, session: EditorSession, random: () => number): EditorCommand {
  const baseRevision = session.viewSpec.revision;
  const group = session.viewSpec.groups['property-group'];
  const rootItems = session.viewSpec.rootOrder.filter(nodeId =>
    source.items.some(item => item.id === nodeId),
  );
  const choice = Math.floor(random() * 7);

  if (choice === 0 && group === undefined && rootItems.length >= 2) {
    return envelope({
      id: `group-${step}`,
      type: 'createGroup',
      baseRevision,
      payload: {
        groupId: 'property-group',
        label: 'Property group',
        nodeIds: rootItems.slice(0, 2),
        initiallyCollapsed: false,
      },
    });
  }
  if (choice === 1 && group !== undefined) {
    return envelope({
      id: `collapse-${step}`,
      type: session.viewSpec.collapsedGroupIds.includes(group.id) ? 'expandGroup' : 'collapseGroup',
      baseRevision,
      payload: { groupId: group.id },
    } as Omit<EditorCommand, 'schemaVersion' | 'source'>);
  }
  if (choice === 2 && group !== undefined) {
    return envelope({
      id: `ungroup-${step}`,
      type: 'ungroup',
      baseRevision,
      payload: { groupId: group.id },
    });
  }
  if (choice === 3) {
    return envelope({
      id: `pin-${step}`,
      type: 'pinItem',
      baseRevision,
      payload: { itemId: 'd' },
    });
  }
  if (choice === 4) {
    return envelope({
      id: `unpin-${step}`,
      type: 'unpinItem',
      baseRevision,
      payload: { itemId: 'd' },
    });
  }
  if (choice === 5) {
    return envelope({
      id: `note-${step}`,
      type: 'setAnnotation',
      baseRevision,
      payload: { nodeId: 'a', text: step % 2 === 0 ? `note-${step}` : null },
    });
  }
  const itemId = rootItems[Math.floor(random() * rootItems.length)] ?? 'a';
  return envelope({
    id: `move-${step}`,
    type: 'moveItem',
    baseRevision,
    payload: {
      itemId,
      target: { containerId: 'root', index: Math.floor(random() * (rootItems.length + 1)) },
    },
  });
}

function action(id: string, session: EditorSession): SessionActionMeta {
  return { id, source: 'host', baseRevision: session.viewSpec.revision };
}

function assertProjectionInvariants(session: EditorSession): void {
  const result = projectCategoricalComparison(source, session.viewSpec);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    return;
  }

  const projectedSourceIds = result.value.flatMap(datum => datum.sourceIds);
  expect([...projectedSourceIds].sort()).toEqual(source.items.map(item => item.id).sort());
  expect(new Set(projectedSourceIds).size).toBe(source.items.length);

  for (const [order, datum] of result.value.entries()) {
    expect(datum.order).toBe(order);
    expect(datum.values.map(value => value.seriesId)).toEqual(
      source.series.map(series => series.id),
    );
    expect(datum).not.toHaveProperty('amount');
    for (const [seriesIndex, value] of datum.values.entries()) {
      const expected = datum.sourceIds.reduce((sum, sourceId) => {
        const item = source.items.find(candidate => candidate.id === sourceId);
        return sum + (item?.values[seriesIndex]?.amount ?? 0);
      }, 0);
      expect(value.amount).toBe(expected === 0 ? 0 : expected);
    }
  }
}

function runSeed(seed: number): EditorSession {
  const random = prng(seed);
  let current = initialSession();

  for (let step = 0; step < 100; step += 1) {
    const before = current;
    const sourceBefore = structuredClone(before.sourceData);
    const viewBefore = structuredClone(before.viewSpec);
    const operation = Math.floor(random() * 10);
    const result =
      operation === 8
        ? undoSession(current, action(`undo-${step}`, current))
        : operation === 9
          ? redoSession(current, action(`redo-${step}`, current))
          : executeCommand(current, commandFor(step, current, random));

    if (result.ok) {
      current = result.session;
    } else {
      expect(result.session).toBe(before);
    }
    expect(before.sourceData).toEqual(sourceBefore);
    expect(before.viewSpec).toEqual(viewBefore);
    expect(current.sourceData).toBe(source);
    expect(validateViewSpec(current.viewSpec, source).ok).toBe(true);
    assertProjectionInvariants(current);
  }

  expect(source).toEqual(sourceSnapshot);

  return current;
}

describe('comparison seeded command sequences', () => {
  it('leaves the property fixture and supplied view deep-equal after projection', () => {
    const current = initialSession();
    const sourceBefore = structuredClone(source);
    const viewBefore = structuredClone(current.viewSpec);

    expect(projectCategoricalComparison(source, current.viewSpec).ok).toBe(true);

    expect(source).toEqual(sourceBefore);
    expect(current.viewSpec).toEqual(viewBefore);
    expect(current.sourceData).toBe(source);
  });

  it('preserves source identity and independent per-series coverage under replay', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const first = runSeed(seed);
      const second = runSeed(seed);
      expect(second.viewSpec).toEqual(first.viewSpec);
      expect(second.undoStack).toEqual(first.undoStack);
      expect(second.redoStack).toEqual(first.redoStack);
      expect(second.processedActionIds).toEqual(first.processedActionIds);
    }
  });

  it('keeps every projected source identifier in narrative order, never series space', () => {
    const current = runSeed(41);
    const result = projectCategoricalComparison(source, current.viewSpec);
    if (!result.ok) {
      throw new Error('Expected a comparison projection');
    }
    const seriesIds = new Set(source.series.map(series => series.id));
    expect(
      result.value
        .flatMap(datum => datum.sourceIds as readonly ViewNodeId[])
        .every(sourceId => !seriesIds.has(sourceId)),
    ).toBe(true);
  });
});
