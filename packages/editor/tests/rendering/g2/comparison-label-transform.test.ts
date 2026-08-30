import { describe, expect, it } from 'vitest';

import { comparisonFlipToInteriorLabelTransform } from '../../../src/rendering/g2/comparisonLabelTransform';

function label(
  bounds: { readonly min: readonly [number, number]; readonly max: readonly [number, number] },
  point: readonly [number, number],
) {
  return {
    style: { x: point[0], y: point[1] - 10 },
    __data__: { points: [point] },
    getRenderBounds: () => bounds,
  };
}

const context = {
  layout: {
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    marginBottom: 10,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 5,
  },
};

describe('comparison label flip transform', () => {
  it('keeps an interior column label and flips an overflowing label around its renderer point', () => {
    const interior = label({ min: [80, 30], max: [120, 45] }, [100, 50]);
    const overflow = label({ min: [80, 4], max: [120, 18] }, [100, 20]);
    const transform = comparisonFlipToInteriorLabelTransform({ transposed: false });

    expect(transform([interior, overflow], context)).toEqual([interior, overflow]);
    expect(interior.style.y).toBe(40);
    expect(overflow.style.y).toBe(30);
  });

  it('flips a transposed label on x and fails closed for unreadable renderer structure', () => {
    const overflow = label({ min: [4, 30], max: [20, 50] }, [20, 40]);
    overflow.style.x = 10;
    const malformed = { style: { x: 1, y: 1 } };
    const transform = comparisonFlipToInteriorLabelTransform({ transposed: true });

    transform([overflow, malformed], context);
    expect(overflow.style.x).toBe(30);
    expect(malformed.style).toMatchObject({ visibility: 'hidden' });
  });

  it('fails closed for malformed anchors, bounds, layout, positions and renderer errors', () => {
    const transform = comparisonFlipToInteriorLabelTransform();
    const malformedAnchor = {
      style: { x: 1, y: 1 },
      __data__: { points: [[1]] },
      getRenderBounds: () => ({ min: [0, 0], max: [1, 1] }),
    };
    const malformedBounds = {
      style: { x: 1, y: 1 },
      __data__: { points: [[1, 1]] },
      getRenderBounds: () => ({ min: [Number.NaN, 0], max: [1, 1] }),
    };
    const missingPosition = {
      style: { x: 'invalid', y: 1 },
      __data__: { points: [[1, 1]] },
      getRenderBounds: () => ({ min: [0, -2], max: [2, 1] }),
    };
    const throwing = {
      style: { x: 1, y: 1 },
      __data__: { points: [[1, 1]] },
      getRenderBounds: () => {
        throw new Error('renderer bounds unavailable');
      },
    };

    transform([malformedAnchor], context);
    transform([malformedBounds], context);
    transform([missingPosition], context);
    transform([throwing], context);
    transform([label({ min: [0, 0], max: [1, 1] }, [1, 1])], { layout: { width: 0 } });

    expect(malformedAnchor.style).toMatchObject({ visibility: 'hidden' });
    expect(malformedBounds.style).toMatchObject({ visibility: 'hidden' });
    expect(missingPosition.style).toMatchObject({ visibility: 'hidden' });
    expect(throwing.style).toMatchObject({ visibility: 'hidden' });
  });

  it('uses zero layout insets and flips on both far plot edges', () => {
    const column = label({ min: [1, 100], max: [2, 130] }, [2, 90]);
    const bar = label({ min: [190, 1], max: [220, 2] }, [180, 2]);
    bar.style.x = 170;
    const minimalLayout = { layout: { width: 200, height: 120 } };

    comparisonFlipToInteriorLabelTransform()([column], minimalLayout);
    comparisonFlipToInteriorLabelTransform({ transposed: true })([bar], minimalLayout);

    expect(column.style.y).toBe(100);
    expect(bar.style.x).toBe(190);
  });
});
