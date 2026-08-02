import {
  buildMoveNodeCommand,
  collectLeafSourceIds,
  createEditorStore,
  evaluateGroupSelection,
  executeCommand,
  ownGroup,
  parseViewSpec,
  resolveKeyboardMoveTarget,
  resolvePointerDropPlacement,
  resolvePointerMoveTarget,
  serializeViewSpec,
  toFinancialChartAppearance,
  viewSpecsEqual,
  type CommandResult,
  type EditorCommand,
  type EditorStore,
  type EditorStoreSnapshot,
  type GroupId,
  type GroupSelectionResult,
  type InteractionCommandSource,
  type KeyboardMoveDirection,
  type SelectionState,
  type SessionActionMeta,
  type ViewNodeId,
  type ViewSpec,
} from '@tellplot/core';
import { projectExpandedGroupRegions } from '../charts/groupRegions';
import { normalizeExportOptions } from '../export/exportOptions';
import { exportPngChart } from '../export/pngExport';
import { exportSvgChart } from '../export/svgExport';
import { exportError, type ExportOptions, type ExportResult } from '../export/exportTypes';
import {
  createChartSurface,
  type ChartSurface,
  type ChartSurfaceInteractionPreview,
} from './chartSurface';
import { button, element, setOptionalAttribute } from './dom';
import { formatAmount } from './formatAmount';
import { observeEditorLayout, type EditorLayoutMode, type EditorLayoutObserver } from './layout';
import { editorMessages, type EditorMessages } from './messages';
import { activateModalFocus, type ModalFocusTrap } from './modalFocus';
import { outlineEntries, type OutlineEntry } from './outline';
import { chartTitle, projectEditorChart, type EditorChartProjection } from './projection';
import { editorError, type EditorInstance, type EditorOptions } from './types';

interface Feedback {
  readonly code: string;
  readonly message: string;
  readonly tone: 'neutral' | 'success' | 'error';
  readonly source?: InteractionCommandSource;
}

interface OutlineDrag {
  readonly pointerId: number;
  readonly itemId: ViewNodeId;
  readonly startX: number;
  readonly startY: number;
  moved: boolean;
  target: { readonly nodeId: ViewNodeId; readonly placement: 'before' | 'after' | 'inside' } | null;
}

type ValidGroupSelection = Extract<GroupSelectionResult, { readonly ok: true }>;

type ModalKind = 'outline' | 'inspector' | 'group';

interface AnnotationDraft {
  readonly nodeId: ViewNodeId;
  readonly value: string;
  readonly baseline: string;
  readonly submittedValue?: string;
}

interface GroupLabelDraft {
  readonly selectionKey: string;
  readonly value: string;
}

interface FocusState {
  readonly key: string;
  readonly selectionStart?: number | null;
  readonly selectionEnd?: number | null;
}

const ownedContainers = new WeakSet<HTMLElement>();
let editorInstanceCounter = 0;

function validContainer(container: HTMLElement): boolean {
  try {
    if (
      typeof container !== 'object' ||
      container === null ||
      container.nodeType !== 1 ||
      container.ownerDocument === undefined
    ) {
      return false;
    }
    const ownerWindow = container.ownerDocument.defaultView;
    if (ownerWindow !== null) {
      return container instanceof ownerWindow.HTMLElement;
    }
    return (
      container.namespaceURI === 'http://www.w3.org/1999/xhtml' &&
      typeof container.append === 'function' &&
      typeof container.querySelector === 'function' &&
      typeof container.getBoundingClientRect === 'function'
    );
  } catch {
    return false;
  }
}

function cloneView(view: ViewSpec, source: EditorStoreSnapshot['config']): ViewSpec {
  if (source === null) {
    throw editorError('VIEW_UNAVAILABLE', 'TellPlot view is unavailable.');
  }
  const parsed = parseViewSpec(serializeViewSpec(view), source.data);
  if (!parsed.ok) {
    throw editorError('VIEW_UNAVAILABLE', 'TellPlot view is unavailable.');
  }
  return parsed.value;
}

function sameView(left: ViewSpec | null, right: ViewSpec | null): boolean {
  if (left === right) {
    return true;
  }
  if (left === null || right === null) {
    return false;
  }
  return viewSpecsEqual(left, right);
}

type ComparedObjectPairs = WeakMap<object, WeakSet<object>>;

function comparableObjectKeys(value: object): string[] {
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .filter(key => record[key] !== undefined)
    .sort();
}

