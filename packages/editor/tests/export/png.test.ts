import { afterEach, describe, expect, it, vi } from 'vitest';

import { exportPngCanvas } from '../../src/export/pngExport';

afterEach(() => {
  vi.restoreAllMocks();
});

function rect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    toJSON: () => ({}),
  };
}

describe('PNG export adapter', () => {
  it('renders a nonempty blob at the requested pixel density and background', async () => {
    const input = document.createElement('canvas');
    input.width = 400;
    input.height = 240;
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(rect(400, 240));

    const output = document.createElement('canvas');
    const fillRect = vi.fn();
    const drawImage = vi.fn();
    const context = { fillStyle: '', fillRect, drawImage } as unknown as CanvasRenderingContext2D;
    vi.spyOn(output, 'getContext').mockReturnValue(context);
    Object.defineProperty(output, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' }))),
    });

    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tagName =>
      tagName.toLowerCase() === 'canvas' ? output : createElement(tagName),
    );

    const result = await exportPngCanvas(input, {
      format: 'png',
      pixelRatio: 2,
      background: '#ffffff',
      suggestedFilename: 'bridge.png',
    });

    expect(output.width).toBe(800);
    expect(output.height).toBe(480);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 800, 480);
    expect(drawImage).toHaveBeenCalledWith(input, 0, 0, 800, 480);
    expect(result).toMatchObject({
      mimeType: 'image/png',
      suggestedFilename: 'bridge.png',
      width: 800,
      height: 480,
    });
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it('rejects unavailable bitmap context and encoding without leaking browser errors', async () => {
    const input = document.createElement('canvas');
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(rect(400, 240));
    const output = document.createElement('canvas');
    vi.spyOn(output, 'getContext').mockReturnValue(null);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tagName =>
      tagName.toLowerCase() === 'canvas' ? output : createElement(tagName),
    );

    await expect(
      exportPngCanvas(input, {
        format: 'png',
        pixelRatio: 2,
        background: undefined,
        suggestedFilename: 'bridge.png',
      }),
    ).rejects.toMatchObject({
      name: 'TellPlotExportError',
      code: 'EXPORT_FAILED',
      path: '/export/png',
      message: 'Image export failed.',
    });
  });
});
