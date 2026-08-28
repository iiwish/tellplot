import { describe, expect, it } from 'vitest';

import {
  createInitialViewSpec,
  parseViewSpec,
  serializeViewSpec,
  viewSpecsEqual,
  type ValidationResult,
  type ViewSpec,
} from '../../src';
import { financialSourceData } from '../fixtures/financialSourceData';

function initialView(): ViewSpec {
  const result = createInitialViewSpec(financialSourceData);
  if (!result.ok) {
    throw new Error('Expected a valid persistence fixture');
  }
  return result.value;
}

function completeView(): ViewSpec {
  return {
    ...initialView(),
    revision: 7,
    rootOrder: ['profit-drivers', 'tax-impact'],
    groups: {
      'profit-drivers': {
        id: 'profit-drivers',
        label: '经营驱动',
        childIds: ['revenue-growth', 'cost-pressure'],
      },
    },
    collapsedGroupIds: ['profit-drivers'],
    pinnedItemIds: ['tax-impact'],
    annotations: {
      'tax-impact': '税率变化',
      'profit-drivers': '经营变化',
    },
    emphasis: {
      'tax-impact': 'muted',
      'profit-drivers': 'highlight',
    },
  };
}

function expectIssue(
  result: ValidationResult<ViewSpec>,
  expected: { readonly code: string; readonly reason: string; readonly path: string },
): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected parse failure');
  }
  expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
}

describe('ViewSpec persistence', () => {
  it('compares collapsed and pinned memberships without treating array order as state', () => {
    const first: ViewSpec = {
      ...completeView(),
      collapsedGroupIds: ['profit-drivers', 'secondary-drivers'],
      pinnedItemIds: ['tax-impact', 'cost-pressure'],
    };
    const reordered: ViewSpec = {
      ...first,
      collapsedGroupIds: ['secondary-drivers', 'profit-drivers'],
      pinnedItemIds: ['cost-pressure', 'tax-impact'],
    };

    expect(viewSpecsEqual(first, reordered)).toBe(true);
    expect(viewSpecsEqual(first, { ...reordered, pinnedItemIds: ['cost-pressure'] })).toBe(false);
    expect(viewSpecsEqual(first, { ...reordered, rootOrder: [...first.rootOrder].reverse() })).toBe(
      false,
    );
    const canonicallyDistinctIds: ViewSpec = {
      ...first,
      pinnedItemIds: ['\u00e9', 'e\u0301'],
    };
    expect(
      viewSpecsEqual(canonicallyDistinctIds, {
        ...canonicallyDistinctIds,
        pinnedItemIds: ['e\u0301', '\u00e9'],
      }),
    ).toBe(true);
    const unreadable = new Proxy(first, {
      get(target, property, receiver) {
        if (property === 'pinnedItemIds') {
          throw new Error('private view getter');
        }
        return Reflect.get(target, property, receiver);
      },
    });
    expect(viewSpecsEqual(first, unreadable)).toBe(false);
  });

  it('serializes deterministically and round-trips every supported field', () => {
    const view = completeView();
    const snapshot = structuredClone(view);

    const first = serializeViewSpec(view);
    const reorderedRecords: ViewSpec = {
      ...view,
      groups: { ...view.groups },
      annotations: {
        'profit-drivers': '经营变化',
        'tax-impact': '税率变化',
      },
      emphasis: {
        'profit-drivers': 'highlight',
        'tax-impact': 'muted',
      },
    };
    const second = serializeViewSpec(reorderedRecords);

    expect(first).toBe(second);
    expect(first).not.toContain('ledger:');
    expect(first).not.toContain('sourceRef');
    expect(view).toEqual(snapshot);

    const parsed = parseViewSpec(first, financialSourceData);
    expect(parsed).toEqual({ ok: true, value: view, errors: [] });
    if (parsed.ok) {
      expect(parsed.value).not.toBe(view);
      expect(parsed.value.groups).not.toBe(view.groups);
    }
  });

  it('uses locale-independent code-unit ordering for record keys', () => {
    const serialized = serializeViewSpec({
      ...initialView(),
      annotations: {
        ä: 'second by code unit',
        z: 'first by code unit',
      },
    });
    const parsed = JSON.parse(serialized) as { readonly annotations: Record<string, string> };

    expect(Object.keys(parsed.annotations)).toEqual(['z', 'ä']);
  });

  it('returns a stable unreadable-input issue for malformed JSON', () => {
    expectIssue(parseViewSpec('{"schemaVersion":', financialSourceData), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'UNREADABLE_INPUT',
      path: '/',
    });
  });

  it('rejects unsupported major schema versions without migration', () => {
    const parsed = JSON.parse(serializeViewSpec(initialView())) as Record<string, unknown>;
    parsed['schemaVersion'] = '4.0.0';

    expectIssue(parseViewSpec(JSON.stringify(parsed), financialSourceData), {
      code: 'UNSUPPORTED_SCHEMA_VERSION',
      reason: 'UNSUPPORTED_SCHEMA_VERSION',
      path: '/schemaVersion',
    });
  });

  it('reports dataset and source-reference conflicts without reconciliation', () => {
    const mismatched = { ...initialView(), datasetId: 'another-dataset' };
    expectIssue(parseViewSpec(JSON.stringify(mismatched), financialSourceData), {
      code: 'SOURCE_CONFLICT',
      reason: 'DATASET_ID_MISMATCH',
      path: '/datasetId',
    });

    const missing = {
      ...initialView(),
      rootOrder: ['revenue-growth', 'cost-pressure'],
    };
    expectIssue(parseViewSpec(JSON.stringify(missing), financialSourceData), {
      code: 'SOURCE_CONFLICT',
      reason: 'MISSING_SOURCE_REFERENCE',
      path: '/rootOrder',
    });

    const unresolved = {
      ...initialView(),
      rootOrder: ['revenue-growth', 'cost-pressure', 'tax-impact', 'not-in-source'],
    };
    expectIssue(parseViewSpec(JSON.stringify(unresolved), financialSourceData), {
      code: 'SOURCE_CONFLICT',
      reason: 'UNKNOWN_SOURCE_REFERENCE',
      path: '/rootOrder/3',
    });
  });

  it('rejects JSON values that are not ViewSpec objects', () => {
    expectIssue(parseViewSpec('null', financialSourceData), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'EXPECTED_OBJECT',
      path: '/',
    });
    expectIssue(parseViewSpec('[]', financialSourceData), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'EXPECTED_OBJECT',
      path: '/',
    });
  });
});
