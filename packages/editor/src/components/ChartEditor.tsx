import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import {
  toFinancialChartAppearance,
  validateChartConfig,
  viewMatchesChartConfig,
  type ChartConfig,
} from '../config/chartConfig';
import { createInitialViewSpec } from '../domain/createInitialViewSpec';
import { validationIssue, type ValidationIssue } from '../domain/errors';
import type { SourceData, ViewSpec } from '../domain/model';
import { validateViewSpec } from '../domain/validation';
import type {
  ChartEditorHandle,
  ChartEditorProps,
  FinancialChartEditorHandle,
} from '../react/editorTypes';
import { FinancialChartEditor } from './FinancialChartEditor';

type PublicEditorMode = 'controlled' | 'uncontrolled';

interface UncontrolledViewState {
  readonly data: SourceData | null;
  readonly type: ChartConfig['type'] | null;
  readonly view: ViewSpec | null;
}

function createConfigView(config: ChartConfig): ViewSpec | null {
  const result = createInitialViewSpec(config.data, { chartType: config.type });
  return result.ok ? result.value : null;
}

function initialUncontrolledState(
  config: ChartConfig | null,
  defaultView: ViewSpec | undefined,
): UncontrolledViewState {
  return config === null
    ? { data: null, type: null, view: null }
    : {
        data: config.data,
        type: config.type,
        view: defaultView ?? createConfigView(config),
      };
}

function retainedView(view: ViewSpec | null, config: ChartConfig): ViewSpec {
  if (view !== null && viewMatchesChartConfig(view, config)) {
    const result = validateViewSpec(view, config.data);
    if (result.ok) {
      return result.value;
    }
  }
  const created = createConfigView(config);
  if (created === null) {
    throw new Error('Validated chart config could not create an initial view.');
  }
  return created;
}

function editorHeight(config: ChartConfig | null): number | string {
  const height = config?.height;
  return typeof height === 'number' ? Math.max(480, height) : (height ?? 680);
}

function modeIssue(): ValidationIssue {
  return validationIssue('INVALID_CHART_CONFIG', 'INVALID_TYPE', '/view', {
    configuration: 'mutually-exclusive-view-props',
  });
}

function viewTypeIssue(): ValidationIssue {
  return validationIssue('SOURCE_CONFLICT', 'INCOMPATIBLE_CHART_TYPE', '/view/chartType');
}

function missingViewIssue(): ValidationIssue {
  return validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', '/view');
}

function InvalidConfigStage({
  config,
  issues,
}: {
  readonly config: ChartConfig | null;
  readonly issues: readonly ValidationIssue[];
}): React.JSX.Element {
  return (
    <div
      className="tp-editor"
      data-tellplot="editor"
      data-editor-state="invalid"
      style={{ height: editorHeight(config) }}
    >
      <section className="tp-invalid-stage" role="alert">
        <div className="tp-invalid-mark" aria-hidden="true">
          !
        </div>
        <div>
          <h2>Invalid chart configuration</h2>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.code}:${issue.path}:${index}`}>
                <strong>{issue.code}</strong>
                <code>{issue.path}</code>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

/** Declarative public chart editor backed by TellPlot's immutable source/view runtime. */
export const ChartEditor = forwardRef<ChartEditorHandle, ChartEditorProps>(
  function ChartEditor(props, forwardedRef): React.JSX.Element {
    const { onConfigRejected } = props;
    const configResult = useMemo(() => validateChartConfig(props.config), [props.config]);
    const config = configResult.ok ? configResult.value : null;
    const [lockedMode] = useState<PublicEditorMode>(() =>
      props.view === undefined ? 'uncontrolled' : 'controlled',
    );
    const modeInvalid =
      props.view !== undefined && props.defaultView !== undefined
        ? true
        : lockedMode === 'controlled'
          ? props.view === undefined
          : props.view !== undefined;
    const [uncontrolled, setUncontrolled] = useState<UncontrolledViewState>(() =>
      initialUncontrolledState(config, props.defaultView),
    );

    if (
      config !== null &&
      lockedMode === 'uncontrolled' &&
      (uncontrolled.data !== config.data || uncontrolled.type !== config.type)
    ) {
      setUncontrolled({
        data: config.data,
        type: config.type,
        view: retainedView(uncontrolled.view, config),
      });
    }

    const visibleView = lockedMode === 'controlled' ? (props.view ?? null) : uncontrolled.view;
    const issues = useMemo<readonly ValidationIssue[]>(() => {
      if (!configResult.ok) {
        return configResult.errors;
      }
      if (modeInvalid) {
        return [modeIssue()];
      }
      if (visibleView === null) {
        return [missingViewIssue()];
      }
      if (!viewMatchesChartConfig(visibleView, configResult.value)) {
        return [viewTypeIssue()];
      }
      const viewResult = validateViewSpec(visibleView, configResult.value.data);
      return viewResult.ok ? [] : viewResult.errors;
    }, [configResult, modeInvalid, visibleView]);

    useEffect(() => {
      if (issues.length === 0 || onConfigRejected === undefined) {
        return;
      }
      try {
        onConfigRejected(issues);
      } catch {
        try {
          console.error('[tellplot] Host callback failed: onConfigRejected');
        } catch {
          return;
        }
      }
    }, [issues, onConfigRejected]);

    const internalRef = useRef<FinancialChartEditorHandle>(null);
    useImperativeHandle(
      forwardedRef,
      () => ({
        focus(): void {
          internalRef.current?.focus();
        },
        exportImage(options) {
          const editor = internalRef.current;
          if (editor === null) {
            return Promise.reject(new Error('Chart editor is not ready.'));
          }
          return editor.exportImage(options);
        },
        getView(): ViewSpec {
          const editor = internalRef.current;
          if (editor === null) {
            throw new Error('Chart editor is not ready.');
          }
          return editor.getViewSpec();
        },
      }),
      [],
    );

    if (config === null || visibleView === null || issues.length > 0) {
      return <InvalidConfigStage config={config} issues={issues} />;
    }

    const editor = config.editor;
    const layout = {
      ...(editor?.outline?.placement === undefined
        ? {}
        : { outlinePlacement: editor.outline.placement }),
      ...(editor?.inspector?.mode === undefined
        ? {}
        : {
            inspectorMode:
              editor.inspector.mode === 'tabs' ? ('tab' as const) : ('static' as const),
          }),
    };
    return (
      <FinancialChartEditor
        ref={internalRef}
        sourceData={config.data}
        viewSpec={visibleView}
        {...(config.locale === undefined ? {} : { locale: config.locale })}
        {...(config.height === undefined ? {} : { height: config.height })}
        {...(editor?.readOnly === undefined ? {} : { readOnly: editor.readOnly })}
        {...(editor?.historyLimit === undefined ? {} : { historyLimit: editor.historyLimit })}
        {...(editor?.panels === undefined ? {} : { panels: editor.panels })}
        {...(Object.keys(layout).length === 0 ? {} : { layout })}
        chartAppearance={toFinancialChartAppearance(config)}
        onViewSpecChange={(next, event) => {
          if (lockedMode === 'uncontrolled') {
            setUncontrolled(current => ({ ...current, view: next }));
          }
          props.onViewChange?.(next, event);
        }}
        {...(props.onCommand === undefined ? {} : { onCommand: props.onCommand })}
        {...(props.onCommandRejected === undefined
          ? {}
          : { onCommandRejected: props.onCommandRejected })}
        {...(props.onSelectionChange === undefined
          ? {}
          : { onSelectionChange: props.onSelectionChange })}
      />
    );
  },
);
