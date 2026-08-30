import { describe, expect, it } from 'vitest';

import type { ViewSpec } from '../../src/domain/model';
import {
  categoryCoordinate,
  projectChartCategoryBounds,
  projectChartCategorySourceGroupBounds,
  resolveChartCategoryDropTarget,
  resolveChartCategoryMinimumTargetHit,
  resolveChartCategorySourceGroupExitTarget,
  type CategoryAxis,
  type ChartCategoryBounds,
  type ChartCategoryDropInput,
  type ChartSceneRectangle,
} from '../../src/interactions/categoryAxis';

const horizontalSceneBounds = [
  { nodeId: 'left', minX: 20, minY: 10, maxX: 60, maxY: 90 },
  { nodeId: 'middle', minX: 100, minY: 20, maxX: 140, maxY: 80 },
  { nodeId: 'right', minX: 180, minY: 30, maxX: 220, maxY: 70 },
] as const satisfies readonly ChartSceneRectangle[];

const verticalSceneBounds = [
  { nodeId: 'left', minX: 10, minY: 20, maxX: 90, maxY: 60 },
  { nodeId: 'middle', minX: 20, minY: 100, maxX: 80, maxY: 140 },
  { nodeId: 'right', minX: 30, minY: 180, maxX: 70, maxY: 220 },
] as const satisfies readonly ChartSceneRectangle[];

function categoryBounds(
  sceneBounds: readonly ChartSceneRectangle[],
  axis: CategoryAxis,
): readonly ChartCategoryBounds[] {
  return sceneBounds.map(bounds => {
    const projected = projectChartCategoryBounds(bounds, axis);
    if (projected === undefined) {
      throw new Error('Expected valid category bounds');
    }
    return projected;
  });
}

function dropInput(
  axis: CategoryAxis,
  orderedBounds: readonly ChartCategoryBounds[],
  start: { readonly x: number; readonly y: number },
  current: { readonly x: number; readonly y: number },
  overrides: Partial<ChartCategoryDropInput> = {},
): ChartCategoryDropInput {
  return {
    axis,
    itemId: 'middle',
    startPointer: start,
    pointer: current,
    orderedBounds,
    boundsRevision: 7,
    currentRevision: 7,
    minimumDragDistance: 4,
    ...overrides,
  };
}

describe('category-axis projection', () => {
  it('projects renderer-owned rectangles onto X or Y min/center/max', () => {
    const bounds = {
      nodeId: 'node',
      minX: 10,
      minY: 30,
      maxX: 50,
      maxY: 90,
    } as const;
    expect(projectChartCategoryBounds(bounds, 'x')).toEqual({
      nodeId: 'node',
      min: 10,
      center: 30,
      max: 50,
    });
    expect(projectChartCategoryBounds(bounds, 'y')).toEqual({
      nodeId: 'node',
      min: 30,
      center: 60,
      max: 90,
    });
    expect(categoryCoordinate({ x: 12, y: 34 }, 'x')).toBe(12);
    expect(categoryCoordinate({ x: 12, y: 34 }, 'y')).toBe(34);
  });

  it('rejects invalid rectangles, coordinates and runtime axes without throwing', () => {
    expect(
      projectChartCategoryBounds({ nodeId: 'invalid', minX: 10, minY: 0, maxX: 5, maxY: 20 }, 'x'),
    ).toBeUndefined();
    expect(
      projectChartCategoryBounds(
        { nodeId: 'invalid', minX: 0, minY: 0, maxX: Number.NaN, maxY: 20 },
        'y',
      ),
    ).toBeUndefined();
    expect(categoryCoordinate({ x: Number.POSITIVE_INFINITY, y: 0 }, 'x')).toBeUndefined();
    expect(categoryCoordinate({ x: 0, y: 0 }, 'z' as CategoryAxis)).toBeUndefined();
  });
});

