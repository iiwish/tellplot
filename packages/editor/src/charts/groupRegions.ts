import type { Mark } from '@antv/g2';

import type {
  CategoricalComparisonProjection,
  GroupId,
  ResolvedFinancialChartAppearance,
  SourceItemId,
  ViewNodeId,
  ViewSpec,
} from '@tellplot/core';
import { collectLeafSourceIds, groupDepth, locateViewNode } from '@tellplot/core';
import { comparisonFlipToInteriorLabelTransform } from '../rendering/g2/comparisonLabelTransform';
import { createForegroundLabelStyle } from './labelStyle';

interface VisibleProjectionDatum {
  readonly nodeId: ViewNodeId;
  readonly sourceIds: readonly SourceItemId[];
  readonly amount?: number;
  readonly start?: number;
  readonly end?: number;
}

export interface ExpandedGroupRegion {
  readonly regionId: `group-region:${string}`;
  readonly groupId: GroupId;
  readonly label: string;
  readonly depth: number;
  readonly startNodeId: ViewNodeId;
  readonly endNodeId: ViewNodeId;
  readonly valueStart: number;
  readonly valueEnd: number;
  readonly labelValue: number;
}

interface ComparisonGroupLabelDatum extends ExpandedGroupRegion {
  readonly helperKey: string;
}

interface ExpandedGroupRegionMarkOptions {
  readonly regions: readonly ExpandedGroupRegion[];
  readonly categoryDomain: readonly ViewNodeId[];
  readonly valueDomain?: readonly [number, number] | undefined;
  readonly appearance: ResolvedFinancialChartAppearance;
  readonly reducedMotion: boolean;
  readonly denseCanvas: boolean;
  readonly transposed?: boolean;
  readonly activeGroupId?: GroupId | undefined;
}

function coordinate(transposed: boolean) {
  return transposed ? { transform: [{ type: 'transpose' as const }] } : {};
}

function scales(
  categoryDomain: readonly ViewNodeId[],
  transposed: boolean,
  valueDomain: readonly [number, number] | undefined,
) {
  return {
    x: {
      type: 'band' as const,
      domain: [...categoryDomain],
      padding: 0.24,
      ...(transposed ? { reverse: true } : {}),
    },
    y: {
      type: 'linear' as const,
      nice: true,
      zero: true,
      ...(valueDomain === undefined ? {} : { domain: [...valueDomain] }),
    },
  };
}

function animation(appearance: ResolvedFinancialChartAppearance, reducedMotion: boolean) {
  return reducedMotion || !appearance.animation.enabled
    ? false
    : {
        enter: {
          type: 'fadeIn' as const,
          duration: appearance.animation.duration,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        },
        update: {
          type: 'morphing' as const,
          duration: appearance.animation.duration,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        },
        exit: {
          type: 'fadeOut' as const,
          duration: appearance.animation.duration,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        },
      };
}

/** Builds the renderer-owned bounded background reused by screen, SVG, and PNG specs. */
export function createExpandedGroupRegionMark({
  regions,
  categoryDomain,
  valueDomain,
  appearance,
  reducedMotion,
  transposed = false,
  activeGroupId,
}: ExpandedGroupRegionMarkOptions): Mark | undefined {
  if (!appearance.groupRegion.enabled || regions.length === 0) {
    return undefined;
  }
  const fillOpacity = (region: ExpandedGroupRegion): number =>
    Math.min(
      0.2,
      activeGroupId === region.groupId
        ? Math.max(appearance.groupRegion.fillOpacity * 2.5, 0.12)
        : appearance.groupRegion.fillOpacity * (1 + Math.min(region.depth - 1, 2) * 0.3),
    );
  return {
    type: 'range',
    data: [...regions],
    ...(transposed ? { coordinate: coordinate(transposed) } : {}),
    encode: {
      x: ['startNodeId', 'endNodeId'],
      y: ['valueStart', 'valueEnd'],
      key: 'regionId',
    },
    scale: scales(categoryDomain, transposed, valueDomain),
    labels: [],
    style: {
      fill: appearance.palette.group,
      fillOpacity,
      lineWidth: (region: ExpandedGroupRegion) => (activeGroupId === region.groupId ? 1 : 0),
      pointerEvents: 'none',
      stroke: appearance.palette.group,
      strokeOpacity: 0.45,
    },
    tooltip: false,
    animate: animation(appearance, reducedMotion),
  };
}

