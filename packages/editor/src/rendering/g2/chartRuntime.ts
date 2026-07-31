import type { Chart as G2Chart, G2Spec } from '@antv/g2';

type G2ChartConstructor = typeof G2Chart;

let chartConstructorPromise: Promise<G2ChartConstructor> | undefined;

async function importG2ChartConstructor(): Promise<G2ChartConstructor> {
  try {
    return (await import('@antv/g2')).Chart;
  } catch (error) {
    chartConstructorPromise = undefined;
    throw error;
  }
}

export function loadG2ChartConstructor(): Promise<G2ChartConstructor> {
  if (chartConstructorPromise !== undefined) {
    return chartConstructorPromise;
  }
  chartConstructorPromise = importG2ChartConstructor();
  return chartConstructorPromise;
}

export interface G2ChartEventRegistration {
  readonly name: string;
  readonly listener: (event: unknown) => void;
}

export interface G2ChartRenderRequest<Value> {
  readonly value: Value;
  readonly spec: G2Spec;
}

export interface G2ChartRenderSettlement<Value> {
  readonly value: Value;
  readonly status: 'success' | 'failure';
  readonly latest: boolean;
}

export interface G2ChartRuntimeOptions<Value> {
  readonly container: HTMLElement;
  readonly events: readonly G2ChartEventRegistration[];
  readonly onRenderSettled: (settlement: G2ChartRenderSettlement<Value>) => void;
  readonly onCallbackError?: (() => void) | undefined;
  readonly onCleanupError?: (() => void) | undefined;
}

export interface G2ChartRuntime<Value> {
  request(request: G2ChartRenderRequest<Value>): void;
  finishAnimations(): void;
  getContext(): unknown;
  dispose(): void;
}

function finishAnimations(chart: G2Chart): void {
  try {
    for (const animation of chart.getContext().animations ?? []) {
      try {
        animation.finish();
      } catch {
        // Finishing an already-disposed animation is best effort.
      }
    }
  } catch {
    // A renderer without an animation context does not block the next request.
  }
}

