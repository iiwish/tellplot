import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import type { ChartConfig, ChartRenderIssue, CommandEvent, ViewSpec } from '@tellplot/editor';
import { ChartEditor, type ChartEditorExposed } from '../src/index';

const runtime = vi.hoisted(() => {
  const instances: {
    update: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    getView: ReturnType<typeof vi.fn>;
    exportImage: ReturnType<typeof vi.fn>;
  }[] = [];
  const createEditor = vi.fn((_container: HTMLElement, options: object) => {
    const instance = {
      update: vi.fn(),
      destroy: vi.fn(),
      focus: vi.fn(),
      getView: vi.fn(() => ({ revision: 0 }) as ViewSpec),
      exportImage: vi.fn(() => Promise.resolve({ mimeType: 'image/svg+xml' })),
      options,
    };
    instances.push(instance);
    return instance;
  });
  return { createEditor, instances };
});

vi.mock('@tellplot/editor', () => ({ createEditor: runtime.createEditor }));

const config: ChartConfig = {
  type: 'column',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'vue-adapter',
    items: [{ id: 'a', label: 'Alpha', amount: 1 }],
  },
};

const comparisonConfig: ChartConfig = {
  type: 'bar',
  data: {
    schemaVersion: '3.0.0',
    dataKind: 'categorical',
    datasetId: 'vue-comparison',
    series: [
      { id: 'current', label: 'Current' },
      { id: 'plan', label: 'Plan' },
    ],
    items: [
      {
        id: 'a',
        label: 'Alpha',
        values: [
          { seriesId: 'current', amount: 1 },
          { seriesId: 'plan', amount: 2 },
        ],
      },
    ],
  },
  editor: {
    readOnly: true,
    panels: { outline: true, inspector: false, toolbar: true },
    inspector: { mode: 'tabs' },
  },
};

const comparisonView: ViewSpec = {
  schemaVersion: '3.0.0',
  datasetId: 'vue-comparison',
  chartType: 'bar',
  revision: 1,
  rootOrder: ['a'],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
};

describe('Vue ChartEditor adapter', () => {
  it('maps updates and update:view to one imperative instance', async () => {
    const host = document.createElement('div');
    const currentConfig = ref(config);
    const editor = ref<ChartEditorExposed | null>(null);
    const updateView = vi.fn();
    const renderError = vi.fn();
    const nextRenderError = vi.fn();
    const useNextRenderError = ref(false);
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(ChartEditor, {
            ref: editor,
            config: currentConfig.value,
            'onUpdate:view': updateView,
            onRenderError: useNextRenderError.value ? nextRenderError : renderError,
          }),
      }),
    );
    app.mount(host);
    const instance = runtime.instances.at(-1);

    expect(runtime.createEditor).toHaveBeenCalledTimes(1);
    expect(editor.value?.getView()).toEqual({ revision: 0 });
    editor.value?.focus();
    await editor.value?.exportImage({ format: 'svg' });
    expect(instance?.focus).toHaveBeenCalledOnce();
    expect(instance?.exportImage).toHaveBeenCalledWith({ format: 'svg' });
    currentConfig.value = { ...config, height: 720 };
    await nextTick();
    expect(instance?.update).toHaveBeenCalled();
    const options = (
      instance as typeof instance & {
        readonly options: {
          readonly onViewChange: (view: ViewSpec, event: CommandEvent) => void;
          readonly onRenderError: (issue: ChartRenderIssue | null) => void;
        };
      }
    )?.options;
    options?.onViewChange({ revision: 1 } as ViewSpec, {} as CommandEvent);
    expect(updateView).toHaveBeenCalledWith({ revision: 1 });
    options?.onRenderError({ code: 'CHART_RENDER_ERROR', path: '/chart' });
    expect(renderError).toHaveBeenCalledWith({ code: 'CHART_RENDER_ERROR', path: '/chart' });
    options?.onRenderError(null);
    expect(renderError).toHaveBeenLastCalledWith(null);
    const updateCount = instance?.update.mock.calls.length;
    useNextRenderError.value = true;
    await nextTick();
    options?.onRenderError({ code: 'CHART_RENDER_ERROR', path: '/chart' });
    expect(renderError).toHaveBeenCalledTimes(2);
    expect(nextRenderError).toHaveBeenCalledWith({
      code: 'CHART_RENDER_ERROR',
      path: '/chart',
    });
    expect(instance?.update).toHaveBeenCalledTimes(updateCount ?? 0);

    app.unmount();
    expect(instance?.destroy).toHaveBeenCalledTimes(1);
  });

  it('submits a compatible comparison config and controlled view in one reactive flush', async () => {
    const host = document.createElement('div');
    const currentConfig = ref<ChartConfig>(config);
    const currentView = ref<ViewSpec | undefined>();
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(ChartEditor, {
            config: currentConfig.value,
            ...(currentView.value === undefined ? {} : { view: currentView.value }),
          }),
      }),
    );
    app.mount(host);
    const instance = runtime.instances.at(-1);

    currentConfig.value = comparisonConfig;
    currentView.value = comparisonView;
    await nextTick();

    expect(instance?.update).toHaveBeenCalledOnce();
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ config: comparisonConfig, view: comparisonView }),
    );
    app.unmount();
  });

  it('forwards standalone defaultView and both controlled-mode transitions', async () => {
    const host = document.createElement('div');
    const currentView = ref<ViewSpec | undefined>();
    const currentDefaultView = ref<ViewSpec | undefined>(comparisonView);
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(ChartEditor, {
            config: comparisonConfig,
            ...(currentView.value === undefined ? {} : { view: currentView.value }),
            ...(currentDefaultView.value === undefined
              ? {}
              : { defaultView: currentDefaultView.value }),
          }),
      }),
    );
    app.mount(host);
    const instance = runtime.instances.at(-1);
    expect((instance as (typeof instance & { options: object }) | undefined)?.options).toEqual(
      expect.objectContaining({ defaultView: comparisonView }),
    );

    currentDefaultView.value = undefined;
    currentView.value = comparisonView;
    await nextTick();
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ defaultView: expect.anything() }),
    );
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ view: comparisonView }),
    );

    currentView.value = undefined;
    currentDefaultView.value = comparisonView;
    await nextTick();
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ view: expect.anything() }),
    );
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ defaultView: comparisonView }),
    );
    app.unmount();
  });
});
