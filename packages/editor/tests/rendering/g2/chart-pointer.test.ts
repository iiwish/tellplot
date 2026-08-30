import { describe, expect, it } from 'vitest';

import {
  readComparisonChartCategoryElementPointer,
  readChartCategoryElementPointer,
  readChartElementBounds,
} from '../../../src/rendering/g2/chartPointer';
import type { ComparisonSceneReceipt } from '../../../src/rendering/g2/comparisonSceneReceipt';

describe('internal G2 chart pointer adapter', () => {
  const comparisonReceipt: ComparisonSceneReceipt = {
    renderSignature: 'render',
    renderRevision: 2,
    generation: 1,
    axis: 'x',
    elements: [
      {
        nodeId: 'node',
        seriesId: 'actual',
        elementKey: '["comparison-element","node","actual"]',
        minX: 10,
        minY: 20,
        maxX: 30,
        maxY: 80,
      },
    ],
    categories: [
      {
        nodeId: 'node',
        rectangles: [
          {
            nodeId: 'node',
            seriesId: 'actual',
            elementKey: '["comparison-element","node","actual"]',
            minX: 10,
            minY: 20,
            maxX: 30,
            maxY: 80,
          },
        ],
        axisBounds: { nodeId: 'node', min: 10, center: 20, max: 30 },
        ghostBounds: { nodeId: 'node', minX: 10, minY: 20, maxX: 30, maxY: 80 },
        pointerBounds: undefined,
        allZero: false,
      },
    ],
  };

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

  it('maps only a registered comparison series element through the authoritative receipt', () => {
    const comparisonEvent = {
      pointerId: 4,
      canvas: { x: 15, y: 40 },
      data: {
        data: {
          nodeId: 'node',
          seriesId: 'actual',
          elementKey: '["comparison-element","node","actual"]',
        },
      },
    };
    expect(readComparisonChartCategoryElementPointer(comparisonEvent, comparisonReceipt)).toEqual({
      ok: true,
      value: {
        pointerId: 4,
        x: 15,
        y: 40,
        axis: 'x',
        nodeId: 'node',
        edge: 'before',
        min: 10,
        max: 30,
        target: 10,
      },
    });
    expect(
      readComparisonChartCategoryElementPointer(
        { ...comparisonEvent, canvas: { x: 25, y: 40 } },
        comparisonReceipt,
      ),
    ).toEqual({
      ok: true,
      value: expect.objectContaining({ edge: 'after', target: 30 }),
    });
    const allZeroReceipt: ComparisonSceneReceipt = {
      ...comparisonReceipt,
      categories: comparisonReceipt.categories.map(category => ({
        ...category,
        allZero: true,
        pointerBounds: { nodeId: 'node', minX: 5, minY: 10, maxX: 35, maxY: 90 },
      })),
    };
    expect(
      readComparisonChartCategoryElementPointer(
        { ...comparisonEvent, canvas: { x: 6, y: 15 } },
        allZeroReceipt,
      ),
    ).toEqual({
      ok: true,
      value: expect.objectContaining({ edge: 'before', target: 10 }),
    });
    expect(
      readComparisonChartCategoryElementPointer(
        {
          ...comparisonEvent,
          data: { data: { nodeId: 'node', seriesId: 'budget', elementKey: 'wrong' } },
        },
        comparisonReceipt,
      ),
    ).toEqual({ ok: false, reason: 'SOURCE_NOT_FOUND' });
    expect(
      readComparisonChartCategoryElementPointer(
        { ...comparisonEvent, canvas: { x: 40, y: 40 } },
        comparisonReceipt,
      ),
    ).toEqual({ ok: false, reason: 'INVALID_BOUNDS' });
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
