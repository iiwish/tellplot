import type { SourceItemId, ViewNodeId } from '../domain/ids';
import type { SourceData, ViewSpec } from '../domain/model';
import { collectLeafSourceIds, locateViewNode } from '../domain/viewTree';

export type GroupSelectionResult =
  | {
      readonly ok: true;
      readonly nodeIds: readonly ViewNodeId[];
      readonly sourceIds: readonly SourceItemId[];
    }
  | {
      readonly ok: false;
      readonly reason: 'GROUP_TOO_SMALL' | 'NON_CONTIGUOUS_GROUP_SELECTION' | 'ITEM_LOCKED';
    };

/** Classifies contiguous, unpinned view nodes that share one direct parent. */
export function evaluateGroupSelection(
  sourceData: SourceData,
  viewSpec: ViewSpec,
  selectedIds: readonly ViewNodeId[],
): GroupSelectionResult {
  const uniqueIds = [...new Set(selectedIds)];
  if (uniqueIds.length < 2) {
    return { ok: false, reason: 'GROUP_TOO_SMALL' };
  }

  const sourceItems = new Map(sourceData.items.map(item => [item.id, item]));
  const locations = uniqueIds.map(nodeId => locateViewNode(viewSpec, nodeId));
  if (locations.some(location => location === undefined)) {
    return { ok: false, reason: 'NON_CONTIGUOUS_GROUP_SELECTION' };
  }
  const leafIds = uniqueIds.flatMap(nodeId => collectLeafSourceIds(viewSpec, nodeId));
  if (
    leafIds.some(
      itemId =>
        sourceItems.get(itemId)?.kind !== 'contribution' || viewSpec.pinnedItemIds.includes(itemId),
    )
  ) {
    return { ok: false, reason: 'ITEM_LOCKED' };
  }

  const firstLocation = locations[0];
  if (
    firstLocation === undefined ||
    locations.some(location => location?.containerId !== firstLocation.containerId)
  ) {
    return { ok: false, reason: 'NON_CONTIGUOUS_GROUP_SELECTION' };
  }
  const selected = new Set(uniqueIds);
  const orderedIds = firstLocation.values.filter(nodeId => selected.has(nodeId));
  if (orderedIds.length !== uniqueIds.length) {
    return { ok: false, reason: 'NON_CONTIGUOUS_GROUP_SELECTION' };
  }
  const firstIndex = firstLocation.values.indexOf(orderedIds[0] as ViewNodeId);
  const contiguous = orderedIds.every(
    (nodeId, offset) => firstLocation.values[firstIndex + offset] === nodeId,
  );
  return contiguous
    ? {
        ok: true,
        nodeIds: orderedIds,
        sourceIds: orderedIds.flatMap(nodeId => collectLeafSourceIds(viewSpec, nodeId)),
      }
    : { ok: false, reason: 'NON_CONTIGUOUS_GROUP_SELECTION' };
}
