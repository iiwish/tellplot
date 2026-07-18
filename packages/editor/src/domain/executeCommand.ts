import {
  parseEditorCommand,
  type CommandSource,
  type EditorCommand,
  type EditorCommandType,
} from './commands';
import { commandError, type CommandError } from './errors';
import { appendHistory, cloneViewSpec, type HistoryEntry } from './history';
import type { GroupId, SourceItemId, ViewNodeId } from './ids';
import { validateEditorInvariants } from './invariants';
import type { SourceItem, ViewGroup, ViewSpec } from './model';
import type { EditorSession } from './session';
import {
  collectLeafSourceIds,
  containerChildren,
  groupContainsGroup,
  locateViewNode,
  type ViewContainerId,
} from './viewTree';

export interface CommandEvent {
  readonly commandId: string;
  readonly type: EditorCommandType | 'undo' | 'redo';
  readonly source: CommandSource;
  readonly previousRevision: number;
  readonly nextRevision: number;
  readonly affectedNodeIds: readonly ViewNodeId[];
  readonly noOp: boolean;
}

export type CommandResult =
  | {
      readonly ok: true;
      readonly session: EditorSession;
      readonly viewSpec: ViewSpec;
      readonly event: CommandEvent;
    }
  | {
      readonly ok: false;
      readonly session: EditorSession;
      readonly error: CommandError;
    };

interface ApplySuccess {
  readonly ok: true;
  readonly viewSpec: ViewSpec;
  readonly affectedNodeIds: readonly ViewNodeId[];
  readonly noOp: boolean;
}

interface ApplyFailure {
  readonly ok: false;
  readonly error: CommandError;
}

type ApplyResult = ApplySuccess | ApplyFailure;

function failure(session: EditorSession, error: CommandError): CommandResult {
  return { ok: false, session, error };
}

function itemById(session: EditorSession, itemId: SourceItemId): SourceItem | undefined {
  return session.sourceData.items.find(item => item.id === itemId);
}

function ownRecordValue<TValue>(
  record: Readonly<Record<string, TValue>>,
  key: string,
): TValue | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

function groupById(session: EditorSession, groupId: string): ViewGroup | undefined {
  return ownRecordValue(session.viewSpec.groups, groupId);
}

function contributionSegment(session: EditorSession, itemId: SourceItemId): number | undefined {
  let segment = 0;
  for (const item of session.sourceData.items) {
    if (item.kind === 'subtotal') {
      segment += 1;
    } else if (item.kind === 'contribution' && item.id === itemId) {
      return segment;
    }
  }
  return undefined;
}

function nodeSegment(session: EditorSession, nodeId: ViewNodeId): number | undefined {
  const firstLeaf = collectLeafSourceIds(session.viewSpec, nodeId)[0];
  return firstLeaf === undefined ? undefined : contributionSegment(session, firstLeaf);
}

function equalIds(first: readonly ViewNodeId[], second: readonly ViewNodeId[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function insertAt<T>(values: readonly T[], index: number, value: T): readonly T[] {
  return [...values.slice(0, index), value, ...values.slice(index)];
}

function removeAt<T>(values: readonly T[], index: number): readonly T[] {
  return [...values.slice(0, index), ...values.slice(index + 1)];
}

function uniqueNodes(nodes: readonly ViewNodeId[]): readonly ViewNodeId[] {
  return [...new Set(nodes)];
}

function withoutKey<TValue>(
  record: Readonly<Record<string, TValue>>,
  removedKey: string,
): Record<string, TValue> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== removedKey));
}

function invalidSession(session: EditorSession, commandId: string): CommandResult | undefined {
  const result = validateEditorInvariants(session.sourceData, session.viewSpec);
  if (result.ok) {
    return undefined;
  }
  const first = result.errors[0];
  return failure(
    session,
    commandError(
      'INVARIANT_VIOLATION',
      'INVALID_SESSION_STATE',
      first?.path ?? '/',
      commandId,
      first === undefined ? {} : { invariantReason: first.reason },
    ),
  );
}

function validateMovableItem(
  session: EditorSession,
  commandId: string,
  itemId: SourceItemId,
  path: string,
): ApplyFailure | { readonly ok: true; readonly item: SourceItem } {
  const item = itemById(session, itemId);
  if (item === undefined) {
    return {
      ok: false,
      error: commandError('ITEM_NOT_FOUND', 'ITEM_NOT_FOUND', path, commandId, { itemId }),
    };
  }
  if (item.kind !== 'contribution') {
    return {
      ok: false,
      error: commandError('ITEM_LOCKED', 'SYSTEM_ANCHOR', path, commandId, {
        lockReason: 'system-anchor',
      }),
    };
  }
  if (session.viewSpec.pinnedItemIds.includes(itemId)) {
    return {
      ok: false,
      error: commandError('ITEM_LOCKED', 'PINNED_ITEM', path, commandId, {
        lockReason: 'pinned',
      }),
    };
  }
  return { ok: true, item };
}

