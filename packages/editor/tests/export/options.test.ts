import { describe, expect, it } from 'vitest';

import type { ExportError, ExportOptions } from '../../src';
import { normalizeExportOptions } from '../../src/export/exportOptions';

function captureError(action: () => unknown): ExportError {
  try {
    action();
  } catch (error) {
    return error as ExportError;
  }
  throw new Error('Expected export option validation to fail');
}

describe('export options', () => {
  it('applies stable defaults and a safe extension', () => {
    expect(normalizeExportOptions({ format: 'png' })).toEqual({
      format: 'png',
      pixelRatio: 2,
      background: undefined,
      suggestedFilename: 'tellplot-waterfall.png',
    });
    expect(
      normalizeExportOptions({
        format: 'svg',
        filename: ' Q1/利润桥.svg ',
        background: '#ffffff',
      }),
    ).toEqual({
      format: 'svg',
      pixelRatio: 1,
      background: '#ffffff',
      suggestedFilename: 'Q1-利润桥.svg',
    });
  });

  it('normalizes a mismatched or missing extension', () => {
    expect(
      normalizeExportOptions({ format: 'png', filename: 'bridge.svg' }).suggestedFilename,
    ).toBe('bridge.png');
    expect(normalizeExportOptions({ format: 'svg', filename: '.svg' }).suggestedFilename).toBe(
      'tellplot-waterfall.svg',
    );
  });

  it('rejects unsupported formats and invalid pixel ratios with structured errors', () => {
    const formatError = captureError(() =>
      normalizeExportOptions({ format: 'pdf' } as unknown as ExportOptions),
    );
    expect(formatError).toMatchObject({
      name: 'TellPlotExportError',
      code: 'INVALID_EXPORT_OPTIONS',
      path: '/format',
      message: 'Export options are invalid.',
    });

    for (const pixelRatio of [0, 4.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        captureError(() => normalizeExportOptions({ format: 'png', pixelRatio })),
      ).toMatchObject({
        code: 'INVALID_EXPORT_OPTIONS',
        path: '/pixelRatio',
      });
    }
  });
});
