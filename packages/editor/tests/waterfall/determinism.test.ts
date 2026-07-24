import { describe, expect, it } from 'vitest';

import { createInitialViewSpec } from '../../src/domain/createInitialViewSpec';
import type { SourceData, SourceItem, ViewSpec } from '../../src/domain/model';
import { projectWaterfall } from '../../src/charts/waterfall/projection';

function sourceData(items: readonly SourceItem[], datasetId: string): SourceData {
  return {
    schemaVersion: '1.0.0',
    datasetId,
    items,
  };
}

function initialView(source: SourceData): ViewSpec {
  const result = createInitialViewSpec(source);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected a valid determinism test fixture');
  }
  return result.value;
}

function projectionOf(source: SourceData, view: ViewSpec) {
  const result = projectWaterfall(source, view);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected waterfall projection to succeed');
  }
  return result.value;
}

const deterministicSource = sourceData(
  [
    { id: 'start', label: 'Opening', amount: 100, kind: 'start' },
    { id: 'a', label: 'A', amount: 20, kind: 'contribution' },
    { id: 'b', label: 'B', amount: -5, kind: 'contribution' },
    { id: 'c', label: 'C', amount: 2, kind: 'contribution' },
    { id: 'subtotal', label: 'Subtotal', amount: 117, kind: 'subtotal' },
    { id: 'd', label: 'D', amount: -7, kind: 'contribution' },
    { id: 'end', label: 'Closing', amount: 110, kind: 'end' },
  ],
  'deterministic-source',
);

const groupedSource = sourceData(
  [
    { id: 'start', label: 'Opening', amount: 0, kind: 'start' },
    { id: 'a-1', label: 'A1', amount: 1, kind: 'contribution' },
    { id: 'a-2', label: 'A2', amount: 2, kind: 'contribution' },
    { id: 'b-1', label: 'B1', amount: 3, kind: 'contribution' },
    { id: 'b-2', label: 'B2', amount: 4, kind: 'contribution' },
    { id: 'end', label: 'Closing', amount: 10, kind: 'end' },
  ],
  'grouped-deterministic-source',
);

function groupedView(collapsedGroupIds: readonly string[]): ViewSpec {
  return {
    ...initialView(groupedSource),
    rootOrder: ['group-a', 'group-b'],
    groups: {
      'group-a': {
        id: 'group-a',
        label: 'Group A',
        childIds: ['a-1', 'a-2'],
      },
      'group-b': {
        id: 'group-b',
        label: 'Group B',
        childIds: ['b-1', 'b-2'],
      },
    },
    collapsedGroupIds,
  };
}

describe('waterfall projection determinism', () => {
  it('returns deep-equal JSON-compatible plain data for repeated calls', () => {
    const view = initialView(deterministicSource);

    const first = projectionOf(deterministicSource, view);
    const second = projectionOf(deterministicSource, view);

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    first.forEach((firstDatum, index) => {
      const secondDatum = second[index];
      if (secondDatum === undefined) {
        throw new Error('Repeated projection has a different length');
      }
      expect(Object.getPrototypeOf(firstDatum)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(firstDatum.sourceIds)).toBe(Array.prototype);
      expect(secondDatum).not.toBe(firstDatum);
      expect(secondDatum.sourceIds).not.toBe(firstDatum.sourceIds);
    });
  });

  it('keeps absolute anchor results stable for legal permutations within a segment', () => {
    const base = initialView(deterministicSource);
    const firstView: ViewSpec = { ...base, rootOrder: ['a', 'b', 'c', 'd'] };
    const permutedView: ViewSpec = { ...base, rootOrder: ['c', 'a', 'b', 'd'] };

    const firstAnchors = projectionOf(deterministicSource, firstView).filter(
      datum => datum.kind === 'start' || datum.kind === 'subtotal' || datum.kind === 'end',
    );
    const permutedAnchors = projectionOf(deterministicSource, permutedView).filter(
      datum => datum.kind === 'start' || datum.kind === 'subtotal' || datum.kind === 'end',
    );

    expect(permutedAnchors).toEqual(firstAnchors);
  });

  it('treats collapsedGroupIds as membership rather than display order', () => {
    const first = projectionOf(groupedSource, groupedView(['group-a', 'group-b']));
    const reversed = projectionOf(groupedSource, groupedView(['group-b', 'group-a']));

    expect(reversed).toEqual(first);
    expect(first.map(datum => datum.nodeId)).toEqual(['start', 'group-a', 'group-b', 'end']);
  });

  it('does not alias projection arrays or sourceIds to input containers', () => {
    const view = groupedView(['group-a']);
    const first = projectionOf(groupedSource, view);
    const second = projectionOf(groupedSource, view);

    expect(first).not.toBe(groupedSource.items);
    expect(first).not.toBe(view.rootOrder);
    expect(first).not.toBe(view.collapsedGroupIds);
    expect(first).not.toBe(second);

    const groupA = view.groups['group-a'];
    const groupB = view.groups['group-b'];
    if (groupA === undefined || groupB === undefined) {
      throw new Error('Expected both deterministic groups');
    }
    const inputArrays: readonly (readonly unknown[])[] = [
      groupedSource.items,
      view.rootOrder,
      view.collapsedGroupIds,
      view.pinnedItemIds,
      groupA.childIds,
      groupB.childIds,
    ];

    first.forEach((datum, index) => {
      const secondDatum = second[index];
      if (secondDatum === undefined) {
        throw new Error('Repeated projection has a different length');
      }
      expect(inputArrays.some(input => input === datum.sourceIds)).toBe(false);
      expect(datum.sourceIds).not.toBe(secondDatum.sourceIds);
    });
    expect(first.find(datum => datum.nodeId === 'group-a')?.sourceIds).toEqual(['a-1', 'a-2']);
  });
});

