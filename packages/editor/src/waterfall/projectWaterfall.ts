import { validationFailure, validationIssue, validationSuccess } from '../domain/errors';
import type { GroupId, ViewNodeId } from '../domain/ids';
import type { SourceData, SourceItem, ViewGroup, ViewSpec } from '../domain/model';
import { validateViewSpec } from '../domain/validation';
import { collectLeafSourceIds } from '../domain/viewTree';
import type {
  WaterfallDatum,
  WaterfallDatumKind,
  WaterfallProjectionResult,
} from './waterfallTypes';

const MAX_ULP_DISTANCE = 8n;
const FLOAT_SIGN_BIT = 1n << 63n;
const FLOAT_MASK = (1n << 64n) - 1n;

interface IndexedSource {
  readonly itemsById: ReadonlyMap<string, SourceItem>;
  readonly sourceIndexById: ReadonlyMap<string, number>;
  readonly segmentByContributionId: ReadonlyMap<string, number>;
  readonly subtotalsBySegment: ReadonlyMap<number, SourceItem>;
  readonly segmentCount: number;
  readonly start: SourceItem;
  readonly end: SourceItem;
}

interface CompensatedAccumulator {
  sum: number;
  correction: number;
}

function createAccumulator(initialValue: number): CompensatedAccumulator {
  return { sum: initialValue, correction: 0 };
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

function reset(accumulator: CompensatedAccumulator, value: number): void {
  accumulator.sum = value;
  accumulator.correction = 0;
}

function isSafe(accumulator: CompensatedAccumulator): boolean {
  const value = total(accumulator);
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
}

function orderedFloatBits(value: number): bigint {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value, false);
  const bits = view.getBigUint64(0, false);
  return (bits & FLOAT_SIGN_BIT) === 0n ? bits | FLOAT_SIGN_BIT : ~bits & FLOAT_MASK;
}

function equalsWithinUlps(left: number, right: number): boolean {
  if (left === right) {
    return true;
  }
  const leftBits = orderedFloatBits(left);
  const rightBits = orderedFloatBits(right);
  const distance = leftBits >= rightBits ? leftBits - rightBits : rightBits - leftBits;
  return distance <= MAX_ULP_DISTANCE;
}

function indexSource(sourceData: SourceData): IndexedSource {
  const itemsById = new Map<string, SourceItem>();
  const sourceIndexById = new Map<string, number>();
  const segmentByContributionId = new Map<string, number>();
  const subtotalsBySegment = new Map<number, SourceItem>();
  let segment = 0;

  sourceData.items.forEach((item, index) => {
    itemsById.set(item.id, item);
    sourceIndexById.set(item.id, index);
    if (item.kind === 'contribution') {
      segmentByContributionId.set(item.id, segment);
    } else if (item.kind === 'subtotal') {
      subtotalsBySegment.set(segment, item);
      segment += 1;
    }
  });

  // The canonical validator proves both anchors and every indexed relationship below.
  const start = sourceData.items[0] as SourceItem;
  const end = sourceData.items.at(-1) as SourceItem;

  return {
    itemsById,
    sourceIndexById,
    segmentByContributionId,
    subtotalsBySegment,
    segmentCount: segment + 1,
    start,
    end,
  };
}

function anchorDatum(item: SourceItem, kind: 'start' | 'subtotal' | 'end'): WaterfallDatum {
  return {
    nodeId: item.id,
    label: item.label,
    start: 0,
    end: item.amount,
    amount: item.amount,
    kind,
    sourceIds: [item.id],
    locked: true,
    order: -1,
    groupPath: [],
    depth: 0,
  };
}

function contributionDatum(
  item: SourceItem,
  start: number,
  end: number,
  locked: boolean,
  groupPath: readonly GroupId[],
): WaterfallDatum {
  const kind: WaterfallDatumKind = item.amount < 0 ? 'negative' : 'positive';
  return {
    nodeId: item.id,
    label: item.label,
    start,
    end,
    amount: item.amount,
    kind,
    sourceIds: [item.id],
    locked,
    order: -1,
    groupPath,
    depth: groupPath.length + 1,
  };
}

function withOrder(datum: WaterfallDatum, order: number): WaterfallDatum {
  return { ...datum, order };
}

function numericFailure(
  sourceIndex: number,
  operation: 'accumulate' | 'groupAggregate',
): WaterfallProjectionResult {
  return validationFailure([
    validationIssue('INVALID_SOURCE_DATA', 'UNSAFE_AMOUNT', `/items/${sourceIndex}/amount`, {
      operation,
      sourceIndex,
    }),
  ]);
}

function anchorFailure(sourceIndex: number, anchor: 'subtotal' | 'end'): WaterfallProjectionResult {
  return validationFailure([
    validationIssue('INVALID_SOURCE_DATA', 'INVALID_ANCHOR', `/items/${sourceIndex}/amount`, {
      anchor,
      sourceIndex,
    }),
  ]);
}

