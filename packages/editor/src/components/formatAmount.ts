export type EditorLocale = 'zh-CN' | 'en-US';

function decimalFormatter(locale: EditorLocale): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

/** Formats display values without changing domain arithmetic. */
export function formatAmount(amount: number, locale: EditorLocale, currency?: string): string {
  if (currency === undefined) {
    return decimalFormatter(locale).format(amount);
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return decimalFormatter(locale).format(amount);
  }
}
