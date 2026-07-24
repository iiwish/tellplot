import { parseSessionActionMeta } from './commands';
import type { CommandSource, EditorCommandType, SessionActionMeta } from './commands';
import { commandError } from './errors';
import type { CommandError } from './errors';
import type { CommandEvent, CommandResult } from './executeCommand';
import type { ViewNodeId } from './ids';
import { validateEditorInvariants } from './invariants';
import type { ViewSpec } from './model';
import type { EditorSession } from './session';

export interface HistoryAction {
  readonly id: string;
  readonly type: EditorCommandType;
  readonly source: CommandSource;
}

export interface HistoryEntry {
  readonly before: ViewSpec;
  readonly after: ViewSpec;
  readonly action: HistoryAction;
  readonly affectedNodeIds: readonly ViewNodeId[];
}

/** Creates an independent plain-data snapshot of a view specification. */
export function cloneViewSpec(view: ViewSpec): ViewSpec {
  const groups = Object.fromEntries(
    Object.entries(view.groups).map(([groupId, group]) => [
      groupId,
      {
        id: group.id,
        label: group.label,
        childIds: [...group.childIds],
      },
    ]),
  );

  const narrativeFields = {
    datasetId: view.datasetId,
    revision: view.revision,
    rootOrder: [...view.rootOrder],
    groups,
    collapsedGroupIds: [...view.collapsedGroupIds],
    pinnedItemIds: [...view.pinnedItemIds],
    annotations: { ...view.annotations },
    emphasis: { ...view.emphasis },
  };

  return view.schemaVersion === '1.0.0'
    ? { ...narrativeFields, schemaVersion: '1.0.0', chartType: 'waterfall' }
    : { ...narrativeFields, schemaVersion: '2.0.0', chartType: view.chartType };
}

/** Appends an entry while evicting the oldest entries beyond the configured limit. */
export function appendHistory(
  entries: readonly HistoryEntry[],
  entry: HistoryEntry,
  limit: number,
): readonly HistoryEntry[] {
  if (limit === 0) {
    return [];
  }

  const firstRetainedIndex = Math.max(0, entries.length - limit + 1);
  return [...entries.slice(firstRetainedIndex), entry];
}

type HistoryDirection = 'undo' | 'redo';

function failedHistoryResult(session: EditorSession, error: CommandError): CommandResult {
  return { ok: false, session, error };
}

function invariantFailure(session: EditorSession, actionId: string): CommandResult {
  return failedHistoryResult(
    session,
    commandError('INVARIANT_VIOLATION', 'INVALID_SESSION_STATE', '/viewSpec', actionId),
  );
}

function applyHistoryAction(
  session: EditorSession,
  actionInput: SessionActionMeta,
  direction: HistoryDirection,
): CommandResult {
  const parsed = parseSessionActionMeta(actionInput, direction);
  if (!parsed.ok) {
    return failedHistoryResult(session, parsed.error);
  }

  const action = parsed.value;
  if (session.processedActionIds.includes(action.id)) {
    return failedHistoryResult(
      session,
      commandError('DUPLICATE_COMMAND_ID', 'DUPLICATE_COMMAND_ID', '/id', action.id),
    );
  }

  const currentRevision = session.viewSpec.revision;
  if (action.baseRevision !== currentRevision) {
    return failedHistoryResult(
      session,
      commandError('REVISION_CONFLICT', 'REVISION_CONFLICT', '/baseRevision', action.id, {
        expectedRevision: action.baseRevision,
        actualRevision: currentRevision,
      }),
    );
  }

  const sourceStack = direction === 'undo' ? session.undoStack : session.redoStack;
  const stackPath = direction === 'undo' ? '/undoStack' : '/redoStack';
  const entry = sourceStack.at(-1);
  if (entry === undefined) {
    return failedHistoryResult(
      session,
      commandError('HISTORY_EMPTY', 'HISTORY_EMPTY', stackPath, action.id),
    );
  }

  if (currentRevision === Number.MAX_SAFE_INTEGER) {
    return failedHistoryResult(
      session,
      commandError('REVISION_OVERFLOW', 'REVISION_OVERFLOW', '/viewSpec/revision', action.id),
    );
  }

  const currentInvariant = validateEditorInvariants(session.sourceData, session.viewSpec);
  if (!currentInvariant.ok) {
    return invariantFailure(session, action.id);
  }

  let restoredView: ViewSpec;
  try {
    const snapshot = direction === 'undo' ? entry.before : entry.after;
    restoredView = {
      ...cloneViewSpec(snapshot),
      revision: currentRevision + 1,
    };
  } catch {
    return invariantFailure(session, action.id);
  }

  const restoredInvariant = validateEditorInvariants(session.sourceData, restoredView);
  if (!restoredInvariant.ok) {
    return invariantFailure(session, action.id);
  }

  const remainingSourceStack = sourceStack.slice(0, -1);
  const undoStack =
    direction === 'undo'
      ? remainingSourceStack
      : appendHistory(session.undoStack, entry, session.historyLimit);
  const redoStack =
    direction === 'redo'
      ? remainingSourceStack
      : appendHistory(session.redoStack, entry, session.historyLimit);
  const nextSession: EditorSession = {
    ...session,
    sourceData: session.sourceData,
    viewSpec: restoredView,
    undoStack,
    redoStack,
    processedActionIds: [...session.processedActionIds, action.id],
  };
  const event: CommandEvent = {
    commandId: action.id,
    type: direction,
    source: action.source,
    previousRevision: currentRevision,
    nextRevision: restoredView.revision,
    affectedNodeIds: [...entry.affectedNodeIds],
    noOp: false,
  };

  return {
    ok: true,
    session: nextSession,
    viewSpec: restoredView,
    event,
  };
}

/** Restores the most recent pre-command snapshot with a new monotonic revision. */
export function undoSession(session: EditorSession, action: SessionActionMeta): CommandResult {
  return applyHistoryAction(session, action, 'undo');
}

/** Reapplies the most recently undone snapshot with a new monotonic revision. */
export function redoSession(session: EditorSession, action: SessionActionMeta): CommandResult {
  return applyHistoryAction(session, action, 'redo');
}
