import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createG2ChartRuntime,
  loadG2ChartConstructor,
} from '../../../src/rendering/g2/chartRuntime';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static instances: Chart[] = [];
    static renderQueue: (() => Promise<void>)[] = [];
    static onError: Error | undefined;
    static onErrorName: string | undefined;
    static offError: Error | undefined;
    static destroyError: Error | undefined;
    static contextMode: 'normal' | 'empty' | 'finish-error' | 'context-error' = 'normal';

    readonly options = vi.fn((): this => this);
    readonly render = vi.fn(
      (): Promise<void> => Chart.renderQueue.shift()?.() ?? Promise.resolve(),
    );
    readonly forceFit = vi.fn((): Promise<this> => Promise.resolve(this));
    readonly on = vi.fn((name: string): this => {
      if (
        Chart.onError !== undefined &&
        (Chart.onErrorName === undefined || name === Chart.onErrorName)
      ) {
        throw Chart.onError;
      }
      return this;
    });
    readonly off = vi.fn((): this => {
      if (Chart.offError !== undefined) {
        throw Chart.offError;
      }
      return this;
    });
    readonly finishAnimation = vi.fn((): void => {
      if (Chart.contextMode === 'finish-error') {
        throw new Error('disposed animation detail');
      }
    });
    readonly getContext = vi.fn(() => {
      if (Chart.contextMode === 'context-error') {
        throw new Error('private context detail');
      }
      return {
        ...(Chart.contextMode === 'empty'
          ? {}
          : { animations: [{ finish: this.finishAnimation }] }),
        marker: 'scene-context',
      };
    });
    readonly destroy = vi.fn((): void => {
      if (Chart.destroyError !== undefined) {
        throw Chart.destroyError;
      }
    });

    constructor(readonly config: unknown) {
      Chart.instances.push(this);
    }
  }

  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));

interface Deferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (reason?: unknown) => void;
}

