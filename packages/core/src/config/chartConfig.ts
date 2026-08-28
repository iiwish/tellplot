import {
  validationFailure,
  validationIssue,
  validationSuccess,
  type ValidationIssue,
  type ValidationResult,
} from '../domain/errors';
import type {
  CategoricalComparisonSourceData,
  CategoricalSourceData,
  LegacyWaterfallSourceData,
  SourceData,
  WaterfallSourceData,
} from '../domain/model';
import type { SeriesId } from '../domain/ids';
import { validateSourceData, validateViewSpec } from '../domain/validation';
import type { FinancialChartAppearance } from './chartAppearance';
import type {
  ChartCurrencyDisplay,
  ChartGroupRegionLabelMode,
  ChartLabelPlacement,
  ChartValueLabelMode,
} from './chartAppearance';

export type ChartLocale = 'zh-CN' | 'en-US';

export interface ChartColors {
  readonly positive?: string;
  readonly negative?: string;
  readonly group?: string;
}

export interface WaterfallChartColors extends ChartColors {
  readonly start?: string;
  readonly subtotal?: string;
  readonly end?: string;
}

export interface CategoricalComparisonSeriesColor {
  readonly seriesId: SeriesId;
  readonly color: string;
}

export interface CategoricalComparisonChartColors {
  readonly series?: readonly CategoricalComparisonSeriesColor[];
  readonly group?: string;
}

export interface ChartAxes {
  readonly category?: boolean;
  readonly value?: boolean;
}

export interface ChartLabelStyle {
  readonly color?: string;
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly background?: boolean;
  readonly backgroundColor?: string;
  readonly backgroundOpacity?: number;
}

export interface ChartValueLabelOptions extends ChartLabelStyle {
  readonly display?: ChartValueLabelMode;
  readonly placement?: ChartLabelPlacement;
  readonly offset?: number;
}

export interface ChartGroupLabelOptions extends ChartLabelStyle {
  readonly display?: ChartGroupRegionLabelMode;
  readonly placement?: ChartLabelPlacement;
  readonly offset?: number;
}

export interface ChartLabels {
  readonly value?: ChartValueLabelMode | ChartValueLabelOptions;
  readonly group?: ChartGroupRegionLabelMode | ChartGroupLabelOptions;
}

export interface ChartAnimation {
  readonly enabled?: boolean;
  readonly duration?: number;
}

export interface ChartGroupRegion {
  readonly enabled?: boolean;
  readonly opacity?: number;
}

export interface ChartNumberFormat {
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly currencyDisplay?: ChartCurrencyDisplay;
}

interface ChartAppearanceBase<TColors> {
  readonly title?: string;
  readonly colors?: TColors;
  readonly axes?: ChartAxes;
  readonly labels?: ChartLabels;
  readonly tooltip?: boolean;
  readonly animation?: ChartAnimation;
  readonly groupRegion?: ChartGroupRegion;
  readonly numberFormat?: ChartNumberFormat;
}

export type CategoricalChartAppearance = ChartAppearanceBase<ChartColors>;
export type WaterfallChartAppearance = ChartAppearanceBase<WaterfallChartColors>;
export interface CategoricalComparisonChartAppearance {
  readonly title?: string;
  readonly colors?: CategoricalComparisonChartColors;
  readonly legend?: boolean;
  readonly axes?: ChartAxes;
  readonly labels?: ChartLabels;
  readonly tooltip?: boolean;
  readonly animation?: ChartAnimation;
  readonly groupRegion?: ChartGroupRegion;
  readonly numberFormat?: ChartNumberFormat;
}

export type ChartAppearance =
  CategoricalChartAppearance | WaterfallChartAppearance | CategoricalComparisonChartAppearance;

export interface ChartEditorPanels {
  readonly outline?: boolean;
  readonly inspector?: boolean;
  readonly toolbar?: boolean;
}

export interface ChartEditorOptions {
  readonly readOnly?: boolean;
  readonly historyLimit?: number;
  readonly panels?: ChartEditorPanels;
  readonly outline?: {
    readonly placement?: 'left' | 'right';
  };
  readonly inspector?: {
    readonly mode?: 'static' | 'tabs';
  };
}

