import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { EditorCommand, SessionActionMeta } from '../domain/commands';
import { validationIssue, type ValidationIssue } from '../domain/errors';
import { executeCommand, type CommandResult } from '../domain/executeCommand';
import { redoSession, undoSession } from '../domain/history';
import type { SourceData, ViewSpec } from '../domain/model';
import { collectLeafSourceIds, ownGroup } from '../domain/viewTree';
import {
  createEditorSession,
  type EditorSession,
  type EditorSessionOptions,
} from '../domain/session';
import type { FinancialChartEditorProps, SelectionState } from './editorTypes';

export type EditorControllerMode = 'controlled' | 'uncontrolled' | 'invalid';
export type EditorControllerStatus = 'ready' | 'invalid';

export interface EditorController {
  readonly mode: EditorControllerMode;
  readonly status: EditorControllerStatus;
  readonly session: EditorSession | null;
  readonly viewSpec: ViewSpec | null;
  readonly issues: readonly ValidationIssue[];
  readonly selection: SelectionState | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly dispatch: (command: EditorCommand) => CommandResult | null;
  readonly undo: (action: SessionActionMeta) => CommandResult | null;
  readonly redo: (action: SessionActionMeta) => CommandResult | null;
  readonly select: (selection: SelectionState) => void;
}

interface ControllerState {
  readonly session: EditorSession | null;
  readonly issues: readonly ValidationIssue[];
  readonly sourceData: SourceData;
  readonly historyLimitInput: number | undefined;
  readonly controlledViewSpec: ViewSpec | undefined;
}

type CallbackIdentity =
  'onCommand' | 'onViewSpecChange' | 'onCommandRejected' | 'onSelectionChange';

const INVALID_MODE_ISSUE = validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', '/viewSpec', {
  configuration: 'mutually-exclusive-view-props',
});

function initialMode(props: FinancialChartEditorProps): EditorControllerMode {
  if (props.viewSpec !== undefined && props.defaultViewSpec !== undefined) {
    return 'invalid';
  }
  return props.viewSpec === undefined ? 'uncontrolled' : 'controlled';
}

function currentMode(
  lockedMode: EditorControllerMode,
  props: FinancialChartEditorProps,
): EditorControllerMode {
  if (lockedMode === 'invalid') {
    return 'invalid';
  }
  if (props.viewSpec !== undefined && props.defaultViewSpec !== undefined) {
    return 'invalid';
  }
  if (lockedMode === 'controlled' && props.viewSpec === undefined) {
    return 'invalid';
  }
  if (lockedMode === 'uncontrolled' && props.viewSpec !== undefined) {
    return 'invalid';
  }
  return lockedMode;
}

function sessionOptions(
  viewSpec: ViewSpec | undefined,
  historyLimit: number | undefined,
): EditorSessionOptions {
  return {
    ...(viewSpec === undefined ? {} : { viewSpec }),
    ...(historyLimit === undefined ? {} : { historyLimit }),
  };
}

function createState(
  sourceData: SourceData,
  viewSpec: ViewSpec | undefined,
  historyLimit: number | undefined,
  controlledViewSpec: ViewSpec | undefined,
): ControllerState {
  const result = createEditorSession(sourceData, sessionOptions(viewSpec, historyLimit));
  const context = {
    sourceData,
    historyLimitInput: historyLimit,
    controlledViewSpec,
  };
  return result.ok
    ? { ...context, session: result.value, issues: [] }
    : { ...context, session: null, issues: result.errors };
}

function invalidState(props: FinancialChartEditorProps): ControllerState {
  return {
    session: null,
    issues: [INVALID_MODE_ISSUE],
    sourceData: props.sourceData,
    historyLimitInput: props.historyLimit,
    controlledViewSpec: props.viewSpec,
  };
}

function initialState(
  props: FinancialChartEditorProps,
  mode: EditorControllerMode,
): ControllerState {
  if (mode === 'invalid') {
    return invalidState(props);
  }
  const viewSpec = mode === 'controlled' ? props.viewSpec : props.defaultViewSpec;
  return createState(
    props.sourceData,
    viewSpec,
    props.historyLimit,
    mode === 'controlled' ? props.viewSpec : undefined,
  );
}

function reconcileState(
  state: ControllerState,
  mode: EditorControllerMode,
  sourceData: SourceData,
  controlledViewSpec: ViewSpec | undefined,
  historyLimit: number | undefined,
): ControllerState {
  if (mode === 'invalid') {
    return {
      session: null,
      issues: [INVALID_MODE_ISSUE],
      sourceData,
      historyLimitInput: historyLimit,
      controlledViewSpec,
    };
  }

  const sameSourceAndHistory =
    state.sourceData === sourceData && Object.is(state.historyLimitInput, historyLimit);
  if (mode === 'controlled') {
    const sameControlledView =
      state.controlledViewSpec === controlledViewSpec ||
      state.session?.viewSpec === controlledViewSpec;
    return sameSourceAndHistory && sameControlledView
      ? state
      : createState(sourceData, controlledViewSpec, historyLimit, controlledViewSpec);
  }

  if (sameSourceAndHistory) {
    return state;
  }
  const retainedViewSpec = state.sourceData === sourceData ? state.session?.viewSpec : undefined;
  return createState(sourceData, retainedViewSpec, historyLimit, undefined);
}

function callbackFailure(identity: CallbackIdentity): void {
  try {
    console.error(`[tellplot] Host callback failed: ${identity}`);
  } catch {
    return;
  }
}

