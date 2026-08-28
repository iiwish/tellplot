export type ValidationErrorCode =
  | 'INVALID_CHART_CONFIG'
  | 'INVALID_SOURCE_DATA'
  | 'INVALID_VIEW_SPEC'
  | 'INVALID_SESSION_OPTIONS'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'SOURCE_CONFLICT';

export type ValidationIssueReason =
  | 'EXPECTED_OBJECT'
  | 'INVALID_TYPE'
  | 'NON_PLAIN_DATA'
  | 'UNKNOWN_FIELD'
  | 'UNREADABLE_INPUT'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'EMPTY_ID'
  | 'EMPTY_LABEL'
  | 'DUPLICATE_SOURCE_ITEM_ID'
  | 'NON_FINITE_AMOUNT'
  | 'UNSAFE_AMOUNT'
  | 'INVALID_SOURCE_ITEM_KIND'
  | 'INVALID_DATA_KIND'
  | 'INVALID_METADATA_VALUE'
  | 'INVALID_ANCHOR'
  | 'DATASET_ID_MISMATCH'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'INCOMPATIBLE_CHART_TYPE'
  | 'INVALID_CHART_TYPE'
  | 'INVALID_REVISION'
  | 'INVALID_HISTORY_LIMIT'
  | 'UNKNOWN_SOURCE_REFERENCE'
  | 'MISSING_SOURCE_REFERENCE'
  | 'DUPLICATE_VIEW_NODE'
  | 'LOCKED_ANCHOR_REFERENCE'
  | 'ANCHOR_SEGMENT_ORDER'
  | 'GROUP_ID_MISMATCH'
  | 'RESERVED_GROUP_ID'
  | 'GROUP_SOURCE_ID_CONFLICT'
  | 'GROUP_TOO_SMALL'
  | 'DUPLICATE_GROUP_CHILD'
  | 'INVALID_GROUP_CHILD'
  | 'GROUP_CROSSES_ANCHOR'
  | 'DUPLICATE_GROUP_MEMBERSHIP'
  | 'CYCLIC_GROUP_REFERENCE'
  | 'ORPHAN_GROUP'
  | 'DUPLICATE_REFERENCE'
  | 'UNKNOWN_GROUP_REFERENCE'
  | 'INVALID_PIN_REFERENCE'
  | 'INVALID_ANNOTATION'
  | 'ANNOTATION_TOO_LONG'
  | 'UNKNOWN_NODE_REFERENCE'
  | 'INVALID_EMPHASIS'
  | 'INVALID_SERIES_COUNT'
  | 'DUPLICATE_SERIES_ID'
  | 'DUPLICATE_SERIES_LABEL'
  | 'UNKNOWN_SERIES_REFERENCE'
  | 'DUPLICATE_SERIES_VALUE'
  | 'MISSING_SERIES_VALUE'
  | 'SERIES_VALUE_ORDER_MISMATCH'
  | 'DUPLICATE_SERIES_COLOR'
  | 'INCOMPATIBLE_PROJECTOR_GENERATION';

export interface ValidationIssue {
  readonly code: ValidationErrorCode;
  readonly reason: ValidationIssueReason;
  readonly message: string;
  readonly path: string;
  readonly details: Readonly<Record<string, string | number | boolean | null>>;
}

export type ValidationResult<TValue> =
  | {
      readonly ok: true;
      readonly value: TValue;
      readonly errors: readonly [];
    }
  | {
      readonly ok: false;
      readonly errors: readonly ValidationIssue[];
    };

