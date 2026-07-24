import {
  ChartEditor,
  createInitialViewSpec,
  parseViewSpec,
  serializeViewSpec,
  validateViewSpec,
  type ChartConfig,
  type ChartEditorHandle,
  type ChartEditorOptions,
  type ExportError,
  type SourceData,
  type ViewSpec,
} from '@tellplot/editor';
import { Code2, Download, FileDown, FileUp, Image, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { DEMO_CATEGORICAL_COLORS, DEMO_WATERFALL_COLORS } from './demoPresentation';
import { getPlaygroundChartType, getPlaygroundFixture } from './fixtures';
import { UsageGuide } from './UsageGuide';

const COMPACT_USAGE_QUERY = '(max-width: 1179px)';
const DEFAULT_EDITOR = {
  panels: { outline: true, inspector: true, toolbar: true },
  outline: { placement: 'right' },
  inspector: { mode: 'tabs' },
} as const satisfies ChartEditorOptions;

function initialConfig(sourceData: SourceData, requestedChartType: 'bar' | undefined): ChartConfig {
  if (sourceData.schemaVersion === '2.0.0' && sourceData.dataKind === 'categorical') {
    const type = requestedChartType ?? 'column';
    return {
      type,
      appearance: {
        title: type === 'bar' ? '分类条形图' : '分类柱状图',
        colors: DEMO_CATEGORICAL_COLORS,
        labels: {
          value: { display: 'auto', placement: 'outside', offset: 6 },
          group: { display: 'auto', placement: 'outside', offset: 4 },
        },
        tooltip: true,
      },
      data: sourceData,
      editor: DEFAULT_EDITOR,
      locale: 'zh-CN',
      height: '100%',
    };
  }
  return {
    type: 'waterfall',
    appearance: {
      title: '经营变动瀑布图',
      colors: DEMO_WATERFALL_COLORS,
      labels: {
        value: { display: 'auto', placement: 'outside', offset: 6 },
        group: { display: 'auto', placement: 'outside', offset: 4 },
      },
      tooltip: true,
    },
    data: sourceData,
    editor: DEFAULT_EDITOR,
    locale: 'zh-CN',
    height: '100%',
  };
}

function compactUsageViewport(): boolean {
  return window.matchMedia(COMPACT_USAGE_QUERY).matches;
}

function useCompactUsageLayout(): boolean {
  const [compact, setCompact] = useState(compactUsageViewport);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_USAGE_QUERY);
    const update = (): void => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return compact;
}

