import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { EditorCommand } from '../domain/commands';
import type { ValidationIssue } from '../domain/errors';
import { executeCommand } from '../domain/executeCommand';
import type { GroupId, ViewNodeId } from '../domain/ids';
import { collectLeafSourceIds } from '../domain/viewTree';
import { exportError, type ExportOptions, type ExportResult } from '../export/exportTypes';
import { normalizeExportOptions } from '../export/exportOptions';
import { exportPngChart } from '../export/pngExport';
import { exportSvgChart } from '../export/svgExport';
import { evaluateGroupSelection, type GroupSelectionResult } from '../interactions/groupSelection';
import {
  buildMoveNodeCommand,
  resolvePointerMoveTarget,
  type InteractionCommandSource,
} from '../interactions/moveTargets';
import type { FinancialChartEditorHandle, FinancialChartEditorProps } from '../react/editorTypes';
import { useEditorController } from '../react/useEditorController';
import { projectWaterfall } from '../waterfall/projectWaterfall';
import type { WaterfallProjection } from '../waterfall/waterfallTypes';
import { EditorToolbar } from './EditorToolbar';
import { editorMessages, type EditorMessages } from './editorMessages';
import { InspectorPanel } from './InspectorPanel';
import { OutlinePanel, type OutlineInteractionPreview } from './OutlinePanel';
import { PanelOverlay } from './PanelOverlay';
import { WaterfallCanvas, type ChartInteractionPreview } from './WaterfallCanvas';

interface VisibleIssue {
  readonly code: string;
  readonly path: string;
}

type FeedbackMessageKey =
  | 'valid'
  | 'invalidData'
  | 'moveInProgress'
  | 'moveAccepted'
  | 'groupCreated'
  | 'groupCollapsed'
  | 'groupExpanded'
  | 'groupRemoved'
  | 'annotationSaved'
  | 'annotationRemoved'
  | 'annotationTooLong'
  | 'undoAccepted'
  | 'redoAccepted'
  | 'actionCancelled'
  | 'targetUnavailable'
  | 'readOnlyReason'
  | 'groupLabelRequired'
  | 'groupTooSmall'
  | 'groupNonContiguous'
  | 'groupLocked';

interface CommandFeedbackState {
  readonly code: string;
  readonly messageKey: FeedbackMessageKey;
  readonly tone: 'neutral' | 'success' | 'error';
  readonly source?: InteractionCommandSource;
}

interface MoveTarget {
  readonly containerId: 'root' | GroupId;
  readonly index: number;
}

interface ScopedInteraction<T> {
  readonly scope: object | null;
  readonly preview: T;
}

type ValidGroupSelection = Extract<GroupSelectionResult, { readonly ok: true }>;

const EMPTY_PROJECTION: WaterfallProjection = [];

function componentIssues(
  invalidMode: boolean,
  issues: readonly ValidationIssue[],
): readonly VisibleIssue[] {
  if (invalidMode) {
    return [{ code: 'INVALID_CONFIGURATION', path: '/viewSpec' }];
  }
  return issues.map(issue => ({ code: issue.code, path: issue.path }));
}

function editorHeight(height: FinancialChartEditorProps['height']): number | string {
  if (typeof height === 'number') {
    return Math.max(480, height);
  }
  return height ?? 680;
}

