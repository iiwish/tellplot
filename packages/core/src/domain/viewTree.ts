import type { GroupId, SourceItemId, ViewNodeId } from './ids';
import type { ViewGroup, ViewSpec } from './model';

export type ViewContainerId = 'root' | GroupId;

export interface ViewNodeLocation {
  readonly containerId: ViewContainerId;
  readonly index: number;
  readonly values: readonly ViewNodeId[];
}

export function ownGroup(viewSpec: ViewSpec, nodeId: string): ViewGroup | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(viewSpec.groups, nodeId);
  return descriptor !== undefined && 'value' in descriptor
    ? (descriptor.value as ViewGroup)
    : undefined;
}

export function containerChildren(
  viewSpec: ViewSpec,
  containerId: ViewContainerId,
): readonly ViewNodeId[] | undefined {
  return containerId === 'root' ? viewSpec.rootOrder : ownGroup(viewSpec, containerId)?.childIds;
}

export function locateViewNode(
  viewSpec: ViewSpec,
  nodeId: ViewNodeId,
): ViewNodeLocation | undefined {
  const rootIndex = viewSpec.rootOrder.indexOf(nodeId);
  if (rootIndex >= 0) {
    return { containerId: 'root', index: rootIndex, values: viewSpec.rootOrder };
  }
  for (const group of Object.values(viewSpec.groups)) {
    const index = group.childIds.indexOf(nodeId);
    if (index >= 0) {
      return { containerId: group.id, index, values: group.childIds };
    }
  }
  return undefined;
}

export function collectLeafSourceIds(
  viewSpec: ViewSpec,
  nodeId: ViewNodeId,
): readonly SourceItemId[] {
  const leaves: SourceItemId[] = [];
  const stack: ViewNodeId[] = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop() as ViewNodeId;
    const group = ownGroup(viewSpec, current);
    if (group === undefined) {
      leaves.push(current as SourceItemId);
      continue;
    }
    for (let index = group.childIds.length - 1; index >= 0; index -= 1) {
      stack.push(group.childIds[index] as ViewNodeId);
    }
  }
  return leaves;
}

export function groupContainsGroup(
  viewSpec: ViewSpec,
  ancestorId: GroupId,
  candidateId: GroupId,
): boolean {
  const stack = [...(ownGroup(viewSpec, ancestorId)?.childIds ?? [])];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const nodeId = stack.pop() as ViewNodeId;
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    if (nodeId === candidateId) {
      return true;
    }
    const group = ownGroup(viewSpec, nodeId);
    if (group !== undefined) {
      stack.push(...group.childIds);
    }
  }
  return false;
}

export function groupDepth(viewSpec: ViewSpec, groupId: GroupId): number {
  let depth = 1;
  let current: ViewNodeId = groupId;
  const visited = new Set<string>();
  while (!visited.has(current)) {
    visited.add(current);
    const location = locateViewNode(viewSpec, current);
    if (location === undefined || location.containerId === 'root') {
      return depth;
    }
    current = location.containerId;
    depth += 1;
  }
  return depth;
}
