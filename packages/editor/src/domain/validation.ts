import {
  validationFailure,
  validationIssue,
  validationSuccess,
  type ValidationIssue,
  type ValidationResult,
} from './errors';
import type { SourceData, SourceItem, SourceItemKind, ViewSpec } from './model';

type UnknownRecord = Record<string, unknown>;

const SOURCE_ITEM_KINDS: readonly SourceItemKind[] = ['start', 'contribution', 'subtotal', 'end'];

const SOURCE_DATA_FIELDS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'datasetId',
  'currency',
  'items',
]);
const SOURCE_ITEM_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'label',
  'amount',
  'kind',
  'sourceRef',
  'metadata',
]);
const VIEW_SPEC_FIELDS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'datasetId',
  'chartType',
  'revision',
  'rootOrder',
  'groups',
  'collapsedGroupIds',
  'pinnedItemIds',
  'annotations',
  'emphasis',
]);
const VIEW_GROUP_FIELDS: ReadonlySet<string> = new Set(['id', 'label', 'childIds']);

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function pointer(base: string, segment: string | number): string {
  const escaped = String(segment).replaceAll('~', '~0').replaceAll('/', '~1');
  return `${base}/${escaped}`;
}

function recordPath(base: string): string {
  return base.length === 0 ? '/' : base;
}

function ownDataValue(record: UnknownRecord, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
}

function inspectRecord(
  record: UnknownRecord,
  base: string,
  code: 'INVALID_SOURCE_DATA' | 'INVALID_VIEW_SPEC',
  errors: ValidationIssue[],
  allowedFields?: ReadonlySet<string>,
): readonly string[] {
  const dataKeys: string[] = [];
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key === 'symbol') {
      errors.push(validationIssue(code, 'NON_PLAIN_DATA', recordPath(base)));
      continue;
    }

    const path = pointer(base, key);
    if (allowedFields !== undefined && !allowedFields.has(key)) {
      errors.push(validationIssue(code, 'UNKNOWN_FIELD', path));
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      errors.push(validationIssue(code, 'NON_PLAIN_DATA', path));
      continue;
    }
    dataKeys.push(key);
  }
  return dataKeys;
}

function isArrayIndexKey(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
}

function readArray(
  value: unknown,
  base: string,
  code: 'INVALID_SOURCE_DATA' | 'INVALID_VIEW_SPEC',
  errors: ValidationIssue[],
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    errors.push(validationIssue(code, 'INVALID_TYPE', base));
    return undefined;
  }

  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') {
      continue;
    }
    if (typeof key === 'symbol') {
      errors.push(validationIssue(code, 'NON_PLAIN_DATA', base));
    } else if (!isArrayIndexKey(key, value.length)) {
      errors.push(validationIssue(code, 'UNKNOWN_FIELD', pointer(base, key)));
    }
  }

  const entries = new Array<unknown>(value.length).fill(undefined);
  for (let index = 0; index < value.length; index += 1) {
    const path = pointer(base, index);
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined) {
      errors.push(validationIssue(code, 'INVALID_TYPE', path));
    } else if (!descriptor.enumerable || !('value' in descriptor)) {
      errors.push(validationIssue(code, 'NON_PLAIN_DATA', path));
    } else {
      entries[index] = descriptor.value;
    }
  }
  return entries;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSourceItemKind(value: unknown): value is SourceItemKind {
  return typeof value === 'string' && SOURCE_ITEM_KINDS.includes(value as SourceItemKind);
}

function validateSchemaVersion(
  record: UnknownRecord,
  code: 'INVALID_SOURCE_DATA' | 'INVALID_VIEW_SPEC',
  errors: ValidationIssue[],
): void {
  const value = ownDataValue(record, 'schemaVersion');
  if (typeof value !== 'string') {
    errors.push(validationIssue(code, 'INVALID_TYPE', '/schemaVersion'));
  } else if (value !== '1.0.0') {
    errors.push(
      validationIssue('UNSUPPORTED_SCHEMA_VERSION', 'UNSUPPORTED_SCHEMA_VERSION', '/schemaVersion'),
    );
  }
}

