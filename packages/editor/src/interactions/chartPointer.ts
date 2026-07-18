import type { ViewNodeId } from '../domain/ids';
import type { MoveTargetEdge } from './moveTargets';

export interface ChartPointerPoint {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

export interface ChartElementPointer extends ChartPointerPoint {
  readonly nodeId: ViewNodeId;
  readonly edge: MoveTargetEdge;
  readonly minX: number;
  readonly maxX: number;
  readonly targetX: number;
}

export interface ChartHorizontalBounds {
  readonly nodeId: ViewNodeId;
  readonly minX: number;
  readonly maxX: number;
}

export interface ChartHorizontalDropTarget {
  readonly nodeId: ViewNodeId;
  readonly edge: MoveTargetEdge;
  readonly targetX: number;
}

export interface ChartHorizontalDropInput {
  readonly itemId: ViewNodeId;
  readonly startPointerX: number;
  readonly pointerX: number;
  readonly orderedBounds: readonly ChartHorizontalBounds[];
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
    ? (value as UnknownRecord)
    : undefined;
}

function read(record: UnknownRecord | undefined, key: string): unknown {
  if (record === undefined) {
    return undefined;
  }
  try {
    return record[key];
  } catch {
    return undefined;
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function coordinatePair(value: unknown): readonly [number, number] | undefined {
  const record = asRecord(value);
  const x = finiteNumber(read(record, '0'));
  const y = finiteNumber(read(record, '1'));
  return x === undefined || y === undefined ? undefined : [x, y];
}

interface HorizontalBounds {
  readonly minX: number;
  readonly centerX: number;
  readonly maxX: number;
}

export interface ChartSceneElementBounds {
  readonly nodeId: ViewNodeId;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function distanceToRange(value: number, min: number, max: number): number {
  return value < min ? min - value : value > max ? value - max : 0;
}

/** Resolves a renderer-owned mark through a minimum square pointer target. */
export function resolveChartMinimumTargetHit(
  point: ChartPointerPoint,
  bounds: readonly ChartSceneElementBounds[],
  minimumTargetSize: number,
): ChartElementPointer | undefined {
  if (!Number.isFinite(minimumTargetSize) || minimumTargetSize <= 0) {
    return undefined;
  }
  let best:
    | {
        readonly bounds: ChartSceneElementBounds;
        readonly distance: number;
        readonly centerDistance: number;
      }
    | undefined;
  for (const candidate of bounds) {
    const values = [candidate.minX, candidate.minY, candidate.maxX, candidate.maxY];
    if (
      values.some(value => !Number.isFinite(value)) ||
      candidate.minX > candidate.maxX ||
      candidate.minY > candidate.maxY
    ) {
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
    return undefined;
  }
  const centerX = (best.bounds.minX + best.bounds.maxX) / 2;
  const edge: MoveTargetEdge = point.x < centerX ? 'before' : 'after';
  return {
    ...point,
    nodeId: best.bounds.nodeId,
    edge,
    minX: best.bounds.minX,
    maxX: best.bounds.maxX,
    targetX: edge === 'before' ? best.bounds.minX : best.bounds.maxX,
  };
}

function rectangularBounds(value: unknown): Omit<ChartSceneElementBounds, 'nodeId'> | undefined {
  const bounds = asRecord(value);
  const min = coordinatePair(read(bounds, 'min'));
  const max = coordinatePair(read(bounds, 'max'));
  if (min === undefined || max === undefined) {
    return undefined;
  }
  return { minX: min[0], minY: min[1], maxX: max[0], maxY: max[1] };
}

function horizontalBounds(value: unknown): HorizontalBounds | undefined {
  const bounds = asRecord(value);
  const min = coordinatePair(read(bounds, 'min'));
  const max = coordinatePair(read(bounds, 'max'));
  if (min !== undefined && max !== undefined) {
    return { minX: min[0], centerX: (min[0] + max[0]) / 2, maxX: max[0] };
  }

  const center = coordinatePair(read(bounds, 'center'));
  const halfExtents = coordinatePair(read(bounds, 'halfExtents'));
  return center === undefined || halfExtents === undefined
    ? undefined
    : {
        minX: center[0] - halfExtents[0],
        centerX: center[0],
        maxX: center[0] + halfExtents[0],
      };
}

/** Reads only the stable G2 canvas coordinates and pointer identity. */
export function readChartPointerPoint(event: unknown): ChartPointerPoint | undefined {
  const record = asRecord(event);
  const canvas = asRecord(read(record, 'canvas'));
  const pointerId = finiteNumber(read(record, 'pointerId'));
  const x = finiteNumber(read(canvas, 'x'));
  const y = finiteNumber(read(canvas, 'y'));
  return pointerId === undefined || x === undefined || y === undefined
    ? undefined
    : { pointerId, x, y };
}

/**
 * Adapts the locked G2 5.4 event boundary: datum at data.data, scene bounds on
 * target.getBounds(), and pointer coordinates at canvas.x/y.
 */
export function readChartElementPointer(event: unknown): ChartElementPointer | undefined {
  const point = readChartPointerPoint(event);
  if (point === undefined) {
    return undefined;
  }

  const record = asRecord(event);
  const data = asRecord(read(record, 'data'));
  const datum = asRecord(read(data, 'data'));
  const nodeId = read(datum, 'nodeId');
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    return undefined;
  }

  const target = asRecord(read(record, 'target'));
  const getBounds = read(target, 'getBounds');
  if (target === undefined || typeof getBounds !== 'function') {
    return undefined;
  }

  let bounds: HorizontalBounds | undefined;
  try {
    bounds = horizontalBounds(Reflect.apply(getBounds, target, []));
  } catch {
    bounds = undefined;
  }
  if (bounds === undefined) {
    return undefined;
  }

  const edge: MoveTargetEdge = point.x < bounds.centerX ? 'before' : 'after';

  return {
    ...point,
    nodeId,
    edge,
    minX: bounds.minX,
    maxX: bounds.maxX,
    targetX: edge === 'before' ? bounds.minX : bounds.maxX,
  };
}

function validHorizontalBounds(
  bounds: ChartHorizontalBounds | undefined,
): bounds is ChartHorizontalBounds {
  return (
    bounds !== undefined &&
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.maxX) &&
    bounds.minX <= bounds.maxX
  );
}

/** Resolves reorder collision from the translated bar rectangle and X coordinate only. */
export function resolveChartHorizontalDropTarget({
  itemId,
  startPointerX,
  pointerX,
  orderedBounds,
}: ChartHorizontalDropInput): ChartHorizontalDropTarget | null {
  if (!Number.isFinite(startPointerX) || !Number.isFinite(pointerX)) {
    return null;
  }
  const sourceIndex = orderedBounds.findIndex(bounds => bounds.nodeId === itemId);
  const source = orderedBounds[sourceIndex];
  const deltaX = pointerX - startPointerX;
  if (!validHorizontalBounds(source) || deltaX === 0) {
    return null;
  }

  if (deltaX > 0) {
    const draggedRight = source.maxX + deltaX;
    let target: ChartHorizontalBounds | undefined;
    for (let index = sourceIndex + 1; index < orderedBounds.length; index += 1) {
      const candidate = orderedBounds[index];
      if (!validHorizontalBounds(candidate)) {
        continue;
      }
      if (draggedRight >= candidate.minX) {
        target = candidate;
      } else {
        break;
      }
    }
    return target === undefined
      ? null
      : { nodeId: target.nodeId, edge: 'after', targetX: target.maxX };
  }

  const draggedLeft = source.minX + deltaX;
  let target: ChartHorizontalBounds | undefined;
  for (let index = sourceIndex - 1; index >= 0; index -= 1) {
    const candidate = orderedBounds[index];
    if (!validHorizontalBounds(candidate)) {
      continue;
    }
    if (draggedLeft <= candidate.maxX) {
      target = candidate;
    } else {
      break;
    }
  }
  return target === undefined
    ? null
    : { nodeId: target.nodeId, edge: 'before', targetX: target.minX };
}

/** Resolves a semantic chart target to its rendered G2 scene edge. */
export function readChartTargetX(
  context: unknown,
  nodeId: ViewNodeId,
  edge: MoveTargetEdge,
): number | undefined {
  const contextRecord = asRecord(context);
  const canvas = asRecord(read(contextRecord, 'canvas'));
  const sceneDocument = asRecord(read(canvas, 'document'));
  const getElementsByClassName = read(sceneDocument, 'getElementsByClassName');
  if (sceneDocument === undefined || typeof getElementsByClassName !== 'function') {
    return undefined;
  }

  let elements: unknown;
  try {
    elements = Reflect.apply(getElementsByClassName, sceneDocument, ['element']);
  } catch {
    return undefined;
  }

  const collection = asRecord(elements);
  const length = finiteNumber(read(collection, 'length'));
  if (collection === undefined || length === undefined || !Number.isInteger(length) || length < 0) {
    return undefined;
  }

  for (let index = 0; index < length; index += 1) {
    const element = asRecord(read(collection, String(index)));
    const sceneData = asRecord(read(element, '__data__'));
    const datum = asRecord(read(sceneData, 'data'));
    if (read(datum, 'nodeId') !== nodeId) {
      continue;
    }
    const getBounds = read(element, 'getBounds');
    if (element === undefined || typeof getBounds !== 'function') {
      return undefined;
    }
    try {
      const bounds = horizontalBounds(Reflect.apply(getBounds, element, []));
      return bounds === undefined ? undefined : edge === 'before' ? bounds.minX : bounds.maxX;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/** Reads renderer-owned element bounds for hit testing and DOM overlay placement. */
export function readChartElementBounds(context: unknown): readonly ChartSceneElementBounds[] {
  const contextRecord = asRecord(context);
  const canvas = asRecord(read(contextRecord, 'canvas'));
  const sceneDocument = asRecord(read(canvas, 'document'));
  const getElementsByClassName = read(sceneDocument, 'getElementsByClassName');
  if (sceneDocument === undefined || typeof getElementsByClassName !== 'function') {
    return [];
  }
  let elements: unknown;
  try {
    elements = Reflect.apply(getElementsByClassName, sceneDocument, ['element']);
  } catch {
    return [];
  }
  const collection = asRecord(elements);
  const length = finiteNumber(read(collection, 'length'));
  if (collection === undefined || length === undefined || !Number.isInteger(length) || length < 0) {
    return [];
  }
  const result: ChartSceneElementBounds[] = [];
  for (let index = 0; index < length; index += 1) {
    const element = asRecord(read(collection, String(index)));
    const sceneData = asRecord(read(element, '__data__'));
    const datum = asRecord(read(sceneData, 'data'));
    const nodeId = read(datum, 'nodeId');
    const getBounds = read(element, 'getBounds');
    if (typeof nodeId !== 'string' || element === undefined || typeof getBounds !== 'function') {
      continue;
    }
    try {
      const bounds = rectangularBounds(Reflect.apply(getBounds, element, []));
      if (bounds !== undefined) {
        result.push({ nodeId, ...bounds });
      }
    } catch {
      continue;
    }
  }
  return result;
}
