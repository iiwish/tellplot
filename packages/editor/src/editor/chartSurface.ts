import {
  collectLeafSourceIds,
  locateViewNode,
  ownGroup,
  projectChartCategoryBounds,
  projectChartCategorySourceGroupBounds,
  resolveChartCategoryDropTarget,
  resolveChartCategoryMinimumTargetHit,
  resolveChartCategorySourceGroupExitTarget,
  resolveFinancialChartAppearance,
  resolvePointerDropPlacement,
  resolvePointerMoveTarget,
  toFinancialChartAppearance,
  type CategoryAxis,
  type ChartCategoryBounds,
  type ChartCategoryGroupBounds,
  type ChartConfig,
  type GroupId,
  type ViewNodeId,
  type ViewSpec,
} from '@tellplot/core';
import {
  createCategoricalChartSpec,
  shouldShowCategoricalValueLabels,
} from '../charts/categorical/spec';
import { projectExpandedGroupRegions } from '../charts/groupRegions';
import { createWaterfallChartSpec, shouldShowWaterfallValueLabels } from '../charts/waterfall/spec';
import { createG2ChartRuntime, type G2ChartRuntime } from '../rendering/g2/chartRuntime';
import {
  readChartCategoryElementPointer,
  readChartElementBounds,
  type ChartSceneElementBounds,
  type ChartPointerPoint,
} from '../rendering/g2/chartPointer';
import { button, element, setOptionalAttribute } from './dom';
import type { EditorLocale } from './formatAmount';
import type { EditorLayoutMode } from './layout';
import type { EditorMessages } from './messages';
import { chartTitle, type EditorChartProjection } from './projection';
import type { ChartRenderIssue } from './types';

interface ChartMoveTarget {
  readonly containerId: 'root' | GroupId;
  readonly index: number;
}

export interface ChartSurfaceCallbacks {
  readonly onMove: (nodeId: ViewNodeId, target: ChartMoveTarget) => void;
  readonly onSelect: (nodeId: ViewNodeId) => void;
  readonly onMarqueeSelection: (nodeIds: readonly ViewNodeId[]) => void;
  readonly onToggleGroup: (groupId: GroupId, expanded: boolean) => void;
  readonly onUngroup: (groupId: GroupId) => void;
  readonly onCancel: (reason: 'cancelled' | 'invalid-target' | 'item-locked') => void;
  readonly onInteractionChange: (preview: ChartSurfaceInteractionPreview) => void;
  readonly onInteractionAbort: () => void;
  readonly onRenderError: (issue: ChartRenderIssue | null) => void;
}

export type ChartSurfaceInteractionPreview =
  | { readonly state: 'idle' }
  | { readonly state: 'selecting' }
  | {
      readonly state: 'dragging';
      readonly itemId: ViewNodeId;
      readonly target: {
        readonly nodeId: ViewNodeId;
        readonly placement: 'before' | 'after' | 'inside';
      } | null;
    };

export interface ChartSurfaceState {
  readonly config: ChartConfig;
  readonly view: ViewSpec;
  readonly chart: EditorChartProjection;
  readonly messages: EditorMessages;
}

export interface ChartSurface {
  readonly element: HTMLElement;
  update(state: ChartSurfaceState): void;
  preview(state: ChartSurfaceState | null): void;
  setLayoutMode(mode: EditorLayoutMode): void;
  cancelInteraction(): void;
  destroy(): void;
}

interface DragSession {
  readonly pointerId: number;
  readonly itemId: ViewNodeId;
  readonly axis: CategoryAxis;
  readonly start: ChartPointerPoint;
  readonly orderedBounds: readonly ChartCategoryBounds[];
  readonly sourceGroupBounds: readonly ChartCategoryGroupBounds[];
  readonly markBounds: ChartSceneElementBounds | undefined;
  readonly revision: number;
  current: ChartPointerPoint;
  moved: boolean;
  target: { readonly nodeId: ViewNodeId; readonly placement: 'before' | 'after' | 'inside' } | null;
}

interface MarqueeSession {
  readonly pointerId: number;
  readonly start: ChartPointerPoint;
  current: ChartPointerPoint;
}

interface ChartRenderRequestValue {
  readonly chart: EditorChartProjection;
  readonly authoritative: boolean;
  readonly interactionSignature: string;
}

const CHART_RENDER_ISSUE = Object.freeze<ChartRenderIssue>({
  code: 'CHART_RENDER_ERROR',
  path: '/chart',
});

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MINIMUM_DRAG_DISTANCE = 4;
const GROUP_ACTION_INSET = 4;
const GROUP_ACTION_HORIZONTAL_MINIMUM_WIDTH = 48;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const chartTitleCounters = new WeakMap<Document, number>();

type GroupActionIcon = 'expand' | 'collapse' | 'ungroup';

function createGroupActionIcon(document: Document, icon: GroupActionIcon): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('class', `tp-chart-group-action-icon tp-chart-group-action-icon--${icon}`);
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const paths =
    icon === 'expand'
      ? ['M8 3v10', 'M3 8h10']
      : icon === 'collapse'
        ? ['M3 8h10']
        : [
            'M6.25 10.5H5a2.5 2.5 0 0 1 0-5h1.25',
            'M9.75 5.5H11a2.5 2.5 0 0 1 0 5H9.75',
            'M5.5 8h5',
            'M3 3l10 10',
          ];
  paths.forEach(pathData => {
    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  });
  return svg;
}

