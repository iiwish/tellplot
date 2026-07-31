import { afterEach, describe, expect, it, vi } from 'vitest';

import { editorLayoutMode, observeEditorLayout } from '../../src/editor/layout';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('editor container layout', () => {
  it.each([
    [0, 'narrow'],
    [899.99, 'narrow'],
    [900, 'compact'],
    [1179.99, 'compact'],
    [1180, 'wide'],
  ] as const)('maps %s px to %s', (width, mode) => {
    expect(editorLayoutMode(width)).toBe(mode);
  });

  it('observes the host border box, deduplicates modes, and disconnects', () => {
    let callback: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    class TestResizeObserver {
      constructor(next: ResizeObserverCallback) {
        callback = next;
      }
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    const root = document.createElement('div');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 500,
      bottom: 400,
      left: 0,
      width: 500,
      height: 400,
      toJSON: () => ({}),
    });
    const onChange = vi.fn();

    const observer = observeEditorLayout(root, onChange);

    expect(observe).toHaveBeenCalledWith(root, { box: 'border-box' });
    expect(onChange).toHaveBeenLastCalledWith('narrow');
    callback?.(
      [
        {
          target: root,
          contentRect: root.getBoundingClientRect(),
          borderBoxSize: [{ blockSize: 400, inlineSize: 900 }],
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );
    callback?.(
      [
        {
          target: root,
          contentRect: root.getBoundingClientRect(),
          borderBoxSize: [{ blockSize: 400, inlineSize: 901 }],
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );
    callback?.(
      [
        {
          target: root,
          contentRect: root.getBoundingClientRect(),
          borderBoxSize: [{ blockSize: 400, inlineSize: 1200 }],
        } as unknown as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    );

    expect(onChange.mock.calls.map(([mode]) => mode)).toEqual(['narrow', 'compact', 'wide']);
    observer.disconnect();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
