import { createInitialViewSpec } from './createInitialViewSpec';
import {
  validationFailure,
  validationIssue,
  validationSuccess,
  type ValidationIssue,
  type ValidationResult,
} from './errors';
import type { HistoryEntry } from './history';
import type { SourceData, ViewSpec } from './model';
import { sourceDataKind } from './chartPolicy';
import { validateSourceData, validateViewSpec } from './validation';

const DEFAULT_HISTORY_LIMIT = 100;
const SESSION_OPTION_FIELDS: ReadonlySet<string> = new Set(['viewSpec', 'historyLimit']);
const FNV1A_64_OFFSET = 0xcbf29ce484222325n;
const FNV1A_64_PRIME = 0x100000001b3n;

type UnknownRecord = Record<string, unknown>;

interface ParsedSessionOptions {
  readonly hasViewSpec: boolean;
  readonly viewSpec: unknown;
  readonly historyLimit: number;
}

export interface EditorSessionOptions {
  readonly viewSpec?: ViewSpec;
  readonly historyLimit?: number;
}

export interface EditorSession {
  readonly sourceData: SourceData;
  readonly sourceFingerprint: string;
  readonly viewSpec: ViewSpec;
  readonly undoStack: readonly HistoryEntry[];
  readonly redoStack: readonly HistoryEntry[];
  readonly historyLimit: number;
  readonly processedActionIds: readonly string[];
}

function pointer(segment: string): string {
  return `/${segment.replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

function optionIssue(
  reason: 'INVALID_HISTORY_LIMIT' | 'NON_PLAIN_DATA' | 'UNKNOWN_FIELD' | 'UNREADABLE_INPUT',
  path: string,
): ValidationIssue {
  return validationIssue('INVALID_SESSION_OPTIONS', reason, path);
}

function isPlainRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function parseSessionOptionsInternal(options: unknown): ValidationResult<ParsedSessionOptions> {
  if (options === undefined) {
    return validationSuccess({
      hasViewSpec: false,
      viewSpec: undefined,
      historyLimit: DEFAULT_HISTORY_LIMIT,
    });
  }

  if (!isPlainRecord(options)) {
    return validationFailure([optionIssue('NON_PLAIN_DATA', '/')]);
  }

  const errors: ValidationIssue[] = [];
  let hasViewSpec = false;
  let viewSpec: unknown;
  let hasHistoryLimit = false;
  let historyLimit: unknown;

  for (const key of Reflect.ownKeys(options)) {
    if (typeof key === 'symbol') {
      errors.push(optionIssue('NON_PLAIN_DATA', '/'));
      continue;
    }

    if (!SESSION_OPTION_FIELDS.has(key)) {
      errors.push(optionIssue('UNKNOWN_FIELD', pointer(key)));
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      errors.push(optionIssue('NON_PLAIN_DATA', pointer(key)));
      continue;
    }

    if (key === 'viewSpec') {
      hasViewSpec = true;
      viewSpec = descriptor.value;
    } else {
      hasHistoryLimit = true;
      historyLimit = descriptor.value;
    }
  }

  const resolvedHistoryLimit = hasHistoryLimit ? historyLimit : DEFAULT_HISTORY_LIMIT;
  if (!Number.isSafeInteger(resolvedHistoryLimit) || (resolvedHistoryLimit as number) < 0) {
    errors.push(optionIssue('INVALID_HISTORY_LIMIT', '/historyLimit'));
  }

  if (errors.length > 0) {
    return validationFailure(errors);
  }

  return validationSuccess({
    hasViewSpec,
    viewSpec,
    historyLimit: resolvedHistoryLimit as number,
  });
}

function parseSessionOptions(options: unknown): ValidationResult<ParsedSessionOptions> {
  try {
    return parseSessionOptionsInternal(options);
  } catch {
    return validationFailure([optionIssue('UNREADABLE_INPUT', '/')]);
  }
}

function sourceFingerprint(sourceData: SourceData): string {
  const waterfall = sourceDataKind(sourceData) === 'waterfall';
  const canonicalSource = {
    schemaVersion: sourceData.schemaVersion,
    ...(sourceData.schemaVersion === '2.0.0' ? { dataKind: sourceData.dataKind } : {}),
    datasetId: sourceData.datasetId,
    ...(sourceData.currency === undefined ? {} : { currency: sourceData.currency }),
    items: sourceData.items.map(item => ({
      id: item.id,
      label: item.label,
      amount: item.amount,
      ...(waterfall && 'kind' in item ? { kind: item.kind } : {}),
      ...(item.sourceRef === undefined ? {} : { sourceRef: item.sourceRef }),
      ...(item.metadata === undefined
        ? {}
        : {
            metadata: Object.fromEntries(
              Object.entries(item.metadata).sort(([first], [second]) =>
                first < second ? -1 : first > second ? 1 : 0,
              ),
            ),
          }),
    })),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalSource));
  let hash = FNV1A_64_OFFSET;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * FNV1A_64_PRIME);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

/** Creates an immutable editor session after validating its source, options and initial view. */
export function createEditorSession(
  sourceData: SourceData,
  options?: EditorSessionOptions,
): ValidationResult<EditorSession> {
  const sourceResult = validateSourceData(sourceData);
  if (!sourceResult.ok) {
    return validationFailure(sourceResult.errors);
  }

  const optionsResult = parseSessionOptions(options);
  if (!optionsResult.ok) {
    return optionsResult;
  }

  let viewResult: ValidationResult<ViewSpec>;
  try {
    viewResult = optionsResult.value.hasViewSpec
      ? validateViewSpec(optionsResult.value.viewSpec, sourceResult.value)
      : createInitialViewSpec(sourceResult.value);
  } catch {
    return validationFailure([validationIssue('INVALID_SOURCE_DATA', 'UNREADABLE_INPUT', '/')]);
  }
  if (!viewResult.ok) {
    return validationFailure(viewResult.errors);
  }

  let fingerprint: string;
  try {
    fingerprint = sourceFingerprint(sourceResult.value);
  } catch {
    return validationFailure([validationIssue('INVALID_SOURCE_DATA', 'UNREADABLE_INPUT', '/')]);
  }

  return validationSuccess({
    sourceData: sourceResult.value,
    sourceFingerprint: fingerprint,
    viewSpec: viewResult.value,
    undoStack: [],
    redoStack: [],
    historyLimit: optionsResult.value.historyLimit,
    processedActionIds: [],
  });
}