/** Builds a foreground text mark whose labels stay above interval marks. */
export function createExpandedGroupRegionLabelMark({
  regions,
  categoryDomain,
  valueDomain,
  appearance,
  denseCanvas,
  transposed = false,
}: ExpandedGroupRegionMarkOptions): Mark | undefined {
  if (
    !appearance.groupRegion.enabled ||
    appearance.groupRegion.label !== 'auto' ||
    denseCanvas ||
    regions.length === 0
  ) {
    return undefined;
  }
  const labelStyle = appearance.groupRegion.labelStyle;
  const inside = labelStyle.placement === 'inside';
  return {
    type: 'text',
    data: [...regions],
    ...(transposed ? { coordinate: coordinate(transposed) } : {}),
    encode: {
      x: 'startNodeId',
      y: 'labelValue',
      text: 'label',
      key: 'regionId',
    },
    zIndex: 10,
    scale: scales(categoryDomain, transposed, valueDomain),
    style: {
      ...createForegroundLabelStyle(labelStyle),
      dx: (region: ExpandedGroupRegion) => Math.min(Math.max(region.depth - 1, 0), 2) * 10,
      dy: (region: ExpandedGroupRegion) => {
        const distance = labelStyle.offset + Math.min(Math.max(region.depth - 1, 0), 2) * 12;
        return inside ? distance : -distance;
      },
      stroke: labelStyle.background ? 'transparent' : 'rgba(255, 255, 255, 0.94)',
      textAlign: 'center',
      textBaseline: inside ? 'top' : 'bottom',
    },
    tooltip: false,
    animate: false,
  };
}

/** Builds the comparison-only category-centered point label above every expanded group region. */
export function createComparisonExpandedGroupRegionLabelMark({
  regions,
  categoryDomain,
  valueDomain,
  appearance,
  denseCanvas,
  transposed = false,
}: ExpandedGroupRegionMarkOptions): Mark | undefined {
  if (
    !appearance.groupRegion.enabled ||
    appearance.groupRegion.label !== 'auto' ||
    denseCanvas ||
    regions.length === 0
  ) {
    return undefined;
  }
  const labelStyle = appearance.groupRegion.labelStyle;
  const inside = labelStyle.placement === 'inside';
  const data: ComparisonGroupLabelDatum[] = regions.map(region => ({
    ...region,
    helperKey: JSON.stringify(['comparison-group-label', region.groupId]),
  }));
  const value = {
    key: 'categorical-comparison-group-labels',
    type: 'point',
    data,
    ...(transposed ? { coordinate: coordinate(true) } : {}),
    encode: {
      x: 'startNodeId',
      y: 'labelValue',
      key: 'helperKey',
    },
    scale: scales(categoryDomain, transposed, valueDomain),
    axis: false,
    legend: false,
    labels: [
      {
        text: 'label',
        position: transposed ? (inside ? 'left' : 'right') : inside ? 'bottom' : 'top',
        transform: [
          { type: comparisonFlipToInteriorLabelTransform, transposed },
          { type: 'exceedAdjust' as const, bounds: 'main' as const },
        ],
        style: {
          ...createForegroundLabelStyle(labelStyle),
          dx: (region: ComparisonGroupLabelDatum) =>
            transposed
              ? (inside ? -1 : 1) *
                (labelStyle.offset + Math.min(Math.max(region.depth - 1, 0), 2) * 10)
              : 0,
          dy: (region: ComparisonGroupLabelDatum) =>
            transposed
              ? 0
              : (inside ? 1 : -1) *
                (labelStyle.offset + Math.min(Math.max(region.depth - 1, 0), 2) * 12),
        },
      },
    ],
    style: { opacity: 0, pointerEvents: 'none' as const },
    tooltip: false,
    animate: false,
  };
  return value as unknown as Mark;
}

function visibleValueExtent(
  projection: readonly VisibleProjectionDatum[],
): readonly [number, number] | undefined {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;

  for (const datum of projection) {
    if (
      typeof datum.start === 'number' &&
      Number.isFinite(datum.start) &&
      typeof datum.end === 'number' &&
      Number.isFinite(datum.end)
    ) {
      minimum = Math.min(minimum, datum.start, datum.end);
      maximum = Math.max(maximum, datum.start, datum.end);
      continue;
    }
    if (typeof datum.amount === 'number' && Number.isFinite(datum.amount)) {
      minimum = Math.min(minimum, 0, datum.amount);
      maximum = Math.max(maximum, 0, datum.amount);
    }
  }

  return Number.isFinite(minimum) && Number.isFinite(maximum) ? [minimum, maximum] : undefined;
}

