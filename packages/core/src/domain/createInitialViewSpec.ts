import {
  validationFailure,
  validationIssue,
  validationSuccess,
  type ValidationIssue,
  type ValidationResult,
} from './errors';
import type { ChartType, SourceData, ViewSpec } from './model';
import { sourceDataKind } from './chartPolicy';
import { validateSourceData } from './validation';

const INITIAL_VIEW_OPTION_FIELDS: ReadonlySet<string> = new Set(['chartType']);

type UnknownRecord = Record<string, unknown>;

/** Closed options for selecting a compatible initial chart layout. */
export interface InitialViewSpecOptions {
  readonly chartType?: ChartType;
}

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function optionIssue(
  reason: 'INVALID_CHART_TYPE' | 'NON_PLAIN_DATA' | 'UNKNOWN_FIELD' | 'UNREADABLE_INPUT',
  path: string,
): ValidationIssue {
  return validationIssue('INVALID_VIEW_SPEC', reason, path);
}

function parseOptionsInternal(options: unknown): ValidationResult<ChartType | undefined> {
  if (options === undefined) {
    return validationSuccess(undefined);
  }
  if (!isPlainRecord(options)) {
    return validationFailure([optionIssue('NON_PLAIN_DATA', '/')]);
  }

  const errors: ValidationIssue[] = [];
  let chartType: unknown;
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key === 'symbol') {
      errors.push(optionIssue('NON_PLAIN_DATA', '/'));
      continue;
    }
    const path = `/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    if (!INITIAL_VIEW_OPTION_FIELDS.has(key)) {
      errors.push(optionIssue('UNKNOWN_FIELD', path));
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      errors.push(optionIssue('NON_PLAIN_DATA', path));
      continue;
    }
    chartType = descriptor.value;
  }

  if (
    chartType !== undefined &&
    chartType !== 'waterfall' &&
    chartType !== 'bar' &&
    chartType !== 'column'
  ) {
    errors.push(optionIssue('INVALID_CHART_TYPE', '/chartType'));
  }

  return errors.length === 0
    ? validationSuccess(chartType as ChartType | undefined)
    : validationFailure(errors);
}

function parseOptions(options: unknown): ValidationResult<ChartType | undefined> {
  try {
    return parseOptionsInternal(options);
  } catch {
    return validationFailure([optionIssue('UNREADABLE_INPUT', '/')]);
  }
}

/** Creates a deterministic initial view after validating the source and closed options. */
export function createInitialViewSpec(
  sourceData: SourceData,
  options?: InitialViewSpecOptions,
): ValidationResult<ViewSpec> {
  const sourceResult = validateSourceData(sourceData);
  if (!sourceResult.ok) {
    return sourceResult;
  }

  const optionsResult = parseOptions(options);
  if (!optionsResult.ok) {
    return optionsResult;
  }

  const source = sourceResult.value;
  const sourceKind = sourceDataKind(source);
  const chartType = optionsResult.value ?? (sourceKind === 'categorical' ? 'column' : 'waterfall');
  const compatible =
    sourceKind === 'categorical'
      ? chartType === 'bar' || chartType === 'column'
      : chartType === 'waterfall';
  if (!compatible) {
    return validationFailure([
      validationIssue('SOURCE_CONFLICT', 'INCOMPATIBLE_CHART_TYPE', '/chartType'),
    ]);
  }

  const rootOrder = source.items
    .filter(
      item => sourceKind === 'categorical' || ('kind' in item && item.kind === 'contribution'),
    )
    .map(item => item.id);
  const narrativeFields = {
    datasetId: source.datasetId,
    revision: 0,
    rootOrder,
    groups: {},
    collapsedGroupIds: [],
    pinnedItemIds: [],
    annotations: {},
    emphasis: {},
  } as const;

  if (source.schemaVersion === '1.0.0') {
    return validationSuccess({
      ...narrativeFields,
      schemaVersion: '1.0.0',
      chartType: 'waterfall',
    });
  }
  if (source.schemaVersion === '3.0.0') {
    return validationSuccess({
      ...narrativeFields,
      schemaVersion: '3.0.0',
      chartType: chartType as 'bar' | 'column',
    });
  }
  return validationSuccess({ ...narrativeFields, schemaVersion: '2.0.0', chartType });
}
