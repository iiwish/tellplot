import {
  ChartEditor,
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
  type CategoricalSourceData,
  type ChartAppearance,
  type ChartConfig,
  type ChartEditorHandle,
  type ChartEditorProps,
  type ChartType,
  type CommandResult,
  type CommandSource,
  type EditorCommand,
  type EditorSession,
  type ExportOptions,
  type ExportResult,
  type InitialViewSpecOptions,
  type SelectionState,
  type SessionActionMeta,
  type SourceData,
  type SourceDataKind,
  type ValidationResult,
  type ViewSpec,
  type WaterfallSourceData,
} from '@tellplot/editor';

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type Assert<TValue extends true> = TValue;

type CategoricalConfig = Extract<ChartConfig, { readonly type: 'bar' | 'column' }>;
type WaterfallConfig = Extract<ChartConfig, { readonly type: 'waterfall' }>;
type CategoricalColors = NonNullable<NonNullable<CategoricalConfig['appearance']>['colors']>;
type WaterfallColors = NonNullable<NonNullable<WaterfallConfig['appearance']>['colors']>;

export type StableCommandSources = Assert<
  Equal<CommandSource, 'direct' | 'outline' | 'keyboard' | 'host'>
>;
export type CategoricalColorBoundary = Assert<
  Equal<Extract<keyof CategoricalColors, 'start' | 'subtotal' | 'end'>, never>
>;
export type WaterfallColorBoundary = Assert<
  Equal<Extract<keyof WaterfallColors, 'start' | 'subtotal' | 'end'>, 'start' | 'subtotal' | 'end'>
>;
export type BarDataBoundary = Assert<
  Equal<Extract<CategoricalConfig['data'], WaterfallSourceData>, never>
>;
export type WaterfallDataBoundary = Assert<
  Equal<Extract<WaterfallConfig['data'], CategoricalSourceData>, never>
>;

declare const source: SourceData;
declare const view: ViewSpec;
declare const session: EditorSession;
declare const command: EditorCommand;
declare const historyAction: SessionActionMeta;
declare const editorHandle: ChartEditorHandle;
declare const categoricalSource: CategoricalSourceData;
declare const waterfallSource: WaterfallSourceData;

export const sourceValidation: ValidationResult<SourceData> = validateSourceData(source);
export const viewValidation: ValidationResult<ViewSpec> = validateViewSpec(view, source);
export const serializedView: string = serializeViewSpec(view);
export const parsedView: ValidationResult<ViewSpec> = parseViewSpec(serializedView, source);
export const pngOptions: ExportOptions = { format: 'png', pixelRatio: 2 };
export const exportedImage: Promise<ExportResult> = editorHandle.exportImage(pngOptions);
export const currentView: ViewSpec = editorHandle.getView();
export const focusEditor: () => void = editorHandle.focus.bind(editorHandle);
export const initialView: ValidationResult<ViewSpec> = createInitialViewSpec(source);
export const initialBar: ValidationResult<ViewSpec> = createInitialViewSpec(categoricalSource, {
  chartType: 'bar',
} satisfies InitialViewSpecOptions);
export const chartType: ChartType = 'column';
export const sourceKind: SourceDataKind = categoricalSource.dataKind;
export const editorSession: ValidationResult<EditorSession> = createEditorSession(source, {
  viewSpec: view,
  historyLimit: 100,
});
export const commandResult: CommandResult = executeCommand(session, command);
export const undoResult: CommandResult = undoSession(session, historyAction);
export const redoResult: CommandResult = redoSession(session, historyAction);

export const editorComponent: typeof ChartEditor = ChartEditor;
export const editorSelection: SelectionState = {
  nodeId: 'selection-node',
  nodeIds: ['selection-node'],
  sourceIds: ['source'],
};
export const waterfallConfig = {
  type: 'waterfall',
  data: waterfallSource,
  locale: 'zh-CN',
  height: 680,
  appearance: {
    title: 'Operating bridge',
    colors: {
      start: '#5F6B65',
      positive: '#00875A',
      negative: '#D14343',
      subtotal: '#315C8C',
      group: '#A46812',
      end: '#315C8C',
    },
    axes: { category: true, value: false },
    labels: {
      value: {
        display: 'auto',
        placement: 'outside',
        offset: 6,
        color: '#102A43',
        fontSize: 12,
        fontWeight: 600,
        background: false,
      },
      group: {
        display: 'auto',
        placement: 'outside',
        offset: 4,
      },
    },
    tooltip: false,
    animation: { enabled: true, duration: 160 },
    groupRegion: { enabled: true, opacity: 0.06 },
    numberFormat: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      currencyDisplay: 'narrowSymbol',
    },
  },
  editor: {
    panels: { outline: false, inspector: false, toolbar: true },
    outline: { placement: 'right' },
    inspector: { mode: 'tabs' },
  },
} as const satisfies ChartConfig;
export const categoricalConfig = {
  type: 'bar',
  data: categoricalSource,
  appearance: {
    colors: { positive: '#168363', negative: '#D5524A', group: '#A46812' },
  },
} as const satisfies ChartConfig;
export const chartConfigValidation: ValidationResult<ChartConfig> =
  validateChartConfig(waterfallConfig);
export const editorProps: ChartEditorProps = {
  config: waterfallConfig,
  view,
  onViewChange(next, event) {
    const revision: number = next.revision;
    const commandType: string = event.type;
    void revision;
    void commandType;
  },
  onSelectionChange(selection) {
    const selectedNode: string = selection.nodeId;
    void selectedNode;
  },
};
export const chartAppearance: ChartAppearance = waterfallConfig.appearance ?? {};
