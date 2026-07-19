import {
  createEditorSession,
  createInitialViewSpec,
  executeCommand,
  FinancialChartEditor,
  parseViewSpec,
  redoSession,
  serializeViewSpec,
  undoSession,
  type CommandResult,
  type EditorCommand,
  type EditorSession,
  type ExportOptions,
  type ExportResult,
  type FinancialChartEditorHandle,
  type FinancialChartEditorProps,
  type FinancialChartAppearance,
  type FinancialChartPalette,
  type SelectionState,
  type SessionActionMeta,
  validateSourceData,
  validateViewSpec,
  type SourceData,
  type ValidationResult,
  type ViewSpec,
} from '@tellplot/editor';

declare const source: SourceData;
declare const view: ViewSpec;
declare const session: EditorSession;
declare const command: EditorCommand;
declare const historyAction: SessionActionMeta;
declare const editorHandle: FinancialChartEditorHandle;

export const sourceValidation: ValidationResult<SourceData> = validateSourceData(source);
export const viewValidation: ValidationResult<ViewSpec> = validateViewSpec(view, source);
export const serializedView: string = serializeViewSpec(view);
export const parsedView: ValidationResult<ViewSpec> = parseViewSpec(serializedView, source);
export const pngOptions: ExportOptions = { format: 'png', pixelRatio: 2 };
export const exportedImage: Promise<ExportResult> = editorHandle.exportImage(pngOptions);
export const currentView: ViewSpec = editorHandle.getViewSpec();
export const focusEditor: () => void = editorHandle.focus.bind(editorHandle);
export const initialView: ValidationResult<ViewSpec> = createInitialViewSpec(source);
export const editorSession: ValidationResult<EditorSession> = createEditorSession(source, {
  viewSpec: view,
  historyLimit: 100,
});
export const commandResult: CommandResult = executeCommand(session, command);
export const undoResult: CommandResult = undoSession(session, historyAction);
export const redoResult: CommandResult = redoSession(session, historyAction);

export const editorComponent: typeof FinancialChartEditor = FinancialChartEditor;
export const editorSelection: SelectionState = {
  nodeId: 'selection-node',
  nodeIds: ['selection-node'],
  sourceIds: ['source'],
};
export const editorProps: FinancialChartEditorProps = {
  sourceData: source,
  viewSpec: view,
  locale: 'zh-CN',
  height: 680,
  chartAppearance: {
    title: 'Operating bridge',
    palette: { positive: '#00875A', negative: '#D14343' },
    axis: { x: true, y: false },
    valueLabels: 'auto',
    tooltip: false,
    animation: { enabled: true, duration: 160 },
    numberFormat: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      currencyDisplay: 'narrowSymbol',
    },
  },
  onSelectionChange(selection) {
    const selectedNode: string = selection.nodeId;
    void selectedNode;
  },
};

export const palette: FinancialChartPalette = {
  start: '#5F6B65',
  positive: '#168363',
  negative: '#D5524A',
  subtotal: '#315C8C',
  group: '#A46812',
  end: '#315C8C',
};
export const chartAppearance: FinancialChartAppearance = editorProps.chartAppearance ?? {};
