import { describe, expect, it } from 'vitest';

import type { SourceData, ViewSpec } from '../../src/domain/model';
import { projectWaterfall } from '../../src/waterfall/projectWaterfall';

const sourceData: SourceData = {
  schemaVersion: '1.0.0',
  datasetId: 'recursive-projection',
  items: [
    { id: 'start', label: 'Start', amount: 100, kind: 'start' },
    { id: 'a', label: 'A', amount: 10, kind: 'contribution' },
    { id: 'b', label: 'B', amount: -4, kind: 'contribution' },
    { id: 'c', label: 'C', amount: 6, kind: 'contribution' },
    { id: 'd', label: 'D', amount: -2, kind: 'contribution' },
    { id: 'end', label: 'End', amount: 110, kind: 'end' },
  ],
};

function nestedView(collapsedGroupIds: readonly string[]): ViewSpec {
  return {
    schemaVersion: '1.0.0',
    datasetId: sourceData.datasetId,
    chartType: 'waterfall',
    revision: 0,
    rootOrder: ['outer', 'd'],
    groups: {
      inner: { id: 'inner', label: 'Inner', childIds: ['a', 'b'] },
      outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
    },
    collapsedGroupIds,
    pinnedItemIds: [],
    annotations: {},
    emphasis: {},
  };
}

describe('recursive waterfall projection', () => {
  it('projects a three-level tree without duplicating or losing leaves', () => {
    const view: ViewSpec = {
      ...nestedView([]),
      rootOrder: ['level-3'],
      groups: {
        'level-1': { id: 'level-1', label: 'Level 1', childIds: ['a', 'b'] },
        'level-2': { id: 'level-2', label: 'Level 2', childIds: ['level-1', 'c'] },
        'level-3': { id: 'level-3', label: 'Level 3', childIds: ['level-2', 'd'] },
      },
      collapsedGroupIds: ['level-2'],
    };

    const result = projectWaterfall(sourceData, view);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.map(datum => datum.nodeId)).toEqual(['start', 'level-2', 'd', 'end']);
    expect(result.value[1]).toMatchObject({
      nodeId: 'level-2',
      sourceIds: ['a', 'b', 'c'],
      groupPath: ['level-3', 'level-2'],
      depth: 2,
    });
    expect(result.value.flatMap(datum => datum.sourceIds).sort()).toEqual([
      'a',
      'b',
      'c',
      'd',
      'end',
      'start',
    ]);
  });

  it('shows a collapsed inner group inside an expanded parent and preserves ordered leaves', () => {
    const result = projectWaterfall(sourceData, nestedView(['inner']));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.map(datum => datum.nodeId)).toEqual(['start', 'inner', 'c', 'd', 'end']);
    expect(result.value[1]).toMatchObject({
      nodeId: 'inner',
      amount: 6,
      start: 100,
      end: 106,
      sourceIds: ['a', 'b'],
      groupPath: ['outer', 'inner'],
      depth: 2,
    });
    expect(result.value[2]).toMatchObject({ nodeId: 'c', start: 106, end: 112, depth: 2 });
  });

  it('collapses an outer group to one aggregate without clearing descendant collapse state', () => {
    const view = nestedView(['inner', 'outer']);
    const result = projectWaterfall(sourceData, view);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.map(datum => datum.nodeId)).toEqual(['start', 'outer', 'd', 'end']);
    expect(result.value[1]).toMatchObject({
      nodeId: 'outer',
      amount: 12,
      sourceIds: ['a', 'b', 'c'],
      groupPath: ['outer'],
      depth: 1,
    });
    expect(view.collapsedGroupIds).toEqual(['inner', 'outer']);
  });
});
