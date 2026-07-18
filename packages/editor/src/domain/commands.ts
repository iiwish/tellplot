import { commandError, type CommandError, type CommandErrorReason } from './errors';
import type { GroupId, SourceItemId, ViewNodeId } from './ids';

export type CommandSource = 'direct' | 'outline' | 'keyboard' | 'host' | 'ai';

export interface CommandEnvelope<TType extends string, TPayload> {
  readonly schemaVersion: '1.0.0';
  readonly id: string;
  readonly type: TType;
  readonly source: CommandSource;
  readonly baseRevision: number;
  readonly payload: TPayload;
}

export interface MoveItemPayload {
  readonly itemId: SourceItemId;
  readonly target: {
    readonly containerId: 'root' | GroupId;
    readonly index: number;
  };
}

export type MoveItemCommand = CommandEnvelope<'moveItem', MoveItemPayload>;

export interface MoveGroupPayload {
  readonly groupId: GroupId;
  readonly target: {
    readonly containerId: 'root' | GroupId;
    readonly index: number;
  };
}

export type MoveGroupCommand = CommandEnvelope<'moveGroup', MoveGroupPayload>;

export interface CreateGroupPayload {
  readonly groupId: GroupId;
  readonly label: string;
  readonly nodeIds: readonly ViewNodeId[];
  readonly initiallyCollapsed: boolean;
}

export type CreateGroupCommand = CommandEnvelope<'createGroup', CreateGroupPayload>;

export interface GroupPayload {
  readonly groupId: GroupId;
}

export type UngroupCommand = CommandEnvelope<'ungroup', GroupPayload>;
export type CollapseGroupCommand = CommandEnvelope<'collapseGroup', GroupPayload>;
export type ExpandGroupCommand = CommandEnvelope<'expandGroup', GroupPayload>;

export interface ItemPayload {
  readonly itemId: SourceItemId;
}

export type PinItemCommand = CommandEnvelope<'pinItem', ItemPayload>;
export type UnpinItemCommand = CommandEnvelope<'unpinItem', ItemPayload>;

export interface SetAnnotationPayload {
  readonly nodeId: ViewNodeId;
  readonly text: string | null;
}

export type SetAnnotationCommand = CommandEnvelope<'setAnnotation', SetAnnotationPayload>;

export type EditorCommand =
  | MoveItemCommand
  | MoveGroupCommand
  | CreateGroupCommand
  | UngroupCommand
  | CollapseGroupCommand
  | ExpandGroupCommand
  | PinItemCommand
  | UnpinItemCommand
  | SetAnnotationCommand;

export type EditorCommandType = EditorCommand['type'];

export interface SessionActionMeta {
  readonly id: string;
  readonly source: CommandSource;
  readonly baseRevision: number;
}

export type CommandParseResult<TValue> =
  | {
      readonly ok: true;
      readonly value: TValue;
    }
  | {
      readonly ok: false;
      readonly error: CommandError;
    };

type SafeDetails = Readonly<Record<string, string | number | boolean | null>>;

interface ParseIssue {
  readonly reason: CommandErrorReason;
  readonly path: string;
  readonly details: SafeDetails;
}

interface InternalFailure {
  readonly ok: false;
  readonly issue: ParseIssue;
}

type InternalResult<TValue> =
  | {
      readonly ok: true;
      readonly value: TValue;
    }
  | InternalFailure;

const COMMAND_SOURCES: ReadonlySet<CommandSource> = new Set([
  'direct',
  'outline',
  'keyboard',
  'host',
  'ai',
]);

const COMMAND_TYPES: ReadonlySet<EditorCommandType> = new Set([
  'moveItem',
  'moveGroup',
  'createGroup',
  'ungroup',
  'collapseGroup',
  'expandGroup',
  'pinItem',
  'unpinItem',
  'setAnnotation',
]);

const ENVELOPE_FIELDS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'id',
  'type',
  'source',
  'baseRevision',
  'payload',
]);
const SESSION_ACTION_FIELDS: ReadonlySet<string> = new Set(['id', 'source', 'baseRevision']);
const MOVE_ITEM_FIELDS: ReadonlySet<string> = new Set(['itemId', 'target']);
const MOVE_GROUP_FIELDS: ReadonlySet<string> = new Set(['groupId', 'target']);
const MOVE_TARGET_FIELDS: ReadonlySet<string> = new Set(['containerId', 'index']);
const CREATE_GROUP_FIELDS: ReadonlySet<string> = new Set([
  'groupId',
  'label',
  'nodeIds',
  'initiallyCollapsed',
]);
const GROUP_FIELDS: ReadonlySet<string> = new Set(['groupId']);
const ITEM_FIELDS: ReadonlySet<string> = new Set(['itemId']);
const ANNOTATION_FIELDS: ReadonlySet<string> = new Set(['nodeId', 'text']);

