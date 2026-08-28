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
  readonly structuralIdentity?: string | undefined;
  readonly invalidateGeometry?: boolean | undefined;
}

export interface G2ChartRenderSettlement<Value> {
  readonly value: Value;
  readonly status: 'success' | 'failure';
  readonly latest: boolean;
  readonly generation: number;
  readonly origin: 'render' | 'resize';
  readonly geometryAuthoritative: boolean;
}

export interface G2ChartGeometryInvalidation {
  readonly generation: number;
  readonly reason: 'render' | 'resize' | 'dispose';
}

export interface G2ChartRuntimeOptions<Value> {
  readonly container: HTMLElement;
  readonly events: readonly G2ChartEventRegistration[];
  readonly onRenderSettled: (settlement: G2ChartRenderSettlement<Value>) => void;
  readonly onGeometryInvalidated?:
    ((invalidation: G2ChartGeometryInvalidation) => void) | undefined;
  readonly onCallbackError?: (() => void) | undefined;
  readonly onCleanupError?: (() => void) | undefined;
}

export interface G2ChartRuntime<Value> {
  request(request: G2ChartRenderRequest<Value>): void;
  dismissTooltip(): void;
  finishAnimations(): void;
  getContext(): unknown;
  getGeneration(): number;
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

function dismissTooltip(container: HTMLElement): void {
  try {
    for (const tooltip of container.querySelectorAll<HTMLElement>('.g2-tooltip')) {
      tooltip.style.visibility = 'hidden';
    }
  } catch {
    // Tooltip cleanup is best effort and must not interrupt renderer progress.
  }
}

/** Owns the shared G2 constructor, render queue, event and teardown lifecycle. */
export function createG2ChartRuntime<Value>(
  options: G2ChartRuntimeOptions<Value>,
): G2ChartRuntime<Value> {
  let chart: G2Chart | undefined;
  let disposed = false;
  let generation = 0;
  let structuralIdentity: string | undefined;
  let initializingGeneration: number | undefined;
  let renderingGeneration: number | undefined;
  let resizingGeneration: number | undefined;
  let requestId = 0;
  let attemptedRequestId = 0;
  let successfullyRenderedRequestId = 0;
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
  let observedSize: { readonly width: number; readonly height: number } | undefined;

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

  const notifyGeometryInvalidated = (reason: G2ChartGeometryInvalidation['reason']): void => {
    dismissTooltip(options.container);
    try {
      options.onGeometryInvalidated?.({ generation, reason });
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
    observedSize = undefined;
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
    const activeGeneration = generation;
    if (
      activeChart === undefined ||
      disposed ||
      renderingGeneration === activeGeneration ||
      resizingGeneration === activeGeneration ||
      !resizePending
    ) {
      return;
    }
    resizePending = false;
    resizingGeneration = activeGeneration;
    let geometryAuthoritative = false;
    try {
      await activeChart.forceFit();
      geometryAuthoritative = true;
    } catch {
      geometryAuthoritative = false;
    } finally {
      if (resizingGeneration === activeGeneration) {
        resizingGeneration = undefined;
      }
      const settledRequest =
        latestRequest?.id === attemptedRequestId &&
        successfullyRenderedRequestId === attemptedRequestId
          ? latestRequest
          : undefined;
      if (
        !disposed &&
        generation === activeGeneration &&
        chart === activeChart &&
        settledRequest !== undefined
      ) {
        notifySettlement({
          value: settledRequest.value,
          status: 'success',
          latest: true,
          generation: activeGeneration,
          origin: 'resize',
          geometryAuthoritative: geometryAuthoritative && !resizePending,
        });
      }
      if (!disposed && generation === activeGeneration && chart === activeChart && resizePending) {
        void flushResize();
      }
      if (
        !disposed &&
        generation === activeGeneration &&
        chart === activeChart &&
        latestRequest !== undefined &&
        latestRequest.id !== attemptedRequestId
      ) {
        void flush();
      }
    }
  };

  const flush = async (): Promise<void> => {
    const activeChart = chart;
    const activeGeneration = generation;
    if (
      activeChart === undefined ||
      disposed ||
      renderingGeneration === activeGeneration ||
      resizingGeneration === activeGeneration
    ) {
      return;
    }

    renderingGeneration = activeGeneration;
    try {
      while (!disposed && generation === activeGeneration && chart === activeChart) {
        const request = latestRequest;
        if (request === undefined || request.id === attemptedRequestId) {
          break;
        }

        let status: G2ChartRenderSettlement<Value>['status'] = 'failure';
        try {
          activeChart.options(request.spec);
          await activeChart.render();
          status = 'success';
          successfullyRenderedRequestId = request.id;
        } catch {
          status = 'failure';
        }
        if (disposed || generation !== activeGeneration || chart !== activeChart) {
          return;
        }

        attemptedRequestId = request.id;
        const latest = latestRequest?.id === request.id;
        notifySettlement({
          value: request.value,
          status,
          latest,
          generation: activeGeneration,
          origin: 'render',
          geometryAuthoritative: status === 'success' && !resizePending,
        });
        if (!latest) {
          continue;
        }
        break;
      }
    } finally {
      if (renderingGeneration === activeGeneration) {
        renderingGeneration = undefined;
      }
      if (!disposed && generation === activeGeneration && chart === activeChart && resizePending) {
        void flushResize();
      }
      if (
        !disposed &&
        generation === activeGeneration &&
        chart === activeChart &&
        latestRequest !== undefined &&
        latestRequest.id !== attemptedRequestId
      ) {
        void flush();
      }
    }
  };

  const scheduleFlush = (): void => {
    const activeChart = chart;
    const activeGeneration = generation;
    if (disposed || activeChart === undefined) {
      return;
    }
    cancelScheduledFlush();
    const token = scheduleToken;
    const run = (): void => {
      if (
        disposed ||
        token !== scheduleToken ||
        generation !== activeGeneration ||
        chart !== activeChart
      ) {
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
    const activeGeneration = generation;
    if (disposed || initializingGeneration === activeGeneration || chart !== undefined) {
      return;
    }
    initializingGeneration = activeGeneration;
    try {
      const Chart = await loadG2ChartConstructor();
      if (disposed || generation !== activeGeneration || chart !== undefined) {
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
        try {
          const bounds = options.container.getBoundingClientRect();
          if (Number.isFinite(bounds.width) && Number.isFinite(bounds.height)) {
            observedSize = { width: bounds.width, height: bounds.height };
          }
        } catch {
          observedSize = undefined;
        }
        resizeObserver = new ResizeObserver(entries => {
          if (!disposed && generation === activeGeneration && chart === created) {
            const entry = entries.find(candidate => candidate.target === options.container);
            const bounds = entry?.contentRect ?? options.container.getBoundingClientRect();
            const nextSize = { width: bounds.width, height: bounds.height };
            if (!Number.isFinite(nextSize.width) || !Number.isFinite(nextSize.height)) {
              return;
            }
            if (observedSize === undefined) {
              observedSize = nextSize;
              return;
            }
            if (observedSize.width === nextSize.width && observedSize.height === nextSize.height) {
              return;
            }
            observedSize = nextSize;
            notifyGeometryInvalidated('resize');
            resizePending = true;
            void flushResize();
          }
        });
        resizeObserver.observe(options.container);
      }
      await flush();
    } catch {
      if (disposed || generation !== activeGeneration) {
        return;
      }
      releaseChart();
      const request = latestRequest;
      if (request !== undefined) {
        attemptedRequestId = request.id;
        notifySettlement({
          value: request.value,
          status: 'failure',
          latest: true,
          generation: activeGeneration,
          origin: 'render',
          geometryAuthoritative: false,
        });
      }
    } finally {
      if (initializingGeneration === activeGeneration) {
        initializingGeneration = undefined;
      }
      if (
        !disposed &&
        generation === activeGeneration &&
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
      if (request.structuralIdentity !== structuralIdentity) {
        structuralIdentity = request.structuralIdentity;
        generation += 1;
        cancelScheduledFlush();
        releaseChart();
      }
      if (request.invalidateGeometry !== false) {
        notifyGeometryInvalidated('render');
      }
      requestId += 1;
      latestRequest = { ...request, id: requestId };
      if (chart === undefined) {
        void initialize();
      } else {
        scheduleFlush();
      }
    },
    dismissTooltip(): void {
      dismissTooltip(options.container);
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
    getGeneration(): number {
      return generation;
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      generation += 1;
      dismissTooltip(options.container);
      notifyGeometryInvalidated('dispose');
      latestRequest = undefined;
      cancelScheduledFlush();
      releaseChart();
    },
  };
}
