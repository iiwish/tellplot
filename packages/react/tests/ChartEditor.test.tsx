import { createRef, StrictMode, useState } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ChartConfig, CommandEvent, EditorOptions, ViewSpec } from '@tellplot/editor';
import { ChartEditor, type ChartEditorHandle } from '../src/index';

const runtime = vi.hoisted(() => {
  const instances: {
    update: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    getView: ReturnType<typeof vi.fn>;
    exportImage: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }[] = [];
  const createEditor = vi.fn((...input: [HTMLElement, EditorOptions]) => {
    input[1].onConfigRejected?.([
      {
        code: 'INVALID_CHART_CONFIG',
        reason: 'EXPECTED_OBJECT',
        message: 'Expected a plain object.',
        path: '/',
        details: {},
      },
    ]);
    const instance = {
      update: vi.fn(),
      focus: vi.fn(),
      getView: vi.fn(() => ({ revision: 0 }) as ViewSpec),
      exportImage: vi.fn(),
      destroy: vi.fn(),
    };
    instances.push(instance);
    return instance;
  });
  return { createEditor, instances };
});

vi.mock('@tellplot/editor', () => ({ createEditor: runtime.createEditor }));

const config: ChartConfig = {
  type: 'bar',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'react-adapter',
    items: [{ id: 'a', label: 'Alpha', amount: 1 }],
  },
};

const comparisonConfig: ChartConfig = {
  type: 'column',
  data: {
    schemaVersion: '3.0.0',
    dataKind: 'categorical',
    datasetId: 'react-comparison',
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
    panels: { outline: false, inspector: true, toolbar: true },
    inspector: { mode: 'tabs' },
  },
};

const comparisonView: ViewSpec = {
  schemaVersion: '3.0.0',
  datasetId: 'react-comparison',
  chartType: 'column',
  revision: 1,
  rootOrder: ['a'],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
};

describe('React ChartEditor adapter', () => {
  it('updates one imperative instance only for runtime inputs and keeps callbacks current', () => {
    const handle = createRef<ChartEditorHandle>();
    const onViewChange = vi.fn();
    const onRenderError = vi.fn();
    const rendered = render(
      <ChartEditor
        ref={handle}
        config={config}
        onViewChange={onViewChange}
        onRenderError={onRenderError}
      />,
    );
    const instance = runtime.instances.at(-1);

    expect(runtime.createEditor).toHaveBeenCalledTimes(1);
    expect(handle.current?.getView()).toEqual({ revision: 0 });
    expect(instance?.update).not.toHaveBeenCalled();
    const nextOnViewChange = vi.fn();
    const nextOnRenderError = vi.fn();
    rendered.rerender(
      <ChartEditor
        ref={handle}
        config={config}
        onViewChange={nextOnViewChange}
        onRenderError={nextOnRenderError}
      />,
    );
    expect(runtime.createEditor).toHaveBeenCalledTimes(1);
    expect(instance?.update).not.toHaveBeenCalled();
    const initialOptions = runtime.createEditor.mock.calls.at(-1)?.[1];
    initialOptions?.onViewChange?.({ revision: 1 } as ViewSpec, {} as CommandEvent);
    expect(onViewChange).not.toHaveBeenCalled();
    expect(nextOnViewChange).toHaveBeenCalledOnce();
    initialOptions?.onRenderError?.({ code: 'CHART_RENDER_ERROR', path: '/chart' });
    expect(onRenderError).not.toHaveBeenCalled();
    expect(nextOnRenderError).toHaveBeenCalledOnce();

    rendered.rerender(
      <ChartEditor
        ref={handle}
        config={{ ...config, height: 720 }}
        onViewChange={nextOnViewChange}
        onRenderError={nextOnRenderError}
      />,
    );
    expect(instance?.update).toHaveBeenCalledOnce();

    rendered.unmount();
    expect(instance?.destroy).toHaveBeenCalledTimes(1);
  });

  it('submits a compatible comparison config and controlled view in one render', () => {
    const rendered = render(<ChartEditor config={config} />);
    const instance = runtime.instances.at(-1);

    rendered.rerender(<ChartEditor config={comparisonConfig} view={comparisonView} />);

    expect(instance?.update).toHaveBeenCalledOnce();
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ config: comparisonConfig, view: comparisonView }),
    );
    rendered.unmount();
  });

  it('forwards standalone defaultView and both controlled-mode transitions', () => {
    const rendered = render(<ChartEditor config={comparisonConfig} defaultView={comparisonView} />);
    const instance = runtime.instances.at(-1);
    expect(runtime.createEditor.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({ defaultView: comparisonView }),
    );

    rendered.rerender(<ChartEditor config={comparisonConfig} view={comparisonView} />);
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ defaultView: expect.anything() }),
    );
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ view: comparisonView }),
    );

    rendered.rerender(<ChartEditor config={comparisonConfig} defaultView={comparisonView} />);
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ view: expect.anything() }),
    );
    expect(instance?.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ defaultView: comparisonView }),
    );
    rendered.unmount();
  });

  it('cleans every Strict Mode mount', () => {
    const start = runtime.instances.length;
    const rendered = render(
      <StrictMode>
        <ChartEditor config={config} />
      </StrictMode>,
    );
    rendered.unmount();

    const created = runtime.instances.slice(start);
    expect(created.length).toBeGreaterThanOrEqual(2);
    expect(created.every(instance => instance.destroy.mock.calls.length === 1)).toBe(true);
  });

  it('reports an initial config rejection once across Strict Mode effect replay', async () => {
    const onConfigRejected = vi.fn();
    const rendered = render(
      <StrictMode>
        <ChartEditor config={config} onConfigRejected={onConfigRejected} />
      </StrictMode>,
    );

    await waitFor(() => expect(onConfigRejected).toHaveBeenCalledOnce());
    rendered.unmount();
  });

  it('applies a synchronous host recovery triggered by initial config rejection', async () => {
    function RecoveringEditor() {
      const [currentConfig, setCurrentConfig] = useState(config);
      return (
        <ChartEditor
          config={currentConfig}
          onConfigRejected={() =>
            setCurrentConfig(previous =>
              previous.height === 721 ? previous : { ...previous, height: 721 },
            )
          }
        />
      );
    }

    const rendered = render(<RecoveringEditor />);
    const instance = runtime.instances.at(-1);

    await waitFor(() =>
      expect(instance?.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ height: 721 }),
        }),
      ),
    );
    rendered.unmount();
  });
});