function validateMovableNode(
  session: EditorSession,
  commandId: string,
  nodeId: ViewNodeId,
  path: string,
  expected: 'item' | 'group',
): ApplyFailure | { readonly ok: true } {
  if (expected === 'item') {
    const result = validateMovableItem(session, commandId, nodeId as SourceItemId, path);
    return result.ok ? { ok: true } : result;
  }
  const group = groupById(session, nodeId);
  if (group === undefined) {
    return {
      ok: false,
      error: commandError('GROUP_NOT_FOUND', 'GROUP_NOT_FOUND', path, commandId, {
        groupId: nodeId,
      }),
    };
  }
  const pinned = collectLeafSourceIds(session.viewSpec, group.id).find(itemId =>
    session.viewSpec.pinnedItemIds.includes(itemId),
  );
  return pinned === undefined
    ? { ok: true }
    : {
        ok: false,
        error: commandError('ITEM_LOCKED', 'PINNED_ITEM', path, commandId, {
          lockReason: 'pinned-descendant',
          itemId: pinned,
        }),
      };
}

function applyMoveNode(
  session: EditorSession,
  input: {
    readonly commandId: string;
    readonly nodeId: ViewNodeId;
    readonly nodePath: string;
    readonly expected: 'item' | 'group';
    readonly target: { readonly containerId: ViewContainerId; readonly index: number };
  },
): ApplyResult {
  const movable = validateMovableNode(
    session,
    input.commandId,
    input.nodeId,
    input.nodePath,
    input.expected,
  );
  if (!movable.ok) {
    return movable;
  }
  const source = locateViewNode(session.viewSpec, input.nodeId);
  if (source === undefined) {
    return {
      ok: false,
      error: commandError(
        'INVARIANT_VIOLATION',
        'INVALID_SESSION_STATE',
        input.nodePath,
        input.commandId,
      ),
    };
  }
  const destinationValues = containerChildren(session.viewSpec, input.target.containerId);
  if (destinationValues === undefined) {
    return {
      ok: false,
      error: commandError(
        'GROUP_NOT_FOUND',
        'GROUP_NOT_FOUND',
        '/payload/target/containerId',
        input.commandId,
        { groupId: input.target.containerId },
      ),
    };
  }
  if (
    input.expected === 'group' &&
    input.target.containerId !== 'root' &&
    (input.target.containerId === input.nodeId ||
      groupContainsGroup(session.viewSpec, input.nodeId as GroupId, input.target.containerId))
  ) {
    return {
      ok: false,
      error: commandError(
        'INVALID_DROP_TARGET',
        'CYCLIC_GROUP_TARGET',
        '/payload/target/containerId',
        input.commandId,
      ),
    };
  }
  if (source.containerId !== input.target.containerId && source.containerId !== 'root') {
    const sourceGroup = groupById(session, source.containerId);
    if (sourceGroup !== undefined && sourceGroup.childIds.length <= 2) {
      return {
        ok: false,
        error: commandError(
          'INVALID_DROP_TARGET',
          'GROUP_WOULD_BE_TOO_SMALL',
          '/payload/target/containerId',
          input.commandId,
          { minimum: 2 },
        ),
      };
    }
  }
  const sameContainer = source.containerId === input.target.containerId;
  const destinationLength = destinationValues.length - (sameContainer ? 1 : 0);
  if (input.target.index < 0 || input.target.index > destinationLength) {
    return {
      ok: false,
      error: commandError(
        'INVALID_DROP_TARGET',
        'INVALID_INDEX',
        '/payload/target/index',
        input.commandId,
        { minimum: 0, maximum: destinationLength },
      ),
    };
  }
  const movingSegment = nodeSegment(session, input.nodeId);
  if (input.target.containerId !== 'root') {
    const destinationSegment = nodeSegment(session, input.target.containerId);
    if (movingSegment !== destinationSegment) {
      return {
        ok: false,
        error: commandError(
          'INVALID_DROP_TARGET',
          'CROSS_SEGMENT',
          '/payload/target/containerId',
          input.commandId,
        ),
      };
    }
  }

  let nextRoot = session.viewSpec.rootOrder;
  const nextGroups: Record<string, ViewGroup> = { ...session.viewSpec.groups };
  if (source.containerId === 'root') {
    nextRoot = removeAt(nextRoot, source.index);
  } else {
    const sourceGroup = nextGroups[source.containerId];
    if (sourceGroup !== undefined) {
      nextGroups[source.containerId] = {
        ...sourceGroup,
        childIds: removeAt(sourceGroup.childIds, source.index),
      };
    }
  }
  if (input.target.containerId === 'root') {
    const previousNode = nextRoot[input.target.index - 1];
    const nextNode = nextRoot[input.target.index];
    const previousSegment =
      previousNode === undefined ? undefined : nodeSegment(session, previousNode);
    const nextSegment = nextNode === undefined ? undefined : nodeSegment(session, nextNode);
    if (
      movingSegment === undefined ||
      (previousSegment !== undefined && previousSegment > movingSegment) ||
      (nextSegment !== undefined && nextSegment < movingSegment)
    ) {
      return {
        ok: false,
        error: commandError(
          'INVALID_DROP_TARGET',
          'CROSS_SEGMENT',
          '/payload/target/index',
          input.commandId,
        ),
      };
    }
    nextRoot = insertAt(nextRoot, input.target.index, input.nodeId);
  } else {
    const destinationGroup = nextGroups[input.target.containerId];
    if (destinationGroup === undefined) {
      return {
        ok: false,
        error: commandError(
          'INVARIANT_VIOLATION',
          'INVALID_SESSION_STATE',
          '/payload/target/containerId',
          input.commandId,
        ),
      };
    }
    nextGroups[input.target.containerId] = {
      ...destinationGroup,
      childIds: insertAt(destinationGroup.childIds, input.target.index, input.nodeId),
    };
  }
  const noOp =
    equalIds(nextRoot, session.viewSpec.rootOrder) &&
    Object.keys(nextGroups).every(groupId =>
      equalIds(
        nextGroups[groupId]?.childIds ?? [],
        session.viewSpec.groups[groupId]?.childIds ?? [],
      ),
    );
  return {
    ok: true,
    viewSpec: noOp
      ? session.viewSpec
      : { ...session.viewSpec, rootOrder: nextRoot, groups: nextGroups },
    affectedNodeIds: uniqueNodes([
      input.nodeId,
      ...(source.containerId === 'root' ? [] : [source.containerId]),
      ...(input.target.containerId === 'root' ? [] : [input.target.containerId]),
    ]),
    noOp,
  };
}