interface ChartConfigBase<
  TType extends 'waterfall' | 'bar' | 'column',
  TData extends SourceData,
  TAppearance extends ChartAppearance,
> {
  readonly type: TType;
  readonly data: TData;
  readonly locale?: ChartLocale;
  readonly height?: number | string;
  readonly appearance?: TAppearance;
  readonly editor?: ChartEditorOptions;
}

export type WaterfallChartData = LegacyWaterfallSourceData | WaterfallSourceData;

export type WaterfallChartConfig = ChartConfigBase<
  'waterfall',
  WaterfallChartData,
  WaterfallChartAppearance
>;

export type CategoricalChartConfig = ChartConfigBase<
  'bar' | 'column',
  CategoricalSourceData,
  CategoricalChartAppearance
>;

export interface CategoricalComparisonChartConfig {
  readonly type: 'bar' | 'column';
  readonly data: CategoricalComparisonSourceData;
  readonly locale?: ChartLocale;
  readonly height?: number | string;
  readonly appearance?: CategoricalComparisonChartAppearance;
  readonly editor?: ChartEditorOptions;
}

export type ChartConfig =
  WaterfallChartConfig | CategoricalChartConfig | CategoricalComparisonChartConfig;

type UnknownRecord = Record<string, unknown>;

const CONFIG_FIELDS: ReadonlySet<string> = new Set([
  'type',
  'data',
  'locale',
  'height',
  'appearance',
  'editor',
]);
const APPEARANCE_FIELDS: ReadonlySet<string> = new Set([
  'title',
  'colors',
  'axes',
  'labels',
  'tooltip',
  'animation',
  'groupRegion',
  'numberFormat',
]);
const COMPARISON_APPEARANCE_FIELDS: ReadonlySet<string> = new Set([...APPEARANCE_FIELDS, 'legend']);
const COMMON_COLOR_FIELDS: ReadonlySet<string> = new Set(['positive', 'negative', 'group']);
const WATERFALL_COLOR_FIELDS: ReadonlySet<string> = new Set([
  ...COMMON_COLOR_FIELDS,
  'start',
  'subtotal',
  'end',
]);
const COMPARISON_COLOR_FIELDS: ReadonlySet<string> = new Set(['series', 'group']);
const COMPARISON_SERIES_COLOR_FIELDS: ReadonlySet<string> = new Set(['seriesId', 'color']);
const AXIS_FIELDS: ReadonlySet<string> = new Set(['category', 'value']);
const LABEL_FIELDS: ReadonlySet<string> = new Set(['value', 'group']);
const LABEL_STYLE_FIELDS: readonly string[] = [
  'display',
  'placement',
  'offset',
  'color',
  'fontSize',
  'fontWeight',
  'background',
  'backgroundColor',
  'backgroundOpacity',
];
const VALUE_LABEL_OPTION_FIELDS: ReadonlySet<string> = new Set(LABEL_STYLE_FIELDS);
const GROUP_LABEL_OPTION_FIELDS: ReadonlySet<string> = new Set(LABEL_STYLE_FIELDS);
const ANIMATION_FIELDS: ReadonlySet<string> = new Set(['enabled', 'duration']);
const GROUP_REGION_FIELDS: ReadonlySet<string> = new Set(['enabled', 'opacity']);
const NUMBER_FORMAT_FIELDS: ReadonlySet<string> = new Set([
  'minimumFractionDigits',
  'maximumFractionDigits',
  'currencyDisplay',
]);
const EDITOR_FIELDS: ReadonlySet<string> = new Set([
  'readOnly',
  'historyLimit',
  'panels',
  'outline',
  'inspector',
]);
const PANEL_FIELDS: ReadonlySet<string> = new Set(['outline', 'inspector', 'toolbar']);
const OUTLINE_FIELDS: ReadonlySet<string> = new Set(['placement']);
const INSPECTOR_FIELDS: ReadonlySet<string> = new Set(['mode']);
const HEX_COLOR_PATTERN = /^#(?:[0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/iu;
const VALUE_LABEL_MODES: readonly ChartValueLabelMode[] = ['auto', 'always', 'never'];
const GROUP_LABEL_MODES: readonly ChartGroupRegionLabelMode[] = ['auto', 'never'];
const LABEL_PLACEMENTS: readonly ChartLabelPlacement[] = ['auto', 'inside', 'outside'];
const CURRENCY_DISPLAYS: readonly ChartCurrencyDisplay[] = [
  'symbol',
  'narrowSymbol',
  'code',
  'name',
];

