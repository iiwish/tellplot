import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type JSX,
} from 'react';
import {
  createEditor,
  type ChartConfig,
  type EditorInstance,
  type EditorOptions,
  type ExportOptions,
  type ExportResult,
  type ViewSpec,
} from '@tellplot/editor';

export interface ChartEditorProps extends EditorOptions {
  readonly className?: string;
  readonly style?: CSSProperties;
}

export interface ChartEditorHandle {
  focus(): void;
  getView(): ViewSpec;
  exportImage(options: ExportOptions): Promise<ExportResult>;
}

type EditorCallbacks = Pick<
  EditorOptions,
  | 'onViewChange'
  | 'onCommand'
  | 'onCommandRejected'
  | 'onConfigRejected'
  | 'onSelectionChange'
  | 'onRenderError'
>;

const hostsWithInitialConfigRejection = new WeakSet<HTMLElement>();

function editorOptions(
  config: ChartConfig,
  view: ViewSpec | undefined,
  defaultView: ViewSpec | undefined,
  callbacks: EditorCallbacks,
): EditorOptions {
  return {
    config,
    ...(view === undefined ? {} : { view }),
    ...(defaultView === undefined ? {} : { defaultView }),
    ...callbacks,
  };
}

/** React lifecycle adapter; all editing state and UI remain owned by `@tellplot/editor`. */
export const ChartEditor = forwardRef<ChartEditorHandle, ChartEditorProps>(
  function ChartEditor(props, forwardedRef): JSX.Element {
    const hostRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<EditorInstance | null>(null);
    const latestPropsRef = useRef(props);
    const skipNextUpdateRef = useRef(false);
    const creatingInstanceRef = useRef(false);
    const callbacksRef = useRef<EditorCallbacks>({
      onViewChange: (view, event) => latestPropsRef.current.onViewChange?.(view, event),
      onCommand: event => latestPropsRef.current.onCommand?.(event),
      onCommandRejected: error => latestPropsRef.current.onCommandRejected?.(error),
      onConfigRejected: issues => {
        if (creatingInstanceRef.current) {
          const host = hostRef.current;
          if (host !== null && hostsWithInitialConfigRejection.has(host)) {
            return;
          }
          if (host !== null) {
            hostsWithInitialConfigRejection.add(host);
          }
        }
        latestPropsRef.current.onConfigRejected?.(issues);
      },
      onSelectionChange: selection => latestPropsRef.current.onSelectionChange?.(selection),
      onRenderError: issue => latestPropsRef.current.onRenderError?.(issue),
    });
    const config = props.config;
    const view = props.view;
    const defaultView = props.defaultView;

    useLayoutEffect(() => {
      latestPropsRef.current = props;
    });

    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: () => instanceRef.current?.focus(),
        getView: () => {
          const instance = instanceRef.current;
          if (instance === null) {
            throw new Error('TellPlot React editor is not mounted.');
          }
          return instance.getView();
        },
        exportImage: options => {
          const instance = instanceRef.current;
          return instance === null
            ? Promise.reject(new Error('TellPlot React editor is not mounted.'))
            : instance.exportImage(options);
        },
      }),
      [],
    );

    useLayoutEffect(() => {
      const host = hostRef.current;
      if (host === null) {
        return undefined;
      }
      skipNextUpdateRef.current = true;
      const current = latestPropsRef.current;
      creatingInstanceRef.current = true;
      let instance: EditorInstance;
      try {
        instance = createEditor(
          host,
          editorOptions(current.config, current.view, current.defaultView, callbacksRef.current),
        );
      } finally {
        creatingInstanceRef.current = false;
      }
      instanceRef.current = instance;
      return () => {
        instanceRef.current = null;
        instance.destroy();
      };
    }, []);

    useLayoutEffect(() => {
      if (skipNextUpdateRef.current) {
        skipNextUpdateRef.current = false;
        return;
      }
      instanceRef.current?.update(editorOptions(config, view, defaultView, callbacksRef.current));
    }, [config, defaultView, view]);

    return (
      <div
        className={['tellplot-react-host', props.className].filter(Boolean).join(' ')}
        ref={hostRef}
        style={props.style}
      />
    );
  },
);
ChartEditor.displayName = 'TellPlotChartEditor';

export type {
  ChartConfig,
  ChartRenderIssue,
  CommandError,
  CommandEvent,
  ExportError,
  ExportErrorCode,
  ExportOptions,
  ExportResult,
  SelectionState,
  ValidationIssue,
  ViewSpec,
} from '@tellplot/editor';
