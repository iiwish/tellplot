import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withOffscreenG2Render } from '../../../src/rendering/g2/exportRuntime';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];
    static renderError: Error | undefined;

    readonly options = vi.fn((): this => this);
    readonly render = vi.fn((): Promise<void> => {
      if (Chart.renderError !== undefined) {
        return Promise.reject(Chart.renderError);
      }
      const host = (this.config as { readonly container: HTMLElement }).container;
      host.append(document.createElement('canvas'));
      return Promise.resolve();
    });
    readonly destroy = vi.fn((): void => undefined);

    constructor(readonly config: unknown) {
      Chart.instances.push(this);
    }
  }

  return { Chart };
});

const svgMock = vi.hoisted(() => {
  class Renderer {
    readonly kind = 'svg';
  }

  return { Renderer };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));
vi.mock('@antv/g-svg', () => ({ Renderer: svgMock.Renderer }));

beforeEach(() => {
  g2Mock.Chart.instances = [];
  g2Mock.Chart.renderError = undefined;
  document.body.replaceChildren();
});

describe('offscreen G2 export runtime', () => {
  it('awaits the format reader, then destroys the chart and removes the host', async () => {
    let releaseReader: () => void = () => undefined;
    const readerGate = new Promise<void>(resolve => {
      releaseReader = resolve;
    });
    const pending = withOffscreenG2Render(
      {
        ownerDocument: document,
        parent: document.body,
        renderer: 'canvas',
        width: 640,
        height: 360,
        spec: { type: 'interval' },
      },
      async host => {
        expect(host.isConnected).toBe(true);
        await readerGate;
        return host.querySelector('canvas');
      },
    );

    await vi.waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    expect(chart?.destroy).not.toHaveBeenCalled();
    expect(document.body.querySelector('[data-tellplot-offscreen-chart]')).not.toBeNull();
    releaseReader();

    const surface = await pending;
    expect(surface).toBeInstanceOf(HTMLCanvasElement);
    expect(chart?.destroy).toHaveBeenCalledOnce();
    expect(document.body.querySelector('[data-tellplot-offscreen-chart]')).toBeNull();
  });

  it.each(['render', 'reader'] as const)(
    'cleans chart and host after a %s failure',
    async phase => {
      if (phase === 'render') {
        g2Mock.Chart.renderError = new Error('private renderer failure');
      }
      const reader = vi.fn(() => {
        if (phase === 'reader') {
          throw new Error('private reader failure');
        }
        return undefined;
      });

      await expect(
        withOffscreenG2Render(
          {
            ownerDocument: document,
            parent: document.body,
            renderer: 'canvas',
            width: 320,
            height: 180,
            spec: { type: 'interval' },
          },
          reader,
        ),
      ).rejects.toThrow();

      expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce();
      expect(document.body.querySelector('[data-tellplot-offscreen-chart]')).toBeNull();
    },
  );

  it('loads the SVG renderer only for SVG requests', async () => {
    await withOffscreenG2Render(
      {
        ownerDocument: document,
        parent: document.body,
        renderer: 'svg',
        width: 400,
        height: 240,
        spec: { type: 'interval' },
      },
      () => undefined,
    );

    expect(g2Mock.Chart.instances[0]?.config).toEqual(
      expect.objectContaining({ renderer: expect.any(svgMock.Renderer) }),
    );
  });
});
