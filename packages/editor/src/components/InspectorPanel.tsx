import { CheckCircle2, Database, LockKeyhole, MousePointer2, Ungroup } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import type { GroupId, ViewNodeId } from '../domain/ids';
import type { SourceData, ViewGroup, ViewSpec } from '../domain/model';
import type { GroupSelectionResult } from '../interactions/groupSelection';
import type { SelectionState } from '../react/editorTypes';
import type { WaterfallProjection } from '../waterfall/waterfallTypes';
import type { EditorMessages } from './editorMessages';
import { formatAmount, type EditorLocale } from './formatAmount';

interface InspectorPanelProps {
  readonly sourceData: SourceData;
  readonly viewSpec: ViewSpec;
  readonly projection: WaterfallProjection;
  readonly selection: SelectionState | null;
  readonly groupSelection: GroupSelectionResult;
  readonly readOnly: boolean;
  readonly locale: EditorLocale;
  readonly messages: EditorMessages;
  readonly onCreateGroup: (label: string) => boolean;
  readonly onSetAnnotation: (nodeId: ViewNodeId, text: string | null) => boolean;
  readonly onUngroup: (groupId: GroupId) => boolean;
}

function ownGroup(viewSpec: ViewSpec, nodeId: string): ViewGroup | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(viewSpec.groups, nodeId);
  return descriptor !== undefined && 'value' in descriptor
    ? (descriptor.value as ViewGroup)
    : undefined;
}

function ownAnnotation(viewSpec: ViewSpec, nodeId: string): string | null {
  const descriptor = Object.getOwnPropertyDescriptor(viewSpec.annotations, nodeId);
  return descriptor !== undefined && 'value' in descriptor ? (descriptor.value as string) : null;
}

function AnnotationField({
  nodeId,
  value,
  readOnly,
  messages,
  onSetAnnotation,
}: {
  readonly nodeId: ViewNodeId;
  readonly value: string | null;
  readonly readOnly: boolean;
  readonly messages: EditorMessages;
  readonly onSetAnnotation: (nodeId: ViewNodeId, text: string | null) => boolean;
}): React.JSX.Element {
  const [draftState, setDraftState] = useState(() => ({
    committedValue: value,
    draft: value ?? '',
  }));
  const draft = draftState.committedValue === value ? draftState.draft : (value ?? '');
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const countId = useId();
  const errorId = useId();
  const codePointCount = Array.from(draft).length;
  const normalized = draft.trim().length === 0 ? null : draft;
  const tooLong = codePointCount > 500;
  const unchanged = normalized === value;
  const disabledReason = readOnly
    ? messages.readOnlyReason
    : tooLong
      ? messages.annotationTooLong
      : null;

  if (draftState.committedValue !== value) {
    setDraftState({ committedValue: value, draft });
  }

  return (
    <section className="tp-inspector-section tp-annotation-field">
      <label className="tp-field-label" htmlFor={fieldId}>
        {messages.annotation}
      </label>
      <textarea
        id={fieldId}
        className="tp-text-input tp-text-area"
        ref={fieldRef}
        aria-describedby={countId}
        aria-errormessage={tooLong ? errorId : undefined}
        aria-invalid={tooLong ? 'true' : undefined}
        placeholder={messages.annotationPlaceholder}
        readOnly={readOnly}
        value={draft}
        onChange={event => setDraftState({ committedValue: value, draft: event.target.value })}
      />
      <div className="tp-annotation-footer">
        <span
          className="tp-annotation-count"
          id={countId}
          data-invalid={tooLong ? 'true' : 'false'}
        >
          {codePointCount} / 500
        </span>
        <button
          className="tp-command-button"
          type="button"
          aria-description={disabledReason ?? undefined}
          disabled={disabledReason !== null || unchanged}
          title={disabledReason ?? messages.saveAnnotation}
          onClick={() => {
            if (onSetAnnotation(nodeId, normalized)) {
              fieldRef.current?.focus();
            }
          }}
        >
          {messages.saveAnnotation}
        </button>
      </div>
      {tooLong ? (
        <span className="tp-annotation-error" id={errorId} role="alert">
          {messages.annotationTooLong}
        </span>
      ) : null}
    </section>
  );
}