function validateSourceItem(
  value: unknown,
  index: number,
  seenIds: Set<string>,
  errors: ValidationIssue[],
): void {
  const itemPath = pointer('/items', index);
  if (!isPlainRecord(value)) {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'EXPECTED_OBJECT', itemPath));
    return;
  }

  inspectRecord(value, itemPath, 'INVALID_SOURCE_DATA', errors, SOURCE_ITEM_FIELDS);

  const id = ownDataValue(value, 'id');
  if (typeof id !== 'string') {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'INVALID_TYPE', pointer(itemPath, 'id')));
  } else if (id.trim().length === 0) {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'EMPTY_ID', pointer(itemPath, 'id')));
  } else if (seenIds.has(id)) {
    errors.push(
      validationIssue('INVALID_SOURCE_DATA', 'DUPLICATE_SOURCE_ITEM_ID', pointer(itemPath, 'id'), {
        index,
      }),
    );
  } else {
    seenIds.add(id);
  }

  const label = ownDataValue(value, 'label');
  if (typeof label !== 'string') {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'INVALID_TYPE', pointer(itemPath, 'label')));
  } else if (label.trim().length === 0) {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'EMPTY_LABEL', pointer(itemPath, 'label')));
  }

  const amount = ownDataValue(value, 'amount');
  if (typeof amount !== 'number') {
    errors.push(
      validationIssue('INVALID_SOURCE_DATA', 'INVALID_TYPE', pointer(itemPath, 'amount')),
    );
  } else if (!Number.isFinite(amount)) {
    errors.push(
      validationIssue('INVALID_SOURCE_DATA', 'NON_FINITE_AMOUNT', pointer(itemPath, 'amount')),
    );
  } else if (Math.abs(amount) > Number.MAX_SAFE_INTEGER) {
    errors.push(
      validationIssue('INVALID_SOURCE_DATA', 'UNSAFE_AMOUNT', pointer(itemPath, 'amount')),
    );
  }

  if (!isSourceItemKind(ownDataValue(value, 'kind'))) {
    errors.push(
      validationIssue('INVALID_SOURCE_DATA', 'INVALID_SOURCE_ITEM_KIND', pointer(itemPath, 'kind')),
    );
  }

  const sourceRef = ownDataValue(value, 'sourceRef');
  if (sourceRef !== undefined && typeof sourceRef !== 'string') {
    errors.push(
      validationIssue('INVALID_SOURCE_DATA', 'INVALID_TYPE', pointer(itemPath, 'sourceRef')),
    );
  }

  const metadata = ownDataValue(value, 'metadata');
  if (metadata === undefined) {
    return;
  }
  const metadataPath = pointer(itemPath, 'metadata');
  if (!isPlainRecord(metadata)) {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'EXPECTED_OBJECT', metadataPath));
    return;
  }
  const metadataKeys = inspectRecord(metadata, metadataPath, 'INVALID_SOURCE_DATA', errors);
  for (const key of metadataKeys) {
    const metadataValue = ownDataValue(metadata, key);
    const primitive =
      metadataValue === null ||
      typeof metadataValue === 'string' ||
      typeof metadataValue === 'boolean' ||
      (typeof metadataValue === 'number' && Number.isFinite(metadataValue));
    if (!primitive) {
      errors.push(
        validationIssue(
          'INVALID_SOURCE_DATA',
          'INVALID_METADATA_VALUE',
          pointer(metadataPath, key),
        ),
      );
    }
  }
}