function configIssue(reason: ValidationIssue['reason'], path: string): ValidationIssue {
  return validationIssue('INVALID_CHART_CONFIG', reason, path);
}

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function hasReadableComparisonSchema(value: unknown): boolean {
  try {
    return isPlainRecord(value) && ownDataValue(value, 'schemaVersion') === '3.0.0';
  } catch {
    return false;
  }
}

function ownDataValue(record: UnknownRecord, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

function pointer(base: string, key: string): string {
  const escaped = key.replaceAll('~', '~0').replaceAll('/', '~1');
  return `${base}/${escaped}`;
}

function isArrayIndexKey(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
}

function readArray(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    errors.push(configIssue('INVALID_TYPE', path));
    return undefined;
  }

  const entriesByIndex = new Map<number, unknown>();
  const presentIndexes: number[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') {
      continue;
    }
    if (typeof key === 'symbol') {
      errors.push(configIssue('NON_PLAIN_DATA', path));
      continue;
    }
    if (!isArrayIndexKey(key, value.length)) {
      errors.push(configIssue('UNKNOWN_FIELD', pointer(path, key)));
      continue;
    }
    const index = Number(key);
    presentIndexes.push(index);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      errors.push(configIssue('NON_PLAIN_DATA', pointer(path, key)));
    } else {
      entriesByIndex.set(index, descriptor.value);
    }
  }

  if (presentIndexes.length !== value.length) {
    presentIndexes.sort((left, right) => left - right);
    let firstMissingIndex = 0;
    for (const index of presentIndexes) {
      if (index !== firstMissingIndex) {
        break;
      }
      firstMissingIndex += 1;
    }
    errors.push(configIssue('INVALID_TYPE', pointer(path, String(firstMissingIndex))));
    return undefined;
  }
  if (entriesByIndex.size !== value.length) {
    return undefined;
  }
  return Array.from({ length: value.length }, (_, index) => entriesByIndex.get(index));
}

function inspectRecord(
  value: unknown,
  path: string,
  allowedFields: ReadonlySet<string>,
  errors: ValidationIssue[],
): UnknownRecord | undefined {
  if (!isPlainRecord(value)) {
    errors.push(configIssue('EXPECTED_OBJECT', path));
    return undefined;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') {
      errors.push(configIssue('NON_PLAIN_DATA', path));
      continue;
    }
    const fieldPath = pointer(path === '/' ? '' : path, key);
    if (!allowedFields.has(key)) {
      errors.push(configIssue('UNKNOWN_FIELD', fieldPath));
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      errors.push(configIssue('NON_PLAIN_DATA', fieldPath));
    }
  }
  return value;
}

function optionalRecord(
  parent: UnknownRecord,
  key: string,
  parentPath: string,
  allowedFields: ReadonlySet<string>,
  errors: ValidationIssue[],
): UnknownRecord | undefined {
  const value = ownDataValue(parent, key);
  return value === undefined
    ? undefined
    : inspectRecord(value, pointer(parentPath, key), allowedFields, errors);
}

function validateOptionalBoolean(
  record: UnknownRecord,
  key: string,
  path: string,
  errors: ValidationIssue[],
): void {
  const value = ownDataValue(record, key);
  if (value !== undefined && typeof value !== 'boolean') {
    errors.push(configIssue('INVALID_TYPE', pointer(path, key)));
  }
}

function validateOptionalEnum<TValue extends string>(
  record: UnknownRecord,
  key: string,
  path: string,
  allowed: readonly TValue[],
  errors: ValidationIssue[],
): void {
  const value = ownDataValue(record, key);
  if (value !== undefined && (typeof value !== 'string' || !allowed.includes(value as TValue))) {
    errors.push(configIssue('INVALID_TYPE', pointer(path, key)));
  }
}