function applyMoveItem(
  session: EditorSession,
  command: Extract<EditorCommand, { type: 'moveItem' }>,
): ApplyResult {
  return applyMoveNode(session, {
    commandId: command.id,
    nodeId: command.payload.itemId,
    nodePath: '/payload/itemId',
    expected: 'item',
    target: command.payload.target,
  });
}

function applyMoveGroup(
  session: EditorSession,
  command: Extract<EditorCommand, { type: 'moveGroup' }>,
): ApplyResult {
  return applyMoveNode(session, {
    commandId: command.id,
    nodeId: command.payload.groupId,
    nodePath: '/payload/groupId',
    expected: 'group',
    target: command.payload.target,
  });
}

function applyCreateGroup(
  session: EditorSession,
  command: Extract<EditorCommand, { type: 'createGroup' }>,
): ApplyResult {
  const { groupId, nodeIds, label, initiallyCollapsed } = command.payload;
  if (
    String(groupId) === 'root' ||
    groupById(session, groupId) !== undefined ||
    session.sourceData.items.some(item => String(item.id) === String(groupId))
  ) {
    return {
      ok: false,
      error: commandError(
        'GROUP_ID_CONFLICT',
        'GROUP_ID_CONFLICT',
        '/payload/groupId',
        command.id,
        { groupId },
      ),
    };
  }
  if (nodeIds.length < 2) {
    return {
      ok: false,
      error: commandError('GROUP_TOO_SMALL', 'GROUP_TOO_SMALL', '/payload/nodeIds', command.id, {
        minimum: 2,
        actual: nodeIds.length,
      }),
    };
  }

  const positions: number[] = [];
  let parentId: ViewContainerId | undefined;
  let parentValues: readonly ViewNodeId[] | undefined;
  for (let index = 0; index < nodeIds.length; index += 1) {
    const nodeId = nodeIds[index];
    if (nodeId === undefined) {
      continue;
    }
    const expected = groupById(session, nodeId) === undefined ? 'item' : 'group';
    const movable = validateMovableNode(
      session,
      command.id,
      nodeId,
      `/payload/nodeIds/${index}`,
      expected,
    );
    if (!movable.ok) {
      return movable;
    }
    const location = locateViewNode(session.viewSpec, nodeId);
    if (location === undefined || (parentId !== undefined && location.containerId !== parentId)) {
      return {
        ok: false,
        error: commandError(
          'INVALID_DROP_TARGET',
          'NON_CONTIGUOUS_SELECTION',
          `/payload/nodeIds/${index}`,
          command.id,
        ),
      };
    }
    parentId = location.containerId;
    parentValues = location.values;
    positions.push(location.index);
  }

  const orderedPositions = [...positions].sort((first, second) => first - second);
  const contiguous = orderedPositions.every(
    (position, index) => index === 0 || position === (orderedPositions[index - 1] ?? position) + 1,
  );
  if (!contiguous) {
    return {
      ok: false,
      error: commandError(
        'NON_CONTIGUOUS_GROUP_SELECTION',
        'NON_CONTIGUOUS_SELECTION',
        '/payload/nodeIds',
        command.id,
      ),
    };
  }

  const orderedIds = orderedPositions.map(position => parentValues?.[position] as ViewNodeId);
  const segments = new Set(orderedIds.map(nodeId => nodeSegment(session, nodeId)));
  if (segments.size !== 1) {
    return {
      ok: false,
      error: commandError('INVALID_DROP_TARGET', 'CROSS_SEGMENT', '/payload/nodeIds', command.id),
    };
  }

  const firstPosition = orderedPositions[0] ?? 0;
  const selectedPositions = new Set(orderedPositions);
  let nextRoot = session.viewSpec.rootOrder;
  const nextGroups: Record<string, ViewGroup> = { ...session.viewSpec.groups };
  if (parentId === 'root') {
    nextRoot = nextRoot.filter((_, index) => !selectedPositions.has(index));
    nextRoot = insertAt(nextRoot, firstPosition, groupId);
  } else if (parentId !== undefined) {
    const parent = nextGroups[parentId];
    if (parent === undefined) {
      return {
        ok: false,
        error: commandError(
          'INVARIANT_VIOLATION',
          'INVALID_SESSION_STATE',
          '/payload/nodeIds',
          command.id,
        ),
      };
    }
    const remaining = parent.childIds.filter((_, index) => !selectedPositions.has(index));
    nextGroups[parentId] = {
      ...parent,
      childIds: insertAt(remaining, firstPosition, groupId),
    };
  }
  const nextGroup: ViewGroup = { id: groupId, label, childIds: orderedIds };
  const groupsWithNewGroup = { ...nextGroups, [groupId]: nextGroup };
  return {
    ok: true,
    viewSpec: {
      ...session.viewSpec,
      rootOrder: nextRoot,
      groups: groupsWithNewGroup,
      collapsedGroupIds: initiallyCollapsed
        ? [...session.viewSpec.collapsedGroupIds, groupId]
        : session.viewSpec.collapsedGroupIds,
    },
    affectedNodeIds: [groupId, ...orderedIds],
    noOp: false,
  };
}

