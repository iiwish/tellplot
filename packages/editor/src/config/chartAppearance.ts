export type ChartValueLabelMode = 'auto' | 'always' | 'never';
export type ChartCurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

export interface FinancialChartPalette {
  readonly start: string;
  readonly positive: string;
  readonly negative: string;
  readonly subtotal: string;
  readonly group: string;
  readonly end: string;
}

export interface FinancialChartAxisAppearance {
  readonly x?: boolean;
  readonly y?: boolean;
}

export interface FinancialChartAnimationAppearance {
  readonly enabled?: boolean;
  readonly duration?: number;
}

export interface FinancialChartNumberFormat {
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly currencyDisplay?: ChartCurrencyDisplay;
}

/** Stable, semantic presentation controls that cannot override TellPlot's G2 data or encoding. */
export interface FinancialChartAppearance {
  readonly title?: string;
  readonly palette?: Partial<FinancialChartPalette>;
  readonly axis?: FinancialChartAxisAppearance;
  readonly valueLabels?: ChartValueLabelMode;
  readonly tooltip?: boolean;
  readonly animation?: FinancialChartAnimationAppearance;
  readonly numberFormat?: FinancialChartNumberFormat;
}

export interface ResolvedFinancialChartNumberFormat {
  readonly minimumFractionDigits: number;
  readonly maximumFractionDigits: number;
  readonly currencyDisplay: ChartCurrencyDisplay;
}

export interface ResolvedFinancialChartAppearance {
  readonly title: string;
  readonly palette: FinancialChartPalette;
  readonly axis: {
    readonly x: boolean;
    readonly y: boolean;
  };
  readonly valueLabels: ChartValueLabelMode;
  readonly tooltip: boolean;
  readonly animation: {
    readonly enabled: boolean;
    readonly duration: number;
  };
  readonly numberFormat: ResolvedFinancialChartNumberFormat;
}

export const DEFAULT_FINANCIAL_CHART_PALETTE: FinancialChartPalette = Object.freeze({
  start: '#5F6B65',
  positive: '#168363',
  negative: '#D5524A',
  subtotal: '#315C8C',
  group: '#A46812',
  end: '#315C8C',
});

export const DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT: ResolvedFinancialChartNumberFormat =
  Object.freeze({
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    currencyDisplay: 'narrowSymbol',
  });

const DEFAULT_TITLE = 'Financial chart';
const DEFAULT_ANIMATION_DURATION = 160;
const MAX_ANIMATION_DURATION = 1_000;
const MAX_FRACTION_DIGITS = 6;
const HEX_COLOR_PATTERN = /^#(?:[0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/iu;
const COLOR_KEYS = [
  'start',
  'positive',
  'negative',
  'subtotal',
  'group',
  'end',
] as const satisfies readonly (keyof FinancialChartPalette)[];
const VALUE_LABEL_MODES: readonly ChartValueLabelMode[] = ['auto', 'always', 'never'];
const CURRENCY_DISPLAYS: readonly ChartCurrencyDisplay[] = [
  'symbol',
  'narrowSymbol',
  'code',
  'name',
];

function ownDataValue(value: unknown, key: PropertyKey): unknown {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized === '' ? undefined : normalized;
}

function colorOr(value: unknown, fallback: string): string {
  const color = nonEmptyString(value);
  return color !== undefined && HEX_COLOR_PATTERN.test(color) ? color : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function boundedInteger(value: unknown, fallback: number, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, Math.round(value)))
    : fallback;
}

function enumOr<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function resolvePalette(value: unknown): FinancialChartPalette {
  const palette = Object.fromEntries(
    COLOR_KEYS.map(key => [
      key,
      colorOr(ownDataValue(value, key), DEFAULT_FINANCIAL_CHART_PALETTE[key]),
    ]),
  ) as unknown as FinancialChartPalette;
  return Object.freeze(palette);
}

function resolveNumberFormat(value: unknown): ResolvedFinancialChartNumberFormat {
  const minimum = boundedInteger(
    ownDataValue(value, 'minimumFractionDigits'),
    DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT.minimumFractionDigits,
    MAX_FRACTION_DIGITS,
  );
  const requestedMaximum = boundedInteger(
    ownDataValue(value, 'maximumFractionDigits'),
    DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT.maximumFractionDigits,
    MAX_FRACTION_DIGITS,
  );
  return Object.freeze({
    minimumFractionDigits: minimum,
    maximumFractionDigits: Math.max(minimum, requestedMaximum),
    currencyDisplay: enumOr(
      ownDataValue(value, 'currencyDisplay'),
      CURRENCY_DISPLAYS,
      DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT.currencyDisplay,
    ),
  });
}

/** Normalizes JavaScript callers into a finite, immutable chart appearance. */
export function resolveFinancialChartAppearance(
  appearance: FinancialChartAppearance | undefined,
  fallbackTitle: string,
): ResolvedFinancialChartAppearance {
  const axis = ownDataValue(appearance, 'axis');
  const animation = ownDataValue(appearance, 'animation');
  const resolved = {
    title:
      nonEmptyString(ownDataValue(appearance, 'title')) ??
      nonEmptyString(fallbackTitle) ??
      DEFAULT_TITLE,
    palette: resolvePalette(ownDataValue(appearance, 'palette')),
    axis: Object.freeze({
      x: booleanOr(ownDataValue(axis, 'x'), true),
      y: booleanOr(ownDataValue(axis, 'y'), true),
    }),
    valueLabels: enumOr(ownDataValue(appearance, 'valueLabels'), VALUE_LABEL_MODES, 'auto'),
    tooltip: booleanOr(ownDataValue(appearance, 'tooltip'), false),
    animation: Object.freeze({
      enabled: booleanOr(ownDataValue(animation, 'enabled'), true),
      duration: boundedInteger(
        ownDataValue(animation, 'duration'),
        DEFAULT_ANIMATION_DURATION,
        MAX_ANIMATION_DURATION,
      ),
    }),
    numberFormat: resolveNumberFormat(ownDataValue(appearance, 'numberFormat')),
  } satisfies ResolvedFinancialChartAppearance;
  return Object.freeze(resolved);
}
