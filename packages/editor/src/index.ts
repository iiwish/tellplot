export { ChartEditor } from './components/ChartEditor';
export { validateChartConfig } from './config/chartConfig';
export { createEditorSession } from './domain/session';
export { createInitialViewSpec } from './domain/createInitialViewSpec';
export { executeCommand } from './domain/executeCommand';
export { redoSession, undoSession } from './domain/history';
export { parseViewSpec, serializeViewSpec } from './domain/persistence';
export { validateSourceData, validateViewSpec } from './domain/validation';

export type {
  ChartCurrencyDisplay,
  ChartGroupRegionLabelMode,
  ChartLabelPlacement,
  ChartValueLabelMode,
} from './config/chartAppearance';
export type {
  CategoricalChartAppearance,
  CategoricalChartConfig,
  ChartAnimation,
  ChartAppearance,
  ChartAxes,
  ChartColors,
  ChartConfig,
  ChartEditorOptions,
  ChartEditorPanels,
  ChartGroupRegion,
  ChartGroupLabelOptions,
  ChartLabelStyle,
  ChartLabels,
  ChartLocale,
  ChartNumberFormat,
  ChartValueLabelOptions,
  WaterfallChartAppearance,
  WaterfallChartColors,
  WaterfallChartConfig,
  WaterfallChartData,
} from './config/chartConfig';
export type {
  CollapseGroupCommand,
  CommandEnvelope,
  CommandSource,
  CreateGroupCommand,
  EditorCommand,
  EditorCommandType,
  ExpandGroupCommand,
  MoveGroupCommand,
  MoveItemCommand,
  PinItemCommand,
  SessionActionMeta,
  SetAnnotationCommand,
  UngroupCommand,
  UnpinItemCommand,
} from './domain/commands';
export type { DatasetId, GroupId, SourceItemId, ViewNodeId } from './domain/ids';
export type {
  CommandError,
  CommandErrorCode,
  CommandErrorReason,
  ValidationErrorCode,
  ValidationIssue,
  ValidationIssueReason,
  ValidationResult,
} from './domain/errors';
export type { CommandEvent, CommandResult } from './domain/executeCommand';
export type { HistoryAction, HistoryEntry } from './domain/history';
export type {
  Annotation,
  CategoricalSourceData,
  CategoricalSourceItem,
  ChartType,
  Emphasis,
  LegacyWaterfallSourceData,
  MetadataValue,
  SchemaVersion,
  SourceData,
  SourceDataKind,
  SourceItem,
  SourceItemKind,
  ViewGroup,
  ViewSpec,
  WaterfallSourceData,
  WaterfallSourceItem,
} from './domain/model';
export type { InitialViewSpecOptions } from './domain/createInitialViewSpec';
export type { EditorSession, EditorSessionOptions } from './domain/session';
export type {
  ExportError,
  ExportErrorCode,
  ExportOptions,
  ExportResult,
} from './export/exportTypes';
export type { ChartEditorHandle, ChartEditorProps, SelectionState } from './react/editorTypes';