function validateOptionalNumber(
  record: UnknownRecord,
  key: string,
  path: string,
  minimum: number,
  maximum: number,
  integer: boolean,
  errors: ValidationIssue[],
): void {
  const value = ownDataValue(record, key);
  if (
    value !== undefined &&
    (typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum ||
      (integer && !Number.isInteger(value)))
  ) {
    errors.push(configIssue('INVALID_TYPE', pointer(path, key)));
  }
}

function validateLabelOptions<TMode extends string>(
  labels: UnknownRecord,
  key: 'value' | 'group',
  allowedFields: ReadonlySet<string>,
  displayModes: readonly TMode[],
  errors: ValidationIssue[],
): void {
  const value = ownDataValue(labels, key);
  const path = pointer('/appearance/labels', key);
  if (value === undefined) {
    return;
  }
  if (typeof value === 'string') {
    if (!displayModes.includes(value as TMode)) {
      errors.push(configIssue('INVALID_TYPE', path));
    }
    return;
  }
  const options = inspectRecord(value, path, allowedFields, errors);
  if (options === undefined) {
    return;
  }
  validateOptionalEnum(options, 'display', path, displayModes, errors);
  validateOptionalEnum(options, 'placement', path, LABEL_PLACEMENTS, errors);
  validateOptionalNumber(options, 'offset', path, 0, 24, false, errors);
  validateOptionalNumber(options, 'fontSize', path, 8, 32, true, errors);
  validateOptionalNumber(options, 'fontWeight', path, 100, 900, true, errors);
  validateOptionalBoolean(options, 'background', path, errors);
  validateOptionalNumber(options, 'backgroundOpacity', path, 0, 1, false, errors);
  for (const colorKey of ['color', 'backgroundColor'] as const) {
    const color = ownDataValue(options, colorKey);
    if (color !== undefined && (typeof color !== 'string' || !HEX_COLOR_PATTERN.test(color))) {
      errors.push(configIssue('INVALID_TYPE', pointer(path, colorKey)));
    }
  }
}

