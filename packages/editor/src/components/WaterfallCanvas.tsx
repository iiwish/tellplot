import type { Chart as G2Chart, G2Spec } from '@antv/g2';
import { FoldVertical, Ungroup, UnfoldVertical } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import {
  resolveFinancialChartAppearance,
  type FinancialChartAppearance,
} from '../config/chartAppearance';
import type { GroupId, ViewNodeId } from '../domain/ids';
import type { Annotation, Emphasis, ViewSpec } from '../domain/model';
import { locateViewNode, ownGroup } from '../domain/viewTree';
import {
  createWaterfallChartSpec,
  shouldShowWaterfallValueLabels,
} from '../export/waterfallChartSpec';
import {
  readChartElementBounds,
  readChartElementPointer,
  readChartPointerPoint,
  readChartTargetX,
  resolveChartMinimumTargetHit,
  resolveChartHorizontalDropTarget,
  type ChartElementPointer,
  type ChartHorizontalBounds,
  type ChartPointerPoint,
} from '../interactions/chartPointer';
import { resolvePointerMoveTarget, type MoveTargetEdge } from '../interactions/moveTargets';
import type { WaterfallDatum, WaterfallProjection } from '../waterfall/waterfallTypes';
import type { EditorLocale } from './formatAmount';
import { AccessibleChartSummary } from './AccessibleChartSummary';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MOBILE_VIEWPORT_QUERY = '(max-width: 759px)';
const MINIMUM_POINTER_TARGET_SIZE = 32;
const CHART_ERROR = { code: 'CHART_RENDER_ERROR', path: '/chart' } as const;
const EMPTY_EMPHASIS: Readonly<Record<ViewNodeId, Emphasis>> = {};
const EMPTY_ANNOTATIONS: Readonly<Record<ViewNodeId, Annotation>> = {};

type G2ChartConstructor = typeof G2Chart;

let chartConstructorPromise: Promise<G2ChartConstructor> | undefined;

function loadChartConstructor(): Promise<G2ChartConstructor> {
  if (chartConstructorPromise !== undefined) {
    return chartConstructorPromise;
  }
  const pending = import('@antv/g2').then(module => module.Chart);
  chartConstructorPromise = pending;
  void pending.catch(() => {
    if (chartConstructorPromise === pending) {
      chartConstructorPromise = undefined;
    }
  });
  return pending;
}

interface ChartCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly empty: string;
  readonly visibleNodes: (count: number) => string;
  readonly collapseGroup: string;
  readonly expandGroup: string;
  readonly ungroup: string;
}

interface ChartRenderRequest {
  readonly id: number;
  readonly projection: WaterfallProjection;
  readonly spec: G2Spec;
}

interface ChartEventRegistration {
  readonly name: string;
  readonly listener: (event: unknown) => void;
}

interface ChartMoveTarget {
  readonly containerId: 'root' | GroupId;
  readonly index: number;
}

type ChartCancelReason = 'cancelled' | 'invalid-target' | 'item-locked';

export interface ChartDropTarget {
  readonly nodeId: ViewNodeId;
  readonly edge: MoveTargetEdge;
}

export type ChartInteractionPreview =
  | { readonly state: 'idle' }
  | {
      readonly state: 'dragging';
      readonly itemId: ViewNodeId;
      readonly target: ChartDropTarget | null;
    };

type ChartInteractionState =
  | { readonly state: 'idle' }
  | {
      readonly state: 'dragging';
      readonly itemId: ViewNodeId;
      readonly nodeId: ViewNodeId;
      readonly label: string;
      readonly target: ChartDropTarget | null;
    };

interface ChartInteractionConfig {
  readonly projection: WaterfallProjection;
  readonly viewSpec: ViewSpec | undefined;
  readonly readOnly: boolean;
  readonly onMove: WaterfallCanvasProps['onMove'];
  readonly onInteractionChange: WaterfallCanvasProps['onInteractionChange'];
  readonly onCancel: WaterfallCanvasProps['onCancel'];
  readonly onMarqueeSelection: WaterfallCanvasProps['onMarqueeSelection'];
  readonly onSelectNode: WaterfallCanvasProps['onSelectNode'];
}

interface ChartDragSession {
  readonly pointerId: number;
  readonly itemId: ViewNodeId;
  readonly nodeId: ViewNodeId;
  readonly label: string;
  readonly canvas: HTMLCanvasElement;
  readonly start: ChartPointerPoint;
  readonly orderedBounds: readonly ChartHorizontalBounds[];
  current: ChartPointerPoint;
  moved: boolean;
  target: ChartDropTarget | null;
}

interface ChartSelectionPressSession {
  readonly pointerId: number;
  readonly nodeId: ViewNodeId;
  readonly canvas: HTMLCanvasElement;
  readonly start: ChartPointerPoint;
  readonly dragCancelReason: ChartCancelReason;
  attemptedDrag: boolean;
}

interface ChartMarqueeSession {
  readonly pointerId: number;
  readonly canvas: HTMLCanvasElement;
  readonly start: ChartPointerPoint;
  current: ChartPointerPoint;
}

interface MarqueeRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface ChartGroupActions {
  readonly nodeId: ViewNodeId;
  readonly left: number;
  readonly top: number;
  readonly expandGroupId?: GroupId;
  readonly collapseGroupId?: GroupId;
  readonly ungroupGroupId?: GroupId;
}

type ChartGroupActionIds = Pick<
  ChartGroupActions,
  'expandGroupId' | 'collapseGroupId' | 'ungroupGroupId'
>;

const CHART_COPY: Readonly<Record<EditorLocale, ChartCopy>> = {
  'zh-CN': {
    eyebrow: '财务瀑布图',
    title: '经营变动瀑布图',
    empty: '暂无贡献项',
    visibleNodes: count => `${count} 个可见节点`,
    collapseGroup: '折叠分组',
    expandGroup: '展开分组',
    ungroup: '取消分组',
  },
  'en-US': {
    eyebrow: 'Financial waterfall',
    title: 'Operating bridge',
    empty: 'No contribution items',
    visibleNodes: count => `${count} visible nodes`,
    collapseGroup: 'Collapse group',
    expandGroup: 'Expand group',
    ungroup: 'Ungroup',
  },
};