const ISSUE_MESSAGES: Readonly<Record<ValidationIssueReason, string>> = {
  EXPECTED_OBJECT: 'Expected a plain object.',
  INVALID_TYPE: 'Value has an invalid type.',
  NON_PLAIN_DATA: 'Value must use enumerable data properties only.',
  UNKNOWN_FIELD: 'Field is not part of the current schema.',
  UNREADABLE_INPUT: 'Input cannot be inspected safely.',
  UNSUPPORTED_SCHEMA_VERSION: 'Schema version is not supported.',
  EMPTY_ID: 'Identifier must not be empty.',
  EMPTY_LABEL: 'Label must not be empty.',
  DUPLICATE_SOURCE_ITEM_ID: 'Source item identifiers must be unique.',
  NON_FINITE_AMOUNT: 'Amount must be finite.',
  UNSAFE_AMOUNT: 'Amount exceeds the supported numeric range.',
  INVALID_SOURCE_ITEM_KIND: 'Source item kind is not supported.',
  INVALID_DATA_KIND: 'Source data kind is not supported.',
  INVALID_METADATA_VALUE: 'Metadata value is not JSON-compatible.',
  INVALID_ANCHOR: 'Source anchors are invalid.',
  DATASET_ID_MISMATCH: 'View and source datasets do not match.',
  SCHEMA_VERSION_MISMATCH: 'View and source schema generations do not match.',
  INCOMPATIBLE_CHART_TYPE: 'Chart type is incompatible with the source data.',
  INVALID_CHART_TYPE: 'Chart type is not supported.',
  INVALID_REVISION: 'Revision must be a non-negative safe integer.',
  INVALID_HISTORY_LIMIT: 'History limit must be a non-negative safe integer.',
  UNKNOWN_SOURCE_REFERENCE: 'View references an unknown source item.',
  MISSING_SOURCE_REFERENCE: 'View does not cover every narrative source item.',
  DUPLICATE_VIEW_NODE: 'View node appears more than once.',
  LOCKED_ANCHOR_REFERENCE: 'Locked anchors cannot appear in root order.',
  ANCHOR_SEGMENT_ORDER: 'View order crosses a subtotal anchor.',
  GROUP_ID_MISMATCH: 'Group record key and identifier must match.',
  RESERVED_GROUP_ID: 'Group identifier is reserved.',
  GROUP_SOURCE_ID_CONFLICT: 'Group identifier conflicts with a source identifier.',
  GROUP_TOO_SMALL: 'A group requires at least two child nodes.',
  DUPLICATE_GROUP_CHILD: 'A group child appears more than once.',
  INVALID_GROUP_CHILD: 'Only narrative source items and groups can be grouped.',
  GROUP_CROSSES_ANCHOR: 'Group children cannot cross a subtotal anchor.',
  DUPLICATE_GROUP_MEMBERSHIP: 'A narrative source item cannot belong to multiple groups.',
  CYCLIC_GROUP_REFERENCE: 'Group references must not form a cycle.',
  ORPHAN_GROUP: 'Every group must appear in root order.',
  DUPLICATE_REFERENCE: 'Reference appears more than once.',
  UNKNOWN_GROUP_REFERENCE: 'View references an unknown group.',
  INVALID_PIN_REFERENCE: 'Only narrative source items can be pinned.',
  INVALID_ANNOTATION: 'Annotation must contain text.',
  ANNOTATION_TOO_LONG: 'Annotation exceeds the supported length.',
  UNKNOWN_NODE_REFERENCE: 'View references an unknown node.',
  INVALID_EMPHASIS: 'Emphasis value is not supported.',
  INVALID_SERIES_COUNT: 'Series count must be between two and four.',
  DUPLICATE_SERIES_ID: 'Series identifiers must be unique.',
  DUPLICATE_SERIES_LABEL: 'Series labels must be unique after normalization.',
  UNKNOWN_SERIES_REFERENCE: 'Reference does not match a declared series.',
  DUPLICATE_SERIES_VALUE: 'Category values must contain each series exactly once.',
  MISSING_SERIES_VALUE: 'Category values must cover every declared series.',
  SERIES_VALUE_ORDER_MISMATCH: 'Category values must follow declared series order.',
  DUPLICATE_SERIES_COLOR: 'Series color may be configured only once.',
  INCOMPATIBLE_PROJECTOR_GENERATION: 'Projector does not support this schema generation.',
};

export function validationIssue(
  code: ValidationErrorCode,
  reason: ValidationIssueReason,
  path: string,
  details: Readonly<Record<string, string | number | boolean | null>> = {},
): ValidationIssue {
  return {
    code,
    reason,
    message: ISSUE_MESSAGES[reason],
    path,
    details,
  };
}

export function validationSuccess<TValue>(value: TValue): ValidationResult<TValue> {
  return { ok: true, value, errors: [] };
}

export function validationFailure<TValue>(
  errors: readonly ValidationIssue[],
): ValidationResult<TValue> {
  return { ok: false, errors };
}

export type CommandErrorCode =
  | 'INVALID_COMMAND'
  | 'DUPLICATE_COMMAND_ID'
  | 'REVISION_CONFLICT'
  | 'REVISION_OVERFLOW'
  | 'ITEM_NOT_FOUND'
  | 'GROUP_NOT_FOUND'
  | 'NODE_NOT_FOUND'
  | 'ITEM_LOCKED'
  | 'INVALID_DROP_TARGET'
  | 'NON_CONTIGUOUS_GROUP_SELECTION'
  | 'GROUP_TOO_SMALL'
  | 'GROUP_ID_CONFLICT'
  | 'HISTORY_EMPTY'
  | 'INVARIANT_VIOLATION';

