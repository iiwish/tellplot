import type {
  CategoryAxis,
  ChartAxisPoint,
  ChartCategoryBounds,
  ChartSceneRectangle,
  CategoricalComparisonProjection,
  CategoricalComparisonSeries,
  SeriesId,
  ViewNodeId,
} from '@tellplot/core';

const COMPARISON_VIEW_KEY = 'categorical-comparison-view';
const COMPARISON_INTERVAL_MARK_KEY = 'categorical-comparison-interval';
const ALL_ZERO_TARGET_SIZE = 32;

type UnknownRecord = Readonly<Record<string, unknown>>;

interface ReadResult {
  readonly ok: boolean;
  readonly value?: unknown;
}

export interface ComparisonSceneElementReceipt extends ChartSceneRectangle {
  readonly seriesId: SeriesId;
  readonly elementKey: string;
}

export interface ComparisonCategorySceneReceipt {
  readonly nodeId: ViewNodeId;
  readonly rectangles: readonly ComparisonSceneElementReceipt[];
  readonly axisBounds: ChartCategoryBounds;
  readonly ghostBounds: ChartSceneRectangle;
  readonly pointerBounds: ChartSceneRectangle | undefined;
  readonly allZero: boolean;
}

export interface ComparisonSceneReceipt {
  readonly renderSignature: string;
  readonly renderRevision: number;
  readonly generation: number;
  readonly axis: CategoryAxis;
  readonly elements: readonly ComparisonSceneElementReceipt[];
  readonly categories: readonly ComparisonCategorySceneReceipt[];
}

export interface ComparisonSceneReceiptInput {
  readonly context: unknown;
  readonly projection: CategoricalComparisonProjection;
  readonly series: readonly CategoricalComparisonSeries[];
  readonly axis: CategoryAxis;
  readonly renderSignature: string;
  readonly currentRenderSignature: string;
  readonly renderRevision: number;
  readonly currentRenderRevision: number;
  readonly generation: number;
  readonly currentGeneration: number;
}

export interface ComparisonMarqueeRectangle {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
    ? (value as UnknownRecord)
    : undefined;
}

function read(record: UnknownRecord | undefined, key: string): ReadResult {
  if (record === undefined) {
    return { ok: false };
  }
  try {
    return { ok: true, value: record[key] };
  } catch {
    return { ok: false };
  }
}

function valueOf(record: UnknownRecord | undefined, key: string): unknown {
  const result = read(record, key);
  return result.ok ? result.value : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function safeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function validAxis(axis: CategoryAxis): boolean {
  return axis === 'x' || axis === 'y';
}

function coordinatePair(value: unknown): readonly [number, number] | undefined {
  const record = asRecord(value);
  const x = finiteNumber(valueOf(record, '0'));
  const y = finiteNumber(valueOf(record, '1'));
  return x === undefined || y === undefined ? undefined : [x, y];
}

function call(record: UnknownRecord | undefined, key: string, args: readonly unknown[]): unknown {
  const method = read(record, key);
  if (!method.ok || typeof method.value !== 'function') {
    return undefined;
  }
  try {
    return Reflect.apply(method.value, record, args);
  } catch {
    return undefined;
  }
}

function sceneRectangle(
  value: unknown,
  nodeId: ViewNodeId,
  seriesId: SeriesId,
  elementKey: string,
): ComparisonSceneElementReceipt | undefined {
  const bounds = asRecord(value);
  const min = coordinatePair(valueOf(bounds, 'min'));
  const max = coordinatePair(valueOf(bounds, 'max'));
  if (min !== undefined && max !== undefined) {
    return min[0] <= max[0] && min[1] <= max[1]
      ? {
          nodeId,
          seriesId,
          elementKey,
          minX: min[0],
          minY: min[1],
          maxX: max[0],
          maxY: max[1],
        }
      : undefined;
  }

  const center = coordinatePair(valueOf(bounds, 'center'));
  const halfExtents = coordinatePair(valueOf(bounds, 'halfExtents'));
  if (
    center === undefined ||
    halfExtents === undefined ||
    halfExtents[0] < 0 ||
    halfExtents[1] < 0
  ) {
    return undefined;
  }
  return {
    nodeId,
    seriesId,
    elementKey,
    minX: center[0] - halfExtents[0],
    minY: center[1] - halfExtents[1],
    maxX: center[0] + halfExtents[0],
    maxY: center[1] + halfExtents[1],
  };
}

function expectedElementKey(nodeId: ViewNodeId, seriesId: SeriesId): string {
  return JSON.stringify(['comparison-element', nodeId, seriesId]);
}

function pairKey(nodeId: ViewNodeId, seriesId: SeriesId): string {
  return JSON.stringify([nodeId, seriesId]);
}

function readElements(context: unknown): readonly unknown[] | undefined {
  const contextRecord = asRecord(context);
  const canvas = asRecord(valueOf(contextRecord, 'canvas'));
  const document = asRecord(valueOf(canvas, 'document'));
  const collectionValue = call(document, 'getElementsByClassName', ['element']);
  const collection = asRecord(collectionValue);
  const length = finiteNumber(valueOf(collection, 'length'));
  if (
    collection === undefined ||
    length === undefined ||
    !Number.isSafeInteger(length) ||
    length < 0
  ) {
    return undefined;
  }
  const elements: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const item = read(collection, String(index));
    if (!item.ok || item.value === undefined) {
      return undefined;
    }
    elements.push(item.value);
  }
  return elements;
}

