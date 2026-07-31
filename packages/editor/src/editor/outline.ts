import {
  collectLeafSourceIds,
  ownGroup,
  type CategoricalDatum,
  type CategoricalProjection,
  type SourceItemId,
  type ViewGroup,
  type ViewNodeId,
  type ViewSpec,
  type WaterfallDatum,
  type WaterfallProjection,
} from '@tellplot/core';

export interface OutlineEntry {
  readonly nodeId: ViewNodeId;
  readonly label: string;
  readonly amount: number | null;
  readonly sourceIds: readonly SourceItemId[];
  readonly locked: boolean;
  readonly level: number;
  readonly kind: 'anchor' | 'contribution' | 'group';
  readonly expanded?: boolean;
  readonly groupSize?: number;
}

function groupEntry(
  group: ViewGroup,
  datum: WaterfallDatum | CategoricalDatum | undefined,
  expanded: boolean,
  view: ViewSpec,
  level: number,
): OutlineEntry {
  const sourceIds = collectLeafSourceIds(view, group.id);
  return {
    nodeId: group.id,
    label: group.label,
    amount: datum?.amount ?? null,
    sourceIds: [...sourceIds],
    locked: sourceIds.some(itemId => view.pinnedItemIds.includes(itemId)),
    level,
    kind: 'group',
    expanded,
    groupSize: group.childIds.length,
  };
}

function waterfallEntries(
  view: ViewSpec,
  projection: WaterfallProjection,
): readonly OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const emittedGroups = new Set<string>();
  const collapsed = new Set(view.collapsedGroupIds);

  for (const datum of projection) {
    for (let index = 0; index < datum.groupPath.length; index += 1) {
      const groupId = datum.groupPath[index];
      const group = groupId === undefined ? undefined : ownGroup(view, groupId);
      if (group !== undefined && !emittedGroups.has(group.id)) {
        emittedGroups.add(group.id);
        const isCollapsed = collapsed.has(group.id);
        entries.push(
          groupEntry(
            group,
            isCollapsed && datum.nodeId === group.id ? datum : undefined,
            !isCollapsed,
            view,
            index + 1,
          ),
        );
      }
    }
    if (ownGroup(view, datum.nodeId) !== undefined) {
      continue;
    }
    entries.push({
      nodeId: datum.nodeId,
      label: datum.label,
      amount: datum.amount,
      sourceIds: [...datum.sourceIds],
      locked: datum.locked,
      level: datum.kind === 'positive' || datum.kind === 'negative' ? datum.depth : 1,
      kind: datum.kind === 'positive' || datum.kind === 'negative' ? 'contribution' : 'anchor',
    });
  }
  return entries;
}

function categoricalEntries(
  view: ViewSpec,
  projection: CategoricalProjection,
): readonly OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const collapsed = new Set(view.collapsedGroupIds);
  const datumById = new Map(projection.map(datum => [datum.nodeId, datum]));
  const visited = new Set<ViewNodeId>();

  const visit = (nodeId: ViewNodeId, level: number): void => {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);
    const group = ownGroup(view, nodeId);
    if (group !== undefined) {
      const isCollapsed = collapsed.has(group.id);
      entries.push(
        groupEntry(
          group,
          isCollapsed ? datumById.get(group.id) : undefined,
          !isCollapsed,
          view,
          level,
        ),
      );
      if (!isCollapsed) {
        for (const childId of group.childIds) {
          visit(childId, level + 1);
        }
      }
      return;
    }
    const datum = datumById.get(nodeId);
    if (datum !== undefined) {
      entries.push({
        nodeId: datum.nodeId,
        label: datum.label,
        amount: datum.amount,
        sourceIds: [...datum.sourceIds],
        locked: datum.locked,
        level,
        kind: 'contribution',
      });
    }
  };

  for (const nodeId of view.rootOrder) {
    visit(nodeId, 1);
  }
  return entries;
}

export function outlineEntries(
  view: ViewSpec,
  projection: WaterfallProjection | CategoricalProjection,
  family: 'waterfall' | 'categorical',
): readonly OutlineEntry[] {
  return family === 'waterfall'
    ? waterfallEntries(view, projection as WaterfallProjection)
    : categoricalEntries(view, projection as CategoricalProjection);
}
