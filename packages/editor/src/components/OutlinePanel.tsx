import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, GripVertical, LockKeyhole } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import type { GroupId, SourceItemId, ViewNodeId } from '../domain/ids';
import type { SourceData, ViewGroup, ViewSpec } from '../domain/model';
import type { CategoricalDatum, CategoricalProjection } from '../charts/categorical/types';
import { collectLeafSourceIds } from '../domain/viewTree';
import {
  resolveKeyboardMoveTarget,
  resolvePointerDropPlacement,
  resolvePointerMoveTarget,
  type InteractionCommandSource,
  type KeyboardMoveDirection,
  type MoveTargetPlacement,
} from '../interactions/moveTargets';
import type { SelectionState } from '../react/editorTypes';
import type { WaterfallDatum, WaterfallProjection } from '../charts/waterfall/types';
import type { EditorMessages } from './editorMessages';
import { formatAmount, type EditorLocale } from './formatAmount';

interface OutlineEntry {
  readonly nodeId: string;
  readonly label: string;
  readonly amount: number | null;
  readonly sourceIds: readonly SourceItemId[];
  readonly locked: boolean;
  readonly level: number;
  readonly kind: 'anchor' | 'contribution' | 'group';
  readonly expanded?: boolean;
  readonly groupSize?: number;
}

interface MoveTarget {
  readonly containerId: 'root' | GroupId;
  readonly index: number;
}

interface OutlinePanelProps {
  readonly sourceData: SourceData;
  readonly viewSpec: ViewSpec;
  readonly projection: WaterfallProjection | CategoricalProjection;
  readonly locale: EditorLocale;
  readonly messages: EditorMessages;
  readonly selection: SelectionState | null;
  readonly readOnly: boolean;
  readonly externalPreview?: OutlineInteractionPreview;
  readonly onSelect: (selection: SelectionState) => void;
  readonly onMove: (
    nodeId: ViewNodeId,
    target: MoveTarget,
    source: InteractionCommandSource,
  ) => boolean;
  readonly onToggleGroup: (groupId: GroupId, expanded: boolean) => boolean;
  readonly onCancel: (reason: 'cancelled' | 'invalid-target') => void;
  readonly onInteractionPreviewChange: (preview: OutlineInteractionPreview) => void;
}

interface DropTargetState {
  readonly nodeId: ViewNodeId;
  readonly placement: MoveTargetPlacement;
}

export type OutlineInteractionPreview =
  | { readonly state: 'idle' }
  | {
      readonly state: 'dragging';
      readonly itemId: ViewNodeId;
      readonly target: DropTargetState | null;
    };

function ownGroup(viewSpec: ViewSpec, nodeId: string): ViewGroup | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(viewSpec.groups, nodeId);
  return descriptor !== undefined && 'value' in descriptor
    ? (descriptor.value as ViewGroup)
    : undefined;
}

function groupEntry(
  group: ViewGroup,
  datum: WaterfallDatum | CategoricalDatum | undefined,
  expanded: boolean,
  viewSpec: ViewSpec,
  level: number,
): OutlineEntry {
  return {
    nodeId: group.id,
    label: group.label,
    amount: datum?.amount ?? null,
    sourceIds: [...collectLeafSourceIds(viewSpec, group.id)],
    locked: collectLeafSourceIds(viewSpec, group.id).some(itemId =>
      viewSpec.pinnedItemIds.includes(itemId),
    ),
    level,
    kind: 'group',
    expanded,
    groupSize: group.childIds.length,
  };
}

function outlineEntries(
  viewSpec: ViewSpec,
  projection: WaterfallProjection | CategoricalProjection,
): readonly OutlineEntry[] {
  if (isWaterfallProjection(projection)) {
    return waterfallOutlineEntries(viewSpec, projection);
  }

  return categoricalOutlineEntries(viewSpec, projection);
}

function isWaterfallProjection(
  projection: WaterfallProjection | CategoricalProjection,
): projection is WaterfallProjection {
  return projection.some(datum => 'start' in datum);
}

