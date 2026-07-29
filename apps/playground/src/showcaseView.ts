import {
  createInitialViewSpec,
  type ChartType,
  type SourceData,
  type ViewSpec,
} from '@tellplot/editor';

const GROWTH_GROUP_ID = 'showcase-growth-drivers';
const GROWTH_ITEM_IDS = ['sales-volume', 'price-impact', 'product-mix'] as const;

/** Adds a deterministic expanded group only to the interactive homepage waterfall. */
export function createShowcaseDefaultView(
  sourceData: SourceData,
  chartType: ChartType,
  interactive: boolean,
): ViewSpec | undefined {
  if (!interactive || chartType !== 'waterfall') {
    return undefined;
  }
  const result = createInitialViewSpec(sourceData, { chartType });
  if (!result.ok) {
    return undefined;
  }
  const childIds = GROWTH_ITEM_IDS.filter(nodeId => result.value.rootOrder.includes(nodeId));
  if (childIds.length !== GROWTH_ITEM_IDS.length) {
    return undefined;
  }
  const childIdSet = new Set<string>(childIds);
  const rootOrder = result.value.rootOrder.flatMap(nodeId =>
    nodeId === childIds[0] ? [GROWTH_GROUP_ID] : childIdSet.has(nodeId) ? [] : [nodeId],
  );
  return {
    ...result.value,
    rootOrder,
    groups: {
      [GROWTH_GROUP_ID]: {
        id: GROWTH_GROUP_ID,
        label: '增长驱动',
        childIds,
      },
    },
    collapsedGroupIds: [],
  };
}
