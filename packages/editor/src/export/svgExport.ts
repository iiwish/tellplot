import type {
  Annotation,
  CategoricalComparisonChartAppearance,
  CategoricalComparisonProjection,
  CategoricalComparisonSeries,
  CategoricalProjection,
  ChartType,
  Emphasis,
  FinancialChartAppearance,
  ViewNodeId,
  WaterfallProjection,
} from '@tellplot/core';
import {
  createCategoricalChartSpec,
  shouldShowCategoricalValueLabels,
} from '../charts/categorical/spec';
import { createWaterfallChartSpec, shouldShowWaterfallValueLabels } from '../charts/waterfall/spec';
import type { ExpandedGroupRegion } from '../charts/groupRegions';
import { withOffscreenG2Render } from '../rendering/g2/exportRuntime';
import type { EditorLocale } from '../editor/formatAmount';
import { createComparisonExportSpec } from './comparisonExportSpec';
import { exportError, type ExportResult } from './exportTypes';

interface SvgResultOptions {
  readonly width: number;
  readonly height: number;
  readonly background: string | undefined;
  readonly suggestedFilename: string;
}

interface SvgChartExportBaseRequest {
  readonly ownerDocument: Document;
  readonly signal?: AbortSignal;
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

type SvgChartExportRequest = SvgChartExportBaseRequest &
  (
    | {
        readonly chartType?: 'waterfall';
        readonly projection: WaterfallProjection;
        readonly appearance?: FinancialChartAppearance | undefined;
        readonly groupRegions?: readonly ExpandedGroupRegion[] | undefined;
      }
    | {
        readonly generation: 'scalar';
        readonly chartType: Extract<ChartType, 'bar' | 'column'>;
        readonly projection: CategoricalProjection;
        readonly appearance?: FinancialChartAppearance | undefined;
        readonly groupRegions?: readonly ExpandedGroupRegion[] | undefined;
      }
    | {
        readonly generation: 'comparison';
        readonly chartType: Extract<ChartType, 'bar' | 'column'>;
        readonly projection: CategoricalComparisonProjection;
        readonly series: readonly CategoricalComparisonSeries[];
        readonly appearance?: CategoricalComparisonChartAppearance | undefined;
        readonly groupRegions?: readonly ExpandedGroupRegion[] | undefined;
      }
  );

type CategoricalSvgChartExportRequest = SvgChartExportBaseRequest & {
  readonly generation: 'scalar';
  readonly chartType: Extract<ChartType, 'bar' | 'column'>;
  readonly projection: CategoricalProjection;
  readonly appearance?: FinancialChartAppearance | undefined;
  readonly groupRegions?: readonly ExpandedGroupRegion[] | undefined;
};

type ComparisonSvgChartExportRequest = SvgChartExportBaseRequest & {
  readonly generation: 'comparison';
  readonly chartType: Extract<ChartType, 'bar' | 'column'>;
  readonly projection: CategoricalComparisonProjection;
  readonly series: readonly CategoricalComparisonSeries[];
  readonly appearance?: CategoricalComparisonChartAppearance | undefined;
  readonly groupRegions?: readonly ExpandedGroupRegion[] | undefined;
};

function isCategoricalRequest(
  request: SvgChartExportRequest,
): request is CategoricalSvgChartExportRequest {
  return (
    (request.chartType === 'bar' || request.chartType === 'column') &&
    request.generation === 'scalar'
  );
}

function isComparisonRequest(
  request: SvgChartExportRequest,
): request is ComparisonSvgChartExportRequest {
  return (
    (request.chartType === 'bar' || request.chartType === 'column') &&
    request.generation === 'comparison'
  );
}

const REMOVED_ELEMENT_NAMES: ReadonlySet<string> = new Set([
  'animate',
  'animatemotion',
  'animatetransform',
  'audio',
  'base',
  'discard',
  'embed',
  'feimage',
  'foreignobject',
  'handler',
  'iframe',
  'image',
  'link',
  'listener',
  'meta',
  'mpath',
  'object',
  'script',
  'set',
  'source',
  'style',
  'track',
  'use',
  'video',
]);

const RESOURCE_ATTRIBUTES: ReadonlySet<string> = new Set(['href', 'poster', 'src', 'xlink:href']);

function hasUnsafeCssUrl(value: string): boolean {
  if (value.includes('\\')) {
    return true;
  }
  for (const match of value.matchAll(/url\s*\(\s*([^)]*)\)/giu)) {
    let target = (match[1] ?? '').trim();
    const quote = target.at(0);
    if (quote === '"' || quote === "'") {
      if (target.at(-1) !== quote) {
        return true;
      }
      target = target.slice(1, -1).trim();
    }
    if (!/^#[^\s<>"'()]+$/u.test(target)) {
      return true;
    }
  }
  return false;
}

function sanitizeElement(element: Element): void {
  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;
    if (
      name.startsWith('on') ||
      name.startsWith('data-') ||
      (RESOURCE_ATTRIBUTES.has(name) && !/^#[^\s<>"'()]+$/u.test(value)) ||
      /(?:https?:|javascript:|data:|file:|ftp:)/iu.test(value) ||
      hasUnsafeCssUrl(value)
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
  for (const element of [clone, ...clone.querySelectorAll('*')]) {
    if (REMOVED_ELEMENT_NAMES.has(element.localName.toLowerCase())) {
      element.remove();
    } else {
      sanitizeElement(element);
    }
  }
  clone.setAttribute('width', String(options.width));
  clone.setAttribute('height', String(options.height));
  clone.setAttribute('viewBox', `0 0 ${options.width} ${options.height}`);

  if (options.background !== undefined) {
    const background = clone.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', options.background);
    sanitizeElement(background);
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

  try {
    return await withOffscreenG2Render(
      {
        ownerDocument: request.ownerDocument,
        parent: body,
        renderer: 'svg',
        ...(request.signal === undefined ? {} : { signal: request.signal }),
        width,
        height,
        spec: isComparisonRequest(request)
          ? createComparisonExportSpec({
              projection: request.projection,
              series: request.series,
              chartType: request.chartType,
              title: request.title,
              locale: request.locale,
              currency: request.currency,
              annotations: request.annotations,
              emphasis: request.emphasis,
              appearance: request.appearance,
              groupRegions: request.groupRegions,
            })
          : isCategoricalRequest(request)
            ? createCategoricalChartSpec({
                projection: request.projection,
                chartType: request.chartType,
                title: request.title,
                locale: request.locale,
                currency: request.currency,
                reducedMotion: true,
                showValueLabels: shouldShowCategoricalValueLabels(request.projection),
                annotations: request.annotations,
                emphasis: request.emphasis,
                appearance: request.appearance,
                groupRegions: request.groupRegions,
              })
            : createWaterfallChartSpec({
                projection: request.projection,
                title: request.title,
                locale: request.locale,
                currency: request.currency,
                reducedMotion: true,
                showValueLabels: shouldShowWaterfallValueLabels(request.projection),
                annotations: request.annotations,
                emphasis: request.emphasis,
                appearance: request.appearance,
                groupRegions: request.groupRegions,
              }),
      },
      host => {
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
      },
    );
  } catch (error) {
    if (isStructuredExportError(error)) {
      throw error;
    }
    throw exportError('EXPORT_FAILED', '/export/svg');
  }
}
