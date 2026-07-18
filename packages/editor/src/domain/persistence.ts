import { validationFailure, validationIssue, type ValidationResult } from './errors';
import type { SourceData, ViewGroup, ViewSpec } from './model';
import { validateViewSpec } from './validation';

function sortedRecord<TValue>(
  record: Readonly<Record<string, TValue>>,
  mapValue: (value: TValue) => unknown = value => value,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map(key => [key, mapValue(record[key] as TValue)]),
  );
}

function serializableGroup(group: ViewGroup): ViewGroup {
  return {
    id: group.id,
    label: group.label,
    childIds: [...group.childIds],
  };
}

/** Serializes the supported ViewSpec fields as deterministic JSON. */
export function serializeViewSpec(viewSpec: ViewSpec): string {
  return JSON.stringify({
    schemaVersion: viewSpec.schemaVersion,
    datasetId: viewSpec.datasetId,
    chartType: viewSpec.chartType,
    revision: viewSpec.revision,
    rootOrder: [...viewSpec.rootOrder],
    groups: sortedRecord(viewSpec.groups, serializableGroup),
    collapsedGroupIds: [...viewSpec.collapsedGroupIds],
    pinnedItemIds: [...viewSpec.pinnedItemIds],
    annotations: sortedRecord(viewSpec.annotations),
    emphasis: sortedRecord(viewSpec.emphasis),
  });
}

/** Parses JSON and validates it against the immutable source without reconciliation. */
export function parseViewSpec(
  serialized: string,
  sourceData: SourceData,
): ValidationResult<ViewSpec> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return validationFailure([validationIssue('INVALID_VIEW_SPEC', 'UNREADABLE_INPUT', '/')]);
  }
  return validateViewSpec(parsed, sourceData);
}