function applyUngroup(
  session: EditorSession,
  command: Extract<EditorCommand, { type: 'ungroup' }>,
): ApplyResult {
  const group = groupById(session, command.payload.groupId);
  if (group === undefined) {
    return {
      ok: false,
      error: commandError('GROUP_NOT_FOUND', 'GROUP_NOT_FOUND', '/payload/groupId', command.id, {
        groupId: command.payload.groupId,
      }),
    };
  }
  const pinnedChild = collectLeafSourceIds(session.viewSpec, group.id).find(itemId =>
    session.viewSpec.pinnedItemIds.includes(itemId),
  );
  if (pinnedChild !== undefined) {
    return {
      ok: false,
      error: commandError('ITEM_LOCKED', 'PINNED_ITEM', '/payload/groupId', command.id, {
        lockReason: 'pinned',
        itemId: pinnedChild,
      }),
    };
  }

  const location = locateViewNode(session.viewSpec, group.id);
  if (location === undefined) {
    return {
      ok: false,
      error: commandError(
        'INVARIANT_VIOLATION',
        'INVALID_SESSION_STATE',
        '/payload/groupId',
        command.id,
      ),
    };
  }
  const groups = withoutKey(session.viewSpec.groups, group.id);
  const annotations = withoutKey(session.viewSpec.annotations, group.id);
  const emphasis = withoutKey(session.viewSpec.emphasis, group.id);
  let rootOrder = session.viewSpec.rootOrder;
  if (location.containerId === 'root') {
    rootOrder = [
      ...rootOrder.slice(0, location.index),
      ...group.childIds,
      ...rootOrder.slice(location.index + 1),
    ];
  } else {
    const parent = groups[location.containerId];
    if (parent === undefined) {
      return {
        ok: false,
        error: commandError(
          'INVARIANT_VIOLATION',
          'INVALID_SESSION_STATE',
          '/payload/groupId',
          command.id,
        ),
      };
    }
    groups[location.containerId] = {
      ...parent,
      childIds: [
        ...parent.childIds.slice(0, location.index),
        ...group.childIds,
        ...parent.childIds.slice(location.index + 1),
      ],
    };
  }

  return {
    ok: true,
    viewSpec: {
      ...session.viewSpec,
      rootOrder,
      groups,
      collapsedGroupIds: session.viewSpec.collapsedGroupIds.filter(groupId => groupId !== group.id),
      annotations,
      emphasis,
    },
    affectedNodeIds: [group.id, ...group.childIds],
    noOp: false,
  };
}

