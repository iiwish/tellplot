import { validationFailure, validationIssue, validationSuccess } from '../../domain/errors';
import type { ViewNodeId } from '../../domain/ids';
import type {
  CategoricalComparisonSourceData,
  CategoricalComparisonSourceItem,
  SourceData,
  ViewGroup,
  ViewSpec,
} from '../../domain/model';
import { validateViewSpec } from '../../domain/validation';
import { collectLeafSourceIds } from '../../domain/viewTree';
import type {
  CategoricalComparisonDatum,
  CategoricalComparisonProjectionResult,
  CategoricalComparisonSeriesValue,
} from './comparisonTypes';

interface CompensatedAccumulator {
  sum: number;
  correction: number;
}

interface IndexedComparisonSource {
  readonly itemsById: ReadonlyMap<string, CategoricalComparisonSourceItem>;
  readonly sourceIndexById: ReadonlyMap<string, number>;
}

const COMPARISON_SOURCE_KEYS = [
  'schemaVersion',
  'dataKind',
  'datasetId',
  'currency',
  'series',
  'items',
] as const;
const COMPARISON_SERIES_KEYS = ['id', 'label', 'metadata'] as const;
const COMPARISON_ITEM_KEYS = ['id', 'label', 'sourceRef', 'metadata', 'values'] as const;
const COMPARISON_VALUE_KEYS = ['seriesId', 'amount', 'sourceRef', 'metadata'] as const;
const VIEW_KEYS = [
  'schemaVersion',
  'datasetId',
  'chartType',
  'revision',
  'rootOrder',
  'groups',
  'collapsedGroupIds',
  'pinnedItemIds',
  'annotations',
  'emphasis',
] as const;
const GROUP_KEYS = ['id', 'label', 'childIds'] as const;

type UnknownRecord = Record<string, unknown>;