function waterfallOutlineEntries(
  viewSpec: ViewSpec,
  projection: WaterfallProjection,
): readonly OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const emittedGroups = new Set<string>();
  const collapsedGroupIds = new Set(viewSpec.collapsedGroupIds);

  for (const datum of projection) {
    for (let pathIndex = 0; pathIndex < datum.groupPath.length; pathIndex += 1) {
      const groupId = datum.groupPath[pathIndex];
      const group = groupId === undefined ? undefined : ownGroup(viewSpec, groupId);
      if (group !== undefined && !emittedGroups.has(group.id)) {
        emittedGroups.add(group.id);
        const collapsed = collapsedGroupIds.has(group.id);
        entries.push(
          groupEntry(
            group,
            collapsed && datum.nodeId === group.id ? datum : undefined,
            !collapsed,
            viewSpec,
            pathIndex + 1,
          ),
        );
      }
    }

    if (ownGroup(viewSpec, datum.nodeId) !== undefined) {
      continue;
    }

    entries.push({
      nodeId: datum.nodeId,
      label: datum.label,
      amount: datum.amount,
      sourceIds: [...datum.sourceIds],
      locked: datum.locked,
      level: datum.kind === 'positive' || datum.kind === 'negative' ? datum.depth : 1,
      kind: datum.kind === 'positive' || datum.kind === 'negative' ? 'contribution' : 'anchor',
    });
  }

  return entries;
}

function categoricalOutlineEntries(
  viewSpec: ViewSpec,
  projection: CategoricalProjection,
): readonly OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const collapsedGroupIds = new Set(viewSpec.collapsedGroupIds);
  const datumById = new Map(projection.map(datum => [datum.nodeId, datum]));
  const visited = new Set<ViewNodeId>();

  const visit = (nodeId: ViewNodeId, level: number): void => {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);
    const group = ownGroup(viewSpec, nodeId);
    if (group !== undefined) {
      const collapsed = collapsedGroupIds.has(group.id);
      entries.push(
        groupEntry(
          group,
          collapsed ? datumById.get(group.id) : undefined,
          !collapsed,
          viewSpec,
          level,
        ),
      );
      if (!collapsed) {
        for (const childId of group.childIds) {
          visit(childId, level + 1);
        }
      }
      return;
    }

    const datum = datumById.get(nodeId);
    if (datum === undefined) {
      return;
    }
    entries.push({
      nodeId: datum.nodeId,
      label: datum.label,
      amount: datum.amount,
      sourceIds: [...datum.sourceIds],
      locked: datum.locked,
      level,
      kind: datum.kind === 'positive' || datum.kind === 'negative' ? 'contribution' : 'anchor',
    });
  };

  for (const nodeId of viewSpec.rootOrder) {
    visit(nodeId, 1);
  }

  return entries;
}

function selectedEntry(entry: OutlineEntry, selection: SelectionState | null): boolean {
  return selection?.nodeIds.includes(entry.nodeId) === true;
}

