import { describe, expect, it } from 'vitest';

import type { CategoricalComparisonProjection, CategoricalComparisonSeries } from '@tellplot/core';
import {
  createComparisonSceneReceipt,
  hitComparisonSceneReceipt,
  marqueeComparisonSceneReceipt,
} from '../../../src/rendering/g2/comparisonSceneReceipt';

const series = [
  { id: 'actual', label: 'Actual' },
  { id: 'budget', label: 'Budget' },
] as const satisfies readonly CategoricalComparisonSeries[];

const projection = [
  {
    nodeId: 'alpha',
    label: 'Alpha',
    values: [
      { seriesId: 'actual', label: 'Actual', amount: 10 },
      { seriesId: 'budget', label: 'Budget', amount: -8 },
    ],
    kind: 'category',
    sourceIds: ['alpha'],
    locked: false,
    order: 0,
  },
  {
    nodeId: 'beta',
    label: 'Beta',
    values: [
      { seriesId: 'actual', label: 'Actual', amount: 0 },
      { seriesId: 'budget', label: 'Budget', amount: 0 },
    ],
    kind: 'category',
    sourceIds: ['beta'],
    locked: false,
    order: 1,
  },
] as const satisfies CategoricalComparisonProjection;

function element(
  nodeId: 'alpha' | 'beta',
  seriesId: 'actual' | 'budget',
  bounds: { min: readonly [number, number]; max: readonly [number, number] },
): Record<string, unknown> {
  const elementKey = JSON.stringify(['comparison-element', nodeId, seriesId]);
  return {
    markType: 'interval',
    __data__: {
      viewKey: 'categorical-comparison-view',
      markKey: 'categorical-comparison-interval',
      key: elementKey,
      data: { nodeId, seriesId, elementKey },
    },
    getBounds: () => bounds,
  };
}

function context(elements: readonly unknown[], allNegative = false, transposed = false): unknown {
  const xPositions = new Map([
    ['alpha', 0.1],
    ['beta', 0.5],
  ]);
  const y = allNegative
    ? (amount: number) => (amount + 20) / 20
    : (amount: number) => amount / 40 + 0.5;
  return {
    canvas: {
      document: { getElementsByClassName: () => elements },
    },
    views: [
      {
        key: 'categorical-comparison-view',
        layout: {
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          innerWidth: 200,
          innerHeight: 100,
          marginLeft: 0,
          marginTop: 0,
          paddingLeft: 0,
          paddingTop: 0,
        },
        scale: {
          x: {
            getDomain: () => ['alpha', 'beta'],
            map: (nodeId: string) => xPositions.get(nodeId),
            getBandWidth: () => 0.35,
          },
          y: { map: y, getOptions: () => ({ range: [0, 1] }) },
        },
        coordinate: {
          getOptions: () => ({ innerWidth: 200, innerHeight: 100 }),
          map: ([x, mappedY]: readonly [number, number]) =>
            transposed ? [mappedY * 200, x * 100] : [x * 200, (1 - mappedY) * 100],
        },
      },
    ],
  };
}

function build(
  elements: readonly unknown[],
  options: {
    readonly axis?: 'x' | 'y';
    readonly currentSignature?: string;
    readonly currentRevision?: number;
    readonly currentGeneration?: number;
    readonly allNegative?: boolean;
  } = {},
) {
  return createComparisonSceneReceipt({
    context: context(elements, options.allNegative, options.axis === 'y'),
    projection,
    series,
    axis: options.axis ?? 'x',
    renderSignature: 'current-render',
    currentRenderSignature: options.currentSignature ?? 'current-render',
    renderRevision: 4,
    currentRenderRevision: options.currentRevision ?? 4,
    generation: 7,
    currentGeneration: options.currentGeneration ?? 7,
  });
}

const alphaActual = element('alpha', 'actual', { min: [24, 20], max: [42, 50] });
const alphaBudget = element('alpha', 'budget', { min: [46, 50], max: [64, 76] });
const betaActual = element('beta', 'actual', { min: [118, 50], max: [136, 50] });
const betaBudget = element('beta', 'budget', { min: [140, 50], max: [158, 50] });