function success<TValue>(value: TValue): InternalResult<TValue> {
  return { ok: true, value };
}

function failure(
  reason: CommandErrorReason,
  path: string,
  details: SafeDetails = {},
): InternalFailure {
  return { ok: false, issue: { reason, path, details } };
}

function publicFailure<TValue>(
  issue: ParseIssue,
  commandId: string | null,
): CommandParseResult<TValue> {
  return {
    ok: false,
    error: commandError('INVALID_COMMAND', issue.reason, issue.path, commandId, issue.details),
  };
}

function pointer(base: string, segment: string | number): string {
  const escaped = String(segment).replaceAll('~', '~0').replaceAll('/', '~1');
  return `${base === '/' ? '' : base}/${escaped}`;
}

function safelyReadCommandId(input: unknown): string | null {
  if ((typeof input !== 'object' && typeof input !== 'function') || input === null) {
    return null;
  }

  try {
    const descriptor = Object.getOwnPropertyDescriptor(input, 'id');
    return descriptor !== undefined && 'value' in descriptor && typeof descriptor.value === 'string'
      ? descriptor.value
      : null;
  } catch {
    return null;
  }
}

function inspectRecord(
  input: unknown,
  allowedFields: ReadonlySet<string>,
  path: string,
): InternalResult<ReadonlyMap<string, unknown>> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return failure('EXPECTED_OBJECT', path);
  }

  const prototype = Object.getPrototypeOf(input) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    return failure('NON_PLAIN_DATA', path);
  }

  const values = new Map<string, unknown>();
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key === 'symbol') {
      return failure('NON_PLAIN_DATA', path);
    }
    if (!allowedFields.has(key)) {
      return failure('UNKNOWN_FIELD', pointer(path, key));
    }

    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      return failure('NON_PLAIN_DATA', pointer(path, key));
    }
    values.set(key, descriptor.value);
  }
  return success(values);
}

function isArrayIndexKey(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
}

function inspectDenseArray(input: unknown, path: string): InternalResult<readonly unknown[]> {
  if (!Array.isArray(input)) {
    return failure('INVALID_TYPE', path);
  }
  if (Object.getPrototypeOf(input) !== Array.prototype) {
    return failure('NON_PLAIN_DATA', path);
  }

  const lengthDescriptor = Object.getOwnPropertyDescriptor(input, 'length');
  if (
    lengthDescriptor === undefined ||
    !('value' in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    (lengthDescriptor.value as number) < 0
  ) {
    return failure('NON_PLAIN_DATA', path);
  }
  const length = lengthDescriptor.value as number;
  const entriesByIndex = new Map<number, unknown>();

  for (const key of Reflect.ownKeys(input)) {
    if (key === 'length') {
      continue;
    }
    if (typeof key === 'symbol') {
      return failure('NON_PLAIN_DATA', path);
    }
    if (!isArrayIndexKey(key, length)) {
      return failure('UNKNOWN_FIELD', pointer(path, key));
    }

    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      return failure('NON_PLAIN_DATA', pointer(path, key));
    }
    const index = Number(key);
    entriesByIndex.set(index, descriptor.value);
  }

  if (entriesByIndex.size !== length) {
    for (let index = 0; index < length; index += 1) {
      if (!entriesByIndex.has(index)) {
        return failure('INVALID_TYPE', pointer(path, index));
      }
    }
  }

  const entries: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    entries.push(entriesByIndex.get(index));
  }
  return success(entries);
}

function nonEmptyString(
  values: ReadonlyMap<string, unknown>,
  key: string,
  path: string,
): InternalResult<string> {
  const value = values.get(key);
  if (typeof value !== 'string') {
    return failure('INVALID_TYPE', pointer(path, key));
  }
  if (value.trim().length === 0) {
    return failure('EMPTY_ID', pointer(path, key));
  }
  return success(value);
}

function parseMoveItemPayload(input: unknown): InternalResult<MoveItemPayload> {
  const payload = inspectRecord(input, MOVE_ITEM_FIELDS, '/payload');
  if (!payload.ok) {
    return payload;
  }
  const itemId = nonEmptyString(payload.value, 'itemId', '/payload');
  if (!itemId.ok) {
    return itemId;
  }

  const target = inspectRecord(payload.value.get('target'), MOVE_TARGET_FIELDS, '/payload/target');
  if (!target.ok) {
    return target;
  }
  const containerId = nonEmptyString(target.value, 'containerId', '/payload/target');
  if (!containerId.ok) {
    return containerId;
  }
  const index = target.value.get('index');
  if (!Number.isSafeInteger(index)) {
    return failure('INVALID_TYPE', '/payload/target/index');
  }

  return success({
    itemId: itemId.value,
    target: { containerId: containerId.value, index: index as number },
  });
}