function sameJsonValueInternal(
  left: unknown,
  right: unknown,
  compared: ComparedObjectPairs,
): boolean {
  if (left === right) {
    return true;
  }
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  const previousRights = compared.get(left);
  if (previousRights?.has(right) === true) {
    return true;
  }
  if (previousRights === undefined) {
    compared.set(left, new WeakSet([right]));
  } else {
    previousRights.add(right);
  }

  const leftIsArray = Array.isArray(left);
  if (leftIsArray || Array.isArray(right)) {
    if (!leftIsArray || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    for (let index = 0; index < left.length; index += 1) {
      if (!sameJsonValueInternal(left[index], right[index], compared)) {
        return false;
      }
    }
    return true;
  }

  const leftKeys = comparableObjectKeys(left);
  const rightKeys = comparableObjectKeys(right);
  if (
    leftKeys.length !== rightKeys.length ||
    leftKeys.some((key, index) => key !== rightKeys[index])
  ) {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  return leftKeys.every(key => sameJsonValueInternal(leftRecord[key], rightRecord[key], compared));
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  try {
    return sameJsonValueInternal(left, right, new WeakMap());
  } catch {
    return false;
  }
}

function sameConfigForRender(left: EditorStoreSnapshot, right: EditorStoreSnapshot): boolean {
  if (left.config === right.config) {
    return true;
  }
  if (left.config === null || right.config === null) {
    return false;
  }
  const leftSource = left.session?.sourceFingerprint ?? left.config.data;
  const rightSource = right.session?.sourceFingerprint ?? right.config.data;
  return (
    sameJsonValue(leftSource, rightSource) &&
    sameJsonValue(
      {
        type: left.config.type,
        locale: left.config.locale,
        height: left.config.height,
        appearance: left.config.appearance,
        editor: left.config.editor,
      },
      {
        type: right.config.type,
        locale: right.config.locale,
        height: right.config.height,
        appearance: right.config.appearance,
        editor: right.config.editor,
      },
    )
  );
}

function sameRenderState(left: EditorStoreSnapshot, right: EditorStoreSnapshot): boolean {
  const sameSession =
    left.session === right.session ||
    (left.session !== null &&
      right.session !== null &&
      left.session.sourceFingerprint === right.session.sourceFingerprint &&
      left.session.historyLimit === right.session.historyLimit);
  return (
    left.status === right.status &&
    left.mode === right.mode &&
    sameSession &&
    sameConfigForRender(left, right) &&
    sameView(left.view, right.view) &&
    sameJsonValue(left.issues, right.issues) &&
    sameJsonValue(left.selection, right.selection) &&
    left.canUndo === right.canUndo &&
    left.canRedo === right.canRedo &&
    left.readOnly === right.readOnly
  );
}

function groupFailureMessage(selection: GroupSelectionResult, messages: EditorMessages): string {
  if (selection.ok) {
    return messages.targetUnavailable;
  }
  return selection.reason === 'GROUP_TOO_SMALL'
    ? messages.groupTooSmall
    : selection.reason === 'ITEM_LOCKED'
      ? messages.groupLocked
      : selection.reason === 'REDUNDANT_GROUP_SELECTION'
        ? messages.groupRedundant
        : messages.groupNonContiguous;
}

function commandFailureMessage(code: string, messages: EditorMessages): string {
  return code === 'ITEM_LOCKED'
    ? messages.groupLocked
    : code === 'GROUP_TOO_SMALL'
      ? messages.groupTooSmall
      : code === 'NON_CONTIGUOUS_GROUP_SELECTION'
        ? messages.groupNonContiguous
        : code === 'REDUNDANT_GROUP_SELECTION'
          ? messages.groupRedundant
          : messages.targetUnavailable;
}

function projectionDatum(
  chart: EditorChartProjection,
  nodeId: ViewNodeId,
): EditorChartProjection['projection'][number] | undefined {
  return chart.projection.find(datum => datum.nodeId === nodeId);
}

type EditorOptionsErrorCode = 'EDITOR_INITIALIZATION_FAILED' | 'EDITOR_RENDER_FAILED';
type EditorCallbackOption = Exclude<keyof EditorOptions, 'config' | 'view' | 'defaultView'>;

const EDITOR_OPTION_FIELDS = new Set<PropertyKey>([
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
const EDITOR_CALLBACK_FIELDS: readonly EditorCallbackOption[] = [
  'onViewChange',
  'onCommand',
  'onCommandRejected',
  'onConfigRejected',
  'onSelectionChange',
  'onRenderError',
];

function editorOptionsError(code: EditorOptionsErrorCode): ReturnType<typeof editorError> {
  return editorError(
    code,
    code === 'EDITOR_INITIALIZATION_FAILED'
      ? 'TellPlot editor could not be initialized.'
      : 'TellPlot editor could not render its state.',
  );
}

function snapshotEditorOptions(
  options: EditorOptions,
  errorCode: EditorOptionsErrorCode,
): EditorOptions {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw editorOptionsError(errorCode);
  }
  const values = new Map<keyof EditorOptions, unknown>();
  try {
    const prototype = Object.getPrototypeOf(options) as unknown;
    if (prototype !== Object.prototype && prototype !== null) {
      throw editorOptionsError(errorCode);
    }
    for (const key of Reflect.ownKeys(options)) {
      if (!EDITOR_OPTION_FIELDS.has(key)) {
        throw editorOptionsError(errorCode);
      }
      const descriptor = Object.getOwnPropertyDescriptor(options, key);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor) ||
        typeof key !== 'string'
      ) {
        throw editorOptionsError(errorCode);
      }
      values.set(key as keyof EditorOptions, descriptor.value);
    }
  } catch {
    throw editorOptionsError(errorCode);
  }
  if (!values.has('config')) {
    throw editorOptionsError(errorCode);
  }
  for (const key of EDITOR_CALLBACK_FIELDS) {
    const callback = values.get(key);
    if (callback !== undefined && typeof callback !== 'function') {
      throw editorOptionsError(errorCode);
    }
  }
  const config = values.get('config') as EditorOptions['config'];
  const view = values.get('view') as EditorOptions['view'];
  const defaultView = values.get('defaultView') as EditorOptions['defaultView'];
  const onViewChange = values.get('onViewChange') as EditorOptions['onViewChange'];
  const onCommand = values.get('onCommand') as EditorOptions['onCommand'];
  const onCommandRejected = values.get('onCommandRejected') as EditorOptions['onCommandRejected'];
  const onConfigRejected = values.get('onConfigRejected') as EditorOptions['onConfigRejected'];
  const onSelectionChange = values.get('onSelectionChange') as EditorOptions['onSelectionChange'];
  const onRenderError = values.get('onRenderError') as EditorOptions['onRenderError'];
  return {
    config,
    ...(view === undefined ? {} : { view }),
    ...(defaultView === undefined ? {} : { defaultView }),
    ...(onViewChange === undefined ? {} : { onViewChange }),
    ...(onCommand === undefined ? {} : { onCommand }),
    ...(onCommandRejected === undefined ? {} : { onCommandRejected }),
    ...(onConfigRejected === undefined ? {} : { onConfigRejected }),
    ...(onSelectionChange === undefined ? {} : { onSelectionChange }),
    ...(onRenderError === undefined ? {} : { onRenderError }),
  };
}

/** Creates the framework-neutral TellPlot workbench in a caller-owned element. */
export function createEditor(
  container: HTMLElement,
  initialOptions: EditorOptions,
): EditorInstance {
  if (!validContainer(container)) {
    throw editorError('CONTAINER_UNAVAILABLE', 'TellPlot requires a valid HTMLElement container.');
  }
  if (ownedContainers.has(container)) {
    throw editorError('CONTAINER_OWNED', 'This container already owns a live TellPlot editor.');
  }

  ownedContainers.add(container);
  let initialOptionsSnapshot: EditorOptions;
  try {
    initialOptionsSnapshot = snapshotEditorOptions(initialOptions, 'EDITOR_INITIALIZATION_FAILED');
  } catch (error) {
    ownedContainers.delete(container);
    throw error;
  }
  const document = container.ownerDocument;
  const ownerWindow = document.defaultView;
  editorInstanceCounter += 1;
  const instanceId = `tp-editor-${editorInstanceCounter}`;
  let store: EditorStore;
  try {
    store = createEditorStore(initialOptionsSnapshot);
    if (store.getSnapshot().issues.some(issue => issue.reason === 'UNREADABLE_INPUT')) {
      store.destroy();
      throw editorOptionsError('EDITOR_INITIALIZATION_FAILED');
    }
  } catch {
    ownedContainers.delete(container);
    throw editorError('EDITOR_INITIALIZATION_FAILED', 'TellPlot editor could not be initialized.');
  }
  const isRowControl = (target: EventTarget | null): boolean =>
    ownerWindow !== null &&
    (target instanceof ownerWindow.HTMLButtonElement ||
      target instanceof ownerWindow.HTMLInputElement);
  const root = element(document, 'div', {
    className: 'tp-editor',
    attributes: { 'data-tellplot': 'editor', 'data-layout': 'narrow', tabindex: '-1' },
  });
  const toolbar = element(document, 'header', {
    className: 'tp-toolbar',
    attributes: { role: 'toolbar' },
  });
  const feedbackElement = element(document, 'div', {
    className: 'tp-command-feedback',
    attributes: { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
  });
  const feedbackCodeElement = element(document, 'strong');
  const feedbackMessageElement = element(document, 'span');
  feedbackElement.append(feedbackCodeElement, feedbackMessageElement);
  const workbench = element(document, 'div', { className: 'tp-workbench' });
  const transientLayer = element(document, 'div');
  root.append(toolbar, feedbackElement, workbench, transientLayer);
  container.append(root);

  let chartSurface: ChartSurface | undefined;
  let destroyed = false;
  let editorRenderFailed = false;
  let rendering = false;
  let actionCounter = 0;
  const acceptedActionIds = new Set<string>();
  let rovingNodeId: ViewNodeId | null = null;
  let outlineDrag: OutlineDrag | null = null;
  let outlineDragOverlay: HTMLElement | null = null;
  let feedback: Feedback = { code: 'READY', message: 'Ready', tone: 'neutral' };
  let overlay: 'outline' | 'inspector' | null = null;
  let overlayReturnFocus: HTMLElement | null = null;
  let activeTab: 'outline' | 'inspector' = 'outline';
  let pendingGroup: ValidGroupSelection | null = null;
  let pendingGroupLabel = '';
  let pendingGroupReturnFocus: HTMLElement | null = null;
  let pendingGroupReturnNodeId: ViewNodeId | null = null;
  let modalFocusTrap: ModalFocusTrap | undefined;
  let modalKind: ModalKind | null = null;
  let annotationDraft: AnnotationDraft | null = null;
  let groupLabelDraft: GroupLabelDraft | null = null;
  let transientFocus: FocusState | null = null;
  let transientScrollTop = 0;
  let workbenchScrollTop = 0;
  let focusRestoreVersion = 0;
  let suppressStoreRender = false;
  let layoutMode: EditorLayoutMode = 'narrow';
  let layoutObserver: EditorLayoutObserver | undefined;
  let onRenderError = initialOptionsSnapshot.onRenderError;
  const activeExportControllers = new Set<AbortController>();

  const currentMessages = (): EditorMessages =>
    editorMessages(store.getSnapshot().config?.locale ?? 'zh-CN');

  const annotationValue = (view: ViewSpec, nodeId: ViewNodeId): string => {
    const value = Object.getOwnPropertyDescriptor(view.annotations, nodeId)?.value;
    return typeof value === 'string' ? value : '';
  };

  const groupSelectionKey = (selection: ValidGroupSelection): string =>
    JSON.stringify([selection.containerId, ...selection.nodeIds]);

  const reconcileInspectorDrafts = (snapshot: EditorStoreSnapshot): void => {
    if (snapshot.view === null || snapshot.config === null || snapshot.selection === null) {
      annotationDraft = null;
      groupLabelDraft = null;
      return;
    }

    if (annotationDraft !== null) {
      if (annotationDraft.nodeId !== snapshot.selection.nodeId) {
        annotationDraft = null;
      } else {
        const persisted = annotationValue(snapshot.view, annotationDraft.nodeId);
        if (
          (annotationDraft.submittedValue !== undefined &&
            persisted === annotationDraft.submittedValue) ||
          persisted !== annotationDraft.baseline
        ) {
          annotationDraft = null;
        }
      }
    }

    if (groupLabelDraft !== null) {
      const selection = evaluateGroupSelection(
        snapshot.config.data,
        snapshot.view,
        snapshot.selection.nodeIds,
      );
      if (!selection.ok || groupSelectionKey(selection) !== groupLabelDraft.selectionKey) {
        groupLabelDraft = null;
      }
    }
  };

  const captureFocusState = (control: HTMLElement, fallbackKey: string): FocusState => {
    const key = control.dataset['focusKey'] ?? fallbackKey;
    const supportsSelection =
      control.tagName === 'TEXTAREA' ||
      (control.tagName === 'INPUT' && (control as HTMLInputElement).type.toLowerCase() === 'text');
    return supportsSelection
      ? {
          key,
          selectionStart: (control as HTMLInputElement | HTMLTextAreaElement).selectionStart,
          selectionEnd: (control as HTMLInputElement | HTMLTextAreaElement).selectionEnd,
        }
      : { key };
  };

  const captureTransientState = (): void => {
    const active = document.activeElement;
    if (active !== null && transientLayer.contains(active)) {
      const control = active as HTMLElement;
      transientFocus = captureFocusState(control, 'dialog');
    }
    const scroll = transientLayer.querySelector<HTMLElement>('[data-transient-scroll]');
    if (scroll !== null) {
      transientScrollTop = scroll.scrollTop;
    }
  };

  const captureWorkbenchState = (): FocusState | null => {
    const active = document.activeElement;
    if (active === null || !root.contains(active) || transientLayer.contains(active)) {
      return null;
    }
    const control = active as HTMLElement;
    const scroll = control.closest<HTMLElement>('.tp-inspector-scroll');
    if (scroll !== null && workbench.contains(scroll)) {
      workbenchScrollTop = scroll.scrollTop;
    }
    return captureFocusState(control, 'root');
  };

  const restoreWorkbenchState = (state: FocusState | null): void => {
    focusRestoreVersion += 1;
    const version = focusRestoreVersion;
    if (state === null) {
      return;
    }
    queueMicrotask(() => {
      if (destroyed || version !== focusRestoreVersion || modalFocusTrap?.isTop() === true) {
        return;
      }
      const target =
        state.key === 'root'
          ? root
          : [
              ...toolbar.querySelectorAll<HTMLElement>('[data-focus-key]'),
              ...workbench.querySelectorAll<HTMLElement>('[data-focus-key]'),
            ].find(candidate => candidate.dataset['focusKey'] === state.key);
      const hiddenStaticPanel =
        layoutMode === 'narrow' &&
        target !== undefined &&
        target.closest('.tp-outline-static, .tp-inspector-static, .tp-panel-rail-static') !== null;
      const focusTarget =
        target === undefined || target.hasAttribute('disabled') || hiddenStaticPanel
          ? root
          : target;
      focusTarget.focus();
      if (
        typeof state.selectionStart === 'number' &&
        (focusTarget.tagName === 'TEXTAREA' ||
          (focusTarget.tagName === 'INPUT' &&
            (focusTarget as HTMLInputElement).type.toLowerCase() === 'text'))
      ) {
        (focusTarget as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(
          state.selectionStart,
          typeof state.selectionEnd === 'number' ? state.selectionEnd : state.selectionStart,
        );
      }
    });
  };

  const restoreTransientState = (trap: ModalFocusTrap, fallback: HTMLElement): void => {
    queueMicrotask(() => {
      if (destroyed || modalFocusTrap !== trap || !trap.isTop()) {
        return;
      }
      const focusTarget =
        transientFocus === null
          ? null
          : Array.from(transientLayer.querySelectorAll<HTMLElement>('[data-focus-key]')).find(
              candidate => candidate.dataset['focusKey'] === transientFocus?.key,
            );
      if (
        focusTarget === undefined ||
        focusTarget === null ||
        focusTarget.hasAttribute('disabled') ||
        focusTarget.closest('[inert], [hidden], [aria-hidden="true"]') !== null
      ) {
        trap.focusInitial(fallback);
        return;
      }
      focusTarget.focus();
      if (
        transientFocus !== null &&
        typeof transientFocus.selectionStart === 'number' &&
        (focusTarget.tagName === 'TEXTAREA' ||
          (focusTarget.tagName === 'INPUT' &&
            (focusTarget as HTMLInputElement).type.toLowerCase() === 'text'))
      ) {
        (focusTarget as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(
          transientFocus.selectionStart,
          typeof transientFocus.selectionEnd === 'number'
            ? transientFocus.selectionEnd
            : transientFocus.selectionStart,
        );
      }
    });
  };

  const nextActionId = (source: InteractionCommandSource): string => {
    const processedActionIds = store.getSnapshot().session?.processedActionIds ?? [];
    let id: string;
    do {
      actionCounter += 1;
      id = `tp-${source}-${actionCounter}`;
    } while (processedActionIds.includes(id) || acceptedActionIds.has(id));
    return id;
  };

  const rememberAcceptedAction = (result: CommandResult | null): CommandResult | null => {
    if (result?.ok === true) {
      acceptedActionIds.add(result.event.commandId);
    }
    return result;
  };

  const isHiddenStaticControl = (control: HTMLElement): boolean =>
    layoutMode === 'narrow' &&
    control.closest('.tp-outline-static, .tp-inspector-static, .tp-panel-rail-static') !== null;

  const focusNode = (nodeId: ViewNodeId): void => {
    rovingNodeId = nodeId;
    queueMicrotask(() => {
      if (destroyed) {
        return;
      }
      const row = Array.from(root.querySelectorAll<HTMLElement>('[data-node-id]')).find(
        candidate => candidate.dataset['nodeId'] === nodeId && !isHiddenStaticControl(candidate),
      );
      if (row !== undefined) {
        row.focus();
      } else {
        root.focus();
      }
    });
  };

  const focusDisclosure = (nodeId: ViewNodeId): void => {
    queueMicrotask(() => {
      if (destroyed) {
        return;
      }
      const disclosure = Array.from(root.querySelectorAll<HTMLElement>('[data-node-id]'))
        .find(
          candidate => candidate.dataset['nodeId'] === nodeId && !isHiddenStaticControl(candidate),
        )
        ?.querySelector<HTMLButtonElement>('.tp-disclosure-button');
      if (disclosure !== undefined && disclosure !== null) {
        disclosure.focus();
      } else {
        root.focus();
      }
    });
  };

  const setFeedback = (next: Feedback): void => {
    feedback = next;
    renderFeedback();
  };

  const readyFeedback = (): Feedback => ({
    code: 'READY',
    message: currentMessages().valid,
    tone: 'neutral',
  });

  const resetFeedback = (): void => setFeedback(readyFeedback());

  const dispatchInteraction = (
    command: EditorCommand,
    successMessage: string,
  ): CommandResult | null => {
    const messages = currentMessages();
    const result = rememberAcceptedAction(store.dispatch(command));
    if (result === null) {
      setFeedback({ code: 'READ_ONLY', message: messages.readOnlyReason, tone: 'error' });
      return null;
    }
    if (!result.ok) {
      setFeedback({
        code: result.error.code,
        message: commandFailureMessage(result.error.code, messages),
        tone: 'error',
        ...(command.source === 'host' ? {} : { source: command.source }),
      });
      return result;
    }
    setFeedback({
      code: result.event.type,
      message: successMessage,
      tone: 'success',
      ...(result.event.source === 'host' ? {} : { source: result.event.source }),
    });
    return result;
  };

  const moveNode = (
    nodeId: ViewNodeId,
    target: { readonly containerId: 'root' | GroupId; readonly index: number },
    source: InteractionCommandSource,
  ): boolean => {
    const snapshot = store.getSnapshot();
    if (snapshot.view === null) {
      return false;
    }
    return (
      dispatchInteraction(
        buildMoveNodeCommand({
          id: nextActionId(source),
          source,
          baseRevision: snapshot.view.revision,
          nodeId,
          target,
          viewSpec: snapshot.view,
        }),
        currentMessages().moveAccepted,
      )?.ok === true
    );
  };

  const toggleGroup = (
    groupId: GroupId,
    expanded: boolean,
    source: Extract<InteractionCommandSource, 'direct' | 'outline'>,
  ): boolean => {
    const view = store.getSnapshot().view;
    if (view === null) {
      return false;
    }
    const messages = currentMessages();
    return (
      dispatchInteraction(
        {
          schemaVersion: '1.0.0',
          id: nextActionId(source),
          type: expanded ? 'collapseGroup' : 'expandGroup',
          source,
          baseRevision: view.revision,
          payload: { groupId },
        },
        expanded ? messages.groupCollapsed : messages.groupExpanded,
      )?.ok === true
    );
  };

  const ungroup = (
    groupId: GroupId,
    source: Extract<InteractionCommandSource, 'direct' | 'outline'>,
  ): boolean => {
    const snapshot = store.getSnapshot();
    if (snapshot.view === null) {
      return false;
    }
    const firstChild = ownGroup(snapshot.view, groupId)?.childIds[0];
    const result = dispatchInteraction(
      {
        schemaVersion: '1.0.0',
        id: nextActionId(source),
        type: 'ungroup',
        source,
        baseRevision: snapshot.view.revision,
        payload: { groupId },
      },
      currentMessages().groupRemoved,
    );
    if (result?.ok === true && firstChild !== undefined) {
      const nextView = store.getSnapshot().view;
      if (nextView !== null) {
        store.select({
          nodeId: firstChild,
          nodeIds: [firstChild],
          sourceIds: [...collectLeafSourceIds(nextView, firstChild)],
        });
        focusNode(firstChild);
      }
    }
    return result?.ok === true;
  };

  const createGroup = (
    label: string,
    selection: GroupSelectionResult,
    initiallyCollapsed: boolean,
    source: Extract<InteractionCommandSource, 'direct' | 'outline'>,
  ): boolean => {
    const snapshot = store.getSnapshot();
    const messages = currentMessages();
    if (
      snapshot.view === null ||
      snapshot.config === null ||
      !selection.ok ||
      label.trim() === ''
    ) {
      setFeedback({
        code: 'GROUP_UNAVAILABLE',
        message:
          label.trim() === ''
            ? messages.groupLabelRequired
            : groupFailureMessage(selection, messages),
        tone: 'error',
      });
      return false;
    }
    let groupId: GroupId;
    do {
      actionCounter += 1;
      groupId = `tp-group-${snapshot.view.revision}-${actionCounter}`;
    } while (
      Object.hasOwn(snapshot.view.groups, groupId) ||
      snapshot.config.data.items.some(item => String(item.id) === String(groupId))
    );
    const result = dispatchInteraction(
      {
        schemaVersion: '1.0.0',
        id: nextActionId(source),
        type: 'createGroup',
        source,
        baseRevision: snapshot.view.revision,
        payload: {
          groupId,
          label: label.trim(),
          nodeIds: [...selection.nodeIds],
          initiallyCollapsed,
        },
      },
      messages.groupCreated,
    );
    if (result?.ok === true) {
      store.select({
        nodeId: groupId,
        nodeIds: [groupId],
        sourceIds: [...selection.sourceIds],
      });
      focusNode(groupId);
    }
    return result?.ok === true;
  };

  const selectNode = (nodeId: ViewNodeId): void => {
    const view = store.getSnapshot().view;
    if (view === null) {
      return;
    }
    store.select({
      nodeId,
      nodeIds: [nodeId],
      sourceIds: [...collectLeafSourceIds(view, nodeId)],
    });
  };

  const renderFeedback = (): void => {
    const source = feedback.source ?? null;
    if (
      feedbackElement.dataset['feedbackTone'] === feedback.tone &&
      feedbackElement.getAttribute('data-command-source') === source &&
      feedbackCodeElement.textContent === feedback.code &&
      feedbackMessageElement.textContent === feedback.message
    ) {
      return;
    }
    feedbackElement.dataset['feedbackTone'] = feedback.tone;
    setOptionalAttribute(feedbackElement, 'data-command-source', feedback.source);
    if (feedbackCodeElement.textContent !== feedback.code) {
      feedbackCodeElement.textContent = feedback.code;
    }
    if (feedbackMessageElement.textContent !== feedback.message) {
      feedbackMessageElement.textContent = feedback.message;
    }
  };

  const renderToolbar = (snapshot: EditorStoreSnapshot, messages: EditorMessages): void => {
    const show = snapshot.config?.editor?.panels?.toolbar ?? true;
    toolbar.hidden = !show;
    toolbar.setAttribute('aria-label', messages.toolbar);
    if (!show) {
      toolbar.replaceChildren();
      return;
    }
    const brand = element(document, 'div', { className: 'tp-brand-block' });
    brand.append(
      element(document, 'span', { className: 'tp-brand-mark', text: 'TellPlot' }),
      element(document, 'span', {
        className: 'tp-toolbar-divider',
        attributes: { 'aria-hidden': 'true' },
      }),
      element(document, 'span', {
        className: 'tp-dataset-title',
        text: snapshot.config?.data.datasetId ?? 'invalid',
      }),
    );
    const valid = snapshot.status === 'ready';
    const statusMessage = valid ? messages.validated : messages.invalidData;
    const status = element(document, 'div', {
      className: 'tp-toolbar-status',
      attributes: {
        title: statusMessage,
        'data-valid': valid ? 'true' : 'false',
      },
    });
    status.append(
      element(document, 'span', {
        className: 'tp-toolbar-status-icon',
        text: valid ? '✓' : '!',
        attributes: { 'aria-hidden': 'true' },
      }),
      element(document, 'span', { className: 'tp-toolbar-status-label', text: statusMessage }),
    );
    const actions = element(document, 'div', { className: 'tp-toolbar-actions' });
    const panels = snapshot.config?.editor?.panels;
    if (panels?.outline ?? true) {
      const openOutline = button(document, messages.openOutline, {
        className: 'tp-icon-button tp-outline-trigger',
        symbol: '☰',
      });
      openOutline.dataset['focusKey'] = 'toolbar-outline';
      openOutline.addEventListener('click', () => {
        chartSurface?.cancelInteraction();
        overlayReturnFocus = openOutline;
        overlay = 'outline';
        renderTransient();
      });
      actions.append(openOutline);
    }
    if (panels?.inspector ?? true) {
      const openInspector = button(document, messages.openInspector, {
        className: 'tp-icon-button tp-inspector-trigger',
        symbol: 'i',
      });
      openInspector.dataset['focusKey'] = 'toolbar-inspector';
      openInspector.addEventListener('click', () => {
        chartSurface?.cancelInteraction();
        overlayReturnFocus = openInspector;
        overlay = 'inspector';
        renderTransient();
      });
      actions.append(openInspector);
    }
    actions.append(
      element(document, 'span', {
        className: 'tp-action-divider',
        attributes: { 'aria-hidden': 'true' },
      }),
    );
    const undo = button(document, messages.undo, { className: 'tp-icon-button', symbol: '↶' });
    undo.dataset['focusKey'] = 'toolbar-undo';
    undo.disabled = !snapshot.canUndo || snapshot.readOnly;
    undo.title = undo.disabled
      ? snapshot.readOnly
        ? messages.readOnlyReason
        : messages.undoUnavailable
      : messages.undo;
    undo.addEventListener('click', () => handleHistory('undo'));
    const redo = button(document, messages.redo, { className: 'tp-icon-button', symbol: '↷' });
    redo.dataset['focusKey'] = 'toolbar-redo';
    redo.disabled = !snapshot.canRedo || snapshot.readOnly;
    redo.title = redo.disabled
      ? snapshot.readOnly
        ? messages.readOnlyReason
        : messages.redoUnavailable
      : messages.redo;
    redo.addEventListener('click', () => handleHistory('redo'));
    actions.append(undo, redo);
    toolbar.replaceChildren(brand, status, actions);
  };

  const normalizeSelection = (selection: SelectionState): SelectionState => {
    const snapshot = store.getSnapshot();
    if (snapshot.view === null || snapshot.config === null || selection.nodeIds.length < 2) {
      return selection;
    }
    const evaluated = evaluateGroupSelection(
      snapshot.config.data,
      snapshot.view,
      selection.nodeIds,
    );
    return evaluated.ok
      ? {
          nodeId: evaluated.nodeIds.includes(selection.nodeId)
            ? selection.nodeId
            : (evaluated.nodeIds.at(-1) ?? selection.nodeId),
          nodeIds: [...evaluated.nodeIds],
          sourceIds: [...evaluated.sourceIds],
        }
      : selection;
  };

  const selectEntry = (
    entry: OutlineEntry,
    entries: readonly OutlineEntry[],
    additive: boolean,
  ): void => {
    const snapshot = store.getSnapshot();
    if (!additive || entry.kind === 'anchor' || snapshot.selection === null) {
      store.select({
        nodeId: entry.nodeId,
        nodeIds: [entry.nodeId],
        sourceIds: [...entry.sourceIds],
      });
      return;
    }
    const selected = new Set(snapshot.selection.nodeIds);
    if (selected.has(entry.nodeId)) {
      selected.delete(entry.nodeId);
    } else {
      selected.add(entry.nodeId);
    }
    const orderedIds = entries.map(value => value.nodeId).filter(nodeId => selected.has(nodeId));
    const nodeIds = orderedIds.length === 0 ? [entry.nodeId] : orderedIds;
    store.select(
      normalizeSelection({
        nodeId: selected.has(entry.nodeId) ? entry.nodeId : (nodeIds.at(-1) ?? entry.nodeId),
        nodeIds,
        sourceIds: nodeIds.flatMap(nodeId =>
          snapshot.view === null ? [] : collectLeafSourceIds(snapshot.view, nodeId),
        ),
      }),
    );
  };

  const keyboardMove = (entry: OutlineEntry, direction: KeyboardMoveDirection): void => {
    const view = store.getSnapshot().view;
    if (view === null || entry.kind === 'anchor') {
      setFeedback({
        code: entry.locked ? 'ITEM_LOCKED' : 'INVALID_DROP_TARGET',
        message: entry.locked ? currentMessages().groupLocked : currentMessages().targetUnavailable,
        tone: 'error',
      });
      return;
    }
    const resolved = resolveKeyboardMoveTarget(view, entry.nodeId, direction);
    if (!resolved.ok) {
      setFeedback({
        code: 'INVALID_DROP_TARGET',
        message: currentMessages().targetUnavailable,
        tone: 'error',
      });
    } else {
      moveNode(entry.nodeId, resolved.target, 'keyboard');
    }
    focusNode(entry.nodeId);
  };

  const navigateOutline = (
    entry: OutlineEntry,
    entries: readonly OutlineEntry[],
    key: string,
  ): void => {
    const index = entries.findIndex(value => value.nodeId === entry.nodeId);
    let target: ViewNodeId | undefined;
    if (key === 'ArrowUp') {
      target = entries[index - 1]?.nodeId;
    } else if (key === 'ArrowDown') {
      target = entries[index + 1]?.nodeId;
    } else if (key === 'Home') {
      target = entries[0]?.nodeId;
    } else if (key === 'End') {
      target = entries.at(-1)?.nodeId;
    } else if (key === 'ArrowRight' && entry.expanded === false) {
      toggleGroup(entry.nodeId as GroupId, false, 'outline');
      target = entry.nodeId;
    } else if (key === 'ArrowRight' && entry.expanded === true) {
      target =
        entries[index + 1]?.level === entry.level + 1 ? entries[index + 1]?.nodeId : undefined;
    } else if (key === 'ArrowLeft' && entry.expanded === true) {
      toggleGroup(entry.nodeId as GroupId, true, 'outline');
      target = entry.nodeId;
    } else if (key === 'ArrowLeft') {
      target = [...entries.slice(0, index)]
        .reverse()
        .find(value => value.level < entry.level)?.nodeId;
    }
    if (target !== undefined) {
      focusNode(target);
    }
  };

  const startOutlineDrag = (event: PointerEvent, entry: OutlineEntry): void => {
    if (
      outlineDrag !== null ||
      event.button !== 0 ||
      entry.kind === 'anchor' ||
      entry.locked ||
      store.getSnapshot().readOnly
    ) {
      return;
    }
    outlineDrag = {
      pointerId: event.pointerId,
      itemId: entry.nodeId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      target: null,
    };
    event.preventDefault();
  };

  const renderOutline = (
    snapshot: EditorStoreSnapshot,
    chart: EditorChartProjection,
    messages: EditorMessages,
  ): HTMLElement => {
    const panel = element(document, 'div', { className: 'tp-panel-body' });
    const heading = element(document, 'div', { className: 'tp-panel-heading' });
    heading.append(
      element(document, 'h2', { text: messages.outline }),
      element(document, 'span', { text: `${chart.projection.length}` }),
    );
    const tree = element(document, 'div', {
      className: 'tp-outline-tree',
      attributes: { role: 'tree', 'aria-label': messages.outline, 'aria-multiselectable': 'true' },
    });
    const entries = outlineEntries(snapshot.view as ViewSpec, chart.projection, chart.family);
    if (rovingNodeId === null || !entries.some(entry => entry.nodeId === rovingNodeId)) {
      rovingNodeId = snapshot.selection?.nodeId ?? entries[0]?.nodeId ?? null;
    }
    for (const entry of entries) {
      const selected = snapshot.selection?.nodeIds.includes(entry.nodeId) === true;
      const row = element(document, 'div', {
        className: 'tp-outline-row',
        attributes: {
          role: 'treeitem',
          tabindex: entry.nodeId === rovingNodeId ? '0' : '-1',
          'aria-level': String(entry.level),
          'aria-selected': selected ? 'true' : 'false',
          'data-node-id': entry.nodeId,
          'data-node-kind': entry.kind,
          'data-level': String(entry.level),
          'data-selected': selected ? 'true' : 'false',
          'data-source-count': String(entry.sourceIds.length),
          'data-focus-key': `outline-row:${entry.nodeId}`,
          'data-draggable':
            !snapshot.readOnly && entry.kind !== 'anchor' && !entry.locked ? 'true' : 'false',
        },
      });
      if (entry.expanded !== undefined) {
        row.setAttribute('aria-expanded', String(entry.expanded));
      }
      const grip = button(document, messages.dragLabel(entry.label), {
        className: 'tp-row-grip',
        symbol: '⋮⋮',
      });
      grip.dataset['focusKey'] = `outline-grip:${entry.nodeId}`;
      grip.tabIndex = -1;
      grip.disabled = snapshot.readOnly || entry.kind === 'anchor' || entry.locked;
      grip.addEventListener('pointerdown', event => startOutlineDrag(event, entry));
      const selectControl = element(document, 'span', {
        className: entry.kind === 'anchor' ? 'tp-row-select-placeholder' : 'tp-row-select-control',
      });
      if (entry.kind !== 'anchor') {
        const checkbox = element(document, 'input', {
          className: 'tp-row-select',
          attributes: {
            type: 'checkbox',
            'aria-label': messages.selectLabel(entry.label),
            'data-focus-key': `outline-checkbox:${entry.nodeId}`,
          },
        });
        checkbox.checked = selected;
        checkbox.addEventListener('click', event => event.stopPropagation());
        checkbox.addEventListener('change', () => selectEntry(entry, entries, true));
        selectControl.append(checkbox);
      }
      const disclosure = element(document, 'span', { className: 'tp-row-disclosure' });
      if (entry.expanded !== undefined) {
        const control = button(
          document,
          entry.expanded ? messages.collapseGroup(entry.label) : messages.expandGroup(entry.label),
          { className: 'tp-disclosure-button', symbol: entry.expanded ? '⌄' : '›' },
        );
        control.disabled = snapshot.readOnly;
        control.setAttribute('aria-expanded', String(entry.expanded));
        control.dataset['focusKey'] = `outline-disclosure:${entry.nodeId}`;
        control.addEventListener('click', event => {
          event.stopPropagation();
          if (toggleGroup(entry.nodeId as GroupId, entry.expanded === true, 'outline')) {
            focusDisclosure(entry.nodeId);
          }
        });
        disclosure.append(control);
      }
      const main = element(document, 'span', { className: 'tp-row-main' });
      main.append(element(document, 'span', { className: 'tp-row-label', text: entry.label }));
      if (entry.groupSize !== undefined) {
        main.append(
          element(document, 'span', {
            className: 'tp-row-meta',
            text: `${entry.groupSize} ${messages.groupedItems}`,
          }),
        );
      }
      const value = element(document, 'span', {
        className: 'tp-row-value',
        text:
          entry.amount === null
            ? `${entry.sourceIds.length} ${messages.sourceItems}`
            : formatAmount(
                entry.amount,
                snapshot.config?.locale ?? 'zh-CN',
                snapshot.config?.data.currency,
              ),
      });
      const lock = element(document, 'span', {
        className: entry.locked ? 'tp-row-lock' : 'tp-row-lock-placeholder',
        text: entry.locked ? 'L' : '',
        attributes: entry.locked ? { 'aria-label': messages.locked } : { 'aria-hidden': 'true' },
      });
      row.append(grip, selectControl, disclosure, main, value, lock);
      row.addEventListener('pointerdown', event => {
        if (isRowControl(event.target)) {
          return;
        }
        startOutlineDrag(event, entry);
      });
      row.addEventListener('click', event => {
        if (isRowControl(event.target)) {
          return;
        }
        rovingNodeId = entry.nodeId;
        row.focus();
        selectEntry(entry, entries, event.ctrlKey || event.metaKey);
        focusNode(entry.nodeId);
      });
      row.addEventListener('focus', () => {
        rovingNodeId = entry.nodeId;
      });
      row.addEventListener('keydown', event => {
        if (event.target !== row) {
          return;
        }
        if (event.altKey) {
          const direction: KeyboardMoveDirection | undefined =
            event.key === 'ArrowUp'
              ? 'before'
              : event.key === 'ArrowDown'
                ? 'after'
                : event.key === 'ArrowRight'
                  ? 'into'
                  : event.key === 'ArrowLeft'
                    ? 'out'
                    : undefined;
          if (direction !== undefined) {
            event.preventDefault();
            keyboardMove(entry, direction);
          }
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectEntry(entry, entries, event.ctrlKey || event.metaKey);
        } else if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
        ) {
          event.preventDefault();
          navigateOutline(entry, entries, event.key);
        }
      });
      tree.append(row);
    }
    panel.append(heading, tree);
    return panel;
  };

  const renderInspector = (
    snapshot: EditorStoreSnapshot,
    chart: EditorChartProjection,
    messages: EditorMessages,
    context: 'static' | 'overlay' = 'static',
  ): HTMLElement => {
    const panel = element(document, 'div', { className: 'tp-panel-body tp-inspector-body' });
    const heading = element(document, 'div', { className: 'tp-panel-heading' });
    heading.append(
      element(document, 'h2', { text: messages.inspector }),
      element(document, 'span', {
        className: 'tp-revision',
        text: `R${snapshot.view?.revision ?? 0}`,
      }),
    );
    const scroll = element(document, 'div', { className: 'tp-inspector-scroll' });
    if (context === 'overlay') {
      scroll.dataset['transientScroll'] = 'inspector';
      scroll.scrollTop = transientScrollTop;
    } else {
      scroll.scrollTop = workbenchScrollTop;
    }
    const selection = snapshot.selection;
    const selected = selection === null ? undefined : projectionDatum(chart, selection.nodeId);
    const selectedGroup =
      selection === null || snapshot.view === null
        ? undefined
        : ownGroup(snapshot.view, selection.nodeId);
    const details = element(document, 'section', { className: 'tp-inspector-section' });
    details.append(
      element(document, 'div', {
        className: 'tp-section-kicker',
        text: selection === null ? messages.validation : messages.selectedItem,
      }),
      element(document, 'strong', {
        text:
          selection === null
            ? messages.valid
            : (selected?.label ?? selectedGroup?.label ?? selection.nodeId),
      }),
    );
    if (selected !== undefined) {
      details.append(
        element(document, 'span', {
          className: 'tp-inspector-amount',
          text: formatAmount(
            selected.amount,
            snapshot.config?.locale ?? 'zh-CN',
            snapshot.config?.data.currency,
          ),
        }),
      );
    }
    const metrics = element(document, 'dl', { className: 'tp-metric-list' });
    const appendMetric = (label: string, value: string): void => {
      const line = element(document, 'div');
      line.append(
        element(document, 'dt', { text: label }),
        element(document, 'dd', { text: value }),
      );
      metrics.append(line);
    };
    if (selection === null) {
      appendMetric(messages.dataset, snapshot.config?.data.datasetId ?? '');
      appendMetric(messages.sourceCount, String(snapshot.config?.data.items.length ?? 0));
      appendMetric(messages.revision, String(snapshot.view?.revision ?? 0));
    } else {
      appendMetric(messages.sourceCount, String(selection.sourceIds.length));
      appendMetric(
        selected?.locked === true ? messages.locked : messages.editable,
        selected?.locked === true ? messages.locked : messages.editable,
      );
    }
    details.append(metrics);
    scroll.append(details);

    if (selection !== null && snapshot.view !== null) {
      const persistedAnnotation = annotationValue(snapshot.view, selection.nodeId);
      const draftAnnotation =
        annotationDraft?.nodeId === selection.nodeId ? annotationDraft.value : persistedAnnotation;
      const field = element(document, 'section', {
        className: 'tp-inspector-section tp-annotation-field',
      });
      const fieldId = `${instanceId}-${context}-annotation-${selection.nodeId.replace(/[^A-Za-z0-9_-]/gu, '-')}`;
      const label = element(document, 'label', {
        className: 'tp-field-label',
        text: messages.annotation,
        attributes: { for: fieldId },
      });
      const textarea = element(document, 'textarea', {
        className: 'tp-text-input tp-text-area',
        attributes: {
          id: fieldId,
          placeholder: messages.annotationPlaceholder,
          'data-focus-key': `annotation:${selection.nodeId}`,
        },
      });
      textarea.value = draftAnnotation;
      textarea.readOnly = snapshot.readOnly;
      const footer = element(document, 'div', { className: 'tp-annotation-footer' });
      const count = element(document, 'span', { className: 'tp-annotation-count' });
      const save = button(document, messages.saveAnnotation, { className: 'tp-command-button' });
      const updateAnnotationState = (): void => {
        const length = Array.from(textarea.value).length;
        count.textContent = `${length} / 500`;
        count.dataset['invalid'] = length > 500 ? 'true' : 'false';
        save.disabled =
          snapshot.readOnly ||
          length > 500 ||
          textarea.value === persistedAnnotation ||
          (annotationDraft?.nodeId === selection.nodeId &&
            annotationDraft.submittedValue === textarea.value);
      };
      textarea.addEventListener('input', () => {
        annotationDraft = {
          nodeId: selection.nodeId,
          value: textarea.value,
          baseline: persistedAnnotation,
        };
        updateAnnotationState();
      });
      save.addEventListener('click', () => {
        const view = store.getSnapshot().view;
        if (view === null || Array.from(textarea.value).length > 500) {
          return;
        }
        const text = textarea.value.trim() === '' ? null : textarea.value;
        const submittedValue = text ?? '';
        annotationDraft = {
          nodeId: selection.nodeId,
          value: textarea.value,
          baseline: persistedAnnotation,
          submittedValue,
        };
        const result = dispatchInteraction(
          {
            schemaVersion: '1.0.0',
            id: nextActionId('direct'),
            type: 'setAnnotation',
            source: 'direct',
            baseRevision: view.revision,
            payload: { nodeId: selection.nodeId, text },
          },
          text === null ? messages.annotationRemoved : messages.annotationSaved,
        );
        if (
          result?.ok !== true &&
          annotationDraft?.nodeId === selection.nodeId &&
          annotationDraft.submittedValue === submittedValue
        ) {
          annotationDraft = {
            nodeId: selection.nodeId,
            value: textarea.value,
            baseline: persistedAnnotation,
          };
        }
      });
      save.dataset['focusKey'] = `annotation-save:${selection.nodeId}`;
      updateAnnotationState();
      footer.append(count, save);
      field.append(label, textarea, footer);
      scroll.append(field);

      const groupSelection =
        snapshot.config === null
          ? ({ ok: false, reason: 'GROUP_TOO_SMALL' } as const)
          : evaluateGroupSelection(snapshot.config.data, snapshot.view, selection.nodeIds);
      if (groupSelection.ok || selectedGroup !== undefined) {
        const groupActions = element(document, 'section', {
          className: 'tp-inspector-section tp-group-actions',
        });
        if (groupSelection.ok) {
          const selectionKey = groupSelectionKey(groupSelection);
          const groupId = `${instanceId}-${context}-group-label`;
          const groupLabel = element(document, 'label', {
            className: 'tp-field-label',
            text: messages.groupLabel,
            attributes: { for: groupId },
          });
          const input = element(document, 'input', {
            className: 'tp-text-input',
            attributes: {
              id: groupId,
              type: 'text',
              'data-focus-key': `group-label:${selectionKey}`,
            },
          });
          input.value = groupLabelDraft?.selectionKey === selectionKey ? groupLabelDraft.value : '';
          input.readOnly = snapshot.readOnly;
          const create = button(document, messages.createGroup, { className: 'tp-command-button' });
          create.disabled = snapshot.readOnly || input.value.trim() === '';
          create.dataset['focusKey'] = `create-group:${selectionKey}`;
          input.addEventListener('input', () => {
            groupLabelDraft = { selectionKey, value: input.value };
            create.disabled = snapshot.readOnly || input.value.trim() === '';
          });
          create.addEventListener('click', () => {
            if (createGroup(input.value, groupSelection, false, 'outline')) {
              groupLabelDraft = null;
            }
          });
          groupActions.append(groupLabel, input, create);
        }
        if (selectedGroup !== undefined) {
          const remove = button(document, messages.ungroup, {
            className: 'tp-command-button tp-command-button-secondary',
          });
          remove.dataset['focusKey'] = `ungroup:${selectedGroup.id}`;
          remove.disabled = snapshot.readOnly;
          remove.addEventListener('click', () => ungroup(selectedGroup.id, 'outline'));
          groupActions.append(remove);
        }
        scroll.append(groupActions);
      }
    }
    panel.append(heading, scroll);
    return panel;
  };

  const renderPanel = (
    kind: 'outline' | 'inspector',
    snapshot: EditorStoreSnapshot,
    chart: EditorChartProjection,
    messages: EditorMessages,
  ): HTMLElement => {
    const aside = element(document, 'aside', {
      className: `tp-static-panel tp-${kind}-static`,
      attributes: { 'aria-label': kind === 'outline' ? messages.outline : messages.inspector },
    });
    if (kind === 'inspector') {
      aside.setAttribute('role', 'complementary');
    }
    aside.append(
      kind === 'outline'
        ? renderOutline(snapshot, chart, messages)
        : renderInspector(snapshot, chart, messages),
    );
    return aside;
  };

  const renderTabbedPanel = (
    snapshot: EditorStoreSnapshot,
    chart: EditorChartProjection,
    messages: EditorMessages,
    side: 'left' | 'right',
  ): HTMLElement => {
    const available = [
      ...((snapshot.config?.editor?.panels?.outline ?? true) ? (['outline'] as const) : []),
      ...((snapshot.config?.editor?.panels?.inspector ?? true) ? (['inspector'] as const) : []),
    ];
    if (!available.includes(activeTab)) {
      activeTab = available[0] ?? 'outline';
    }
    const aside = element(document, 'aside', {
      className: 'tp-static-panel tp-panel-rail-static tp-panel-rail-static--tabbed',
      attributes: {
        'data-side': side,
        'aria-label': `${messages.outline} / ${messages.inspector}`,
      },
    });
    const tabs = element(document, 'div', {
      className: 'tp-panel-tabs',
      attributes: { role: 'tablist', 'aria-label': `${messages.outline} / ${messages.inspector}` },
    });
    for (const kind of available) {
      const label = kind === 'outline' ? messages.outline : messages.inspector;
      const tab = element(document, 'button', {
        text: label,
        attributes: {
          type: 'button',
          role: 'tab',
          'aria-selected': kind === activeTab ? 'true' : 'false',
          tabindex: kind === activeTab ? '0' : '-1',
          'data-focus-key': `panel-tab:${kind}`,
        },
      });
      tab.addEventListener('click', () => {
        activeTab = kind;
        render();
      });
      tabs.append(tab);
    }
    tabs.addEventListener('keydown', event => {
      const controls = Array.from(tabs.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      const currentIndex = controls.findIndex(control => control === event.target);
      if (currentIndex < 0 || controls.length === 0) {
        return;
      }
      const nextIndex =
        event.key === 'ArrowLeft'
          ? (currentIndex - 1 + controls.length) % controls.length
          : event.key === 'ArrowRight'
            ? (currentIndex + 1) % controls.length
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? controls.length - 1
                : undefined;
      if (nextIndex === undefined) {
        return;
      }
      event.preventDefault();
      const nextKind = available[nextIndex];
      if (nextKind === undefined) {
        return;
      }
      activeTab = nextKind;
      render();
      queueMicrotask(() => {
        root
          .querySelector<HTMLElement>(
            `.tp-panel-rail-static[data-side="${side}"] [role="tab"][aria-selected="true"]`,
          )
          ?.focus();
      });
    });
    const content = element(document, 'div', {
      className: 'tp-panel-tab-content',
      attributes: {
        role: 'tabpanel',
        'aria-label': activeTab === 'outline' ? messages.outline : messages.inspector,
      },
    });
    content.append(
      activeTab === 'outline'
        ? renderOutline(snapshot, chart, messages)
        : renderInspector(snapshot, chart, messages),
    );
    aside.append(tabs, content);
    return aside;
  };

  const renderInvalid = (snapshot: EditorStoreSnapshot, messages: EditorMessages): void => {
    const stage = element(document, 'section', {
      className: 'tp-invalid-stage',
      attributes: { role: 'alert' },
    });
    stage.append(element(document, 'div', { className: 'tp-invalid-mark', text: '!' }));
    const body = element(document, 'div');
    body.append(element(document, 'h2', { text: messages.invalidData }));
    const list = element(document, 'ul');
    for (const issue of snapshot.issues) {
      const item = element(document, 'li');
      item.append(
        element(document, 'strong', { text: issue.code }),
        element(document, 'code', { text: issue.path }),
      );
      list.append(item);
    }
    body.append(list);
    stage.append(body);
    workbench.className = 'tp-workbench tp-workbench-invalid';
    workbench.replaceChildren(stage);
  };

  const renderTransient = (): void => {
    const desiredKind: ModalKind | null = pendingGroup !== null ? 'group' : overlay;
    const reusableTrap =
      desiredKind !== null && modalKind === desiredKind ? modalFocusTrap : undefined;
    const reusableWasTop = reusableTrap?.isTop() ?? false;
    if (reusableTrap !== undefined) {
      captureTransientState();
    } else {
      if (modalKind === 'inspector' && desiredKind !== 'inspector') {
        annotationDraft = null;
        groupLabelDraft = null;
      }
      modalFocusTrap?.deactivate();
      modalFocusTrap = undefined;
      modalKind = null;
      transientFocus = null;
      transientScrollTop = 0;
    }
    transientLayer.replaceChildren();
    root.removeAttribute('data-overlay-open');
    const snapshot = store.getSnapshot();
    if (snapshot.view === null || snapshot.config === null || snapshot.status !== 'ready') {
      reusableTrap?.deactivate();
      modalFocusTrap = undefined;
      modalKind = null;
      return;
    }
    const panels = snapshot.config.editor?.panels;
    const modalDisabled =
      (desiredKind === 'outline' && !(panels?.outline ?? true)) ||
      (desiredKind === 'inspector' && !(panels?.inspector ?? true));
    if (modalDisabled) {
      overlay = null;
      reusableTrap?.deactivate();
      modalFocusTrap = undefined;
      modalKind = null;
      transientFocus = null;
      transientScrollTop = 0;
      if (desiredKind === 'inspector') {
        annotationDraft = null;
        groupLabelDraft = null;
      }
      if (reusableWasTop) {
        queueMicrotask(() => root.focus());
      }
      return;
    }
    const projection = projectEditorChart(snapshot.config, snapshot.view);
    if (!projection.ok) {
      reusableTrap?.deactivate();
      modalFocusTrap = undefined;
      modalKind = null;
      return;
    }
    const messages = currentMessages();
    if (desiredKind === 'outline' || desiredKind === 'inspector') {
      root.dataset['overlayOpen'] = 'true';
      const layer = element(document, 'div', {
        className: 'tp-overlay-layer',
        attributes: { 'data-side': desiredKind === 'outline' ? 'left' : 'right' },
      });
      const close = (): void => {
        const closingOverlay = desiredKind;
        const returnFocus = overlayReturnFocus;
        overlay = null;
        if (closingOverlay === 'inspector') {
          annotationDraft = null;
          groupLabelDraft = null;
        }
        renderTransient();
        overlayReturnFocus = null;
        queueMicrotask(() => {
          const currentTrigger = root.querySelector<HTMLElement>(
            closingOverlay === 'outline' ? '.tp-outline-trigger' : '.tp-inspector-trigger',
          );
          if (currentTrigger !== null) {
            currentTrigger.focus();
          } else if (returnFocus?.isConnected === true) {
            returnFocus.focus();
          } else {
            root.focus();
          }
        });
      };
      const overlayLabel = desiredKind === 'outline' ? messages.outline : messages.inspector;
      const scrim = button(document, messages.backdrop(overlayLabel), {
        className: 'tp-overlay-scrim',
      });
      scrim.addEventListener('click', close);
      const dialog = element(document, 'section', {
        className: 'tp-panel-overlay',
        attributes: {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': desiredKind === 'outline' ? messages.outline : messages.inspector,
          tabindex: '-1',
          'data-focus-key': 'dialog',
        },
      });
      const closeButton = button(
        document,
        desiredKind === 'outline' ? messages.closeOutline : messages.closeInspector,
        {
          className: 'tp-icon-button tp-overlay-close',
          symbol: '×',
        },
      );
      closeButton.dataset['focusKey'] = 'close';
      closeButton.addEventListener('click', close);
      dialog.append(
        closeButton,
        desiredKind === 'outline'
          ? renderOutline(snapshot, projection.value, messages)
          : renderInspector(snapshot, projection.value, messages, 'overlay'),
      );
      layer.append(scrim, dialog);
      transientLayer.append(layer);
      if (reusableTrap !== undefined) {
        reusableTrap.update(dialog, close, layer);
        modalFocusTrap = reusableTrap;
        modalKind = desiredKind;
        restoreTransientState(reusableTrap, closeButton);
      } else {
        const trap = activateModalFocus(document, dialog, close, layer);
        modalFocusTrap = trap;
        modalKind = desiredKind;
        queueMicrotask(() => {
          if (!destroyed && modalFocusTrap === trap) {
            trap.focusInitial(closeButton);
          }
        });
      }
      return;
    }

    if (desiredKind === 'group' && pendingGroup !== null) {
      root.dataset['overlayOpen'] = 'true';
      const layer = element(document, 'div', { className: 'tp-group-dialog-layer' });
      const form = element(document, 'form', {
        className: 'tp-group-dialog',
        attributes: {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': messages.groupDialogTitle,
          tabindex: '-1',
          'data-focus-key': 'dialog',
        },
      });
      form.append(element(document, 'h2', { text: messages.groupDialogTitle }));
      const parentLabel =
        pendingGroup.containerId === 'root'
          ? null
          : (ownGroup(snapshot.view, pendingGroup.containerId)?.label ?? null);
      form.append(
        element(document, 'p', {
          className: 'tp-group-dialog-scope',
          text: messages.groupSelectionSummary(
            pendingGroup.mode,
            parentLabel,
            pendingGroup.nodeIds.length,
            pendingGroup.sourceIds.length,
          ),
          attributes: { 'data-selection-mode': pendingGroup.mode },
        }),
      );
      const inputId = `${instanceId}-direct-group`;
      form.append(
        element(document, 'label', { text: messages.groupLabel, attributes: { for: inputId } }),
      );
      const input = element(document, 'input', {
        className: 'tp-text-input',
        attributes: { id: inputId, type: 'text', 'data-focus-key': 'direct-group-label' },
      });
      input.value = pendingGroupLabel;
      input.readOnly = snapshot.readOnly;
      const close = (): void => {
        const returnFocus = pendingGroupReturnFocus;
        const returnNodeId = pendingGroupReturnNodeId;
        pendingGroup = null;
        pendingGroupLabel = '';
        pendingGroupReturnFocus = null;
        pendingGroupReturnNodeId = null;
        renderTransient();
        queueMicrotask(() => {
          const row =
            returnNodeId === null
              ? undefined
              : Array.from(root.querySelectorAll<HTMLElement>('[data-node-id]')).find(
                  candidate =>
                    candidate.dataset['nodeId'] === returnNodeId &&
                    !isHiddenStaticControl(candidate),
                );
          if (row !== undefined) {
            row.focus();
          } else if (returnFocus?.isConnected === true && root.contains(returnFocus)) {
            returnFocus.focus();
          } else {
            root.focus();
          }
        });
      };
      const buttons = element(document, 'div', { className: 'tp-group-dialog-actions' });
      const cancel = button(document, messages.cancel, {
        className: 'tp-command-button tp-command-button-secondary',
      });
      cancel.dataset['focusKey'] = 'direct-group-cancel';
      cancel.addEventListener('click', close);
      const create = button(document, messages.createGroup, { className: 'tp-command-button' });
      create.dataset['focusKey'] = 'direct-group-create';
      create.type = 'submit';
      create.disabled = true;
      input.addEventListener('input', () => {
        pendingGroupLabel = input.value;
        create.disabled = snapshot.readOnly || input.value.trim() === '';
      });
      create.disabled = snapshot.readOnly || input.value.trim() === '';
      buttons.append(cancel, create);
      form.append(input, buttons);
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!snapshot.readOnly && pendingGroup !== null) {
          const selection = pendingGroup;
          pendingGroup = null;
          pendingGroupLabel = '';
          pendingGroupReturnFocus = null;
          pendingGroupReturnNodeId = null;
          if (!createGroup(input.value, selection, true, 'direct')) {
            pendingGroup = selection;
            pendingGroupLabel = input.value;
            renderTransient();
          }
        }
      });
      const scrim = button(document, messages.backdrop(messages.groupDialogTitle), {
        className: 'tp-overlay-scrim',
      });
      scrim.addEventListener('click', close);
      layer.append(scrim, form);
      transientLayer.append(layer);
      if (reusableTrap !== undefined) {
        reusableTrap.update(form, close, layer);
        modalFocusTrap = reusableTrap;
        modalKind = 'group';
        restoreTransientState(reusableTrap, input);
      } else {
        const trap = activateModalFocus(document, form, close, layer);
        modalFocusTrap = trap;
        modalKind = 'group';
        queueMicrotask(() => {
          if (!destroyed && modalFocusTrap === trap) {
            trap.focusInitial(input);
          }
        });
      }
    }
  };

  const renderReady = (
    snapshot: EditorStoreSnapshot,
    chart: EditorChartProjection,
    messages: EditorMessages,
  ): void => {
    if (chartSurface === undefined) {
      chartSurface = createChartSurface(document, {
        onMove: (nodeId, target) => moveNode(nodeId, target, 'direct'),
        onSelect: selectNode,
        onMarqueeSelection: nodeIds => {
          const currentSnapshot = store.getSnapshot();
          if (currentSnapshot.view === null || currentSnapshot.config === null) {
            return;
          }
          const selection = evaluateGroupSelection(
            currentSnapshot.config.data,
            currentSnapshot.view,
            nodeIds,
          );
          if (!selection.ok) {
            setFeedback({
              code: 'GROUP_UNAVAILABLE',
              message: groupFailureMessage(selection, currentMessages()),
              tone: 'error',
            });
            return;
          }
          const activeElement =
            ownerWindow !== null && document.activeElement instanceof ownerWindow.HTMLElement
              ? document.activeElement
              : null;
          pendingGroupReturnFocus = activeElement;
          pendingGroupReturnNodeId =
            (activeElement?.closest<HTMLElement>('[data-node-id]')?.dataset['nodeId'] as
              ViewNodeId | undefined) ?? null;
          pendingGroupLabel = '';
          overlay = null;
          overlayReturnFocus = null;
          chartSurface?.cancelInteraction();
          store.select({
            nodeId: selection.nodeIds.at(-1) ?? (selection.nodeIds[0] as ViewNodeId),
            nodeIds: [...selection.nodeIds],
            sourceIds: [...selection.sourceIds],
          });
          pendingGroup = selection;
          renderTransient();
        },
        onToggleGroup: (groupId, expanded) => toggleGroup(groupId, expanded, 'direct'),
        onUngroup: groupId => ungroup(groupId, 'direct'),
        onInteractionChange: preview => {
          if (outlineDrag !== null) {
            return;
          }
          root.dataset['interactionState'] = preview.state;
          applyDirectChartPreview(preview);
          if (preview.state === 'idle') {
            root.removeAttribute('data-interaction-source');
            applyOutlineDropPreview(null);
            if (feedback.code === 'MOVE_PENDING') {
              resetFeedback();
            }
            return;
          }
          root.dataset['interactionSource'] = 'direct';
          if (preview.state === 'dragging') {
            applyOutlineDropPreview(preview.target);
            setFeedback({
              code: 'MOVE_PENDING',
              message: currentMessages().moveInProgress,
              tone: 'neutral',
              source: 'direct',
            });
          }
        },
        onInteractionAbort: () => {
          root.dataset['interactionState'] = 'idle';
          root.removeAttribute('data-interaction-source');
          applyOutlineDropPreview(null);
          setFeedback({
            code: 'CHART_RENDER_ERROR',
            message: currentMessages().chartRenderFailed,
            tone: 'error',
          });
        },
        onCancel: reason => {
          setFeedback({
            code:
              reason === 'item-locked'
                ? 'ITEM_LOCKED'
                : reason === 'cancelled'
                  ? 'ACTION_CANCELLED'
                  : 'INVALID_DROP_TARGET',
            message:
              reason === 'item-locked'
                ? currentMessages().groupLocked
                : reason === 'cancelled'
                  ? currentMessages().actionCancelled
                  : currentMessages().targetUnavailable,
            tone: reason === 'cancelled' ? 'neutral' : 'error',
          });
        },
        onRenderError: issue => {
          if (issue === null && feedback.code === 'CHART_RENDER_ERROR') {
            resetFeedback();
          }
          try {
            onRenderError?.(issue);
          } catch {
            // Host callbacks cannot interrupt renderer recovery.
          }
        },
      });
      chartSurface.setLayoutMode(layoutMode);
    }
    chartSurface.update({
      config: snapshot.config as NonNullable<typeof snapshot.config>,
      view: snapshot.view as ViewSpec,
      chart,
      messages,
    });

    const panels = snapshot.config?.editor?.panels;
    const showOutline = panels?.outline ?? true;
    const showInspector = panels?.inspector ?? true;
    const placement = snapshot.config?.editor?.outline?.placement ?? 'left';
    const inspectorMode = snapshot.config?.editor?.inspector?.mode ?? 'static';
    let left: HTMLElement | undefined;
    let right: HTMLElement | undefined;
    let leftKind = 'none';
    let rightKind = 'none';
    if (inspectorMode === 'tabs' && (showOutline || showInspector)) {
      const rail = renderTabbedPanel(snapshot, chart, messages, placement);
      if (placement === 'left') {
        left = rail;
        leftKind = showOutline && showInspector ? 'tabs' : showOutline ? 'outline' : 'inspector';
      } else {
        right = rail;
        rightKind = showOutline && showInspector ? 'tabs' : showOutline ? 'outline' : 'inspector';
      }
    } else {
      if (placement === 'left') {
        if (showOutline) {
          left = renderPanel('outline', snapshot, chart, messages);
          leftKind = 'outline';
        }
        if (showInspector) {
          right = renderPanel('inspector', snapshot, chart, messages);
          rightKind = 'inspector';
        }
      } else {
        if (showInspector) {
          left = renderPanel('inspector', snapshot, chart, messages);
          leftKind = 'inspector';
        }
        if (showOutline) {
          right = renderPanel('outline', snapshot, chart, messages);
          rightKind = 'outline';
        }
      }
    }
    workbench.className = 'tp-workbench';
    workbench.dataset['outlinePlacement'] = placement;
    workbench.dataset['inspectorMode'] = inspectorMode;
    workbench.dataset['leftPanel'] = leftKind;
    workbench.dataset['rightPanel'] = rightKind;
    workbench.replaceChildren(
      ...(left === undefined ? [] : [left]),
      chartSurface.element,
      ...(right === undefined ? [] : [right]),
    );
  };

  function render(): void {
    if (destroyed || rendering) {
      return;
    }
    const preservedFocus = captureWorkbenchState();
    rendering = true;
    try {
      const snapshot = store.getSnapshot();
      reconcileInspectorDrafts(snapshot);
      const messages = currentMessages();
      renderToolbar(snapshot, messages);
      const empty =
        snapshot.status === 'ready' &&
        snapshot.config !== null &&
        (snapshot.config.data.schemaVersion === '2.0.0' &&
        snapshot.config.data.dataKind === 'categorical'
          ? snapshot.config.data.items.length === 0
          : !snapshot.config.data.items.some(
              item => 'kind' in item && item.kind === 'contribution',
            ));
      root.dataset['editorState'] =
        snapshot.status !== 'ready' ? 'invalid' : empty ? 'empty' : 'ready';
      if (outlineDrag === null) {
        root.dataset['interactionState'] = 'idle';
        root.removeAttribute('data-interaction-source');
      }
      root.dataset['readOnly'] = snapshot.readOnly ? 'true' : 'false';
      root.dataset['viewRevision'] = String(snapshot.view?.revision ?? -1);
      root.dataset['toolbarVisible'] =
        (snapshot.config?.editor?.panels?.toolbar ?? true) ? 'true' : 'false';
      root.dataset['outlinePlacement'] = snapshot.config?.editor?.outline?.placement ?? 'left';
      root.dataset['inspectorMode'] = snapshot.config?.editor?.inspector?.mode ?? 'static';
      const height = snapshot.config?.height;
      root.style.height =
        typeof height === 'number' ? `${Math.max(480, height)}px` : (height ?? '680px');
      if (snapshot.view === null || snapshot.config === null || snapshot.status !== 'ready') {
        root.dataset['chartType'] = snapshot.config?.type ?? 'invalid';
        feedback = { code: 'INVALID_DATA', message: messages.invalidData, tone: 'error' };
        renderFeedback();
        renderInvalid(snapshot, messages);
      } else {
        const projected = projectEditorChart(snapshot.config, snapshot.view);
        if (!projected.ok) {
          root.dataset['chartType'] = snapshot.config.type;
          feedback = { code: 'INVALID_DATA', message: messages.invalidData, tone: 'error' };
          renderFeedback();
          renderInvalid({ ...snapshot, issues: projected.errors }, messages);
        } else {
          root.dataset['chartType'] = projected.value.chartType;
          if (feedback.code === 'READY') {
            feedback = { code: 'READY', message: messages.valid, tone: 'neutral' };
          }
          renderFeedback();
          renderReady(snapshot, projected.value, messages);
        }
      }
      renderTransient();
      editorRenderFailed = false;
      restoreWorkbenchState(preservedFocus);
    } finally {
      rendering = false;
    }
  }

  const handleHistory = (direction: 'undo' | 'redo'): CommandResult | null => {
    const snapshot = store.getSnapshot();
    if (snapshot.view === null) {
      return null;
    }
    const action: SessionActionMeta = {
      id: nextActionId('direct'),
      source: 'direct',
      baseRevision: snapshot.view.revision,
    };
    const result = rememberAcceptedAction(
      direction === 'undo' ? store.undo(action) : store.redo(action),
    );
    const messages = currentMessages();
    if (result === null) {
      setFeedback({ code: 'READ_ONLY', message: messages.readOnlyReason, tone: 'error' });
    } else if (!result.ok) {
      setFeedback({
        code: result.error.code,
        message: commandFailureMessage(result.error.code, messages),
        tone: 'error',
      });
    } else {
      setFeedback({
        code: result.event.type,
        message: direction === 'undo' ? messages.undoAccepted : messages.redoAccepted,
        tone: 'success',
        source: 'direct',
      });
    }
    return result;
  };

  const clearOutlineDropPreview = (): void => {
    root.querySelectorAll<HTMLElement>('.tp-outline-row').forEach(row => {
      row.removeAttribute('data-drop-indicator');
      row.removeAttribute('data-drop-inside');
      row.removeAttribute('data-interaction-state');
    });
  };

  const applyOutlineDropPreview = (
    target: {
      readonly nodeId: ViewNodeId;
      readonly placement: 'before' | 'after' | 'inside';
    } | null,
  ): void => {
    clearOutlineDropPreview();
    if (target === null) {
      return;
    }
    const row = Array.from(root.querySelectorAll<HTMLElement>('.tp-outline-row')).find(
      candidate => candidate.dataset['nodeId'] === target.nodeId,
    );
    if (row !== undefined) {
      if (target.placement === 'inside') {
        row.dataset['dropInside'] = 'true';
      } else {
        row.dataset['dropIndicator'] = target.placement;
      }
    }
  };

  const applyDirectChartPreview = (preview: ChartSurfaceInteractionPreview): void => {
    if (preview.state !== 'dragging' || preview.target === null) {
      chartSurface?.preview(null);
      return;
    }
    const snapshot = store.getSnapshot();
    if (snapshot.config === null || snapshot.view === null || snapshot.session === null) {
      return;
    }
    const target = resolvePointerMoveTarget(snapshot.view, {
      itemId: preview.itemId,
      targetNodeId: preview.target.nodeId,
      placement: preview.target.placement,
    });
    if (!target.ok) {
      return;
    }
    const result = executeCommand(
      snapshot.session,
      buildMoveNodeCommand({
        id: 'tp-private-preview',
        source: 'direct',
        baseRevision: snapshot.view.revision,
        nodeId: preview.itemId,
        target: target.target,
        viewSpec: snapshot.view,
      }),
    );
    if (!result.ok) {
      return;
    }
    const projected = projectEditorChart(snapshot.config, result.viewSpec);
    if (!projected.ok) {
      return;
    }
    chartSurface?.preview({
      config: snapshot.config,
      view: result.viewSpec,
      chart: projected.value,
      messages: currentMessages(),
    });
  };

  const applyChartOutlinePreview = (
    target: {
      readonly nodeId: ViewNodeId;
      readonly placement: 'before' | 'after' | 'inside';
    } | null,
  ): void => {
    const plot = chartSurface?.element.querySelector<HTMLElement>('[data-testid="tellplot-chart"]');
    if (plot === null || plot === undefined) {
      return;
    }
    plot.removeAttribute('data-drop-indicator');
    plot.removeAttribute('data-drop-inside');
    plot.removeAttribute('data-drop-node-id');
    plot.removeAttribute('data-preview-source');
    plot.style.removeProperty('--tp-chart-drop-x');
    plot.style.removeProperty('--tp-chart-drop-y');
    if (target === null) {
      return;
    }
    const snapshot = store.getSnapshot();
    if (snapshot.config === null || snapshot.view === null) {
      return;
    }
    const projected = projectEditorChart(snapshot.config, snapshot.view);
    if (!projected.ok) {
      return;
    }
    const index = projected.value.projection.findIndex(datum => datum.nodeId === target.nodeId);
    if (index < 0) {
      return;
    }
    const axis = projected.value.chartType === 'bar' ? 'y' : 'x';
    const edge = target.placement === 'before' ? index : index + 1;
    const coordinate = `${(edge / Math.max(1, projected.value.projection.length)) * 100}%`;
    plot.dataset['previewSource'] = 'outline';
    plot.dataset['dropNodeId'] = target.nodeId;
    if (target.placement === 'inside') {
      plot.dataset['dropInside'] = 'true';
    } else {
      plot.dataset['dropIndicator'] = target.placement;
      plot.style.setProperty(axis === 'x' ? '--tp-chart-drop-x' : '--tp-chart-drop-y', coordinate);
    }
  };

  const handleOutlinePointerMove = (event: PointerEvent): void => {
    if (outlineDrag === null || outlineDrag.pointerId !== event.pointerId) {
      return;
    }
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      cancelOutlineDrag();
      return;
    }
    if (
      !outlineDrag.moved &&
      Math.hypot(event.clientX - outlineDrag.startX, event.clientY - outlineDrag.startY) < 4
    ) {
      return;
    }
    if (!outlineDrag.moved) {
      outlineDrag.moved = true;
      outlineDragOverlay = element(document, 'div', {
        className: 'tp-drag-overlay',
        text: currentMessages().moveInProgress,
        attributes: { 'data-testid': 'outline-drag-overlay' },
      });
      outlineDragOverlay.style.position = 'fixed';
      outlineDragOverlay.style.zIndex = '100';
      outlineDragOverlay.style.pointerEvents = 'none';
      root.append(outlineDragOverlay);
      setFeedback({
        code: 'MOVE_PENDING',
        message: currentMessages().moveInProgress,
        tone: 'neutral',
        source: 'outline',
      });
    }
    if (outlineDragOverlay !== null) {
      outlineDragOverlay.style.left = `${event.clientX + 12}px`;
      outlineDragOverlay.style.top = `${event.clientY + 12}px`;
    }
    root.dataset['interactionState'] = 'dragging';
    root.dataset['interactionSource'] = 'outline';
    const hit = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('.tp-outline-row[data-node-id]');
    const target = hit !== undefined && hit !== null && root.contains(hit) ? hit : null;
    root.querySelectorAll<HTMLElement>('.tp-outline-row').forEach(row => {
      row.removeAttribute('data-drop-indicator');
      row.removeAttribute('data-drop-inside');
      row.dataset['interactionState'] =
        row.dataset['nodeId'] === outlineDrag?.itemId
          ? 'dragging'
          : row.dataset['selected'] === 'true'
            ? 'selected'
            : 'idle';
    });
    if (
      target === undefined ||
      target === null ||
      target.dataset['nodeId'] === outlineDrag.itemId
    ) {
      outlineDrag.target = null;
      applyChartOutlinePreview(null);
      return;
    }
    const bounds = target.getBoundingClientRect();
    const ratio = bounds.height <= 0 ? Number.NaN : (event.clientY - bounds.top) / bounds.height;
    const fallback = ratio < 0.5 ? 'before' : 'after';
    const view = store.getSnapshot().view;
    if (view === null) {
      return;
    }
    const nodeId = target.dataset['nodeId'] as ViewNodeId;
    const placement = resolvePointerDropPlacement(view, nodeId, ratio, fallback);
    outlineDrag.target = { nodeId, placement };
    applyChartOutlinePreview(outlineDrag.target);
    if (placement === 'inside') {
      target.dataset['dropInside'] = 'true';
    } else {
      target.dataset['dropIndicator'] = placement;
    }
  };

  const clearOutlineDrag = (): OutlineDrag | null => {
    const active = outlineDrag;
    outlineDrag = null;
    root.dataset['interactionState'] = 'idle';
    root.removeAttribute('data-interaction-source');
    clearOutlineDropPreview();
    applyChartOutlinePreview(null);
    outlineDragOverlay?.remove();
    outlineDragOverlay = null;
    return active;
  };

  const handleOutlinePointerUp = (event: PointerEvent): void => {
    if (outlineDrag === null || outlineDrag.pointerId !== event.pointerId) {
      return;
    }
    const active = clearOutlineDrag();
    if (active === null || !active.moved) {
      return;
    }
    const view = store.getSnapshot().view;
    if (view === null || active.target === null) {
      setFeedback({
        code: 'ACTION_CANCELLED',
        message: currentMessages().actionCancelled,
        tone: 'neutral',
      });
      focusNode(active.itemId);
      return;
    }
    const resolved = resolvePointerMoveTarget(view, {
      itemId: active.itemId,
      targetNodeId: active.target.nodeId,
      placement: active.target.placement,
    });
    if (!resolved.ok) {
      setFeedback({
        code: 'INVALID_DROP_TARGET',
        message: currentMessages().targetUnavailable,
        tone: 'error',
      });
    } else {
      moveNode(active.itemId, resolved.target, 'outline');
    }
    focusNode(active.itemId);
  };

  const cancelOutlineDrag = (): void => {
    const active = clearOutlineDrag();
    if (active !== null) {
      setFeedback({
        code: 'ACTION_CANCELLED',
        message: currentMessages().actionCancelled,
        tone: 'neutral',
      });
      focusNode(active.itemId);
    }
  };
  const handleOutlinePointerOut = (event: PointerEvent): void => {
    if (outlineDrag?.pointerId === event.pointerId && event.relatedTarget === null) {
      cancelOutlineDrag();
    }
  };
  const handleOutlinePointerCancel = (event: PointerEvent): void => {
    if (outlineDrag?.pointerId === event.pointerId) {
      cancelOutlineDrag();
    }
  };
  const handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && outlineDrag !== null) {
      event.preventDefault();
      cancelOutlineDrag();
    }
  };
  document.addEventListener('pointermove', handleOutlinePointerMove, true);
  document.addEventListener('pointerup', handleOutlinePointerUp, true);
  document.addEventListener('pointercancel', handleOutlinePointerCancel, true);
  document.addEventListener('pointerout', handleOutlinePointerOut, true);
  document.addEventListener('keydown', handleDocumentKeyDown);
  ownerWindow?.addEventListener('blur', cancelOutlineDrag);

  const renderEditorFailure = (): void => {
    editorRenderFailed = true;
    cancelOutlineDrag();
    chartSurface?.cancelInteraction();
    modalFocusTrap?.deactivate();
    modalFocusTrap = undefined;
    modalKind = null;
    overlay = null;
    overlayReturnFocus = null;
    pendingGroup = null;
    pendingGroupLabel = '';
    pendingGroupReturnFocus = null;
    pendingGroupReturnNodeId = null;
    annotationDraft = null;
    groupLabelDraft = null;
    transientFocus = null;
    transientScrollTop = 0;
    transientLayer.replaceChildren();
    root.removeAttribute('data-overlay-open');
    root.dataset['editorState'] = 'error';
    const messages = currentMessages();
    const alert = element(document, 'section', {
      className: 'tp-invalid-stage',
      attributes: { role: 'alert' },
    });
    alert.append(
      element(document, 'div', { className: 'tp-invalid-mark', text: '!' }),
      element(document, 'div', {
        text: `${messages.editorRenderFailed} (EDITOR_RENDER_FAILED)`,
      }),
    );
    workbench.replaceChildren(alert);
  };

  const unsubscribe = store.subscribe(() => {
    if (!suppressStoreRender) {
      try {
        render();
      } catch {
        renderEditorFailure();
      }
    }
  });

  const exportImage = async (exportOptions: ExportOptions): Promise<ExportResult> => {
    const snapshot = store.getSnapshot();
    if (
      destroyed ||
      snapshot.view === null ||
      snapshot.config === null ||
      chartSurface === undefined
    ) {
      throw exportError('EXPORT_UNAVAILABLE', '/export');
    }
    const projected = projectEditorChart(snapshot.config, snapshot.view);
    if (!projected.ok || projected.value.projection.length === 0) {
      throw exportError('EXPORT_UNAVAILABLE', '/export');
    }
    const plot = chartSurface.element.querySelector<HTMLElement>('[data-testid="tellplot-chart"]');
    const canvas = plot?.querySelector('canvas');
    if (plot === null || plot === undefined || canvas === null || canvas === undefined) {
      throw exportError('EXPORT_UNAVAILABLE', '/export');
    }
    const bounds = plot.getBoundingClientRect();
    const width = bounds.width > 0 ? bounds.width : canvas.width;
    const height = bounds.height > 0 ? bounds.height : canvas.height;
    const normalized = normalizeExportOptions(exportOptions);
    const controller = new AbortController();
    activeExportControllers.add(controller);
    const locale = snapshot.config.locale ?? 'zh-CN';
    const title =
      snapshot.config.appearance?.title ?? chartTitle(currentMessages(), projected.value.chartType);
    const common = {
      ownerDocument: document,
      signal: controller.signal,
      title,
      locale,
      currency: snapshot.config.data.currency,
      width,
      height,
      annotations: snapshot.view.annotations,
      emphasis: snapshot.view.emphasis,
      appearance: toFinancialChartAppearance(snapshot.config),
      groupRegions: projectExpandedGroupRegions(snapshot.view, projected.value.projection),
    };
    try {
      if (normalized.format === 'png') {
        return await (projected.value.family === 'categorical'
          ? exportPngChart(
              {
                ...common,
                chartType: projected.value.chartType,
                projection: projected.value.projection,
              },
              normalized,
            )
          : exportPngChart({ ...common, projection: projected.value.projection }, normalized));
      }
      const svgOptions = {
        ...common,
        background: normalized.background,
        suggestedFilename: normalized.suggestedFilename,
      };
      return await (projected.value.family === 'categorical'
        ? exportSvgChart({
            ...svgOptions,
            chartType: projected.value.chartType,
            projection: projected.value.projection,
          })
        : exportSvgChart({ ...svgOptions, projection: projected.value.projection }));
    } finally {
      activeExportControllers.delete(controller);
    }
  };

  const instance: EditorInstance = {
    update(update): void {
      if (destroyed) {
        return;
      }
      const updateSnapshot = snapshotEditorOptions(update, 'EDITOR_RENDER_FAILED');
      const nextOnRenderError = updateSnapshot.onRenderError;
      const before = store.getSnapshot();
      suppressStoreRender = true;
      try {
        store.update(updateSnapshot);
      } finally {
        suppressStoreRender = false;
      }
      onRenderError = nextOnRenderError;
      const after = store.getSnapshot();
      const contextChanged =
        before.status !== after.status ||
        before.config?.type !== after.config?.type ||
        before.session?.sourceFingerprint !== after.session?.sourceFingerprint;
      const localeChanged =
        (before.config?.locale ?? 'zh-CN') !== (after.config?.locale ?? 'zh-CN');
      const preserveRenderErrorFeedback = feedback.code === 'CHART_RENDER_ERROR';

      if (!editorRenderFailed && sameRenderState(before, after)) {
        return;
      }

      cancelOutlineDrag();
      chartSurface?.cancelInteraction();
      if (contextChanged || localeChanged) {
        feedback = preserveRenderErrorFeedback
          ? {
              code: 'CHART_RENDER_ERROR',
              message: currentMessages().chartRenderFailed,
              tone: 'error',
            }
          : readyFeedback();
      }
      if (contextChanged) {
        const restoreTransientFocus = pendingGroup !== null || overlay !== null;
        pendingGroup = null;
        pendingGroupLabel = '';
        pendingGroupReturnFocus = null;
        pendingGroupReturnNodeId = null;
        overlay = null;
        overlayReturnFocus = null;
        modalFocusTrap?.deactivate();
        modalFocusTrap = undefined;
        modalKind = null;
        annotationDraft = null;
        groupLabelDraft = null;
        transientFocus = null;
        transientScrollTop = 0;
        transientLayer.replaceChildren();
        root.removeAttribute('data-overlay-open');
        if (restoreTransientFocus) {
          queueMicrotask(() => root.focus());
        }
      } else if (pendingGroup !== null && !sameView(before.view, after.view)) {
        pendingGroup = null;
        pendingGroupLabel = '';
        pendingGroupReturnFocus = null;
        pendingGroupReturnNodeId = null;
        modalFocusTrap?.deactivate();
        modalFocusTrap = undefined;
        modalKind = null;
        transientFocus = null;
        transientScrollTop = 0;
        queueMicrotask(() => root.focus());
      }
      try {
        render();
      } catch {
        renderEditorFailure();
        throw editorError('EDITOR_RENDER_FAILED', 'TellPlot editor could not render its state.');
      }
    },
    dispatch(command): CommandResult | null {
      if (destroyed) {
        return null;
      }
      return rememberAcceptedAction(store.dispatch(command));
    },
    undo(action): CommandResult | null {
      if (destroyed) {
        return null;
      }
      return action === undefined
        ? handleHistory('undo')
        : rememberAcceptedAction(store.undo(action));
    },
    redo(action): CommandResult | null {
      if (destroyed) {
        return null;
      }
      return action === undefined
        ? handleHistory('redo')
        : rememberAcceptedAction(store.redo(action));
    },
    focus(): void {
      if (!destroyed) {
        root.focus();
      }
    },
    getView(): ViewSpec {
      if (destroyed) {
        throw editorError('EDITOR_DESTROYED', 'TellPlot editor has been destroyed.');
      }
      const snapshot = store.getSnapshot();
      if (snapshot.view === null) {
        throw editorError('VIEW_UNAVAILABLE', 'TellPlot view is unavailable.');
      }
      return cloneView(snapshot.view, snapshot.config);
    },
    exportImage,
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      for (const controller of activeExportControllers) {
        controller.abort(exportError('EXPORT_UNAVAILABLE', '/export'));
      }
      activeExportControllers.clear();
      unsubscribe();
      document.removeEventListener('pointermove', handleOutlinePointerMove, true);
      document.removeEventListener('pointerup', handleOutlinePointerUp, true);
      document.removeEventListener('pointercancel', handleOutlinePointerCancel, true);
      document.removeEventListener('pointerout', handleOutlinePointerOut, true);
      document.removeEventListener('keydown', handleDocumentKeyDown);
      ownerWindow?.removeEventListener('blur', cancelOutlineDrag);
      layoutObserver?.disconnect();
      layoutObserver = undefined;
      modalFocusTrap?.deactivate();
      modalFocusTrap = undefined;
      modalKind = null;
      chartSurface?.destroy();
      chartSurface = undefined;
      store.destroy();
      ownedContainers.delete(container);
      root.remove();
    },
  };

  try {
    layoutObserver = observeEditorLayout(root, nextMode => {
      if (destroyed || nextMode === layoutMode) {
        return;
      }
      layoutMode = nextMode;
      root.dataset['layout'] = nextMode;
      cancelOutlineDrag();
      chartSurface?.cancelInteraction();
      chartSurface?.setLayoutMode(nextMode);
      if (overlay !== null) {
        overlay = null;
        overlayReturnFocus = null;
        renderTransient();
        queueMicrotask(() => root.focus());
      }
    });
    render();
  } catch {
    instance.destroy();
    throw editorError('EDITOR_INITIALIZATION_FAILED', 'TellPlot editor could not be initialized.');
  }
  return instance;
}