function readMainElement(
  value: unknown,
  expectedPairs: ReadonlySet<string>,
): { readonly claimed: boolean; readonly receipt?: ComparisonSceneElementReceipt } {
  const element = asRecord(value);
  if (element === undefined) {
    return { claimed: false };
  }
  const sceneDataRead = read(element, '__data__');
  const sceneData = asRecord(sceneDataRead.value);
  if (!sceneDataRead.ok) {
    return { claimed: true };
  }
  if (sceneData === undefined) {
    return { claimed: false };
  }
  const markKeyRead = read(sceneData, 'markKey');
  if (!markKeyRead.ok) {
    return { claimed: true };
  }
  if (markKeyRead.value !== COMPARISON_INTERVAL_MARK_KEY) {
    return { claimed: false };
  }

  const viewKey = read(sceneData, 'viewKey');
  const markType = read(element, 'markType');
  const sceneKey = read(sceneData, 'key');
  const datumRead = read(sceneData, 'data');
  const datum = asRecord(datumRead.value);
  if (
    !viewKey.ok ||
    viewKey.value !== COMPARISON_VIEW_KEY ||
    !markType.ok ||
    markType.value !== 'interval' ||
    !sceneKey.ok ||
    typeof sceneKey.value !== 'string' ||
    !datumRead.ok ||
    datum === undefined
  ) {
    return { claimed: true };
  }

  const nodeIdRead = read(datum, 'nodeId');
  const seriesIdRead = read(datum, 'seriesId');
  const elementKeyRead = read(datum, 'elementKey');
  if (
    !nodeIdRead.ok ||
    typeof nodeIdRead.value !== 'string' ||
    nodeIdRead.value.length === 0 ||
    !seriesIdRead.ok ||
    typeof seriesIdRead.value !== 'string' ||
    seriesIdRead.value.length === 0 ||
    !elementKeyRead.ok ||
    typeof elementKeyRead.value !== 'string'
  ) {
    return { claimed: true };
  }
  const nodeId = nodeIdRead.value;
  const seriesId = seriesIdRead.value;
  const elementKey = elementKeyRead.value;
  if (
    !expectedPairs.has(pairKey(nodeId, seriesId)) ||
    elementKey !== expectedElementKey(nodeId, seriesId) ||
    sceneKey.value !== elementKey
  ) {
    return { claimed: true };
  }

  const bounds = call(element, 'getBounds', []);
  const receipt = sceneRectangle(bounds, nodeId, seriesId, elementKey);
  return receipt === undefined ? { claimed: true } : { claimed: true, receipt };
}

function unionRectangles(
  nodeId: ViewNodeId,
  rectangles: readonly ComparisonSceneElementReceipt[],
): ChartSceneRectangle | undefined {
  if (rectangles.length === 0) {
    return undefined;
  }
  return {
    nodeId,
    minX: Math.min(...rectangles.map(bounds => bounds.minX)),
    minY: Math.min(...rectangles.map(bounds => bounds.minY)),
    maxX: Math.max(...rectangles.map(bounds => bounds.maxX)),
    maxY: Math.max(...rectangles.map(bounds => bounds.maxY)),
  };
}

function toAxisBounds(
  nodeId: ViewNodeId,
  bounds: ChartSceneRectangle,
  axis: CategoryAxis,
): ChartCategoryBounds {
  const min = axis === 'x' ? bounds.minX : bounds.minY;
  const max = axis === 'x' ? bounds.maxX : bounds.maxY;
  return { nodeId, min, center: (min + max) / 2, max };
}

