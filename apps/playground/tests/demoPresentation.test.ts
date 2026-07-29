import { describe, expect, it } from 'vitest';

import { DEMO_CATEGORICAL_COLORS, DEMO_WATERFALL_COLORS } from '../src/demoPresentation';
import { getPlaygroundFixture } from '../src/fixtures';

describe('showcase presentation', () => {
  it('uses green for growth, red for decline, and blue for locked anchors', () => {
    expect(DEMO_WATERFALL_COLORS).toEqual({
      start: '#2F7CF6',
      positive: '#12B76A',
      negative: '#F04464',
      subtotal: '#2F7CF6',
      group: '#14B8A6',
      end: '#2F7CF6',
    });
    expect(DEMO_CATEGORICAL_COLORS).toEqual({
      positive: '#12B76A',
      negative: '#F04464',
      group: '#14B8A6',
    });
    expect(DEMO_WATERFALL_COLORS.start).toBe(DEMO_WATERFALL_COLORS.subtotal);
    expect(DEMO_WATERFALL_COLORS.subtotal).toBe(DEMO_WATERFALL_COLORS.end);
  });

  it('keeps the waterfall anchors while giving the bridge a deliberate visual rhythm', () => {
    const fixture = getPlaygroundFixture('');
    if (fixture.schemaVersion === '2.0.0' && fixture.dataKind === 'categorical') {
      throw new Error('Expected waterfall fixture');
    }
    const amountById = Object.fromEntries(fixture.items.map(item => [item.id, item.amount]));

    expect(amountById).toMatchObject({
      'opening-profit': 3_200,
      'sales-volume': 980,
      'price-impact': 540,
      'product-mix': 260,
      'material-cost': -720,
      'freight-cost': -250,
      'labor-cost': -320,
      'operating-subtotal': 3_690,
      'exchange-impact': -110,
      'tax-impact': -210,
      'one-off-income': 70,
      'ending-profit': 3_440,
    });
  });
});
