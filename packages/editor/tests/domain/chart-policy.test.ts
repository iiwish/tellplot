import { describe, expect, it } from 'vitest';

import {
  createEditorSession,
  executeCommand,
  redoSession,
  undoSession,
  validateViewSpec,
  type CategoricalSourceData,
  type CommandResult,
  type CreateGroupCommand,
  type EditorSession,
  type MoveItemCommand,
  type PinItemCommand,
  type SourceData,
} from '../../src';
import { createNarrativeChartPolicy } from '../../src/domain/chartPolicy';
import { commandSourceData } from '../fixtures/commandSourceData';

const categoricalSourceData = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'categorical-command-fixture',
  items: [
    { id: 'a', label: 'Alpha', amount: 10 },
    { id: 'b', label: 'Beta', amount: -3 },
    { id: 'c', label: 'Gamma', amount: 6 },
    { id: 'd', label: 'Delta', amount: 2 },
  ],
} as const satisfies CategoricalSourceData;

function sessionFrom(sourceData: SourceData = categoricalSourceData): EditorSession {
  const result = createEditorSession(sourceData);
  if (!result.ok) {
    throw new Error('Expected a valid editor session');
  }
  return result.value;
}

function success(result: CommandResult): EditorSession {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Expected command success, received ${result.error.code}`);
  }
  return result.session;
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
  groupId: string,
  nodeIds: readonly string[],
): CreateGroupCommand {
  return {
    schemaVersion: '1.0.0',
    id,
    type: 'createGroup',
    source: 'direct',
    baseRevision,
    payload: { groupId, label: 'Drivers', nodeIds, initiallyCollapsed: false },
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

describe('internal narrative chart policy', () => {
  it('identifies narrative items and segment compatibility by chart family', () => {
    const categorical = createNarrativeChartPolicy(categoricalSourceData);
    expect(categorical.sourceKind).toBe('categorical');
    expect(categorical.isMovableItem(categoricalSourceData, 'a')).toBe(true);
    expect(categorical.canShareContainer(categoricalSourceData, ['a', 'd'])).toBe(true);
    expect(categorical.canShareContainer(categoricalSourceData, [])).toBe(false);
    expect(categorical.canShareContainer(categoricalSourceData, ['a', 'missing'])).toBe(false);

    const waterfall = createNarrativeChartPolicy(commandSourceData);
    expect(waterfall.sourceKind).toBe('waterfall');
    expect(waterfall.isMovableItem(commandSourceData, 'start')).toBe(false);
    expect(waterfall.isMovableItem(commandSourceData, 'a')).toBe(true);
    expect(waterfall.canShareContainer(commandSourceData, ['a', 'b'])).toBe(true);
    expect(waterfall.canShareContainer(commandSourceData, ['a', 'd'])).toBe(false);
    expect(categorical.isMovableItem(commandSourceData, 'a')).toBe(true);
  });
});

describe('categorical command policy', () => {
  it('supports move, group and pin through the unchanged command wire format', () => {
    const initial = sessionFrom();
    expect(initial.viewSpec.chartType).toBe('column');

    const moved = success(executeCommand(initial, move('move-c', 0, 'c', 'root', 0)));
    expect(moved.viewSpec.rootOrder).toEqual(['c', 'a', 'b', 'd']);
    expect(moved.sourceData).toBe(initial.sourceData);
    expect(moved.viewSpec).toMatchObject({ schemaVersion: '2.0.0', chartType: 'column' });

    const grouped = success(executeCommand(moved, group('group-a-b', 1, 'drivers', ['a', 'b'])));
    expect(grouped.viewSpec.rootOrder).toEqual(['c', 'drivers', 'd']);
    expect(grouped.viewSpec.groups['drivers']?.childIds).toEqual(['a', 'b']);

    const groupedMoved = success(executeCommand(grouped, move('move-d', 2, 'd', 'drivers', 2)));
    expect(groupedMoved.viewSpec.groups['drivers']?.childIds).toEqual(['a', 'b', 'd']);

    const pinned = success(executeCommand(groupedMoved, pin('pin-a', 3, 'a')));
    const rejected = executeCommand(pinned, move('move-a', 4, 'a', 'root', 0));
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error).toMatchObject({ code: 'ITEM_LOCKED', reason: 'PINNED_ITEM' });
    }
    expect(validateViewSpec(pinned.viewSpec, categoricalSourceData).ok).toBe(true);

    const undone = undoSession(pinned, {
      id: 'undo-pin',
      source: 'keyboard',
      baseRevision: 4,
    });
    expect(undone.ok).toBe(true);
    if (!undone.ok) {
      return;
    }
    expect(undone.viewSpec).toMatchObject({ schemaVersion: '2.0.0', chartType: 'column' });

    const redone = redoSession(undone.session, {
      id: 'redo-pin',
      source: 'keyboard',
      baseRevision: 5,
    });
    expect(redone.ok).toBe(true);
    if (redone.ok) {
      expect(redone.viewSpec).toMatchObject({ schemaVersion: '2.0.0', chartType: 'column' });
    }
  });

  it('retains waterfall cross-segment restrictions', () => {
    const initial = sessionFrom(commandSourceData);
    const grouped = success(executeCommand(initial, group('group-a-b', 0, 'drivers', ['a', 'b'])));
    const rejected = executeCommand(grouped, move('cross-segment', 1, 'd', 'drivers', 2));

    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error).toMatchObject({
        code: 'INVALID_DROP_TARGET',
        reason: 'CROSS_SEGMENT',
      });
    }
  });
});