function visibleUpperEdge(datum: VisibleProjectionDatum): number | undefined {
  if (
    typeof datum.start === 'number' &&
    Number.isFinite(datum.start) &&
    typeof datum.end === 'number' &&
    Number.isFinite(datum.end)
  ) {
    return Math.max(datum.start, datum.end);
  }
  return typeof datum.amount === 'number' && Number.isFinite(datum.amount)
    ? Math.max(0, datum.amount)
    : undefined;
}

/** Projects expanded recursive groups onto the visible category domain shared by every chart family. */
export function projectExpandedGroupRegions(
  viewSpec: ViewSpec,
  projection: readonly VisibleProjectionDatum[],
): readonly ExpandedGroupRegion[] {
  const collapsed = new Set(viewSpec.collapsedGroupIds);
  const regions: ExpandedGroupRegion[] = [];

  for (const group of Object.values(viewSpec.groups)) {
    let ancestorId: ViewNodeId = group.id;
    let hiddenByCollapsedAncestor = false;
    const visited = new Set<ViewNodeId>();
    while (!visited.has(ancestorId)) {
      visited.add(ancestorId);
      if (collapsed.has(ancestorId as GroupId)) {
        hiddenByCollapsedAncestor = true;
        break;
      }
      const location = locateViewNode(viewSpec, ancestorId);
      if (location === undefined || location.containerId === 'root') {
        break;
      }
      ancestorId = location.containerId;
    }
    if (hiddenByCollapsedAncestor) {
      continue;
    }
    const leaves = new Set(collectLeafSourceIds(viewSpec, group.id));
    const visible = projection.filter(datum =>
      datum.sourceIds.some(sourceId => leaves.has(sourceId)),
    );
    const first = visible[0];
    const last = visible.at(-1);
    const valueExtent = visibleValueExtent(visible);
    if (first === undefined || last === undefined || valueExtent === undefined) {
      continue;
    }
    regions.push({
      regionId: `group-region:${group.id}`,
      groupId: group.id,
      label: group.label,
      depth: groupDepth(viewSpec, group.id),
      startNodeId: first.nodeId,
      endNodeId: last.nodeId,
      valueStart: valueExtent[0],
      valueEnd: valueExtent[1],
      labelValue: visibleUpperEdge(first) ?? valueExtent[1],
    });
  }

  return regions.sort(
    (left, right) =>
      left.depth - right.depth ||
      projection.findIndex(datum => datum.nodeId === left.startNodeId) -
        projection.findIndex(datum => datum.nodeId === right.startNodeId) ||
      left.groupId.localeCompare(right.groupId),
  );
}

/** Projects comparison regions across all visible category-series values and the zero baseline. */
export function projectComparisonExpandedGroupRegions(
  viewSpec: ViewSpec,
  projection: CategoricalComparisonProjection,
): readonly ExpandedGroupRegion[] {
  const collapsed = new Set(viewSpec.collapsedGroupIds);
  const regions: ExpandedGroupRegion[] = [];

  for (const group of Object.values(viewSpec.groups)) {
    let ancestorId: ViewNodeId = group.id;
    let hiddenByCollapsedAncestor = false;
    const visited = new Set<ViewNodeId>();
    while (!visited.has(ancestorId)) {
      visited.add(ancestorId);
      if (collapsed.has(ancestorId as GroupId)) {
        hiddenByCollapsedAncestor = true;
        break;
      }
      const location = locateViewNode(viewSpec, ancestorId);
      if (location === undefined || location.containerId === 'root') {
        break;
      }
      ancestorId = location.containerId;
    }
    if (hiddenByCollapsedAncestor) {
      continue;
    }

    const leaves = new Set(collectLeafSourceIds(viewSpec, group.id));
    const visible = projection.filter(datum =>
      datum.sourceIds.some(sourceId => leaves.has(sourceId)),
    );
    const first = visible[0];
    const last = visible.at(-1);
    if (first === undefined || last === undefined) {
      continue;
    }
    let minimum = 0;
    let maximum = 0;
    for (const datum of visible) {
      for (const value of datum.values) {
        minimum = Math.min(minimum, value.amount);
        maximum = Math.max(maximum, value.amount);
      }
    }
    regions.push({
      regionId: `group-region:${group.id}`,
      groupId: group.id,
      label: group.label,
      depth: groupDepth(viewSpec, group.id),
      startNodeId: first.nodeId,
      endNodeId: last.nodeId,
      valueStart: minimum,
      valueEnd: maximum,
      labelValue: maximum,
    });
  }

  return regions.sort(
    (left, right) =>
      left.depth - right.depth ||
      projection.findIndex(datum => datum.nodeId === left.startNodeId) -
        projection.findIndex(datum => datum.nodeId === right.startNodeId) ||
      left.groupId.localeCompare(right.groupId),
  );
}