function nextChartTitleId(document: Document): string {
  let counter = chartTitleCounters.get(document) ?? 0;
  let id: string;
  do {
    counter += 1;
    id = `tp-chart-title-${counter}`;
  } while (document.getElementById(id) !== null);
  chartTitleCounters.set(document, counter);
  return id;
}

function mediaQuery(ownerWindow: Window | null, query: string): MediaQueryList | undefined {
  return ownerWindow !== null && typeof ownerWindow.matchMedia === 'function'
    ? ownerWindow.matchMedia(query)
    : undefined;
}

function axisFor(chart: EditorChartProjection): CategoryAxis {
  return chart.chartType === 'bar' ? 'y' : 'x';
}

function interactionSignature(chart: EditorChartProjection): string {
  return JSON.stringify(chart);
}

function isDraggable(chart: EditorChartProjection, nodeId: ViewNodeId): boolean {
  const datum = chart.projection.find(candidate => candidate.nodeId === nodeId);
  return (
    datum !== undefined &&
    !datum.locked &&
    (chart.family === 'categorical' ||
      datum.kind === 'positive' ||
      datum.kind === 'negative' ||
      datum.kind === 'group')
  );
}

function pointFromPointerEvent(event: PointerEvent, canvas: HTMLCanvasElement): ChartPointerPoint {
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width > 0 ? bounds.width : canvas.width;
  const height = bounds.height > 0 ? bounds.height : canvas.height;
  return {
    pointerId: event.pointerId,
    x: bounds.width > 0 ? ((event.clientX - bounds.left) / bounds.width) * width : event.offsetX,
    y: bounds.height > 0 ? ((event.clientY - bounds.top) / bounds.height) * height : event.offsetY,
  };
}

function usesPrimaryPointerButton(event: unknown): boolean {
  if ((typeof event !== 'object' || event === null) && typeof event !== 'function') {
    return true;
  }
  try {
    const button = Reflect.get(event, 'button');
    return typeof button !== 'number' || button === 0;
  } catch {
    return false;
  }
}

function ancestorGroupIds(view: ViewSpec, nodeId: ViewNodeId): readonly GroupId[] {
  const groups: GroupId[] = [];
  const visited = new Set<ViewNodeId>();
  let current = nodeId;
  while (!visited.has(current)) {
    visited.add(current);
    const location = locateViewNode(view, current);
    if (location === undefined || location.containerId === 'root') {
      break;
    }
    groups.push(location.containerId);
    current = location.containerId;
  }
  return groups;
}

function visibleNodeForGroup(
  chart: EditorChartProjection,
  view: ViewSpec,
  groupId: GroupId,
): ViewNodeId | undefined {
  const sourceIds = new Set(collectLeafSourceIds(view, groupId));
  return chart.projection.find(
    datum => datum.nodeId === groupId || datum.sourceIds.some(id => sourceIds.has(id)),
  )?.nodeId;
}

function actionGroups(
  chart: EditorChartProjection,
  view: ViewSpec,
  nodeId: ViewNodeId,
): {
  readonly expand?: GroupId;
  readonly collapse?: GroupId;
  readonly ungroup?: GroupId;
} | null {
  const collapsed = new Set(view.collapsedGroupIds);
  const own = ownGroup(view, nodeId);
  const expand = own !== undefined && collapsed.has(own.id) ? own.id : undefined;
  const collapse = ancestorGroupIds(view, nodeId).find(
    groupId => !collapsed.has(groupId) && visibleNodeForGroup(chart, view, groupId) === nodeId,
  );
  const ungroup = expand ?? collapse;
  return expand === undefined && collapse === undefined
    ? null
    : {
        ...(expand === undefined ? {} : { expand }),
        ...(collapse === undefined ? {} : { collapse }),
        ...(ungroup === undefined ? {} : { ungroup }),
      };
}

function chartCopy(
  locale: EditorLocale,
  family: EditorChartProjection['family'],
): {
  readonly eyebrow: string;
  readonly visible: (count: number) => string;
  readonly empty: string;
} {
  if (locale === 'en-US') {
    return family === 'waterfall'
      ? {
          eyebrow: 'Waterfall chart',
          visible: count => `${count} visible nodes`,
          empty: 'No contributions',
        }
      : {
          eyebrow: 'Categorical chart',
          visible: count => `${count} visible nodes`,
          empty: 'No categories',
        };
  }
  return family === 'waterfall'
    ? { eyebrow: '瀑布图', visible: count => `${count} 个可见节点`, empty: '暂无贡献项' }
    : { eyebrow: '分类图', visible: count => `${count} 个可见节点`, empty: '暂无分类项' };
}

