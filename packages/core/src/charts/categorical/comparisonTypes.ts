import type { ValidationResult } from '../../domain/errors';
import type { SeriesId, SourceItemId, ViewNodeId } from '../../domain/ids';

export type CategoricalComparisonDatumKind = 'category' | 'group';

export interface CategoricalComparisonSeriesValue {
  readonly seriesId: SeriesId;
  readonly label: string;
  readonly amount: number;
}

export interface CategoricalComparisonDatum {
  readonly nodeId: ViewNodeId;
  readonly label: string;
  readonly values: readonly CategoricalComparisonSeriesValue[];
  readonly kind: CategoricalComparisonDatumKind;
  readonly sourceIds: readonly SourceItemId[];
  readonly locked: boolean;
  readonly order: number;
}

export type CategoricalComparisonProjection = readonly CategoricalComparisonDatum[];

export type CategoricalComparisonProjectionResult =
  ValidationResult<CategoricalComparisonProjection>;
