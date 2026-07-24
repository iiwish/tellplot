import { validationFailure, validationIssue, validationSuccess } from '../../domain/errors';
import type { ViewNodeId } from '../../domain/ids';
import type {
  CategoricalSourceData,
  CategoricalSourceItem,
  SourceData,
  ViewGroup,
  ViewSpec,
} from '../../domain/model';
import { validateViewSpec } from '../../domain/validation';
import { collectLeafSourceIds } from '../../domain/viewTree';
import type { CategoricalDatum, CategoricalProjectionResult } from './types';

interface CompensatedAccumulator {
  sum: number;
  correction: number;
}

interface IndexedCategoricalSource {
  readonly itemsById: ReadonlyMap<string, CategoricalSourceItem>;
  readonly sourceIndexById: ReadonlyMap<string, number>;
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

function total(accumulator: CompensatedAccumulator): number {
  return accumulator.sum + accumulator.correction;
}

function isSafe(accumulator: CompensatedAccumulator): boolean {
  const value = total(accumulator);
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
}

function indexSource(sourceData: CategoricalSourceData): IndexedCategoricalSource {
  const itemsById = new Map<string, CategoricalSourceItem>();
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

function numericFailure(sourceIndex: number): CategoricalProjectionResult {
  return validationFailure([
    validationIssue('INVALID_SOURCE_DATA', 'UNSAFE_AMOUNT', `/items/${sourceIndex}/amount`, {
      operation: 'groupAggregate',
      sourceIndex,
    }),
  ]);
}

function projectValidated(
  sourceData: CategoricalSourceData,
  viewSpec: ViewSpec,
): CategoricalProjectionResult {
  const source = indexSource(sourceData);
  const pinnedIds = new Set(viewSpec.pinnedItemIds);
  const collapsedGroupIds = new Set(viewSpec.collapsedGroupIds);
  const projection: CategoricalDatum[] = [];

  const push = (datum: Omit<CategoricalDatum, 'order'>): void => {
    projection.push({ ...datum, order: projection.length });
  };

  const projectNode = (nodeId: ViewNodeId): CategoricalProjectionResult | undefined => {
    const group = getGroup(viewSpec, nodeId);
    if (group !== undefined) {
      if (collapsedGroupIds.has(group.id)) {
        const sourceIds = collectLeafSourceIds(viewSpec, group.id);
        const accumulator = createAccumulator();
        for (const sourceId of sourceIds) {
          const item = source.itemsById.get(sourceId) as CategoricalSourceItem;
          const sourceIndex = source.sourceIndexById.get(sourceId) as number;
          add(accumulator, item.amount);
          if (!isSafe(accumulator)) {
            return numericFailure(sourceIndex);
          }
        }
        push({
          nodeId: group.id,
          label: group.label,
          amount: total(accumulator),
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

    const item = source.itemsById.get(nodeId) as CategoricalSourceItem;
    push({
      nodeId: item.id,
      label: item.label,
      amount: item.amount,
      kind: item.amount < 0 ? 'negative' : 'positive',
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

/** Projects immutable categorical source and narrative state into one chart-neutral sequence. */
export function projectCategorical(
  sourceData: SourceData,
  viewSpec: ViewSpec,
): CategoricalProjectionResult {
  const validation = validateViewSpec(viewSpec, sourceData);
  if (!validation.ok) {
    return validation;
  }
  if (sourceData.schemaVersion !== '2.0.0' || sourceData.dataKind !== 'categorical') {
    return validationFailure([
      validationIssue('SOURCE_CONFLICT', 'INCOMPATIBLE_CHART_TYPE', '/chartType'),
    ]);
  }

  try {
    return projectValidated(sourceData, validation.value);
  } catch {
    return validationFailure([validationIssue('INVALID_VIEW_SPEC', 'UNREADABLE_INPUT', '/')]);
  }
}
