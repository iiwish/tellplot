import { describe, expect, it } from 'vitest';

import type { CategoricalSourceData, CurrentViewSpec } from '../../src/domain/model';
import { projectCategorical } from '../../src/charts/categorical/projection';

const recursiveSource = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'recursive-categorical',
  items: [
    { id: 'alpha', label: 'Alpha', amount: 100 },
    { id: 'beta', label: 'Beta', amount: -20 },
    { id: 'gamma', label: 'Gamma', amount: 0 },
    { id: 'delta', label: 'Delta', amount: 5 },
  ],
} as const satisfies CategoricalSourceData;

function recursiveView(collapsedGroupIds: readonly ('inner' | 'outer')[]): CurrentViewSpec {
  return {
    schemaVersion: '2.0.0',
    chartType: 'column',
    datasetId: recursiveSource.datasetId,
    revision: 0,
    rootOrder: ['outer', 'delta'],
    groups: {
      inner: { id: 'inner', label: 'Inner group', childIds: ['alpha', 'beta'] },
      outer: { id: 'outer', label: 'Outer group', childIds: ['inner', 'gamma'] },
    },
    collapsedGroupIds,
    pinnedItemIds: ['beta'],
    annotations: {},
    emphasis: {},
  };
}

describe('categorical recursive projection', () => {
  it('emits a collapsed ancestor once with every descendant in logical leaf order', () => {
    const result = projectCategorical(recursiveSource, recursiveView(['inner', 'outer']));
    expect(result).toEqual({
      ok: true,
      value: [
        {
          nodeId: 'outer',
          label: 'Outer group',
          amount: 80,
          kind: 'group',
          sourceIds: ['alpha', 'beta', 'gamma'],
          locked: true,
          order: 0,
        },
        {
          nodeId: 'delta',
          label: 'Delta',
          amount: 5,
          kind: 'positive',
          sourceIds: ['delta'],
          locked: false,
          order: 1,
        },
      ],
      errors: [],
    });
  });

  it('omits expanded group data while preserving descendant collapse state and order', () => {
    const result = projectCategorical(recursiveSource, recursiveView(['inner']));
    expect(result).toEqual({
      ok: true,
      value: [
        {
          nodeId: 'inner',
          label: 'Inner group',
          amount: 80,
          kind: 'group',
          sourceIds: ['alpha', 'beta'],
          locked: true,
          order: 0,
        },
        {
          nodeId: 'gamma',
          label: 'Gamma',
          amount: 0,
          kind: 'positive',
          sourceIds: ['gamma'],
          locked: false,
          order: 1,
        },
        {
          nodeId: 'delta',
          label: 'Delta',
          amount: 5,
          kind: 'positive',
          sourceIds: ['delta'],
          locked: false,
          order: 2,
        },
      ],
      errors: [],
    });
  });
});

describe('categorical aggregation safety', () => {
  it('uses compensated summation for mixed-sign collapsed groups', () => {
    const source = {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: 'compensated-categorical',
      items: [
        { id: 'large-positive', label: 'Large positive', amount: 1_000_000_000_000_000 },
        { id: 'small-positive', label: 'Small positive', amount: 0.1 },
        { id: 'large-negative', label: 'Large negative', amount: -1_000_000_000_000_000 },
      ],
    } as const satisfies CategoricalSourceData;
    const view: CurrentViewSpec = {
      schemaVersion: '2.0.0',
      chartType: 'bar',
      datasetId: source.datasetId,
      revision: 0,
      rootOrder: ['mixed'],
      groups: {
        mixed: {
          id: 'mixed',
          label: 'Mixed group',
          childIds: ['large-positive', 'small-positive', 'large-negative'],
        },
      },
      collapsedGroupIds: ['mixed'],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    };
    const result = projectCategorical(source, view);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.amount).toBe(0.1);
      expect(result.value[0]?.kind).toBe('group');
    }
  });

  it('rejects an unsafe aggregate without returning a partial projection', () => {
    const source = {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: 'overflow-categorical',
      items: [
        { id: 'maximum', label: 'Maximum', amount: Number.MAX_SAFE_INTEGER },
        { id: 'overflow', label: 'Overflow', amount: 1 },
        { id: 'tail', label: 'Tail', amount: 0 },
      ],
    } as const satisfies CategoricalSourceData;
    const view: CurrentViewSpec = {
      schemaVersion: '2.0.0',
      chartType: 'column',
      datasetId: source.datasetId,
      revision: 0,
      rootOrder: ['unsafe-group', 'tail'],
      groups: {
        'unsafe-group': {
          id: 'unsafe-group',
          label: 'Unsafe group',
          childIds: ['maximum', 'overflow'],
        },
      },
      collapsedGroupIds: ['unsafe-group'],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    };
    const expectedFailure = {
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'INVALID_SOURCE_DATA',
          reason: 'UNSAFE_AMOUNT',
          path: '/items/1/amount',
          details: { operation: 'groupAggregate', sourceIndex: 1 },
        }),
      ],
    } as const;
    expect(projectCategorical(source, view)).toEqual(expectedFailure);

    const nestedView: CurrentViewSpec = {
      ...view,
      rootOrder: ['outer-group'],
      groups: {
        ...view.groups,
        'outer-group': {
          id: 'outer-group',
          label: 'Outer group',
          childIds: ['unsafe-group', 'tail'],
        },
      },
    };
    expect(projectCategorical(source, nestedView)).toEqual(expectedFailure);
  });
});
