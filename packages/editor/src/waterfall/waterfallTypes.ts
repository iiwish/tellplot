import type { ValidationResult } from '../domain/errors';
import type { GroupId, SourceItemId, ViewNodeId } from '../domain/ids';

export type WaterfallDatumKind = 'start' | 'positive' | 'negative' | 'subtotal' | 'group' | 'end';

/** A deterministic, renderer-ready waterfall mark. */
export interface WaterfallDatum {
  readonly nodeId: ViewNodeId;
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly amount: number;
  readonly kind: WaterfallDatumKind;
  readonly sourceIds: readonly SourceItemId[];
  readonly locked: boolean;
  readonly order: number;
  readonly groupPath: readonly GroupId[];
  readonly depth: number;
}

export type WaterfallProjection = readonly WaterfallDatum[];
export type WaterfallProjectionResult = ValidationResult<WaterfallProjection>;