function validateAnchors(items: readonly unknown[], errors: ValidationIssue[]): void {
  const startIndexes: number[] = [];
  const endIndexes: number[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!isPlainRecord(item)) {
      continue;
    }
    if (ownDataValue(item, 'kind') === 'start') {
      startIndexes.push(index);
    }
    if (ownDataValue(item, 'kind') === 'end') {
      endIndexes.push(index);
    }
  }

  if (startIndexes.length !== 1) {
    errors.push(
      validationIssue('INVALID_SOURCE_DATA', 'INVALID_ANCHOR', '/items', {
        anchor: 'start',
        count: startIndexes.length,
      }),
    );
  } else {
    const startIndex = startIndexes.at(0);
    if (startIndex !== undefined && startIndex !== 0) {
      errors.push(
        validationIssue('INVALID_SOURCE_DATA', 'INVALID_ANCHOR', pointer('/items', startIndex)),
      );
    }
  }

  if (endIndexes.length !== 1) {
    errors.push(
      validationIssue('INVALID_SOURCE_DATA', 'INVALID_ANCHOR', '/items', {
        anchor: 'end',
        count: endIndexes.length,
      }),
    );
  } else {
    const endIndex = endIndexes.at(0);
    if (endIndex !== undefined && endIndex !== items.length - 1) {
      errors.push(
        validationIssue('INVALID_SOURCE_DATA', 'INVALID_ANCHOR', pointer('/items', endIndex)),
      );
    }
  }
}

function validateSourceDataInternal(input: unknown): ValidationResult<SourceData> {
  if (!isPlainRecord(input)) {
    return validationFailure([validationIssue('INVALID_SOURCE_DATA', 'EXPECTED_OBJECT', '/')]);
  }

  const errors: ValidationIssue[] = [];
  inspectRecord(input, '', 'INVALID_SOURCE_DATA', errors, SOURCE_DATA_FIELDS);
  validateSchemaVersion(input, 'INVALID_SOURCE_DATA', errors);

  const datasetId = ownDataValue(input, 'datasetId');
  if (typeof datasetId !== 'string') {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'INVALID_TYPE', '/datasetId'));
  } else if (datasetId.trim().length === 0) {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'EMPTY_ID', '/datasetId'));
  }

  const currency = ownDataValue(input, 'currency');
  if (currency !== undefined && !isNonEmptyString(currency)) {
    errors.push(validationIssue('INVALID_SOURCE_DATA', 'INVALID_TYPE', '/currency'));
  }

  const items = readArray(ownDataValue(input, 'items'), '/items', 'INVALID_SOURCE_DATA', errors);
  if (items !== undefined) {
    const seenIds = new Set<string>();
    for (let index = 0; index < items.length; index += 1) {
      validateSourceItem(items[index], index, seenIds, errors);
    }
    validateAnchors(items, errors);
  }

  return errors.length === 0
    ? validationSuccess(input as unknown as SourceData)
    : validationFailure(errors);
}

/** Validates source data without cloning, normalizing or mutating the caller's value. */
export function validateSourceData(input: unknown): ValidationResult<SourceData> {
  try {
    return validateSourceDataInternal(input);
  } catch {
    return validationFailure([validationIssue('INVALID_SOURCE_DATA', 'UNREADABLE_INPUT', '/')]);
  }
}

interface SourceIndexes {
  readonly itemsById: ReadonlyMap<string, SourceItem>;
  readonly contributionIds: readonly string[];
  readonly segmentById: ReadonlyMap<string, number>;
}

function indexSource(sourceData: SourceData): SourceIndexes {
  const itemsById = new Map<string, SourceItem>();
  const contributionIds: string[] = [];
  const segmentById = new Map<string, number>();
  let segment = 0;

  for (const item of sourceData.items) {
    itemsById.set(item.id, item);
    if (item.kind === 'contribution') {
      contributionIds.push(item.id);
      segmentById.set(item.id, segment);
    } else if (item.kind === 'subtotal') {
      segment += 1;
    }
  }

  return { itemsById, contributionIds, segmentById };
}

interface GroupIndexes {
  readonly groupIds: ReadonlySet<string>;
  readonly childIds: ReadonlySet<string>;
  readonly segmentByGroupId: ReadonlyMap<string, number>;
  readonly parentByNodeId: ReadonlyMap<string, string>;
}

