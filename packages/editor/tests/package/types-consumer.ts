import {
  createEditorSession,
  createInitialViewSpec,
  executeCommand,
  parseViewSpec,
  redoSession,
  serializeViewSpec,
  undoSession,
  validateChartConfig,
  validateSourceData,
  validateViewSpec,
  viewSpecsEqual,
  type ChartConfig,
  type CategoricalSourceData,
  type CommandResult,
  type EditorCommand,
  type EditorSession,
  type SessionActionMeta,
  type SourceData,
  type ValidationResult,
  type ViewSpec,
} from '@tellplot/core';
import {
  createEditor,
  type ChartRenderIssue,
  type EditorInstance,
  type EditorOptions,
  type ExportOptions,
  type ExportResult,
} from '@tellplot/editor';

declare const container: HTMLElement;
declare const source: SourceData;
declare const categoricalSource: CategoricalSourceData;
declare const view: ViewSpec;
declare const session: EditorSession;
declare const command: EditorCommand;
declare const historyAction: SessionActionMeta;

export const sourceValidation: ValidationResult<SourceData> = validateSourceData(source);
export const viewValidation: ValidationResult<ViewSpec> = validateViewSpec(view, source);
export const serializedView: string = serializeViewSpec(view);
export const parsedView: ValidationResult<ViewSpec> = parseViewSpec(serializedView, source);
export const sameView: boolean = viewSpecsEqual(view, view);
export const initialView: ValidationResult<ViewSpec> = createInitialViewSpec(source);
export const editorSession: ValidationResult<EditorSession> = createEditorSession(source, {
  viewSpec: view,
});
export const commandResult: CommandResult = executeCommand(session, command);
export const undoResult: CommandResult = undoSession(session, historyAction);
export const redoResult: CommandResult = redoSession(session, historyAction);

export const config = {
  type: 'column',
  data: categoricalSource,
  locale: 'zh-CN',
  editor: { inspector: { mode: 'tabs' } },
} as const satisfies ChartConfig;
export const configValidation: ValidationResult<ChartConfig> = validateChartConfig(config);
export const renderIssue: ChartRenderIssue = { code: 'CHART_RENDER_ERROR', path: '/chart' };
export const options: EditorOptions = { config, view, onRenderError: issue => void issue };
export const editor: EditorInstance = createEditor(container, options);
export const exportOptions: ExportOptions = { format: 'png', pixelRatio: 2 };
export const exported: Promise<ExportResult> = editor.exportImage(exportOptions);
