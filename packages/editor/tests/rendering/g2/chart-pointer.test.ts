import { describe, expect, it } from 'vitest';

import {
  readChartCategoryElementPointer,
  readChartElementBounds,
} from '../../../src/rendering/g2/chartPointer';

describe('internal G2 chart pointer adapter', () => {
  const event = {
    pointerId: 9,
    canvas: { x: 110, y: 150 },
    data: { data: { nodeId: 'node' } },
    target: {
      getBounds: () => ({ min: [100, 140], max: [120, 180] }),
    },
  };

  it('reads renderer events on either category axis', () => {
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
      value: expect.objectContaining({ edge: 'before', min: 140, max: 180, target: 140 }),
    });
    expect(
      readChartCategoryElementPointer(
        {
          ...event,
          target: {
            getBounds: () => ({ center: [110, 160], halfExtents: [10, 20] }),
          },
        },
        'y',
      ),
    ).toEqual({
      ok: true,
      value: expect.objectContaining({ min: 140, max: 180, target: 140 }),
    });
  });

  it('returns stable failures for malformed or hostile renderer events', () => {
    expect(readChartCategoryElementPointer({}, 'x')).toEqual({
      ok: false,
      reason: 'INVALID_INPUT',
    });
    expect(readChartCategoryElementPointer({ ...event, data: {} }, 'x')).toEqual({
      ok: false,
      reason: 'SOURCE_NOT_FOUND',
    });
    expect(
      readChartCategoryElementPointer({ ...event, data: { data: { nodeId: '' } } }, 'x'),
    ).toEqual({ ok: false, reason: 'SOURCE_NOT_FOUND' });
    expect(readChartCategoryElementPointer({ ...event, target: {} }, 'x')).toEqual({
      ok: false,
      reason: 'INVALID_BOUNDS',
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
    expect(
      readChartCategoryElementPointer(
        { ...event, target: { getBounds: () => ({ min: [10], max: [20, 30] }) } },
        'x',
      ),
    ).toEqual({ ok: false, reason: 'INVALID_BOUNDS' });
    const hostile = new Proxy(event, {
      get() {
        throw new Error('hostile getter');
      },
    });
    expect(readChartCategoryElementPointer(hostile, 'x')).toEqual({
      ok: false,
      reason: 'INVALID_INPUT',
    });
  });

  it('reads valid scene bounds and skips invalid elements', () => {
    const elements = [
      {
        __data__: { data: { nodeId: 'node' } },
        getBounds: () => ({ min: [100, 140], max: [120, 180] }),
      },
      { __data__: { data: {} }, getBounds: () => ({ min: [0, 0], max: [1, 1] }) },
      { __data__: { data: { nodeId: 'broken' } } },
      {
        __data__: { data: { nodeId: 'throwing' } },
        getBounds() {
          throw new Error('private renderer failure');
        },
      },
      {
        __data__: { data: { nodeId: 'reversed' } },
        getBounds: () => ({ min: [10, 10], max: [5, 20] }),
      },
    ];
    const context = {
      canvas: { document: { getElementsByClassName: () => elements } },
    };

    expect(readChartElementBounds(context)).toEqual([
      { nodeId: 'node', minX: 100, minY: 140, maxX: 120, maxY: 180 },
    ]);
  });

  it('treats unavailable or hostile scene collections as empty', () => {
    expect(readChartElementBounds({})).toEqual([]);
    expect(
      readChartElementBounds({
        canvas: {
          document: {
            getElementsByClassName() {
              throw new Error('private renderer failure');
            },
          },
        },
      }),
    ).toEqual([]);
    expect(
      readChartElementBounds({
        canvas: { document: { getElementsByClassName: () => ({ length: -1 }) } },
      }),
    ).toEqual([]);
    expect(
      readChartElementBounds({
        canvas: { document: { getElementsByClassName: () => ({ length: 1.5 }) } },
      }),
    ).toEqual([]);
  });
});
