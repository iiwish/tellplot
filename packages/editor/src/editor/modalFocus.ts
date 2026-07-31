const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

interface ActiveModal {
  dialog: HTMLElement;
  boundary: HTMLElement;
  onEscape: () => void;
  active: boolean;
}

export interface ModalFocusTrap {
  update(dialog: HTMLElement, onEscape: () => void, boundary?: HTMLElement): void;
  isTop(): boolean;
  focusInitial(preferred?: HTMLElement | null): void;
  deactivate(): void;
}

const stacks = new WeakMap<Document, ActiveModal[]>();
const cleanups = new WeakMap<Document, () => void>();

function focusable(dialog: HTMLElement): readonly HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
}

function focusFirst(dialog: HTMLElement, preferred?: HTMLElement | null): void {
  const target =
    preferred?.isConnected === true && (preferred === dialog || dialog.contains(preferred))
      ? preferred
      : (focusable(dialog)[0] ?? dialog);
  target.focus();
}

function assertOwnedBy(document: Document, dialog: HTMLElement, boundary: HTMLElement): void {
  if (
    dialog.ownerDocument !== document ||
    boundary.ownerDocument !== document ||
    (boundary !== dialog && !boundary.contains(dialog))
  ) {
    throw new TypeError('Modal dialog must belong to the supplied document.');
  }
}

function setModalState(modal: ActiveModal, top: boolean): void {
  if (top) {
    modal.boundary.removeAttribute('inert');
    modal.boundary.removeAttribute('aria-hidden');
    modal.dialog.setAttribute('aria-modal', 'true');
    return;
  }
  modal.boundary.setAttribute('inert', '');
  modal.boundary.setAttribute('aria-hidden', 'true');
  modal.dialog.removeAttribute('aria-modal');
}

function syncModalStates(stack: readonly ActiveModal[]): void {
  const top = stack.at(-1);
  for (const modal of stack) {
    setModalState(modal, modal === top);
  }
}

function uninstallIfEmpty(document: Document, stack: ActiveModal[]): void {
  if (stack.length !== 0) {
    return;
  }
  stacks.delete(document);
  cleanups.get(document)?.();
  cleanups.delete(document);
}

function pruneDisconnected(document: Document): ActiveModal[] | undefined {
  const stack = stacks.get(document);
  if (stack === undefined) {
    return undefined;
  }
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const modal = stack[index];
    if (modal !== undefined && !modal.dialog.isConnected) {
      modal.active = false;
      stack.splice(index, 1);
    }
  }
  syncModalStates(stack);
  uninstallIfEmpty(document, stack);
  return stack.length === 0 ? undefined : stack;
}

function activeModal(document: Document): ActiveModal | undefined {
  return pruneDisconnected(document)?.at(-1);
}

function isNodeForDocument(document: Document, target: EventTarget | null): target is Node {
  if (target === document) {
    return true;
  }
  const ownerNode = document.defaultView?.Node;
  if (ownerNode !== undefined && target instanceof ownerNode) {
    return true;
  }
  if (typeof target !== 'object' || target === null) {
    return false;
  }
  const candidate = target as { readonly nodeType?: unknown; readonly ownerDocument?: unknown };
  return typeof candidate.nodeType === 'number' && candidate.ownerDocument === document;
}

function install(document: Document): void {
  if (cleanups.has(document)) {
    return;
  }
  const handleKeyDown = (event: KeyboardEvent): void => {
    const modal = activeModal(document);
    if (modal === undefined) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      modal.onEscape();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const candidates = focusable(modal.dialog);
    const first = candidates[0];
    const last = candidates.at(-1);
    if (first === undefined || last === undefined) {
      event.preventDefault();
      modal.dialog.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const handleFocusIn = (event: FocusEvent): void => {
    const modal = activeModal(document);
    if (
      modal !== undefined &&
      isNodeForDocument(document, event.target) &&
      !modal.dialog.contains(event.target)
    ) {
      focusFirst(modal.dialog);
    }
  };
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('focusin', handleFocusIn, true);
  cleanups.set(document, () => {
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('focusin', handleFocusIn, true);
  });
}

/** Activates the top-most modal across all TellPlot instances in one document. */
export function activateModalFocus(
  document: Document,
  dialog: HTMLElement,
  onEscape: () => void,
  boundary: HTMLElement = dialog,
): ModalFocusTrap {
  assertOwnedBy(document, dialog, boundary);
  const modal: ActiveModal = { dialog, boundary, onEscape, active: true };
  const stack = pruneDisconnected(document) ?? [];
  stack.push(modal);
  stacks.set(document, stack);
  syncModalStates(stack);
  install(document);

  return {
    update(
      nextDialog: HTMLElement,
      nextOnEscape: () => void,
      nextBoundary: HTMLElement = nextDialog,
    ): void {
      if (!modal.active) {
        return;
      }
      assertOwnedBy(document, nextDialog, nextBoundary);
      if (modal.boundary !== nextBoundary) {
        setModalState(modal, false);
      }
      modal.dialog = nextDialog;
      modal.boundary = nextBoundary;
      modal.onEscape = nextOnEscape;
      const current = stacks.get(document);
      if (current !== undefined) {
        syncModalStates(current);
      }
    },
    isTop(): boolean {
      return modal.active && activeModal(document) === modal;
    },
    focusInitial(preferred?: HTMLElement | null): void {
      if (modal.active && activeModal(document) === modal) {
        focusFirst(modal.dialog, preferred);
      }
    },
    deactivate(): void {
      if (!modal.active) {
        return;
      }
      const current = stacks.get(document);
      const wasTop = current?.at(-1) === modal;
      modal.active = false;
      setModalState(modal, false);
      if (current === undefined) {
        return;
      }
      const index = current.lastIndexOf(modal);
      if (index >= 0) {
        current.splice(index, 1);
      }
      syncModalStates(current);
      uninstallIfEmpty(document, current);
      if (wasTop) {
        queueMicrotask(() => {
          const next = activeModal(document);
          if (next !== undefined) {
            focusFirst(next.dialog);
          }
        });
      }
    },
  };
}
