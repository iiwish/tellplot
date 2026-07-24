import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { PanelOverlay } from '../../src/components/PanelOverlay';

function OverlayHarness(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open inspector
      </button>
      {open ? (
        <PanelOverlay
          backdropLabel="Inspector backdrop"
          closeLabel="Close inspector"
          label="Inspector"
          side="right"
          onClose={() => setOpen(false)}
        >
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </PanelOverlay>
      ) : null}
    </div>
  );
}

function UpdatingOverlayHarness(): React.JSX.Element {
  const [showAction, setShowAction] = useState(true);

  return (
    <PanelOverlay
      backdropLabel="Inspector backdrop"
      closeLabel="Close inspector"
      label="Inspector"
      side="right"
      onClose={() => undefined}
    >
      {showAction ? (
        <button type="button" onClick={() => setShowAction(false)}>
          Replace action
        </button>
      ) : (
        <button type="button">Replacement action</button>
      )}
    </PanelOverlay>
  );
}

describe('PanelOverlay focus boundary', () => {
  it('moves focus inside, traps Tab, closes on Escape and restores the opener', async () => {
    const user = userEvent.setup();
    render(<OverlayHarness />);

    const opener = screen.getByRole('button', { name: 'Open inspector' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Inspector' });
    const close = screen.getByRole('button', { name: 'Close inspector' });
    const last = screen.getByRole('button', { name: 'Last action' });
    await waitFor(() => expect(document.activeElement).toBe(close));
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(last);
    await user.keyboard('{Tab}');
    expect(document.activeElement).toBe(close);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Inspector' })).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('keeps focus in the dialog when an action replaces the focused control', async () => {
    const user = userEvent.setup();
    render(<UpdatingOverlayHarness />);

    const action = screen.getByRole('button', { name: 'Replace action' });
    action.focus();
    await user.click(action);

    const dialog = screen.getByRole('dialog', { name: 'Inspector' });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });
});
