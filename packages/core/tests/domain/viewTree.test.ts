import { describe, expect, it } from 'vitest';

import type { ViewSpec } from '../../src/domain/model';
import {
  collectLeafSourceIds,
  containerChildren,
  groupContainsGroup,
  groupDepth,
  locateViewNode,
  ownGroup,
} from '../../src/domain/viewTree';

function nestedView(): ViewSpec {
  return {
    schemaVersion: '1.0.0',
    datasetId: 'tree-fixture',
    chartType: 'waterfall',
    revision: 0,
    rootOrder: ['outer', 'd'],
    groups: {
      inner: { id: 'inner', label: 'Inner', childIds: ['a', 'b'] },
      outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
    },
    collapsedGroupIds: [],
    pinnedItemIds: [],
    annotations: {},
    emphasis: {},
  };
}

describe('recursive view tree helpers', () => {
  it('derives ownership, locations, children, leaves and depth without caches', () => {
    const view = nestedView();

    expect(ownGroup(view, 'outer')?.id).toBe('outer');
    expect(ownGroup(view, 'missing')).toBeUndefined();
    expect(containerChildren(view, 'root')).toBe(view.rootOrder);
    expect(containerChildren(view, 'inner')).toBe(view.groups['inner']?.childIds);
    expect(containerChildren(view, 'missing')).toBeUndefined();
    expect(locateViewNode(view, 'outer')).toEqual({
      containerId: 'root',
      index: 0,
      values: view.rootOrder,
    });
    expect(locateViewNode(view, 'b')).toEqual({
      containerId: 'inner',
      index: 1,
      values: view.groups['inner']?.childIds,
    });
    expect(locateViewNode(view, 'missing')).toBeUndefined();
    expect(collectLeafSourceIds(view, 'outer')).toEqual(['a', 'b', 'c']);
    expect(collectLeafSourceIds(view, 'd')).toEqual(['d']);
    expect(groupDepth(view, 'outer')).toBe(1);
    expect(groupDepth(view, 'inner')).toBe(2);
    expect(groupDepth(view, 'missing')).toBe(1);
  });

  it('searches descendants defensively even for a cyclic unvalidated fixture', () => {
    const cyclic: ViewSpec = {
      ...nestedView(),
      rootOrder: [],
      groups: {
        first: { id: 'first', label: 'First', childIds: ['second', 'a'] },
        second: { id: 'second', label: 'Second', childIds: ['first', 'b'] },
      },
    };

    expect(groupContainsGroup(cyclic, 'first', 'second')).toBe(true);
    expect(groupContainsGroup(cyclic, 'first', 'missing')).toBe(false);
    expect(groupContainsGroup(cyclic, 'missing', 'first')).toBe(false);
    expect(groupDepth(cyclic, 'second')).toBe(3);
  });
});
