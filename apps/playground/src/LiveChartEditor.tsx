import { Check, Copy, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { ChartConfig, ViewSpec } from '@tellplot/core';

import {
  parsePlaygroundChartConfig,
  parsePlaygroundView,
  serializePlaygroundChartConfig,
  serializePlaygroundView,
  type PlaygroundPublicFileError,
} from './chartDocument';
import { writeClipboard } from './clipboard';

const APPLY_DELAY_MS = 320;

type EditorStatus =
  | { readonly tone: 'success'; readonly code: 'LIVE_SYNCED'; readonly path: '已同步' }
  | { readonly tone: 'neutral'; readonly code: 'VALIDATING'; readonly path: '正在校验' }
  | {
      readonly tone: 'error';
      readonly code: PlaygroundPublicFileError['code'];
      readonly path: string;
    };

interface LiveChartEditorProps {
  readonly id: string;
  readonly config: ChartConfig | null;
  readonly view: ViewSpec | null;
  readonly labelledBy: string;
  readonly onApplyConfig: (config: ChartConfig) => void;
  readonly onApplyView: (view: ViewSpec) => void;
}

interface LiveEditorState {
  readonly draft: string;
  readonly upstream: string;
  readonly status: EditorStatus;
}

interface LiveFileEditorBaseProps {
  readonly id: string;
  readonly labelledBy: string;
  readonly hidden: boolean;
}

type LiveFileEditorProps =
  | (LiveFileEditorBaseProps & {
      readonly kind: 'config';
      readonly config: ChartConfig | null;
      readonly onApply: (config: ChartConfig) => void;
    })
  | (LiveFileEditorBaseProps & {
      readonly kind: 'view';
      readonly config: ChartConfig | null;
      readonly view: ViewSpec | null;
      readonly onApply: (view: ViewSpec) => void;
    });

function initialStatus(enabled: boolean): EditorStatus {
  return enabled
    ? { tone: 'success', code: 'LIVE_SYNCED', path: '已同步' }
    : { tone: 'error', code: 'INVALID_CHART_CONFIG', path: '/' };
}

function fileContent(props: LiveFileEditorProps): string {
  if (props.kind === 'config') {
    return props.config === null ? '' : serializePlaygroundChartConfig(props.config);
  }
  return props.view === null ? '' : serializePlaygroundView(props.view);
}

function LiveFileEditor(props: LiveFileEditorProps): React.JSX.Element {
  const serialized = fileContent(props);
  const enabled =
    props.kind === 'config' ? props.config !== null : props.config !== null && props.view !== null;
  const [editorState, setEditorState] = useState<LiveEditorState>(() => ({
    draft: serialized,
    upstream: serialized,
    status: initialStatus(enabled),
  }));
  if (serialized !== editorState.upstream) {
    setEditorState({
      draft: serialized,
      upstream: serialized,
      status: initialStatus(enabled),
    });
  }
  const { draft, status } = editorState;
  const [copied, setCopied] = useState(false);
  const applyTimerRef = useRef<number | undefined>(undefined);
  const copyTimerRef = useRef<number | undefined>(undefined);
  const gutterRef = useRef<HTMLPreElement>(null);
  const fileName = props.kind === 'config' ? 'tellplot.config.json' : 'tellplot.view.json';
  const fileLabel = props.kind === 'config' ? '图表配置' : '视图状态';

  useEffect(
    () => () => {
      if (applyTimerRef.current !== undefined) {
        window.clearTimeout(applyTimerRef.current);
      }
      if (copyTimerRef.current !== undefined) {
        window.clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  const applyDraft = (nextDraft: string): void => {
    if (applyTimerRef.current !== undefined) {
      window.clearTimeout(applyTimerRef.current);
    }
    const result =
      props.kind === 'config'
        ? parsePlaygroundChartConfig(nextDraft)
        : props.config === null
          ? {
              ok: false as const,
              error: { code: 'INVALID_CHART_CONFIG' as const, path: '/' },
            }
          : parsePlaygroundView(nextDraft, props.config);
    if (!result.ok) {
      setEditorState(current => ({
        ...current,
        draft: nextDraft,
        status: { tone: 'error', code: result.error.code, path: result.error.path },
      }));
      return;
    }
    const canonical =
      props.kind === 'config'
        ? serializePlaygroundChartConfig(result.value as ChartConfig)
        : serializePlaygroundView(result.value as ViewSpec);
    setEditorState({
      draft: canonical,
      upstream: canonical,
      status: { tone: 'success', code: 'LIVE_SYNCED', path: '已同步' },
    });
    if (props.kind === 'config') {
      props.onApply(result.value as ChartConfig);
    } else {
      props.onApply(result.value as ViewSpec);
    }
  };

  const scheduleApply = (nextDraft: string): void => {
    if (applyTimerRef.current !== undefined) {
      window.clearTimeout(applyTimerRef.current);
    }
    setEditorState(current => ({
      ...current,
      status: { tone: 'neutral', code: 'VALIDATING', path: '正在校验' },
    }));
    applyTimerRef.current = window.setTimeout(() => applyDraft(nextDraft), APPLY_DELAY_MS);
  };

  const insertIndent = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const nextDraft = `${draft.slice(0, start)}  ${draft.slice(end)}`;
    setEditorState(current => ({ ...current, draft: nextDraft }));
    scheduleApply(nextDraft);
    window.requestAnimationFrame(() => {
      input.setSelectionRange(start + 2, start + 2);
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Tab') {
      event.preventDefault();
      insertIndent(event);
      return;
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      applyDraft(draft);
    }
  };

  const copyDraft = async (): Promise<void> => {
    if (copyTimerRef.current !== undefined) {
      window.clearTimeout(copyTimerRef.current);
    }
    try {
      await writeClipboard(draft);
      setCopied(true);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setCopied(false);
    }
  };

  const lineNumbers = Array.from(
    { length: Math.max(1, draft.split('\n').length) },
    (_, index) => index + 1,
  ).join('\n');

  return (
    <section
      id={props.id}
      className="playground-live-editor"
      role="tabpanel"
      aria-labelledby={props.labelledBy}
      hidden={props.hidden}
    >
      <div className="playground-live-editor__toolbar">
        <code>{fileName}</code>
        <div className="playground-live-editor__actions">
          <span
            className="playground-live-editor__status"
            data-tone={status.tone}
            role="status"
            aria-label={`${fileLabel}状态`}
            aria-live="polite"
            aria-atomic="true"
          >
            <strong>{status.code}</strong>
            <span>{status.path}</span>
          </span>
          <button
            className="playground-icon-button"
            type="button"
            aria-label={`复制${fileLabel}`}
            title={`复制${fileLabel}`}
            disabled={draft === ''}
            onClick={() => void copyDraft()}
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
          </button>
          <button
            className="playground-icon-button playground-icon-button--apply"
            type="button"
            aria-label={`立即应用${fileLabel}`}
            title={`立即应用${fileLabel}`}
            disabled={draft === ''}
            onClick={() => applyDraft(draft)}
          >
            <Play size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="playground-live-editor__input" data-disabled={!enabled}>
        <pre ref={gutterRef} className="playground-live-editor__gutter" aria-hidden="true">
          {lineNumbers}
        </pre>
        <textarea
          aria-label={`TellPlot ${fileLabel}`}
          value={draft}
          disabled={!enabled}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={event => {
            const nextDraft = event.currentTarget.value;
            setEditorState(current => ({ ...current, draft: nextDraft }));
            scheduleApply(nextDraft);
          }}
          onKeyDown={handleKeyDown}
          onScroll={event => {
            if (gutterRef.current !== null) {
              gutterRef.current.scrollTop = event.currentTarget.scrollTop;
            }
          }}
        />
      </div>
    </section>
  );
}

export function LiveChartEditor({
  id,
  config,
  view,
  labelledBy,
  onApplyConfig,
  onApplyView,
}: LiveChartEditorProps): React.JSX.Element {
  const [activeFile, setActiveFile] = useState<'config' | 'view'>('config');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const files = [
    { id: 'config', label: '图表配置' },
    { id: 'view', label: '视图状态' },
  ] as const;

  const navigateFiles = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let target: number | undefined;
    if (event.key === 'ArrowRight') {
      target = (index + 1) % files.length;
    } else if (event.key === 'ArrowLeft') {
      target = (index - 1 + files.length) % files.length;
    } else if (event.key === 'Home') {
      target = 0;
    } else if (event.key === 'End') {
      target = files.length - 1;
    }
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    const file = files[target];
    if (file !== undefined) {
      setActiveFile(file.id);
      tabRefs.current[target]?.focus();
    }
  };

  return (
    <section
      id={id}
      className="playground-live-workspace"
      role="tabpanel"
      aria-labelledby={labelledBy}
    >
      <div className="playground-live-file-tabs" role="tablist" aria-label="公共图表文件">
        {files.map((file, index) => (
          <button
            key={file.id}
            ref={element => {
              tabRefs.current[index] = element;
            }}
            id={`${id}-file-tab-${file.id}`}
            type="button"
            role="tab"
            aria-selected={activeFile === file.id}
            aria-controls={`${id}-file-panel-${file.id}`}
            tabIndex={activeFile === file.id ? 0 : -1}
            onClick={() => setActiveFile(file.id)}
            onKeyDown={event => navigateFiles(event, index)}
          >
            {file.label}
          </button>
        ))}
      </div>
      <LiveFileEditor
        id={`${id}-file-panel-config`}
        labelledBy={`${id}-file-tab-config`}
        hidden={activeFile !== 'config'}
        kind="config"
        config={config}
        onApply={onApplyConfig}
      />
      <LiveFileEditor
        id={`${id}-file-panel-view`}
        labelledBy={`${id}-file-tab-view`}
        hidden={activeFile !== 'view'}
        kind="view"
        config={config}
        view={view}
        onApply={onApplyView}
      />
    </section>
  );
}
