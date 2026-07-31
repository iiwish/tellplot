import type { ValidationResult } from '../../domain/errors';
import type { SourceItemId, ViewNodeId } from '../../domain/ids';

export type CategoricalDatumKind = 'positive' | 'negative' | 'group';

/** One deterministic, renderer-ready categorical node. */
export interface CategoricalDatum {
  readonly nodeId: ViewNodeId;
  readonly label: string;
  readonly amount: number;
  readonly kind: CategoricalDatumKind;
  readonly sourceIds: readonly SourceItemId[];
  readonly locked: boolean;
  readonly order: number;
}

export type CategoricalProjection = readonly CategoricalDatum[];
export type CategoricalProjectionResult = ValidationResult<CategoricalProjection>;
