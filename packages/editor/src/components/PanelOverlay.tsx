import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface PanelOverlayProps {
  readonly label: string;
  readonly closeLabel: string;
  readonly backdropLabel: string;
  readonly side: 'left' | 'right';
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function PanelOverlay({
  label,
  closeLabel,
  backdropLabel,
  side,
  onClose,
  children,
}: PanelOverlayProps): React.JSX.Element {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return undefined;
    }
    const ownerDocument = dialog.ownerDocument;
    const returnFocus =
      ownerDocument.activeElement instanceof HTMLElement ? ownerDocument.activeElement : null;

    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (event.shiftKey && ownerDocument.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && ownerDocument.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(ownerDocument.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleFocusIn = (event: FocusEvent): void => {
      const target = event.target;
      if (target !== null && !dialog.contains(target as Node)) {
        closeRef.current?.focus();
      }
    };

    ownerDocument.addEventListener('keydown', handleKeyDown);
    ownerDocument.addEventListener('focusin', handleFocusIn);
    return () => {
      ownerDocument.removeEventListener('keydown', handleKeyDown);
      ownerDocument.removeEventListener('focusin', handleFocusIn);
      if (returnFocus?.isConnected === true) {
        returnFocus.focus();
      }
    };
  }, []);

  return (
    <div className="tp-overlay-layer" data-side={side}>
      <button
        className="tp-overlay-scrim"
        type="button"
        aria-label={backdropLabel}
        onClick={onClose}
      />
      <section
        aria-label={label}
        aria-modal="true"
        className="tp-panel-overlay"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          className="tp-icon-button tp-overlay-close"
          type="button"
          ref={closeRef}
          aria-label={closeLabel}
          title={closeLabel}
          onClick={onClose}
        >
          <X size={17} aria-hidden="true" />
        </button>
        {children}
      </section>
    </div>
  );
}
