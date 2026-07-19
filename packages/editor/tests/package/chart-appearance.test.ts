import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FINANCIAL_CHART_PALETTE,
  resolveFinancialChartAppearance,
} from '../../src/config/chartAppearance';
import type { FinancialChartAppearance } from '../../src/config/chartAppearance';

describe('financial chart appearance', () => {
  it('resolves a bounded immutable appearance without exposing G2 options', () => {
    const input: FinancialChartAppearance = {
      title: '  Cash bridge  ',
      palette: {
        positive: '#00A36C',
        negative: '#D23B3B',
      },
      axis: { x: false, y: true },
      valueLabels: 'always',
      tooltip: true,
      animation: { enabled: true, duration: 240 },
      numberFormat: {
        minimumFractionDigits: 3,
        maximumFractionDigits: 1,
        currencyDisplay: 'code',
      },
    };

    const resolved = resolveFinancialChartAppearance(input, 'Operating bridge');

    expect(resolved).toEqual({
      title: 'Cash bridge',
      palette: {
        ...DEFAULT_FINANCIAL_CHART_PALETTE,
        positive: '#00A36C',
        negative: '#D23B3B',
      },
      axis: { x: false, y: true },
      valueLabels: 'always',
      tooltip: true,
      animation: { enabled: true, duration: 240 },
      numberFormat: {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
        currencyDisplay: 'code',
      },
    });
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.palette)).toBe(true);
    expect('g2Spec' in resolved).toBe(false);
    expect('options' in resolved).toBe(false);
  });

  it('contains hostile JavaScript values within documented defaults and ranges', () => {
    const hostile = {
      title: '   ',
      palette: { positive: 'not-a-color', negative: 42 },
      axis: { x: 'false', y: null },
      valueLabels: 'everything',
      tooltip: 'yes',
      animation: { enabled: 'yes', duration: Number.NaN },
      numberFormat: {
        minimumFractionDigits: -20,
        maximumFractionDigits: 100,
        currencyDisplay: 'private',
      },
    } as unknown as FinancialChartAppearance;

    expect(resolveFinancialChartAppearance(hostile, '  Operating bridge  ')).toEqual({
      title: 'Operating bridge',
      palette: DEFAULT_FINANCIAL_CHART_PALETTE,
      axis: { x: true, y: true },
      valueLabels: 'auto',
      tooltip: false,
      animation: { enabled: true, duration: 160 },
      numberFormat: {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
        currencyDisplay: 'narrowSymbol',
      },
    });
  });

  it('falls back to a stable accessible title when both runtime titles are empty', () => {
    const hostile = { title: '' } as unknown as FinancialChartAppearance;

    expect(resolveFinancialChartAppearance(hostile, '  ').title).toBe('Financial chart');
  });

  it('does not execute accessors or propagate hostile proxy reflection errors', () => {
    let getterCalled = false;
    const accessorInput = {};
    Object.defineProperty(accessorInput, 'title', {
      get() {
        getterCalled = true;
        return 'Unsafe title';
      },
    });
    const unreadable = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error('private runtime details');
        },
      },
    );

    expect(
      resolveFinancialChartAppearance(accessorInput as FinancialChartAppearance, 'Fallback title')
        .title,
    ).toBe('Fallback title');
    expect(getterCalled).toBe(false);
    expect(() =>
      resolveFinancialChartAppearance(unreadable as FinancialChartAppearance, 'Safe title'),
    ).not.toThrow();
  });
});
