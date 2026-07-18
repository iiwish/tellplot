import type { Chart as G2Chart } from '@antv/g2';

import type { ViewNodeId } from '../domain/ids';
import type { Annotation, Emphasis } from '../domain/model';
import type { WaterfallProjection } from '../waterfall/waterfallTypes';
import type { EditorLocale } from '../components/formatAmount';
import { createWaterfallChartSpec, shouldShowWaterfallValueLabels } from './waterfallChartSpec';
import { exportError, type ExportResult } from './exportTypes';

interface SvgResultOptions {
  readonly width: number;
  readonly height: number;
  readonly background: string | undefined;
  readonly suggestedFilename: string;
}

interface SvgChartExportRequest {
  readonly ownerDocument: Document;
  readonly projection: WaterfallProjection;
  readonly title: string;
  readonly locale: EditorLocale;
  readonly currency: string | undefined;
  readonly width: number;
  readonly height: number;
  readonly background: string | undefined;
  readonly suggestedFilename: string;
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
}

const REMOVED_ELEMENTS = 'script, foreignObject, iframe, object, embed, image, use';

function sanitizeElement(element: Element): void {
  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;
    if (
      name.startsWith('on') ||
      name.startsWith('data-') ||
      ((name === 'href' || name === 'xlink:href') && !value.startsWith('#')) ||
      /(?:https?:|javascript:|data:|url\s*\(\s*['"]?https?:)/iu.test(value)
    ) {
      element.removeAttribute(attribute.name);
    }
  }
}

export function createSafeSvgResult(
  sourceSvg: SVGSVGElement,
  options: SvgResultOptions,
): ExportResult {
  if (
    !Number.isFinite(options.width) ||
    !Number.isFinite(options.height) ||
    options.width <= 0 ||
    options.height <= 0
  ) {
    throw exportError('EXPORT_FAILED', '/export/svg');
  }
  const clone = sourceSvg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll(REMOVED_ELEMENTS).forEach(element => element.remove());
  sanitizeElement(clone);
  clone.querySelectorAll('*').forEach(sanitizeElement);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(options.width));
  clone.setAttribute('height', String(options.height));
  clone.setAttribute('viewBox', `0 0 ${options.width} ${options.height}`);

  if (options.background !== undefined) {
    const background = clone.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', options.background);
    clone.insertBefore(background, clone.firstChild);
  }

  try {
    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    if (blob.size === 0) {
      throw exportError('EXPORT_FAILED', '/export/svg');
    }
    return {
      blob,
      mimeType: 'image/svg+xml',
      suggestedFilename: options.suggestedFilename,
      width: options.width,
      height: options.height,
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
    throw exportError('EXPORT_FAILED', '/export/svg');
  }
}

function isStructuredExportError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'TellPlotExportError'
  );
}

export async function exportSvgChart(request: SvgChartExportRequest): Promise<ExportResult> {
  const width = Math.max(1, Math.round(request.width));
  const height = Math.max(1, Math.round(request.height));
  const body = request.ownerDocument.body;
  if (body === null) {
    throw exportError('EXPORT_UNAVAILABLE', '/export/svg');
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
    const [{ Chart }, { Renderer }] = await Promise.all([
      import('@antv/g2'),
      import('@antv/g-svg'),
    ]);
    chart = new Chart({
      container: host,
      width,
      height,
      autoFit: false,
      renderer: new Renderer(),
    });
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
    const svg = host.querySelector('svg');
    const ownerWindow = request.ownerDocument.defaultView;
    if (ownerWindow === null || !(svg instanceof ownerWindow.SVGSVGElement)) {
      throw exportError('EXPORT_FAILED', '/export/svg');
    }
    return createSafeSvgResult(svg, {
      width,
      height,
      background: request.background,
      suggestedFilename: request.suggestedFilename,
    });
  } catch (error) {
    if (isStructuredExportError(error)) {
      throw error;
    }
    throw exportError('EXPORT_FAILED', '/export/svg');
  } finally {
    try {
      chart?.destroy();
    } catch {
      // Cleanup failure must not expose renderer internals or financial data.
    }
    host.remove();
  }
}