function validateAppearance(
  config: UnknownRecord,
  chartType: unknown,
  comparison: boolean,
  comparisonSeriesIds: ReadonlySet<string> | undefined,
  errors: ValidationIssue[],
): void {
  const appearance = optionalRecord(
    config,
    'appearance',
    '',
    comparison ? COMPARISON_APPEARANCE_FIELDS : APPEARANCE_FIELDS,
    errors,
  );
  if (appearance === undefined) {
    return;
  }

  const title = ownDataValue(appearance, 'title');
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    errors.push(configIssue('INVALID_TYPE', '/appearance/title'));
  }
  validateOptionalBoolean(appearance, 'tooltip', '/appearance', errors);
  if (comparison) {
    validateOptionalBoolean(appearance, 'legend', '/appearance', errors);
  }

  const colors = optionalRecord(
    appearance,
    'colors',
    '/appearance',
    comparison
      ? COMPARISON_COLOR_FIELDS
      : chartType === 'waterfall'
        ? WATERFALL_COLOR_FIELDS
        : COMMON_COLOR_FIELDS,
    errors,
  );
  if (colors !== undefined) {
    if (comparison) {
      const group = ownDataValue(colors, 'group');
      if (group !== undefined && (typeof group !== 'string' || !HEX_COLOR_PATTERN.test(group))) {
        errors.push(configIssue('INVALID_TYPE', '/appearance/colors/group'));
      }

      const rawSeries = ownDataValue(colors, 'series');
      if (rawSeries !== undefined) {
        const series = readArray(rawSeries, '/appearance/colors/series', errors);
        if (series !== undefined) {
          const firstIndexById = new Map<string, number>();
          for (let index = 0; index < series.length; index += 1) {
            const path = `/appearance/colors/series/${index}`;
            const entry = inspectRecord(
              series[index],
              path,
              COMPARISON_SERIES_COLOR_FIELDS,
              errors,
            );
            if (entry === undefined) {
              continue;
            }
            const seriesId = ownDataValue(entry, 'seriesId');
            if (typeof seriesId !== 'string') {
              errors.push(configIssue('INVALID_TYPE', `${path}/seriesId`));
            } else if (seriesId.trim().length === 0) {
              errors.push(configIssue('EMPTY_ID', `${path}/seriesId`));
            } else {
              const firstIndex = firstIndexById.get(seriesId);
              if (firstIndex !== undefined) {
                errors.push(
                  validationIssue(
                    'INVALID_CHART_CONFIG',
                    'DUPLICATE_SERIES_COLOR',
                    `${path}/seriesId`,
                    { index, firstIndex },
                  ),
                );
              } else {
                firstIndexById.set(seriesId, index);
              }
              if (comparisonSeriesIds !== undefined && !comparisonSeriesIds.has(seriesId)) {
                errors.push(
                  validationIssue(
                    'SOURCE_CONFLICT',
                    'UNKNOWN_SERIES_REFERENCE',
                    `${path}/seriesId`,
                  ),
                );
              }
            }
            const color = ownDataValue(entry, 'color');
            if (typeof color !== 'string' || !HEX_COLOR_PATTERN.test(color)) {
              errors.push(configIssue('INVALID_TYPE', `${path}/color`));
            }
          }
        }
      }
    } else {
      const allowedColors =
        chartType === 'waterfall' ? WATERFALL_COLOR_FIELDS : COMMON_COLOR_FIELDS;
      for (const key of allowedColors) {
        const color = ownDataValue(colors, key);
        if (color !== undefined && (typeof color !== 'string' || !HEX_COLOR_PATTERN.test(color))) {
          errors.push(configIssue('INVALID_TYPE', pointer('/appearance/colors', key)));
        }
      }
    }
  }

  const axes = optionalRecord(appearance, 'axes', '/appearance', AXIS_FIELDS, errors);
  if (axes !== undefined) {
    validateOptionalBoolean(axes, 'category', '/appearance/axes', errors);
    validateOptionalBoolean(axes, 'value', '/appearance/axes', errors);
  }

  const labels = optionalRecord(appearance, 'labels', '/appearance', LABEL_FIELDS, errors);
  if (labels !== undefined) {
    validateLabelOptions(labels, 'value', VALUE_LABEL_OPTION_FIELDS, VALUE_LABEL_MODES, errors);
    validateLabelOptions(labels, 'group', GROUP_LABEL_OPTION_FIELDS, GROUP_LABEL_MODES, errors);
  }

  const animation = optionalRecord(
    appearance,
    'animation',
    '/appearance',
    ANIMATION_FIELDS,
    errors,
  );
  if (animation !== undefined) {
    validateOptionalBoolean(animation, 'enabled', '/appearance/animation', errors);
    validateOptionalNumber(animation, 'duration', '/appearance/animation', 0, 1_000, true, errors);
  }

  const groupRegion = optionalRecord(
    appearance,
    'groupRegion',
    '/appearance',
    GROUP_REGION_FIELDS,
    errors,
  );
  if (groupRegion !== undefined) {
    validateOptionalBoolean(groupRegion, 'enabled', '/appearance/groupRegion', errors);
    validateOptionalNumber(
      groupRegion,
      'opacity',
      '/appearance/groupRegion',
      0,
      0.2,
      false,
      errors,
    );
  }

  const numberFormat = optionalRecord(
    appearance,
    'numberFormat',
    '/appearance',
    NUMBER_FORMAT_FIELDS,
    errors,
  );
  if (numberFormat !== undefined) {
    validateOptionalNumber(
      numberFormat,
      'minimumFractionDigits',
      '/appearance/numberFormat',
      0,
      6,
      true,
      errors,
    );
    validateOptionalNumber(
      numberFormat,
      'maximumFractionDigits',
      '/appearance/numberFormat',
      0,
      6,
      true,
      errors,
    );
    validateOptionalEnum(
      numberFormat,
      'currencyDisplay',
      '/appearance/numberFormat',
      CURRENCY_DISPLAYS,
      errors,
    );
    const minimum = ownDataValue(numberFormat, 'minimumFractionDigits');
    const maximum = ownDataValue(numberFormat, 'maximumFractionDigits');
    if (typeof minimum === 'number' && typeof maximum === 'number' && maximum < minimum) {
      errors.push(configIssue('INVALID_TYPE', '/appearance/numberFormat/maximumFractionDigits'));
    }
  }
}

