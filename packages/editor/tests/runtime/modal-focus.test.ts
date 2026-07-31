import { afterEach, describe, expect, it, vi } from 'vitest';

import { activateModalFocus, type ModalFocusTrap } from '../../src/editor/modalFocus';

const activeTraps: ModalFocusTrap[] = [];

function createDialog(
  ownerDocument: Document,
  label: string,
): {
  readonly dialog: HTMLDivElement;
  readonly first: HTMLButtonElement;
  readonly last: HTMLButtonElement;
} {
  const dialog = ownerDocument.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.tabIndex = -1;
  const first = ownerDocument.createElement('button');
  first.textContent = `${label} first`;
  const last = ownerDocument.createElement('button');
  last.textContent = `${label} last`;
  dialog.append(first, last);
  ownerDocument.body.append(dialog);
  return { dialog, first, last };
}

function activate(
  ownerDocument: Document,
  dialog: HTMLElement,
  onEscape: () => void,
): ModalFocusTrap {
  const trap = activateModalFocus(ownerDocument, dialog, onEscape);
  activeTraps.push(trap);
  return trap;
}

function pressEscape(ownerDocument: Document): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Escape',
  });
  ownerDocument.dispatchEvent(event);
  return event;
}

afterEach(() => {
  for (const trap of activeTraps.splice(0)) {
    trap.deactivate();
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('modal focus stack', () => {
  it('updates a stable token without moving a lower modal above the current top', () => {
    const originalA = createDialog(document, 'A');
    const modalB = createDialog(document, 'B');
    const closeA = vi.fn();
    const updatedCloseA = vi.fn();
    const closeB = vi.fn();
    const trapA = activate(document, originalA.dialog, closeA);
    const trapB = activate(document, modalB.dialog, closeB);
    const updatedA = createDialog(document, 'A updated');

    originalA.dialog.replaceWith(updatedA.dialog);
    trapA.update(updatedA.dialog, updatedCloseA);
    trapA.focusInitial(updatedA.last);

    expect(trapA.isTop()).toBe(false);
    expect(trapB.isTop()).toBe(true);
    expect(updatedA.dialog.hasAttribute('inert')).toBe(true);
    expect(updatedA.dialog.getAttribute('aria-hidden')).toBe('true');
    expect(updatedA.dialog.hasAttribute('aria-modal')).toBe(false);
    expect(modalB.dialog.hasAttribute('inert')).toBe(false);
    expect(modalB.dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).not.toBe(updatedA.last);

    const event = pressEscape(document);

    expect(event.defaultPrevented).toBe(true);
    expect(closeB).toHaveBeenCalledOnce();
    expect(closeA).not.toHaveBeenCalled();
    expect(updatedCloseA).not.toHaveBeenCalled();

    trapB.deactivate();
    expect(trapA.isTop()).toBe(true);
    expect(updatedA.dialog.hasAttribute('inert')).toBe(false);
    expect(updatedA.dialog.hasAttribute('aria-hidden')).toBe(false);
    expect(updatedA.dialog.getAttribute('aria-modal')).toBe('true');
    pressEscape(document);
    expect(updatedCloseA).toHaveBeenCalledOnce();
  });

  it('keeps Escape and focus containment on the top modal, then restores the next layer', async () => {
    const modalA = createDialog(document, 'A');
    const modalB = createDialog(document, 'B');
    const outside = document.createElement('button');
    document.body.append(outside);
    const closeA = vi.fn();
    const closeB = vi.fn();
    const trapA = activate(document, modalA.dialog, closeA);
    const trapB = activate(document, modalB.dialog, closeB);

    trapB.focusInitial(modalB.last);
    expect(document.activeElement).toBe(modalB.last);

    outside.focus();
    expect(document.activeElement).toBe(modalB.first);

    pressEscape(document);
    expect(closeB).toHaveBeenCalledOnce();
    expect(closeA).not.toHaveBeenCalled();

    trapB.deactivate();
    await Promise.resolve();
    expect(document.activeElement).toBe(modalA.first);
    pressEscape(document);
    expect(closeA).toHaveBeenCalledOnce();
    expect(trapA.isTop()).toBe(true);
  });

  it('wraps Tab focus within the top dialog', () => {
    const modal = createDialog(document, 'modal');
    activate(document, modal.dialog, vi.fn());
    modal.last.focus();

    const forward = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
    });
    modal.last.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(modal.first);

    const backward = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
      shiftKey: true,
    });
    modal.first.dispatchEvent(backward);
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(modal.last);
  });

  it('makes deactivation idempotent and does not duplicate document listeners', () => {
    const first = createDialog(document, 'first');
    const firstClose = vi.fn();
    const firstTrap = activate(document, first.dialog, firstClose);

    firstTrap.deactivate();
    firstTrap.deactivate();
    expect(firstTrap.isTop()).toBe(false);

    const second = createDialog(document, 'second');
    const secondClose = vi.fn();
    const secondTrap = activate(document, second.dialog, secondClose);
    pressEscape(document);

    expect(firstClose).not.toHaveBeenCalled();
    expect(secondClose).toHaveBeenCalledOnce();
    expect(secondTrap.isTop()).toBe(true);
  });

  it('prunes disconnected dialogs without disturbing the remaining order', () => {
    const modalA = createDialog(document, 'A');
    const modalB = createDialog(document, 'B');
    const closeA = vi.fn();
    const closeB = vi.fn();
    const trapA = activate(document, modalA.dialog, closeA);
    const trapB = activate(document, modalB.dialog, closeB);

    modalB.dialog.remove();

    expect(trapB.isTop()).toBe(false);
    expect(trapA.isTop()).toBe(true);
    pressEscape(document);
    expect(closeA).toHaveBeenCalledOnce();
    expect(closeB).not.toHaveBeenCalled();

    modalA.dialog.remove();
    expect(trapA.isTop()).toBe(false);

    const modalC = createDialog(document, 'C');
    const closeC = vi.fn();
    activate(document, modalC.dialog, closeC);
    pressEscape(document);
    expect(closeC).toHaveBeenCalledOnce();
  });

  it('isolates independent modal stacks by owner document', () => {
    const documentA = document.implementation.createHTMLDocument('A');
    const documentB = document.implementation.createHTMLDocument('B');
    const modalA = createDialog(documentA, 'A');
    const modalB = createDialog(documentB, 'B');
    const closeA = vi.fn();
    const closeB = vi.fn();
    const trapA = activate(documentA, modalA.dialog, closeA);
    const trapB = activate(documentB, modalB.dialog, closeB);

    pressEscape(documentA);
    expect(closeA).toHaveBeenCalledOnce();
    expect(closeB).not.toHaveBeenCalled();
    expect(trapA.isTop()).toBe(true);
    expect(trapB.isTop()).toBe(true);

    pressEscape(documentB);
    expect(closeB).toHaveBeenCalledOnce();
  });

  it('contains focus when the owner document has no defaultView', () => {
    const ownerDocument = document.implementation.createHTMLDocument('no-window');
    const modal = createDialog(ownerDocument, 'modal');
    const outside = ownerDocument.createElement('button');
    ownerDocument.body.append(outside);
    const focusFirst = vi.spyOn(modal.first, 'focus');
    const trap = activate(ownerDocument, modal.dialog, vi.fn());

    expect(ownerDocument.defaultView).toBeNull();
    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(focusFirst).toHaveBeenCalledOnce();
    expect(trap.isTop()).toBe(true);
  });

  it('rejects dialogs from a different document during activation or update', () => {
    const otherDocument = document.implementation.createHTMLDocument('other');
    const local = createDialog(document, 'local');
    const foreign = createDialog(otherDocument, 'foreign');
    const trap = activate(document, local.dialog, vi.fn());

    expect(() => activateModalFocus(document, foreign.dialog, vi.fn())).toThrow(TypeError);
    expect(() => trap.update(foreign.dialog, vi.fn())).toThrow(TypeError);
    expect(trap.isTop()).toBe(true);
  });
});
