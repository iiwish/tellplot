export const PRODUCT_PERFORMANCE_P95_BUDGET_MS = 150;

export function resolvePerformanceP95BudgetMs(configuredBudget: string | undefined): number {
  if (configuredBudget === undefined) {
    return PRODUCT_PERFORMANCE_P95_BUDGET_MS;
  }

  const budget = Number(configuredBudget);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error('TELLPLOT_PERFORMANCE_P95_BUDGET_MS must be a positive finite number');
  }
  return budget;
}
