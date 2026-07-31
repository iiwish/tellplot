import { h, ref, type ComponentPublicInstance } from 'vue';
import '@tellplot/vue/styles.css';

import {
  ChartEditor,
  type ChartConfig,
  type ChartEditorExposed,
  type ChartRenderIssue,
  type CommandError,
  type CommandEvent,
  type SelectionState,
  type ValidationIssue,
  type ViewSpec,
} from '@tellplot/vue';

declare const config: ChartConfig;
declare const initialView: ViewSpec;

export const view = ref(initialView);
export const editor = h(ChartEditor, {
  config,
  view: view.value,
  'onUpdate:view': nextView => {
    view.value = nextView;
  },
  onViewChange: (nextView, event) => {
    const checkedView: ViewSpec = nextView;
    const checkedEvent: CommandEvent = event;
    return [checkedView, checkedEvent];
  },
  onCommand: event => {
    const checked: CommandEvent = event;
    return checked;
  },
  onCommandRejected: error => {
    const checked: CommandError = error;
    return checked;
  },
  onConfigRejected: issues => {
    const checked: readonly ValidationIssue[] = issues;
    return checked;
  },
  onSelectionChange: selection => {
    const checked: SelectionState | null = selection;
    return checked;
  },
  onRenderError: issue => {
    const checked: ChartRenderIssue | null = issue;
    return checked;
  },
});
export const exposed = ref<(ComponentPublicInstance & ChartEditorExposed) | null>(null);
export const inferredExposed = ref<InstanceType<typeof ChartEditor> | null>(null);
inferredExposed.value?.focus();
inferredExposed.value?.getView();
inferredExposed.value?.exportImage({ format: 'svg' });