describe('category-axis drop collision', () => {
  it('separates in-group reorder from direct and nested group exit boundaries', () => {
    const viewSpec: ViewSpec = {
      schemaVersion: '1.0.0',
      datasetId: 'group-boundary-fixture',
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
    const visibleBounds = [
      { nodeId: 'a', min: 20, center: 40, max: 60 },
      { nodeId: 'b', min: 100, center: 120, max: 140 },
      { nodeId: 'c', min: 180, center: 200, max: 220 },
      { nodeId: 'd', min: 260, center: 280, max: 300 },
    ] as const satisfies readonly ChartCategoryBounds[];
    const sourceGroups = projectChartCategorySourceGroupBounds(viewSpec, 'a', visibleBounds);

    expect(sourceGroups).toEqual([
      { nodeId: 'inner', min: 20, max: 140 },
      { nodeId: 'outer', min: 20, max: 220 },
    ]);
    expect(
      resolveChartCategorySourceGroupExitTarget(
        'x',
        { x: 40, y: 0 },
        { x: 140, y: 1_000 },
        sourceGroups,
      ),
    ).toBeUndefined();
    expect(
      resolveChartCategorySourceGroupExitTarget(
        'x',
        { x: 40, y: 0 },
        { x: 141, y: -1_000 },
        sourceGroups,
      ),
    ).toEqual({ nodeId: 'inner', edge: 'after', target: 140 });
    expect(
      resolveChartCategorySourceGroupExitTarget(
        'x',
        { x: 40, y: 0 },
        { x: 221, y: 0 },
        sourceGroups,
      ),
    ).toEqual({ nodeId: 'outer', edge: 'after', target: 220 });
    expect(
      resolveChartCategorySourceGroupExitTarget(
        'x',
        { x: 40, y: 0 },
        { x: 19, y: 0 },
        sourceGroups,
      ),
    ).toEqual({ nodeId: 'outer', edge: 'before', target: 20 });
  });

  it('crosses at the exact renderer edge and uses the source mark width', () => {
    const bounds = [
      { nodeId: 'narrow', min: 100, center: 110, max: 120 },
      { nodeId: 'wide', min: 180, center: 210, max: 240 },
    ] as const satisfies readonly ChartCategoryBounds[];
    const input = dropInput(
      'x',
      bounds,
      { x: 105, y: 0 },
      { x: 164.99, y: 0 },
      { itemId: 'narrow', minimumDragDistance: 0 },
    );
    expect(resolveChartCategoryDropTarget(input)).toEqual({ ok: false, reason: 'NO_TARGET' });
    expect(resolveChartCategoryDropTarget({ ...input, pointer: { x: 165, y: 0 } })).toEqual({
      ok: true,
      target: { nodeId: 'wide', edge: 'after', target: 240 },
    });
  });

  it('returns the same logical target for equivalent X and top-to-bottom Y gestures', () => {
    const xResult = resolveChartCategoryDropTarget(
      dropInput(
        'x',
        categoryBounds(horizontalSceneBounds, 'x'),
        { x: 120, y: 500 },
        {
          x: 160,
          y: -500,
        },
      ),
    );
    const yResult = resolveChartCategoryDropTarget(
      dropInput(
        'y',
        categoryBounds(verticalSceneBounds, 'y'),
        { x: 500, y: 120 },
        {
          x: -500,
          y: 160,
        },
      ),
    );
    expect(xResult).toEqual({
      ok: true,
      target: { nodeId: 'right', edge: 'after', target: 220 },
    });
    expect(yResult).toEqual(xResult);
  });

  it('ignores value-axis movement and distinguishes threshold from no target', () => {
    const bounds = categoryBounds(verticalSceneBounds, 'y');
    expect(
      resolveChartCategoryDropTarget(
        dropInput('y', bounds, { x: 0, y: 120 }, { x: 10_000, y: 123.99 }),
      ),
    ).toEqual({ ok: false, reason: 'BELOW_THRESHOLD' });
    expect(
      resolveChartCategoryDropTarget(
        dropInput('y', bounds, { x: 0, y: 120 }, { x: 10_000, y: 124 }),
      ),
    ).toEqual({ ok: false, reason: 'NO_TARGET' });
    expect(
      resolveChartCategoryDropTarget(
        dropInput('y', bounds, { x: 0, y: 120 }, { x: 10_000, y: 120 }),
      ),
    ).toEqual({ ok: false, reason: 'BELOW_THRESHOLD' });
  });

  it('selects the furthest crossed sibling for forward and reverse motion', () => {
    const bounds = categoryBounds(horizontalSceneBounds, 'x');
    expect(
      resolveChartCategoryDropTarget(
        dropInput('x', bounds, { x: 120, y: 0 }, { x: 240, y: 0 }, { itemId: 'left' }),
      ),
    ).toEqual({ ok: true, target: { nodeId: 'right', edge: 'after', target: 220 } });
    expect(
      resolveChartCategoryDropTarget(
        dropInput('x', bounds, { x: 200, y: 0 }, { x: 80, y: 0 }, { itemId: 'right' }),
      ),
    ).toEqual({ ok: true, target: { nodeId: 'left', edge: 'before', target: 20 } });
  });

  it('returns stable failures for stale, missing, invalid and ineligible candidate sets', () => {
    const bounds = categoryBounds(horizontalSceneBounds, 'x');
    const base = dropInput('x', bounds, { x: 120, y: 0 }, { x: 160, y: 0 });
    expect(resolveChartCategoryDropTarget({ ...base, currentRevision: 8 })).toEqual({
      ok: false,
      reason: 'STALE_BOUNDS',
    });
    expect(resolveChartCategoryDropTarget({ ...base, itemId: 'missing' })).toEqual({
      ok: false,
      reason: 'SOURCE_NOT_FOUND',
    });
    expect(
      resolveChartCategoryDropTarget({
        ...base,
        orderedBounds: [{ nodeId: 'middle', min: 10, center: 5, max: 0 }],
      }),
    ).toEqual({ ok: false, reason: 'INVALID_BOUNDS' });
    expect(
      resolveChartCategoryDropTarget({
        ...base,
        orderedBounds: [bounds[1] as ChartCategoryBounds],
      }),
    ).toEqual({ ok: false, reason: 'NO_TARGET' });
    expect(resolveChartCategoryDropTarget({ ...base, minimumDragDistance: -1 })).toEqual({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(resolveChartCategoryDropTarget({ ...base, boundsRevision: 1.5 })).toEqual({
      ok: false,
      reason: 'INVALID_INPUT',
    });
  });

  it('skips invalid non-source candidates without guessing replacement dimensions', () => {
    const bounds = categoryBounds(horizontalSceneBounds, 'x');
    expect(
      resolveChartCategoryDropTarget({
        ...dropInput('x', bounds, { x: 40, y: 0 }, { x: 200, y: 0 }),
        itemId: 'left',
        orderedBounds: [
          bounds[0] as ChartCategoryBounds,
          { nodeId: 'invalid', min: 180, center: Number.NaN, max: 220 },
          bounds[2] as ChartCategoryBounds,
        ],
      }),
    ).toEqual({ ok: true, target: { nodeId: 'right', edge: 'after', target: 220 } });
    expect(
      resolveChartCategoryDropTarget({
        ...dropInput('x', bounds, { x: 200, y: 0 }, { x: 40, y: 0 }),
        itemId: 'right',
        orderedBounds: [
          bounds[0] as ChartCategoryBounds,
          { nodeId: 'invalid', min: 20, center: Number.NaN, max: 60 },
          bounds[2] as ChartCategoryBounds,
        ],
      }),
    ).toEqual({ ok: true, target: { nodeId: 'left', edge: 'before', target: 20 } });
  });
});

describe('category-axis minimum pointer target', () => {
  it('keeps two-dimensional hit testing while selecting edge on X or Y', () => {
    const bounds = [{ nodeId: 'narrow', minX: 100, minY: 100, maxX: 110, maxY: 110 }];
    expect(resolveChartCategoryMinimumTargetHit({ x: 92, y: 105 }, bounds, 32, 'x')).toEqual({
      ok: true,
      hit: { nodeId: 'narrow', edge: 'before', min: 100, max: 110, target: 100 },
    });
    expect(resolveChartCategoryMinimumTargetHit({ x: 105, y: 118 }, bounds, 32, 'y')).toEqual({
      ok: true,
      hit: { nodeId: 'narrow', edge: 'after', min: 100, max: 110, target: 110 },
    });
  });

  it('chooses the nearest real mark and rejects invalid input or misses', () => {
    const bounds = [
      { nodeId: 'invalid', minX: 10, minY: 10, maxX: 5, maxY: 20 },
      { nodeId: 'left', minX: 100, minY: 100, maxX: 108, maxY: 110 },
      { nodeId: 'right', minX: 120, minY: 100, maxX: 128, maxY: 110 },
    ];
    expect(resolveChartCategoryMinimumTargetHit({ x: 115, y: 105 }, bounds, 32, 'x')).toEqual({
      ok: true,
      hit: { nodeId: 'right', edge: 'before', min: 120, max: 128, target: 120 },
    });
    expect(resolveChartCategoryMinimumTargetHit({ x: 50, y: 50 }, bounds, 32, 'x')).toEqual({
      ok: false,
      reason: 'NO_TARGET',
    });
    expect(resolveChartCategoryMinimumTargetHit({ x: 50, y: 50 }, bounds, 0, 'x')).toEqual({
      ok: false,
      reason: 'INVALID_INPUT',
    });
  });

  it('partitions overlapping minimum targets at the axis midpoint with earlier-order ties', () => {
    const bounds = [
      { nodeId: 'earlier', minX: 100, minY: 100, maxX: 108, maxY: 110 },
      { nodeId: 'later', minX: 120, minY: 100, maxX: 128, maxY: 110 },
    ];
    expect(resolveChartCategoryMinimumTargetHit({ x: 114, y: 105 }, bounds, 32, 'x')).toEqual({
      ok: true,
      hit: { nodeId: 'earlier', edge: 'after', min: 100, max: 108, target: 108 },
    });
    expect(resolveChartCategoryMinimumTargetHit({ x: 114.01, y: 105 }, bounds, 32, 'x')).toEqual({
      ok: true,
      hit: { nodeId: 'later', edge: 'before', min: 120, max: 128, target: 120 },
    });
  });
});