function parseMoveGroupPayload(input: unknown): InternalResult<MoveGroupPayload> {
  const payload = inspectRecord(input, MOVE_GROUP_FIELDS, '/payload');
  if (!payload.ok) {
    return payload;
  }
  const groupId = nonEmptyString(payload.value, 'groupId', '/payload');
  if (!groupId.ok) {
    return groupId;
  }
  const target = inspectRecord(payload.value.get('target'), MOVE_TARGET_FIELDS, '/payload/target');
  if (!target.ok) {
    return target;
  }
  const containerId = nonEmptyString(target.value, 'containerId', '/payload/target');
  if (!containerId.ok) {
    return containerId;
  }
  const index = target.value.get('index');
  if (!Number.isSafeInteger(index)) {
    return failure('INVALID_TYPE', '/payload/target/index');
  }
  return success({
    groupId: groupId.value,
    target: { containerId: containerId.value, index: index as number },
  });
}

function parseCreateGroupPayload(input: unknown): InternalResult<CreateGroupPayload> {
  const payload = inspectRecord(input, CREATE_GROUP_FIELDS, '/payload');
  if (!payload.ok) {
    return payload;
  }
  const groupId = nonEmptyString(payload.value, 'groupId', '/payload');
  if (!groupId.ok) {
    return groupId;
  }

  const label = payload.value.get('label');
  if (typeof label !== 'string') {
    return failure('INVALID_TYPE', '/payload/label');
  }
  if (label.trim().length === 0) {
    return failure('EMPTY_LABEL', '/payload/label');
  }

  const rawNodeIds = inspectDenseArray(payload.value.get('nodeIds'), '/payload/nodeIds');
  if (!rawNodeIds.ok) {
    return rawNodeIds;
  }
  const nodeIds: ViewNodeId[] = [];
  const indexesById = new Map<string, number>();
  for (let index = 0; index < rawNodeIds.value.length; index += 1) {
    const nodeId = rawNodeIds.value[index];
    if (typeof nodeId !== 'string' || nodeId.trim().length === 0) {
      return failure('INVALID_TYPE', pointer('/payload/nodeIds', index));
    }
    const firstIndex = indexesById.get(nodeId);
    if (firstIndex !== undefined) {
      return failure('DUPLICATE_ITEM_ID', pointer('/payload/nodeIds', index), { firstIndex });
    }
    indexesById.set(nodeId, index);
    nodeIds.push(nodeId);
  }
  const initiallyCollapsed = payload.value.get('initiallyCollapsed');
  if (typeof initiallyCollapsed !== 'boolean') {
    return failure('INVALID_TYPE', '/payload/initiallyCollapsed');
  }

  return success({ groupId: groupId.value, label, nodeIds, initiallyCollapsed });
}

function parseGroupPayload(input: unknown): InternalResult<GroupPayload> {
  const payload = inspectRecord(input, GROUP_FIELDS, '/payload');
  if (!payload.ok) {
    return payload;
  }
  const groupId = nonEmptyString(payload.value, 'groupId', '/payload');
  return groupId.ok ? success({ groupId: groupId.value }) : groupId;
}

function parseItemPayload(input: unknown): InternalResult<ItemPayload> {
  const payload = inspectRecord(input, ITEM_FIELDS, '/payload');
  if (!payload.ok) {
    return payload;
  }
  const itemId = nonEmptyString(payload.value, 'itemId', '/payload');
  return itemId.ok ? success({ itemId: itemId.value }) : itemId;
}

function hasMoreThanFiveHundredCodePoints(text: string): boolean {
  let count = 0;
  for (const codePoint of text) {
    void codePoint;
    count += 1;
    if (count > 500) {
      return true;
    }
  }
  return false;
}

function parseSetAnnotationPayload(input: unknown): InternalResult<SetAnnotationPayload> {
  const payload = inspectRecord(input, ANNOTATION_FIELDS, '/payload');
  if (!payload.ok) {
    return payload;
  }
  const nodeId = nonEmptyString(payload.value, 'nodeId', '/payload');
  if (!nodeId.ok) {
    return nodeId;
  }
  const text = payload.value.get('text');
  if (text !== null && typeof text !== 'string') {
    return failure('INVALID_TYPE', '/payload/text');
  }
  if (typeof text === 'string' && hasMoreThanFiveHundredCodePoints(text)) {
    return failure('ANNOTATION_TOO_LONG', '/payload/text', { maximumCodePoints: 500 });
  }
  return success({ nodeId: nodeId.value, text });
}

