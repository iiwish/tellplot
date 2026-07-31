export type EditorLayoutMode = 'narrow' | 'compact' | 'wide';

export interface EditorLayoutObserver {
  disconnect(): void;
}

const MIN_COMPACT_WIDTH = 900;
const MIN_WIDE_WIDTH = 1180;

export function editorLayoutMode(width: number): EditorLayoutMode {
  if (!Number.isFinite(width) || width < MIN_COMPACT_WIDTH) {
    return 'narrow';
  }
  return width < MIN_WIDE_WIDTH ? 'compact' : 'wide';
}

function borderBoxWidth(entry: ResizeObserverEntry): number {
  const size = Array.isArray(entry.borderBoxSize)
    ? entry.borderBoxSize[0]
    : (entry.borderBoxSize as unknown as ResizeObserverSize | undefined);
  return size?.inlineSize ?? entry.contentRect.width;
}

/** Observes the editor itself so embedded layouts do not depend on the browser viewport. */
export function observeEditorLayout(
  root: HTMLElement,
  onChange: (mode: EditorLayoutMode) => void,
): EditorLayoutObserver {
  let disconnected = false;
  let current: EditorLayoutMode | undefined;
  const publish = (width: number): void => {
    if (disconnected) {
      return;
    }
    const next = editorLayoutMode(width);
    if (next !== current) {
      current = next;
      onChange(next);
    }
  };

  publish(root.getBoundingClientRect().width);
  const ResizeObserver = root.ownerDocument.defaultView?.ResizeObserver;
  if (ResizeObserver === undefined) {
    return {
      disconnect(): void {
        disconnected = true;
      },
    };
  }

  const observer = new ResizeObserver(entries => {
    const entry = entries.find(candidate => candidate.target === root);
    if (entry !== undefined) {
      publish(borderBoxWidth(entry));
    }
  });
  try {
    observer.observe(root, { box: 'border-box' });
  } catch {
    observer.observe(root);
  }

  return {
    disconnect(): void {
      if (!disconnected) {
        disconnected = true;
        observer.disconnect();
      }
    },
  };
}