function applyGroupVisibility(
  session: EditorSession,
  command: Extract<EditorCommand, { type: 'collapseGroup' | 'expandGroup' }>,
): ApplyResult {
  const { groupId } = command.payload;
  if (groupById(session, groupId) === undefined) {
    return {
      ok: false,
      error: commandError('GROUP_NOT_FOUND', 'GROUP_NOT_FOUND', '/payload/groupId', command.id, {
        groupId,
      }),
    };
  }
  const collapsed = session.viewSpec.collapsedGroupIds.includes(groupId);
  const shouldCollapse = command.type === 'collapseGroup';
  if (collapsed === shouldCollapse) {
    return { ok: true, viewSpec: session.viewSpec, affectedNodeIds: [groupId], noOp: true };
  }
  return {
    ok: true,
    viewSpec: {
      ...session.viewSpec,
      collapsedGroupIds: shouldCollapse
        ? [...session.viewSpec.collapsedGroupIds, groupId]
        : session.viewSpec.collapsedGroupIds.filter(id => id !== groupId),
    },
    affectedNodeIds: [groupId],
    noOp: false,
  };
}

function applyPin(
  session: EditorSession,
  command: Extract<EditorCommand, { type: 'pinItem' | 'unpinItem' }>,
): ApplyResult {
  const item = itemById(session, command.payload.itemId);
  if (item === undefined) {
    return {
      ok: false,
      error: commandError('ITEM_NOT_FOUND', 'ITEM_NOT_FOUND', '/payload/itemId', command.id, {
        itemId: command.payload.itemId,
      }),
    };
  }
  if (item.kind !== 'contribution') {
    return {
      ok: false,
      error: commandError('ITEM_LOCKED', 'SYSTEM_ANCHOR', '/payload/itemId', command.id, {
        lockReason: 'system-anchor',
      }),
    };
  }
  const pinned = session.viewSpec.pinnedItemIds.includes(item.id);
  const shouldPin = command.type === 'pinItem';
  if (pinned === shouldPin) {
    return { ok: true, viewSpec: session.viewSpec, affectedNodeIds: [item.id], noOp: true };
  }
  return {
    ok: true,
    viewSpec: {
      ...session.viewSpec,
      pinnedItemIds: shouldPin
        ? [...session.viewSpec.pinnedItemIds, item.id]
        : session.viewSpec.pinnedItemIds.filter(itemId => itemId !== item.id),
    },
    affectedNodeIds: [item.id],
    noOp: false,
  };
}

function applyAnnotation(
  session: EditorSession,
  command: Extract<EditorCommand, { type: 'setAnnotation' }>,
): ApplyResult {
  const { nodeId, text } = command.payload;
  const known =
    session.sourceData.items.some(item => item.id === nodeId) ||
    groupById(session, nodeId) !== undefined;
  if (!known) {
    return {
      ok: false,
      error: commandError('NODE_NOT_FOUND', 'NODE_NOT_FOUND', '/payload/nodeId', command.id, {
        nodeId,
      }),
    };
  }

  const normalized = text === null || text.trim().length === 0 ? null : text;
  const current = ownRecordValue(session.viewSpec.annotations, nodeId) ?? null;
  if (current === normalized) {
    return { ok: true, viewSpec: session.viewSpec, affectedNodeIds: [nodeId], noOp: true };
  }
  const annotations =
    normalized === null
      ? withoutKey(session.viewSpec.annotations, nodeId)
      : { ...session.viewSpec.annotations, [nodeId]: normalized };
  return {
    ok: true,
    viewSpec: { ...session.viewSpec, annotations },
    affectedNodeIds: [nodeId],
    noOp: false,
  };
}

