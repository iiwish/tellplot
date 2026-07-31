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

  it('neutralizes cross-platform filename controls, reserved names and excessive length', () => {
    expect(
      normalizeExportOptions({
        format: 'svg',
        filename: 'invoice\u202Egpj.exe.svg',
      }).suggestedFilename,
    ).toBe('invoice-gpj.exe.svg');
    expect(normalizeExportOptions({ format: 'png', filename: 'CON.png' }).suggestedFilename).toBe(
      'tellplot-CON.png',
    );

    const bounded = normalizeExportOptions({
      format: 'svg',
      filename: `${'财'.repeat(200)}.svg`,
    }).suggestedFilename;
    expect([...bounded.replace(/\.svg$/u, '')]).toHaveLength(120);
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

  it('rejects invalid runtime option shapes without leaking native errors', () => {
    const accessorOptions = Object.defineProperty({}, 'format', {
      enumerable: true,
      get(): never {
        throw new Error('private accessor failure');
      },
    });
    const proxyOptions = new Proxy(
      {},
      {
        getOwnPropertyDescriptor(): never {
          throw new Error('private proxy failure');
        },
      },
    );
    const cases: readonly [unknown, string][] = [
      [null, '/'],
      [{ format: 'png', background: 42 }, '/background'],
      [{ format: 'png', filename: 42 }, '/filename'],
      [accessorOptions, '/format'],
      [proxyOptions, '/format'],
    ];

    for (const [options, path] of cases) {
      expect(captureError(() => normalizeExportOptions(options as ExportOptions))).toMatchObject({
        name: 'TellPlotExportError',
        code: 'INVALID_EXPORT_OPTIONS',
        path,
        message: 'Export options are invalid.',
      });
    }
  });

  it('rejects unknown fields, symbol keys and escaped external background resources', () => {
    expect(
      captureError(() =>
        normalizeExportOptions({ format: 'svg', experimental: true } as unknown as ExportOptions),
      ),
    ).toMatchObject({ code: 'INVALID_EXPORT_OPTIONS', path: '/experimental' });

    const symbolOptions = { format: 'svg' } as ExportOptions;
    Object.defineProperty(symbolOptions, Symbol('private'), { value: true, enumerable: true });
    expect(captureError(() => normalizeExportOptions(symbolOptions))).toMatchObject({
      code: 'INVALID_EXPORT_OPTIONS',
      path: '/',
    });

    expect(
      captureError(() =>
        normalizeExportOptions({
          format: 'svg',
          background: String.raw`u\72l(https://attacker.example/background.svg)`,
        }),
      ),
    ).toMatchObject({ code: 'INVALID_EXPORT_OPTIONS', path: '/background' });
  });
});
