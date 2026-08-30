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
  type CategoricalComparisonChartAppearance,
  type CategoricalComparisonChartColors,
  type CategoricalComparisonChartConfig,
  type CategoricalComparisonDatum,
  type CategoricalComparisonDatumKind,
  type CategoricalComparisonProjection,
  type CategoricalComparisonProjectionResult,
  type CategoricalComparisonSeries,
  type CategoricalComparisonSeriesColor,
  type CategoricalComparisonSeriesValue,
  type CategoricalComparisonSourceData,
  type CategoricalComparisonSourceItem,
  type CategoricalComparisonValue,
  type CategoricalComparisonViewSpec,
  type CategoricalSourceData,
  type CommandResult,
  type ComparisonSchemaVersion,
  type EditorCommand,
  type EditorSession,
  type SessionActionMeta,
  type SeriesId,
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

export const comparisonSchema: ComparisonSchemaVersion = '3.0.0';
export const comparisonSeriesId: SeriesId = 'actual';
export const comparisonSeries: CategoricalComparisonSeries = {
  id: comparisonSeriesId,
  label: 'Actual',
};
export const comparisonValue: CategoricalComparisonValue = {
  seriesId: comparisonSeriesId,
  amount: 1,
};
export const comparisonItem: CategoricalComparisonSourceItem = {
  id: 'revenue',
  label: 'Revenue',
  values: [comparisonValue, { seriesId: 'budget', amount: 2 }],
};
export const comparisonSource: CategoricalComparisonSourceData = {
  schemaVersion: comparisonSchema,
  dataKind: 'categorical',
  datasetId: 'comparison-package-consumer',
  series: [comparisonSeries, { id: 'budget', label: 'Budget' }],
  items: [comparisonItem],
};
export const comparisonView: CategoricalComparisonViewSpec = {
  schemaVersion: comparisonSchema,
  datasetId: comparisonSource.datasetId,
  chartType: 'column',
  revision: 0,
  rootOrder: ['revenue'],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
};
export const comparisonColor: CategoricalComparisonSeriesColor = {
  seriesId: comparisonSeriesId,
  color: '#0072B2',
};
export const comparisonColors: CategoricalComparisonChartColors = {
  series: [comparisonColor],
  group: '#A46812',
};
export const comparisonAppearance: CategoricalComparisonChartAppearance = {
  colors: comparisonColors,
  legend: true,
};
export const comparisonConfig: CategoricalComparisonChartConfig = {
  type: 'column',
  data: comparisonSource,
  appearance: comparisonAppearance,
};
export const comparisonDatumKind: CategoricalComparisonDatumKind = 'category';
export const comparisonSeriesValue: CategoricalComparisonSeriesValue = {
  seriesId: comparisonSeriesId,
  label: 'Actual',
  amount: 1,
};
export const comparisonDatum: CategoricalComparisonDatum = {
  nodeId: 'revenue',
  label: 'Revenue',
  values: [comparisonSeriesValue],
  kind: comparisonDatumKind,
  sourceIds: ['revenue'],
  locked: false,
  order: 0,
};
export const comparisonProjection: CategoricalComparisonProjection = [comparisonDatum];
export const comparisonProjectionResult: CategoricalComparisonProjectionResult = {
  ok: true,
  value: comparisonProjection,
  errors: [],
};

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
