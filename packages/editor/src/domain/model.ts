import type { DatasetId, GroupId, SourceItemId, ViewNodeId } from './ids';

export type SchemaVersion = '1.0.0';
export type SourceItemKind = 'start' | 'contribution' | 'subtotal' | 'end';
export type MetadataValue = string | number | boolean | null;

export interface SourceItem {
  readonly id: SourceItemId;
  readonly label: string;
  readonly amount: number;
  readonly kind: SourceItemKind;
  readonly sourceRef?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

export interface SourceData {
  readonly schemaVersion: SchemaVersion;
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly items: readonly SourceItem[];
}

export type Annotation = string;
export type Emphasis = 'highlight' | 'muted';

export interface ViewGroup {
  readonly id: GroupId;
  readonly label: string;
  readonly childIds: readonly ViewNodeId[];
}

export interface ViewSpec {
  readonly schemaVersion: SchemaVersion;
  readonly datasetId: DatasetId;
  readonly chartType: 'waterfall';
  readonly revision: number;
  readonly rootOrder: readonly ViewNodeId[];
  readonly groups: Readonly<Record<GroupId, ViewGroup>>;
  readonly collapsedGroupIds: readonly GroupId[];
  readonly pinnedItemIds: readonly SourceItemId[];
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
}
