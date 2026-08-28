import type { DatasetId, GroupId, SeriesId, SourceItemId, ViewNodeId } from './ids';

export type LegacySchemaVersion = '1.0.0';
export type CurrentSchemaVersion = '2.0.0';
export type ComparisonSchemaVersion = '3.0.0';
/** Supported persisted schema generations. */
export type SchemaVersion = LegacySchemaVersion | CurrentSchemaVersion | ComparisonSchemaVersion;
/** Chart layouts understood by the editor data contract. */
export type ChartType = 'waterfall' | 'bar' | 'column';
/** Source families with distinct validation and narrative policies. */
export type SourceDataKind = 'waterfall' | 'categorical';
export type WaterfallSourceItemKind = 'start' | 'contribution' | 'subtotal' | 'end';
export type SourceItemKind = WaterfallSourceItemKind;
export type MetadataValue = string | number | boolean | null;

interface SourceItemBase {
  readonly id: SourceItemId;
  readonly label: string;
  readonly amount: number;
  readonly sourceRef?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

/** A source item with explicit waterfall anchor or contribution semantics. */
export interface WaterfallSourceItem extends SourceItemBase {
  readonly kind: WaterfallSourceItemKind;
}

/** A plain categorical value with no per-item family discriminator. */
export type CategoricalSourceItem = SourceItemBase;

export interface CategoricalComparisonSeries {
  readonly id: SeriesId;
  readonly label: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

export interface CategoricalComparisonValue {
  readonly seriesId: SeriesId;
  readonly amount: number;
  readonly sourceRef?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

export interface CategoricalComparisonSourceItem {
  readonly id: SourceItemId;
  readonly label: string;
  readonly sourceRef?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
  readonly values: readonly CategoricalComparisonValue[];
}

/** Backward-compatible alias retaining the existing waterfall item contract. */
export type SourceItem = WaterfallSourceItem;
export type SourceDataItem =
  WaterfallSourceItem | CategoricalSourceItem | CategoricalComparisonSourceItem;

export interface LegacyWaterfallSourceData {
  readonly schemaVersion: LegacySchemaVersion;
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly items: readonly WaterfallSourceItem[];
}

/** Current-schema waterfall source data. */
export interface WaterfallSourceData {
  readonly schemaVersion: CurrentSchemaVersion;
  readonly dataKind: 'waterfall';
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly items: readonly WaterfallSourceItem[];
}

/** Current-schema categorical source data. */
export interface CategoricalSourceData {
  readonly schemaVersion: CurrentSchemaVersion;
  readonly dataKind: 'categorical';
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly items: readonly CategoricalSourceItem[];
}

/** Comparison-schema categorical source data with a dense series matrix. */
export interface CategoricalComparisonSourceData {
  readonly schemaVersion: ComparisonSchemaVersion;
  readonly dataKind: 'categorical';
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly series: readonly CategoricalComparisonSeries[];
  readonly items: readonly CategoricalComparisonSourceItem[];
}

/** Valid legacy and current source-data variants. */
export type SourceData =
  | LegacyWaterfallSourceData
  | WaterfallSourceData
  | CategoricalSourceData
  | CategoricalComparisonSourceData;

export type Annotation = string;
export type Emphasis = 'highlight' | 'muted';

export interface ViewGroup {
  readonly id: GroupId;
  readonly label: string;
  readonly childIds: readonly ViewNodeId[];
}

interface NarrativeViewFields {
  readonly datasetId: DatasetId;
  readonly revision: number;
  readonly rootOrder: readonly ViewNodeId[];
  readonly groups: Readonly<Record<GroupId, ViewGroup>>;
  readonly collapsedGroupIds: readonly GroupId[];
  readonly pinnedItemIds: readonly SourceItemId[];
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
}

export interface LegacyWaterfallViewSpec extends NarrativeViewFields {
  readonly schemaVersion: LegacySchemaVersion;
  readonly chartType: 'waterfall';
}

export interface CurrentViewSpec extends NarrativeViewFields {
  readonly schemaVersion: CurrentSchemaVersion;
  readonly chartType: ChartType;
}

export interface CategoricalComparisonViewSpec extends NarrativeViewFields {
  readonly schemaVersion: ComparisonSchemaVersion;
  readonly chartType: 'bar' | 'column';
}

/** Persisted narrative view state paired with a compatible source generation and family. */
export type ViewSpec = LegacyWaterfallViewSpec | CurrentViewSpec | CategoricalComparisonViewSpec;
