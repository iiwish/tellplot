import { describe, expect, it } from 'vitest';

import {
  createSafeAmountTooltip,
  createSafeTooltipInteraction,
} from '../../src/charts/safeTooltip';

describe('safe G2 tooltip contract', () => {
  it('encodes every string passed to the G2 HTML tooltip renderer', () => {
    const tooltip = createSafeAmountTooltip(true, 'en-US', 'USD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      currencyDisplay: 'code',
    });
    if (tooltip === false) {
      throw new Error('Expected an enabled tooltip');
    }

    const datum = {
      label: '<img src=x onerror="globalThis.__tellplotXss = true"> & "quoted"',
      amount: 42,
    };
    const title = tooltip.title(datum);
    const item = tooltip.items[0](datum);
    const host = document.createElement('div');

    // @antv/component renders these fields through innerHTML/template substitution.
    host.innerHTML = `<h1>${title}</h1><span title="${item.name}">${item.value}</span>`;

    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('h1')?.textContent).toBe(datum.label);
    expect(host.querySelector('span')?.getAttribute('title')).toBe('Amount');
    expect(host.querySelector('span')?.textContent).toContain('USD');
  });

  it('keeps the G2 tooltip disabled unless the semantic option is enabled', () => {
    expect(
      createSafeAmountTooltip(false, 'zh-CN', undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        currencyDisplay: 'narrowSymbol',
      }),
    ).toBe(false);
  });

  it('keeps the HTML tooltip compact and away from direct chart controls', () => {
    expect(createSafeTooltipInteraction()).toMatchObject({
      tooltip: {
        position: 'left',
        offset: [10, 10],
        css: {
          '.g2-tooltip': {
            'background-color': 'rgba(24, 33, 29, 0.96)',
            'min-width': '104px',
            padding: '7px 9px',
          },
          '.g2-tooltip-list-item-value': {
            color: '#FFFFFF',
            'margin-left': '16px',
          },
        },
      },
    });
  });
});
