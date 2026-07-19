import {
  DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT,
  type ResolvedFinancialChartNumberFormat,
} from '../config/chartAppearance';

export type EditorLocale = 'zh-CN' | 'en-US';

function decimalFormatter(
  locale: EditorLocale,
  numberFormat: ResolvedFinancialChartNumberFormat,
): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: numberFormat.maximumFractionDigits,
    minimumFractionDigits: numberFormat.minimumFractionDigits,
  });
}

/** Formats display values without changing domain arithmetic. */
export function formatAmount(
  amount: number,
  locale: EditorLocale,
  currency?: string,
  numberFormat: ResolvedFinancialChartNumberFormat = DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT,
): string {
  if (currency === undefined) {
    return decimalFormatter(locale, numberFormat).format(amount);
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: numberFormat.currencyDisplay,
      maximumFractionDigits: numberFormat.maximumFractionDigits,
      minimumFractionDigits: numberFormat.minimumFractionDigits,
    }).format(amount);
  } catch {
    return decimalFormatter(locale, numberFormat).format(amount);
  }
}