function validateGroups(
  value: unknown,
  source: SourceIndexes,
  errors: ValidationIssue[],
): GroupIndexes {
  const groupIds = new Set<string>();
  const childIds = new Set<string>();
  const segmentByGroupId = new Map<string, number>();
  const parentByNodeId = new Map<string, string>();
  const childrenByGroupId = new Map<string, readonly string[]>();

  if (!isPlainRecord(value)) {
    errors.push(validationIssue('INVALID_VIEW_SPEC', 'EXPECTED_OBJECT', '/groups'));
    return { groupIds, childIds, segmentByGroupId, parentByNodeId };
  }

  const groupKeys = inspectRecord(value, '/groups', 'INVALID_VIEW_SPEC', errors);
  for (const groupKey of groupKeys) {
    const groupValue = ownDataValue(value, groupKey);
    const groupPath = pointer('/groups', groupKey);
    groupIds.add(groupKey);
    if (!isPlainRecord(groupValue)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'EXPECTED_OBJECT', groupPath));
      continue;
    }

    inspectRecord(groupValue, groupPath, 'INVALID_VIEW_SPEC', errors, VIEW_GROUP_FIELDS);

    const id = ownDataValue(groupValue, 'id');
    if (typeof id !== 'string') {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', pointer(groupPath, 'id')));
    } else if (id.trim().length === 0) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'EMPTY_ID', pointer(groupPath, 'id')));
    } else {
      if (id !== groupKey) {
        errors.push(
          validationIssue('INVALID_VIEW_SPEC', 'GROUP_ID_MISMATCH', pointer(groupPath, 'id')),
        );
      }
      if (id === 'root') {
        errors.push(
          validationIssue('INVALID_VIEW_SPEC', 'RESERVED_GROUP_ID', pointer(groupPath, 'id')),
        );
      }
      if (source.itemsById.has(id)) {
        errors.push(
          validationIssue(
            'INVALID_VIEW_SPEC',
            'GROUP_SOURCE_ID_CONFLICT',
            pointer(groupPath, 'id'),
          ),
        );
      }
    }

    const label = ownDataValue(groupValue, 'label');
    if (typeof label !== 'string') {
      errors.push(
        validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', pointer(groupPath, 'label')),
      );
    } else if (label.trim().length === 0) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'EMPTY_LABEL', pointer(groupPath, 'label')));
    }

    const childrenPath = pointer(groupPath, 'childIds');
    const children = readArray(
      ownDataValue(groupValue, 'childIds'),
      childrenPath,
      'INVALID_VIEW_SPEC',
      errors,
    );
    if (children === undefined) {
      continue;
    }
    if (children.length < 2) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'GROUP_TOO_SMALL', childrenPath));
    }

    const localChildren = new Set<string>();
    const validChildren: string[] = [];
    for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
      const childPath = pointer(childrenPath, childIndex);
      const child = children[childIndex];
      if (!isNonEmptyString(child)) {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', childPath));
        continue;
      }
      if (localChildren.has(child)) {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'DUPLICATE_GROUP_CHILD', childPath));
        continue;
      }
      localChildren.add(child);
      validChildren.push(child);
    }
    childrenByGroupId.set(groupKey, validChildren);
  }

  for (const [groupId, children] of childrenByGroupId) {
    for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
      const child = children[childIndex] as string;
      const childPath = pointer(pointer(pointer('/groups', groupId), 'childIds'), childIndex);
      const sourceItem = source.itemsById.get(child);
      if (sourceItem !== undefined && sourceItem.kind !== 'contribution') {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_GROUP_CHILD', childPath));
        continue;
      }
      if (sourceItem === undefined && !groupIds.has(child)) {
        errors.push(validationIssue('SOURCE_CONFLICT', 'UNKNOWN_SOURCE_REFERENCE', childPath));
        continue;
      }
      if (parentByNodeId.has(child)) {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'DUPLICATE_GROUP_MEMBERSHIP', childPath));
      } else {
        parentByNodeId.set(child, groupId);
        childIds.add(child);
      }
    }
  }

  const cyclicGroups = new Set<string>();
  const visitState = new Map<string, 'visiting' | 'visited'>();
  const visit = (groupId: string): void => {
    const state = visitState.get(groupId);
    if (state === 'visiting') {
      cyclicGroups.add(groupId);
      return;
    }
    if (state === 'visited') {
      return;
    }
    visitState.set(groupId, 'visiting');
    for (const child of childrenByGroupId.get(groupId) ?? []) {
      if (groupIds.has(child)) {
        visit(child);
        if (cyclicGroups.has(child)) {
          cyclicGroups.add(groupId);
        }
      }
    }
    visitState.set(groupId, 'visited');
  };
  for (const groupId of groupIds) {
    visit(groupId);
  }
  for (const groupId of cyclicGroups) {
    errors.push(
      validationIssue(
        'INVALID_VIEW_SPEC',
        'CYCLIC_GROUP_REFERENCE',
        pointer(pointer('/groups', groupId), 'childIds'),
      ),
    );
  }

  const leafMemo = new Map<string, readonly string[]>();
  const leavesFor = (groupId: string, active: ReadonlySet<string>): readonly string[] => {
    const cached = leafMemo.get(groupId);
    if (cached !== undefined) {
      return cached;
    }
    if (active.has(groupId)) {
      return [];
    }
    const nextActive = new Set(active);
    nextActive.add(groupId);
    const leaves: string[] = [];
    for (const child of childrenByGroupId.get(groupId) ?? []) {
      if (groupIds.has(child)) {
        leaves.push(...leavesFor(child, nextActive));
      } else if (source.itemsById.get(child)?.kind === 'contribution') {
        leaves.push(child);
      }
    }
    leafMemo.set(groupId, leaves);
    return leaves;
  };
  for (const groupId of groupIds) {
    let segment: number | undefined;
    const children = childrenByGroupId.get(groupId) ?? [];
    for (let childIndex = 0; childIndex < children.length; childIndex += 1) {
      const childId = children[childIndex] as string;
      const childLeaves = groupIds.has(childId)
        ? leavesFor(childId, new Set())
        : source.itemsById.get(childId)?.kind === 'contribution'
          ? [childId]
          : [];
      const childSegments = new Set(
        childLeaves
          .map(leafId => source.segmentById.get(leafId))
          .filter(value => value !== undefined),
      );
      const childSegment = childSegments.values().next().value as number | undefined;
      if (
        childSegments.size > 1 ||
        (segment !== undefined && childSegment !== undefined && childSegment !== segment)
      ) {
        errors.push(
          validationIssue(
            'INVALID_VIEW_SPEC',
            'GROUP_CROSSES_ANCHOR',
            pointer(pointer(pointer('/groups', groupId), 'childIds'), childIndex),
          ),
        );
      }
      segment ??= childSegment;
    }
    if (segment !== undefined) {
      segmentByGroupId.set(groupId, segment);
    }
  }

  return { groupIds, childIds, segmentByGroupId, parentByNodeId };
}

