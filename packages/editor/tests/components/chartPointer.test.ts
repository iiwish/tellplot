import { describe, expect, it } from 'vitest';

import {
  readChartCategoryElementPointer,
  readChartElementBounds,
  readChartTargetCoordinate,
} from '../../src/interactions/chartPointer';

describe('chart category-axis G2 boundary', () => {
  const event = {
    pointerId: 9,
    canvas: { x: 110, y: 150 },
    data: { data: { nodeId: 'node' } },
    target: {
      getBounds: () => ({ min: [100, 140], max: [120, 180] }),
    },
  };

  it('reads the same renderer event on X or Y', () => {
    expect(readChartCategoryElementPointer(event, 'x')).toEqual({
      ok: true,
      value: {
        pointerId: 9,
        x: 110,
        y: 150,
        axis: 'x',
        nodeId: 'node',
        edge: 'after',
        min: 100,
        max: 120,
        target: 120,
      },
    });
    expect(readChartCategoryElementPointer(event, 'y')).toEqual({
      ok: true,
      value: {
        pointerId: 9,
        x: 110,
        y: 150,
        axis: 'y',
        nodeId: 'node',
        edge: 'before',
        min: 140,
        max: 180,
        target: 140,
      },
    });
  });

  it('supports center/halfExtents bounds and returns structured hostile failures', () => {
    const centered = {
      ...event,
      target: {
        getBounds: () => ({ center: [110, 160], halfExtents: [10, 20] }),
      },
    };
    expect(readChartCategoryElementPointer(centered, 'y')).toEqual({
      ok: true,
      value: expect.objectContaining({ min: 140, max: 180, target: 140 }),
    });
    expect(readChartCategoryElementPointer({}, 'x')).toEqual({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(readChartCategoryElementPointer({ ...event, data: {} }, 'x')).toEqual({
      ok: false,
      reason: 'SOURCE_NOT_FOUND',
    });
    expect(
      readChartCategoryElementPointer(
        {
          ...event,
          target: {
            getBounds() {
              throw new Error('private renderer failure');
            },
          },
        },
        'x',
      ),
    ).toEqual({ ok: false, reason: 'INVALID_BOUNDS' });
  });
});

describe('chart category-axis scene lookup', () => {
  const element = {
    __data__: { data: { nodeId: 'node' } },
    getBounds: () => ({ min: [100, 140], max: [120, 180] }),
  };
  const context = {
    canvas: {
      document: {
        getElementsByClassName: () => [element],
      },
    },
  };

  it('reads target edges and complete scene bounds for both axes', () => {
    expect(readChartTargetCoordinate(context, 'node', 'before', 'x')).toEqual({
      ok: true,
      value: 100,
    });
    expect(readChartTargetCoordinate(context, 'node', 'after', 'y')).toEqual({
      ok: true,
      value: 180,
    });
    expect(readChartElementBounds(context)).toEqual([
      { nodeId: 'node', minX: 100, minY: 140, maxX: 120, maxY: 180 },
    ]);
  });

  it('returns structured failures for invalid contexts, missing nodes and bounds', () => {
    expect(readChartTargetCoordinate({}, 'node', 'before', 'x')).toEqual({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(readChartTargetCoordinate(context, 'missing', 'before', 'x')).toEqual({
      ok: false,
      reason: 'SOURCE_NOT_FOUND',
    });
    const invalidBounds = {
      canvas: {
        document: {
          getElementsByClassName: () => [
            { ...element, getBounds: () => ({ min: [10, 10], max: [5, 20] }) },
          ],
        },
      },
    };
    expect(readChartTargetCoordinate(invalidBounds, 'node', 'before', 'x')).toEqual({
      ok: false,
      reason: 'INVALID_BOUNDS',
    });
    expect(readChartElementBounds(invalidBounds)).toEqual([]);
  });
});