function groupReason(
  result: GroupSelectionResult,
  readOnly: boolean,
  label: string,
  messages: EditorMessages,
): string | null {
  if (readOnly) {
    return messages.readOnlyReason;
  }
  if (label.trim().length === 0) {
    return messages.groupLabelRequired;
  }
  if (result.ok) {
    return null;
  }
  return result.reason === 'GROUP_TOO_SMALL'
    ? messages.groupTooSmall
    : result.reason === 'ITEM_LOCKED'
      ? messages.groupLocked
      : messages.groupNonContiguous;
}

export function InspectorPanel({
  sourceData,
  viewSpec,
  projection,
  selection,
  groupSelection,
  readOnly,
  locale,
  messages,
  onCreateGroup,
  onSetAnnotation,
  onUngroup,
}: InspectorPanelProps): React.JSX.Element {
  const [groupLabel, setGroupLabel] = useState('');
  const groupLabelId = useId();
  const groupLabelRef = useRef<HTMLInputElement>(null);
  const selected =
    selection === null ? undefined : projection.find(datum => datum.nodeId === selection.nodeId);
  const selectedGroup = selection === null ? undefined : ownGroup(viewSpec, selection.nodeId);
  const selectedAnnotation = selection === null ? null : ownAnnotation(viewSpec, selection.nodeId);
  const disabledReason = groupReason(groupSelection, readOnly, groupLabel, messages);

  return (
    <div className="tp-panel-body tp-inspector-body">
      <div className="tp-panel-heading">
        <h2>{messages.inspector}</h2>
        <span className="tp-revision">R{viewSpec.revision}</span>
      </div>

      <div className="tp-inspector-scroll">
        {selection === null ? (
          <section className="tp-inspector-section tp-validation-section">
            <div className="tp-section-kicker">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>{messages.validation}</span>
            </div>
            <strong>{messages.valid}</strong>
            <dl className="tp-metric-list">
              <div>
                <dt>{messages.dataset}</dt>
                <dd>{sourceData.datasetId}</dd>
              </div>
              <div>
                <dt>{messages.sourceCount}</dt>
                <dd>{sourceData.items.length}</dd>
              </div>
              <div>
                <dt>{messages.revision}</dt>
                <dd>{viewSpec.revision}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="tp-inspector-section">
            <div className="tp-section-kicker">
              <MousePointer2 size={15} aria-hidden="true" />
              <span>{messages.selectedItem}</span>
            </div>
            <strong>{selected?.label ?? selectedGroup?.label ?? selection.nodeId}</strong>
            {selected === undefined ? null : (
              <span className="tp-inspector-amount">
                {formatAmount(selected.amount, locale, sourceData.currency)}
              </span>
            )}
            <dl className="tp-metric-list">
              <div>
                <dt>{messages.sourceCount}</dt>
                <dd>{selection.sourceIds.length}</dd>
              </div>
              <div>
                <dt>{selected?.locked === true ? messages.locked : messages.editable}</dt>
                <dd>
                  {selected?.locked === true ? (
                    <LockKeyhole size={14} aria-hidden="true" />
                  ) : (
                    <Database size={14} aria-hidden="true" />
                  )}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {selection === null ? null : (
          <AnnotationField
            key={selection.nodeId}
            nodeId={selection.nodeId}
            value={selectedAnnotation}
            readOnly={readOnly}
            messages={messages}
            onSetAnnotation={onSetAnnotation}
          />
        )}

        <section className="tp-inspector-section tp-group-actions">
          <label className="tp-field-label" htmlFor={groupLabelId}>
            {messages.groupLabel}
          </label>
          <input
            id={groupLabelId}
            className="tp-text-input"
            ref={groupLabelRef}
            type="text"
            value={groupLabel}
            onChange={event => setGroupLabel(event.target.value)}
          />
          <button
            className="tp-command-button"
            type="button"
            aria-description={disabledReason ?? undefined}
            disabled={disabledReason !== null}
            title={disabledReason ?? messages.createGroup}
            onClick={() => {
              if (onCreateGroup(groupLabel)) {
                setGroupLabel('');
                groupLabelRef.current?.focus();
              }
            }}
          >
            {messages.createGroup}
          </button>

          {selectedGroup === undefined ? null : (
            <button
              className="tp-command-button tp-command-button-secondary"
              type="button"
              disabled={readOnly}
              aria-description={readOnly ? messages.readOnlyReason : undefined}
              title={readOnly ? messages.readOnlyReason : messages.ungroup}
              onClick={() => onUngroup(selectedGroup.id)}
            >
              <Ungroup size={15} aria-hidden="true" />
              <span>{messages.ungroup}</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