export function createChartSurface(
  document: Document,
  callbacks: ChartSurfaceCallbacks,
): ChartSurface {
  const stage = element(document, 'section', {
    className: 'tp-chart-stage',
    attributes: { 'data-testid': 'tellplot-chart-stage' },
  });
  const header = element(document, 'header', { className: 'tp-chart-stage__header' });
  const headingBlock = element(document, 'div');
  const eyebrow = element(document, 'p', { className: 'tp-chart-stage__eyebrow' });
  const title = element(document, 'h2', { className: 'tp-chart-stage__title' });
  title.id = nextChartTitleId(document);
  stage.setAttribute('aria-labelledby', title.id);
  const count = element(document, 'span', { className: 'tp-chart-stage__count' });
  headingBlock.append(eyebrow, title);
  header.append(headingBlock, count);
  const renderError = element(document, 'div', {
    className: 'tp-chart-stage__error',
    attributes: { role: 'alert', hidden: '' },
  });
  const renderErrorCode = element(document, 'code', { text: CHART_RENDER_ISSUE.code });
  const renderErrorMessage = element(document, 'span');
  const retryRender = button(document, '', { className: 'tp-command-button' });
  renderError.append(renderErrorCode, renderErrorMessage, retryRender);
  const shell = element(document, 'div', { className: 'tp-chart-stage__plot-shell' });
  const plot = element(document, 'div', {
    className: 'tp-chart-stage__plot',
    attributes: { 'data-testid': 'tellplot-chart', 'aria-hidden': 'true' },
  });
  const marquee = element(document, 'div', {
    className: 'tp-chart-marquee',
    attributes: { 'data-testid': 'chart-marquee', hidden: '' },
  });
  const actions = element(document, 'div', { className: 'tp-chart-group-actions' });
  actions.hidden = true;
  shell.append(plot, marquee, actions);
  const summary = element(document, 'section', {
    className: 'tp-visually-hidden',
    attributes: { role: 'region' },
  });
  stage.append(header, renderError, shell, summary);

  const ownerWindow = document.defaultView;
  const reducedMotion = mediaQuery(ownerWindow, REDUCED_MOTION_QUERY);
  let current: ChartSurfaceState | undefined;
  let layoutMode: EditorLayoutMode = 'narrow';
  let renderErrorActive = false;
  let drag: DragSession | null = null;
  let marqueeSession: MarqueeSession | null = null;
  let dragOverlay: HTMLElement | null = null;
  let destroyed = false;
  let hasRenderRequest = false;
  let currentInteractionSignature: string | undefined;
  let interactiveSceneSignature: string | undefined;
  let interactionBlockedUntilCompatibleSettlement = false;

  const renderAllowsInteraction = (): boolean =>
    current !== undefined &&
    !renderErrorActive &&
    stage.dataset['renderState'] !== 'error' &&
    !interactionBlockedUntilCompatibleSettlement &&
    interactiveSceneSignature === currentInteractionSignature;

  const hideActions = (): void => {
    actions.hidden = true;
    delete stage.dataset['groupActionsVisible'];
  };

  const clearActions = (): void => {
    hideActions();
    actions.replaceChildren();
    actions.classList.remove('tp-chart-group-actions');
    actions.style.removeProperty('left');
    actions.style.removeProperty('top');
    delete actions.dataset['axis'];
    delete actions.dataset['placement'];
    delete actions.dataset['flow'];
  };

  const clearInteraction = (notify = true): void => {
    drag = null;
    marqueeSession = null;
    stage.dataset['interactionState'] = 'idle';
    plot.removeAttribute('data-drop-indicator');
    plot.removeAttribute('data-drop-inside');
    plot.removeAttribute('data-drop-node-id');
    plot.style.removeProperty('--tp-chart-drop-x');
    plot.style.removeProperty('--tp-chart-drop-y');
    marquee.hidden = true;
    dragOverlay?.remove();
    dragOverlay = null;
    clearActions();
    if (notify) {
      callbacks.onInteractionChange({ state: 'idle' });
    }
  };

  const updateDragOverlay = (point: ChartPointerPoint, nodeId: ViewNodeId): void => {
    const session = drag;
    const active = current;
    if (session === null || active === undefined) {
      return;
    }
    const datum = active.chart.projection.find(candidate => candidate.nodeId === nodeId);
    if (datum === undefined) {
      return;
    }
    if (dragOverlay === null) {
      dragOverlay = element(document, 'div', {
        className: 'tp-chart-drag-overlay',
        attributes: {
          'aria-hidden': 'true',
          'data-testid': 'chart-drag-overlay',
          'data-axis': session.axis,
          'data-kind': datum.kind,
        },
      });
      const mark = element(document, 'span', { className: 'tp-chart-drag-overlay__mark' });
      const label = element(document, 'span', {
        className: 'tp-chart-drag-overlay__label',
        text: datum.label,
      });
      dragOverlay.append(mark, label);
      const markBounds = session.markBounds;
      if (markBounds !== undefined) {
        dragOverlay.style.width = `${markBounds.maxX - markBounds.minX}px`;
        dragOverlay.style.height = `${markBounds.maxY - markBounds.minY}px`;
      }
      const palette = resolveFinancialChartAppearance(
        toFinancialChartAppearance(active.config),
        '',
      ).palette;
      dragOverlay.style.setProperty('--tp-chart-drag-fill', palette[datum.kind]);
      shell.insertBefore(dragOverlay, actions);
    }
    const markBounds = session.markBounds;
    const x = markBounds === undefined ? point.x : markBounds.minX + point.x - session.start.x;
    const y = markBounds === undefined ? point.y : markBounds.minY + point.y - session.start.y;
    dragOverlay.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const updateMarquee = (): void => {
    if (marqueeSession === null) {
      marquee.hidden = true;
      return;
    }
    const left = Math.min(marqueeSession.start.x, marqueeSession.current.x);
    const top = Math.min(marqueeSession.start.y, marqueeSession.current.y);
    marquee.style.left = `${left}px`;
    marquee.style.top = `${top}px`;
    marquee.style.width = `${Math.abs(marqueeSession.current.x - marqueeSession.start.x)}px`;
    marquee.style.height = `${Math.abs(marqueeSession.current.y - marqueeSession.start.y)}px`;
    marquee.hidden = false;
  };

  const renderActions = (nodeId: ViewNodeId): void => {
    if (
      current === undefined ||
      current.config.editor?.readOnly === true ||
      !renderAllowsInteraction()
    ) {
      hideActions();
      return;
    }
    const groupActions = actionGroups(current.chart, current.view, nodeId);
    const bounds = readChartElementBounds(runtime.getContext()).find(
      value => value.nodeId === nodeId,
    );
    if (groupActions === null || bounds === undefined) {
      hideActions();
      return;
    }
    actions.replaceChildren();
    actions.classList.add('tp-chart-group-actions');
    const categoryAxis = axisFor(current.chart);
    actions.dataset['axis'] = categoryAxis;
    actions.dataset['placement'] = 'bottom-right';
    actions.dataset['flow'] =
      categoryAxis === 'x' && bounds.maxX - bounds.minX < GROUP_ACTION_HORIZONTAL_MINIMUM_WIDTH
        ? 'vertical'
        : 'horizontal';
    actions.style.left = `${bounds.maxX - GROUP_ACTION_INSET}px`;
    actions.style.top = `${bounds.maxY - GROUP_ACTION_INSET}px`;
    const appendAction = (
      label: string,
      icon: GroupActionIcon,
      groupId: GroupId,
      operation: () => void,
    ): void => {
      const groupLabel = ownGroup(current?.view as ViewSpec, groupId)?.label ?? groupId;
      const control = element(document, 'button', {
        attributes: {
          type: 'button',
          'aria-label': `${label}: ${groupLabel}`,
          title: `${label}: ${groupLabel}`,
        },
      });
      control.append(createGroupActionIcon(document, icon));
      control.addEventListener('click', event => {
        event.stopPropagation();
        operation();
      });
      actions.append(control);
    };
    if (groupActions.expand !== undefined) {
      appendAction(current.messages.expandGroupAction, 'expand', groupActions.expand, () =>
        callbacks.onToggleGroup(groupActions.expand as GroupId, false),
      );
    }
    if (groupActions.collapse !== undefined) {
      appendAction(current.messages.collapseGroupAction, 'collapse', groupActions.collapse, () =>
        callbacks.onToggleGroup(groupActions.collapse as GroupId, true),
      );
    }
    if (groupActions.ungroup !== undefined) {
      appendAction(current.messages.ungroup, 'ungroup', groupActions.ungroup, () =>
        callbacks.onUngroup(groupActions.ungroup as GroupId),
      );
    }
    actions.hidden = false;
    stage.dataset['groupActionsVisible'] = 'true';
  };

  const pointerMove = (point: ChartPointerPoint): void => {
    if (drag !== null && drag.pointerId === point.pointerId && current !== undefined) {
      drag.current = point;
      const result = resolveChartCategoryDropTarget({
        axis: drag.axis,
        itemId: drag.itemId,
        startPointer: drag.start,
        pointer: point,
        orderedBounds: drag.orderedBounds,
        boundsRevision: drag.revision,
        currentRevision: current.view.revision,
        minimumDragDistance: MINIMUM_DRAG_DISTANCE,
      });
      const exit = resolveChartCategorySourceGroupExitTarget(
        drag.axis,
        drag.start,
        point,
        drag.sourceGroupBounds,
      );
      if (!result.ok && exit === undefined) {
        if (result.reason !== 'BELOW_THRESHOLD') {
          drag.moved = true;
          drag.target = null;
          updateDragOverlay(point, drag.itemId);
          stage.dataset['interactionState'] = 'dragging';
          plot.removeAttribute('data-drop-indicator');
          plot.removeAttribute('data-drop-inside');
          plot.removeAttribute('data-drop-node-id');
          callbacks.onInteractionChange({
            state: 'dragging',
            itemId: drag.itemId,
            target: null,
          });
        }
        return;
      }
      drag.moved = true;
      updateDragOverlay(point, drag.itemId);
      const target = exit ?? (result.ok ? result.target : undefined);
      if (target === undefined) {
        return;
      }
      const targetBounds = drag.orderedBounds.find(value => value.nodeId === target.nodeId);
      const coordinate = drag.axis === 'x' ? point.x : point.y;
      const ratio =
        targetBounds === undefined || targetBounds.max === targetBounds.min
          ? target.edge === 'before'
            ? 0
            : 1
          : (coordinate - targetBounds.min) / (targetBounds.max - targetBounds.min);
      const placement = resolvePointerDropPlacement(
        current.view,
        target.nodeId,
        ratio,
        target.edge,
      );
      drag.target = { nodeId: target.nodeId, placement };
      stage.dataset['interactionState'] = 'dragging';
      plot.dataset['dropNodeId'] = target.nodeId;
      if (placement === 'inside') {
        plot.removeAttribute('data-drop-indicator');
        plot.dataset['dropInside'] = 'true';
      } else {
        plot.removeAttribute('data-drop-inside');
        plot.dataset['dropIndicator'] = placement;
        plot.style.setProperty(
          drag.axis === 'x' ? '--tp-chart-drop-x' : '--tp-chart-drop-y',
          `${target.target}px`,
        );
      }
      callbacks.onInteractionChange({
        state: 'dragging',
        itemId: drag.itemId,
        target: drag.target,
      });
      return;
    }
    if (marqueeSession !== null && marqueeSession.pointerId === point.pointerId) {
      marqueeSession.current = point;
      callbacks.onInteractionChange({ state: 'selecting' });
      updateMarquee();
    }
  };

  const completePointer = (point: ChartPointerPoint, cancelled = false): void => {
    if (drag !== null && drag.pointerId === point.pointerId) {
      const session = drag;
      clearInteraction();
      if (cancelled) {
        callbacks.onCancel('cancelled');
        return;
      }
      if (!session.moved) {
        callbacks.onSelect(session.itemId);
        renderActions(session.itemId);
        return;
      }
      if (session.target === null || current === undefined) {
        callbacks.onCancel('invalid-target');
        return;
      }
      const resolved = resolvePointerMoveTarget(current.view, {
        itemId: session.itemId,
        targetNodeId: session.target.nodeId,
        placement: session.target.placement,
      });
      if (!resolved.ok) {
        callbacks.onCancel('invalid-target');
        return;
      }
      callbacks.onMove(session.itemId, resolved.target);
      return;
    }

    if (marqueeSession !== null && marqueeSession.pointerId === point.pointerId) {
      const session = marqueeSession;
      const left = Math.min(session.start.x, point.x);
      const right = Math.max(session.start.x, point.x);
      const top = Math.min(session.start.y, point.y);
      const bottom = Math.max(session.start.y, point.y);
      clearInteraction();
      if (
        cancelled ||
        right - left < MINIMUM_DRAG_DISTANCE ||
        bottom - top < MINIMUM_DRAG_DISTANCE
      ) {
        if (cancelled) {
          callbacks.onCancel('cancelled');
        }
        return;
      }
      const activeState = current;
      const selectable = new Set(
        activeState?.chart.projection
          .filter(datum => isDraggable(activeState.chart, datum.nodeId))
          .map(datum => datum.nodeId) ?? [],
      );
      const ids = readChartElementBounds(runtime.getContext())
        .filter(
          bounds =>
            bounds.maxX >= left &&
            bounds.minX <= right &&
            bounds.maxY >= top &&
            bounds.minY <= bottom,
        )
        .map(bounds => bounds.nodeId)
        .filter(
          (nodeId, index, values) => selectable.has(nodeId) && values.indexOf(nodeId) === index,
        );
      if (ids.length > 0) {
        callbacks.onMarqueeSelection(ids);
      }
    }
  };

  const beginElementInteraction = (nodeId: ViewNodeId, point: ChartPointerPoint): void => {
    if (
      current === undefined ||
      drag !== null ||
      marqueeSession !== null ||
      !renderAllowsInteraction() ||
      !current.chart.projection.some(datum => datum.nodeId === nodeId)
    ) {
      return;
    }
    const axis = axisFor(current.chart);
    hideActions();
    actions.classList.remove('tp-chart-group-actions');
    if (!isDraggable(current.chart, nodeId)) {
      callbacks.onSelect(nodeId);
      if (current.chart.projection.find(datum => datum.nodeId === nodeId)?.locked === true) {
        callbacks.onCancel('item-locked');
      }
      return;
    }
    if (current.config.editor?.readOnly === true) {
      callbacks.onSelect(nodeId);
      callbacks.onCancel('item-locked');
      return;
    }
    const sceneBounds = readChartElementBounds(runtime.getContext());
    const boundsByNode = new Map(
      sceneBounds
        .map(bounds => {
          const projected = projectChartCategoryBounds(bounds, axis);
          return projected === undefined ? undefined : ([bounds.nodeId, projected] as const);
        })
        .filter(
          (value): value is readonly [ViewNodeId, ChartCategoryBounds] => value !== undefined,
        ),
    );
    const orderedBounds = current.chart.projection.flatMap(datum => {
      const bounds = boundsByNode.get(datum.nodeId);
      return bounds === undefined ? [] : [bounds];
    });
    drag = {
      pointerId: point.pointerId,
      itemId: nodeId,
      axis,
      start: point,
      current: point,
      orderedBounds,
      sourceGroupBounds: projectChartCategorySourceGroupBounds(current.view, nodeId, orderedBounds),
      markBounds: sceneBounds.find(bounds => bounds.nodeId === nodeId),
      revision: current.view.revision,
      moved: false,
      target: null,
    };
  };

  const handleElementPointerDown = (event: unknown): void => {
    if (
      !usesPrimaryPointerButton(event) ||
      current === undefined ||
      drag !== null ||
      marqueeSession !== null
    ) {
      return;
    }
    runtime.finishAnimations();
    const pointer = readChartCategoryElementPointer(event, axisFor(current.chart));
    if (pointer.ok) {
      beginElementInteraction(pointer.value.nodeId, pointer.value);
    }
  };

  const handlePlotPointerDown = (event: unknown): void => {
    if (
      !usesPrimaryPointerButton(event) ||
      drag !== null ||
      marqueeSession !== null ||
      current === undefined ||
      current.config.editor?.readOnly === true ||
      !renderAllowsInteraction()
    ) {
      return;
    }
    runtime.finishAnimations();
    const record = event as {
      readonly pointerId?: unknown;
      readonly canvas?: { readonly x?: unknown; readonly y?: unknown };
    };
    const point =
      typeof record.pointerId === 'number' &&
      typeof record.canvas?.x === 'number' &&
      typeof record.canvas.y === 'number'
        ? { pointerId: record.pointerId, x: record.canvas.x, y: record.canvas.y }
        : undefined;
    if (point === undefined) {
      return;
    }
    const elementBounds = readChartElementBounds(runtime.getContext());
    if (current.chart.projection.length > 0 && elementBounds.length === 0) {
      return;
    }
    const hitsMark = elementBounds.some(
      bounds =>
        point.x >= bounds.minX &&
        point.x <= bounds.maxX &&
        point.y >= bounds.minY &&
        point.y <= bounds.maxY,
    );
    if (!hitsMark) {
      marqueeSession = { pointerId: point.pointerId, start: point, current: point };
      stage.dataset['interactionState'] = 'selecting';
      callbacks.onInteractionChange({ state: 'selecting' });
    }
  };

  const runtime: G2ChartRuntime<ChartRenderRequestValue> = createG2ChartRuntime({
    container: plot,
    events: [
      { name: 'element:pointerdown', listener: handleElementPointerDown },
      {
        name: 'element:pointerover',
        listener: event => {
          if (current === undefined || drag !== null || !renderAllowsInteraction()) {
            return;
          }
          const pointer = readChartCategoryElementPointer(event, axisFor(current.chart));
          if (pointer.ok) {
            renderActions(pointer.value.nodeId);
          }
        },
      },
      { name: 'element:pointerout', listener: () => undefined },
      {
        name: 'element:pointermove',
        listener: event => {
          const record = event as {
            readonly pointerId?: unknown;
            readonly canvas?: { readonly x?: unknown; readonly y?: unknown };
          };
          if (
            typeof record.pointerId === 'number' &&
            typeof record.canvas?.x === 'number' &&
            typeof record.canvas.y === 'number'
          ) {
            pointerMove({ pointerId: record.pointerId, x: record.canvas.x, y: record.canvas.y });
          }
        },
      },
      { name: 'plot:pointerdown', listener: handlePlotPointerDown },
      {
        name: 'plot:pointermove',
        listener: event => {
          const record = event as {
            readonly pointerId?: unknown;
            readonly canvas?: { readonly x?: unknown; readonly y?: unknown };
          };
          if (
            typeof record.pointerId === 'number' &&
            typeof record.canvas?.x === 'number' &&
            typeof record.canvas.y === 'number'
          ) {
            pointerMove({ pointerId: record.pointerId, x: record.canvas.x, y: record.canvas.y });
          }
        },
      },
      {
        name: 'plot:pointerup',
        listener: event => {
          const record = event as {
            readonly pointerId?: unknown;
            readonly canvas?: { readonly x?: unknown; readonly y?: unknown };
          };
          if (
            typeof record.pointerId === 'number' &&
            typeof record.canvas?.x === 'number' &&
            typeof record.canvas.y === 'number'
          ) {
            completePointer({
              pointerId: record.pointerId,
              x: record.canvas.x,
              y: record.canvas.y,
            });
          }
        },
      },
      {
        name: 'plot:pointerupoutside',
        listener: event => {
          const record = event as {
            readonly pointerId?: unknown;
            readonly canvas?: { readonly x?: unknown; readonly y?: unknown };
          };
          if (
            typeof record.pointerId === 'number' &&
            typeof record.canvas?.x === 'number' &&
            typeof record.canvas.y === 'number'
          ) {
            completePointer(
              {
                pointerId: record.pointerId,
                x: record.canvas.x,
                y: record.canvas.y,
              },
              drag !== null,
            );
          }
        },
      },
    ],
    onRenderSettled: settlement => {
      if (!settlement.latest || destroyed) {
        return;
      }
      if (settlement.status === 'success') {
        interactiveSceneSignature = settlement.value.interactionSignature;
        interactionBlockedUntilCompatibleSettlement =
          current === undefined ||
          settlement.value.interactionSignature !== currentInteractionSignature;
      } else {
        interactionBlockedUntilCompatibleSettlement = true;
      }
      if (settlement.status === 'failure') {
        stage.dataset['renderState'] = 'error';
        renderError.hidden = false;
        const hadActiveInteraction = drag !== null || marqueeSession !== null;
        clearInteraction(false);
        if (hadActiveInteraction) {
          callbacks.onInteractionAbort();
        }
        clearActions();
        if (!renderErrorActive) {
          renderErrorActive = true;
          callbacks.onRenderError(CHART_RENDER_ISSUE);
        }
        if (!settlement.value.authoritative) {
          requestRender(current);
        }
      } else if (settlement.value.authoritative) {
        stage.dataset['renderState'] = 'ready';
        renderError.hidden = true;
        if (renderErrorActive) {
          renderErrorActive = false;
          callbacks.onRenderError(null);
        }
      }
    },
  });

  const handleNativeDown = (event: PointerEvent): void => {
    if (
      event.button !== 0 ||
      drag !== null ||
      marqueeSession !== null ||
      current === undefined ||
      !renderAllowsInteraction()
    ) {
      return;
    }
    const canvas = plot.querySelector('canvas');
    if (canvas === null) {
      return;
    }
    runtime.finishAnimations();
    const point = pointFromPointerEvent(event, canvas);
    const elementBounds = readChartElementBounds(runtime.getContext());
    if (current.chart.projection.length > 0 && elementBounds.length === 0) {
      return;
    }
    const exactHit = elementBounds.find(
      bounds =>
        point.x >= bounds.minX &&
        point.x <= bounds.maxX &&
        point.y >= bounds.minY &&
        point.y <= bounds.maxY,
    );
    const minimumHit =
      exactHit === undefined && layoutMode === 'narrow'
        ? resolveChartCategoryMinimumTargetHit(point, elementBounds, 32, axisFor(current.chart))
        : undefined;
    const nodeId =
      exactHit?.nodeId ?? (minimumHit?.ok === true ? minimumHit.hit.nodeId : undefined);
    if (nodeId !== undefined) {
      beginElementInteraction(nodeId, point);
    } else if (current.config.editor?.readOnly !== true) {
      marqueeSession = { pointerId: point.pointerId, start: point, current: point };
      stage.dataset['interactionState'] = 'selecting';
      callbacks.onInteractionChange({ state: 'selecting' });
    }
  };

  const eventTargetsPlot = (event: PointerEvent): boolean => {
    const belongsToPlot = (target: EventTarget | null): boolean => {
      if (target === null) {
        return false;
      }
      try {
        return target === plot || plot.contains(target as Node);
      } catch {
        return false;
      }
    };
    if (belongsToPlot(event.target)) {
      return true;
    }
    try {
      return event.composedPath().some(target => belongsToPlot(target));
    } catch {
      return false;
    }
  };

  const cancelActiveInteraction = (): void => {
    if (drag !== null || marqueeSession !== null) {
      clearInteraction();
      callbacks.onCancel('cancelled');
    }
  };

  const handleNativeMove = (event: PointerEvent): void => {
    const canvas = plot.querySelector('canvas');
    const ownsActivePointer =
      drag?.pointerId === event.pointerId || marqueeSession?.pointerId === event.pointerId;
    if (ownsActivePointer && event.pointerType === 'mouse' && event.buttons === 0) {
      cancelActiveInteraction();
      return;
    }
    if (canvas !== null && ownsActivePointer) {
      pointerMove(pointFromPointerEvent(event, canvas));
    } else if (
      canvas !== null &&
      current !== undefined &&
      drag === null &&
      marqueeSession === null &&
      eventTargetsPlot(event)
    ) {
      const point = pointFromPointerEvent(event, canvas);
      const hit = readChartElementBounds(runtime.getContext()).find(
        bounds =>
          point.x >= bounds.minX &&
          point.x <= bounds.maxX &&
          point.y >= bounds.minY &&
          point.y <= bounds.maxY,
      );
      if (hit !== undefined) {
        renderActions(hit.nodeId);
      }
    }
  };
  const handleNativeUp = (event: PointerEvent): void => {
    const canvas = plot.querySelector('canvas');
    if (canvas !== null) {
      completePointer(pointFromPointerEvent(event, canvas));
    }
  };
  const handleNativeCancel = (event: PointerEvent): void => {
    if (drag?.pointerId === event.pointerId || marqueeSession?.pointerId === event.pointerId) {
      cancelActiveInteraction();
    }
  };
  const handleDocumentPointerOut = (event: PointerEvent): void => {
    if (
      event.relatedTarget === null &&
      (drag?.pointerId === event.pointerId || marqueeSession?.pointerId === event.pointerId)
    ) {
      cancelActiveInteraction();
    }
  };
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && (drag !== null || marqueeSession !== null)) {
      event.preventDefault();
      clearInteraction();
      callbacks.onCancel('cancelled');
    }
  };
  const handleWindowBlur = (): void => {
    cancelActiveInteraction();
  };
  plot.addEventListener('pointerdown', handleNativeDown, true);
  document.addEventListener('pointermove', handleNativeMove, true);
  document.addEventListener('pointerup', handleNativeUp, true);
  document.addEventListener('pointercancel', handleNativeCancel, true);
  document.addEventListener('pointerout', handleDocumentPointerOut, true);
  document.addEventListener('keydown', handleKeyDown);
  ownerWindow?.addEventListener('blur', handleWindowBlur);

  const requestRender = (renderState: ChartSurfaceState | undefined = current): void => {
    if (renderState === undefined || destroyed) {
      return;
    }
    const { chart, config, view } = renderState;
    const authoritative = renderState === current;
    const nextInteractionSignature = interactionSignature(chart);
    if (!hasRenderRequest) {
      hasRenderRequest = true;
      interactiveSceneSignature = nextInteractionSignature;
    } else if (nextInteractionSignature !== interactiveSceneSignature) {
      interactionBlockedUntilCompatibleSettlement = true;
    }
    if (authoritative) {
      stage.dataset['renderState'] = 'rendering';
    }
    const locale = config.locale ?? 'zh-CN';
    const regions = projectExpandedGroupRegions(view, chart.projection);
    const reduce = reducedMotion?.matches ?? false;
    const compactViewport = layoutMode === 'narrow';
    runtime.request({
      value: { chart, authoritative, interactionSignature: nextInteractionSignature },
      spec:
        chart.family === 'categorical'
          ? createCategoricalChartSpec({
              projection: chart.projection,
              chartType: chart.chartType,
              locale,
              currency: config.data.currency,
              reducedMotion: reduce,
              showValueLabels: shouldShowCategoricalValueLabels(chart.projection, compactViewport),
              annotations: view.annotations,
              emphasis: view.emphasis,
              appearance: toFinancialChartAppearance(config),
              groupRegions: regions,
            })
          : createWaterfallChartSpec({
              projection: chart.projection,
              locale,
              currency: config.data.currency,
              reducedMotion: reduce,
              showValueLabels: shouldShowWaterfallValueLabels(chart.projection, compactViewport),
              annotations: view.annotations,
              emphasis: view.emphasis,
              appearance: toFinancialChartAppearance(config),
              groupRegions: regions,
            }),
    });
  };
  retryRender.addEventListener('click', () => requestRender());
  const handleMediaChange = (): void => requestRender();
  reducedMotion?.addEventListener('change', handleMediaChange);

  return {
    element: stage,
    update(state): void {
      if (destroyed) {
        return;
      }
      current = state;
      currentInteractionSignature = interactionSignature(state.chart);
      clearInteraction();
      const locale = state.config.locale ?? 'zh-CN';
      const copy = chartCopy(locale, state.chart.family);
      renderErrorMessage.textContent = state.messages.chartRenderFailed;
      retryRender.textContent = state.messages.retryChartRender;
      retryRender.title = state.messages.retryChartRender;
      retryRender.setAttribute('aria-label', state.messages.retryChartRender);
      eyebrow.textContent = copy.eyebrow;
      title.textContent =
        state.config.appearance?.title ?? chartTitle(state.messages, state.chart.chartType);
      count.textContent = copy.visible(state.chart.projection.length);
      plot.dataset['categoryAxis'] = axisFor(state.chart);
      stage.dataset['interactionState'] = 'idle';
      const isEmpty = state.chart.projection.length === 0;
      let empty = stage.querySelector<HTMLElement>('.tp-chart-stage__empty');
      if (isEmpty && empty === null) {
        empty = element(document, 'p', { className: 'tp-chart-stage__empty' });
        stage.insertBefore(empty, shell);
      }
      if (empty !== null) {
        empty.textContent = copy.empty;
        empty.hidden = !isEmpty;
      }
      summary.setAttribute('aria-label', locale === 'en-US' ? 'Chart summary' : '图表摘要');
      const intro = element(document, 'p', {
        text:
          locale === 'en-US'
            ? `${title.textContent ?? ''}, ${state.chart.projection.length} visible nodes.`
            : `${title.textContent ?? ''}，共 ${state.chart.projection.length} 个可见节点。`,
      });
      const list = element(document, 'ol');
      for (const datum of state.chart.projection) {
        list.append(element(document, 'li', { text: `${datum.label}, ${datum.amount}` }));
      }
      summary.replaceChildren(intro, list);
      setOptionalAttribute(stage, 'data-chart-type', state.chart.chartType);
      requestRender();
    },
    preview(state): void {
      requestRender(state ?? current);
    },
    setLayoutMode(mode): void {
      if (!destroyed && mode !== layoutMode) {
        layoutMode = mode;
        requestRender();
      }
    },
    cancelInteraction(): void {
      if (!destroyed) {
        clearInteraction();
      }
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      current = undefined;
      currentInteractionSignature = undefined;
      clearInteraction();
      reducedMotion?.removeEventListener('change', handleMediaChange);
      plot.removeEventListener('pointerdown', handleNativeDown, true);
      document.removeEventListener('pointermove', handleNativeMove, true);
      document.removeEventListener('pointerup', handleNativeUp, true);
      document.removeEventListener('pointercancel', handleNativeCancel, true);
      document.removeEventListener('pointerout', handleDocumentPointerOut, true);
      document.removeEventListener('keydown', handleKeyDown);
      ownerWindow?.removeEventListener('blur', handleWindowBlur);
      runtime.dispose();
    },
  };
}
