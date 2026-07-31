import type { ChartConfig } from '../config/chartConfig';
import { validateChartConfig } from '../config/chartConfig';
import {
  parseEditorCommand,
  parseSessionActionMeta,
  type EditorCommand,
  type SessionActionMeta,
} from '../domain/commands';
import {
  commandError,
  validationFailure,
  validationIssue,
  type CommandError,
  type ValidationIssue,
  type ValidationResult,
} from '../domain/errors';
import { executeCommand, type CommandEvent, type CommandResult } from '../domain/executeCommand';
import { redoSession, undoSession } from '../domain/history';
import type { SourceItemId, ViewNodeId } from '../domain/ids';
import type { ViewSpec } from '../domain/model';
import { viewSpecsEqual } from '../domain/persistence';
import { createInitialViewSpec } from '../domain/createInitialViewSpec';
import { createEditorSession, type EditorSession } from '../domain/session';
import { validateViewSpec } from '../domain/validation';
import { collectLeafSourceIds, ownGroup } from '../domain/viewTree';

export interface SelectionState {
  readonly nodeId: ViewNodeId;
  readonly nodeIds: readonly ViewNodeId[];
  readonly sourceIds: readonly SourceItemId[];
}

export interface EditorStoreOptions {
  readonly config: ChartConfig;
  readonly view?: ViewSpec;
  readonly defaultView?: ViewSpec;
  readonly onViewChange?: (next: ViewSpec, event: CommandEvent) => void;
  readonly onCommand?: (event: CommandEvent) => void;
  readonly onCommandRejected?: (error: CommandError) => void;
  readonly onConfigRejected?: (issues: readonly ValidationIssue[]) => void;
  readonly onSelectionChange?: (selection: SelectionState | null) => void;
}

export interface EditorStoreSnapshot {
  readonly status: 'ready' | 'invalid' | 'destroyed';
  readonly mode: 'controlled' | 'uncontrolled' | 'invalid';
  readonly config: ChartConfig | null;
  readonly session: EditorSession | null;
  readonly view: ViewSpec | null;
  readonly issues: readonly ValidationIssue[];
  readonly selection: SelectionState | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly readOnly: boolean;
}

export interface EditorStore {
  getSnapshot(): EditorStoreSnapshot;
  subscribe(listener: () => void): () => void;
  update(options: EditorStoreOptions): void;
  dispatch(command: EditorCommand): CommandResult | null;
  undo(action?: SessionActionMeta): CommandResult | null;
  redo(action?: SessionActionMeta): CommandResult | null;
  select(selection: SelectionState | null): void;
  destroy(): void;
}

interface ActiveState {
  readonly config: ChartConfig | null;
  readonly session: EditorSession | null;
  readonly controlledView: ViewSpec | undefined;
  readonly issues: readonly ValidationIssue[];
  readonly selection: SelectionState | null;
  readonly mode: EditorStoreSnapshot['mode'];
}

type CallbackIdentity =
  'onViewChange' | 'onCommand' | 'onCommandRejected' | 'onConfigRejected' | 'onSelectionChange';

const OPTION_FIELDS: ReadonlySet<string> = new Set([
  'config',
  'view',
  'defaultView',
  'onViewChange',
  'onCommand',
  'onCommandRejected',
  'onConfigRejected',
  'onSelectionChange',
  'onRenderError',
]);
const CALLBACK_FIELDS: readonly CallbackIdentity[] = [
  'onViewChange',
  'onCommand',
  'onCommandRejected',
  'onConfigRejected',
  'onSelectionChange',
];

const MODE_ISSUE = validationIssue('INVALID_CHART_CONFIG', 'INVALID_TYPE', '/view', {
  configuration: 'mutually-exclusive-view-props',
});

type OptionsReadResult =
  | { readonly ok: true; readonly value: EditorStoreOptions }
  | {
      readonly ok: false;
      readonly issues: readonly ValidationIssue[];
      readonly onConfigRejected?: (issues: readonly ValidationIssue[]) => void;
    };

