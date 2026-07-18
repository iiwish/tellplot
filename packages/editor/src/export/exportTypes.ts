export interface ExportOptions {
  readonly format: 'svg' | 'png';
  readonly pixelRatio?: number;
  readonly background?: string;
  readonly filename?: string;
}

export interface ExportResult {
  readonly blob: Blob;
  readonly mimeType: 'image/svg+xml' | 'image/png';
  readonly suggestedFilename: string;
  readonly width: number;
  readonly height: number;
}

export type ExportErrorCode = 'INVALID_EXPORT_OPTIONS' | 'EXPORT_UNAVAILABLE' | 'EXPORT_FAILED';

export interface ExportError extends Error {
  readonly name: 'TellPlotExportError';
  readonly code: ExportErrorCode;
  readonly path: string;
}

export interface NormalizedExportOptions {
  readonly format: 'svg' | 'png';
  readonly pixelRatio: number;
  readonly background: string | undefined;
  readonly suggestedFilename: string;
}

const ERROR_MESSAGES: Readonly<Record<ExportErrorCode, string>> = {
  INVALID_EXPORT_OPTIONS: 'Export options are invalid.',
  EXPORT_UNAVAILABLE: 'Image export is unavailable.',
  EXPORT_FAILED: 'Image export failed.',
};

export function exportError(code: ExportErrorCode, path: string): ExportError {
  return Object.assign(new Error(ERROR_MESSAGES[code]), {
    name: 'TellPlotExportError' as const,
    code,
    path,
  });
}
