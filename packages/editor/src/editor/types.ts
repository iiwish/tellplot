import type {
  ChartConfig,
  CommandError,
  CommandEvent,
  CommandResult,
  EditorCommand,
  SelectionState,
  SessionActionMeta,
  ValidationIssue,
  ViewSpec,
} from '@tellplot/core';
import type { ExportOptions, ExportResult } from '../export/exportTypes';

export interface ChartRenderIssue {
  readonly code: 'CHART_RENDER_ERROR';
  readonly path: '/chart';
}

export interface EditorOptions {
  readonly config: ChartConfig;
  readonly view?: ViewSpec;
  readonly defaultView?: ViewSpec;
  readonly onViewChange?: (view: ViewSpec, event: CommandEvent) => void;
  readonly onCommand?: (event: CommandEvent) => void;
  readonly onCommandRejected?: (error: CommandError) => void;
  readonly onConfigRejected?: (issues: readonly ValidationIssue[]) => void;
  readonly onSelectionChange?: (selection: SelectionState | null) => void;
  readonly onRenderError?: (issue: ChartRenderIssue | null) => void;
}

export type EditorUpdate = EditorOptions;

export interface EditorInstance {
  update(update: EditorUpdate): void;
  dispatch(command: EditorCommand): CommandResult | null;
  undo(action?: SessionActionMeta): CommandResult | null;
  redo(action?: SessionActionMeta): CommandResult | null;
  focus(): void;
  getView(): ViewSpec;
  exportImage(options: ExportOptions): Promise<ExportResult>;
  destroy(): void;
}

export type TellPlotEditorErrorCode =
  | 'CONTAINER_UNAVAILABLE'
  | 'CONTAINER_OWNED'
  | 'EDITOR_INITIALIZATION_FAILED'
  | 'EDITOR_RENDER_FAILED'
  | 'EDITOR_DESTROYED'
  | 'VIEW_UNAVAILABLE';

export interface TellPlotEditorError extends Error {
  readonly name: 'TellPlotEditorError';
  readonly code: TellPlotEditorErrorCode;
}

export function editorError(code: TellPlotEditorErrorCode, message: string): TellPlotEditorError {
  return Object.assign(new Error(message), {
    name: 'TellPlotEditorError' as const,
    code,
  });
}