function validateEditor(config: UnknownRecord, errors: ValidationIssue[]): void {
  const editor = optionalRecord(config, 'editor', '', EDITOR_FIELDS, errors);
  if (editor === undefined) {
    return;
  }
  validateOptionalBoolean(editor, 'readOnly', '/editor', errors);
  validateOptionalNumber(
    editor,
    'historyLimit',
    '/editor',
    0,
    Number.MAX_SAFE_INTEGER,
    true,
    errors,
  );

  const panels = optionalRecord(editor, 'panels', '/editor', PANEL_FIELDS, errors);
  if (panels !== undefined) {
    for (const key of PANEL_FIELDS) {
      validateOptionalBoolean(panels, key, '/editor/panels', errors);
    }
  }

  const outline = optionalRecord(editor, 'outline', '/editor', OUTLINE_FIELDS, errors);
  if (outline !== undefined) {
    validateOptionalEnum(outline, 'placement', '/editor/outline', ['left', 'right'], errors);
  }

  const inspector = optionalRecord(editor, 'inspector', '/editor', INSPECTOR_FIELDS, errors);
  if (inspector !== undefined) {
    validateOptionalEnum(inspector, 'mode', '/editor/inspector', ['static', 'tabs'], errors);
  }
}

function prefixedIssue(issue: ValidationIssue): ValidationIssue {
  return {
    ...issue,
    path: issue.path === '/' ? '/data' : `/data${issue.path}`,
  };
}

function validateChartConfigInternal(input: unknown): ValidationResult<ChartConfig> {
  const errors: ValidationIssue[] = [];
  const config = inspectRecord(input, '/', CONFIG_FIELDS, errors);
  if (config === undefined) {
    return validationFailure(errors);
  }

  const chartType = ownDataValue(config, 'type');
  if (chartType !== 'waterfall' && chartType !== 'bar' && chartType !== 'column') {
    errors.push(configIssue('INVALID_CHART_TYPE', '/type'));
  }

  const rawData = ownDataValue(config, 'data');
  const dataResult = validateSourceData(rawData);
  const comparison = dataResult.ok
    ? dataResult.value.schemaVersion === '3.0.0'
    : hasReadableComparisonSchema(rawData);
  if (!dataResult.ok) {
    errors.push(...dataResult.errors.map(prefixedIssue));
  } else if (
    (chartType === 'waterfall' &&
      dataResult.value.schemaVersion !== '1.0.0' &&
      dataResult.value.dataKind === 'categorical') ||
    ((chartType === 'bar' || chartType === 'column') &&
      !(dataResult.value.schemaVersion !== '1.0.0' && dataResult.value.dataKind === 'categorical'))
  ) {
    errors.push(validationIssue('SOURCE_CONFLICT', 'INCOMPATIBLE_CHART_TYPE', '/type'));
  }

  const locale = ownDataValue(config, 'locale');
  if (locale !== undefined && locale !== 'zh-CN' && locale !== 'en-US') {
    errors.push(configIssue('INVALID_TYPE', '/locale'));
  }

  const height = ownDataValue(config, 'height');
  if (
    height !== undefined &&
    !(
      (typeof height === 'number' && Number.isFinite(height) && height > 0) ||
      (typeof height === 'string' && height.trim() !== '')
    )
  ) {
    errors.push(configIssue('INVALID_TYPE', '/height'));
  }

  const comparisonSeriesIds =
    dataResult.ok && dataResult.value.schemaVersion === '3.0.0'
      ? new Set(dataResult.value.series.map(series => series.id))
      : undefined;
  validateAppearance(config, chartType, comparison, comparisonSeriesIds, errors);
  validateEditor(config, errors);

  return errors.length === 0 ? validationSuccess(input as ChartConfig) : validationFailure(errors);
}

/** Validates an untrusted public chart configuration without evaluating callbacks or G2 options. */
export function validateChartConfig(input: unknown): ValidationResult<ChartConfig> {
  try {
    return validateChartConfigInternal(input);
  } catch {
    return validationFailure([configIssue('UNREADABLE_INPUT', '/')]);
  }
}