function validateRootOrder(
  value: unknown,
  source: SourceIndexes,
  groups: GroupIndexes,
  errors: ValidationIssue[],
): void {
  const rootOrder = readArray(value, '/rootOrder', 'INVALID_VIEW_SPEC', errors);
  if (rootOrder === undefined) {
    return;
  }

  const rootNodes = new Set<string>();
  const directContributionIds = new Set<string>();
  const rootedGroupIds = new Set<string>();
  let previousSegment = 0;

  for (let index = 0; index < rootOrder.length; index += 1) {
    const nodePath = pointer('/rootOrder', index);
    const nodeId = rootOrder[index];
    if (!isNonEmptyString(nodeId)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', nodePath));
      continue;
    }
    if (rootNodes.has(nodeId)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'DUPLICATE_VIEW_NODE', nodePath));
      continue;
    }
    rootNodes.add(nodeId);

    let segment: number | undefined;
    if (groups.groupIds.has(nodeId)) {
      rootedGroupIds.add(nodeId);
      if (groups.parentByNodeId.has(nodeId)) {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'DUPLICATE_VIEW_NODE', nodePath));
      }
      segment = groups.segmentByGroupId.get(nodeId);
    } else {
      const sourceItem = source.itemsById.get(nodeId);
      if (sourceItem === undefined) {
        errors.push(validationIssue('SOURCE_CONFLICT', 'UNKNOWN_SOURCE_REFERENCE', nodePath));
        continue;
      }
      if (sourceItem.kind !== 'contribution') {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'LOCKED_ANCHOR_REFERENCE', nodePath));
        continue;
      }
      directContributionIds.add(nodeId);
      if (groups.childIds.has(nodeId)) {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'DUPLICATE_VIEW_NODE', nodePath));
      }
      segment = source.segmentById.get(nodeId);
    }

    if (segment !== undefined) {
      if (segment < previousSegment) {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'ANCHOR_SEGMENT_ORDER', nodePath));
      } else {
        previousSegment = segment;
      }
    }
  }

  for (const groupId of groups.groupIds) {
    if (!rootedGroupIds.has(groupId) && !groups.parentByNodeId.has(groupId)) {
      errors.push(
        validationIssue('INVALID_VIEW_SPEC', 'ORPHAN_GROUP', pointer('/groups', groupId)),
      );
    }
  }

  const coveredContributions = new Set([
    ...directContributionIds,
    ...[...groups.childIds].filter(nodeId => source.segmentById.has(nodeId)),
  ]);
  if (source.contributionIds.some(id => !coveredContributions.has(id))) {
    errors.push(validationIssue('SOURCE_CONFLICT', 'MISSING_SOURCE_REFERENCE', '/rootOrder'));
  }
}

