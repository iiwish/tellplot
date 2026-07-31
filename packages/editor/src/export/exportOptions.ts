import { exportError, type ExportOptions, type NormalizedExportOptions } from './exportTypes';

const DEFAULT_FILENAME = 'tellplot-waterfall';
const MAX_FILENAME_BASE_LENGTH = 120;
const WINDOWS_DEVICE_NAME = /^(?:con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])(?:\.|$)/iu;

type ExportOptionRecord = Readonly<Record<string, unknown>>;

const EXPORT_OPTION_FIELDS: ReadonlySet<string> = new Set([
  'format',
  'pixelRatio',
  'background',
  'filename',
]);

function optionRecord(options: ExportOptions): ExportOptionRecord {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw exportError('INVALID_EXPORT_OPTIONS', '/');
  }

  try {
    const prototype = Object.getPrototypeOf(options) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw exportError('INVALID_EXPORT_OPTIONS', '/');
    }
    for (const key of Reflect.ownKeys(options)) {
      if (typeof key !== 'string' || !EXPORT_OPTION_FIELDS.has(key)) {
        throw exportError(
          'INVALID_EXPORT_OPTIONS',
          typeof key === 'string' ? `/${key.replaceAll('~', '~0').replaceAll('/', '~1')}` : '/',
        );
      }
      const descriptor = Object.getOwnPropertyDescriptor(options, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        throw exportError('INVALID_EXPORT_OPTIONS', `/${key}`);
      }
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'TellPlotExportError'
    ) {
      throw error;
    }
    throw exportError('INVALID_EXPORT_OPTIONS', '/');
  }
  return options as unknown as ExportOptionRecord;
}

function optionValue(record: ExportOptionRecord, key: keyof ExportOptions): unknown {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(record, key);
  } catch {
    throw exportError('INVALID_EXPORT_OPTIONS', `/${key}`);
  }
  if (descriptor === undefined) {
    return undefined;
  }
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw exportError('INVALID_EXPORT_OPTIONS', `/${key}`);
  }
  return descriptor.value;
}

function safeFilename(filename: string | undefined, format: 'svg' | 'png'): string {
  const raw = (filename ?? DEFAULT_FILENAME).trim();
  const withoutExtension = raw.replace(/\.(?:svg|png)$/iu, '');
  const cleaned = withoutExtension
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\p{Cc}\p{Cf}]+/gu, '-')
    .replace(/\s+/gu, ' ')
    .replace(/^[ .-]+|[ .-]+$/gu, '')
    .trim();
  const bounded = [...cleaned]
    .slice(0, MAX_FILENAME_BASE_LENGTH)
    .join('')
    .replace(/[ .-]+$/gu, '');
  const safeBase = bounded.length === 0 ? DEFAULT_FILENAME : bounded;
  const portableBase = WINDOWS_DEVICE_NAME.test(safeBase) ? `tellplot-${safeBase}` : safeBase;
  return `${portableBase}.${format}`;
}

function safeBackground(background: string | undefined): string | undefined {
  if (background === undefined) {
    return undefined;
  }
  const value = background.trim();
  if (
    value.length === 0 ||
    value.length > 100 ||
    /(?:url\s*\(|[<>\\]|javascript:|data:|file:|ftp:)/iu.test(value)
  ) {
    throw exportError('INVALID_EXPORT_OPTIONS', '/background');
  }
  return value;
}

export function normalizeExportOptions(options: ExportOptions): NormalizedExportOptions {
  const record = optionRecord(options);
  const format = optionValue(record, 'format');
  if (format !== 'png' && format !== 'svg') {
    throw exportError('INVALID_EXPORT_OPTIONS', '/format');
  }
  const pixelRatio = optionValue(record, 'pixelRatio') ?? (format === 'png' ? 2 : 1);
  if (
    typeof pixelRatio !== 'number' ||
    !Number.isFinite(pixelRatio) ||
    pixelRatio < 1 ||
    pixelRatio > 4
  ) {
    throw exportError('INVALID_EXPORT_OPTIONS', '/pixelRatio');
  }
  const background = optionValue(record, 'background');
  if (background !== undefined && typeof background !== 'string') {
    throw exportError('INVALID_EXPORT_OPTIONS', '/background');
  }
  const filename = optionValue(record, 'filename');
  if (filename !== undefined && typeof filename !== 'string') {
    throw exportError('INVALID_EXPORT_OPTIONS', '/filename');
  }

  return {
    format,
    pixelRatio: format === 'png' ? pixelRatio : 1,
    background: safeBackground(background),
    suggestedFilename: safeFilename(filename, format),
  };
}
