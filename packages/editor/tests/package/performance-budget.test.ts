import { describe, expect, it } from 'vitest';

import {
  PRODUCT_PERFORMANCE_P95_BUDGET_MS,
  resolvePerformanceP95BudgetMs,
} from '../../../../e2e/performanceBudget';

describe('performance budget profile', () => {
  it('keeps the product acceptance target at 150ms by default', () => {
    expect(PRODUCT_PERFORMANCE_P95_BUDGET_MS).toBe(150);
    expect(resolvePerformanceP95BudgetMs(undefined)).toBe(150);
  });

  it('accepts an explicit positive hosted-runner regression budget', () => {
    expect(resolvePerformanceP95BudgetMs('650')).toBe(650);
  });

  it.each(['0', '-1', 'NaN', 'Infinity', 'not-a-number'])(
    'rejects the invalid configured budget %s',
    configuredBudget => {
      expect(() => resolvePerformanceP95BudgetMs(configuredBudget)).toThrow(
        'TELLPLOT_PERFORMANCE_P95_BUDGET_MS must be a positive finite number',
      );
    },
  );
});