function validateCollapsedGroups(
  value: unknown,
  groups: GroupIndexes,
  errors: ValidationIssue[],
): void {
  const groupIds = readArray(value, '/collapsedGroupIds', 'INVALID_VIEW_SPEC', errors);
  if (groupIds === undefined) {
    return;
  }
  const seen = new Set<string>();
  for (let index = 0; index < groupIds.length; index += 1) {
    const path = pointer('/collapsedGroupIds', index);
    const groupId = groupIds[index];
    if (!isNonEmptyString(groupId)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', path));
    } else if (seen.has(groupId)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'DUPLICATE_REFERENCE', path));
    } else {
      seen.add(groupId);
      if (!groups.groupIds.has(groupId)) {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'UNKNOWN_GROUP_REFERENCE', path));
      }
    }
  }
}

function validatePinnedItems(
  value: unknown,
  source: SourceIndexes,
  errors: ValidationIssue[],
): void {
  const itemIds = readArray(value, '/pinnedItemIds', 'INVALID_VIEW_SPEC', errors);
  if (itemIds === undefined) {
    return;
  }
  const seen = new Set<string>();
  for (let index = 0; index < itemIds.length; index += 1) {
    const path = pointer('/pinnedItemIds', index);
    const itemId = itemIds[index];
    if (!isNonEmptyString(itemId)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', path));
    } else if (seen.has(itemId)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'DUPLICATE_REFERENCE', path));
    } else {
      seen.add(itemId);
      if (source.itemsById.get(itemId)?.kind !== 'contribution') {
        errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_PIN_REFERENCE', path));
      }
    }
  }
}

function validateAnnotations(
  value: unknown,
  knownNodeIds: ReadonlySet<string>,
  errors: ValidationIssue[],
): void {
  if (!isPlainRecord(value)) {
    errors.push(validationIssue('INVALID_VIEW_SPEC', 'EXPECTED_OBJECT', '/annotations'));
    return;
  }
  const nodeIds = inspectRecord(value, '/annotations', 'INVALID_VIEW_SPEC', errors);
  for (const nodeId of nodeIds) {
    const annotation = ownDataValue(value, nodeId);
    const path = pointer('/annotations', nodeId);
    if (!knownNodeIds.has(nodeId)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'UNKNOWN_NODE_REFERENCE', path));
    }
    if (typeof annotation !== 'string' || annotation.trim().length === 0) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_ANNOTATION', path));
    } else if (Array.from(annotation).length > 500) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'ANNOTATION_TOO_LONG', path));
    }
  }
}