function present<TValue>(key: string, value: TValue | undefined): Record<string, TValue> {
  return value === undefined ? {} : { [key]: value };
}

/** Maps public semantic appearance into the existing internal rendering contract. */
export function toFinancialChartAppearance(config: ChartConfig): FinancialChartAppearance {
  const appearance = config.appearance;
  const colors = appearance?.colors;
  const axes = appearance?.axes;
  const labels = appearance?.labels;
  const animation = appearance?.animation;
  const groupRegion = appearance?.groupRegion;
  const numberFormat = appearance?.numberFormat;
  const valueLabel = labels?.value;
  const groupLabel = labels?.group;
  const valueLabelOptions = typeof valueLabel === 'object' ? valueLabel : undefined;
  const groupLabelOptions = typeof groupLabel === 'object' ? groupLabel : undefined;

  return {
    ...present('title', appearance?.title),
    ...(colors === undefined
      ? {}
      : {
          palette: {
            ...present('start', 'start' in colors ? colors.start : undefined),
            ...present('positive', 'positive' in colors ? colors.positive : undefined),
            ...present('negative', 'negative' in colors ? colors.negative : undefined),
            ...present('subtotal', 'subtotal' in colors ? colors.subtotal : undefined),
            ...present('group', colors.group),
            ...present('end', 'end' in colors ? colors.end : undefined),
          },
        }),
    ...(axes === undefined
      ? {}
      : {
          axis: {
            ...present('x', axes.category),
            ...present('y', axes.value),
          },
        }),
    ...present(
      'valueLabels',
      typeof valueLabel === 'string' ? valueLabel : valueLabelOptions?.display,
    ),
    ...(valueLabelOptions === undefined
      ? {}
      : {
          valueLabelStyle: {
            ...present('placement', valueLabelOptions.placement),
            ...present('offset', valueLabelOptions.offset),
            ...present('color', valueLabelOptions.color),
            ...present('fontSize', valueLabelOptions.fontSize),
            ...present('fontWeight', valueLabelOptions.fontWeight),
            ...present('background', valueLabelOptions.background),
            ...present('backgroundColor', valueLabelOptions.backgroundColor),
            ...present('backgroundOpacity', valueLabelOptions.backgroundOpacity),
          },
        }),
    ...present(
      'tooltip',
      config.data.schemaVersion === '3.0.0' ? (appearance?.tooltip ?? true) : appearance?.tooltip,
    ),
    ...(animation === undefined
      ? {}
      : {
          animation: {
            ...present('enabled', animation.enabled),
            ...present('duration', animation.duration),
          },
        }),
    ...(groupRegion === undefined && groupLabel === undefined
      ? {}
      : {
          groupRegion: {
            ...present('enabled', groupRegion?.enabled),
            ...present('fillOpacity', groupRegion?.opacity),
            ...present(
              'label',
              typeof groupLabel === 'string' ? groupLabel : groupLabelOptions?.display,
            ),
            ...(groupLabelOptions === undefined
              ? {}
              : {
                  labelStyle: {
                    ...present('placement', groupLabelOptions.placement),
                    ...present('offset', groupLabelOptions.offset),
                    ...present('color', groupLabelOptions.color),
                    ...present('fontSize', groupLabelOptions.fontSize),
                    ...present('fontWeight', groupLabelOptions.fontWeight),
                    ...present('background', groupLabelOptions.background),
                    ...present('backgroundColor', groupLabelOptions.backgroundColor),
                    ...present('backgroundOpacity', groupLabelOptions.backgroundOpacity),
                  },
                }),
          },
        }),
    ...(numberFormat === undefined
      ? {}
      : {
          numberFormat: {
            ...present('minimumFractionDigits', numberFormat.minimumFractionDigits),
            ...present('maximumFractionDigits', numberFormat.maximumFractionDigits),
            ...present('currencyDisplay', numberFormat.currencyDisplay),
          },
        }),
  };
}

/** Checks whether a persisted view belongs to the declared public chart configuration. */
export function viewMatchesChartConfig(view: unknown, config: ChartConfig): boolean {
  const validated = validateViewSpec(view, config.data);
  return validated.ok && validated.value.chartType === config.type;
}
