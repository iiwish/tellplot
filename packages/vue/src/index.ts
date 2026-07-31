import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import {
  createEditor,
  type ChartConfig,
  type ChartRenderIssue,
  type CommandError,
  type CommandEvent,
  type EditorInstance,
  type EditorOptions,
  type ExportOptions,
  type ExportResult,
  type SelectionState,
  type ValidationIssue,
  type ViewSpec,
} from '@tellplot/editor';

export interface ChartEditorExposed {
  focus(): void;
  getView(): ViewSpec;
  exportImage(options: ExportOptions): Promise<ExportResult>;
}

/** Vue lifecycle adapter with `v-model:view`; the imperative editor remains the only runtime. */
const ChartEditorImplementation = defineComponent({
  name: 'TellPlotChartEditor',
  inheritAttrs: false,
  props: {
    config: { type: Object as PropType<ChartConfig>, required: true },
    view: { type: Object as PropType<ViewSpec>, required: false },
    defaultView: { type: Object as PropType<ViewSpec>, required: false },
  },
  emits: {
    'update:view': (view: ViewSpec): boolean => typeof view === 'object',
    viewChange: (view: ViewSpec, event: CommandEvent): boolean =>
      typeof view === 'object' && typeof event === 'object',
    command: (event: CommandEvent): boolean => typeof event === 'object',
    commandRejected: (error: CommandError): boolean => typeof error === 'object',
    configRejected: (issues: readonly ValidationIssue[]): boolean => Array.isArray(issues),
    selectionChange: (selection: SelectionState | null): boolean =>
      selection === null || typeof selection === 'object',
    renderError: (issue: ChartRenderIssue | null): boolean =>
      issue === null || typeof issue === 'object',
  },
  setup(props, { attrs, emit, expose }) {
    const host = ref<HTMLElement | null>(null);
    let instance: EditorInstance | null = null;

    const toOptions = (): EditorOptions => ({
      config: props.config,
      ...(props.view === undefined ? {} : { view: props.view }),
      ...(props.defaultView === undefined ? {} : { defaultView: props.defaultView }),
      onViewChange: (view, event) => {
        emit('update:view', view);
        emit('viewChange', view, event);
      },
      onCommand: event => emit('command', event),
      onCommandRejected: error => emit('commandRejected', error),
      onConfigRejected: issues => emit('configRejected', issues),
      onSelectionChange: selection => emit('selectionChange', selection),
      onRenderError: issue => emit('renderError', issue),
    });

    const exposed: ChartEditorExposed = {
      focus: () => instance?.focus(),
      getView: () => {
        if (instance === null) {
          throw new Error('TellPlot Vue editor is not mounted.');
        }
        return instance.getView();
      },
      exportImage: options =>
        instance === null
          ? Promise.reject(new Error('TellPlot Vue editor is not mounted.'))
          : instance.exportImage(options),
    };
    expose(exposed);

    onMounted(() => {
      if (host.value !== null) {
        instance = createEditor(host.value, toOptions());
      }
    });
    watch(
      () => [props.config, props.view, props.defaultView] as const,
      () => instance?.update(toOptions()),
    );
    onBeforeUnmount(() => {
      instance?.destroy();
      instance = null;
    });

    return () =>
      h('div', {
        ...attrs,
        ref: host,
        class: ['tellplot-vue-host', attrs['class']],
      });
  },
});

type ChartEditorPublicInstance = InstanceType<typeof ChartEditorImplementation> &
  ChartEditorExposed;

type ChartEditorConstructor = new () => ChartEditorPublicInstance;

export const ChartEditor = ChartEditorImplementation as typeof ChartEditorImplementation &
  ChartEditorConstructor;

export type {
  ChartConfig,
  ChartRenderIssue,
  CommandError,
  CommandEvent,
  ExportOptions,
  ExportResult,
  SelectionState,
  ValidationIssue,
  ViewSpec,
} from '@tellplot/editor';
