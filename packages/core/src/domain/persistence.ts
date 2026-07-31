import { validationFailure, validationIssue, type ValidationResult } from './errors';
import type { SourceData, ViewGroup, ViewSpec } from './model';
import { validateViewSpec } from './validation';

function sortedRecord<TValue>(
  record: Readonly<Record<string, TValue>>,
  mapValue: (value: TValue) => unknown = value => value,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(record)
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
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

function sortedMembership(values: readonly string[]): readonly string[] {
  return [...values].sort();
}

function serializableViewSpec(
  viewSpec: ViewSpec,
  canonicalizeMembership: boolean,
): Record<string, unknown> {
  return {
    schemaVersion: viewSpec.schemaVersion,
    datasetId: viewSpec.datasetId,
    chartType: viewSpec.chartType,
    revision: viewSpec.revision,
    rootOrder: [...viewSpec.rootOrder],
    groups: sortedRecord(viewSpec.groups, serializableGroup),
    collapsedGroupIds: canonicalizeMembership
      ? sortedMembership(viewSpec.collapsedGroupIds)
      : [...viewSpec.collapsedGroupIds],
    pinnedItemIds: canonicalizeMembership
      ? sortedMembership(viewSpec.pinnedItemIds)
      : [...viewSpec.pinnedItemIds],
    annotations: sortedRecord(viewSpec.annotations),
    emphasis: sortedRecord(viewSpec.emphasis),
  };
}

/** Serializes the supported ViewSpec fields as deterministic JSON. */
export function serializeViewSpec(viewSpec: ViewSpec): string {
  return JSON.stringify(serializableViewSpec(viewSpec, false));
}

/** Compares ViewSpec semantics while treating collapsed and pinned identifiers as memberships. */
export function viewSpecsEqual(left: ViewSpec, right: ViewSpec): boolean {
  if (left === right) {
    return true;
  }
  try {
    return (
      JSON.stringify(serializableViewSpec(left, true)) ===
      JSON.stringify(serializableViewSpec(right, true))
    );
  } catch {
    return false;
  }
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