function deferred(): Deferred {
  let resolve: () => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = () => resolvePromise();
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function resizeEntry(target: Element, width: number, height: number): ResizeObserverEntry {
  return {
    target,
    contentRect: { width, height },
  } as ResizeObserverEntry;
}

beforeEach(() => {
  g2Mock.Chart.instances = [];
  g2Mock.Chart.renderQueue = [];
  g2Mock.Chart.onError = undefined;
  g2Mock.Chart.onErrorName = undefined;
  g2Mock.Chart.offError = undefined;
  g2Mock.Chart.destroyError = undefined;
  g2Mock.Chart.contextMode = 'normal';
  document.body.replaceChildren();
});

describe('G2 chart runtime', () => {
  it('publishes one current structural generation across invalidation and settlement', async () => {
    const invalidated = vi.fn();
    const settled = vi.fn();
    const runtime = createG2ChartRuntime<string>({
      container: document.body,
      events: [],
      onGeometryInvalidated: invalidated,
      onRenderSettled: settled,
    });

    runtime.request({
      value: 'comparison',
      spec: { type: 'interval' },
      structuralIdentity: '["actual","budget"]',
    });

    expect(invalidated).toHaveBeenCalledWith({ generation: 1, reason: 'render' });
    expect(runtime.getGeneration()).toBe(1);
    await vi.waitFor(() =>
      expect(settled).toHaveBeenLastCalledWith({
        value: 'comparison',
        status: 'success',
        latest: true,
        generation: 1,
        origin: 'render',
        geometryAuthoritative: true,
      }),
    );
    runtime.dispose();
  });

  it('caches the dynamic constructor and skips initialization after immediate disposal', async () => {
    expect(loadG2ChartConstructor()).toBe(loadG2ChartConstructor());

    const host = document.createElement('div');
    document.body.append(host);
    const runtime = createG2ChartRuntime<string>({
      container: host,
      events: [],
      onRenderSettled: vi.fn(),
    });
    runtime.request({ value: 'disposed', spec: { type: 'interval' } });
    runtime.dispose();

    await Promise.resolve();
    await Promise.resolve();
    expect(g2Mock.Chart.instances).toHaveLength(0);
  });

  it('reports only the newest render and exposes scene context without the chart instance', async () => {
    const first = deferred();
    g2Mock.Chart.renderQueue.push(
      () => first.promise,
      () => Promise.resolve(),
    );
    const host = document.createElement('div');
    document.body.append(host);
    const settled = vi.fn();
    const runtime = createG2ChartRuntime<string>({
      container: host,
      events: [],
      onRenderSettled: settled,
    });
    runtime.request({ value: 'first', spec: { type: 'interval', data: [1] } });

    await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
    runtime.request({ value: 'latest', spec: { type: 'interval', data: [2] } });
    await vi.waitFor(() =>
      expect(g2Mock.Chart.instances[0]?.finishAnimation).toHaveBeenCalledOnce(),
    );
    first.reject(new Error('stale private failure'));

    await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledTimes(2));
    await vi.waitFor(() =>
      expect(settled).toHaveBeenLastCalledWith({
        value: 'latest',
        status: 'success',
        latest: true,
        generation: 0,
        origin: 'render',
        geometryAuthoritative: true,
      }),
    );
    expect(settled).toHaveBeenCalledWith({
      value: 'first',
      status: 'failure',
      latest: false,
      generation: 0,
      origin: 'render',
      geometryAuthoritative: false,
    });
    expect(runtime.getContext()).toEqual(expect.objectContaining({ marker: 'scene-context' }));
  });

  it('recreates structural identities and rejects stale render and resize continuations', async () => {
    const firstRender = deferred();
    g2Mock.Chart.renderQueue.push(
      () => firstRender.promise,
      () => Promise.resolve(),
    );
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ResizeObserver');
    class TestResizeObserver {
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    });

    try {
      const settled = vi.fn();
      const runtime = createG2ChartRuntime<string>({
        container: document.body,
        events: [],
        onRenderSettled: settled,
      });
      runtime.request({
        value: 'old',
        spec: { type: 'interval' },
        structuralIdentity: '["actual","budget"]',
      });
      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
      const oldChart = g2Mock.Chart.instances[0];
      if (oldChart === undefined) {
        throw new Error('Expected the old G2 chart');
      }
      runtime.request({
        value: 'new',
        spec: { type: 'interval' },
        structuralIdentity: '["budget","actual"]',
      });
      await vi.waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(2));
      expect(oldChart.destroy).toHaveBeenCalledOnce();
      firstRender.resolve();

      await vi.waitFor(() => expect(g2Mock.Chart.instances[1]?.render).toHaveBeenCalledOnce());
      await vi.waitFor(() =>
        expect(settled).toHaveBeenLastCalledWith({
          value: 'new',
          status: 'success',
          latest: true,
          generation: 2,
          origin: 'render',
          geometryAuthoritative: true,
        }),
      );
      expect(settled).not.toHaveBeenCalledWith(expect.objectContaining({ value: 'old' }));
      runtime.dispose();
    } finally {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, 'ResizeObserver');
      } else {
        Object.defineProperty(window, 'ResizeObserver', descriptor);
      }
    }
  });

  it('does not let a stale forceFit continuation schedule work on a replacement chart', async () => {
    const pendingFit = deferred();
    let resize: ResizeObserverCallback | undefined;
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ResizeObserver');
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    });
    try {
      const settled = vi.fn();
      const runtime = createG2ChartRuntime<string>({
        container: document.body,
        events: [],
        onRenderSettled: settled,
      });
      runtime.request({
        value: 'old',
        spec: { type: 'interval' },
        structuralIdentity: '["actual","budget"]',
      });
      await vi.waitFor(() =>
        expect(settled).toHaveBeenLastCalledWith({
          value: 'old',
          status: 'success',
          latest: true,
          generation: 1,
          origin: 'render',
          geometryAuthoritative: true,
        }),
      );
      const oldChart = g2Mock.Chart.instances[0];
      if (oldChart === undefined) {
        throw new Error('Expected the initial G2 chart');
      }
      oldChart.forceFit.mockImplementationOnce(() => pendingFit.promise.then(() => oldChart));
      resize?.([resizeEntry(document.body, 100, 100)], {} as ResizeObserver);
      resize?.([resizeEntry(document.body, 120, 100)], {} as ResizeObserver);
      await vi.waitFor(() => expect(oldChart.forceFit).toHaveBeenCalledOnce());

      runtime.request({
        value: 'new',
        spec: { type: 'interval' },
        structuralIdentity: '["budget","actual"]',
      });
      await vi.waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(2));
      pendingFit.resolve();
      await vi.waitFor(() =>
        expect(settled).toHaveBeenLastCalledWith({
          value: 'new',
          status: 'success',
          latest: true,
          generation: 2,
          origin: 'render',
          geometryAuthoritative: true,
        }),
      );
      expect(oldChart.forceFit).toHaveBeenCalledOnce();
      expect(g2Mock.Chart.instances[1]?.forceFit).not.toHaveBeenCalled();
      runtime.dispose();
    } finally {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, 'ResizeObserver');
      } else {
        Object.defineProperty(window, 'ResizeObserver', descriptor);
      }
    }
  });

  it('removes the exact event callbacks and destroys exactly once', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const listener = vi.fn();
    const runtime = createG2ChartRuntime<string>({
      container: host,
      events: [{ name: 'element:pointerdown', listener }],
      onRenderSettled: vi.fn(),
    });
    runtime.request({ value: 'ready', spec: { type: 'interval' } });

    await vi.waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));
    const chart = g2Mock.Chart.instances[0];
    await vi.waitFor(() => expect(chart?.on).toHaveBeenCalledWith('element:pointerdown', listener));
    runtime.dispose();
    runtime.dispose();

    expect(chart?.off).toHaveBeenCalledOnce();
    expect(chart?.off).toHaveBeenCalledWith('element:pointerdown', listener);
    expect(chart?.destroy).toHaveBeenCalledOnce();
    expect(runtime.getContext()).toBeUndefined();
  });

  it('fits after an active render when its container resizes and disconnects on disposal', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ResizeObserver');
    const pendingRender = deferred();
    g2Mock.Chart.renderQueue.push(() => pendingRender.promise);
    let resize: ResizeObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }

      readonly observe = observe;
      readonly unobserve = vi.fn();
      readonly disconnect = disconnect;
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    });

    try {
      const host = document.createElement('div');
      document.body.append(host);
      const invalidated = vi.fn();
      const settled = vi.fn();
      const runtime = createG2ChartRuntime<string>({
        container: host,
        events: [],
        onGeometryInvalidated: invalidated,
        onRenderSettled: settled,
      });
      runtime.request({ value: 'ready', spec: { type: 'interval' } });

      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
      expect(observe).toHaveBeenCalledWith(host);
      resize?.([resizeEntry(host, 100, 100)], {} as ResizeObserver);
      resize?.([resizeEntry(host, 120, 100)], {} as ResizeObserver);
      expect(g2Mock.Chart.instances[0]?.forceFit).not.toHaveBeenCalled();
      pendingRender.resolve();
      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.forceFit).toHaveBeenCalledOnce());
      await vi.waitFor(() => expect(settled).toHaveBeenCalledTimes(2));
      expect(invalidated).toHaveBeenLastCalledWith({ generation: 0, reason: 'resize' });
      expect(settled).toHaveBeenLastCalledWith({
        value: 'ready',
        status: 'success',
        latest: true,
        generation: 0,
        origin: 'resize',
        geometryAuthoritative: true,
      });
      resize?.([resizeEntry(host, 120, 100)], {} as ResizeObserver);
      await Promise.resolve();
      expect(g2Mock.Chart.instances[0]?.forceFit).toHaveBeenCalledOnce();

      runtime.dispose();
      resize?.([resizeEntry(host, 140, 100)], {} as ResizeObserver);
      await Promise.resolve();

      expect(disconnect).toHaveBeenCalledOnce();
      expect(g2Mock.Chart.instances[0]?.forceFit).toHaveBeenCalledOnce();
    } finally {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, 'ResizeObserver');
      } else {
        Object.defineProperty(window, 'ResizeObserver', descriptor);
      }
    }
  });

  it('ignores an initial ResizeObserver delivery matching the synchronously captured size', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ResizeObserver');
    let resize: ResizeObserverCallback | undefined;
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    });

    try {
      const host = document.createElement('div');
      vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 80));
      document.body.append(host);
      const invalidated = vi.fn();
      const runtime = createG2ChartRuntime<string>({
        container: host,
        events: [],
        onGeometryInvalidated: invalidated,
        onRenderSettled: vi.fn(),
      });
      runtime.request({ value: 'ready', spec: { type: 'interval' } });
      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());

      resize?.([resizeEntry(host, 100, 80)], {} as ResizeObserver);
      await Promise.resolve();

      expect(g2Mock.Chart.instances[0]?.forceFit).not.toHaveBeenCalled();
      expect(invalidated).not.toHaveBeenCalledWith(expect.objectContaining({ reason: 'resize' }));
      runtime.dispose();
    } finally {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, 'ResizeObserver');
      } else {
        Object.defineProperty(window, 'ResizeObserver', descriptor);
      }
    }
  });

  it('invalidates when size changes before the first ResizeObserver delivery', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ResizeObserver');
    let resize: ResizeObserverCallback | undefined;
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    });

    try {
      const host = document.createElement('div');
      vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 80));
      document.body.append(host);
      const invalidated = vi.fn();
      const settled = vi.fn();
      const runtime = createG2ChartRuntime<string>({
        container: host,
        events: [],
        onGeometryInvalidated: invalidated,
        onRenderSettled: settled,
      });
      runtime.request({ value: 'ready', spec: { type: 'interval' } });
      await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());

      resize?.([resizeEntry(host, 120, 80)], {} as ResizeObserver);

      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.forceFit).toHaveBeenCalledOnce());
      expect(invalidated).toHaveBeenLastCalledWith({ generation: 0, reason: 'resize' });
      await vi.waitFor(() =>
        expect(settled).toHaveBeenLastCalledWith({
          value: 'ready',
          status: 'success',
          latest: true,
          generation: 0,
          origin: 'resize',
          geometryAuthoritative: true,
        }),
      );
      runtime.dispose();
    } finally {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, 'ResizeObserver');
      } else {
        Object.defineProperty(window, 'ResizeObserver', descriptor);
      }
    }
  });

  it('keeps render geometry non-authoritative until a resize queued during render settles', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ResizeObserver');
    const pendingRender = deferred();
    const pendingFit = deferred();
    g2Mock.Chart.renderQueue.push(() => pendingRender.promise);
    let resize: ResizeObserverCallback | undefined;
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    });

    try {
      const settled = vi.fn();
      const runtime = createG2ChartRuntime<string>({
        container: document.body,
        events: [],
        onRenderSettled: settled,
      });
      runtime.request({ value: 'comparison', spec: { type: 'interval' } });
      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
      const chart = g2Mock.Chart.instances[0];
      expect(chart).toBeDefined();
      if (chart === undefined) {
        return;
      }
      chart.forceFit.mockImplementationOnce(() => pendingFit.promise.then(() => chart));
      resize?.([resizeEntry(document.body, 100, 100)], {} as ResizeObserver);
      resize?.([resizeEntry(document.body, 120, 100)], {} as ResizeObserver);
      pendingRender.resolve();

      await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
      expect(settled).toHaveBeenLastCalledWith({
        value: 'comparison',
        status: 'success',
        latest: true,
        generation: 0,
        origin: 'render',
        geometryAuthoritative: false,
      });
      expect(settled).not.toHaveBeenCalledWith(
        expect.objectContaining({ geometryAuthoritative: true }),
      );
      await vi.waitFor(() => expect(chart.forceFit).toHaveBeenCalledOnce());

      pendingFit.resolve();
      await vi.waitFor(() =>
        expect(settled).toHaveBeenLastCalledWith({
          value: 'comparison',
          status: 'success',
          latest: true,
          generation: 0,
          origin: 'resize',
          geometryAuthoritative: true,
        }),
      );
      runtime.dispose();
    } finally {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, 'ResizeObserver');
      } else {
        Object.defineProperty(window, 'ResizeObserver', descriptor);
      }
    }
  });

  it('reports a failed forceFit as non-authoritative geometry without a render failure', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ResizeObserver');
    let resize: ResizeObserverCallback | undefined;
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    });
    const containerBounds = vi
      .spyOn(document.body, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 100, 100));

    try {
      const settled = vi.fn();
      const runtime = createG2ChartRuntime<string>({
        container: document.body,
        events: [],
        onRenderSettled: settled,
      });
      runtime.request({ value: 'ready', spec: { type: 'interval' } });
      await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
      const chart = g2Mock.Chart.instances[0];
      expect(chart).toBeDefined();
      if (chart === undefined) {
        return;
      }
      chart.forceFit.mockRejectedValueOnce(new Error('private fit failure'));
      resize?.([resizeEntry(document.body, 100, 100)], {} as ResizeObserver);
      resize?.([resizeEntry(document.body, 120, 100)], {} as ResizeObserver);

      await vi.waitFor(() => expect(settled).toHaveBeenCalledTimes(2));
      expect(settled).toHaveBeenLastCalledWith({
        value: 'ready',
        status: 'success',
        latest: true,
        generation: 0,
        origin: 'resize',
        geometryAuthoritative: false,
      });
      runtime.dispose();
    } finally {
      containerBounds.mockRestore();
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, 'ResizeObserver');
      } else {
        Object.defineProperty(window, 'ResizeObserver', descriptor);
      }
    }
  });

  it('hides current private G2 Tooltip DOM and permits a later renderer show', async () => {
    const host = document.createElement('div');
    const tooltip = document.createElement('div');
    tooltip.className = 'g2-tooltip';
    tooltip.style.visibility = 'visible';
    host.append(tooltip);
    document.body.append(host);
    const runtime = createG2ChartRuntime<string>({
      container: host,
      events: [],
      onRenderSettled: vi.fn(),
    });

    runtime.dismissTooltip();
    expect(tooltip.style.visibility).toBe('hidden');
    tooltip.style.visibility = 'visible';
    expect(tooltip.style.visibility).toBe('visible');

    runtime.dispose();
    expect(tooltip.style.visibility).toBe('hidden');
  });

  it('isolates a throwing settlement callback and still processes the next request', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const callbackFailure = vi.fn();
    const runtime = createG2ChartRuntime<string>({
      container: host,
      events: [],
      onRenderSettled: () => {
        throw new Error('host callback detail');
      },
      onCallbackError: callbackFailure,
    });
    runtime.request({ value: 'first', spec: { type: 'interval', data: [1] } });

    await vi.waitFor(() => expect(callbackFailure).toHaveBeenCalledOnce());
    runtime.request({ value: 'second', spec: { type: 'interval', data: [2] } });
    await vi.waitFor(() => expect(callbackFailure).toHaveBeenCalledTimes(2));
    expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledTimes(2);
  });

  it('contains initialization and cleanup failures with stable callbacks', async () => {
    const initializationSettled = vi.fn();
    g2Mock.Chart.onError = new Error('private event registration failure');
    const failedRuntime = createG2ChartRuntime<string>({
      container: document.body,
      events: [{ name: 'plot:pointerdown', listener: vi.fn() }],
      onRenderSettled: initializationSettled,
    });
    failedRuntime.request({ value: 'initialization', spec: { type: 'interval' } });

    await vi.waitFor(() =>
      expect(initializationSettled).toHaveBeenCalledWith({
        value: 'initialization',
        status: 'failure',
        latest: true,
        generation: 0,
        origin: 'render',
        geometryAuthoritative: false,
      }),
    );
    expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(failedRuntime.getContext()).toBeUndefined();

    g2Mock.Chart.onError = undefined;
    const cleanupFailure = vi.fn(() => {
      throw new Error('cleanup reporting failure');
    });
    const runtime = createG2ChartRuntime<string>({
      container: document.body,
      events: [{ name: 'plot:pointerdown', listener: vi.fn() }],
      onRenderSettled: vi.fn(),
      onCleanupError: cleanupFailure,
    });
    runtime.request({ value: 'cleanup', spec: { type: 'interval' } });
    await vi.waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(2));
    g2Mock.Chart.offError = new Error('private off failure');
    g2Mock.Chart.destroyError = new Error('private destroy failure');

    expect(() => runtime.dispose()).not.toThrow();
    expect(cleanupFailure).toHaveBeenCalledOnce();
    expect(g2Mock.Chart.instances[1]?.off).toHaveBeenCalledOnce();
    expect(g2Mock.Chart.instances[1]?.destroy).toHaveBeenCalledOnce();
  });

  it('cleans up an initialization failure that has no pending request', async () => {
    g2Mock.Chart.onError = new Error('private event registration failure');
    const settled = vi.fn();
    createG2ChartRuntime<string>({
      container: document.body,
      events: [{ name: 'plot:pointerdown', listener: vi.fn() }],
      onRenderSettled: settled,
    });

    await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce());
    expect(settled).not.toHaveBeenCalled();
  });

  it('reinitializes after a failed constructor boundary when a new request arrives', async () => {
    const settled = vi.fn();
    g2Mock.Chart.onError = new Error('private event registration failure');
    const runtime = createG2ChartRuntime<string>({
      container: document.body,
      events: [{ name: 'plot:pointerdown', listener: vi.fn() }],
      onRenderSettled: settled,
    });
    runtime.request({ value: 'failed', spec: { type: 'interval' } });
    await vi.waitFor(() =>
      expect(settled).toHaveBeenCalledWith({
        value: 'failed',
        status: 'failure',
        latest: true,
        generation: 0,
        origin: 'render',
        geometryAuthoritative: false,
      }),
    );

    g2Mock.Chart.onError = undefined;
    runtime.request({ value: 'retry', spec: { type: 'interval' } });

    await vi.waitFor(() =>
      expect(settled).toHaveBeenLastCalledWith({
        value: 'retry',
        status: 'success',
        latest: true,
        generation: 0,
        origin: 'render',
        geometryAuthoritative: true,
      }),
    );
    expect(g2Mock.Chart.instances).toHaveLength(2);
    runtime.dispose();
  });

  it('reinitializes when an initialization failure callback synchronously queues a newer request', async () => {
    const settled = vi.fn();
    g2Mock.Chart.onError = new Error('private event registration failure');
    const runtime = createG2ChartRuntime<string>({
      container: document.body,
      events: [{ name: 'plot:pointerdown', listener: vi.fn() }],
      onRenderSettled: settlement => {
        settled(settlement);
        if (settlement.value === 'failed') {
          g2Mock.Chart.onError = undefined;
          runtime.request({ value: 'retry', spec: { type: 'interval' } });
        }
      },
    });
    runtime.request({ value: 'failed', spec: { type: 'interval' } });

    await vi.waitFor(() =>
      expect(settled).toHaveBeenLastCalledWith({
        value: 'retry',
        status: 'success',
        latest: true,
        generation: 0,
        origin: 'render',
        geometryAuthoritative: true,
      }),
    );
    expect(g2Mock.Chart.instances).toHaveLength(2);
    expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(g2Mock.Chart.instances[1]?.render).toHaveBeenCalledOnce();
    runtime.dispose();
  });

  it('unregisters events that succeeded before a later registration failure', async () => {
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    g2Mock.Chart.onError = new Error('private second registration failure');
    g2Mock.Chart.onErrorName = 'plot:pointermove';
    createG2ChartRuntime<string>({
      container: document.body,
      events: [
        { name: 'plot:pointerdown', listener: firstListener },
        { name: 'plot:pointermove', listener: secondListener },
      ],
      onRenderSettled: vi.fn(),
    });

    await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce());
    expect(g2Mock.Chart.instances[0]?.off).toHaveBeenCalledOnce();
    expect(g2Mock.Chart.instances[0]?.off).toHaveBeenCalledWith('plot:pointerdown', firstListener);
  });

  it('contains animation and context edge cases without blocking later cleanup', async () => {
    const runtime = createG2ChartRuntime<string>({
      container: document.body,
      events: [],
      onRenderSettled: vi.fn(),
    });
    runtime.request({ value: 'context', spec: { type: 'interval' } });
    await vi.waitFor(() => expect(g2Mock.Chart.instances).toHaveLength(1));

    g2Mock.Chart.contextMode = 'empty';
    expect(() => runtime.finishAnimations()).not.toThrow();
    g2Mock.Chart.contextMode = 'finish-error';
    expect(() => runtime.finishAnimations()).not.toThrow();
    g2Mock.Chart.contextMode = 'context-error';
    expect(() => runtime.finishAnimations()).not.toThrow();
    expect(runtime.getContext()).toBeUndefined();

    runtime.dispose();
    runtime.request({ value: 'ignored', spec: { type: 'interval' } });
    expect(() => runtime.finishAnimations()).not.toThrow();
  });

  it('flushes a request queued by the settlement callback', async () => {
    const settled = vi.fn();
    const runtime = createG2ChartRuntime<string>({
      container: document.body,
      events: [],
      onRenderSettled: settlement => {
        settled(settlement);
        if (settlement.value === 'first') {
          runtime?.request({ value: 'second', spec: { type: 'interval', data: [2] } });
        }
      },
    });
    runtime.request({ value: 'first', spec: { type: 'interval', data: [1] } });

    await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledTimes(2));
    expect(settled).toHaveBeenLastCalledWith({
      value: 'second',
      status: 'success',
      latest: true,
      generation: 0,
      origin: 'render',
      geometryAuthoritative: true,
    });
  });

  it('uses a microtask scheduler when requestAnimationFrame is unavailable', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'requestAnimationFrame');
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: undefined,
    });
    try {
      const runtime = createG2ChartRuntime<string>({
        container: document.body,
        events: [],
        onRenderSettled: vi.fn(),
      });
      runtime.request({ value: 'first', spec: { type: 'interval', data: [1] } });
      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
      runtime.request({ value: 'second', spec: { type: 'interval', data: [2] } });
      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledTimes(2));
    } finally {
      if (descriptor === undefined) {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      } else {
        Object.defineProperty(window, 'requestAnimationFrame', descriptor);
      }
    }
  });

  it('cancels superseded animation frames and ignores callbacks after disposal', async () => {
    const requestDescriptor = Object.getOwnPropertyDescriptor(window, 'requestAnimationFrame');
    const cancelDescriptor = Object.getOwnPropertyDescriptor(window, 'cancelAnimationFrame');
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextFrameId = 0;
    const cancelAnimationFrame = vi.fn();
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback): number => {
        nextFrameId += 1;
        callbacks.set(nextFrameId, callback);
        return nextFrameId;
      },
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
    });

    try {
      const settled = vi.fn();
      const runtime = createG2ChartRuntime<string>({
        container: document.body,
        events: [],
        onRenderSettled: settled,
      });
      runtime.request({ value: 'first', spec: { type: 'interval', data: [1] } });
      await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());

      runtime.request({ value: 'superseded', spec: { type: 'interval', data: [2] } });
      runtime.request({ value: 'latest', spec: { type: 'interval', data: [3] } });
      expect(cancelAnimationFrame).toHaveBeenCalledWith(1);

      callbacks.get(1)?.(0);
      expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce();
      callbacks.get(2)?.(0);
      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledTimes(2));
      expect(settled).toHaveBeenLastCalledWith({
        value: 'latest',
        status: 'success',
        latest: true,
        generation: 0,
        origin: 'render',
        geometryAuthoritative: true,
      });

      runtime.request({ value: 'disposed', spec: { type: 'interval', data: [4] } });
      runtime.dispose();
      expect(cancelAnimationFrame).toHaveBeenCalledWith(3);
      callbacks.get(3)?.(0);
      expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledTimes(2);
    } finally {
      if (requestDescriptor === undefined) {
        Reflect.deleteProperty(window, 'requestAnimationFrame');
      } else {
        Object.defineProperty(window, 'requestAnimationFrame', requestDescriptor);
      }
      if (cancelDescriptor === undefined) {
        Reflect.deleteProperty(window, 'cancelAnimationFrame');
      } else {
        Object.defineProperty(window, 'cancelAnimationFrame', cancelDescriptor);
      }
    }
  });

  it('suppresses a render settlement when disposed during an active render', async () => {
    const pendingRender = deferred();
    g2Mock.Chart.renderQueue.push(() => pendingRender.promise);
    const settled = vi.fn();
    const runtime = createG2ChartRuntime<string>({
      container: document.body,
      events: [],
      onRenderSettled: settled,
    });
    runtime.request({ value: 'pending', spec: { type: 'interval' } });
    await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());

    runtime.dispose();
    pendingRender.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(settled).not.toHaveBeenCalled();
    expect(g2Mock.Chart.instances[0]?.destroy).toHaveBeenCalledOnce();
  });
});