describe('waterfall projection validation boundaries', () => {
  it('returns structural source and view failures without partial projection data', () => {
    const validView = initialView(deterministicSource);
    const invalidSource = {
      ...deterministicSource,
      items: deterministicSource.items.slice(0, -1),
    } as SourceData;
    const invalidView = {
      ...validView,
      rootOrder: ['a', 'b', 'd'],
    } as ViewSpec;

    const sourceFailure = projectWaterfall(invalidSource, validView);
    const viewFailure = projectWaterfall(deterministicSource, invalidView);

    expect(sourceFailure).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_SOURCE_DATA', reason: 'INVALID_ANCHOR' }],
    });
    expect(viewFailure).toMatchObject({
      ok: false,
      errors: [{ code: 'SOURCE_CONFLICT', reason: 'MISSING_SOURCE_REFERENCE' }],
    });
    expect(sourceFailure).not.toHaveProperty('value');
    expect(viewFailure).not.toHaveProperty('value');
  });

  it('contains hostile source and view reflection failures without throwing or leaking trap text', () => {
    const validView = initialView(deterministicSource);
    const sourceSecret = 'source proxy financial secret';
    const viewSecret = 'view proxy financial secret';
    const hostileSource = new Proxy(
      {},
      {
        ownKeys(): never {
          throw new Error(sourceSecret);
        },
      },
    ) as unknown as SourceData;
    const hostileView = new Proxy(
      {},
      {
        ownKeys(): never {
          throw new Error(viewSecret);
        },
      },
    ) as unknown as ViewSpec;

    let sourceResult: ReturnType<typeof projectWaterfall> | undefined;
    let viewResult: ReturnType<typeof projectWaterfall> | undefined;
    expect(() => {
      sourceResult = projectWaterfall(hostileSource, validView);
    }).not.toThrow();
    expect(() => {
      viewResult = projectWaterfall(deterministicSource, hostileView);
    }).not.toThrow();

    expect(sourceResult).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_SOURCE_DATA', reason: 'UNREADABLE_INPUT', path: '/' }],
    });
    expect(viewResult).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_VIEW_SPEC', reason: 'UNREADABLE_INPUT', path: '/' }],
    });
    expect(JSON.stringify(sourceResult)).not.toContain(sourceSecret);
    expect(JSON.stringify(viewResult)).not.toContain(viewSecret);
    expect(sourceResult).not.toHaveProperty('value');
    expect(viewResult).not.toHaveProperty('value');
  });

  it('rejects view accessors without executing them or exposing their text', () => {
    const accessorSecret = 'view accessor financial secret';
    let getterCalled = false;
    const accessorView = { ...initialView(deterministicSource) };
    Object.defineProperty(accessorView, 'rootOrder', {
      enumerable: true,
      get(): never {
        getterCalled = true;
        throw new Error(accessorSecret);
      },
    });

    let result: ReturnType<typeof projectWaterfall> | undefined;
    expect(() => {
      result = projectWaterfall(deterministicSource, accessorView);
    }).not.toThrow();

    expect(getterCalled).toBe(false);
    expect(result).toMatchObject({ ok: false });
    expect(result?.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_VIEW_SPEC',
          reason: 'NON_PLAIN_DATA',
          path: '/rootOrder',
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain(accessorSecret);
    expect(result).not.toHaveProperty('value');
  });
});
