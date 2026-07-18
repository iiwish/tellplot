import { PanelLeft, PanelRight, Redo2, ShieldCheck, TriangleAlert, Undo2 } from 'lucide-react';

import type { EditorMessages } from './editorMessages';

interface EditorToolbarProps {
  readonly datasetId: string;
  readonly messages: EditorMessages;
  readonly valid: boolean;
  readonly showOutline: boolean;
  readonly showInspector: boolean;
  readonly showToolbar: boolean;
  readonly readOnly: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onOpenOutline: () => void;
  readonly onOpenInspector: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

function HistoryTool({
  enabled,
  label,
  reason,
  onClick,
  children,
}: {
  readonly enabled: boolean;
  readonly label: string;
  readonly reason: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return enabled ? (
    <button
      className="tp-icon-button"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  ) : (
    <DisabledTool label={label} reason={reason}>
      {children}
    </DisabledTool>
  );
}

function DisabledTool({
  label,
  reason,
  children,
}: {
  readonly label: string;
  readonly reason: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      className="tp-icon-button"
      type="button"
      aria-label={label}
      aria-description={reason}
      title={reason}
      disabled
    >
      {children}
    </button>
  );
}

export function EditorToolbar({
  datasetId,
  messages,
  valid,
  showOutline,
  showInspector,
  showToolbar,
  readOnly,
  canUndo,
  canRedo,
  onOpenOutline,
  onOpenInspector,
  onUndo,
  onRedo,
}: EditorToolbarProps): React.JSX.Element {
  const statusLabel = valid ? messages.validated : messages.invalidData;

  return (
    <header className="tp-toolbar" role="toolbar" aria-label={messages.toolbar}>
      <div className="tp-brand-block">
        <span className="tp-brand-mark" aria-label="TellPlot">
          TellPlot
        </span>
        <span className="tp-toolbar-divider" aria-hidden="true" />
        <span className="tp-dataset-title" title={datasetId}>
          {datasetId}
        </span>
      </div>

      <div className="tp-toolbar-status" data-valid={valid} role="status" aria-label={statusLabel}>
        {valid ? (
          <ShieldCheck size={15} aria-hidden="true" />
        ) : (
          <TriangleAlert size={15} aria-hidden="true" />
        )}
        <span>{statusLabel}</span>
      </div>

      <div className="tp-toolbar-actions">
        {showOutline ? (
          <button
            className="tp-icon-button tp-outline-trigger"
            type="button"
            aria-label={messages.openOutline}
            title={messages.openOutline}
            onClick={event => {
              event.currentTarget.focus();
              onOpenOutline();
            }}
          >
            <PanelLeft size={17} aria-hidden="true" />
          </button>
        ) : null}
        {showInspector ? (
          <button
            className="tp-icon-button tp-inspector-trigger"
            type="button"
            aria-label={messages.openInspector}
            title={messages.openInspector}
            onClick={event => {
              event.currentTarget.focus();
              onOpenInspector();
            }}
          >
            <PanelRight size={17} aria-hidden="true" />
          </button>
        ) : null}
        {showToolbar ? (
          <>
            <span className="tp-action-divider" aria-hidden="true" />
            <HistoryTool
              enabled={canUndo}
              label={messages.undo}
              reason={readOnly ? messages.readOnlyReason : messages.undoUnavailable}
              onClick={onUndo}
            >
              <Undo2 size={17} aria-hidden="true" />
            </HistoryTool>
            <HistoryTool
              enabled={canRedo}
              label={messages.redo}
              reason={readOnly ? messages.readOnlyReason : messages.redoUnavailable}
              onClick={onRedo}
            >
              <Redo2 size={17} aria-hidden="true" />
            </HistoryTool>
          </>
        ) : null}
      </div>
    </header>
  );
}
