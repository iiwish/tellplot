import { describe, expect, it } from 'vitest';

import type {
  CategoricalComparisonProjection,
  CategoricalComparisonViewSpec,
} from '@tellplot/core';
import { projectComparisonExpandedGroupRegions } from '../../src/charts/groupRegions';

const view = {
  schemaVersion: '3.0.0',
  datasetId: 'comparison-regions',
  chartType: 'column',
  revision: 0,
  rootOrder: ['outer'],
  groups: {
    inner: { id: 'inner', label: 'Inner', childIds: ['a', 'b'] },
    outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'c'] },
  },
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
} as const satisfies CategoricalComparisonViewSpec;

const projection = [
  {
    nodeId: 'a',
    label: 'A',
    values: [
      { seriesId: 'actual', label: 'Actual', amount: 4 },
      { seriesId: 'budget', label: 'Budget', amount: -9 },
    ],
    kind: 'category',
    sourceIds: ['a'],
    locked: false,
    order: 0,
  },
  {
    nodeId: 'b',
    label: 'B',
    values: [
      { seriesId: 'actual', label: 'Actual', amount: 12 },
      { seriesId: 'budget', label: 'Budget', amount: 3 },
    ],
    kind: 'category',
    sourceIds: ['b'],
    locked: false,
    order: 1,
  },
  {
    nodeId: 'c',
    label: 'C',
    values: [
      { seriesId: 'actual', label: 'Actual', amount: -2 },
      { seriesId: 'budget', label: 'Budget', amount: 5 },
    ],
    kind: 'category',
    sourceIds: ['c'],
    locked: false,
    order: 2,
  },
] as const satisfies CategoricalComparisonProjection;

describe('comparison expanded group regions', () => {
  it('uses every visible member times every series plus zero and anchors at the first cluster', () => {
    expect(projectComparisonExpandedGroupRegions(view, projection)).toEqual([
      {
        regionId: 'group-region:outer',
        groupId: 'outer',
        label: 'Outer',
        depth: 1,
        startNodeId: 'a',
        endNodeId: 'c',
        valueStart: -9,
        valueEnd: 12,
        labelValue: 12,
      },
      {
        regionId: 'group-region:inner',
        groupId: 'inner',
        label: 'Inner',
        depth: 2,
        startNodeId: 'a',
        endNodeId: 'b',
        valueStart: -9,
        valueEnd: 12,
        labelValue: 12,
      },
    ]);
  });

  it('omits collapsed groups and descendants hidden by a collapsed ancestor', () => {
    expect(
      projectComparisonExpandedGroupRegions({ ...view, collapsedGroupIds: ['outer'] }, [
        {
          nodeId: 'outer',
          label: 'Outer',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 14 },
            { seriesId: 'budget', label: 'Budget', amount: -1 },
          ],
          kind: 'group',
          sourceIds: ['a', 'b', 'c'],
          locked: false,
          order: 0,
        },
      ]),
    ).toEqual([]);
  });
});