function InvalidStage({
  issues,
  title,
}: {
  readonly issues: readonly VisibleIssue[];
  readonly title: string;
}): React.JSX.Element {
  return (
    <section className="tp-invalid-stage" role="alert">
      <div className="tp-invalid-mark" aria-hidden="true">
        !
      </div>
      <div>
        <h2>{title}</h2>
        <ul>
          {issues.map((issue, index) => (
            <li key={`${issue.code}:${issue.path}:${index}`}>
              <strong>{issue.code}</strong>
              <code>{issue.path}</code>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function feedbackForError(code: string): FeedbackMessageKey {
  return code === 'ITEM_LOCKED'
    ? 'groupLocked'
    : code === 'INVALID_DROP_TARGET' || code === 'GROUP_NOT_FOUND'
      ? 'targetUnavailable'
      : code === 'NON_CONTIGUOUS_GROUP_SELECTION'
        ? 'groupNonContiguous'
        : code === 'GROUP_TOO_SMALL'
          ? 'groupTooSmall'
          : 'targetUnavailable';
}

function groupSelectionFallback(): GroupSelectionResult {
  return { ok: false, reason: 'GROUP_TOO_SMALL' };
}

function CommandFeedback({
  feedback,
  messages,
}: {
  readonly feedback: CommandFeedbackState;
  readonly messages: EditorMessages;
}): React.JSX.Element {
  return (
    <div
      className="tp-command-feedback"
      data-command-source={feedback.source}
      data-feedback-tone={feedback.tone}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <strong>{feedback.code}</strong>
      <span>{messages[feedback.messageKey]}</span>
    </div>
  );
}

/** Embeddable financial waterfall workbench with immutable source/view boundaries. */
export const FinancialChartEditor = forwardRef<
  FinancialChartEditorHandle,
  FinancialChartEditorProps
>(function FinancialChartEditor(props, forwardedRef): React.JSX.Element {
  const controller = useEditorController(props);
  const chartGroupLabelId = useId();
  const locale = props.locale ?? 'zh-CN';
  const messages = editorMessages(locale);
  const panels = {
    outline: props.panels?.outline ?? true,
    inspector: props.panels?.inspector ?? true,
    toolbar: props.panels?.toolbar ?? true,
  };
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [feedback, setFeedback] = useState<CommandFeedbackState>({
    code: 'READY',
    messageKey: 'valid',
    tone: 'neutral',
  });
  const [outlineInteraction, setOutlineInteraction] = useState<
    ScopedInteraction<OutlineInteractionPreview>
  >({ scope: null, preview: { state: 'idle' } });
  const [chartInteraction, setChartInteraction] = useState<
    ScopedInteraction<ChartInteractionPreview>
  >({ scope: null, preview: { state: 'idle' } });
  const [pendingChartGroup, setPendingChartGroup] = useState<ValidGroupSelection | null>(null);
  const [chartGroupLabel, setChartGroupLabel] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const actionCounterRef = useRef(0);

  const canonicalProjectionResult = useMemo(() => {
    if (controller.viewSpec === null) {
      return null;
    }
    return projectWaterfall(props.sourceData, controller.viewSpec);
  }, [controller.viewSpec, props.sourceData]);

  const invalid =
    controller.status === 'invalid' ||
    canonicalProjectionResult === null ||
    !canonicalProjectionResult.ok;
  const visibleIssues = componentIssues(
    controller.mode === 'invalid',
    controller.status === 'invalid'
      ? controller.issues
      : canonicalProjectionResult !== null && !canonicalProjectionResult.ok
        ? canonicalProjectionResult.errors
        : [],
  );
  const empty = !invalid && !props.sourceData.items.some(item => item.kind === 'contribution');
  const modalOpen =
    pendingChartGroup !== null ||
    (!invalid && ((panels.outline && outlineOpen) || (panels.inspector && inspectorOpen)));
  const editorState = invalid ? 'invalid' : empty ? 'empty' : 'ready';
  const interactionScope = useMemo(
    () =>
      invalid || controller.viewSpec === null
        ? null
        : { sourceData: props.sourceData, viewSpec: controller.viewSpec },
    [controller.viewSpec, invalid, props.sourceData],
  );
  const currentChartInteraction = useMemo(
    () =>
      interactionScope !== null && chartInteraction.scope === interactionScope
        ? chartInteraction.preview
        : ({ state: 'idle' } as const),
    [chartInteraction, interactionScope],
  );
  const currentOutlineInteraction = useMemo(
    () =>
      interactionScope !== null && outlineInteraction.scope === interactionScope
        ? outlineInteraction.preview
        : ({ state: 'idle' } as const),
    [interactionScope, outlineInteraction],
  );
  const groupSelection = useMemo(
    () =>
      controller.viewSpec === null
        ? groupSelectionFallback()
        : evaluateGroupSelection(
            props.sourceData,
            controller.viewSpec,
            controller.selection?.nodeIds ?? [],
          ),
    [controller.selection?.nodeIds, controller.viewSpec, props.sourceData],
  );
  const activeInteraction = useMemo(
    () =>
      currentChartInteraction.state === 'dragging'
        ? ({ preview: currentChartInteraction, source: 'direct' } as const)
        : ({ preview: currentOutlineInteraction, source: 'outline' } as const),
    [currentChartInteraction, currentOutlineInteraction],
  );
  const previewViewSpec = useMemo(() => {
    if (
      controller.session === null ||
      controller.viewSpec === null ||
      activeInteraction.preview.state !== 'dragging' ||
      activeInteraction.preview.target === null
    ) {
      return controller.viewSpec;
    }
    const resolved = resolvePointerMoveTarget(controller.viewSpec, {
      itemId: activeInteraction.preview.itemId,
      targetNodeId: activeInteraction.preview.target.nodeId,
      edge: activeInteraction.preview.target.edge,
    });
    if (!resolved.ok) {
      return controller.viewSpec;
    }
    const previewResult = executeCommand(
      controller.session,
      buildMoveNodeCommand({
        id: 'tp-private-preview',
        source: activeInteraction.source,
        baseRevision: controller.viewSpec.revision,
        nodeId: activeInteraction.preview.itemId,
        target: resolved.target,
        viewSpec: controller.viewSpec,
      }),
    );
    return previewResult.ok ? previewResult.viewSpec : controller.viewSpec;
  }, [activeInteraction, controller.session, controller.viewSpec]);
  const displayProjectionResult = useMemo(
    () => (previewViewSpec === null ? null : projectWaterfall(props.sourceData, previewViewSpec)),
    [previewViewSpec, props.sourceData],
  );
  const canonicalProjection: WaterfallProjection =
    canonicalProjectionResult !== null && canonicalProjectionResult.ok
      ? canonicalProjectionResult.value
      : EMPTY_PROJECTION;
  const projection: WaterfallProjection =
    displayProjectionResult !== null && displayProjectionResult.ok
      ? displayProjectionResult.value
      : canonicalProjection;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const exportImage = useCallback(
    async (options: ExportOptions): Promise<ExportResult> => {
      const normalized = normalizeExportOptions(options);
      const root = rootRef.current;
      if (
        !mountedRef.current ||
        invalid ||
        controller.viewSpec === null ||
        root === null ||
        canonicalProjection.length === 0
      ) {
        throw exportError('EXPORT_UNAVAILABLE', '/export');
      }
      const stage = root.querySelector<HTMLElement>('[data-testid="tellplot-chart-stage"]');
      const plot = root.querySelector<HTMLElement>('[data-testid="tellplot-chart"]');
      const canvas = plot?.querySelector('canvas') ?? null;
      if (
        stage === null ||
        plot === null ||
        canvas === null ||
        stage.getAttribute('data-interaction-state') === 'dragging'
      ) {
        throw exportError('EXPORT_UNAVAILABLE', '/export');
      }
      const bounds = plot.getBoundingClientRect();
      const width = bounds.width > 0 ? bounds.width : canvas.width;
      const height = bounds.height > 0 ? bounds.height : canvas.height;
      if (normalized.format === 'png') {
        return exportPngChart(
          {
            ownerDocument: root.ownerDocument,
            projection: canonicalProjection,
            title: messages.waterfallTitle,
            locale,
            currency: props.sourceData.currency,
            width,
            height,
            annotations: controller.viewSpec.annotations,
            emphasis: controller.viewSpec.emphasis,
            appearance: props.chartAppearance,
          },
          normalized,
        );
      }
      return exportSvgChart({
        ownerDocument: root.ownerDocument,
        projection: canonicalProjection,
        title: messages.waterfallTitle,
        locale,
        currency: props.sourceData.currency,
        width,
        height,
        background: normalized.background,
        suggestedFilename: normalized.suggestedFilename,
        annotations: controller.viewSpec.annotations,
        emphasis: controller.viewSpec.emphasis,
        appearance: props.chartAppearance,
      });
    },
    [
      canonicalProjection,
      controller.viewSpec,
      invalid,
      locale,
      messages.waterfallTitle,
      props.sourceData.currency,
      props.chartAppearance,
    ],
  );

  useImperativeHandle(
    forwardedRef,
    () => ({
      focus(): void {
        rootRef.current?.focus();
      },
      exportImage,
      getViewSpec() {
        if (!mountedRef.current || controller.viewSpec === null) {
          throw exportError('EXPORT_UNAVAILABLE', '/viewSpec');
        }
        return controller.viewSpec;
      },
    }),
    [controller.viewSpec, exportImage],
  );

  const handleOutlineInteractionChange = useCallback(
    (preview: OutlineInteractionPreview): void => {
      setOutlineInteraction({ scope: interactionScope, preview });
    },
    [interactionScope],
  );

  const handleChartInteractionChange = useCallback(
    (preview: ChartInteractionPreview): void => {
      setChartInteraction({ scope: interactionScope, preview });
    },
    [interactionScope],
  );

  const nextActionId = useCallback((source: InteractionCommandSource): string => {
    actionCounterRef.current += 1;
    return `tp-${source}-${actionCounterRef.current}`;
  }, []);

  const focusNode = useCallback((nodeId: string): void => {
    window.setTimeout(() => {
      const nodes = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>('[data-node-id]') ?? [],
      );
      (
        nodes.find(node => node.dataset['nodeId'] === nodeId && node.offsetParent !== null) ??
        nodes.find(node => node.dataset['nodeId'] === nodeId)
      )?.focus();
    }, 0);
  }, []);

  const dispatchInteraction = useCallback(
    (command: EditorCommand, successMessageKey: FeedbackMessageKey): boolean => {
      const result = controller.dispatch(command);
      if (result === null) {
        setFeedback({ code: 'READ_ONLY', messageKey: 'readOnlyReason', tone: 'error' });
        return false;
      }
      if (!result.ok) {
        const source =
          command.source === 'direct' ||
          command.source === 'outline' ||
          command.source === 'keyboard'
            ? command.source
            : undefined;
        setFeedback({
          code: result.error.code,
          messageKey: feedbackForError(result.error.code),
          tone: 'error',
          ...(source === undefined ? {} : { source }),
        });
        return false;
      }
      const source =
        result.event.source === 'direct' ||
        result.event.source === 'outline' ||
        result.event.source === 'keyboard'
          ? result.event.source
          : undefined;
      setFeedback({
        code: result.event.type,
        messageKey: successMessageKey,
        tone: 'success',
        ...(source === undefined ? {} : { source }),
      });
      return true;
    },
    [controller],
  );

  const handleMove = useCallback(
    (nodeId: ViewNodeId, target: MoveTarget, source: InteractionCommandSource): boolean => {
      if (controller.viewSpec === null) {
        return false;
      }
      return dispatchInteraction(
        buildMoveNodeCommand({
          id: nextActionId(source),
          source,
          baseRevision: controller.viewSpec.revision,
          nodeId,
          target,
          viewSpec: controller.viewSpec,
        }),
        'moveAccepted',
      );
    },
    [controller.viewSpec, dispatchInteraction, nextActionId],
  );

  const createGroup = useCallback(
    (
      label: string,
      selection: GroupSelectionResult,
      initiallyCollapsed: boolean,
      source: 'direct' | 'outline',
    ): boolean => {
      if (controller.viewSpec === null || !selection.ok || label.trim().length === 0) {
        const reasonKey: FeedbackMessageKey =
          label.trim().length === 0
            ? 'groupLabelRequired'
            : selection.ok
              ? 'targetUnavailable'
              : selection.reason === 'GROUP_TOO_SMALL'
                ? 'groupTooSmall'
                : selection.reason === 'ITEM_LOCKED'
                  ? 'groupLocked'
                  : 'groupNonContiguous';
        setFeedback({ code: 'GROUP_UNAVAILABLE', messageKey: reasonKey, tone: 'error' });
        return false;
      }

      let groupId: GroupId;
      do {
        actionCounterRef.current += 1;
        groupId = `tp-group-${controller.viewSpec.revision}-${actionCounterRef.current}`;
      } while (
        Object.hasOwn(controller.viewSpec.groups, groupId) ||
        props.sourceData.items.some(item => String(item.id) === String(groupId))
      );
      const accepted = dispatchInteraction(
        {
          schemaVersion: '1.0.0',
          id: nextActionId(source),
          type: 'createGroup',
          source,
          baseRevision: controller.viewSpec.revision,
          payload: {
            groupId,
            label,
            nodeIds: [...selection.nodeIds],
            initiallyCollapsed,
          },
        },
        'groupCreated',
      );
      if (accepted) {
        controller.select({
          nodeId: groupId,
          nodeIds: [groupId],
          sourceIds: [...selection.sourceIds],
        });
        focusNode(groupId);
      }
      return accepted;
    },
    [controller, dispatchInteraction, focusNode, nextActionId, props.sourceData.items],
  );

  const handleCreateGroup = useCallback(
    (label: string): boolean => createGroup(label, groupSelection, false, 'outline'),
    [createGroup, groupSelection],
  );

  const handleMarqueeSelection = useCallback(
    (nodeIds: readonly ViewNodeId[]): void => {
      if (controller.viewSpec === null) {
        return;
      }
      const result = evaluateGroupSelection(props.sourceData, controller.viewSpec, nodeIds);
      if (!result.ok) {
        setFeedback({
          code: 'GROUP_UNAVAILABLE',
          messageKey:
            result.reason === 'GROUP_TOO_SMALL'
              ? 'groupTooSmall'
              : result.reason === 'ITEM_LOCKED'
                ? 'groupLocked'
                : 'groupNonContiguous',
          tone: 'error',
        });
        return;
      }
      controller.select({
        nodeId: result.nodeIds.at(-1) ?? result.nodeIds[0] ?? '',
        nodeIds: [...result.nodeIds],
        sourceIds: [...result.sourceIds],
      });
      setChartGroupLabel('');
      setPendingChartGroup(result);
    },
    [controller, props.sourceData],
  );

  const handleChartSelect = useCallback(
    (nodeId: ViewNodeId): void => {
      if (controller.viewSpec === null) {
        return;
      }
      controller.select({
        nodeId,
        nodeIds: [nodeId],
        sourceIds: [...collectLeafSourceIds(controller.viewSpec, nodeId)],
      });
    },
    [controller],
  );

  const handleSetAnnotation = useCallback(
    (nodeId: ViewNodeId, text: string | null): boolean => {
      if (controller.viewSpec === null) {
        return false;
      }
      if (text !== null && Array.from(text).length > 500) {
        setFeedback({
          code: 'ANNOTATION_TOO_LONG',
          messageKey: 'annotationTooLong',
          tone: 'error',
        });
        return false;
      }
      const normalized = text === null || text.trim().length === 0 ? null : text;
      return dispatchInteraction(
        {
          schemaVersion: '1.0.0',
          id: nextActionId('direct'),
          type: 'setAnnotation',
          source: 'direct',
          baseRevision: controller.viewSpec.revision,
          payload: { nodeId, text: normalized },
        },
        normalized === null ? 'annotationRemoved' : 'annotationSaved',
      );
    },
    [controller.viewSpec, dispatchInteraction, nextActionId],
  );

  const closeChartGroupDialog = useCallback((): void => {
    setPendingChartGroup(null);
    setChartGroupLabel('');
    rootRef.current?.focus();
  }, []);

  const toggleGroup = useCallback(
    (groupId: GroupId, expanded: boolean, source: 'direct' | 'outline'): boolean => {
      if (controller.viewSpec === null) {
        return false;
      }
      return dispatchInteraction(
        {
          schemaVersion: '1.0.0',
          id: nextActionId(source),
          type: expanded ? 'collapseGroup' : 'expandGroup',
          source,
          baseRevision: controller.viewSpec.revision,
          payload: { groupId },
        },
        expanded ? 'groupCollapsed' : 'groupExpanded',
      );
    },
    [controller.viewSpec, dispatchInteraction, nextActionId],
  );

  const handleToggleGroup = useCallback(
    (groupId: GroupId, expanded: boolean): boolean => toggleGroup(groupId, expanded, 'outline'),
    [toggleGroup],
  );

  const handleChartToggleGroup = useCallback(
    (groupId: GroupId, expanded: boolean): void => {
      if (controller.viewSpec === null) {
        return;
      }
      controller.select({
        nodeId: groupId,
        nodeIds: [groupId],
        sourceIds: [...collectLeafSourceIds(controller.viewSpec, groupId)],
      });
      toggleGroup(groupId, expanded, 'direct');
    },
    [controller, toggleGroup],
  );

  const ungroup = useCallback(
    (groupId: GroupId, source: 'direct' | 'outline'): boolean => {
      if (controller.viewSpec === null) {
        return false;
      }
      const group = Object.getOwnPropertyDescriptor(controller.viewSpec.groups, groupId);
      const childIds =
        group !== undefined && 'value' in group
          ? [...(group.value as { readonly childIds: readonly ViewNodeId[] }).childIds]
          : [];
      const accepted = dispatchInteraction(
        {
          schemaVersion: '1.0.0',
          id: nextActionId(source),
          type: 'ungroup',
          source,
          baseRevision: controller.viewSpec.revision,
          payload: { groupId },
        },
        'groupRemoved',
      );
      const firstChild = childIds[0];
      if (accepted && firstChild !== undefined) {
        controller.select({
          nodeId: firstChild,
          nodeIds: [firstChild],
          sourceIds: [...collectLeafSourceIds(controller.viewSpec, firstChild)],
        });
        focusNode(firstChild);
      }
      return accepted;
    },
    [controller, dispatchInteraction, focusNode, nextActionId],
  );

  const handleUngroup = useCallback(
    (groupId: GroupId): boolean => ungroup(groupId, 'outline'),
    [ungroup],
  );

  const handleChartUngroup = useCallback(
    (groupId: GroupId): void => {
      ungroup(groupId, 'direct');
    },
    [ungroup],
  );

  const handleCancel = useCallback(
    (reason: 'cancelled' | 'invalid-target' | 'item-locked'): void => {
      if (reason === 'item-locked') {
        setFeedback({
          code: 'ITEM_LOCKED',
          messageKey: 'groupLocked',
          tone: 'error',
        });
        return;
      }
      setFeedback({
        code: reason === 'cancelled' ? 'ACTION_CANCELLED' : 'INVALID_DROP_TARGET',
        messageKey: reason === 'cancelled' ? 'actionCancelled' : 'targetUnavailable',
        tone: reason === 'cancelled' ? 'neutral' : 'error',
      });
    },
    [],
  );

  const handleHistory = useCallback(
    (direction: 'undo' | 'redo'): void => {
      if (controller.viewSpec === null) {
        return;
      }
      const action = {
        id: nextActionId('direct'),
        source: 'direct' as const,
        baseRevision: controller.viewSpec.revision,
      };
      const result = direction === 'undo' ? controller.undo(action) : controller.redo(action);
      if (result === null) {
        setFeedback({ code: 'READ_ONLY', messageKey: 'readOnlyReason', tone: 'error' });
        return;
      }
      if (!result.ok) {
        setFeedback({
          code: result.error.code,
          messageKey: feedbackForError(result.error.code),
          tone: 'error',
          source: 'direct',
        });
        return;
      }
      setFeedback({
        code: result.event.type,
        messageKey: direction === 'undo' ? 'undoAccepted' : 'redoAccepted',
        tone: 'success',
        source: 'direct',
      });
    },
    [controller, nextActionId],
  );

  const outline =
    !invalid && controller.viewSpec !== null ? (
      <OutlinePanel
        sourceData={props.sourceData}
        viewSpec={controller.viewSpec}
        projection={canonicalProjection}
        locale={locale}
        messages={messages}
        selection={controller.selection}
        readOnly={props.readOnly === true}
        externalPreview={currentChartInteraction}
        onSelect={controller.select}
        onMove={handleMove}
        onToggleGroup={handleToggleGroup}
        onCancel={handleCancel}
        onInteractionPreviewChange={handleOutlineInteractionChange}
      />
    ) : null;
  const inspector =
    !invalid && controller.viewSpec !== null ? (
      <InspectorPanel
        sourceData={props.sourceData}
        viewSpec={controller.viewSpec}
        projection={canonicalProjection}
        selection={controller.selection}
        groupSelection={groupSelection}
        readOnly={props.readOnly === true}
        locale={locale}
        messages={messages}
        onCreateGroup={handleCreateGroup}
        onSetAnnotation={handleSetAnnotation}
        onUngroup={handleUngroup}
      />
    ) : null;

  return (
    <div
      className="tp-editor"
      data-tellplot="editor"
      data-editor-state={editorState}
      data-interaction-state={activeInteraction.preview.state}
      data-interaction-source={
        activeInteraction.preview.state === 'dragging' ? activeInteraction.source : undefined
      }
      data-read-only={props.readOnly === true ? 'true' : 'false'}
      data-overlay-open={modalOpen ? 'true' : undefined}
      data-view-revision={controller.viewSpec?.revision ?? -1}
      ref={rootRef}
      tabIndex={-1}
      style={{ height: editorHeight(props.height) }}
    >
      <EditorToolbar
        datasetId={props.sourceData.datasetId}
        messages={messages}
        valid={!invalid}
        showOutline={panels.outline}
        showInspector={panels.inspector}
        showToolbar={panels.toolbar}
        readOnly={props.readOnly === true}
        canUndo={controller.canUndo}
        canRedo={controller.canRedo}
        onOpenOutline={() => setOutlineOpen(true)}
        onOpenInspector={() => setInspectorOpen(true)}
        onUndo={() => handleHistory('undo')}
        onRedo={() => handleHistory('redo')}
      />

      <CommandFeedback
        messages={messages}
        feedback={
          invalid
            ? { code: 'INVALID_DATA', messageKey: 'invalidData', tone: 'error' }
            : activeInteraction.preview.state === 'dragging'
              ? {
                  code: 'MOVE_PREVIEW',
                  messageKey: 'moveInProgress',
                  tone: 'neutral',
                  source: activeInteraction.source,
                }
              : feedback
        }
      />

      {invalid || controller.viewSpec === null ? (
        <main className="tp-workbench tp-workbench-invalid">
          <InvalidStage issues={visibleIssues} title={messages.invalidData} />
        </main>
      ) : (
        <main className="tp-workbench">
          {panels.outline ? (
            <aside className="tp-static-panel tp-outline-static">{outline}</aside>
          ) : null}
          <WaterfallCanvas
            projection={projection}
            viewSpec={controller.viewSpec}
            readOnly={props.readOnly === true}
            locale={locale}
            currency={props.sourceData.currency}
            empty={empty}
            title={messages.waterfallTitle}
            appearance={props.chartAppearance}
            externalPreview={currentOutlineInteraction}
            onMove={handleMove}
            onMarqueeSelection={handleMarqueeSelection}
            onSelectNode={handleChartSelect}
            onToggleGroup={handleChartToggleGroup}
            onUngroup={handleChartUngroup}
            onInteractionChange={handleChartInteractionChange}
            onCancel={handleCancel}
          />
          {panels.inspector ? (
            <aside
              className="tp-static-panel tp-inspector-static"
              role="complementary"
              aria-label={messages.inspector}
            >
              {inspector}
            </aside>
          ) : null}
        </main>
      )}

      {!invalid && panels.outline && outlineOpen ? (
        <PanelOverlay
          label={messages.outline}
          closeLabel={messages.closeOutline}
          backdropLabel={messages.backdrop(messages.outline)}
          side="left"
          onClose={() => setOutlineOpen(false)}
        >
          {outline}
        </PanelOverlay>
      ) : null}
      {!invalid && panels.inspector && inspectorOpen ? (
        <PanelOverlay
          label={messages.inspector}
          closeLabel={messages.closeInspector}
          backdropLabel={messages.backdrop(messages.inspector)}
          side="right"
          onClose={() => setInspectorOpen(false)}
        >
          {inspector}
        </PanelOverlay>
      ) : null}
      {pendingChartGroup === null ? null : (
        <div
          className="tp-group-dialog-layer"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              closeChartGroupDialog();
            }
          }}
        >
          <form
            aria-label={messages.groupDialogTitle}
            aria-modal="true"
            className="tp-group-dialog"
            role="dialog"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeChartGroupDialog();
                return;
              }
              if (event.key === 'Tab') {
                const focusable = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    'input:not(:disabled), button:not(:disabled)',
                  ),
                );
                const first = focusable[0];
                const last = focusable.at(-1);
                if (first === undefined || last === undefined) {
                  return;
                }
                if (event.shiftKey && event.currentTarget.ownerDocument.activeElement === first) {
                  event.preventDefault();
                  last.focus();
                } else if (
                  !event.shiftKey &&
                  event.currentTarget.ownerDocument.activeElement === last
                ) {
                  event.preventDefault();
                  first.focus();
                }
              }
            }}
            onSubmit={event => {
              event.preventDefault();
              if (createGroup(chartGroupLabel, pendingChartGroup, true, 'direct')) {
                closeChartGroupDialog();
              }
            }}
          >
            <h2>{messages.groupDialogTitle}</h2>
            <label htmlFor={chartGroupLabelId}>{messages.groupLabel}</label>
            <input
              autoFocus
              className="tp-text-input"
              id={chartGroupLabelId}
              type="text"
              value={chartGroupLabel}
              onChange={event => setChartGroupLabel(event.target.value)}
            />
            <div className="tp-group-dialog-actions">
              <button
                className="tp-command-button tp-command-button-secondary"
                type="button"
                onClick={() => {
                  closeChartGroupDialog();
                }}
              >
                {messages.cancel}
              </button>
              <button
                className="tp-command-button"
                disabled={chartGroupLabel.trim().length === 0}
                type="submit"
              >
                {messages.createGroup}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});

FinancialChartEditor.displayName = 'FinancialChartEditor';