function parseEditorCommandInternal(
  input: unknown,
  commandId: string | null,
): CommandParseResult<EditorCommand> {
  const envelope = inspectRecord(input, ENVELOPE_FIELDS, '/');
  if (!envelope.ok) {
    return publicFailure(envelope.issue, commandId);
  }

  const schemaVersion = envelope.value.get('schemaVersion');
  if (typeof schemaVersion !== 'string') {
    return publicFailure(failure('INVALID_TYPE', '/schemaVersion').issue, commandId);
  }
  if (schemaVersion !== '1.0.0') {
    return publicFailure(failure('UNSUPPORTED_SCHEMA_VERSION', '/schemaVersion').issue, commandId);
  }

  const id = nonEmptyString(envelope.value, 'id', '/');
  if (!id.ok) {
    return publicFailure(id.issue, commandId);
  }

  const rawType = envelope.value.get('type');
  if (typeof rawType !== 'string' || !COMMAND_TYPES.has(rawType as EditorCommandType)) {
    return publicFailure(failure('INVALID_TYPE', '/type').issue, id.value);
  }
  const type = rawType as EditorCommandType;

  const rawSource = envelope.value.get('source');
  if (typeof rawSource !== 'string' || !COMMAND_SOURCES.has(rawSource as CommandSource)) {
    return publicFailure(failure('INVALID_TYPE', '/source').issue, id.value);
  }
  const source = rawSource as CommandSource;

  const baseRevision = envelope.value.get('baseRevision');
  if (!Number.isSafeInteger(baseRevision) || (baseRevision as number) < 0) {
    return publicFailure(failure('INVALID_TYPE', '/baseRevision').issue, id.value);
  }
  const common = {
    schemaVersion: '1.0.0' as const,
    id: id.value,
    source,
    baseRevision: baseRevision as number,
  };
  const rawPayload = envelope.value.get('payload');

  switch (type) {
    case 'moveItem': {
      const payload = parseMoveItemPayload(rawPayload);
      return payload.ok
        ? { ok: true, value: { ...common, type, payload: payload.value } }
        : publicFailure(payload.issue, id.value);
    }
    case 'moveGroup': {
      const payload = parseMoveGroupPayload(rawPayload);
      return payload.ok
        ? { ok: true, value: { ...common, type, payload: payload.value } }
        : publicFailure(payload.issue, id.value);
    }
    case 'createGroup': {
      const payload = parseCreateGroupPayload(rawPayload);
      return payload.ok
        ? { ok: true, value: { ...common, type, payload: payload.value } }
        : publicFailure(payload.issue, id.value);
    }
    case 'ungroup':
    case 'collapseGroup':
    case 'expandGroup': {
      const payload = parseGroupPayload(rawPayload);
      return payload.ok
        ? { ok: true, value: { ...common, type, payload: payload.value } }
        : publicFailure(payload.issue, id.value);
    }
    case 'pinItem':
    case 'unpinItem': {
      const payload = parseItemPayload(rawPayload);
      return payload.ok
        ? { ok: true, value: { ...common, type, payload: payload.value } }
        : publicFailure(payload.issue, id.value);
    }
    case 'setAnnotation': {
      const payload = parseSetAnnotationPayload(rawPayload);
      return payload.ok
        ? { ok: true, value: { ...common, type, payload: payload.value } }
        : publicFailure(payload.issue, id.value);
    }
  }
}

/** Parses untrusted data into the closed, replayable editor command schema. */
export function parseEditorCommand(input: unknown): CommandParseResult<EditorCommand> {
  const commandId = safelyReadCommandId(input);
  try {
    return parseEditorCommandInternal(input, commandId);
  } catch {
    return publicFailure(failure('UNREADABLE_INPUT', '/').issue, commandId);
  }
}

/** Parses the metadata envelope used by an undo or redo session action. */
export function parseSessionActionMeta(
  input: unknown,
  actionType: 'undo' | 'redo',
): CommandParseResult<SessionActionMeta> {
  void actionType;
  const commandId = safelyReadCommandId(input);
  try {
    const action = inspectRecord(input, SESSION_ACTION_FIELDS, '/');
    if (!action.ok) {
      return publicFailure(action.issue, commandId);
    }
    const id = nonEmptyString(action.value, 'id', '/');
    if (!id.ok) {
      return publicFailure(id.issue, commandId);
    }
    const rawSource = action.value.get('source');
    if (typeof rawSource !== 'string' || !COMMAND_SOURCES.has(rawSource as CommandSource)) {
      return publicFailure(failure('INVALID_TYPE', '/source').issue, id.value);
    }
    const baseRevision = action.value.get('baseRevision');
    if (!Number.isSafeInteger(baseRevision) || (baseRevision as number) < 0) {
      return publicFailure(failure('INVALID_TYPE', '/baseRevision').issue, id.value);
    }

    return {
      ok: true,
      value: {
        id: id.value,
        source: rawSource as CommandSource,
        baseRevision: baseRevision as number,
      },
    };
  } catch {
    return publicFailure(failure('UNREADABLE_INPUT', '/').issue, commandId);
  }
}
