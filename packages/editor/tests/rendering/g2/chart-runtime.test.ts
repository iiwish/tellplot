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
      }),
    );
    expect(settled).toHaveBeenCalledWith({
      value: 'first',
      status: 'failure',
      latest: false,
    });
    expect(runtime.getContext()).toEqual(expect.objectContaining({ marker: 'scene-context' }));
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
      const runtime = createG2ChartRuntime<string>({
        container: host,
        events: [],
        onRenderSettled: vi.fn(),
      });
      runtime.request({ value: 'ready', spec: { type: 'interval' } });

      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.render).toHaveBeenCalledOnce());
      expect(observe).toHaveBeenCalledWith(host);
      resize?.([], {} as ResizeObserver);
      expect(g2Mock.Chart.instances[0]?.forceFit).not.toHaveBeenCalled();
      pendingRender.resolve();
      await vi.waitFor(() => expect(g2Mock.Chart.instances[0]?.forceFit).toHaveBeenCalledOnce());

      runtime.dispose();
      resize?.([], {} as ResizeObserver);
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
      }),
    );

    g2Mock.Chart.onError = undefined;
    runtime.request({ value: 'retry', spec: { type: 'interval' } });

    await vi.waitFor(() =>
      expect(settled).toHaveBeenLastCalledWith({
        value: 'retry',
        status: 'success',
        latest: true,
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
