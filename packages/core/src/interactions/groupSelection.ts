import type { GroupId, SourceItemId, ViewNodeId } from '../domain/ids';
import type { SourceData, ViewSpec } from '../domain/model';
import {
  collectLeafSourceIds,
  containerChildren,
  locateViewNode,
  type ViewContainerId,
} from '../domain/viewTree';

export type GroupSelectionMode = 'same-level' | 'nested' | 'lifted';

export type GroupSelectionResult =
  | {
      readonly ok: true;
      readonly nodeIds: readonly ViewNodeId[];
      readonly sourceIds: readonly SourceItemId[];
      readonly containerId: ViewContainerId;
      readonly mode: GroupSelectionMode;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'GROUP_TOO_SMALL'
        | 'NON_CONTIGUOUS_GROUP_SELECTION'
        | 'ITEM_LOCKED'
        | 'REDUNDANT_GROUP_SELECTION';
    };

function pathFromRoot(viewSpec: ViewSpec, nodeId: ViewNodeId): readonly ViewNodeId[] | undefined {
  const reversed: ViewNodeId[] = [];
  const visited = new Set<ViewNodeId>();
  let current = nodeId;
  while (!visited.has(current)) {
    visited.add(current);
    reversed.push(current);
    const location = locateViewNode(viewSpec, current);
    if (location === undefined) {
      return undefined;
    }
    if (location.containerId === 'root') {
      return reversed.reverse();
    }
    current = location.containerId;
  }
  return undefined;
}

function isProperPrefix(candidate: readonly ViewNodeId[], path: readonly ViewNodeId[]): boolean {
  return (
    candidate.length < path.length && candidate.every((nodeId, index) => path[index] === nodeId)
  );
}

function commonPrefixLength(paths: readonly (readonly ViewNodeId[])[]): number {
  const first = paths[0];
  if (first === undefined) {
    return 0;
  }
  let length = 0;
  while (
    length < first.length &&
    paths.every(path => path[length] !== undefined && path[length] === first[length])
  ) {
    length += 1;
  }
  return length;
}

function sameNodeSet(left: readonly ViewNodeId[], right: readonly ViewNodeId[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightIds = new Set(right);
  return left.every(nodeId => rightIds.has(nodeId));
}

/**
 * Normalizes selected descendants to contiguous siblings at their lowest common container.
 * Selecting within one expanded group creates a subgroup; crossing its boundary promotes the
 * complete group node so the command layer still receives a deterministic sibling selection.
 */
export function evaluateGroupSelection(
  sourceData: SourceData,
  viewSpec: ViewSpec,
  selectedIds: readonly ViewNodeId[],
): GroupSelectionResult {
  const uniqueIds = [...new Set(selectedIds)];
  if (uniqueIds.length < 2) {
    return { ok: false, reason: 'GROUP_TOO_SMALL' };
  }

  const allPaths = uniqueIds.map(nodeId => pathFromRoot(viewSpec, nodeId));
  if (allPaths.some(path => path === undefined)) {
    return { ok: false, reason: 'NON_CONTIGUOUS_GROUP_SELECTION' };
  }
  const paths = allPaths.filter(
    (path, index): path is readonly ViewNodeId[] =>
      path !== undefined &&
      !allPaths.some(
        (candidate, candidateIndex) =>
          candidateIndex !== index && candidate !== undefined && isProperPrefix(candidate, path),
      ),
  );
  if (paths.length < 2) {
    return { ok: false, reason: 'GROUP_TOO_SMALL' };
  }

  const prefixLength = commonPrefixLength(paths);
  const containerId: ViewContainerId =
    prefixLength === 0 ? 'root' : (paths[0]?.[prefixLength - 1] as GroupId);
  const values = containerChildren(viewSpec, containerId);
  if (values === undefined) {
    return { ok: false, reason: 'NON_CONTIGUOUS_GROUP_SELECTION' };
  }
  const normalized = new Set(
    paths
      .map(path => path[prefixLength])
      .filter((nodeId): nodeId is ViewNodeId => nodeId !== undefined),
  );
  const orderedIds = values.filter(nodeId => normalized.has(nodeId));
  if (orderedIds.length < 2 || orderedIds.length !== normalized.size) {
    return { ok: false, reason: 'GROUP_TOO_SMALL' };
  }

  const firstIndex = values.indexOf(orderedIds[0] as ViewNodeId);
  const contiguous = orderedIds.every((nodeId, offset) => values[firstIndex + offset] === nodeId);
  if (!contiguous) {
    return { ok: false, reason: 'NON_CONTIGUOUS_GROUP_SELECTION' };
  }

  const sourceItems = new Map(sourceData.items.map(item => [item.id, item]));
  const leafIds = orderedIds.flatMap(nodeId => collectLeafSourceIds(viewSpec, nodeId));
  const categoricalSource =
    sourceData.schemaVersion !== '1.0.0' && sourceData.dataKind === 'categorical';
  if (
    leafIds.some(itemId => {
      const item = sourceItems.get(itemId);
      return (
        item === undefined ||
        (!categoricalSource && (!('kind' in item) || item.kind !== 'contribution')) ||
        viewSpec.pinnedItemIds.includes(itemId)
      );
    })
  ) {
    return { ok: false, reason: 'ITEM_LOCKED' };
  }

  if (containerId !== 'root' && orderedIds.length === values.length) {
    return { ok: false, reason: 'REDUNDANT_GROUP_SELECTION' };
  }

  const lifted = !sameNodeSet(uniqueIds, orderedIds);
  return {
    ok: true,
    nodeIds: orderedIds,
    sourceIds: leafIds,
    containerId,
    mode: lifted ? 'lifted' : containerId === 'root' ? 'same-level' : 'nested',
  };
}
