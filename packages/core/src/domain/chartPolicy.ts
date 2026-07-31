import type { SourceItemId } from './ids';
import type { SourceData, SourceDataKind } from './model';

export interface NarrativeChartPolicy {
  readonly sourceKind: SourceDataKind;
  isMovableItem(sourceData: SourceData, itemId: SourceItemId): boolean;
  canShareContainer(sourceData: SourceData, itemIds: readonly SourceItemId[]): boolean;
}

export function sourceDataKind(sourceData: SourceData): SourceDataKind {
  return sourceData.schemaVersion === '1.0.0' ? 'waterfall' : sourceData.dataKind;
}

interface PolicySourceIndex {
  readonly sourceKind: SourceDataKind;
  readonly movableItemIds: ReadonlySet<string>;
  readonly segmentByItemId: ReadonlyMap<string, number>;
}

function waterfallSegmentByItemId(sourceData: SourceData): ReadonlyMap<string, number> {
  const segments = new Map<string, number>();
  let segment = 0;
  for (const item of sourceData.items) {
    if ('kind' in item && item.kind === 'contribution') {
      segments.set(item.id, segment);
    } else if ('kind' in item && item.kind === 'subtotal') {
      segment += 1;
    }
  }
  return segments;
}

function indexPolicySource(sourceData: SourceData): PolicySourceIndex {
  const sourceKind = sourceDataKind(sourceData);
  const movableItemIds = new Set(
    sourceData.items
      .filter(
        item => sourceKind === 'categorical' || ('kind' in item && item.kind === 'contribution'),
      )
      .map(item => item.id),
  );
  const segmentByItemId =
    sourceKind === 'categorical'
      ? new Map(sourceData.items.map(item => [item.id, 0] as const))
      : waterfallSegmentByItemId(sourceData);
  return { sourceKind, movableItemIds, segmentByItemId };
}

/** Selects the internal narrative rules for an already validated source variant. */
export function createNarrativeChartPolicy(sourceData: SourceData): NarrativeChartPolicy {
  const boundIndex = indexPolicySource(sourceData);
  const indexFor = (candidateSource: SourceData): PolicySourceIndex =>
    candidateSource === sourceData ? boundIndex : indexPolicySource(candidateSource);

  return {
    sourceKind: boundIndex.sourceKind,
    isMovableItem(candidateSource, itemId) {
      return indexFor(candidateSource).movableItemIds.has(itemId);
    },
    canShareContainer(candidateSource, itemIds) {
      if (itemIds.length === 0) {
        return false;
      }
      const index = indexFor(candidateSource);
      if (itemIds.some(itemId => !index.movableItemIds.has(itemId))) {
        return false;
      }
      if (index.sourceKind === 'categorical') {
        return true;
      }
      const firstSegment = index.segmentByItemId.get(itemIds[0] as SourceItemId);
      return (
        firstSegment !== undefined &&
        itemIds.every(itemId => index.segmentByItemId.get(itemId) === firstSegment)
      );
    },
  };
}