export interface ChartRenderIssue {
  readonly code: 'CHART_RENDER_ERROR';
  readonly path: '/chart';
}

export interface WaterfallCanvasProps {
  readonly projection: WaterfallProjection;
  readonly viewSpec?: ViewSpec;
  readonly readOnly?: boolean;
  readonly title?: string;
  readonly locale?: EditorLocale;
  readonly currency?: string | undefined;
  readonly empty?: boolean;
  readonly reducedMotion?: boolean;
  readonly appearance?: FinancialChartAppearance | undefined;
  readonly externalPreview?: ChartInteractionPreview;
  readonly onRenderError?: (issue: ChartRenderIssue | null) => void;
  readonly onMove?: (nodeId: ViewNodeId, target: ChartMoveTarget, source: 'direct') => boolean;
  readonly onInteractionChange?: (preview: ChartInteractionPreview) => void;
  readonly onCancel?: (reason: ChartCancelReason) => void;
  readonly onMarqueeSelection?: (nodeIds: readonly ViewNodeId[]) => void;
  readonly onToggleGroup?: (groupId: GroupId, expanded: boolean) => void;
  readonly onUngroup?: (groupId: GroupId) => void;
  readonly onSelectNode?: (nodeId: ViewNodeId) => void;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

function notifyRenderIssue(
  callback: WaterfallCanvasProps['onRenderError'],
  issue: ChartRenderIssue | null,
): void {
  if (callback === undefined) {
    return;
  }

  try {
    callback(issue);
  } catch {
    console.error('tellplot callback failed: onRenderError');
  }
}

function notifyInteractionChange(
  callback: WaterfallCanvasProps['onInteractionChange'],
  preview: ChartInteractionPreview,
): void {
  if (callback === undefined) {
    return;
  }
  try {
    callback(preview);
  } catch {
    console.error('tellplot callback failed: onInteractionChange');
  }
}

function notifyCancel(callback: WaterfallCanvasProps['onCancel'], reason: ChartCancelReason): void {
  if (callback === undefined) {
    return;
  }
  try {
    callback(reason);
  } catch {
    console.error('tellplot callback failed: onCancel');
  }
}

function notifyMove(
  callback: WaterfallCanvasProps['onMove'],
  itemId: ViewNodeId,
  target: ChartMoveTarget,
): void {
  if (callback === undefined) {
    return;
  }
  try {
    callback(itemId, target, 'direct');
  } catch {
    console.error('tellplot callback failed: onMove');
  }
}

function notifyMarqueeSelection(
  callback: WaterfallCanvasProps['onMarqueeSelection'],
  nodeIds: readonly ViewNodeId[],
): void {
  if (callback === undefined) {
    return;
  }
  try {
    callback(nodeIds);
  } catch {
    console.error('tellplot callback failed: onMarqueeSelection');
  }
}

function notifySelectNode(
  callback: WaterfallCanvasProps['onSelectNode'],
  nodeId: ViewNodeId,
): void {
  if (callback === undefined) {
    return;
  }
  try {
    callback(nodeId);
  } catch {
    console.error('tellplot callback failed: onSelectNode');
  }
}

function marqueeRect(start: ChartPointerPoint, current: ChartPointerPoint): MarqueeRect {
  const left = Math.min(start.x, current.x);
  const top = Math.min(start.y, current.y);
  return {
    left,
    top,
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

function firstVisibleNodeForGroup(
  projection: WaterfallProjection,
  groupId: GroupId,
): ViewNodeId | undefined {
  return projection.find(datum => datum.nodeId === groupId || datum.groupPath.includes(groupId))
    ?.nodeId;
}

function resolveChartGroupActionIds(
  projection: WaterfallProjection,
  viewSpec: ViewSpec,
  datum: WaterfallDatum,
): ChartGroupActionIds | null {
  const collapsed = new Set(viewSpec.collapsedGroupIds);
  const own = ownGroup(viewSpec, datum.nodeId);
  const expandGroupId = own !== undefined && collapsed.has(own.id) ? own.id : undefined;
  const collapseGroupId = [...datum.groupPath]
    .reverse()
    .find(
      groupId =>
        !collapsed.has(groupId) && firstVisibleNodeForGroup(projection, groupId) === datum.nodeId,
    );
  if (expandGroupId === undefined && collapseGroupId === undefined) {
    return null;
  }
  const ungroupGroupId = expandGroupId ?? collapseGroupId;
  return {
    ...(expandGroupId === undefined ? {} : { expandGroupId }),
    ...(collapseGroupId === undefined ? {} : { collapseGroupId }),
    ...(ungroupGroupId === undefined ? {} : { ungroupGroupId }),
  };
}

function draggableDatum(datum: WaterfallDatum | undefined): WaterfallDatum | undefined {
  return datum !== undefined &&
    (datum.kind === 'positive' || datum.kind === 'negative' || datum.kind === 'group') &&
    !datum.locked
    ? datum
    : undefined;
}

function finishActiveAnimations(chart: G2Chart): void {
  try {
    for (const animation of chart.getContext().animations ?? []) {
      try {
        animation.finish();
      } catch {
        // Finishing an already-disposed animation is best effort.
      }
    }
  } catch {
    // A renderer without an animation context does not block the next request.
  }
}

/** Owns the real G2 canvas lifecycle for one immutable waterfall projection. */
export function WaterfallCanvas({
  projection,
  viewSpec,
  readOnly = false,
  title,
  locale = 'zh-CN',
  currency,
  empty,
  reducedMotion,
  appearance,
  externalPreview = { state: 'idle' },
  onRenderError,
  onMove,
  onInteractionChange,
  onCancel,
  onMarqueeSelection,
  onToggleGroup,
  onUngroup,
  onSelectNode,
}: WaterfallCanvasProps): React.JSX.Element {
  const stageRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<G2Chart | undefined>(undefined);
  const requestIdRef = useRef(0);
  const attemptedRequestIdRef = useRef(0);
  const latestRequestRef = useRef<ChartRenderRequest | undefined>(undefined);
  const flushRenderRef = useRef<() => Promise<void>>(async () => undefined);
  const registrationsRef = useRef<readonly ChartEventRegistration[]>([]);
  const onRenderErrorRef = useRef(onRenderError);
  const interactionConfigRef = useRef<ChartInteractionConfig>({
    projection,
    viewSpec,
    readOnly,
    onMove,
    onInteractionChange,
    onCancel,
    onMarqueeSelection,
    onSelectNode,
  });
  const dragSessionRef = useRef<ChartDragSession | null>(null);
  const selectionPressSessionRef = useRef<ChartSelectionPressSession | null>(null);
  const marqueeSessionRef = useRef<ChartMarqueeSession | null>(null);
  const pendingPointerRef = useRef<ChartPointerPoint | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderFrameRef = useRef<{ readonly ownerWindow: Window; readonly id: number } | null>(null);
  const applyPointerRef = useRef<() => void>(() => undefined);
  const cancelDragRef = useRef<(reason?: ChartCancelReason) => ChartDragSession | null>(() => null);
  const cancelSelectionPressRef = useRef<() => void>(() => undefined);
  const cancelMarqueeRef = useRef<(reason?: ChartCancelReason) => void>(() => undefined);
  const previousExternalStateRef = useRef<ChartInteractionPreview['state']>('idle');
  const [renderFailure, setRenderFailure] = useState<{
    readonly projection: WaterfallProjection;
    readonly issue: ChartRenderIssue;
  } | null>(null);
  const [interaction, setInteraction] = useState<ChartInteractionState>({ state: 'idle' });
  const [selectionRect, setSelectionRect] = useState<MarqueeRect | null>(null);
  const [groupActions, setGroupActions] = useState<ChartGroupActions | null>(null);
  const titleId = useId();
  const systemReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const isEmpty =
    empty ??
    !projection.some(
      datum => datum.kind === 'positive' || datum.kind === 'negative' || datum.kind === 'group',
    );
  const shouldReduceMotion = reducedMotion ?? systemReducedMotion;
  const emphasis = viewSpec?.emphasis ?? EMPTY_EMPHASIS;
  const annotations = viewSpec?.annotations ?? EMPTY_ANNOTATIONS;
  const renderIssue = renderFailure?.projection === projection ? renderFailure.issue : null;
  const copy = CHART_COPY[locale];
  const resolvedAppearance = resolveFinancialChartAppearance(appearance, title ?? copy.title);
  const visibleTitle = resolvedAppearance.title;

  const interactionTarget = interaction.state === 'dragging' ? interaction.target : null;

  useLayoutEffect(() => {
    onRenderErrorRef.current = onRenderError;
  }, [onRenderError]);

  useLayoutEffect(() => {
    const previous = interactionConfigRef.current;
    const scopeChanged = previous.viewSpec !== viewSpec || previous.readOnly !== readOnly;
    interactionConfigRef.current = {
      projection,
      viewSpec,
      readOnly,
      onMove,
      onInteractionChange,
      onCancel,
      onMarqueeSelection,
      onSelectNode,
    };
    if (scopeChanged && dragSessionRef.current !== null) {
      cancelDragRef.current('cancelled');
    }
    if (scopeChanged && selectionPressSessionRef.current !== null) {
      cancelSelectionPressRef.current();
    }
    if (scopeChanged && marqueeSessionRef.current !== null) {
      cancelMarqueeRef.current('cancelled');
    }
  }, [
    onCancel,
    onInteractionChange,
    onMarqueeSelection,
    onMove,
    onSelectNode,
    projection,
    readOnly,
    viewSpec,
  ]);

  useLayoutEffect(() => {
    if (interaction.state === 'dragging' && animationFrameRef.current === null) {
      applyPointerRef.current();
    }
  }, [interaction.state]);

  useLayoutEffect(() => {
    let cancelled = false;
    let destroyed = false;
    let rendering = false;
    const isEffectDisposed = (): boolean => cancelled;

    const host = hostRef.current;
    const ownerDocument =
      host?.ownerDocument ??
      stageRef.current?.ownerDocument ??
      (typeof document === 'undefined' ? undefined : document);
    const ownerWindow = ownerDocument?.defaultView;

    const cancelPointerFrame = (): void => {
      const frame = animationFrameRef.current;
      if (
        frame !== null &&
        ownerWindow !== undefined &&
        ownerWindow !== null &&
        typeof ownerWindow.cancelAnimationFrame === 'function'
      ) {
        ownerWindow.cancelAnimationFrame(frame);
      }
      animationFrameRef.current = null;
      pendingPointerRef.current = null;
    };

    const applyPendingPointer = (): void => {
      animationFrameRef.current = null;
      const point = pendingPointerRef.current;
      const currentHost = hostRef.current;
      const stage = stageRef.current;
      const overlay = overlayRef.current;
      if (
        isEffectDisposed() ||
        dragSessionRef.current === null ||
        point === null ||
        currentHost === null ||
        stage === null ||
        overlay === null
      ) {
        return;
      }
      const hostBounds = currentHost.getBoundingClientRect();
      const stageBounds = stage.getBoundingClientRect();
      const x = hostBounds.left - stageBounds.left + point.x;
      const y = hostBounds.top - stageBounds.top + point.y;
      overlay.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    applyPointerRef.current = applyPendingPointer;

    const schedulePointer = (point: ChartPointerPoint): void => {
      pendingPointerRef.current = point;
      if (animationFrameRef.current !== null) {
        return;
      }
      if (
        ownerWindow === undefined ||
        ownerWindow === null ||
        typeof ownerWindow.requestAnimationFrame !== 'function'
      ) {
        applyPendingPointer();
        return;
      }
      animationFrameRef.current = ownerWindow.requestAnimationFrame(applyPendingPointer);
    };

    const publishInteraction = (preview: ChartInteractionPreview): void => {
      if (isEffectDisposed()) {
        return;
      }
      if (preview.state === 'dragging') {
        const session = dragSessionRef.current;
        if (session === null) {
          return;
        }
        setInteraction({
          ...preview,
          nodeId: session.nodeId,
          label: session.label,
        });
      } else {
        setInteraction(preview);
      }
      notifyInteractionChange(interactionConfigRef.current.onInteractionChange, preview);
    };

    const detachCanvas = (session: Pick<ChartDragSession, 'canvas' | 'pointerId'>): void => {
      session.canvas.removeEventListener('pointercancel', handleNativePointerCancel);
      session.canvas.removeEventListener('lostpointercapture', handleLostPointerCapture);
      session.canvas.removeEventListener('pointerup', handleNativePointerUp);
      try {
        const hasCapture =
          typeof session.canvas.hasPointerCapture !== 'function' ||
          session.canvas.hasPointerCapture(session.pointerId);
        if (hasCapture && typeof session.canvas.releasePointerCapture === 'function') {
          session.canvas.releasePointerCapture(session.pointerId);
        }
      } catch {
        // The browser can release capture before adapter cleanup runs.
      }
    };

    const attachCanvas = (session: Pick<ChartDragSession, 'canvas' | 'pointerId'>): void => {
      session.canvas.addEventListener('pointercancel', handleNativePointerCancel);
      session.canvas.addEventListener('lostpointercapture', handleLostPointerCapture);
      session.canvas.addEventListener('pointerup', handleNativePointerUp);
      try {
        session.canvas.setPointerCapture(session.pointerId);
      } catch {
        // Pointer capture is best effort on browsers that already released the pointer.
      }
    };

    const resetDrag = (reason?: ChartCancelReason): ChartDragSession | null => {
      const session = dragSessionRef.current;
      if (session === null) {
        return null;
      }
      dragSessionRef.current = null;
      cancelPointerFrame();
      detachCanvas(session);
      hostRef.current?.style.removeProperty('--tp-chart-drop-x');
      if (!isEffectDisposed()) {
        if (session.moved) {
          publishInteraction({ state: 'idle' });
        }
        if (reason !== undefined) {
          notifyCancel(interactionConfigRef.current.onCancel, reason);
        }
      }
      return session;
    };
    cancelDragRef.current = resetDrag;

    const resetSelectionPress = (): ChartSelectionPressSession | null => {
      const session = selectionPressSessionRef.current;
      if (session === null) {
        return null;
      }
      selectionPressSessionRef.current = null;
      detachCanvas(session);
      return session;
    };
    cancelSelectionPressRef.current = (): void => {
      resetSelectionPress();
    };

    const resetMarquee = (reason?: ChartCancelReason): void => {
      const session = marqueeSessionRef.current;
      if (session === null) {
        return;
      }
      marqueeSessionRef.current = null;
      detachCanvas(session);
      if (!isEffectDisposed()) {
        setSelectionRect(null);
        if (reason !== undefined) {
          notifyCancel(interactionConfigRef.current.onCancel, reason);
        }
      }
    };
    cancelMarqueeRef.current = resetMarquee;

    const publishTarget = (target: ChartDropTarget | null, indicatorX?: number): void => {
      const session = dragSessionRef.current;
      if (session === null) {
        return;
      }
      if (session.target?.nodeId === target?.nodeId && session.target?.edge === target?.edge) {
        return;
      }
      session.target = target;
      if (target === null || indicatorX === undefined) {
        hostRef.current?.style.removeProperty('--tp-chart-drop-x');
      } else {
        hostRef.current?.style.setProperty('--tp-chart-drop-x', `${indicatorX}px`);
      }
      publishInteraction({
        state: 'dragging',
        itemId: session.itemId,
        target,
      });
    };

    const startElementPointerSession = (pointer: ChartElementPointer): void => {
      const config = interactionConfigRef.current;
      if (isEffectDisposed()) {
        return;
      }
      const chart = chartRef.current;
      if (chart !== undefined) {
        finishActiveAnimations(chart);
      }
      const projectedDatum = config.projection.find(
        candidate => candidate.nodeId === pointer.nodeId,
      );
      const canvas = hostRef.current?.querySelector<HTMLCanvasElement>('canvas');
      if (projectedDatum === undefined || canvas === null || canvas === undefined) {
        return;
      }
      const datum = draggableDatum(projectedDatum);
      if (
        datum === undefined ||
        config.readOnly ||
        config.viewSpec === undefined ||
        config.onMove === undefined
      ) {
        if (dragSessionRef.current !== null) {
          resetDrag('cancelled');
        }
        resetSelectionPress();
        const session: ChartSelectionPressSession = {
          pointerId: pointer.pointerId,
          nodeId: pointer.nodeId,
          canvas,
          start: pointer,
          dragCancelReason: projectedDatum.locked ? 'item-locked' : 'cancelled',
          attemptedDrag: false,
        };
        selectionPressSessionRef.current = session;
        attachCanvas(session);
        return;
      }
      const itemId = datum.nodeId;
      const location = locateViewNode(config.viewSpec, itemId);
      if (location === undefined) {
        return;
      }
      const sceneBounds = chart === undefined ? [] : readChartElementBounds(chart.getContext());
      const boundsByNode = new Map<ViewNodeId, ChartHorizontalBounds>();
      for (const bounds of sceneBounds) {
        boundsByNode.set(bounds.nodeId, bounds);
      }
      boundsByNode.set(itemId, {
        nodeId: itemId,
        minX: pointer.minX,
        maxX: pointer.maxX,
      });
      const orderedBounds: ChartHorizontalBounds[] = [];
      for (const nodeId of location.values) {
        const bounds = boundsByNode.get(nodeId);
        if (bounds !== undefined) {
          orderedBounds.push(bounds);
        }
      }

      resetDrag('cancelled');
      resetSelectionPress();
      const session: ChartDragSession = {
        pointerId: pointer.pointerId,
        itemId,
        nodeId: datum.nodeId,
        label: datum.label,
        canvas,
        start: pointer,
        orderedBounds,
        current: pointer,
        moved: false,
        target: null,
      };
      dragSessionRef.current = session;
      attachCanvas(session);
    };

    const handleElementPointerDown = (event: unknown): void => {
      setGroupActions(null);
      const pointer = readChartElementPointer(event);
      if (pointer !== undefined) {
        startElementPointerSession(pointer);
      }
    };

    const updateSelectionPress = (point: ChartPointerPoint): boolean => {
      const session = selectionPressSessionRef.current;
      if (session === null || point.pointerId !== session.pointerId) {
        return false;
      }
      if (!session.attemptedDrag && Math.abs(point.x - session.start.x) >= 4) {
        session.attemptedDrag = true;
        notifyCancel(interactionConfigRef.current.onCancel, session.dragCancelReason);
        resetSelectionPress();
      }
      return true;
    };

    const updateDragPointer = (point: ChartPointerPoint): boolean => {
      const session = dragSessionRef.current;
      if (session === null || point.pointerId !== session.pointerId) {
        return false;
      }
      session.current = point;
      if (!session.moved && Math.abs(point.x - session.start.x) < 4) {
        return true;
      }
      const horizontalTarget = resolveChartHorizontalDropTarget({
        itemId: session.itemId,
        startPointerX: session.start.x,
        pointerX: point.x,
        orderedBounds: session.orderedBounds,
      });
      const target =
        horizontalTarget === null
          ? null
          : { nodeId: horizontalTarget.nodeId, edge: horizontalTarget.edge };
      const wasPending = !session.moved;
      session.moved = true;
      schedulePointer(point);
      if (wasPending) {
        session.target = target;
        if (horizontalTarget === null) {
          hostRef.current?.style.removeProperty('--tp-chart-drop-x');
        } else {
          hostRef.current?.style.setProperty('--tp-chart-drop-x', `${horizontalTarget.targetX}px`);
        }
        publishInteraction({
          state: 'dragging',
          itemId: session.itemId,
          target,
        });
        return true;
      }
      publishTarget(target, horizontalTarget?.targetX);
      return true;
    };

    const handleElementPointerMove = (event: unknown): void => {
      const point = readChartPointerPoint(event);
      if (point !== undefined) {
        if (updateSelectionPress(point)) {
          return;
        }
        updateDragPointer(point);
      }
    };

    const handleElementPointerOver = (event: unknown): void => {
      handleElementPointerMove(event);
      if (
        dragSessionRef.current !== null ||
        selectionPressSessionRef.current !== null ||
        marqueeSessionRef.current !== null
      ) {
        return;
      }
      const pointer = readChartElementPointer(event);
      const config = interactionConfigRef.current;
      const chart = chartRef.current;
      if (pointer === undefined || config.viewSpec === undefined || chart === undefined) {
        return;
      }
      const datum = config.projection.find(candidate => candidate.nodeId === pointer.nodeId);
      if (datum === undefined) {
        return;
      }
      const actionIds = resolveChartGroupActionIds(config.projection, config.viewSpec, datum);
      if (actionIds === null) {
        setGroupActions(null);
        return;
      }
      const bounds = readChartElementBounds(chart.getContext()).find(
        element => element.nodeId === datum.nodeId,
      );
      if (bounds === undefined) {
        return;
      }
      setGroupActions({
        nodeId: datum.nodeId,
        left: (bounds.minX + bounds.maxX) / 2,
        top: Math.max(4, bounds.minY - 38),
        ...actionIds,
      });
    };

    const handleElementPointerOut = (event: unknown): void => {
      const point = readChartPointerPoint(event);
      if (point !== undefined) {
        if (updateSelectionPress(point)) {
          return;
        }
        updateDragPointer(point);
      }
    };

    const handlePlotPointerDown = (event: unknown): void => {
      setGroupActions(null);
      const config = interactionConfigRef.current;
      if (dragSessionRef.current !== null || selectionPressSessionRef.current !== null) {
        return;
      }
      const point = readChartPointerPoint(event);
      const canvas = hostRef.current?.querySelector<HTMLCanvasElement>('canvas');
      if (point === undefined || canvas === null || canvas === undefined) {
        return;
      }
      const chart = chartRef.current;
      const sceneBounds = chart === undefined ? [] : readChartElementBounds(chart.getContext());
      const pointHitsMark = sceneBounds.some(
        bounds =>
          point.x >= bounds.minX &&
          point.x <= bounds.maxX &&
          point.y >= bounds.minY &&
          point.y <= bounds.maxY,
      );
      if (pointHitsMark) {
        return;
      }
      const ownerWindow = canvas.ownerDocument.defaultView;
      const usesMinimumTargets =
        ownerWindow !== null &&
        typeof ownerWindow.matchMedia === 'function' &&
        ownerWindow.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
      const expandedTarget = usesMinimumTargets
        ? resolveChartMinimumTargetHit(point, sceneBounds, MINIMUM_POINTER_TARGET_SIZE)
        : undefined;
      if (expandedTarget !== undefined) {
        resetMarquee('cancelled');
        startElementPointerSession(expandedTarget);
        return;
      }
      if (
        config.readOnly ||
        config.viewSpec === undefined ||
        config.onMarqueeSelection === undefined
      ) {
        return;
      }
      resetMarquee('cancelled');
      marqueeSessionRef.current = {
        pointerId: point.pointerId,
        canvas,
        start: point,
        current: point,
      };
      attachCanvas(marqueeSessionRef.current);
      setSelectionRect(marqueeRect(point, point));
    };

    const handlePlotPointerMove = (event: unknown): void => {
      const point = readChartPointerPoint(event);
      if (point !== undefined && updateSelectionPress(point)) {
        return;
      }
      if (point !== undefined && updateDragPointer(point)) {
        return;
      }
      const marquee = marqueeSessionRef.current;
      if (marquee !== null && point !== undefined && point.pointerId === marquee.pointerId) {
        marquee.current = point;
        setSelectionRect(marqueeRect(marquee.start, point));
      }
    };

    const completeSelectionPress = (point: ChartPointerPoint): boolean => {
      const session = selectionPressSessionRef.current;
      if (session === null || point.pointerId !== session.pointerId) {
        return false;
      }
      updateSelectionPress(point);
      resetSelectionPress();
      if (!session.attemptedDrag) {
        notifySelectNode(interactionConfigRef.current.onSelectNode, session.nodeId);
      }
      return true;
    };

    const completeDrag = (point: ChartPointerPoint, forceCancel = false): boolean => {
      const session = dragSessionRef.current;
      if (session === null || point.pointerId !== session.pointerId) {
        return false;
      }
      const target = forceCancel ? null : session.target;
      const config = interactionConfigRef.current;
      session.current = point;
      if (forceCancel) {
        resetDrag();
        notifyCancel(config.onCancel, 'cancelled');
        return true;
      }
      session.moved ||= Math.abs(point.x - session.start.x) >= 4;
      resetDrag();
      if (target === null || config.viewSpec === undefined) {
        if (!session.moved) {
          notifySelectNode(config.onSelectNode, session.nodeId);
        } else {
          notifyCancel(config.onCancel, 'cancelled');
        }
        return true;
      }
      const resolved = resolvePointerMoveTarget(config.viewSpec, {
        itemId: session.itemId,
        targetNodeId: target.nodeId,
        edge: target.edge,
      });
      if (!resolved.ok) {
        notifyCancel(config.onCancel, 'invalid-target');
        return true;
      }
      notifyMove(config.onMove, session.itemId, resolved.target);
      return true;
    };

    const handlePlotPointerUp = (event: unknown): void => {
      const point = readChartPointerPoint(event);
      if (point !== undefined && completeSelectionPress(point)) {
        return;
      }
      const marquee = marqueeSessionRef.current;
      if (marquee !== null && point !== undefined && point.pointerId === marquee.pointerId) {
        marquee.current = point;
        const bounds = marqueeRect(marquee.start, point);
        const chart = chartRef.current;
        const config = interactionConfigRef.current;
        resetMarquee();
        if (bounds.width < 4 || bounds.height < 4 || chart === undefined) {
          notifyCancel(config.onCancel, 'cancelled');
          return;
        }
        const maxX = bounds.left + bounds.width;
        const maxY = bounds.top + bounds.height;
        const selectable = new Set(
          config.projection
            .filter(
              datum =>
                !datum.locked &&
                (datum.kind === 'positive' || datum.kind === 'negative' || datum.kind === 'group'),
            )
            .map(datum => datum.nodeId),
        );
        const selectedIds = readChartElementBounds(chart.getContext())
          .filter(
            element =>
              selectable.has(element.nodeId) &&
              element.maxX >= bounds.left &&
              element.minX <= maxX &&
              element.maxY >= bounds.top &&
              element.minY <= maxY,
          )
          .map(element => element.nodeId);
        if (selectedIds.length < 2) {
          notifyCancel(config.onCancel, 'cancelled');
          return;
        }
        notifyMarqueeSelection(config.onMarqueeSelection, selectedIds);
        return;
      }
      if (point !== undefined) {
        updateDragPointer(point);
        completeDrag(point);
      }
    };

    const handlePlotPointerUpOutside = (event: unknown): void => {
      const point = readChartPointerPoint(event);
      const selectionPress = selectionPressSessionRef.current;
      if (
        selectionPress !== null &&
        (point === undefined || point.pointerId === selectionPress.pointerId)
      ) {
        if (point !== undefined) {
          updateSelectionPress(point);
        }
        resetSelectionPress();
        return;
      }
      const marquee = marqueeSessionRef.current;
      if (marquee !== null && (point === undefined || point.pointerId === marquee.pointerId)) {
        resetMarquee('cancelled');
        return;
      }
      const session = dragSessionRef.current;
      if (session === null || (point !== undefined && point.pointerId !== session.pointerId)) {
        return;
      }
      resetDrag('cancelled');
    };

    function handleNativePointerCancel(event: PointerEvent): void {
      if (dragSessionRef.current?.pointerId === event.pointerId) {
        resetDrag('cancelled');
      } else if (selectionPressSessionRef.current?.pointerId === event.pointerId) {
        resetSelectionPress();
      } else if (marqueeSessionRef.current?.pointerId === event.pointerId) {
        resetMarquee('cancelled');
      }
    }

    function handleLostPointerCapture(event: PointerEvent): void {
      if (dragSessionRef.current?.pointerId === event.pointerId) {
        resetDrag('cancelled');
      } else if (selectionPressSessionRef.current?.pointerId === event.pointerId) {
        resetSelectionPress();
      } else if (marqueeSessionRef.current?.pointerId === event.pointerId) {
        resetMarquee('cancelled');
      }
    }

    function handleNativePointerUp(event: PointerEvent): void {
      const pointerId = event.pointerId;
      const session =
        dragSessionRef.current?.pointerId === pointerId ? dragSessionRef.current : null;
      const selectionPress =
        selectionPressSessionRef.current?.pointerId === pointerId
          ? selectionPressSessionRef.current
          : null;
      const marquee =
        marqueeSessionRef.current?.pointerId === pointerId ? marqueeSessionRef.current : null;
      const activeSession = session ?? selectionPress ?? marquee;
      if (activeSession === null) {
        return;
      }
      const bounds = activeSession.canvas.getBoundingClientRect();
      const releasedInsideCanvas =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;
      if (session !== null) {
        completeDrag(session.current, !releasedInsideCanvas);
        return;
      }
      if (selectionPress !== null) {
        resetSelectionPress();
        if (releasedInsideCanvas) {
          notifySelectNode(interactionConfigRef.current.onSelectNode, selectionPress.nodeId);
        }
        return;
      }
      if (releasedInsideCanvas) {
        return;
      }
      queueMicrotask(() => {
        if (isEffectDisposed()) {
          return;
        }
        if (marqueeSessionRef.current?.pointerId === pointerId) {
          resetMarquee('cancelled');
        }
      });
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key === 'Escape' &&
        (dragSessionRef.current !== null ||
          selectionPressSessionRef.current !== null ||
          marqueeSessionRef.current !== null)
      ) {
        event.preventDefault();
        resetDrag('cancelled');
        resetSelectionPress();
        resetMarquee('cancelled');
      }
    };

    const handleWindowBlur = (): void => {
      resetDrag('cancelled');
      resetSelectionPress();
      resetMarquee('cancelled');
    };

    ownerDocument?.addEventListener('keydown', handleKeyDown);
    ownerWindow?.addEventListener('blur', handleWindowBlur);

    const flushRender = async (): Promise<void> => {
      const chart = chartRef.current;
      if (chart === undefined || isEffectDisposed() || rendering) {
        return;
      }

      rendering = true;
      try {
        while (!isEffectDisposed()) {
          const request = latestRequestRef.current;
          if (request === undefined || request.id === attemptedRequestIdRef.current) {
            break;
          }

          const attemptId = request.id;
          let succeeded = false;
          try {
            chart.options(request.spec);
            await chart.render();
            succeeded = true;
          } catch {
            succeeded = false;
          }
          if (isEffectDisposed()) {
            return;
          }
          attemptedRequestIdRef.current = attemptId;
          if (latestRequestRef.current?.id !== attemptId) {
            continue;
          }

          if (succeeded) {
            setRenderFailure(null);
            notifyRenderIssue(onRenderErrorRef.current, null);
          } else {
            console.error('tellplot chart render failed: CHART_RENDER_ERROR /chart');
            setRenderFailure({ projection: request.projection, issue: CHART_ERROR });
            notifyRenderIssue(onRenderErrorRef.current, CHART_ERROR);
          }
          break;
        }
      } finally {
        rendering = false;
        const latest = latestRequestRef.current;
        if (
          !isEffectDisposed() &&
          latest !== undefined &&
          latest.id !== attemptedRequestIdRef.current
        ) {
          void flushRenderRef.current();
        }
      }
    };
    flushRenderRef.current = flushRender;

    const initializeChart = async (): Promise<void> => {
      const Chart = await loadChartConstructor();
      if (isEffectDisposed()) {
        return;
      }
      const host = hostRef.current;
      if (host === null) {
        throw new Error('Chart host is unavailable');
      }

      const chart = new Chart({ container: host, autoFit: true });
      chartRef.current = chart;
      const registrations: readonly ChartEventRegistration[] = [
        { name: 'element:pointerdown', listener: handleElementPointerDown },
        { name: 'element:pointerover', listener: handleElementPointerOver },
        { name: 'element:pointermove', listener: handleElementPointerMove },
        { name: 'element:pointerout', listener: handleElementPointerOut },
        { name: 'plot:pointerdown', listener: handlePlotPointerDown },
        { name: 'plot:pointermove', listener: handlePlotPointerMove },
        { name: 'plot:pointerup', listener: handlePlotPointerUp },
        { name: 'plot:pointerupoutside', listener: handlePlotPointerUpOutside },
      ];
      registrationsRef.current = registrations;
      for (const registration of registrations) {
        chart.on(registration.name, registration.listener);
      }
      await flushRender();
    };

    void initializeChart().catch(() => {
      if (isEffectDisposed()) {
        return;
      }
      console.error('tellplot chart render failed: CHART_RENDER_ERROR /chart');
      const request = latestRequestRef.current;
      if (request !== undefined) {
        setRenderFailure({ projection: request.projection, issue: CHART_ERROR });
      }
      notifyRenderIssue(onRenderErrorRef.current, CHART_ERROR);
    });

    return () => {
      cancelled = true;
      ownerDocument?.removeEventListener('keydown', handleKeyDown);
      ownerWindow?.removeEventListener('blur', handleWindowBlur);
      resetDrag();
      resetSelectionPress();
      resetMarquee();
      cancelDragRef.current = () => null;
      cancelSelectionPressRef.current = () => undefined;
      cancelMarqueeRef.current = () => undefined;
      cancelPointerFrame();
      if (renderFrameRef.current !== null) {
        renderFrameRef.current.ownerWindow.cancelAnimationFrame(renderFrameRef.current.id);
        renderFrameRef.current = null;
      }
      applyPointerRef.current = () => undefined;
      const chart = chartRef.current;
      if (chart === undefined || destroyed) {
        return;
      }
      for (const registration of registrationsRef.current) {
        chart.off(registration.name, registration.listener);
      }
      registrationsRef.current = [];
      destroyed = true;
      try {
        chart.destroy();
      } catch {
        console.error('tellplot chart cleanup failed at /chart');
      } finally {
        chartRef.current = undefined;
      }
    };
  }, []);

  useLayoutEffect(() => {
    requestIdRef.current += 1;
    latestRequestRef.current = {
      id: requestIdRef.current,
      projection,
      spec: createWaterfallChartSpec({
        projection,
        locale,
        currency,
        reducedMotion: shouldReduceMotion,
        showValueLabels: shouldShowWaterfallValueLabels(projection),
        annotations,
        emphasis,
        appearance,
      }),
    };
    const chart = chartRef.current;
    if (chart !== undefined) {
      const ownerWindow = hostRef.current?.ownerDocument.defaultView;
      const flushLatest = (): void => {
        renderFrameRef.current = null;
        const activeChart = chartRef.current;
        if (activeChart === undefined) {
          return;
        }
        finishActiveAnimations(activeChart);
        void flushRenderRef.current();
      };
      if (
        ownerWindow !== undefined &&
        ownerWindow !== null &&
        typeof ownerWindow.requestAnimationFrame === 'function'
      ) {
        if (renderFrameRef.current !== null) {
          renderFrameRef.current.ownerWindow.cancelAnimationFrame(renderFrameRef.current.id);
        }
        const id = ownerWindow.requestAnimationFrame(flushLatest);
        renderFrameRef.current = { ownerWindow, id };
      } else {
        queueMicrotask(flushLatest);
      }
    }
  }, [annotations, appearance, currency, emphasis, locale, projection, shouldReduceMotion]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }
    const externalStarted =
      previousExternalStateRef.current === 'idle' && externalPreview.state === 'dragging';
    previousExternalStateRef.current = externalPreview.state;
    if (interaction.state === 'dragging') {
      host.removeAttribute('data-preview-source');
      if (interactionTarget === null) {
        host.removeAttribute('data-drop-indicator');
        host.removeAttribute('data-drop-node-id');
        host.style.removeProperty('--tp-chart-drop-x');
      }
      return;
    }
    const target = externalPreview.state === 'dragging' ? externalPreview.target : null;
    const chart = chartRef.current;
    if (externalStarted && chart !== undefined) {
      finishActiveAnimations(chart);
    }
    const targetX =
      target === null || chart === undefined
        ? undefined
        : readChartTargetX(chart.getContext(), target.nodeId, target.edge);
    if (target === null || targetX === undefined) {
      host.removeAttribute('data-drop-indicator');
      host.removeAttribute('data-drop-node-id');
      host.removeAttribute('data-preview-source');
      host.style.removeProperty('--tp-chart-drop-x');
      return;
    }
    host.setAttribute('data-drop-indicator', target.edge);
    host.setAttribute('data-drop-node-id', target.nodeId);
    host.setAttribute('data-preview-source', 'outline');
    host.style.setProperty('--tp-chart-drop-x', `${targetX}px`);
  }, [externalPreview, interaction.state, interactionTarget]);

  const externalInteractionActive =
    interaction.state === 'idle' && externalPreview.state === 'dragging';
  const currentGroupActionDatum =
    groupActions === null
      ? undefined
      : projection.find(datum => datum.nodeId === groupActions.nodeId);
  const currentGroupActionIds =
    viewSpec === undefined || currentGroupActionDatum === undefined
      ? null
      : resolveChartGroupActionIds(projection, viewSpec, currentGroupActionDatum);
  const visibleGroupActions =
    groupActions !== null && currentGroupActionIds !== null
      ? {
          nodeId: groupActions.nodeId,
          left: groupActions.left,
          top: groupActions.top,
          ...currentGroupActionIds,
        }
      : null;
  const groupActionLabel = (groupId: GroupId): string =>
    viewSpec === undefined ? '' : (ownGroup(viewSpec, groupId)?.label ?? '');

  return (
    <section
      aria-labelledby={titleId}
      className="tp-chart-stage"
      data-interaction-state={externalInteractionActive ? 'dragging' : interaction.state}
      data-testid="tellplot-chart-stage"
      ref={stageRef}
    >
      <header className="tp-chart-stage__header">
        <div>
          <p className="tp-chart-stage__eyebrow">{copy.eyebrow}</p>
          <h2 className="tp-chart-stage__title" id={titleId}>
            {visibleTitle}
          </h2>
        </div>
        <span className="tp-chart-stage__count">{copy.visibleNodes(projection.length)}</span>
      </header>

      {isEmpty ? <p className="tp-chart-stage__empty">{copy.empty}</p> : null}
      {renderIssue === null ? null : (
        <div className="tp-chart-stage__error" role="alert">
          <strong>{renderIssue.code}</strong>
          <code>{renderIssue.path}</code>
        </div>
      )}

      <div className="tp-chart-stage__plot-shell">
        <div
          aria-hidden="true"
          className="tp-chart-stage__plot"
          data-drop-indicator={
            interaction.state === 'dragging' ? interaction.target?.edge : undefined
          }
          data-drop-node-id={
            interaction.state === 'dragging' ? interaction.target?.nodeId : undefined
          }
          data-testid="tellplot-chart"
          ref={hostRef}
        />
        {selectionRect === null ? null : (
          <div
            aria-hidden="true"
            className="tp-chart-marquee"
            data-testid="chart-marquee"
            style={{
              left: selectionRect.left,
              top: selectionRect.top,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
        )}
        {visibleGroupActions === null ? null : (
          <div
            className="tp-chart-group-actions"
            data-node-id={visibleGroupActions.nodeId}
            style={{ left: visibleGroupActions.left, top: visibleGroupActions.top }}
            onPointerDown={event => event.stopPropagation()}
          >
            {visibleGroupActions.expandGroupId === undefined ? null : (
              <button
                aria-label={`${copy.expandGroup}: ${groupActionLabel(visibleGroupActions.expandGroupId)}`}
                title={`${copy.expandGroup}: ${groupActionLabel(visibleGroupActions.expandGroupId)}`}
                type="button"
                disabled={readOnly}
                onClick={() => onToggleGroup?.(visibleGroupActions.expandGroupId as GroupId, false)}
              >
                <UnfoldVertical size={15} aria-hidden="true" />
              </button>
            )}
            {visibleGroupActions.collapseGroupId === undefined ? null : (
              <button
                aria-label={`${copy.collapseGroup}: ${groupActionLabel(visibleGroupActions.collapseGroupId)}`}
                title={`${copy.collapseGroup}: ${groupActionLabel(visibleGroupActions.collapseGroupId)}`}
                type="button"
                disabled={readOnly}
                onClick={() =>
                  onToggleGroup?.(visibleGroupActions.collapseGroupId as GroupId, true)
                }
              >
                <FoldVertical size={15} aria-hidden="true" />
              </button>
            )}
            {visibleGroupActions.ungroupGroupId === undefined ? null : (
              <button
                aria-label={`${copy.ungroup}: ${groupActionLabel(visibleGroupActions.ungroupGroupId)}`}
                title={`${copy.ungroup}: ${groupActionLabel(visibleGroupActions.ungroupGroupId)}`}
                type="button"
                disabled={readOnly}
                onClick={() => onUngroup?.(visibleGroupActions.ungroupGroupId as GroupId)}
              >
                <Ungroup size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
      {interaction.state === 'dragging' ? (
        <div
          aria-hidden="true"
          className="tp-chart-drag-overlay"
          data-node-id={interaction.nodeId}
          data-testid="chart-drag-overlay"
          ref={overlayRef}
        >
          {interaction.label}
        </div>
      ) : null}

      <AccessibleChartSummary
        annotations={annotations}
        projection={projection}
        title={visibleTitle}
        locale={locale}
        currency={currency}
        numberFormat={resolvedAppearance.numberFormat}
      />
    </section>
  );
}