/** Owns the shared G2 constructor, render queue, event and teardown lifecycle. */
export function createG2ChartRuntime<Value>(
  options: G2ChartRuntimeOptions<Value>,
): G2ChartRuntime<Value> {
  let chart: G2Chart | undefined;
  let disposed = false;
  let initializing = false;
  let rendering = false;
  let requestId = 0;
  let attemptedRequestId = 0;
  let latestRequest:
    | (G2ChartRenderRequest<Value> & {
        readonly id: number;
      })
    | undefined;
  let activeRegistrations: readonly G2ChartEventRegistration[] = [];
  let scheduledFrame: { readonly ownerWindow: Window; readonly id: number } | undefined;
  let scheduleToken = 0;
  let resizeObserver: ResizeObserver | undefined;
  let resizePending = false;
  let resizing = false;

  const notifyCallbackError = (): void => {
    try {
      options.onCallbackError?.();
    } catch {
      // A reporting callback cannot interrupt renderer progress.
    }
  };

  const notifySettlement = (settlement: G2ChartRenderSettlement<Value>): void => {
    try {
      options.onRenderSettled(settlement);
    } catch {
      notifyCallbackError();
    }
  };

  const cancelScheduledFlush = (): void => {
    scheduleToken += 1;
    if (scheduledFrame !== undefined) {
      scheduledFrame.ownerWindow.cancelAnimationFrame(scheduledFrame.id);
      scheduledFrame = undefined;
    }
  };

  const disconnectResizeObserver = (): void => {
    resizePending = false;
    resizeObserver?.disconnect();
    resizeObserver = undefined;
  };

  const releaseChart = (): void => {
    disconnectResizeObserver();
    const current = chart;
    if (current === undefined) {
      return;
    }
    chart = undefined;
    let cleanupFailed = false;
    for (const registration of activeRegistrations) {
      try {
        current.off(registration.name, registration.listener);
      } catch {
        cleanupFailed = true;
      }
    }
    activeRegistrations = [];
    try {
      current.destroy();
    } catch {
      cleanupFailed = true;
    }
    if (cleanupFailed) {
      try {
        options.onCleanupError?.();
      } catch {
        // Cleanup reporting is best effort and must not expose renderer details.
      }
    }
  };

  const flushResize = async (): Promise<void> => {
    const activeChart = chart;
    if (activeChart === undefined || disposed || rendering || resizing || !resizePending) {
      return;
    }
    resizePending = false;
    resizing = true;
    try {
      await activeChart.forceFit();
    } catch {
      // A later render request or resize can recover from a transient fit failure.
    } finally {
      resizing = false;
      if (!disposed && resizePending) {
        void flushResize();
      }
      if (!disposed && latestRequest !== undefined && latestRequest.id !== attemptedRequestId) {
        void flush();
      }
    }
  };

  const flush = async (): Promise<void> => {
    const activeChart = chart;
    if (activeChart === undefined || disposed || rendering || resizing) {
      return;
    }

    rendering = true;
    try {
      while (!disposed) {
        const request = latestRequest;
        if (request === undefined || request.id === attemptedRequestId) {
          break;
        }

        let status: G2ChartRenderSettlement<Value>['status'] = 'failure';
        try {
          activeChart.options(request.spec);
          await activeChart.render();
          status = 'success';
        } catch {
          status = 'failure';
        }
        if (disposed) {
          return;
        }

        attemptedRequestId = request.id;
        const latest = latestRequest?.id === request.id;
        notifySettlement({ value: request.value, status, latest });
        if (!latest) {
          continue;
        }
        break;
      }
    } finally {
      rendering = false;
      if (!disposed && resizePending) {
        void flushResize();
      }
      if (
        !disposed &&
        chart !== undefined &&
        latestRequest !== undefined &&
        latestRequest.id !== attemptedRequestId
      ) {
        void flush();
      }
    }
  };

  const scheduleFlush = (): void => {
    const activeChart = chart;
    if (disposed || activeChart === undefined) {
      return;
    }
    cancelScheduledFlush();
    const token = scheduleToken;
    const run = (): void => {
      if (disposed || token !== scheduleToken) {
        return;
      }
      scheduledFrame = undefined;
      finishAnimations(activeChart);
      void flush();
    };
    const ownerWindow = options.container.ownerDocument.defaultView;
    if (ownerWindow !== null && typeof ownerWindow.requestAnimationFrame === 'function') {
      const id = ownerWindow.requestAnimationFrame(run);
      scheduledFrame = { ownerWindow, id };
      return;
    }
    queueMicrotask(run);
  };

  const initialize = async (): Promise<void> => {
    if (disposed || initializing || chart !== undefined) {
      return;
    }
    initializing = true;
    try {
      const Chart = await loadG2ChartConstructor();
      if (disposed) {
        return;
      }
      const created = new Chart({ container: options.container, autoFit: true });
      chart = created;
      const registered: G2ChartEventRegistration[] = [];
      activeRegistrations = registered;
      for (const registration of options.events) {
        created.on(registration.name, registration.listener);
        registered.push(registration);
      }
      const ResizeObserver = options.container.ownerDocument.defaultView?.ResizeObserver;
      if (ResizeObserver !== undefined) {
        resizeObserver = new ResizeObserver(() => {
          if (!disposed) {
            resizePending = true;
            void flushResize();
          }
        });
        resizeObserver.observe(options.container);
      }
      await flush();
    } catch {
      if (disposed) {
        return;
      }
      releaseChart();
      const request = latestRequest;
      if (request !== undefined) {
        attemptedRequestId = request.id;
        notifySettlement({ value: request.value, status: 'failure', latest: true });
      }
    } finally {
      initializing = false;
      if (
        !disposed &&
        chart === undefined &&
        latestRequest !== undefined &&
        latestRequest.id !== attemptedRequestId
      ) {
        void initialize();
      }
    }
  };

  void initialize();

  return {
    request(request): void {
      if (disposed) {
        return;
      }
      requestId += 1;
      latestRequest = { ...request, id: requestId };
      if (chart === undefined) {
        void initialize();
      } else {
        scheduleFlush();
      }
    },
    finishAnimations(): void {
      if (chart !== undefined && !disposed) {
        finishAnimations(chart);
      }
    },
    getContext(): unknown {
      if (chart === undefined || disposed) {
        return undefined;
      }
      try {
        return chart.getContext();
      } catch {
        return undefined;
      }
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      latestRequest = undefined;
      cancelScheduledFlush();
      releaseChart();
    },
  };
}
