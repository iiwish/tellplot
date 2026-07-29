import type { CommandError } from '../domain/errors';
import type { ValidationIssue } from '../domain/errors';
import type { ChartConfig } from '../config/chartConfig';
import type { FinancialChartAppearance } from '../config/chartAppearance';
import type { CommandEvent } from '../domain/executeCommand';
import type { SourceItemId, ViewNodeId } from '../domain/ids';
import type { SourceData, ViewSpec } from '../domain/model';
import type { ExportOptions, ExportResult } from '../export/exportTypes';

export interface SelectionState {
  readonly nodeId: ViewNodeId;
  readonly nodeIds: readonly ViewNodeId[];
  readonly sourceIds: readonly SourceItemId[];
}

export interface FinancialChartEditorPanels {
  readonly outline?: boolean;
  readonly inspector?: boolean;
  readonly toolbar?: boolean;
}

export interface FinancialChartEditorLayout {
  readonly outlinePlacement?: 'left' | 'right';
  readonly inspectorMode?: 'static' | 'tab';
}

export interface FinancialChartEditorHandle {
  focus(): void;
  exportImage(options: ExportOptions): Promise<ExportResult>;
  getViewSpec(): ViewSpec;
}

export interface FinancialChartEditorProps {
  readonly sourceData: SourceData;
  readonly viewSpec?: ViewSpec;
  readonly defaultViewSpec?: ViewSpec;
  readonly historyLimit?: number;
  readonly locale?: 'zh-CN' | 'en-US';
  readonly readOnly?: boolean;
  readonly height?: number | string;
  readonly panels?: FinancialChartEditorPanels;
  readonly layout?: FinancialChartEditorLayout;
  readonly chartAppearance?: FinancialChartAppearance;
  readonly onViewSpecChange?: (next: ViewSpec, event: CommandEvent) => void;
  readonly onCommand?: (event: CommandEvent) => void;
  readonly onCommandRejected?: (error: CommandError) => void;
  readonly onSelectionChange?: (selection: SelectionState) => void;
}

export interface ChartEditorHandle {
  focus(): void;
  exportImage(options: ExportOptions): Promise<ExportResult>;
  getView(): ViewSpec;
}

export interface ChartEditorProps {
  readonly config: ChartConfig;
  readonly view?: ViewSpec;
  readonly defaultView?: ViewSpec;
  readonly onViewChange?: (next: ViewSpec, event: CommandEvent) => void;
  readonly onCommand?: (event: CommandEvent) => void;
  readonly onCommandRejected?: (error: CommandError) => void;
  readonly onConfigRejected?: (issues: readonly ValidationIssue[]) => void;
  readonly onSelectionChange?: (selection: SelectionState) => void;
}
