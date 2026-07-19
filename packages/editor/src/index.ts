export { FinancialChartEditor } from './components/FinancialChartEditor';
export { createEditorSession } from './domain/session';
export { createInitialViewSpec } from './domain/createInitialViewSpec';
export { executeCommand } from './domain/executeCommand';
export { redoSession, undoSession } from './domain/history';
export { parseViewSpec, serializeViewSpec } from './domain/persistence';
export { validateSourceData, validateViewSpec } from './domain/validation';

export type {
  ChartCurrencyDisplay,
  ChartValueLabelMode,
  FinancialChartAnimationAppearance,
  FinancialChartAppearance,
  FinancialChartAxisAppearance,
  FinancialChartNumberFormat,
  FinancialChartPalette,
} from './config/chartAppearance';
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
  Emphasis,
  MetadataValue,
  SchemaVersion,
  SourceData,
  SourceItem,
  SourceItemKind,
  ViewGroup,
  ViewSpec,
} from './domain/model';
export type { EditorSession, EditorSessionOptions } from './domain/session';
export type {
  ExportError,
  ExportErrorCode,
  ExportOptions,
  ExportResult,
} from './export/exportTypes';
export type {
  FinancialChartEditorHandle,
  FinancialChartEditorPanels,
  FinancialChartEditorProps,
  SelectionState,
} from './react/editorTypes';
