import type { GroupId, ViewNodeId } from '../domain/ids';
import type { ViewSpec } from '../domain/model';
import { collectLeafSourceIds, locateViewNode } from '../domain/viewTree';
import type { MoveTargetEdge } from './moveTargets';

export type CategoryAxis = 'x' | 'y';

export interface ChartAxisPoint {
  readonly x: number;
  readonly y: number;
}

export interface ChartSceneRectangle {
  readonly nodeId: ViewNodeId;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface ChartCategoryBounds {
  readonly nodeId: ViewNodeId;
  readonly min: number;
  readonly center: number;
  readonly max: number;
}

export interface ChartCategoryGroupBounds {
  readonly nodeId: GroupId;
  readonly min: number;
  readonly max: number;
}

export interface ChartCategoryDropTarget {
  readonly nodeId: ViewNodeId;
  readonly edge: MoveTargetEdge;
  readonly target: number;
}

export interface ChartCategoryDropInput {
  readonly axis: CategoryAxis;
  readonly itemId: ViewNodeId;
  readonly startPointer: ChartAxisPoint;
  readonly pointer: ChartAxisPoint;
  readonly orderedBounds: readonly ChartCategoryBounds[];
  readonly boundsRevision: number;
  readonly currentRevision: number;
  readonly minimumDragDistance: number;
}

export type ChartCategoryFailureReason =
  | 'INVALID_INPUT'
  | 'INVALID_BOUNDS'
  | 'STALE_BOUNDS'
  | 'BELOW_THRESHOLD'
  | 'SOURCE_NOT_FOUND'
  | 'NO_TARGET';

export type ChartCategoryDropResult =
  | { readonly ok: true; readonly target: ChartCategoryDropTarget }
  | { readonly ok: false; readonly reason: ChartCategoryFailureReason };

export interface ChartCategoryMinimumTargetHit {
  readonly nodeId: ViewNodeId;
  readonly edge: MoveTargetEdge;
  readonly min: number;
  readonly max: number;
  readonly target: number;
}

export type ChartCategoryHitResult =
  | { readonly ok: true; readonly hit: ChartCategoryMinimumTargetHit }
  | { readonly ok: false; readonly reason: 'INVALID_INPUT' | 'NO_TARGET' };

function validAxis(axis: CategoryAxis): boolean {
  return axis === 'x' || axis === 'y';
}

function validPoint(point: ChartAxisPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function validSceneRectangle(bounds: ChartSceneRectangle): boolean {
  return (
    [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite) &&
    bounds.minX <= bounds.maxX &&
    bounds.minY <= bounds.maxY
  );
}

function validCategoryBounds(
  bounds: ChartCategoryBounds | undefined,
): bounds is ChartCategoryBounds {
  return (
    bounds !== undefined &&
    Number.isFinite(bounds.min) &&
    Number.isFinite(bounds.center) &&
    Number.isFinite(bounds.max) &&
    bounds.min <= bounds.center &&
    bounds.center <= bounds.max
  );
}

function validRevision(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function categoryCoordinate(point: ChartAxisPoint, axis: CategoryAxis): number | undefined {
  if (!validAxis(axis) || !validPoint(point)) {
    return undefined;
  }
  return axis === 'x' ? point.x : point.y;
}

/** Projects one complete renderer-owned rectangle onto the selected category axis. */
export function projectChartCategoryBounds(
  bounds: ChartSceneRectangle,
  axis: CategoryAxis,
): ChartCategoryBounds | undefined {
  if (!validAxis(axis) || !validSceneRectangle(bounds)) {
    return undefined;
  }
  const min = axis === 'x' ? bounds.minX : bounds.minY;
  const max = axis === 'x' ? bounds.maxX : bounds.maxY;
  return { nodeId: bounds.nodeId, min, center: (min + max) / 2, max };
}

/**
 * Projects the direct-to-outer source group boundaries from renderer-owned visible mark bounds.
 * The snapshot lets a pointer leave a group in the gap before it collides with the next item.
 */
export function projectChartCategorySourceGroupBounds(
  viewSpec: ViewSpec,
  itemId: ViewNodeId,
  visibleBounds: readonly ChartCategoryBounds[],
): readonly ChartCategoryGroupBounds[] {
  const ancestorIds: GroupId[] = [];
  const visited = new Set<ViewNodeId>();
  let current = itemId;
  while (!visited.has(current)) {
    visited.add(current);
    const location = locateViewNode(viewSpec, current);
    if (location === undefined || location.containerId === 'root') {
      break;
    }
    ancestorIds.push(location.containerId);
    current = location.containerId;
  }

  return ancestorIds.flatMap(groupId => {
    const groupSourceIds = new Set(collectLeafSourceIds(viewSpec, groupId));
    const memberBounds = visibleBounds.filter(bounds =>
      collectLeafSourceIds(viewSpec, bounds.nodeId).some(sourceId => groupSourceIds.has(sourceId)),
    );
    if (memberBounds.length === 0 || memberBounds.some(bounds => !validCategoryBounds(bounds))) {
      return [];
    }
    return [
      {
        nodeId: groupId,
        min: Math.min(...memberBounds.map(bounds => bounds.min)),
        max: Math.max(...memberBounds.map(bounds => bounds.max)),
      },
    ];
  });
}

/** Returns whether a collision candidate is still represented inside one source group. */
export function isChartCategoryTargetWithinGroup(
  viewSpec: ViewSpec,
  groupId: ViewNodeId,
  targetId: ViewNodeId,
): boolean {
  const groupSourceIds = new Set(collectLeafSourceIds(viewSpec, groupId));
  return collectLeafSourceIds(viewSpec, targetId).some(sourceId => groupSourceIds.has(sourceId));
}

/**
 * Resolves the outermost source-group boundary crossed by the pointer.
 * Crossing a child mark edge still reorders inside the group; crossing the region edge moves out.
 */
export function resolveChartCategorySourceGroupExitTarget(
  axis: CategoryAxis,
  startPointer: ChartAxisPoint,
  pointer: ChartAxisPoint,
  sourceGroupBounds: readonly ChartCategoryGroupBounds[],
): ChartCategoryDropTarget | undefined {
  const start = categoryCoordinate(startPointer, axis);
  const current = categoryCoordinate(pointer, axis);
  if (start === undefined || current === undefined || current === start) {
    return undefined;
  }
  let target: ChartCategoryDropTarget | undefined;
  if (current > start) {
    for (const bounds of sourceGroupBounds) {
      if (Number.isFinite(bounds.max) && current > bounds.max) {
        target = { nodeId: bounds.nodeId, edge: 'after', target: bounds.max };
      }
    }
    return target;
  }
  for (const bounds of sourceGroupBounds) {
    if (Number.isFinite(bounds.min) && current < bounds.min) {
      target = { nodeId: bounds.nodeId, edge: 'before', target: bounds.min };
    }
  }
  return target;
}

/** Resolves deterministic reorder collision using only the selected category-axis coordinate. */
export function resolveChartCategoryDropTarget({
  axis,
  itemId,
  startPointer,
  pointer,
  orderedBounds,
  boundsRevision,
  currentRevision,
  minimumDragDistance,
}: ChartCategoryDropInput): ChartCategoryDropResult {
  const start = categoryCoordinate(startPointer, axis);
  const current = categoryCoordinate(pointer, axis);
  if (
    start === undefined ||
    current === undefined ||
    !Number.isFinite(minimumDragDistance) ||
    minimumDragDistance < 0 ||
    !validRevision(boundsRevision) ||
    !validRevision(currentRevision)
  ) {
    return { ok: false, reason: 'INVALID_INPUT' };
  }
  if (boundsRevision !== currentRevision) {
    return { ok: false, reason: 'STALE_BOUNDS' };
  }

  const sourceIndex = orderedBounds.findIndex(bounds => bounds.nodeId === itemId);
  if (sourceIndex < 0) {
    return { ok: false, reason: 'SOURCE_NOT_FOUND' };
  }
  const source = orderedBounds[sourceIndex];
  if (!validCategoryBounds(source)) {
    return { ok: false, reason: 'INVALID_BOUNDS' };
  }

  const delta = current - start;
  if (Math.abs(delta) < minimumDragDistance) {
    return { ok: false, reason: 'BELOW_THRESHOLD' };
  }
  if (delta === 0) {
    return { ok: false, reason: 'NO_TARGET' };
  }

  if (delta > 0) {
    const draggedMax = source.max + delta;
    let target: ChartCategoryBounds | undefined;
    for (let index = sourceIndex + 1; index < orderedBounds.length; index += 1) {
      const candidate = orderedBounds[index];
      if (!validCategoryBounds(candidate)) {
        continue;
      }
      if (draggedMax >= candidate.min) {
        target = candidate;
      } else {
        break;
      }
    }
    return target === undefined
      ? { ok: false, reason: 'NO_TARGET' }
      : {
          ok: true,
          target: { nodeId: target.nodeId, edge: 'after', target: target.max },
        };
  }

  const draggedMin = source.min + delta;
  let target: ChartCategoryBounds | undefined;
  for (let index = sourceIndex - 1; index >= 0; index -= 1) {
    const candidate = orderedBounds[index];
    if (!validCategoryBounds(candidate)) {
      continue;
    }
    if (draggedMin <= candidate.max) {
      target = candidate;
    } else {
      break;
    }
  }
  return target === undefined
    ? { ok: false, reason: 'NO_TARGET' }
    : {
        ok: true,
        target: { nodeId: target.nodeId, edge: 'before', target: target.min },
      };
}

function distanceToRange(value: number, min: number, max: number): number {
  return value < min ? min - value : value > max ? value - max : 0;
}

/** Resolves a minimum two-dimensional pointer target while deriving its edge from one category axis. */
export function resolveChartCategoryMinimumTargetHit(
  point: ChartAxisPoint,
  bounds: readonly ChartSceneRectangle[],
  minimumTargetSize: number,
  axis: CategoryAxis,
): ChartCategoryHitResult {
  if (
    !validAxis(axis) ||
    !validPoint(point) ||
    !Number.isFinite(minimumTargetSize) ||
    minimumTargetSize <= 0
  ) {
    return { ok: false, reason: 'INVALID_INPUT' };
  }

  let best:
    | {
        readonly bounds: ChartSceneRectangle;
        readonly distance: number;
        readonly centerDistance: number;
      }
    | undefined;
  for (const candidate of bounds) {
    if (!validSceneRectangle(candidate)) {
      continue;
    }
    const paddingX = Math.max(0, (minimumTargetSize - (candidate.maxX - candidate.minX)) / 2);
    const paddingY = Math.max(0, (minimumTargetSize - (candidate.maxY - candidate.minY)) / 2);
    if (
      point.x < candidate.minX - paddingX ||
      point.x > candidate.maxX + paddingX ||
      point.y < candidate.minY - paddingY ||
      point.y > candidate.maxY + paddingY
    ) {
      continue;
    }
    const dx = distanceToRange(point.x, candidate.minX, candidate.maxX);
    const dy = distanceToRange(point.y, candidate.minY, candidate.maxY);
    const distance = dx * dx + dy * dy;
    const centerX = (candidate.minX + candidate.maxX) / 2;
    const centerY = (candidate.minY + candidate.maxY) / 2;
    const centerDistance = (point.x - centerX) ** 2 + (point.y - centerY) ** 2;
    if (
      best === undefined ||
      distance < best.distance ||
      (distance === best.distance && centerDistance < best.centerDistance)
    ) {
      best = { bounds: candidate, distance, centerDistance };
    }
  }
  if (best === undefined) {
    return { ok: false, reason: 'NO_TARGET' };
  }

  const categoryBounds = projectChartCategoryBounds(best.bounds, axis);
  const coordinate = categoryCoordinate(point, axis);
  if (categoryBounds === undefined || coordinate === undefined) {
    return { ok: false, reason: 'NO_TARGET' };
  }
  const edge: MoveTargetEdge = coordinate < categoryBounds.center ? 'before' : 'after';
  return {
    ok: true,
    hit: {
      nodeId: categoryBounds.nodeId,
      edge,
      min: categoryBounds.min,
      max: categoryBounds.max,
      target: edge === 'before' ? categoryBounds.min : categoryBounds.max,
    },
  };
}