export type CommandErrorReason =
  | 'EXPECTED_OBJECT'
  | 'INVALID_TYPE'
  | 'NON_PLAIN_DATA'
  | 'UNKNOWN_FIELD'
  | 'UNREADABLE_INPUT'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'EMPTY_ID'
  | 'EMPTY_LABEL'
  | 'DUPLICATE_ITEM_ID'
  | 'ANNOTATION_TOO_LONG'
  | 'DUPLICATE_COMMAND_ID'
  | 'REVISION_CONFLICT'
  | 'REVISION_OVERFLOW'
  | 'ITEM_NOT_FOUND'
  | 'GROUP_NOT_FOUND'
  | 'NODE_NOT_FOUND'
  | 'SYSTEM_ANCHOR'
  | 'PINNED_ITEM'
  | 'INVALID_INDEX'
  | 'CROSS_SEGMENT'
  | 'GROUP_WOULD_BE_TOO_SMALL'
  | 'CYCLIC_GROUP_TARGET'
  | 'NON_CONTIGUOUS_SELECTION'
  | 'GROUP_TOO_SMALL'
  | 'GROUP_ID_CONFLICT'
  | 'HISTORY_EMPTY'
  | 'INVALID_SESSION_STATE';

export interface CommandError {
  readonly code: CommandErrorCode;
  readonly reason: CommandErrorReason;
  readonly message: string;
  readonly path: string;
  readonly commandId: string | null;
  readonly details: Readonly<Record<string, string | number | boolean | null>>;
}

const COMMAND_ERROR_MESSAGES: Readonly<Record<CommandErrorReason, string>> = {
  EXPECTED_OBJECT: 'Expected a plain command object.',
  INVALID_TYPE: 'Command field has an invalid type.',
  NON_PLAIN_DATA: 'Command must use enumerable data properties only.',
  UNKNOWN_FIELD: 'Command field is not part of the current schema.',
  UNREADABLE_INPUT: 'Command cannot be inspected safely.',
  UNSUPPORTED_SCHEMA_VERSION: 'Command schema version is not supported.',
  EMPTY_ID: 'Command identifier must not be empty.',
  EMPTY_LABEL: 'Group label must not be empty.',
  DUPLICATE_ITEM_ID: 'Group selection contains a duplicate item.',
  ANNOTATION_TOO_LONG: 'Annotation exceeds the supported length.',
  DUPLICATE_COMMAND_ID: 'Action identifier has already been accepted.',
  REVISION_CONFLICT: 'Command revision does not match the current view.',
  REVISION_OVERFLOW: 'View revision cannot be incremented safely.',
  ITEM_NOT_FOUND: 'Source item does not exist.',
  GROUP_NOT_FOUND: 'View group does not exist.',
  NODE_NOT_FOUND: 'View node does not exist.',
  SYSTEM_ANCHOR: 'System anchors cannot be edited by this command.',
  PINNED_ITEM: 'Pinned items cannot be moved by this command.',
  INVALID_INDEX: 'Target index is outside the destination container.',
  CROSS_SEGMENT: 'Items cannot move or group across subtotal segments.',
  GROUP_WOULD_BE_TOO_SMALL: 'Move would leave a group with fewer than two items.',
  CYCLIC_GROUP_TARGET: 'A group cannot move into itself or one of its descendants.',
  NON_CONTIGUOUS_SELECTION: 'Group selection must be contiguous in root order.',
  GROUP_TOO_SMALL: 'A group requires at least two child nodes.',
  GROUP_ID_CONFLICT: 'Group identifier conflicts with an existing identifier.',
  HISTORY_EMPTY: 'Requested history direction has no entry.',
  INVALID_SESSION_STATE: 'Editor session violates a domain invariant.',
};

export function commandError(
  code: CommandErrorCode,
  reason: CommandErrorReason,
  path: string,
  commandId: string | null,
  details: Readonly<Record<string, string | number | boolean | null>> = {},
): CommandError {
  return {
    code,
    reason,
    message: COMMAND_ERROR_MESSAGES[reason],
    path,
    commandId,
    details,
  };
}