function invokeCallback(identity: CallbackIdentity, callback: (() => void) | undefined): void {
  if (callback === undefined) {
    return;
  }
  try {
    callback();
  } catch {
    callbackFailure(identity);
  }
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function reconcileSelection(
  selection: SelectionState | null,
  sourceData: SourceData,
  viewSpec: ViewSpec | null,
): SelectionState | null {
  if (selection === null || viewSpec === null || selection.nodeIds.length === 0) {
    return null;
  }

  const sourceNodeIds = new Set(sourceData.items.map(item => item.id));
  const nodeExists = (nodeId: string): boolean =>
    sourceNodeIds.has(nodeId) || ownGroup(viewSpec, nodeId) !== undefined;
  if (
    !selection.nodeIds.includes(selection.nodeId) ||
    !nodeExists(selection.nodeId) ||
    selection.nodeIds.some(nodeId => !nodeExists(nodeId))
  ) {
    return null;
  }

  const sourceIds = selection.nodeIds.flatMap(nodeId => collectLeafSourceIds(viewSpec, nodeId));
  return sameIds(selection.sourceIds, sourceIds) ? selection : { ...selection, sourceIds };
}

/** Adapts controlled and uncontrolled React props to the immutable domain command session. */
export function useEditorController(props: FinancialChartEditorProps): EditorController {
  const [lockedMode] = useState<EditorControllerMode>(() => initialMode(props));
  const mode = currentMode(lockedMode, props);
  const [state, setState] = useState<ControllerState>(() => initialState(props, lockedMode));
  const activeState = useMemo(
    () => reconcileState(state, mode, props.sourceData, props.viewSpec, props.historyLimit),
    [mode, props.historyLimit, props.sourceData, props.viewSpec, state],
  );
  const visibleViewSpec =
    mode === 'controlled'
      ? activeState.session === null
        ? null
        : (props.viewSpec ?? null)
      : (activeState.session?.viewSpec ?? null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const visibleSelection = useMemo(
    () => reconcileSelection(selection, props.sourceData, visibleViewSpec),
    [props.sourceData, selection, visibleViewSpec],
  );
  if (selection !== visibleSelection) {
    setSelection(visibleSelection);
  }
  const commandSessionRef = useRef(activeState.session);

  useLayoutEffect(() => {
    commandSessionRef.current = activeState.session;
  }, [activeState.session]);

  const publishResult = useCallback(
    (result: CommandResult): CommandResult => {
      if (!result.ok) {
        const callback = props.onCommandRejected;
        invokeCallback(
          'onCommandRejected',
          callback === undefined ? undefined : () => callback(result.error),
        );
        return result;
      }

      commandSessionRef.current = result.session;
      setState({
        ...activeState,
        session: result.session,
        issues: [],
        controlledViewSpec:
          mode === 'controlled' ? result.viewSpec : activeState.controlledViewSpec,
      });
      const onCommand = props.onCommand;
      invokeCallback(
        'onCommand',
        onCommand === undefined ? undefined : () => onCommand(result.event),
      );
      const onViewSpecChange = props.onViewSpecChange;
      invokeCallback(
        'onViewSpecChange',
        onViewSpecChange === undefined
          ? undefined
          : () => onViewSpecChange(result.viewSpec, result.event),
      );
      return result;
    },
    [activeState, mode, props.onCommand, props.onCommandRejected, props.onViewSpecChange],
  );

  const dispatch = useCallback(
    (command: EditorCommand): CommandResult | null => {
      const commandSession = commandSessionRef.current;
      if (props.readOnly === true || mode === 'invalid' || commandSession === null) {
        return null;
      }
      return publishResult(executeCommand(commandSession, command));
    },
    [mode, props.readOnly, publishResult],
  );

  const applyHistory = useCallback(
    (direction: 'undo' | 'redo', action: SessionActionMeta): CommandResult | null => {
      const commandSession = commandSessionRef.current;
      if (props.readOnly === true || mode === 'invalid' || commandSession === null) {
        return null;
      }
      return publishResult(
        direction === 'undo'
          ? undoSession(commandSession, action)
          : redoSession(commandSession, action),
      );
    },
    [mode, props.readOnly, publishResult],
  );

  const undo = useCallback(
    (action: SessionActionMeta): CommandResult | null => applyHistory('undo', action),
    [applyHistory],
  );
  const redo = useCallback(
    (action: SessionActionMeta): CommandResult | null => applyHistory('redo', action),
    [applyHistory],
  );

  const select = useCallback(
    (nextSelection: SelectionState): void => {
      const copiedSelection: SelectionState = {
        nodeId: nextSelection.nodeId,
        nodeIds: [...nextSelection.nodeIds],
        sourceIds: [...nextSelection.sourceIds],
      };
      setSelection(copiedSelection);
      const callback = props.onSelectionChange;
      invokeCallback(
        'onSelectionChange',
        callback === undefined ? undefined : () => callback(copiedSelection),
      );
    },
    [props.onSelectionChange],
  );

  if (mode === 'invalid') {
    return {
      mode,
      status: 'invalid',
      session: null,
      viewSpec: null,
      issues: [INVALID_MODE_ISSUE],
      selection: visibleSelection,
      canUndo: false,
      canRedo: false,
      dispatch,
      undo,
      redo,
      select,
    };
  }

  return {
    mode,
    status: activeState.session === null ? 'invalid' : 'ready',
    session: activeState.session,
    viewSpec: visibleViewSpec,
    issues: activeState.issues,
    selection: visibleSelection,
    canUndo: props.readOnly !== true && (activeState.session?.undoStack.length ?? 0) > 0,
    canRedo: props.readOnly !== true && (activeState.session?.redoStack.length ?? 0) > 0,
    dispatch,
    undo,
    redo,
    select,
  };
}
