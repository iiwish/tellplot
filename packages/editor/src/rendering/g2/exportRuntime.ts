import type { Chart as G2Chart, G2Spec } from '@antv/g2';

import { loadG2ChartConstructor } from './chartRuntime';

export interface OffscreenG2RenderRequest {
  readonly ownerDocument: Document;
  readonly parent: HTMLElement;
  readonly renderer: 'canvas' | 'svg';
  readonly width: number;
  readonly height: number;
  readonly spec: G2Spec;
  readonly signal?: AbortSignal;
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

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new Error('Offscreen render aborted.');
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw abortReason(signal);
  }
}

function waitWithAbort<Result>(
  promise: Promise<Result>,
  signal: AbortSignal | undefined,
): Promise<Result> {
  if (signal === undefined) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(abortReason(signal));
  }
  return new Promise<Result>((resolve, reject) => {
    const handleAbort = (): void => {
      signal.removeEventListener('abort', handleAbort);
      reject(abortReason(signal));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', handleAbort);
    });
  });
}

/** Keeps the rendered surface alive only for the bounded format reader. */
export async function withOffscreenG2Render<Result>(
  request: OffscreenG2RenderRequest,
  readResult: (host: HTMLDivElement) => Result | Promise<Result>,
): Promise<Result> {
  const host = createOffscreenHost(request);
  let chart: G2Chart | undefined;
  let chartDestroyed = false;
  const cleanup = (): void => {
    if (chart !== undefined && !chartDestroyed) {
      chartDestroyed = true;
      try {
        chart.destroy();
      } catch {
        // Cleanup failure must not expose renderer internals or financial data.
      }
    }
    host.remove();
  };
  request.signal?.addEventListener('abort', cleanup, { once: true });
  try {
    const Chart = await waitWithAbort(loadG2ChartConstructor(), request.signal);
    throwIfAborted(request.signal);
    if (request.renderer === 'svg') {
      const { Renderer } = await waitWithAbort(import('@antv/g-svg'), request.signal);
      throwIfAborted(request.signal);
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
    throwIfAborted(request.signal);
    chart.options(request.spec);
    await waitWithAbort(chart.render(), request.signal);
    throwIfAborted(request.signal);
    return await waitWithAbort(Promise.resolve(readResult(host)), request.signal);
  } finally {
    request.signal?.removeEventListener('abort', cleanup);
    cleanup();
  }
}