function sortableTransform(
  transform: {
    readonly x: number;
    readonly y: number;
    readonly scaleX: number;
    readonly scaleY: number;
  } | null,
): string | undefined {
  return transform === null
    ? undefined
    : `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

interface SortableRowProps {
  readonly entry: OutlineEntry;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly selected: boolean;
  readonly tabIndex: 0 | -1;
  readonly dropPlacement: MoveTargetPlacement | null;
  readonly active: boolean;
  readonly sourceData: SourceData;
  readonly locale: EditorLocale;
  readonly messages: EditorMessages;
  readonly onSelect: (entry: OutlineEntry, additive: boolean) => void;
  readonly onKeyboardMove: (entry: OutlineEntry, direction: KeyboardMoveDirection) => void;
  readonly onNavigate: (
    entry: OutlineEntry,
    key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
  ) => boolean;
  readonly onRowFocus: (nodeId: string) => void;
  readonly onToggleGroup: (entry: OutlineEntry) => void;
}

function SortableRow({
  entry,
  disabled,
  readOnly,
  selected,
  tabIndex,
  dropPlacement,
  active,
  sourceData,
  locale,
  messages,
  onSelect,
  onKeyboardMove,
  onNavigate,
  onRowFocus,
  onToggleGroup,
}: SortableRowProps): React.JSX.Element {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, isDragging } =
    useSortable({
      id: entry.nodeId,
      disabled,
    });
  const setRowRef = useCallback(
    (node: HTMLDivElement | null): void => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setActivatorNodeRef, setNodeRef],
  );
  const style: CSSProperties = {
    transform: sortableTransform(transform),
    transition: isDragging ? undefined : 'transform 160ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging || active ? 1 : undefined,
  };
  const interactionState = isDragging || active ? 'dragging' : selected ? 'selected' : 'idle';

  return (
    <div
      {...listeners}
      className="tp-outline-row"
      data-draggable={disabled ? 'false' : 'true'}
      data-drop-indicator={
        dropPlacement === 'before' || dropPlacement === 'after' ? dropPlacement : undefined
      }
      data-drop-inside={dropPlacement === 'inside' ? 'true' : undefined}
      data-interaction-state={interactionState}
      data-level={entry.level}
      data-node-id={entry.nodeId}
      data-node-kind={entry.kind}
      data-selected={selected ? 'true' : 'false'}
      data-source-count={entry.sourceIds.length}
      role="treeitem"
      aria-level={entry.level}
      aria-selected={selected}
      aria-expanded={entry.expanded}
      aria-keyshortcuts={
        entry.kind !== 'anchor'
          ? 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight'
          : undefined
      }
      tabIndex={tabIndex}
      ref={setRowRef}
      style={style}
      onClick={event => {
        event.currentTarget.focus();
        onSelect(entry, event.ctrlKey || event.metaKey);
      }}
      onFocus={() => onRowFocus(entry.nodeId)}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) {
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
            onKeyboardMove(entry, direction);
          }
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(entry, event.ctrlKey || event.metaKey);
          return;
        }
        if (
          event.key === 'ArrowUp' ||
          event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight' ||
          event.key === 'Home' ||
          event.key === 'End'
        ) {
          const handled = onNavigate(entry, event.key);
          if (handled) {
            event.stopPropagation();
          }
          event.preventDefault();
        }
      }}
    >
      <button
        {...attributes}
        className="tp-row-grip"
        type="button"
        tabIndex={-1}
        aria-label={messages.dragLabel(entry.label)}
        aria-description={readOnly ? messages.readOnlyReason : undefined}
        title={
          disabled
            ? readOnly
              ? messages.readOnlyReason
              : entry.locked
                ? messages.locked
                : messages.targetUnavailable
            : messages.dragLabel(entry.label)
        }
        disabled={disabled}
        onClick={event => event.stopPropagation()}
      >
        <GripVertical size={14} aria-hidden="true" />
      </button>
      {entry.kind !== 'anchor' ? (
        <label
          className="tp-row-select-control"
          onClick={event => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
        >
          <input
            aria-label={messages.selectLabel(entry.label)}
            checked={selected}
            className="tp-row-select"
            type="checkbox"
            onChange={() => onSelect(entry, true)}
          />
        </label>
      ) : (
        <span className="tp-row-select-placeholder" aria-hidden="true" />
      )}
      <span className="tp-row-disclosure">
        {entry.expanded === undefined ? null : (
          <button
            className="tp-disclosure-button"
            type="button"
            aria-expanded={entry.expanded}
            aria-description={readOnly ? messages.readOnlyReason : undefined}
            aria-label={
              entry.expanded
                ? messages.collapseGroup(entry.label)
                : messages.expandGroup(entry.label)
            }
            title={
              readOnly
                ? messages.readOnlyReason
                : entry.expanded
                  ? messages.collapseGroup(entry.label)
                  : messages.expandGroup(entry.label)
            }
            disabled={readOnly}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              onToggleGroup(entry);
            }}
          >
            {entry.expanded ? (
              <ChevronDown size={15} aria-hidden="true" />
            ) : (
              <ChevronRight size={15} aria-hidden="true" />
            )}
          </button>
        )}
      </span>
      <span className="tp-row-main">
        <span className="tp-row-label">{entry.label}</span>
        {entry.groupSize === undefined ? null : (
          <span className="tp-row-meta">
            {entry.groupSize} {messages.groupedItems}
          </span>
        )}
      </span>
      <span className="tp-row-value">
        {entry.amount === null
          ? `${entry.sourceIds.length} ${messages.sourceItems}`
          : formatAmount(entry.amount, locale, sourceData.currency)}
      </span>
      {entry.locked ? (
        <LockKeyhole className="tp-row-lock" size={13} aria-label={messages.locked} />
      ) : (
        <span className="tp-row-lock-placeholder" aria-hidden="true" />
      )}
    </div>
  );
}

export function OutlinePanel({
  sourceData,
  viewSpec,
  projection,
  locale,
  messages,
  selection,
  readOnly,
  externalPreview = { state: 'idle' },
  onSelect,
  onMove,
  onToggleGroup,
  onCancel,
  onInteractionPreviewChange,
}: OutlinePanelProps): React.JSX.Element {
  const entries = useMemo(() => outlineEntries(viewSpec, projection), [projection, viewSpec]);
  const entryById = useMemo(() => new Map(entries.map(entry => [entry.nodeId, entry])), [entries]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTargetState | null>(null);
  const [dndSessionEpoch, setDndSessionEpoch] = useState(0);
  const [rovingNodeId, setRovingNodeId] = useState<string | null>(() => entries[0]?.nodeId ?? null);
  const currentRovingNodeId =
    rovingNodeId !== null && entryById.has(rovingNodeId)
      ? rovingNodeId
      : selection !== null && entryById.has(selection.nodeId)
        ? selection.nodeId
        : (entries[0]?.nodeId ?? null);
  const activeIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<DropTargetState | null>(null);
  const dragStartPointerYRef = useRef<number | null>(null);
  const dragScopeRef = useRef({ projection, readOnly, viewSpec });
  const treeRef = useRef<HTMLDivElement>(null);
  const focusTimerRef = useRef<{ readonly ownerWindow: Window; readonly id: number } | null>(null);

  const focusNode = useCallback((nodeId: string): void => {
    setRovingNodeId(nodeId);
    if (focusTimerRef.current !== null) {
      focusTimerRef.current.ownerWindow.clearTimeout(focusTimerRef.current.id);
    }
    const ownerWindow = treeRef.current?.ownerDocument.defaultView ?? window;
    const id = ownerWindow.setTimeout(() => {
      focusTimerRef.current = null;
      const nodes = Array.from(
        treeRef.current?.querySelectorAll<HTMLElement>('[data-node-id]') ?? [],
      );
      (
        nodes.find(
          element => element.dataset['nodeId'] === nodeId && element.offsetParent !== null,
        ) ?? nodes.find(element => element.dataset['nodeId'] === nodeId)
      )?.focus();
    }, 0);
    focusTimerRef.current = { ownerWindow, id };
  }, []);

  const resetDrag = useCallback((): void => {
    const wasActive = activeIdRef.current !== null;
    activeIdRef.current = null;
    dropTargetRef.current = null;
    dragStartPointerYRef.current = null;
    setActiveId(null);
    setDropTarget(null);
    if (wasActive) {
      onInteractionPreviewChange({ state: 'idle' });
    }
  }, [onInteractionPreviewChange]);

  useLayoutEffect(() => {
    const previous = dragScopeRef.current;
    const changed = previous.viewSpec !== viewSpec || previous.readOnly !== readOnly;
    dragScopeRef.current = { projection, readOnly, viewSpec };
    const cancelledNodeId = activeIdRef.current;
    if (changed && cancelledNodeId !== null) {
      resetDrag();
      setDndSessionEpoch(epoch => epoch + 1);
      onCancel('cancelled');
      focusNode(cancelledNodeId);
    }
  }, [focusNode, onCancel, projection, readOnly, resetDrag, viewSpec]);

  useEffect(() => {
    if (activeId === null) {
      return undefined;
    }
    const ownerDocument = treeRef.current?.ownerDocument ?? document;
    const ownerWindow = ownerDocument.defaultView ?? window;
    const handleBlur = (): void => {
      const KeyboardEventConstructor = ownerDocument.defaultView?.KeyboardEvent ?? KeyboardEvent;
      ownerDocument.dispatchEvent(
        new KeyboardEventConstructor('keydown', {
          key: 'Escape',
          code: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    ownerWindow.addEventListener('blur', handleBlur);
    return () => {
      ownerWindow.removeEventListener('blur', handleBlur);
    };
  }, [activeId]);

  const handleSelect = useCallback(
    (entry: OutlineEntry, additive: boolean): void => {
      if (!additive || entry.kind === 'anchor') {
        onSelect({
          nodeId: entry.nodeId,
          nodeIds: [entry.nodeId],
          sourceIds: [...entry.sourceIds],
        });
        return;
      }
      const currentIds = selection?.nodeIds ?? [];
      const next = new Set(currentIds);
      const entryId = entry.nodeId;
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      const orderedIds = entries
        .map(candidate => candidate.nodeId)
        .filter(nodeId => next.has(nodeId));
      const entryRemainsSelected = next.has(entryId);
      const selectedNodeIds = orderedIds.length === 0 ? [entryId] : orderedIds;
      onSelect({
        nodeId:
          selectedNodeIds.length === 0 || entryRemainsSelected
            ? entry.nodeId
            : (selectedNodeIds.at(-1) ?? entry.nodeId),
        nodeIds: selectedNodeIds,
        sourceIds: selectedNodeIds.flatMap(nodeId => collectLeafSourceIds(viewSpec, nodeId)),
      });
    },
    [entries, onSelect, selection, viewSpec],
  );

  useEffect(
    () => () => {
      if (focusTimerRef.current !== null) {
        focusTimerRef.current.ownerWindow.clearTimeout(focusTimerRef.current.id);
      }
    },
    [],
  );

  const handleKeyboardMove = useCallback(
    (entry: OutlineEntry, direction: KeyboardMoveDirection): void => {
      const resolved =
        entry.kind === 'anchor'
          ? ({ ok: true, target: { containerId: 'root', index: 0 } } as const)
          : resolveKeyboardMoveTarget(viewSpec, entry.nodeId, direction);
      if (!resolved.ok) {
        onCancel('invalid-target');
        focusNode(entry.nodeId);
        return;
      }
      onMove(entry.nodeId, resolved.target, 'keyboard');
      focusNode(entry.nodeId);
    },
    [focusNode, onCancel, onMove, viewSpec],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent): void => {
      const nodeId = String(event.active.id);
      activeIdRef.current = nodeId;
      dropTargetRef.current = null;
      dragStartPointerYRef.current =
        'clientY' in event.activatorEvent && typeof event.activatorEvent.clientY === 'number'
          ? event.activatorEvent.clientY
          : null;
      setActiveId(nodeId);
      setDropTarget(null);
      onInteractionPreviewChange({
        state: 'dragging',
        itemId: nodeId as ViewNodeId,
        target: null,
      });
    },
    [onInteractionPreviewChange],
  );

  const updateSemanticDropTarget = useCallback(
    (event: DragMoveEvent | DragOverEvent): void => {
      if (activeIdRef.current !== String(event.active.id)) {
        return;
      }
      if (event.over === null || String(event.over.id) === String(event.active.id)) {
        if (dropTargetRef.current !== null) {
          dropTargetRef.current = null;
          setDropTarget(null);
          onInteractionPreviewChange({
            state: 'dragging',
            itemId: String(event.active.id) as ViewNodeId,
            target: null,
          });
        }
        return;
      }
      const translated = event.active.rect.current.translated;
      const pointerY =
        dragStartPointerYRef.current === null ? null : dragStartPointerYRef.current + event.delta.y;
      const activeCenter =
        pointerY ??
        (translated === null ? event.over.rect.top : translated.top + translated.height / 2);
      const fallback =
        activeCenter < event.over.rect.top + event.over.rect.height / 2 ? 'before' : 'after';
      const targetNodeId = String(event.over.id) as ViewNodeId;
      const placement = resolvePointerDropPlacement(
        viewSpec,
        targetNodeId,
        event.over.rect.height <= 0
          ? Number.NaN
          : (activeCenter - event.over.rect.top) / event.over.rect.height,
        fallback,
      );
      const next: DropTargetState = {
        nodeId: targetNodeId,
        placement,
      };
      if (
        dropTargetRef.current?.nodeId === next.nodeId &&
        dropTargetRef.current.placement === next.placement
      ) {
        return;
      }
      dropTargetRef.current = next;
      setDropTarget(next);
      onInteractionPreviewChange({
        state: 'dragging',
        itemId: String(event.active.id) as ViewNodeId,
        target: next,
      });
    },
    [onInteractionPreviewChange, viewSpec],
  );

  const handleDragCancel = useCallback((): void => {
    if (activeIdRef.current === null) {
      return;
    }
    resetDrag();
    onCancel('cancelled');
  }, [onCancel, resetDrag]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const itemId = String(event.active.id);
      if (activeIdRef.current !== itemId) {
        return;
      }
      const semanticTarget = dropTargetRef.current;
      resetDrag();
      if (event.over === null || semanticTarget === null) {
        onCancel('cancelled');
        focusNode(itemId);
        return;
      }
      const resolved = resolvePointerMoveTarget(viewSpec, {
        itemId,
        targetNodeId: semanticTarget.nodeId,
        placement: semanticTarget.placement,
      });
      if (!resolved.ok) {
        onCancel('invalid-target');
      } else {
        onMove(itemId, resolved.target, 'outline');
      }
      focusNode(itemId);
    },
    [focusNode, onCancel, onMove, resetDrag, viewSpec],
  );

  const handleToggleGroup = useCallback(
    (entry: OutlineEntry): void => {
      if (entry.kind !== 'group' || entry.expanded === undefined) {
        return;
      }
      onSelect({
        nodeId: entry.nodeId,
        nodeIds: [entry.nodeId],
        sourceIds: [...entry.sourceIds],
      });
      onToggleGroup(entry.nodeId, entry.expanded);
    },
    [onSelect, onToggleGroup],
  );

  const handleTreeNavigation = useCallback(
    (
      entry: OutlineEntry,
      key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
    ): boolean => {
      const index = entries.findIndex(candidate => candidate.nodeId === entry.nodeId);
      if (index < 0) {
        return false;
      }

      if (key === 'Home' || key === 'End') {
        const target = key === 'Home' ? entries[0] : entries.at(-1);
        if (target !== undefined) {
          focusNode(target.nodeId);
        }
        return true;
      }
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        const target = entries[index + (key === 'ArrowUp' ? -1 : 1)];
        if (target !== undefined) {
          focusNode(target.nodeId);
        }
        return true;
      }
      if (key === 'ArrowRight' && entry.kind === 'group') {
        if (entry.expanded === false) {
          if (!readOnly) {
            handleToggleGroup(entry);
            focusNode(entry.nodeId);
          }
          return true;
        }
        const firstChild = entries[index + 1];
        if (firstChild !== undefined && firstChild.level > entry.level) {
          focusNode(firstChild.nodeId);
        }
        return true;
      }
      if (key === 'ArrowLeft') {
        if (entry.kind === 'group' && entry.expanded === true) {
          if (!readOnly) {
            handleToggleGroup(entry);
            focusNode(entry.nodeId);
          }
          return true;
        }
        if (entry.level > 1) {
          const parent = [...entries]
            .slice(0, index)
            .reverse()
            .find(candidate => candidate.kind === 'group' && candidate.level < entry.level);
          if (parent !== undefined) {
            focusNode(parent.nodeId);
          }
          return true;
        }
      }
      return false;
    },
    [entries, focusNode, handleToggleGroup, readOnly],
  );

  const externalDragging = activeId === null && externalPreview.state === 'dragging';
  const visibleDropTarget = externalDragging ? externalPreview.target : dropTarget;
  const visibleActiveId = externalDragging ? externalPreview.itemId : activeId;
  const activeEntry = activeId === null ? undefined : entryById.get(activeId);

  return (
    <div className="tp-panel-body tp-outline-body">
      <div className="tp-panel-heading">
        <h2>{messages.outline}</h2>
        <span>{entries.length}</span>
      </div>
      <DndContext
        key={dndSessionEpoch}
        accessibility={{
          screenReaderInstructions: {
            draggable: messages.dragInstructions,
          },
          announcements: {
            onDragStart: () => messages.moveInProgress,
            onDragOver: () => messages.moveInProgress,
            onDragEnd: ({ active, over }) =>
              over === null || String(over.id) === String(active.id)
                ? messages.actionCancelled
                : messages.moveValidationPending,
            onDragCancel: () => messages.actionCancelled,
          },
        }}
        collisionDetection={pointerWithin}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={updateSemanticDropTarget}
        onDragOver={updateSemanticDropTarget}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div
          className="tp-outline-tree"
          role="tree"
          aria-label={messages.outline}
          aria-multiselectable="true"
          data-interaction-state={activeId === null && !externalDragging ? 'idle' : 'dragging'}
          ref={treeRef}
        >
          <SortableContext
            items={entries.map(entry => entry.nodeId)}
            strategy={verticalListSortingStrategy}
          >
            {entries.map(entry => {
              const draggable = entry.kind !== 'anchor' && !entry.locked && !readOnly;
              return (
                <SortableRow
                  active={visibleActiveId === entry.nodeId}
                  disabled={!draggable}
                  dropPlacement={
                    visibleDropTarget?.nodeId === entry.nodeId ? visibleDropTarget.placement : null
                  }
                  entry={entry}
                  key={entry.nodeId}
                  locale={locale}
                  messages={messages}
                  readOnly={readOnly}
                  selected={selectedEntry(entry, selection)}
                  sourceData={sourceData}
                  tabIndex={currentRovingNodeId === entry.nodeId ? 0 : -1}
                  onKeyboardMove={handleKeyboardMove}
                  onNavigate={handleTreeNavigation}
                  onRowFocus={setRovingNodeId}
                  onSelect={handleSelect}
                  onToggleGroup={handleToggleGroup}
                />
              );
            })}
          </SortableContext>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeEntry === undefined ? null : (
            <div className="tp-drag-overlay" data-testid="outline-drag-overlay" aria-hidden="true">
              <GripVertical size={14} />
              <span>{activeEntry.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