function arrayFromCollection(value: unknown): readonly unknown[] | undefined {
  const collection = asRecord(value);
  const length = finiteNumber(valueOf(collection, 'length'));
  if (
    collection === undefined ||
    length === undefined ||
    !Number.isSafeInteger(length) ||
    length < 0
  ) {
    return undefined;
  }
  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const item = read(collection, String(index));
    if (!item.ok || item.value === undefined) {
      return undefined;
    }
    result.push(item.value);
  }
  return result;
}

function finiteLayout(view: UnknownRecord): boolean {
  const layout = asRecord(valueOf(view, 'layout'));
  return [
    'x',
    'y',
    'width',
    'height',
    'innerWidth',
    'innerHeight',
    'marginLeft',
    'marginTop',
    'paddingLeft',
    'paddingTop',
  ].every(key => {
    const value = finiteNumber(valueOf(layout, key));
    return value !== undefined && (key === 'width' || key === 'height' ? value > 0 : true);
  });
}

function mapCoordinate(
  coordinate: UnknownRecord,
  point: readonly [number, number],
  offset: readonly [number, number],
): readonly [number, number] | undefined {
  const mapped = coordinatePair(call(coordinate, 'map', [point]));
  return mapped === undefined ? undefined : [mapped[0] + offset[0], mapped[1] + offset[1]];
}

function readNumericRange(scale: UnknownRecord): readonly [number, number] | undefined {
  const direct = call(scale, 'getRange', []);
  const options = asRecord(call(scale, 'getOptions', []));
  const range = arrayFromCollection(direct ?? valueOf(options, 'range'));
  if (range === undefined || range.length !== 2) {
    return undefined;
  }
  const first = finiteNumber(range[0]);
  const second = finiteNumber(range[1]);
  return first === undefined || second === undefined || first === second
    ? undefined
    : [first, second];
}