function optionPath(key: string): string {
  return `/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

function readEditorStoreOptions(input: unknown): OptionsReadResult {
  try {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      return {
        ok: false,
        issues: [validationIssue('INVALID_CHART_CONFIG', 'EXPECTED_OBJECT', '/')],
      };
    }
    const prototype = Object.getPrototypeOf(input) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      return {
        ok: false,
        issues: [validationIssue('INVALID_CHART_CONFIG', 'NON_PLAIN_DATA', '/')],
      };
    }

    const values = new Map<string, unknown>();
    const presentFields = new Set<string>();
    const issues: ValidationIssue[] = [];
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key === 'symbol') {
        issues.push(validationIssue('INVALID_CHART_CONFIG', 'NON_PLAIN_DATA', '/'));
        continue;
      }
      const path = optionPath(key);
      if (!OPTION_FIELDS.has(key)) {
        issues.push(validationIssue('INVALID_CHART_CONFIG', 'UNKNOWN_FIELD', path));
        continue;
      }
      presentFields.add(key);
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        issues.push(validationIssue('INVALID_CHART_CONFIG', 'NON_PLAIN_DATA', path));
        continue;
      }
      values.set(key, descriptor.value);
    }

    if (!presentFields.has('config')) {
      issues.push(validationIssue('INVALID_CHART_CONFIG', 'INVALID_TYPE', '/config'));
    }
    for (const key of CALLBACK_FIELDS) {
      const callback = values.get(key);
      if (callback !== undefined && typeof callback !== 'function') {
        issues.push(validationIssue('INVALID_CHART_CONFIG', 'INVALID_TYPE', optionPath(key)));
      }
    }
    const rejectedCallback = values.get('onConfigRejected');
    const onConfigRejected =
      typeof rejectedCallback === 'function'
        ? (rejectedCallback as (issues: readonly ValidationIssue[]) => void)
        : undefined;
    if (issues.length > 0) {
      return {
        ok: false,
        issues,
        ...(onConfigRejected === undefined ? {} : { onConfigRejected }),
      };
    }

    return {
      ok: true,
      value: {
        config: values.get('config') as ChartConfig,
        ...(values.get('view') === undefined ? {} : { view: values.get('view') as ViewSpec }),
        ...(values.get('defaultView') === undefined
          ? {}
          : { defaultView: values.get('defaultView') as ViewSpec }),
        ...(typeof values.get('onViewChange') === 'function'
          ? {
              onViewChange: values.get('onViewChange') as NonNullable<
                EditorStoreOptions['onViewChange']
              >,
            }
          : {}),
        ...(typeof values.get('onCommand') === 'function'
          ? {
              onCommand: values.get('onCommand') as NonNullable<EditorStoreOptions['onCommand']>,
            }
          : {}),
        ...(typeof values.get('onCommandRejected') === 'function'
          ? {
              onCommandRejected: values.get('onCommandRejected') as NonNullable<
                EditorStoreOptions['onCommandRejected']
              >,
            }
          : {}),
        ...(onConfigRejected === undefined ? {} : { onConfigRejected }),
        ...(typeof values.get('onSelectionChange') === 'function'
          ? {
              onSelectionChange: values.get('onSelectionChange') as NonNullable<
                EditorStoreOptions['onSelectionChange']
              >,
            }
          : {}),
      },
    };
  } catch {
    return {
      ok: false,
      issues: [validationIssue('INVALID_CHART_CONFIG', 'UNREADABLE_INPUT', '/')],
    };
  }
}

function detachedFrozen<TValue>(value: TValue): TValue {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map(entry => detachedFrozen(entry))) as unknown as TValue;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  const clone = Object.create(prototype === null ? null : Object.prototype) as Record<
    string,
    unknown
  >;
  for (const key of Object.keys(value)) {
    Object.defineProperty(clone, key, {
      value: detachedFrozen((value as Readonly<Record<string, unknown>>)[key]),
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(clone) as TValue;
}

function invokeCallback(identity: CallbackIdentity, callback: (() => void) | undefined): void {
  if (callback === undefined) {
    return;
  }
  try {
    callback();
  } catch {
    void identity;
  }
}

function createConfigView(config: ChartConfig): ViewSpec | undefined {
  const result = createInitialViewSpec(config.data, { chartType: config.type });
  return result.ok ? result.value : undefined;
}

function sessionFor(
  config: ChartConfig,
  view: ViewSpec | undefined,
): { readonly session: EditorSession | null; readonly issues: readonly ValidationIssue[] } {
  const initialView = view ?? createConfigView(config);
  if (initialView === undefined) {
    return {
      session: null,
      issues: [validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', '/view')],
    };
  }
  const result = createEditorSession(config.data, {
    viewSpec: initialView,
    ...(config.editor?.historyLimit === undefined
      ? {}
      : { historyLimit: config.editor.historyLimit }),
  });
  return result.ok
    ? { session: result.value, issues: [] }
    : { session: null, issues: result.errors };
}

function validateConfiguredView(view: unknown, config: ChartConfig): ValidationResult<ViewSpec> {
  const validated = validateViewSpec(view, config.data);
  if (!validated.ok) {
    return validated;
  }
  if (validated.value.chartType === config.type) {
    try {
      return { ...validated, value: detachedFrozen(validated.value) };
    } catch {
      return validationFailure([validationIssue('INVALID_VIEW_SPEC', 'UNREADABLE_INPUT', '/')]);
    }
  }
  return validationFailure([
    validationIssue('SOURCE_CONFLICT', 'INCOMPATIBLE_CHART_TYPE', '/chartType', {
      expectedChartType: config.type,
      actualChartType: validated.value.chartType,
    }),
  ]);
}

function initialState(options: EditorStoreOptions): ActiveState {
  const result = validateChartConfig(options.config);
  if (!result.ok) {
    return {
      config: null,
      session: null,
      controlledView: undefined,
      issues: result.errors,
      selection: null,
      mode: 'invalid',
    };
  }
  let config: ChartConfig;
  try {
    config = detachedFrozen(result.value);
  } catch {
    return {
      config: null,
      session: null,
      controlledView: undefined,
      issues: [validationIssue('INVALID_CHART_CONFIG', 'UNREADABLE_INPUT', '/')],
      selection: null,
      mode: 'invalid',
    };
  }
  if (options.view !== undefined && options.defaultView !== undefined) {
    return {
      config,
      session: null,
      controlledView: options.view,
      issues: [MODE_ISSUE],
      selection: null,
      mode: 'invalid',
    };
  }
  const mode = options.view === undefined ? 'uncontrolled' : 'controlled';
  const requestedView = options.view !== undefined ? options.view : options.defaultView;
  const validatedView =
    requestedView === undefined ? undefined : validateConfiguredView(requestedView, config);
  if (validatedView !== undefined && !validatedView.ok) {
    return {
      config,
      session: null,
      controlledView: undefined,
      issues: validatedView.errors,
      selection: null,
      mode: 'invalid',
    };
  }
  const created = sessionFor(config, validatedView?.value);
  return {
    config,
    session: created.session,
    controlledView: mode === 'controlled' ? validatedView?.value : undefined,
    issues: created.issues,
    selection: null,
    mode: created.session === null ? 'invalid' : mode,
  };
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameSelection(left: SelectionState | null, right: SelectionState | null): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.nodeId === right.nodeId &&
      sameIds(left.nodeIds, right.nodeIds) &&
      sameIds(left.sourceIds, right.sourceIds))
  );
}

function reconcileSelection(
  selection: SelectionState | null,
  config: ChartConfig | null,
  view: ViewSpec | null,
): SelectionState | null {
  if (selection === null || config === null || view === null || selection.nodeIds.length === 0) {
    return null;
  }
  const sourceIds = new Set(config.data.items.map(item => item.id));
  const exists = (nodeId: ViewNodeId): boolean =>
    sourceIds.has(nodeId as SourceItemId) || ownGroup(view, nodeId) !== undefined;
  if (
    !selection.nodeIds.includes(selection.nodeId) ||
    !exists(selection.nodeId) ||
    selection.nodeIds.some(nodeId => !exists(nodeId))
  ) {
    return null;
  }
  const nextSourceIds = selection.nodeIds.flatMap(nodeId => collectLeafSourceIds(view, nodeId));
  return sameIds(selection.sourceIds, nextSourceIds)
    ? selection
    : { ...selection, sourceIds: nextSourceIds };
}

function snapshot(state: ActiveState, destroyed: boolean): EditorStoreSnapshot {
  if (destroyed) {
    return {
      status: 'destroyed',
      mode: 'invalid',
      config: null,
      session: null,
      view: null,
      issues: [],
      selection: null,
      canUndo: false,
      canRedo: false,
      readOnly: true,
    };
  }
  const view =
    state.mode === 'controlled'
      ? (state.controlledView ?? null)
      : (state.session?.viewSpec ?? null);
  const selection = reconcileSelection(state.selection, state.config, view);
  return {
    status: state.session === null || state.mode === 'invalid' ? 'invalid' : 'ready',
    mode: state.mode,
    config: state.config,
    session: state.session,
    view,
    issues: state.issues,
    selection,
    canUndo: (state.session?.undoStack.length ?? 0) > 0,
    canRedo: (state.session?.redoStack.length ?? 0) > 0,
    readOnly: state.config?.editor?.readOnly === true,
  };
}

/** Owns the deterministic editing session without depending on a UI framework or the DOM. */
export function createEditorStore(initialOptions: EditorStoreOptions): EditorStore {
  const initialOptionsRead = readEditorStoreOptions(initialOptions);
  let options: EditorStoreOptions = initialOptionsRead.ok
    ? initialOptionsRead.value
    : ({ config: {} } as EditorStoreOptions);
  let state: ActiveState = initialOptionsRead.ok
    ? initialState(initialOptionsRead.value)
    : {
        config: null,
        session: null,
        controlledView: undefined,
        issues: initialOptionsRead.issues,
        selection: null,
        mode: 'invalid',
      };
  let pendingControlledSession: EditorSession | null = null;
  const pendingControlledActionIds = new Set<string>();
  let previousDefaultView =
    initialOptionsRead.ok && initialOptionsRead.value.defaultView !== undefined
      ? state.session?.viewSpec
      : undefined;
  let destroyed = false;
  let actionCounter = 0;
  const listeners = new Set<() => void>();

  const internalSnapshot = (): EditorStoreSnapshot => snapshot(state, destroyed);
  let publicSnapshot = detachedFrozen(internalSnapshot());
  const refreshPublicSnapshot = (): void => {
    publicSnapshot = detachedFrozen(internalSnapshot());
  };

  if (state.mode === 'invalid' && state.issues.length > 0) {
    const issues = detachedFrozen(state.issues);
    const onConfigRejected = initialOptionsRead.ok
      ? initialOptionsRead.value.onConfigRejected
      : initialOptionsRead.onConfigRejected;
    invokeCallback('onConfigRejected', () => onConfigRejected?.(issues));
  }

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A subscriber cannot interrupt deterministic state transitions.
      }
    }
  };

  const publishSelectionChange = (previousSelection: SelectionState | null): void => {
    const nextSelection = internalSnapshot().selection;
    if (!sameSelection(previousSelection, nextSelection)) {
      const publicSelection = detachedFrozen(nextSelection);
      invokeCallback('onSelectionChange', () => options.onSelectionChange?.(publicSelection));
    }
  };

  const publishResult = (result: CommandResult): CommandResult => {
    if (!result.ok) {
      const publicError = detachedFrozen(result.error);
      invokeCallback('onCommandRejected', () => options.onCommandRejected?.(publicError));
      return detachedFrozen(result);
    }
    const previousSelection = internalSnapshot().selection;
    if (state.mode === 'controlled') {
      pendingControlledSession = result.session;
      pendingControlledActionIds.add(result.event.commandId);
    } else {
      state = {
        ...state,
        session: result.session,
        issues: [],
        selection: reconcileSelection(state.selection, state.config, result.session.viewSpec),
      };
    }
    refreshPublicSnapshot();
    const publicEvent = detachedFrozen(result.event);
    invokeCallback('onCommand', () => options.onCommand?.(publicEvent));
    invokeCallback('onViewChange', () =>
      options.onViewChange?.(detachedFrozen(result.viewSpec), detachedFrozen(result.event)),
    );
    publishSelectionChange(previousSelection);
    notify();
    return detachedFrozen(result);
  };

  const pendingDuplicate = (actionId: string): CommandResult | undefined =>
    pendingControlledActionIds.has(actionId) && state.session !== null
      ? {
          ok: false,
          session: state.session,
          error: commandError('DUPLICATE_COMMAND_ID', 'DUPLICATE_COMMAND_ID', '/id', actionId),
        }
      : undefined;

  const historyAction = (direction: 'undo' | 'redo'): SessionActionMeta => {
    const processedActionIds = state.session?.processedActionIds ?? [];
    let id: string;
    do {
      actionCounter += 1;
      id = `tellplot:${direction}:${actionCounter}`;
    } while (processedActionIds.includes(id) || pendingControlledActionIds.has(id));
    return {
      id,
      source: 'host',
      baseRevision: state.session?.viewSpec.revision ?? 0,
    };
  };

  return {
    getSnapshot: () => publicSnapshot,
    subscribe(listener): () => void {
      if (destroyed) {
        return () => undefined;
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(nextOptions): void {
      if (destroyed) {
        return;
      }
      const nextOptionsRead = readEditorStoreOptions(nextOptions);
      if (!nextOptionsRead.ok) {
        const issues = detachedFrozen(nextOptionsRead.issues);
        invokeCallback('onConfigRejected', () => options.onConfigRejected?.(issues));
        return;
      }
      const acceptedOptions = nextOptionsRead.value;
      const previousState = state;
      const previousSelection = internalSnapshot().selection;
      const retainedDefaultView = previousDefaultView;
      const validated = validateChartConfig(acceptedOptions.config);
      if (!validated.ok) {
        options = acceptedOptions;
        previousDefaultView = undefined;
        pendingControlledSession = null;
        pendingControlledActionIds.clear();
        state = {
          config: null,
          session: null,
          controlledView: undefined,
          issues: validated.errors,
          selection: null,
          mode: 'invalid',
        };
        refreshPublicSnapshot();
        const issues = detachedFrozen(validated.errors);
        invokeCallback('onConfigRejected', () => acceptedOptions.onConfigRejected?.(issues));
        publishSelectionChange(previousSelection);
        notify();
        return;
      }
      let config: ChartConfig;
      try {
        config = detachedFrozen(validated.value);
      } catch {
        const issues = detachedFrozen([
          validationIssue('INVALID_CHART_CONFIG', 'UNREADABLE_INPUT', '/'),
        ]);
        invokeCallback('onConfigRejected', () => options.onConfigRejected?.(issues));
        return;
      }
      options = acceptedOptions;
      if (acceptedOptions.view !== undefined && acceptedOptions.defaultView !== undefined) {
        pendingControlledSession = null;
        pendingControlledActionIds.clear();
        state = {
          config,
          session: null,
          controlledView: undefined,
          issues: [MODE_ISSUE],
          selection: null,
          mode: 'invalid',
        };
        refreshPublicSnapshot();
        const issues = detachedFrozen(state.issues);
        invokeCallback('onConfigRejected', () => acceptedOptions.onConfigRejected?.(issues));
        publishSelectionChange(previousSelection);
        notify();
        return;
      }
      const mode = acceptedOptions.view === undefined ? 'uncontrolled' : 'controlled';
      let requestedView: ViewSpec | undefined;
      if (mode === 'controlled') {
        const controlledView = validateConfiguredView(acceptedOptions.view, config);
        if (!controlledView.ok) {
          pendingControlledSession = null;
          pendingControlledActionIds.clear();
          state = {
            config,
            session: null,
            controlledView: undefined,
            issues: controlledView.errors,
            selection: null,
            mode: 'invalid',
          };
          refreshPublicSnapshot();
          const issues = detachedFrozen(controlledView.errors);
          invokeCallback('onConfigRejected', () => acceptedOptions.onConfigRejected?.(issues));
          publishSelectionChange(previousSelection);
          notify();
          return;
        }
        requestedView = controlledView.value;
      } else if (previousState.session !== null) {
        const previousView = validateConfiguredView(previousState.session.viewSpec, config);
        if (previousView.ok) {
          requestedView = previousView.value;
        }
      }
      const defaultViewChanged =
        acceptedOptions.defaultView !== undefined &&
        (previousState.session === null ||
          retainedDefaultView === undefined ||
          !viewSpecsEqual(retainedDefaultView, acceptedOptions.defaultView));
      if (requestedView === undefined && defaultViewChanged) {
        const defaultView = validateConfiguredView(acceptedOptions.defaultView, config);
        if (!defaultView.ok) {
          pendingControlledSession = null;
          pendingControlledActionIds.clear();
          state = {
            config,
            session: null,
            controlledView: undefined,
            issues: defaultView.errors,
            selection: null,
            mode: 'invalid',
          };
          refreshPublicSnapshot();
          const issues = detachedFrozen(defaultView.errors);
          invokeCallback('onConfigRejected', () => acceptedOptions.onConfigRejected?.(issues));
          publishSelectionChange(previousSelection);
          notify();
          return;
        }
        requestedView = defaultView.value;
      }

      const created = sessionFor(config, requestedView);
      if (created.session === null) {
        pendingControlledSession = null;
        pendingControlledActionIds.clear();
        state = {
          config,
          session: null,
          controlledView: undefined,
          issues: created.issues,
          selection: null,
          mode: 'invalid',
        };
        refreshPublicSnapshot();
        const issues = detachedFrozen(created.issues);
        invokeCallback('onConfigRejected', () => acceptedOptions.onConfigRejected?.(issues));
        publishSelectionChange(previousSelection);
        notify();
        return;
      }

      const acceptsSession = (candidate: EditorSession | null): candidate is EditorSession =>
        candidate !== null &&
        candidate.sourceFingerprint === created.session?.sourceFingerprint &&
        candidate.historyLimit === created.session?.historyLimit &&
        viewSpecsEqual(candidate.viewSpec, created.session.viewSpec);
      const retainedSession =
        mode === 'controlled' && acceptsSession(pendingControlledSession)
          ? pendingControlledSession
          : acceptsSession(previousState.session)
            ? previousState.session
            : created.session;
      const visibleView =
        mode === 'controlled' ? (requestedView ?? null) : retainedSession.viewSpec;
      pendingControlledSession = null;
      pendingControlledActionIds.clear();
      state = {
        config,
        session: retainedSession,
        controlledView: mode === 'controlled' ? requestedView : undefined,
        issues: [],
        selection: reconcileSelection(previousState.selection, config, visibleView),
        mode,
      };
      if (acceptedOptions.defaultView === undefined) {
        previousDefaultView = undefined;
      } else {
        const trackedDefaultView = validateConfiguredView(acceptedOptions.defaultView, config);
        previousDefaultView = trackedDefaultView.ok ? trackedDefaultView.value : undefined;
      }
      refreshPublicSnapshot();
      publishSelectionChange(previousSelection);
      notify();
    },
    dispatch(command): CommandResult | null {
      if (
        destroyed ||
        state.mode === 'invalid' ||
        state.session === null ||
        state.config?.editor?.readOnly === true
      ) {
        return null;
      }
      const parsed = parseEditorCommand(command);
      const duplicate = parsed.ok ? pendingDuplicate(parsed.value.id) : undefined;
      return publishResult(duplicate ?? executeCommand(state.session, command));
    },
    undo(action): CommandResult | null {
      if (
        destroyed ||
        state.mode === 'invalid' ||
        state.session === null ||
        state.config?.editor?.readOnly === true
      ) {
        return null;
      }
      const resolvedAction = action ?? historyAction('undo');
      const parsed = parseSessionActionMeta(resolvedAction, 'undo');
      const duplicate = parsed.ok ? pendingDuplicate(parsed.value.id) : undefined;
      return publishResult(duplicate ?? undoSession(state.session, resolvedAction));
    },
    redo(action): CommandResult | null {
      if (
        destroyed ||
        state.mode === 'invalid' ||
        state.session === null ||
        state.config?.editor?.readOnly === true
      ) {
        return null;
      }
      const resolvedAction = action ?? historyAction('redo');
      const parsed = parseSessionActionMeta(resolvedAction, 'redo');
      const duplicate = parsed.ok ? pendingDuplicate(parsed.value.id) : undefined;
      return publishResult(duplicate ?? redoSession(state.session, resolvedAction));
    },
    select(nextSelection): void {
      if (destroyed) {
        return;
      }
      const requestedSelection =
        nextSelection === null
          ? null
          : {
              nodeId: nextSelection.nodeId,
              nodeIds: [...nextSelection.nodeIds],
              sourceIds: [...nextSelection.sourceIds],
            };
      const visibleView = internalSnapshot().view;
      const visibleSelection = reconcileSelection(requestedSelection, state.config, visibleView);
      const pendingSelection =
        state.mode === 'controlled' && pendingControlledSession !== null
          ? reconcileSelection(requestedSelection, state.config, pendingControlledSession.viewSpec)
          : null;
      state = {
        ...state,
        selection: visibleSelection ?? pendingSelection,
      };
      refreshPublicSnapshot();
      if (visibleSelection === null && pendingSelection !== null) {
        return;
      }
      const publicSelection = detachedFrozen(visibleSelection);
      invokeCallback('onSelectionChange', () => options.onSelectionChange?.(publicSelection));
      notify();
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      pendingControlledSession = null;
      pendingControlledActionIds.clear();
      state = {
        config: null,
        session: null,
        controlledView: undefined,
        issues: [],
        selection: null,
        mode: 'invalid',
      };
      refreshPublicSnapshot();
      notify();
      listeners.clear();
    },
  };
}
