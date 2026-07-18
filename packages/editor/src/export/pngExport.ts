import type { Chart as G2Chart } from '@antv/g2';

import type { ViewNodeId } from '../domain/ids';
import type { Annotation, Emphasis } from '../domain/model';
import type { WaterfallProjection } from '../waterfall/waterfallTypes';
import type { EditorLocale } from '../components/formatAmount';
import { exportError, type ExportResult, type NormalizedExportOptions } from './exportTypes';
import { createWaterfallChartSpec, shouldShowWaterfallValueLabels } from './waterfallChartSpec';

interface PngChartExportRequest {
  readonly ownerDocument: Document;
  readonly projection: WaterfallProjection;
  readonly title: string;
  readonly locale: EditorLocale;
  readonly currency: string | undefined;
  readonly width: number;
  readonly height: number;
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
}

function canvasLogicalSize(canvas: HTMLCanvasElement): {
  readonly width: number;
  readonly height: number;
} {
  const bounds = canvas.getBoundingClientRect();
  return {
    width: bounds.width > 0 ? bounds.width : canvas.width,
    height: bounds.height > 0 ? bounds.height : canvas.height,
  };
}

function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob === null || blob.size === 0) {
          reject(exportError('EXPORT_FAILED', '/export/png'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    } catch {
      reject(exportError('EXPORT_FAILED', '/export/png'));
    }
  });
}

function isStructuredExportError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'TellPlotExportError'
  );
}

export async function exportPngCanvas(
  sourceCanvas: HTMLCanvasElement,
  options: NormalizedExportOptions,
): Promise<ExportResult> {
  const logical = canvasLogicalSize(sourceCanvas);
  const width = Math.max(1, Math.round(logical.width * options.pixelRatio));
  const height = Math.max(1, Math.round(logical.height * options.pixelRatio));
  const output = sourceCanvas.ownerDocument.createElement('canvas');
  output.width = width;
  output.height = height;

  try {
    const context = output.getContext('2d');
    if (context === null) {
      throw exportError('EXPORT_FAILED', '/export/png');
    }
    if (options.background !== undefined) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(sourceCanvas, 0, 0, width, height);
    const blob = await encodePng(output);
    return {
      blob,
      mimeType: 'image/png',
      suggestedFilename: options.suggestedFilename,
      width,
      height,
    };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'TellPlotExportError'
    ) {
      throw error;
    }
    throw exportError('EXPORT_FAILED', '/export/png');
  }
}

export async function exportPngChart(
  request: PngChartExportRequest,
  options: NormalizedExportOptions,
): Promise<ExportResult> {
  const width = Math.max(1, Math.round(request.width));
  const height = Math.max(1, Math.round(request.height));
  const body = request.ownerDocument.body;
  if (body === null) {
    throw exportError('EXPORT_UNAVAILABLE', '/export/png');
  }

  const host = request.ownerDocument.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '-10000px';
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.pointerEvents = 'none';
  body.append(host);

  let chart: G2Chart | undefined;
  try {
    const { Chart } = await import('@antv/g2');
    chart = new Chart({ container: host, width, height, autoFit: false });
    chart.options(
      createWaterfallChartSpec({
        projection: request.projection,
        title: request.title,
        locale: request.locale,
        currency: request.currency,
        reducedMotion: true,
        showValueLabels: shouldShowWaterfallValueLabels(request.projection),
        annotations: request.annotations,
        emphasis: request.emphasis,
      }),
    );
    await chart.render();
    const canvas = host.querySelector('canvas');
    const ownerWindow = request.ownerDocument.defaultView;
    if (ownerWindow === null || !(canvas instanceof ownerWindow.HTMLCanvasElement)) {
      throw exportError('EXPORT_FAILED', '/export/png');
    }
    return exportPngCanvas(canvas, options);
  } catch (error) {
    if (isStructuredExportError(error)) {
      throw error;
    }
    throw exportError('EXPORT_FAILED', '/export/png');
  } finally {
    try {
      chart?.destroy();
    } catch {
      // Cleanup failure must not expose renderer internals or financial data.
    }
    host.remove();
  }
}
