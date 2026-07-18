import { validationSuccess, type ValidationResult } from './errors';
import type { SourceData, ViewSpec } from './model';
import { validateSourceData } from './validation';

/** Creates a deterministic initial view after validating the supplied source data. */
export function createInitialViewSpec(sourceData: SourceData): ValidationResult<ViewSpec> {
  const sourceResult = validateSourceData(sourceData);
  if (!sourceResult.ok) {
    return sourceResult;
  }

  return validationSuccess({
    schemaVersion: '1.0.0',
    datasetId: sourceResult.value.datasetId,
    chartType: 'waterfall',
    revision: 0,
    rootOrder: sourceResult.value.items
      .filter(item => item.kind === 'contribution')
      .map(item => item.id),
    groups: {},
    collapsedGroupIds: [],
    pinnedItemIds: [],
    annotations: {},
    emphasis: {},
  });
}
