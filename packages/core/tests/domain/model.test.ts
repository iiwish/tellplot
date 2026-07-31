import { describe, expect, expectTypeOf, it } from 'vitest';

import { createInitialViewSpec } from '../../src';
import type { GroupId, SourceItemId, ValidationResult, ViewNodeId, ViewSpec } from '../../src';
import { anchorsOnlySourceData, financialSourceData } from '../fixtures/financialSourceData';

function expectView(result: ValidationResult<ViewSpec>): ViewSpec {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected a valid initial ViewSpec');
  }
  return result.value;
}

describe('domain model', () => {
  it('keeps source and group IDs distinct while both remain view node IDs', () => {
    expectTypeOf<SourceItemId>().not.toEqualTypeOf<GroupId>();
    expectTypeOf<SourceItemId>().toMatchTypeOf<ViewNodeId>();
    expectTypeOf<GroupId>().toMatchTypeOf<ViewNodeId>();
  });

  it('creates the canonical initial waterfall view from contribution order', () => {
    const view = expectView(createInitialViewSpec(financialSourceData));

    expect(view).toEqual({
      schemaVersion: '1.0.0',
      datasetId: 'profit-bridge-2026-q1',
      chartType: 'waterfall',
      revision: 0,
      rootOrder: ['revenue-growth', 'cost-pressure', 'tax-impact'],
      groups: {},
      collapsedGroupIds: [],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    });
  });

  it('supports the valid empty state with only start and end anchors', () => {
    const view = expectView(createInitialViewSpec(anchorsOnlySourceData));

    expect(view.rootOrder).toEqual([]);
  });

  it('returns source validation errors instead of throwing for invalid source data', () => {
    const invalid = {
      ...financialSourceData,
      items: financialSourceData.items.map((item, index) =>
        index === 1 ? { ...item, amount: Number.NaN } : item,
      ),
    };

    const result = createInitialViewSpec(invalid);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({
        code: 'INVALID_SOURCE_DATA',
        reason: 'NON_FINITE_AMOUNT',
        path: '/items/1/amount',
      });
    }
  });

  it('creates deterministic plain data with independent containers', () => {
    const first = expectView(createInitialViewSpec(financialSourceData));
    const second = expectView(createInitialViewSpec(financialSourceData));

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.rootOrder).not.toBe(first.rootOrder);
    expect(second.groups).not.toBe(first.groups);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });
});
