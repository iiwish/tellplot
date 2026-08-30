import { describe, expect, it } from 'vitest';

import type {
  CategoricalComparisonProjection,
  CategoricalComparisonViewSpec,
} from '@tellplot/core';
import { outlineEntries } from '../../src/editor/outline';

describe('comparison outline generation guard', () => {
  it('keeps category rows and collapsed groups free of cross-series totals', () => {
    const view = {
      schemaVersion: '3.0.0',
      datasetId: 'outline-comparison',
      chartType: 'column',
      revision: 0,
      rootOrder: ['group'],
      groups: { group: { id: 'group', label: 'Group', childIds: ['a', 'b'] } },
      collapsedGroupIds: ['group'],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    } as const satisfies CategoricalComparisonViewSpec;
    const projection = [
      {
        nodeId: 'group',
        label: 'Group',
        values: [
          { seriesId: 'actual', label: 'Actual', amount: 30 },
          { seriesId: 'budget', label: 'Budget', amount: 20 },
        ],
        kind: 'group',
        sourceIds: ['a', 'b'],
        locked: false,
        order: 0,
      },
    ] as const satisfies CategoricalComparisonProjection;

    expect(outlineEntries(view, projection, 'categorical', 'comparison')).toEqual([
      expect.objectContaining({ nodeId: 'group', amount: null, kind: 'group', expanded: false }),
    ]);
  });
});