function exactAllZeroBounds(
  context: unknown,
  nodeId: ViewNodeId,
  projectionOrder: readonly ViewNodeId[],
  axis: CategoryAxis,
):
  | { readonly axisBounds: ChartCategoryBounds; readonly pointerBounds: ChartSceneRectangle }
  | undefined {
  const contextRecord = asRecord(context);
  const views = arrayFromCollection(valueOf(contextRecord, 'views'));
  if (views === undefined) {
    return undefined;
  }
  const candidates = views.filter(value => valueOf(asRecord(value), 'key') === COMPARISON_VIEW_KEY);
  if (candidates.length !== 1) {
    return undefined;
  }
  const view = asRecord(candidates[0]);
  if (view === undefined || !finiteLayout(view)) {
    return undefined;
  }
  const scale = asRecord(valueOf(view, 'scale'));
  const layout = asRecord(valueOf(view, 'layout'));
  const xScale = asRecord(valueOf(scale, 'x'));
  const yScale = asRecord(valueOf(scale, 'y'));
  const coordinate = asRecord(valueOf(view, 'coordinate'));
  const coordinateOptions = asRecord(call(coordinate, 'getOptions', []));
  const innerWidth = finiteNumber(valueOf(coordinateOptions, 'innerWidth'));
  const innerHeight = finiteNumber(valueOf(coordinateOptions, 'innerHeight'));
  if (
    layout === undefined ||
    xScale === undefined ||
    yScale === undefined ||
    coordinate === undefined ||
    innerWidth === undefined ||
    innerWidth <= 0 ||
    innerHeight === undefined ||
    innerHeight <= 0
  ) {
    return undefined;
  }
  const layoutX = finiteNumber(valueOf(layout, 'x'));
  const layoutY = finiteNumber(valueOf(layout, 'y'));
  const marginLeft = finiteNumber(valueOf(layout, 'marginLeft'));
  const marginTop = finiteNumber(valueOf(layout, 'marginTop'));
  const paddingLeft = finiteNumber(valueOf(layout, 'paddingLeft'));
  const paddingTop = finiteNumber(valueOf(layout, 'paddingTop'));
  if (
    layoutX === undefined ||
    layoutY === undefined ||
    marginLeft === undefined ||
    marginTop === undefined ||
    paddingLeft === undefined ||
    paddingTop === undefined
  ) {
    return undefined;
  }
  const offset = [layoutX + marginLeft + paddingLeft, layoutY + marginTop + paddingTop] as const;

  const domain = arrayFromCollection(call(xScale, 'getDomain', []));
  if (
    domain === undefined ||
    domain.length !== projectionOrder.length ||
    domain.some((value, index) => value !== projectionOrder[index])
  ) {
    return undefined;
  }
  const categoryStart = finiteNumber(call(xScale, 'map', [nodeId]));
  const categoryWidth = finiteNumber(call(xScale, 'getBandWidth', [nodeId]));
  const zero = finiteNumber(call(yScale, 'map', [0]));
  const valueRange = readNumericRange(yScale);
  if (
    categoryStart === undefined ||
    categoryWidth === undefined ||
    categoryWidth <= 0 ||
    zero === undefined ||
    valueRange === undefined
  ) {
    return undefined;
  }
  const categoryCenter = categoryStart + categoryWidth / 2;
  const bandStartPoint = mapCoordinate(coordinate, [categoryStart, zero], offset);
  const bandEndPoint = mapCoordinate(coordinate, [categoryStart + categoryWidth, zero], offset);
  const baselinePoint = mapCoordinate(coordinate, [categoryCenter, zero], offset);
  const negativePoint = mapCoordinate(
    coordinate,
    [categoryCenter, Math.min(...valueRange)],
    offset,
  );
  const positivePoint = mapCoordinate(
    coordinate,
    [categoryCenter, Math.max(...valueRange)],
    offset,
  );
  if (
    bandStartPoint === undefined ||
    bandEndPoint === undefined ||
    baselinePoint === undefined ||
    negativePoint === undefined ||
    positivePoint === undefined
  ) {
    return undefined;
  }

  const categoryStartPixel = axis === 'x' ? bandStartPoint[0] : bandStartPoint[1];
  const categoryEndPixel = axis === 'x' ? bandEndPoint[0] : bandEndPoint[1];
  const baseline = axis === 'x' ? baselinePoint[1] : baselinePoint[0];
  const negativeEnd = axis === 'x' ? negativePoint[1] : negativePoint[0];
  const positiveEnd = axis === 'x' ? positivePoint[1] : positivePoint[0];
  const categoryMin = Math.min(categoryStartPixel, categoryEndPixel);
  const categoryMax = Math.max(categoryStartPixel, categoryEndPixel);
  const plotMin = Math.min(negativeEnd, positiveEnd);
  const plotMax = Math.max(negativeEnd, positiveEnd);
  if (
    categoryMin === categoryMax ||
    plotMin === plotMax ||
    baseline < plotMin ||
    baseline > plotMax
  ) {
    return undefined;
  }

  const targetSize = Math.min(ALL_ZERO_TARGET_SIZE, plotMax - plotMin);
  const positiveCapacity = Math.abs(positiveEnd - baseline);
  const negativeCapacity = Math.abs(negativeEnd - baseline);
  const positiveSize = Math.min(targetSize, positiveCapacity);
  const negativeSize = targetSize - positiveSize;
  if (negativeSize > negativeCapacity) {
    return undefined;
  }
  const positiveEdge = baseline + Math.sign(positiveEnd - baseline) * positiveSize;
  const negativeEdge = baseline + Math.sign(negativeEnd - baseline) * negativeSize;
  const valueMin = Math.min(baseline, positiveEdge, negativeEdge);
  const valueMax = Math.max(baseline, positiveEdge, negativeEdge);
  const pointerBounds =
    axis === 'x'
      ? { nodeId, minX: categoryMin, minY: valueMin, maxX: categoryMax, maxY: valueMax }
      : { nodeId, minX: valueMin, minY: categoryMin, maxX: valueMax, maxY: categoryMax };
  return {
    axisBounds: {
      nodeId,
      min: categoryMin,
      center: (categoryMin + categoryMax) / 2,
      max: categoryMax,
    },
    pointerBounds,
  };
}

