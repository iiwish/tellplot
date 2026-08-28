import type { ResolvedFinancialChartNumberFormat } from '@tellplot/core';

import { formatAmount, type EditorLocale } from '../editor/formatAmount';

interface AmountTooltipDatum {
  readonly label: string;
  readonly amount: number;
}

interface SafeTooltipItem {
  readonly name: string;
  readonly value: string;
}

export interface SafeAmountTooltip<TDatum extends AmountTooltipDatum> {
  readonly title: (datum: TDatum) => string;
  readonly items: [(datum: TDatum) => SafeTooltipItem];
}

interface SafeTooltipInteraction {
  readonly tooltip: {
    readonly position: 'left';
    readonly offset: [number, number];
    readonly css: Readonly<Record<string, Readonly<Record<string, string>>>>;
  };
}

export interface SafeComparisonTooltipInteraction {
  readonly legendFilter: false;
  readonly legendHighlight: false;
  readonly tooltip?: SafeTooltipInteraction['tooltip'] & {
    readonly shared: true;
    readonly sort: (item: { readonly name?: string }) => number;
  };
}

const HTML_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

/** Encodes values before G2 passes them to its HTML-based tooltip component. */
export function encodeTooltipHtml(value: string): string {
  return value.replace(/[&<>"']/gu, character => HTML_ENTITIES[character] as string);
}

export function createSafeAmountTooltip<TDatum extends AmountTooltipDatum>(
  enabled: boolean,
  locale: EditorLocale,
  currency: string | undefined,
  numberFormat: ResolvedFinancialChartNumberFormat,
): false | SafeAmountTooltip<TDatum> {
  if (!enabled) {
    return false;
  }
  const name = encodeTooltipHtml(locale === 'en-US' ? 'Amount' : '金额');
  return {
    title: datum => encodeTooltipHtml(datum.label),
    items: [
      datum => ({
        name,
        value: encodeTooltipHtml(formatAmount(datum.amount, locale, currency, numberFormat)),
      }),
    ],
  };
}

/** Keeps G2's HTML tooltip compact and clear of the chart-owned direct-action rail. */
export function createSafeTooltipInteraction(): SafeTooltipInteraction {
  return {
    tooltip: {
      position: 'left',
      offset: [10, 10],
      css: {
        '.g2-tooltip': {
          'background-color': 'rgba(24, 33, 29, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          'box-shadow': '0 6px 16px rgba(24, 33, 29, 0.2)',
          color: 'rgba(255, 255, 255, 0.86)',
          'font-family': 'inherit',
          'font-size': '11px',
          'line-height': '16px',
          'max-width': '240px',
          'min-width': '104px',
          padding: '7px 9px',
          transition: 'visibility 100ms ease',
        },
        '.g2-tooltip-title': {
          color: 'rgba(255, 255, 255, 0.78)',
        },
        '.g2-tooltip-list-item': {
          'line-height': '20px',
        },
        '.g2-tooltip-list-item-name': {
          'max-width': '152px',
        },
        '.g2-tooltip-list-item-marker': {
          height: '7px',
          width: '7px',
        },
        '.g2-tooltip-list-item-value': {
          color: '#FFFFFF',
          'margin-left': '16px',
        },
      },
    },
  };
}

/** Keeps a comparison Tooltip shared and deterministically source-ordinal. */
export function createSafeComparisonTooltipInteraction(
  seriesLabels: readonly string[],
  enabled: boolean,
): SafeComparisonTooltipInteraction {
  if (!enabled) {
    return { legendFilter: false, legendHighlight: false };
  }
  const ordinalByName = new Map(
    seriesLabels.map((label, ordinal) => [encodeTooltipHtml(label), ordinal]),
  );
  return {
    legendFilter: false,
    legendHighlight: false,
    tooltip: {
      ...createSafeTooltipInteraction().tooltip,
      shared: true,
      sort: item => ordinalByName.get(item.name ?? '') ?? seriesLabels.length,
    },
  };
}