function descriptorValue(record: object, key: PropertyKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

function snapshotArray(value: unknown, snapshotEntry: (entry: unknown) => unknown): unknown[] {
  const array = value as readonly unknown[];
  const lengthDescriptor = Object.getOwnPropertyDescriptor(array, 'length');
  const length = (lengthDescriptor as PropertyDescriptor & { readonly value: number }).value;
  const snapshot = new Array<unknown>(length);
  for (let index = 0; index < length; index += 1) {
    snapshot[index] = snapshotEntry(descriptorValue(array, String(index)));
  }
  return snapshot;
}

function snapshotRecord(record: object, keys: readonly string[]): UnknownRecord {
  return Object.fromEntries(keys.map(key => [key, descriptorValue(record, key)]));
}

function snapshotDynamicRecord(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  const record = value as UnknownRecord;
  return Object.fromEntries(
    Object.getOwnPropertyNames(record).map(key => [key, descriptorValue(record, key)]),
  );
}

function snapshotSeries(value: unknown): unknown {
  const record = value as object;
  const snapshot = snapshotRecord(record, COMPARISON_SERIES_KEYS);
  return { ...snapshot, metadata: snapshotDynamicRecord(snapshot['metadata']) };
}

function snapshotComparisonValue(value: unknown): unknown {
  const record = value as object;
  const snapshot = snapshotRecord(record, COMPARISON_VALUE_KEYS);
  return { ...snapshot, metadata: snapshotDynamicRecord(snapshot['metadata']) };
}

function snapshotComparisonItem(value: unknown): unknown {
  const record = value as object;
  const snapshot = snapshotRecord(record, COMPARISON_ITEM_KEYS);
  return {
    ...snapshot,
    metadata: snapshotDynamicRecord(snapshot['metadata']),
    values: snapshotArray(snapshot['values'], snapshotComparisonValue),
  };
}

function snapshotComparisonSource(sourceData: SourceData): UnknownRecord {
  const snapshot = snapshotRecord(sourceData, COMPARISON_SOURCE_KEYS);
  return {
    ...snapshot,
    series: snapshotArray(snapshot['series'], snapshotSeries),
    items: snapshotArray(snapshot['items'], snapshotComparisonItem),
  };
}

function snapshotGroup(value: unknown): unknown {
  const snapshot = snapshotRecord(value as object, GROUP_KEYS);
  return {
    ...snapshot,
    childIds: snapshotArray((snapshot as UnknownRecord)['childIds'], entry => entry),
  };
}

function snapshotGroups(value: unknown): UnknownRecord {
  const record = value as UnknownRecord;
  return Object.fromEntries(
    Object.getOwnPropertyNames(record).map(key => [
      key,
      snapshotGroup(descriptorValue(record, key)),
    ]),
  );
}

function snapshotView(viewSpec: ViewSpec): UnknownRecord {
  const snapshot = snapshotRecord(viewSpec, VIEW_KEYS);
  return {
    ...snapshot,
    rootOrder: snapshotArray(snapshot['rootOrder'], entry => entry),
    groups: snapshotGroups(snapshot['groups']),
    collapsedGroupIds: snapshotArray(snapshot['collapsedGroupIds'], entry => entry),
    pinnedItemIds: snapshotArray(snapshot['pinnedItemIds'], entry => entry),
    annotations: snapshotDynamicRecord(snapshot['annotations']),
    emphasis: snapshotDynamicRecord(snapshot['emphasis']),
  };
}

function createAccumulator(): CompensatedAccumulator {
  return { sum: 0, correction: 0 };
}

function add(accumulator: CompensatedAccumulator, value: number): void {
  const next = accumulator.sum + value;
  accumulator.correction +=
    Math.abs(accumulator.sum) >= Math.abs(value)
      ? accumulator.sum - next + value
      : value - next + accumulator.sum;
  accumulator.sum = next;
}

function canonicalAmount(value: number): number {
  return value === 0 ? 0 : value;
}

function total(accumulator: CompensatedAccumulator): number {
  return canonicalAmount(accumulator.sum + accumulator.correction);
}

function isSafe(accumulator: CompensatedAccumulator): boolean {
  const value = total(accumulator);
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
}

function indexSource(sourceData: CategoricalComparisonSourceData): IndexedComparisonSource {
  const itemsById = new Map<string, CategoricalComparisonSourceItem>();
  const sourceIndexById = new Map<string, number>();
  sourceData.items.forEach((item, index) => {
    itemsById.set(item.id, item);
    sourceIndexById.set(item.id, index);
  });
  return { itemsById, sourceIndexById };
}

function getGroup(viewSpec: ViewSpec, nodeId: ViewNodeId): ViewGroup | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(viewSpec.groups, nodeId);
  return descriptor !== undefined && 'value' in descriptor
    ? (descriptor.value as ViewGroup)
    : undefined;
}

function numericFailure(
  sourceIndex: number,
  seriesIndex: number,
): CategoricalComparisonProjectionResult {
  return validationFailure([
    validationIssue(
      'INVALID_SOURCE_DATA',
      'UNSAFE_AMOUNT',
      `/items/${sourceIndex}/values/${seriesIndex}/amount`,
      { operation: 'groupAggregate', sourceIndex, seriesIndex },
    ),
  ]);
}

function categoryValues(
  sourceData: CategoricalComparisonSourceData,
  item: CategoricalComparisonSourceItem,
): readonly CategoricalComparisonSeriesValue[] {
  return sourceData.series.map((series, seriesIndex) => ({
    seriesId: series.id,
    label: series.label,
    amount: canonicalAmount(item.values[seriesIndex]?.amount as number),
  }));
}

function aggregateValues(
  sourceData: CategoricalComparisonSourceData,
  source: IndexedComparisonSource,
  sourceIds: readonly string[],
):
  | { readonly ok: true; readonly values: readonly CategoricalComparisonSeriesValue[] }
  | { readonly ok: false; readonly result: CategoricalComparisonProjectionResult } {
  const accumulators = sourceData.series.map(() => createAccumulator());

  for (const sourceId of sourceIds) {
    const item = source.itemsById.get(sourceId) as CategoricalComparisonSourceItem;
    const sourceIndex = source.sourceIndexById.get(sourceId) as number;
    for (let seriesIndex = 0; seriesIndex < sourceData.series.length; seriesIndex += 1) {
      const accumulator = accumulators[seriesIndex] as CompensatedAccumulator;
      add(accumulator, item.values[seriesIndex]?.amount as number);
      if (!isSafe(accumulator)) {
        return { ok: false, result: numericFailure(sourceIndex, seriesIndex) };
      }
    }
  }

  return {
    ok: true,
    values: sourceData.series.map((series, seriesIndex) => ({
      seriesId: series.id,
      label: series.label,
      amount: total(accumulators[seriesIndex] as CompensatedAccumulator),
    })),
  };
}

