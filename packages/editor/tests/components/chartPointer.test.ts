import { describe, expect, it } from 'vitest';

import {
  resolveChartHorizontalDropTarget,
  resolveChartMinimumTargetHit,
} from '../../src/interactions/chartPointer';

const orderedBounds = [
  { nodeId: 'left', minX: 20, maxX: 60 },
  { nodeId: 'middle', minX: 100, maxX: 140 },
  { nodeId: 'right', minX: 180, maxX: 220 },
] as const;

describe('chart horizontal drag geometry', () => {
  it('targets the next sibling when the dragged right edge reaches its left edge', () => {
    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'middle',
        startPointerX: 120,
        pointerX: 159.99,
        orderedBounds,
      }),
    ).toBeNull();

    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'middle',
        startPointerX: 120,
        pointerX: 160,
        orderedBounds,
      }),
    ).toEqual({ nodeId: 'right', edge: 'after', targetX: 220 });
  });

  it('targets the previous sibling when the dragged left edge reaches its right edge', () => {
    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'middle',
        startPointerX: 120,
        pointerX: 80.01,
        orderedBounds,
      }),
    ).toBeNull();

    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'middle',
        startPointerX: 120,
        pointerX: 80,
        orderedBounds,
      }),
    ).toEqual({ nodeId: 'left', edge: 'before', targetX: 20 });
  });

  it('selects the furthest crossed sibling and returns null at the origin', () => {
    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'left',
        startPointerX: 40,
        pointerX: 40,
        orderedBounds,
      }),
    ).toBeNull();
    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'left',
        startPointerX: 40,
        pointerX: 160,
        orderedBounds,
      }),
    ).toEqual({ nodeId: 'right', edge: 'after', targetX: 220 });
  });

  it('selects the furthest crossed sibling when moving left', () => {
    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'right',
        startPointerX: 200,
        pointerX: 80,
        orderedBounds,
      }),
    ).toEqual({ nodeId: 'left', edge: 'before', targetX: 20 });
  });

  it('uses each rendered bar width instead of a fixed collision threshold', () => {
    const bounds = [
      { nodeId: 'narrow', minX: 100, maxX: 120 },
      { nodeId: 'wide', minX: 180, maxX: 240 },
    ] as const;
    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'narrow',
        startPointerX: 105,
        pointerX: 164.99,
        orderedBounds: bounds,
      }),
    ).toBeNull();
    expect(
      resolveChartHorizontalDropTarget({
        itemId: 'narrow',
        startPointerX: 105,
        pointerX: 165,
        orderedBounds: bounds,
      }),
    ).toEqual({ nodeId: 'wide', edge: 'after', targetX: 240 });
  });
});

describe('chart minimum pointer target', () => {
  it('expands a narrow rendered mark to a 32px target while preserving its real bounds', () => {
    expect(
      resolveChartMinimumTargetHit(
        { pointerId: 7, x: 92, y: 105 },
        [{ nodeId: 'narrow', minX: 100, minY: 100, maxX: 110, maxY: 110 }],
        32,
      ),
    ).toEqual({
      pointerId: 7,
      x: 92,
      y: 105,
      nodeId: 'narrow',
      edge: 'before',
      minX: 100,
      maxX: 110,
      targetX: 100,
    });
    expect(
      resolveChartMinimumTargetHit(
        { pointerId: 7, x: 83.99, y: 105 },
        [{ nodeId: 'narrow', minX: 100, minY: 100, maxX: 110, maxY: 110 }],
        32,
      ),
    ).toBeUndefined();
  });

  it('chooses the nearest real mark when expanded targets overlap', () => {
    expect(
      resolveChartMinimumTargetHit(
        { pointerId: 8, x: 115, y: 105 },
        [
          { nodeId: 'left', minX: 100, minY: 100, maxX: 108, maxY: 110 },
          { nodeId: 'right', minX: 120, minY: 100, maxX: 128, maxY: 110 },
        ],
        32,
      )?.nodeId,
    ).toBe('right');
  });
});
