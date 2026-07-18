import { exportError, type ExportOptions, type NormalizedExportOptions } from './exportTypes';

const DEFAULT_FILENAME = 'tellplot-waterfall';

function safeFilename(filename: string | undefined, format: 'svg' | 'png'): string {
  const raw = (filename ?? DEFAULT_FILENAME).trim();
  const withoutExtension = raw.replace(/\.(?:svg|png)$/iu, '');
  const safeBase = withoutExtension
    .replace(/[\\/:]+/gu, '-')
    .replace(/[\p{Cc}]+/gu, '-')
    .replace(/\s+/gu, ' ')
    .replace(/^-+|-+$/gu, '')
    .trim();
  return `${safeBase.length === 0 ? DEFAULT_FILENAME : safeBase}.${format}`;
}

function safeBackground(background: string | undefined): string | undefined {
  if (background === undefined) {
    return undefined;
  }
  const value = background.trim();
  if (
    value.length === 0 ||
    value.length > 100 ||
    /(?:url\s*\(|[<>]|javascript:|data:)/iu.test(value)
  ) {
    throw exportError('INVALID_EXPORT_OPTIONS', '/background');
  }
  return value;
}

export function normalizeExportOptions(options: ExportOptions): NormalizedExportOptions {
  if (options.format !== 'png' && options.format !== 'svg') {
    throw exportError('INVALID_EXPORT_OPTIONS', '/format');
  }
  const pixelRatio = options.pixelRatio ?? (options.format === 'png' ? 2 : 1);
  if (!Number.isFinite(pixelRatio) || pixelRatio < 1 || pixelRatio > 4) {
    throw exportError('INVALID_EXPORT_OPTIONS', '/pixelRatio');
  }

  return {
    format: options.format,
    pixelRatio: options.format === 'png' ? pixelRatio : 1,
    background: safeBackground(options.background),
    suggestedFilename: safeFilename(options.filename, options.format),
  };
}