function projectValidated(
  sourceData: CategoricalComparisonSourceData,
  viewSpec: ViewSpec,
): CategoricalComparisonProjectionResult {
  const source = indexSource(sourceData);
  const pinnedIds = new Set(viewSpec.pinnedItemIds);
  const collapsedGroupIds = new Set(viewSpec.collapsedGroupIds);
  const projection: CategoricalComparisonDatum[] = [];

  const push = (datum: Omit<CategoricalComparisonDatum, 'order'>): void => {
    projection.push({ ...datum, order: projection.length });
  };

  const projectNode = (nodeId: ViewNodeId): CategoricalComparisonProjectionResult | undefined => {
    const group = getGroup(viewSpec, nodeId);
    if (group !== undefined) {
      if (collapsedGroupIds.has(group.id)) {
        const sourceIds = collectLeafSourceIds(viewSpec, group.id);
        const aggregated = aggregateValues(sourceData, source, sourceIds);
        if (!aggregated.ok) {
          return aggregated.result;
        }
        push({
          nodeId: group.id,
          label: group.label,
          values: aggregated.values,
          kind: 'group',
          sourceIds: [...sourceIds],
          locked: sourceIds.some(sourceId => pinnedIds.has(sourceId)),
        });
        return undefined;
      }
      for (const childId of group.childIds) {
        const failure = projectNode(childId);
        if (failure !== undefined) {
          return failure;
        }
      }
      return undefined;
    }

    const item = source.itemsById.get(nodeId) as CategoricalComparisonSourceItem;
    push({
      nodeId: item.id,
      label: item.label,
      values: categoryValues(sourceData, item),
      kind: 'category',
      sourceIds: [item.id],
      locked: pinnedIds.has(item.id),
    });
    return undefined;
  };

  for (const nodeId of viewSpec.rootOrder) {
    const failure = projectNode(nodeId);
    if (failure !== undefined) {
      return failure;
    }
  }
  return validationSuccess(projection);
}

/** Projects comparison source and category-only narrative state into a renderer-neutral sequence. */
export function projectCategoricalComparison(
  sourceData: SourceData,
  viewSpec: ViewSpec,
): CategoricalComparisonProjectionResult {
  const compatibilityValidation = validateViewSpec(viewSpec, sourceData);
  if (!compatibilityValidation.ok) {
    return compatibilityValidation;
  }

  try {
    let validatedSchemaVersion: unknown;
    try {
      validatedSchemaVersion = descriptorValue(sourceData, 'schemaVersion');
    } catch {
      return validationFailure([validationIssue('INVALID_SOURCE_DATA', 'UNREADABLE_INPUT', '/')]);
    }
    if (validatedSchemaVersion !== '3.0.0') {
      return validationFailure([
        validationIssue('SOURCE_CONFLICT', 'INCOMPATIBLE_PROJECTOR_GENERATION', '/schemaVersion'),
      ]);
    }
    const viewSnapshot = snapshotView(viewSpec);
    let sourceSnapshot: UnknownRecord;
    try {
      sourceSnapshot = snapshotComparisonSource(sourceData);
    } catch {
      return validationFailure([validationIssue('INVALID_SOURCE_DATA', 'UNREADABLE_INPUT', '/')]);
    }
    const snapshotValidation = validateViewSpec(
      viewSnapshot,
      sourceSnapshot as unknown as SourceData,
    );
    if (!snapshotValidation.ok) {
      return snapshotValidation;
    }
    if (sourceSnapshot['schemaVersion'] !== '3.0.0') {
      return validationFailure([
        validationIssue('SOURCE_CONFLICT', 'INCOMPATIBLE_PROJECTOR_GENERATION', '/schemaVersion'),
      ]);
    }
    return projectValidated(
      sourceSnapshot as unknown as CategoricalComparisonSourceData,
      snapshotValidation.value,
    );
  } catch {
    return validationFailure([validationIssue('INVALID_VIEW_SPEC', 'UNREADABLE_INPUT', '/')]);
  }
}