function applyCommand(session: EditorSession, command: EditorCommand): ApplyResult {
  switch (command.type) {
    case 'moveItem':
      return applyMoveItem(session, command);
    case 'moveGroup':
      return applyMoveGroup(session, command);
    case 'createGroup':
      return applyCreateGroup(session, command);
    case 'ungroup':
      return applyUngroup(session, command);
    case 'collapseGroup':
    case 'expandGroup':
      return applyGroupVisibility(session, command);
    case 'pinItem':
    case 'unpinItem':
      return applyPin(session, command);
    case 'setAnnotation':
      return applyAnnotation(session, command);
  }
}

/** Executes a typed editor command through the immutable invariant-gated session path. */
export function executeCommand(session: EditorSession, command: EditorCommand): CommandResult {
  const parsed = parseEditorCommand(command);
  if (!parsed.ok) {
    return failure(session, parsed.error);
  }

  const acceptedCommand = parsed.value;
  if (session.processedActionIds.includes(acceptedCommand.id)) {
    return failure(
      session,
      commandError('DUPLICATE_COMMAND_ID', 'DUPLICATE_COMMAND_ID', '/id', acceptedCommand.id),
    );
  }

  if (acceptedCommand.baseRevision !== session.viewSpec.revision) {
    return failure(
      session,
      commandError('REVISION_CONFLICT', 'REVISION_CONFLICT', '/baseRevision', acceptedCommand.id, {
        expectedRevision: acceptedCommand.baseRevision,
        actualRevision: session.viewSpec.revision,
      }),
    );
  }
  const invalid = invalidSession(session, acceptedCommand.id);
  if (invalid !== undefined) {
    return invalid;
  }

  const applied = applyCommand(session, acceptedCommand);
  if (!applied.ok) {
    return failure(session, applied.error);
  }

  const previousRevision = session.viewSpec.revision;
  if (applied.noOp) {
    const event: CommandEvent = {
      commandId: acceptedCommand.id,
      type: acceptedCommand.type,
      source: acceptedCommand.source,
      previousRevision,
      nextRevision: previousRevision,
      affectedNodeIds: applied.affectedNodeIds,
      noOp: true,
    };
    const nextSession: EditorSession = {
      ...session,
      processedActionIds: [...session.processedActionIds, acceptedCommand.id],
    };
    return { ok: true, session: nextSession, viewSpec: nextSession.viewSpec, event };
  }

  if (previousRevision === Number.MAX_SAFE_INTEGER) {
    return failure(
      session,
      commandError('REVISION_OVERFLOW', 'REVISION_OVERFLOW', '/baseRevision', acceptedCommand.id),
    );
  }

  const nextView: ViewSpec = { ...applied.viewSpec, revision: previousRevision + 1 };
  const invariantResult = validateEditorInvariants(session.sourceData, nextView);
  if (!invariantResult.ok) {
    const first = invariantResult.errors[0];
    return failure(
      session,
      commandError(
        'INVARIANT_VIOLATION',
        'INVALID_SESSION_STATE',
        first?.path ?? '/',
        acceptedCommand.id,
        first === undefined ? {} : { invariantReason: first.reason },
      ),
    );
  }

  const event: CommandEvent = {
    commandId: acceptedCommand.id,
    type: acceptedCommand.type,
    source: acceptedCommand.source,
    previousRevision,
    nextRevision: nextView.revision,
    affectedNodeIds: applied.affectedNodeIds,
    noOp: false,
  };
  const entry: HistoryEntry = {
    before: cloneViewSpec(session.viewSpec),
    after: cloneViewSpec(nextView),
    action: { id: acceptedCommand.id, type: acceptedCommand.type, source: acceptedCommand.source },
    affectedNodeIds: [...applied.affectedNodeIds],
  };
  const nextSession: EditorSession = {
    ...session,
    viewSpec: nextView,
    undoStack: appendHistory(session.undoStack, entry, session.historyLimit),
    redoStack: [],
    processedActionIds: [...session.processedActionIds, acceptedCommand.id],
  };
  return { ok: true, session: nextSession, viewSpec: nextView, event };
}
