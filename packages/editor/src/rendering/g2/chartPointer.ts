import {
  categoryCoordinate,
  projectChartCategoryBounds,
  type CategoryAxis,
  type ChartSceneRectangle,
  type MoveTargetEdge,
  type ViewNodeId,
} from '@tellplot/core';
import type { ComparisonSceneReceipt } from './comparisonSceneReceipt';

export interface ChartPointerPoint {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

export interface ChartCategoryElementPointer extends ChartPointerPoint {
  readonly axis: CategoryAxis;
  readonly nodeId: ViewNodeId;
  readonly edge: MoveTargetEdge;
  readonly min: number;
  readonly max: number;
  readonly target: number;
}

export type ChartCategoryPointerResult =
  | { readonly ok: true; readonly value: ChartCategoryElementPointer }
  | {
      readonly ok: false;
      readonly reason: 'INVALID_INPUT' | 'SOURCE_NOT_FOUND' | 'INVALID_BOUNDS';
    };

export type ChartSceneElementBounds = ChartSceneRectangle;

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

function sceneRectangle(value: unknown, nodeId: ViewNodeId): ChartSceneElementBounds | undefined {
  const bounds = asRecord(value);
  const min = coordinatePair(read(bounds, 'min'));
  const max = coordinatePair(read(bounds, 'max'));
  if (min !== undefined && max !== undefined) {
    return { nodeId, minX: min[0], minY: min[1], maxX: max[0], maxY: max[1] };
  }

  const center = coordinatePair(read(bounds, 'center'));
  const halfExtents = coordinatePair(read(bounds, 'halfExtents'));
  return center === undefined || halfExtents === undefined
    ? undefined
    : {
        nodeId,
        minX: center[0] - halfExtents[0],
        minY: center[1] - halfExtents[1],
        maxX: center[0] + halfExtents[0],
        maxY: center[1] + halfExtents[1],
      };
}

function readChartPointerPoint(event: unknown): ChartPointerPoint | undefined {
  const record = asRecord(event);
  const canvas = asRecord(read(record, 'canvas'));
  const pointerId = finiteNumber(read(record, 'pointerId'));
  const x = finiteNumber(read(canvas, 'x'));
  const y = finiteNumber(read(canvas, 'y'));
  return pointerId === undefined || x === undefined || y === undefined
    ? undefined
    : { pointerId, x, y };
}

/** Adapts the locked G2 event shape without exposing it from a public package entry. */
export function readChartCategoryElementPointer(
  event: unknown,
  axis: CategoryAxis,
): ChartCategoryPointerResult {
  const point = readChartPointerPoint(event);
  if (point === undefined || categoryCoordinate(point, axis) === undefined) {
    return { ok: false, reason: 'INVALID_INPUT' };
  }

  const record = asRecord(event);
  const data = asRecord(read(record, 'data'));
  const datum = asRecord(read(data, 'data'));
  const nodeId = read(datum, 'nodeId');
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    return { ok: false, reason: 'SOURCE_NOT_FOUND' };
  }

  const target = asRecord(read(record, 'target'));
  const getBounds = read(target, 'getBounds');
  if (target === undefined || typeof getBounds !== 'function') {
    return { ok: false, reason: 'INVALID_BOUNDS' };
  }

  let rectangle: ChartSceneElementBounds | undefined;
  try {
    rectangle = sceneRectangle(Reflect.apply(getBounds, target, []), nodeId);
  } catch {
    rectangle = undefined;
  }
  if (rectangle === undefined) {
    return { ok: false, reason: 'INVALID_BOUNDS' };
  }

  const bounds = projectChartCategoryBounds(rectangle, axis);
  const coordinate = categoryCoordinate(point, axis);
  if (bounds === undefined || coordinate === undefined) {
    return { ok: false, reason: 'INVALID_BOUNDS' };
  }
  const edge: MoveTargetEdge = coordinate < bounds.center ? 'before' : 'after';

  return {
    ok: true,
    value: {
      ...point,
      axis,
      nodeId,
      edge,
      min: bounds.min,
      max: bounds.max,
      target: edge === 'before' ? bounds.min : bounds.max,
    },
  };
}

/** Maps a comparison interval event only through an already-authoritative receipt. */
export function readComparisonChartCategoryElementPointer(
  event: unknown,
  receipt: ComparisonSceneReceipt,
): ChartCategoryPointerResult {
  const point = readChartPointerPoint(event);
  if (point === undefined || categoryCoordinate(point, receipt.axis) === undefined) {
    return { ok: false, reason: 'INVALID_INPUT' };
  }
  const record = asRecord(event);
  const data = asRecord(read(record, 'data'));
  const datum = asRecord(read(data, 'data'));
  const nodeId = read(datum, 'nodeId');
  const seriesId = read(datum, 'seriesId');
  const elementKey = read(datum, 'elementKey');
  if (
    typeof nodeId !== 'string' ||
    typeof seriesId !== 'string' ||
    typeof elementKey !== 'string'
  ) {
    return { ok: false, reason: 'SOURCE_NOT_FOUND' };
  }
  const element = receipt.elements.find(
    candidate =>
      candidate.nodeId === nodeId &&
      candidate.seriesId === seriesId &&
      candidate.elementKey === elementKey,
  );
  const category = receipt.categories.find(candidate => candidate.nodeId === nodeId);
  if (element === undefined || category === undefined) {
    return { ok: false, reason: 'SOURCE_NOT_FOUND' };
  }
  const bounds = category.allZero ? category.pointerBounds : element;
  if (
    bounds === undefined ||
    point.x < bounds.minX ||
    point.x > bounds.maxX ||
    point.y < bounds.minY ||
    point.y > bounds.maxY
  ) {
    return { ok: false, reason: 'INVALID_BOUNDS' };
  }
  const coordinate = categoryCoordinate(point, receipt.axis);
  if (coordinate === undefined) {
    return { ok: false, reason: 'INVALID_BOUNDS' };
  }
  const edge: MoveTargetEdge = coordinate < category.axisBounds.center ? 'before' : 'after';
  return {
    ok: true,
    value: {
      ...point,
      axis: receipt.axis,
      nodeId,
      edge,
      min: category.axisBounds.min,
      max: category.axisBounds.max,
      target: edge === 'before' ? category.axisBounds.min : category.axisBounds.max,
    },
  };
}

/** Reads renderer-owned element bounds for internal hit testing and overlay placement. */
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
      const bounds = sceneRectangle(Reflect.apply(getBounds, element, []), nodeId);
      if (bounds !== undefined && projectChartCategoryBounds(bounds, 'x') !== undefined) {
        result.push(bounds);
      }
    } catch {
      continue;
    }
  }
  return result;
}
