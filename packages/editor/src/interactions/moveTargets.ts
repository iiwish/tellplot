import type { CommandSource, MoveGroupCommand, MoveItemCommand } from '../domain/commands';
import type { GroupId, SourceItemId, ViewNodeId } from '../domain/ids';
import type { ViewSpec } from '../domain/model';
import { locateViewNode, ownGroup } from '../domain/viewTree';

export type MoveTargetEdge = 'before' | 'after';
export type KeyboardMoveDirection = 'before' | 'after' | 'into' | 'out';
export type InteractionCommandSource = Extract<CommandSource, 'direct' | 'outline' | 'keyboard'>;

export type MoveTargetResolution =
  | {
      readonly ok: true;
      readonly target: {
        readonly containerId: 'root' | GroupId;
        readonly index: number;
      };
    }
  | {
      readonly ok: false;
      readonly reason: 'ITEM_NOT_FOUND' | 'INVALID_TARGET' | 'NO_TARGET';
    };

export interface PointerMoveIntent {
  readonly itemId: ViewNodeId;
  readonly targetNodeId: ViewNodeId;
  readonly edge: MoveTargetEdge;
}

export interface MoveItemCommandInput {
  readonly id: string;
  readonly source: InteractionCommandSource;
  readonly baseRevision: number;
  readonly itemId: SourceItemId;
  readonly target: {
    readonly containerId: 'root' | GroupId;
    readonly index: number;
  };
}

function destinationForTarget(
  viewSpec: ViewSpec,
  targetNodeId: ViewNodeId,
): { readonly containerId: 'root' | GroupId; readonly items: readonly ViewNodeId[] } | undefined {
  const location = locateViewNode(viewSpec, targetNodeId);
  return location === undefined
    ? undefined
    : { containerId: location.containerId, items: location.values };
}

/** Builds the closed command envelope shared by chart, outline, and keyboard adapters. */
export function buildMoveItemCommand(input: MoveItemCommandInput): MoveItemCommand {
  return {
    schemaVersion: '1.0.0',
    id: input.id,
    type: 'moveItem',
    source: input.source,
    baseRevision: input.baseRevision,
    payload: {
      itemId: input.itemId,
      target: { containerId: input.target.containerId, index: input.target.index },
    },
  };
}

export interface MoveNodeCommandInput extends Omit<MoveItemCommandInput, 'itemId'> {
  readonly nodeId: ViewNodeId;
  readonly viewSpec: ViewSpec;
}

/** Builds the correct deterministic command for either a contribution or a group subtree. */
export function buildMoveNodeCommand(
  input: MoveNodeCommandInput,
): MoveItemCommand | MoveGroupCommand {
  const target = { containerId: input.target.containerId, index: input.target.index };
  const group = ownGroup(input.viewSpec, input.nodeId);
  return group === undefined
    ? buildMoveItemCommand({
        id: input.id,
        source: input.source,
        baseRevision: input.baseRevision,
        itemId: input.nodeId as SourceItemId,
        target,
      })
    : {
        schemaVersion: '1.0.0',
        id: input.id,
        type: 'moveGroup',
        source: input.source,
        baseRevision: input.baseRevision,
        payload: { groupId: group.id, target },
      };
}

/** Resolves an insertion index in the destination contribution container after active removal. */
export function resolvePointerMoveTarget(
  viewSpec: ViewSpec,
  intent: PointerMoveIntent,
): MoveTargetResolution {
  const source = locateViewNode(viewSpec, intent.itemId);
  const destination = destinationForTarget(viewSpec, intent.targetNodeId);
  if (source === undefined) {
    return { ok: false, reason: 'ITEM_NOT_FOUND' };
  }
  if (destination === undefined || intent.itemId === intent.targetNodeId) {
    return { ok: false, reason: 'INVALID_TARGET' };
  }

  const remaining = destination.items.filter(
    nodeId => !(destination.containerId === source.containerId && nodeId === intent.itemId),
  );
  const targetIndex = remaining.indexOf(intent.targetNodeId);
  if (targetIndex < 0) {
    return { ok: false, reason: 'INVALID_TARGET' };
  }
  return {
    ok: true,
    target: {
      containerId: destination.containerId,
      index: targetIndex + (intent.edge === 'after' ? 1 : 0),
    },
  };
}

/** Resolves explicit keyboard operations against the same post-removal command contract. */
export function resolveKeyboardMoveTarget(
  viewSpec: ViewSpec,
  itemId: ViewNodeId,
  direction: KeyboardMoveDirection,
): MoveTargetResolution {
  const source = locateViewNode(viewSpec, itemId);
  if (source === undefined) {
    return { ok: false, reason: 'ITEM_NOT_FOUND' };
  }

  if (direction === 'before' || direction === 'after') {
    const nextIndex = source.index + (direction === 'before' ? -1 : 1);
    if (nextIndex < 0 || nextIndex >= source.values.length) {
      return { ok: false, reason: 'NO_TARGET' };
    }
    return {
      ok: true,
      target: { containerId: source.containerId, index: nextIndex },
    };
  }

  if (direction === 'out') {
    if (source.containerId === 'root') {
      return { ok: false, reason: 'NO_TARGET' };
    }
    const parentLocation = locateViewNode(viewSpec, source.containerId);
    if (parentLocation === undefined) {
      return { ok: false, reason: 'INVALID_TARGET' };
    }
    return {
      ok: true,
      target: {
        containerId: parentLocation.containerId,
        index: parentLocation.index + 1,
      },
    };
  }

  if (source.containerId !== 'root') {
    return { ok: false, reason: 'NO_TARGET' };
  }
  const previousNodeId = source.values[source.index - 1];
  const previousGroup =
    previousNodeId === undefined ? undefined : ownGroup(viewSpec, previousNodeId);
  if (previousGroup !== undefined) {
    return {
      ok: true,
      target: { containerId: previousGroup.id, index: previousGroup.childIds.length },
    };
  }
  const nextNodeId = source.values[source.index + 1];
  const nextGroup = nextNodeId === undefined ? undefined : ownGroup(viewSpec, nextNodeId);
  return nextGroup === undefined
    ? { ok: false, reason: 'NO_TARGET' }
    : { ok: true, target: { containerId: nextGroup.id, index: 0 } };
}
