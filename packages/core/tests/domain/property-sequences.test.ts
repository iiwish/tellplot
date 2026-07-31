import { describe, expect, it } from 'vitest';

import {
  createEditorSession,
  executeCommand,
  redoSession,
  undoSession,
  validateViewSpec,
  type EditorCommand,
  type EditorSession,
  type SessionActionMeta,
} from '../../src';
import { commandSourceData } from '../fixtures/commandSourceData';
import { collectLeafSourceIds } from '../../src/domain/viewTree';

function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function initialSession(): EditorSession {
  const result = createEditorSession(commandSourceData, { historyLimit: 24 });
  if (!result.ok) {
    throw new Error('Expected property fixture session');
  }
  return result.value;
}

function sourceCoverage(session: EditorSession): readonly string[] {
  return session.viewSpec.rootOrder
    .flatMap(nodeId => collectLeafSourceIds(session.viewSpec, nodeId))
    .sort();
}

function commandFor(step: number, session: EditorSession, random: () => number): EditorCommand {
  const id = `command-${step}`;
  const base = {
    schemaVersion: '1.0.0' as const,
    id,
    source: 'host' as const,
    baseRevision: session.viewSpec.revision,
  };
  const choice = Math.floor(random() * 8);
  const group = session.viewSpec.groups['property-group'];

  if (choice === 0) {
    const firstSegment = ['a', 'b', 'c'];
    const itemId = firstSegment[Math.floor(random() * firstSegment.length)] ?? 'a';
    const index = Math.floor(random() * 4);
    return {
      ...base,
      type: 'moveItem',
      payload: { itemId, target: { containerId: 'root', index } },
    };
  }
  if (choice === 1 && group === undefined) {
    return {
      ...base,
      type: 'createGroup',
      payload: {
        groupId: 'property-group',
        label: 'Property group',
        nodeIds: ['a', 'b'],
        initiallyCollapsed: false,
      },
    };
  }
  if (choice === 2 && group !== undefined) {
    return { ...base, type: 'ungroup', payload: { groupId: 'property-group' } };
  }
  if (choice === 3 && group !== undefined) {
    const collapsed = session.viewSpec.collapsedGroupIds.includes('property-group');
    return {
      ...base,
      type: collapsed ? 'expandGroup' : 'collapseGroup',
      payload: { groupId: 'property-group' },
    };
  }
  if (choice === 4) {
    return { ...base, type: 'pinItem', payload: { itemId: 'c' } };
  }
  if (choice === 5) {
    return { ...base, type: 'unpinItem', payload: { itemId: 'c' } };
  }
  if (choice === 6) {
    return {
      ...base,
      type: 'setAnnotation',
      payload: { nodeId: 'a', text: step % 2 === 0 ? `note-${step}` : null },
    };
  }
  return {
    ...base,
    type: 'moveItem',
    payload: { itemId: 'd', target: { containerId: 'root', index: 0 } },
  };
}

function historyAction(id: string, session: EditorSession): SessionActionMeta {
  return { id, source: 'host', baseRevision: session.viewSpec.revision };
}

function runSeed(seed: number): EditorSession {
  const random = prng(seed);
  let current = initialSession();
  const originalCoverage = sourceCoverage(current);
  let previousRevision = current.viewSpec.revision;

  for (let step = 0; step < 160; step += 1) {
    const operation = Math.floor(random() * 12);
    const before = current;
    const result =
      operation === 10
        ? undoSession(current, historyAction(`undo-${step}`, current))
        : operation === 11
          ? redoSession(current, historyAction(`redo-${step}`, current))
          : executeCommand(current, commandFor(step, current, random));

    if (result.ok) {
      current = result.session;
      expect(current.viewSpec.revision).toBeGreaterThanOrEqual(previousRevision);
      expect(JSON.stringify(result.event)).not.toContain('confidential');
    } else {
      expect(result.session).toBe(before);
      expect(JSON.stringify(result.error)).not.toContain('confidential');
    }

    expect(current.sourceData).toBe(before.sourceData);
    expect(validateViewSpec(current.viewSpec, current.sourceData).ok).toBe(true);
    expect(sourceCoverage(current)).toEqual(originalCoverage);
    previousRevision = current.viewSpec.revision;
  }

  return current;
}

describe('seeded command sequences', () => {
  it('preserves source coverage, identity, monotonic revisions and deterministic replay', () => {
    for (let seed = 1; seed <= 32; seed += 1) {
      const first = runSeed(seed);
      const second = runSeed(seed);

      expect(second.viewSpec).toEqual(first.viewSpec);
      expect(second.undoStack).toEqual(first.undoStack);
      expect(second.redoStack).toEqual(first.redoStack);
      expect(second.processedActionIds).toEqual(first.processedActionIds);
    }
  });
});