/** Builds an atomic current-render receipt from the locked G2 5.4.8 scene shape. */
export function createComparisonSceneReceipt(
  input: ComparisonSceneReceiptInput,
): ComparisonSceneReceipt | undefined {
  if (
    !validAxis(input.axis) ||
    input.renderSignature !== input.currentRenderSignature ||
    input.renderRevision !== input.currentRenderRevision ||
    input.generation !== input.currentGeneration ||
    !safeInteger(input.renderRevision) ||
    !safeInteger(input.generation)
  ) {
    return undefined;
  }

  const seriesIds = input.series.map(entry => entry.id);
  if (new Set(seriesIds).size !== seriesIds.length) {
    return undefined;
  }
  const expected: { readonly nodeId: ViewNodeId; readonly seriesId: SeriesId }[] = [];
  const expectedPairs = new Set<string>();
  for (const datum of input.projection) {
    if (
      datum.values.length !== seriesIds.length ||
      datum.values.some((value, index) => value.seriesId !== seriesIds[index])
    ) {
      return undefined;
    }
    for (const value of datum.values) {
      const key = pairKey(datum.nodeId, value.seriesId);
      if (expectedPairs.has(key)) {
        return undefined;
      }
      expectedPairs.add(key);
      expected.push({ nodeId: datum.nodeId, seriesId: value.seriesId });
    }
  }

  const sceneElements = readElements(input.context);
  if (sceneElements === undefined) {
    return undefined;
  }
  const byPair = new Map<string, ComparisonSceneElementReceipt>();
  for (const sceneElement of sceneElements) {
    const result = readMainElement(sceneElement, expectedPairs);
    if (!result.claimed) {
      continue;
    }
    if (result.receipt === undefined) {
      return undefined;
    }
    const key = pairKey(result.receipt.nodeId, result.receipt.seriesId);
    if (byPair.has(key)) {
      return undefined;
    }
    byPair.set(key, result.receipt);
  }
  if (byPair.size !== expected.length) {
    return undefined;
  }
  const elements = expected.map(value => byPair.get(pairKey(value.nodeId, value.seriesId)));
  if (elements.some(value => value === undefined)) {
    return undefined;
  }
  const orderedElements = elements.filter(
    (value): value is ComparisonSceneElementReceipt => value !== undefined,
  );
  const projectionOrder = input.projection.map(datum => datum.nodeId);
  const categories: ComparisonCategorySceneReceipt[] = [];
  for (const datum of input.projection) {
    const rectangles = orderedElements.filter(element => element.nodeId === datum.nodeId);
    const ghostBounds = unionRectangles(datum.nodeId, rectangles);
    if (ghostBounds === undefined) {
      return undefined;
    }
    const allZero = datum.values.every(value => value.amount === 0);
    const allZeroBounds = allZero
      ? exactAllZeroBounds(input.context, datum.nodeId, projectionOrder, input.axis)
      : undefined;
    if (allZero && allZeroBounds === undefined) {
      return undefined;
    }
    categories.push({
      nodeId: datum.nodeId,
      rectangles,
      axisBounds: allZeroBounds?.axisBounds ?? toAxisBounds(datum.nodeId, ghostBounds, input.axis),
      ghostBounds,
      pointerBounds: allZeroBounds?.pointerBounds,
      allZero,
    });
  }

  return {
    renderSignature: input.renderSignature,
    renderRevision: input.renderRevision,
    generation: input.generation,
    axis: input.axis,
    elements: orderedElements,
    categories,
  };
}

function contains(bounds: ChartSceneRectangle, point: ChartAxisPoint): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/** Exact hit uses actual rectangles except for the renderer-band all-zero target. */
export function hitComparisonSceneReceipt(
  receipt: ComparisonSceneReceipt,
  point: ChartAxisPoint,
): ComparisonCategorySceneReceipt | undefined {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return undefined;
  }
  for (const category of receipt.categories) {
    if (category.allZero) {
      if (category.pointerBounds !== undefined && contains(category.pointerBounds, point)) {
        return category;
      }
      continue;
    }
    if (category.rectangles.some(bounds => contains(bounds, point))) {
      return category;
    }
  }
  return undefined;
}

function intersects(a: ComparisonMarqueeRectangle, b: ChartSceneRectangle): boolean {
  return a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;
}

/** Marquee remains per-interval and returns node IDs in projection order. */
export function marqueeComparisonSceneReceipt(
  receipt: ComparisonSceneReceipt,
  rectangle: ComparisonMarqueeRectangle,
): readonly ViewNodeId[] {
  if (
    ![rectangle.minX, rectangle.minY, rectangle.maxX, rectangle.maxY].every(Number.isFinite) ||
    rectangle.minX > rectangle.maxX ||
    rectangle.minY > rectangle.maxY
  ) {
    return [];
  }
  return receipt.categories
    .filter(category => category.rectangles.some(bounds => intersects(rectangle, bounds)))
    .map(category => category.nodeId);
}