describe('comparison authoritative scene receipt', () => {
  it('rebuilds N x S data in projection and source order while ignoring helper marks', () => {
    const helper = {
      markType: 'point',
      __data__: {
        viewKey: 'categorical-comparison-view',
        markKey: 'categorical-comparison-value-label-anchor',
        data: { nodeId: 'alpha', seriesId: 'actual' },
      },
      getBounds: () => ({ min: [0, 0], max: [0, 0] }),
    };
    const decorationWithoutDatum = { markType: 'path' };
    const receipt = build([
      betaBudget,
      helper,
      decorationWithoutDatum,
      alphaBudget,
      betaActual,
      alphaActual,
    ]);

    expect(receipt?.elements.map(value => [value.nodeId, value.seriesId])).toEqual([
      ['alpha', 'actual'],
      ['alpha', 'budget'],
      ['beta', 'actual'],
      ['beta', 'budget'],
    ]);
    expect(receipt?.categories.map(value => value.nodeId)).toEqual(['alpha', 'beta']);
    expect(receipt?.categories[0]).toMatchObject({
      axisBounds: { nodeId: 'alpha', min: 24, center: 44, max: 64 },
      ghostBounds: { nodeId: 'alpha', minX: 24, minY: 20, maxX: 64, maxY: 76 },
      allZero: false,
    });
    expect(receipt?.categories[1]).toMatchObject({
      axisBounds: { nodeId: 'beta', min: 100, center: 135, max: 170 },
      ghostBounds: { nodeId: 'beta', minX: 118, minY: 50, maxX: 158, maxY: 50 },
      allZero: true,
      pointerBounds: { nodeId: 'beta', minX: 100, minY: 18, maxX: 170, maxY: 50 },
    });
  });

  it.each([
    ['missing', [alphaActual, alphaBudget, betaActual]],
    ['duplicate', [alphaActual, alphaActual, alphaBudget, betaActual, betaBudget]],
    [
      'unregistered',
      [
        alphaActual,
        alphaBudget,
        betaActual,
        element('beta', 'budget', { min: [140, 50], max: [158, 50] }),
        {
          ...element('alpha', 'actual', { min: [1, 1], max: [2, 2] }),
          __data__: {
            viewKey: 'categorical-comparison-view',
            markKey: 'categorical-comparison-interval',
            key: '["comparison-element","unknown","actual"]',
            data: {
              nodeId: 'unknown',
              seriesId: 'actual',
              elementKey: '["comparison-element","unknown","actual"]',
            },
          },
        },
      ],
    ],
  ])('rejects a whole %s receipt', (_case, elements) => {
    expect(build(elements)).toBeUndefined();
  });

  it('rejects wrong main identity, mark type, key, stale lifecycle and invalid bounds atomically', () => {
    const valid = [alphaActual, alphaBudget, betaActual, betaBudget];
    const replace = (index: number, value: unknown) =>
      valid.map((entry, entryIndex) => (entryIndex === index ? value : entry));
    expect(
      build(
        replace(0, {
          ...alphaActual,
          __data__: { ...(alphaActual['__data__'] as object), viewKey: 'other-view' },
        }),
      ),
    ).toBeUndefined();
    expect(build(replace(0, { ...alphaActual, markType: 'point' }))).toBeUndefined();
    expect(
      build(
        replace(0, {
          ...alphaActual,
          __data__: { ...(alphaActual['__data__'] as object), key: 'wrong' },
        }),
      ),
    ).toBeUndefined();
    expect(
      build(
        replace(0, {
          ...alphaActual,
          getBounds: () => ({ min: [Number.NaN, 20], max: [42, 50] }),
        }),
      ),
    ).toBeUndefined();
    expect(build(valid, { currentSignature: 'stale' })).toBeUndefined();
    expect(build(valid, { currentRevision: 5 })).toBeUndefined();
    expect(build(valid, { currentGeneration: 8 })).toBeUndefined();
  });

  it('accepts center and half-extents bounds and rejects their malformed variants atomically', () => {
    const centered = {
      ...alphaActual,
      getBounds: () => ({ center: [33, 35], halfExtents: [9, 15] }),
    };
    expect(build([centered, alphaBudget, betaActual, betaBudget])?.elements[0]).toMatchObject({
      minX: 24,
      minY: 20,
      maxX: 42,
      maxY: 50,
    });
    expect(
      build([
        { ...alphaActual, getBounds: () => ({ center: [33, 35], halfExtents: [-1, 15] }) },
        alphaBudget,
        betaActual,
        betaBudget,
      ]),
    ).toBeUndefined();
    expect(
      build([
        { ...alphaActual, getBounds: () => ({ center: [33], halfExtents: [9, 15] }) },
        alphaBudget,
        betaActual,
        betaBudget,
      ]),
    ).toBeUndefined();
  });

  it('fails closed for throwing getters, proxies, sparse collections and unreadable all-zero scales', () => {
    const valid = [alphaActual, alphaBudget, betaActual, betaBudget];
    expect(
      build(
        valid.map((entry, index) =>
          index === 0
            ? new Proxy(entry, {
                get() {
                  throw new Error('private scene failure');
                },
              })
            : entry,
        ),
      ),
    ).toBeUndefined();

    const sparse = Array.from({ length: 5 }, (_, index) =>
      index === 1 ? undefined : valid[index],
    );
    expect(build(sparse)).toBeUndefined();

    const hostileContext = context(valid) as {
      views: { scale: { x: { getBandWidth: () => number } } }[];
    };
    const hostileView = hostileContext.views[0];
    expect(hostileView).toBeDefined();
    if (hostileView === undefined) {
      return;
    }
    hostileView.scale.x.getBandWidth = () => Number.NaN;
    expect(
      createComparisonSceneReceipt({
        context: hostileContext,
        projection,
        series,
        axis: 'x',
        renderSignature: 'same',
        currentRenderSignature: 'same',
        renderRevision: 0,
        currentRenderRevision: 0,
        generation: 0,
        currentGeneration: 0,
      }),
    ).toBeUndefined();
  });

  it('fails closed for hostile scene identities, lifecycle numbers and collections', () => {
    const valid = [alphaActual, alphaBudget, betaActual, betaBudget];
    const hostileSceneData = new Proxy(
      {},
      {
        get() {
          throw new Error('private scene data failure');
        },
      },
    );
    expect(build([null, ...valid])).toBeDefined();
    expect(
      build([{ ...alphaActual, __data__: hostileSceneData }, ...valid.slice(1)]),
    ).toBeUndefined();
    expect(
      createComparisonSceneReceipt({
        context: context(valid),
        projection,
        series: [series[0], series[0]],
        axis: 'x',
        renderSignature: 'same',
        currentRenderSignature: 'same',
        renderRevision: 0,
        currentRenderRevision: 0,
        generation: 0,
        currentGeneration: 0,
      }),
    ).toBeUndefined();
    expect(
      createComparisonSceneReceipt({
        context: undefined,
        projection,
        series,
        axis: 'x',
        renderSignature: 'same',
        currentRenderSignature: 'same',
        renderRevision: -1,
        currentRenderRevision: -1,
        generation: 0,
        currentGeneration: 0,
      }),
    ).toBeUndefined();
    expect(
      createComparisonSceneReceipt({
        context: {
          canvas: {
            document: { getElementsByClassName: () => ({ length: -1 }) },
          },
        },
        projection,
        series,
        axis: 'x',
        renderSignature: 'same',
        currentRenderSignature: 'same',
        renderRevision: 0,
        currentRenderRevision: 0,
        generation: 0,
        currentGeneration: 0,
      }),
    ).toBeUndefined();
  });

  it('rejects invalid public hit and marquee coordinates without consulting geometry', () => {
    const receipt = build([alphaActual, alphaBudget, betaActual, betaBudget]);
    expect(receipt).toBeDefined();
    if (receipt === undefined) return;

    expect(hitComparisonSceneReceipt(receipt, { x: Number.NaN, y: 0 })).toBeUndefined();
    expect(marqueeComparisonSceneReceipt(receipt, { minX: 2, minY: 0, maxX: 1, maxY: 1 })).toEqual(
      [],
    );
    expect(
      marqueeComparisonSceneReceipt(receipt, {
        minX: 0,
        minY: 0,
        maxX: 1,
        maxY: Number.POSITIVE_INFINITY,
      }),
    ).toEqual([]);
  });

  it('rejects malformed all-zero renderer scale and coordinate contracts', () => {
    const valid = [alphaActual, alphaBudget, betaActual, betaBudget];
    const buildFromContext = (candidateContext: unknown) =>
      createComparisonSceneReceipt({
        context: candidateContext,
        projection,
        series,
        axis: 'x',
        renderSignature: 'same',
        currentRenderSignature: 'same',
        renderRevision: 0,
        currentRenderRevision: 0,
        generation: 0,
        currentGeneration: 0,
      });
    const mutateView = (
      mutate: (view: Record<string, unknown>) => void,
    ): Record<string, unknown> => {
      const candidate = context(valid) as Record<string, unknown>;
      const views = candidate['views'];
      if (!Array.isArray(views) || views.length === 0) {
        throw new Error('Expected a comparison view fixture');
      }
      const view = views[0];
      if (typeof view !== 'object' || view === null) {
        throw new Error('Expected a comparison view record');
      }
      mutate(view as Record<string, unknown>);
      return candidate;
    };
    const nested = (view: Record<string, unknown>, key: string): Record<string, unknown> => {
      const value = view[key];
      if (typeof value !== 'object' || value === null) {
        throw new Error(`Expected ${key} fixture record`);
      }
      return value as Record<string, unknown>;
    };

    const missingViews = context(valid) as Record<string, unknown>;
    missingViews['views'] = undefined;
    expect(buildFromContext(missingViews)).toBeUndefined();

    const duplicateViews = context(valid) as Record<string, unknown>;
    const originalViews = duplicateViews['views'];
    if (!Array.isArray(originalViews) || originalViews[0] === undefined) {
      throw new Error('Expected comparison view fixtures');
    }
    duplicateViews['views'] = [originalViews[0], originalViews[0]];
    expect(buildFromContext(duplicateViews)).toBeUndefined();

    expect(
      buildFromContext(
        mutateView(view => {
          nested(view, 'layout')['width'] = 0;
        }),
      ),
    ).toBeUndefined();
    expect(
      buildFromContext(
        mutateView(view => {
          nested(view, 'coordinate')['getOptions'] = () => ({ innerWidth: 0, innerHeight: 100 });
        }),
      ),
    ).toBeUndefined();
    expect(
      buildFromContext(
        mutateView(view => {
          delete nested(view, 'layout')['marginLeft'];
        }),
      ),
    ).toBeUndefined();
    expect(
      buildFromContext(
        mutateView(view => {
          const x = nested(nested(view, 'scale'), 'x');
          x['getDomain'] = () => ['beta', 'alpha'];
        }),
      ),
    ).toBeUndefined();
    expect(
      buildFromContext(
        mutateView(view => {
          const y = nested(nested(view, 'scale'), 'y');
          y['getOptions'] = () => ({ range: [0, 0] });
        }),
      ),
    ).toBeUndefined();
    expect(
      buildFromContext(
        mutateView(view => {
          nested(view, 'coordinate')['map'] = () => {
            throw new Error('coordinate unavailable');
          };
        }),
      ),
    ).toBeUndefined();
  });

  it('uses actual rectangles for exact hit and marquee but the category union for drop', () => {
    const receipt = build([alphaActual, alphaBudget, betaActual, betaBudget]);
    expect(receipt).toBeDefined();
    if (receipt === undefined) {
      return;
    }
    expect(hitComparisonSceneReceipt(receipt, { x: 30, y: 30 })?.nodeId).toBe('alpha');
    expect(hitComparisonSceneReceipt(receipt, { x: 44, y: 40 })).toBeUndefined();
    expect(hitComparisonSceneReceipt(receipt, { x: 145, y: 40 })?.nodeId).toBe('beta');
    expect(hitComparisonSceneReceipt(receipt, { x: 95, y: 50 })).toBeUndefined();
    expect(receipt.categories.map(category => category.axisBounds)).toEqual([
      { nodeId: 'alpha', min: 24, center: 44, max: 64 },
      { nodeId: 'beta', min: 100, center: 135, max: 170 },
    ]);

    expect(
      marqueeComparisonSceneReceipt(receipt, { minX: 40, minY: 18, maxX: 120, maxY: 48 }),
    ).toEqual(['alpha']);
    expect(
      marqueeComparisonSceneReceipt(receipt, { minX: 115, minY: 49, maxX: 125, maxY: 50 }),
    ).toEqual(['beta']);
    expect(
      marqueeComparisonSceneReceipt(receipt, { minX: 115, minY: 45, maxX: 125, maxY: 49 }),
    ).toEqual([]);
  });

  it('contains the exact 32px all-zero target in positive and all-negative plot interiors', () => {
    const positive = build([alphaActual, alphaBudget, betaActual, betaBudget]);
    const negative = build([alphaActual, alphaBudget, betaActual, betaBudget], {
      allNegative: true,
    });
    expect(positive?.categories[1]?.pointerBounds).toEqual({
      nodeId: 'beta',
      minX: 100,
      minY: 18,
      maxX: 170,
      maxY: 50,
    });
    expect(negative?.categories[1]?.pointerBounds).toEqual({
      nodeId: 'beta',
      minX: 100,
      minY: 0,
      maxX: 170,
      maxY: 32,
    });

    const positiveBar = build([alphaActual, alphaBudget, betaActual, betaBudget], { axis: 'y' });
    const negativeBar = build([alphaActual, alphaBudget, betaActual, betaBudget], {
      axis: 'y',
      allNegative: true,
    });
    expect(positiveBar?.categories[1]?.pointerBounds).toEqual({
      nodeId: 'beta',
      minX: 100,
      minY: 50,
      maxX: 132,
      maxY: 85,
    });
    expect(negativeBar?.categories[1]?.pointerBounds).toEqual({
      nodeId: 'beta',
      minX: 168,
      minY: 50,
      maxX: 200,
      maxY: 85,
    });
  });

  it('maps a reversed category scale through the transposed coordinate before adding layout offsets', () => {
    const transposedContext = context(
      [alphaActual, alphaBudget, betaActual, betaBudget],
      false,
      true,
    ) as {
      views: {
        layout: Record<string, number>;
        scale: { x: { map: (nodeId: string) => number | undefined } };
      }[];
    };
    const view = transposedContext.views[0];
    expect(view).toBeDefined();
    if (view === undefined) {
      return;
    }
    Object.assign(view.layout, {
      x: 11,
      y: 13,
      marginLeft: 5,
      marginTop: 7,
      paddingLeft: 2,
      paddingTop: 3,
    });
    const reversedPositions = new Map([
      ['alpha', 0.55],
      ['beta', 0.1],
    ]);
    view.scale.x.map = (nodeId: string) => reversedPositions.get(nodeId);

    const receipt = createComparisonSceneReceipt({
      context: transposedContext,
      projection,
      series,
      axis: 'y',
      renderSignature: 'transposed',
      currentRenderSignature: 'transposed',
      renderRevision: 2,
      currentRenderRevision: 2,
      generation: 3,
      currentGeneration: 3,
    });

    expect(receipt?.categories[1]).toMatchObject({
      axisBounds: { nodeId: 'beta', min: 33, center: 50.5, max: 68 },
      pointerBounds: { nodeId: 'beta', minX: 118, minY: 33, maxX: 150, maxY: 68 },
    });
    expect(receipt).toBeDefined();
    if (receipt === undefined) {
      return;
    }
    expect(hitComparisonSceneReceipt(receipt, { x: 149, y: 50 })?.nodeId).toBe('beta');
    expect(hitComparisonSceneReceipt(receipt, { x: 151, y: 50 })).toBeUndefined();
  });

  it('adds the authoritative view and plot layout offsets to renderer scale geometry', () => {
    const offsetContext = context([alphaActual, alphaBudget, betaActual, betaBudget]) as {
      views: { layout: Record<string, number> }[];
    };
    const offsetView = offsetContext.views[0];
    expect(offsetView).toBeDefined();
    if (offsetView === undefined) {
      return;
    }
    Object.assign(offsetView.layout, {
      x: 5,
      y: 7,
      marginLeft: 10,
      marginTop: 11,
      paddingLeft: 20,
      paddingTop: 13,
    });
    const receipt = createComparisonSceneReceipt({
      context: offsetContext,
      projection,
      series,
      axis: 'x',
      renderSignature: 'offset',
      currentRenderSignature: 'offset',
      renderRevision: 1,
      currentRenderRevision: 1,
      generation: 1,
      currentGeneration: 1,
    });
    expect(receipt?.categories[1]?.pointerBounds).toEqual({
      nodeId: 'beta',
      minX: 135,
      minY: 49,
      maxX: 205,
      maxY: 81,
    });
  });
});