function groupSegment(group: ViewGroup, source: IndexedSource, viewSpec: ViewSpec): number {
  const firstLeaf = collectLeafSourceIds(viewSpec, group.id)[0] as string;
  return source.segmentByContributionId.get(firstLeaf) as number;
}

function getGroup(viewSpec: ViewSpec, nodeId: ViewNodeId): ViewGroup | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(viewSpec.groups, nodeId);
  return descriptor !== undefined && 'value' in descriptor
    ? (descriptor.value as ViewGroup)
    : undefined;
}

function projectValidated(sourceData: SourceData, viewSpec: ViewSpec): WaterfallProjectionResult {
  const source = indexSource(sourceData);
  const nodesBySegment = new Map<number, ViewNodeId[]>();
  for (const nodeId of viewSpec.rootOrder) {
    const group = getGroup(viewSpec, nodeId);
    const segment =
      group === undefined
        ? source.segmentByContributionId.get(nodeId)
        : groupSegment(group, source, viewSpec);
    const validatedSegment = segment as number;
    const nodes = nodesBySegment.get(validatedSegment) ?? [];
    nodes.push(nodeId);
    nodesBySegment.set(validatedSegment, nodes);
  }

  const projection: WaterfallDatum[] = [];
  const push = (datum: WaterfallDatum): void => {
    projection.push(withOrder(datum, projection.length));
  };
  const pinnedIds = new Set(viewSpec.pinnedItemIds);
  const collapsedGroupIds = new Set(viewSpec.collapsedGroupIds);
  const current = createAccumulator(source.start.amount);
  push(anchorDatum(source.start, 'start'));

  for (let segment = 0; segment < source.segmentCount; segment += 1) {
    for (const nodeId of nodesBySegment.get(segment) ?? []) {
      const projectNode = (
        currentNodeId: ViewNodeId,
        groupPath: readonly GroupId[],
      ): WaterfallProjectionResult | undefined => {
        const currentGroup = getGroup(viewSpec, currentNodeId);
        if (currentGroup !== undefined) {
          const nextPath = [...groupPath, currentGroup.id];
          if (collapsedGroupIds.has(currentGroup.id)) {
            const leaves = collectLeafSourceIds(viewSpec, currentGroup.id);
            const groupAccumulator = createAccumulator(0);
            const groupStart = total(current);
            for (const leafId of leaves) {
              const item = source.itemsById.get(leafId) as SourceItem;
              const sourceIndex = source.sourceIndexById.get(leafId) as number;
              add(groupAccumulator, item.amount);
              if (!isSafe(groupAccumulator)) {
                return numericFailure(sourceIndex, 'groupAggregate');
              }
              add(current, item.amount);
              if (!isSafe(current)) {
                return numericFailure(sourceIndex, 'accumulate');
              }
            }
            push({
              nodeId: currentGroup.id,
              label: currentGroup.label,
              start: groupStart,
              end: total(current),
              amount: total(groupAccumulator),
              kind: 'group',
              sourceIds: [...leaves],
              locked: leaves.some(childId => pinnedIds.has(childId)),
              order: -1,
              groupPath: nextPath,
              depth: nextPath.length,
            });
            return undefined;
          }
          for (const childId of currentGroup.childIds) {
            const failure = projectNode(childId, nextPath);
            if (failure !== undefined) {
              return failure;
            }
          }
          return undefined;
        }

        const item = source.itemsById.get(currentNodeId) as SourceItem;
        const sourceIndex = source.sourceIndexById.get(currentNodeId) as number;
        const itemStart = total(current);
        add(current, item.amount);
        if (!isSafe(current)) {
          return numericFailure(sourceIndex, 'accumulate');
        }
        push(contributionDatum(item, itemStart, total(current), pinnedIds.has(item.id), groupPath));
        return undefined;
      };

      const failure = projectNode(nodeId, []);
      if (failure !== undefined) {
        return failure;
      }
    }

    const subtotal = source.subtotalsBySegment.get(segment);
    if (subtotal !== undefined) {
      const sourceIndex = source.sourceIndexById.get(subtotal.id) as number;
      if (!equalsWithinUlps(total(current), subtotal.amount)) {
        return anchorFailure(sourceIndex, 'subtotal');
      }
      push(anchorDatum(subtotal, 'subtotal'));
      reset(current, subtotal.amount);
    }
  }

  const endIndex = source.sourceIndexById.get(source.end.id) as number;
  if (!equalsWithinUlps(total(current), source.end.amount)) {
    return anchorFailure(endIndex, 'end');
  }
  push(anchorDatum(source.end, 'end'));

  return validationSuccess(projection);
}

/** Projects immutable source and view state into one renderer-ready waterfall sequence. */
export function projectWaterfall(
  sourceData: SourceData,
  viewSpec: ViewSpec,
): WaterfallProjectionResult {
  const validation = validateViewSpec(viewSpec, sourceData);
  if (!validation.ok) {
    return validation;
  }

  try {
    return projectValidated(sourceData, validation.value);
  } catch {
    return validationFailure([validationIssue('INVALID_VIEW_SPEC', 'UNREADABLE_INPUT', '/')]);
  }
}