function validateEmphasis(
  value: unknown,
  knownNodeIds: ReadonlySet<string>,
  errors: ValidationIssue[],
): void {
  if (!isPlainRecord(value)) {
    errors.push(validationIssue('INVALID_VIEW_SPEC', 'EXPECTED_OBJECT', '/emphasis'));
    return;
  }
  const nodeIds = inspectRecord(value, '/emphasis', 'INVALID_VIEW_SPEC', errors);
  for (const nodeId of nodeIds) {
    const emphasis = ownDataValue(value, nodeId);
    const path = pointer('/emphasis', nodeId);
    if (!knownNodeIds.has(nodeId)) {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'UNKNOWN_NODE_REFERENCE', path));
    }
    if (emphasis !== 'highlight' && emphasis !== 'muted') {
      errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_EMPHASIS', path));
    }
  }
}

function validateViewSpecInternal(
  input: unknown,
  sourceData: SourceData,
): ValidationResult<ViewSpec> {
  if (!isPlainRecord(input)) {
    return validationFailure([validationIssue('INVALID_VIEW_SPEC', 'EXPECTED_OBJECT', '/')]);
  }

  const errors: ValidationIssue[] = [];
  inspectRecord(input, '', 'INVALID_VIEW_SPEC', errors, VIEW_SPEC_FIELDS);
  validateSchemaVersion(input, 'INVALID_VIEW_SPEC', errors);

  const datasetId = ownDataValue(input, 'datasetId');
  if (typeof datasetId !== 'string') {
    errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_TYPE', '/datasetId'));
  } else if (datasetId.trim().length === 0) {
    errors.push(validationIssue('INVALID_VIEW_SPEC', 'EMPTY_ID', '/datasetId'));
  } else if (datasetId !== sourceData.datasetId) {
    errors.push(validationIssue('SOURCE_CONFLICT', 'DATASET_ID_MISMATCH', '/datasetId'));
  }

  if (ownDataValue(input, 'chartType') !== 'waterfall') {
    errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_CHART_TYPE', '/chartType'));
  }

  const revision = ownDataValue(input, 'revision');
  if (!Number.isSafeInteger(revision) || (revision as number) < 0) {
    errors.push(validationIssue('INVALID_VIEW_SPEC', 'INVALID_REVISION', '/revision'));
  }

  const source = indexSource(sourceData);
  const groups = validateGroups(ownDataValue(input, 'groups'), source, errors);
  validateRootOrder(ownDataValue(input, 'rootOrder'), source, groups, errors);
  validateCollapsedGroups(ownDataValue(input, 'collapsedGroupIds'), groups, errors);
  validatePinnedItems(ownDataValue(input, 'pinnedItemIds'), source, errors);

  const knownNodeIds = new Set<string>([...source.itemsById.keys(), ...groups.groupIds]);
  validateAnnotations(ownDataValue(input, 'annotations'), knownNodeIds, errors);
  validateEmphasis(ownDataValue(input, 'emphasis'), knownNodeIds, errors);

  return errors.length === 0
    ? validationSuccess(input as unknown as ViewSpec)
    : validationFailure(errors);
}

/** Validates a ViewSpec against its immutable SourceData without applying reconciliation. */
export function validateViewSpec(
  input: unknown,
  sourceInput: SourceData,
): ValidationResult<ViewSpec> {
  const sourceResult = validateSourceData(sourceInput);
  if (!sourceResult.ok) {
    return validationFailure(sourceResult.errors);
  }

  try {
    return validateViewSpecInternal(input, sourceResult.value);
  } catch {
    return validationFailure([validationIssue('INVALID_VIEW_SPEC', 'UNREADABLE_INPUT', '/')]);
  }
}