export function ExampleWorkbench(): React.JSX.Element {
  const fixtureSourceData = useMemo(() => getPlaygroundFixture(window.location.search), []);
  const initialChartType = useMemo(() => getPlaygroundChartType(window.location.search), []);
  const [config, setConfig] = useState<ChartConfig>(() =>
    initialConfig(fixtureSourceData, initialChartType),
  );
  const initialView = useMemo(
    () => createInitialViewSpec(config.data, { chartType: config.type }),
    [config.data, config.type],
  );
  const [viewSpec, setViewSpec] = useState<ViewSpec | undefined>(() =>
    initialView.ok ? initialView.value : undefined,
  );
  const compactUsage = useCompactUsageLayout();
  const [usageOpen, setUsageOpen] = useState(() => !compactUsageViewport());
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState<'svg' | 'png' | 'json' | 'import' | null>(null);
  const [fileStatus, setFileStatus] = useState({
    code: 'FILE_READY',
    message: '文件操作已就绪',
    tone: 'neutral' as 'neutral' | 'success' | 'error',
  });
  const editorRef = useRef<ChartEditorHandle>(null);
  const usageButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportControlRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const closeUsageGuide = (): void => {
    setUsageOpen(false);
    window.requestAnimationFrame(() => usageButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!exportOpen) {
      return undefined;
    }
    const closeWithKeyboard = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setExportOpen(false);
        exportButtonRef.current?.focus();
      }
    };
    const closeOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !exportControlRef.current?.contains(event.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('keydown', closeWithKeyboard);
    document.addEventListener('pointerdown', closeOutside);
    window.requestAnimationFrame(() => {
      exportMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    return () => {
      document.removeEventListener('keydown', closeWithKeyboard);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [exportOpen]);

  const navigateExportMenu = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const items = [
      ...(exportMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []),
    ];
    if (items.length === 0) {
      return;
    }
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let target: number;
    if (event.key === 'ArrowDown') {
      target = (current + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      target = (current - 1 + items.length) % items.length;
    } else if (event.key === 'Home') {
      target = 0;
    } else if (event.key === 'End') {
      target = items.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    items[target]?.focus();
  };

  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const exportFailure = (error: unknown): void => {
    const structured = error as Partial<ExportError>;
    setFileStatus({
      code: typeof structured.code === 'string' ? structured.code : 'EXPORT_FAILED',
      message: typeof structured.path === 'string' ? structured.path : '/export',
      tone: 'error',
    });
  };

  const exportImage = async (format: 'svg' | 'png'): Promise<void> => {
    setExportOpen(false);
    setBusy(format);
    setFileStatus({
      code: 'EXPORTING',
      message: `正在生成 ${format.toUpperCase()}`,
      tone: 'neutral',
    });
    try {
      const result = await editorRef.current?.exportImage({
        format,
        filename: config.data.datasetId,
        ...(format === 'png' ? { pixelRatio: 2 } : {}),
      });
      if (result === undefined) {
        throw new Error('EXPORT_UNAVAILABLE');
      }
      downloadBlob(result.blob, result.suggestedFilename);
      setFileStatus({
        code: `${format.toUpperCase()}_EXPORTED`,
        message: `${result.width} x ${result.height}`,
        tone: 'success',
      });
    } catch (error) {
      exportFailure(error);
    } finally {
      setBusy(null);
    }
  };

  const exportJson = (): void => {
    setExportOpen(false);
    if (viewSpec === undefined) {
      setFileStatus({ code: 'EXPORT_UNAVAILABLE', message: '/viewSpec', tone: 'error' });
      return;
    }
    setBusy('json');
    const blob = new Blob([serializeViewSpec(viewSpec)], { type: 'application/json' });
    downloadBlob(blob, `${config.data.datasetId}-view.json`);
    setFileStatus({
      code: 'JSON_EXPORTED',
      message: `revision ${viewSpec.revision}`,
      tone: 'success',
    });
    setBusy(null);
  };

  const importJson = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file === undefined) {
      return;
    }
    setBusy('import');
    setFileStatus({ code: 'IMPORTING', message: '正在校验 ViewSpec', tone: 'neutral' });
    try {
      const parsed = parseViewSpec(await file.text(), config.data);
      if (!parsed.ok) {
        const issue = parsed.errors[0];
        setFileStatus({
          code: issue?.code ?? 'INVALID_VIEW_SPEC',
          message: issue?.path ?? '/',
          tone: 'error',
        });
        return;
      }
      setViewSpec(parsed.value);
      setFileStatus({
        code: 'VIEW_IMPORTED',
        message: `revision ${parsed.value.revision}`,
        tone: 'success',
      });
    } catch {
      setFileStatus({ code: 'INVALID_VIEW_SPEC', message: '/', tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const applyChartConfig = (next: ChartConfig): void => {
    const retained =
      viewSpec !== undefined &&
      viewSpec.chartType === next.type &&
      validateViewSpec(viewSpec, next.data).ok
        ? viewSpec
        : createInitialViewSpec(next.data, { chartType: next.type });
    const nextView = 'ok' in retained ? (retained.ok ? retained.value : undefined) : retained;
    setConfig(next);
    setViewSpec(nextView);
    setFileStatus({
      code: 'CONFIG_APPLIED',
      message: next.type,
      tone: 'success',
    });
  };

  const applyView = (next: ViewSpec): void => {
    setViewSpec(next);
    setFileStatus({
      code: 'VIEW_APPLIED',
      message: `revision ${next.revision}`,
      tone: 'success',
    });
  };

  return (
    <main className="playground" aria-label="TellPlot 参考编辑器">
      <header className="playground-filebar" aria-label="使用、文件与导出">
        <div className="playground-filebar__actions">
          <button
            ref={usageButtonRef}
            className="playground-tool-button"
            type="button"
            aria-label={usageOpen ? '隐藏使用代码' : '显示使用代码'}
            aria-controls="playground-usage-guide"
            aria-expanded={usageOpen}
            title={usageOpen ? '隐藏使用代码' : '显示使用代码'}
            onClick={() => {
              setExportOpen(false);
              if (usageOpen) {
                closeUsageGuide();
              } else {
                setUsageOpen(true);
              }
            }}
          >
            <Code2 size={17} aria-hidden="true" />
            <span>使用</span>
          </button>
          <button
            className="playground-tool-button"
            type="button"
            aria-label="导入 ViewSpec"
            title="导入 ViewSpec"
            disabled={busy !== null}
            onClick={() => importInputRef.current?.click()}
          >
            <FileUp size={17} aria-hidden="true" />
            <span>导入</span>
          </button>
          <input
            ref={importInputRef}
            className="playground-visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-label="导入 ViewSpec 文件"
            onChange={event => void importJson(event)}
          />
          <div className="playground-export-control" ref={exportControlRef}>
            <button
              ref={exportButtonRef}
              className="playground-tool-button playground-tool-button--primary"
              type="button"
              aria-label="导出"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              disabled={busy !== null || viewSpec === undefined}
              onClick={() => setExportOpen(open => !open)}
            >
              {busy === null ? (
                <Download size={17} aria-hidden="true" />
              ) : (
                <LoaderCircle className="playground-spin" size={17} aria-hidden="true" />
              )}
              <span>导出</span>
            </button>
            {exportOpen ? (
              <div
                className="playground-export-menu"
                ref={exportMenuRef}
                role="menu"
                aria-label="导出格式"
                onKeyDown={navigateExportMenu}
              >
                <button type="button" role="menuitem" onClick={() => void exportImage('svg')}>
                  <Image size={16} aria-hidden="true" />
                  <span>SVG 图像</span>
                </button>
                <button type="button" role="menuitem" onClick={() => void exportImage('png')}>
                  <Image size={16} aria-hidden="true" />
                  <span>PNG 图像</span>
                </button>
                <button type="button" role="menuitem" onClick={exportJson}>
                  <FileDown size={16} aria-hidden="true" />
                  <span>ViewSpec JSON</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div
          className="playground-file-status"
          data-tone={fileStatus.tone}
          role="status"
          aria-label="文件状态"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>{fileStatus.code}</strong>
          <span>{fileStatus.message}</span>
        </div>
      </header>
      <div className="playground-workspace" data-usage-open={usageOpen && !compactUsage}>
        {usageOpen && !compactUsage ? (
          <UsageGuide
            id="playground-usage-guide"
            variant="panel"
            config={config}
            view={viewSpec ?? null}
            onApplyConfig={applyChartConfig}
            onApplyView={applyView}
            onClose={closeUsageGuide}
          />
        ) : null}
        <div className="playground-editor-surface">
          <ChartEditor
            ref={editorRef}
            config={config}
            {...(viewSpec === undefined ? {} : { view: viewSpec })}
            onViewChange={setViewSpec}
          />
        </div>
      </div>
      {usageOpen && compactUsage ? (
        <UsageGuide
          id="playground-usage-guide"
          variant="dialog"
          config={config}
          view={viewSpec ?? null}
          onApplyConfig={applyChartConfig}
          onApplyView={applyView}
          onClose={closeUsageGuide}
        />
      ) : null}
    </main>
  );
}
