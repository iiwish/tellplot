import type { Chart as G2Chart, G2Spec } from '@antv/g2';

import { loadG2ChartConstructor } from './chartRuntime';

export interface OffscreenG2RenderRequest {
  readonly ownerDocument: Document;
  readonly parent: HTMLElement;
  readonly renderer: 'canvas' | 'svg';
  readonly width: number;
  readonly height: number;
  readonly spec: G2Spec;
}

function createOffscreenHost(request: OffscreenG2RenderRequest): HTMLDivElement {
  const host = request.ownerDocument.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('data-tellplot-offscreen-chart', request.renderer);
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '-10000px';
  host.style.width = `${request.width}px`;
  host.style.height = `${request.height}px`;
  host.style.pointerEvents = 'none';
  request.parent.append(host);
  return host;
}

/** Keeps the rendered surface alive only for the bounded format reader. */
export async function withOffscreenG2Render<Result>(
  request: OffscreenG2RenderRequest,
  readResult: (host: HTMLDivElement) => Result | Promise<Result>,
): Promise<Result> {
  const host = createOffscreenHost(request);
  let chart: G2Chart | undefined;
  try {
    const Chart = await loadG2ChartConstructor();
    if (request.renderer === 'svg') {
      const { Renderer } = await import('@antv/g-svg');
      chart = new Chart({
        container: host,
        width: request.width,
        height: request.height,
        autoFit: false,
        renderer: new Renderer(),
      });
    } else {
      chart = new Chart({
        container: host,
        width: request.width,
        height: request.height,
        autoFit: false,
      });
    }
    chart.options(request.spec);
    await chart.render();
    return await readResult(host);
  } finally {
    try {
      chart?.destroy();
    } catch {
      // Cleanup failure must not expose renderer internals or financial data.
    }
    host.remove();
  }
}
