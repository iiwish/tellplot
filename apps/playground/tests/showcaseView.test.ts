import { describe, expect, it } from 'vitest';

import { getPlaygroundFixture } from '../src/fixtures';
import { createShowcaseDefaultView } from '../src/showcaseView';

describe('homepage showcase view', () => {
  it('starts the interactive waterfall with one expanded growth group', () => {
    const view = createShowcaseDefaultView(getPlaygroundFixture(''), 'waterfall', true);

    expect(view?.rootOrder.slice(0, 3)).toEqual([
      'showcase-growth-drivers',
      'material-cost',
      'freight-cost',
    ]);
    expect(view?.groups).toEqual({
      'showcase-growth-drivers': {
        id: 'showcase-growth-drivers',
        label: '增长驱动',
        childIds: ['sales-volume', 'price-impact', 'product-mix'],
      },
    });
    expect(view?.collapsedGroupIds).toEqual([]);
  });

  it('does not inject website-only grouping into static gallery previews', () => {
    expect(createShowcaseDefaultView(getPlaygroundFixture(''), 'waterfall', false)).toBeUndefined();
    expect(
      createShowcaseDefaultView(
        getPlaygroundFixture('?fixture=categorical-column'),
        'column',
        true,
      ),
    ).toBeUndefined();
  });
});
