import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoricalComparisonProjection, CategoricalComparisonSeries } from '@tellplot/core';
import { exportPngChart } from '../../src/export/pngExport';
import { exportSvgChart } from '../../src/export/svgExport';

const g2Mock = vi.hoisted(() => {
  class Chart {
    static specs: unknown[] = [];

    readonly container: HTMLElement;
    readonly renderer: unknown;
    spec: unknown;

    constructor(config: { readonly container: HTMLElement; readonly renderer?: unknown }) {
      this.container = config.container;
      this.renderer = config.renderer;
    }

    options(spec: unknown): this {
      this.spec = spec;
      Chart.specs.push(spec);
      return this;
    }

    render(): Promise<void> {
      if (this.renderer !== undefined) {
        const svg = this.container.ownerDocument.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg',
        );
        const title = (this.spec as { readonly title?: { readonly title?: string } }).title?.title;
        if (title !== undefined) {
          const text = this.container.ownerDocument.createElementNS(
            'http://www.w3.org/2000/svg',
            'text',
          );
          text.textContent = title;
          svg.append(text);
        }
        this.container.append(svg);
      } else {
        const canvas = this.container.ownerDocument.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        this.container.append(canvas);
      }
      return Promise.resolve();
    }

    destroy(): void {
      return;
    }
  }
  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: g2Mock.Chart }));
vi.mock('@antv/g-svg', () => ({
  Renderer: class Renderer {
    readonly kind = 'svg';
  },
}));

const series = [
  { id: 'actual', label: 'Actual' },
  { id: 'budget', label: 'Budget' },
] as const satisfies readonly CategoricalComparisonSeries[];

const projection = [
  {
    nodeId: 'north',
    label: 'North',
    values: [
      { seriesId: 'actual', label: 'Actual', amount: 12 },
      { seriesId: 'budget', label: 'Budget', amount: -8 },
    ],
    kind: 'category',
    sourceIds: ['north'],
    locked: false,
    order: 0,
  },
] as const satisfies CategoricalComparisonProjection;

function intervalSpec(): {
  readonly data?: readonly { readonly nodeId: string; readonly seriesId: string }[];
  readonly scale?: {
    readonly color?: { readonly domain?: readonly string[]; readonly range?: readonly string[] };
  };
  readonly legend?: unknown;
  readonly tooltip?: unknown;
  readonly animate?: unknown;
} {
  const spec = g2Mock.Chart.specs.at(-1) as {
    readonly children?: readonly {
      readonly key?: string;
      readonly data?: readonly { readonly nodeId: string; readonly seriesId: string }[];
      readonly scale?: {
        readonly color?: {
          readonly domain?: readonly string[];
          readonly range?: readonly string[];
        };
      };
      readonly legend?: unknown;
      readonly tooltip?: unknown;
      readonly animate?: unknown;
    }[];
  };
  const interval = spec.children?.find(child => child.key === 'categorical-comparison-interval');
  if (interval === undefined) {
    throw new Error('Expected canonical comparison interval spec.');
  }
  return interval;
}

beforeEach(() => {
  g2Mock.Chart.specs = [];
});

describe('comparison image export', () => {
  it.each(['column', 'bar'] as const)(
    'routes %s through the canonical comparison SVG spec with export-only interaction disabled',
    async chartType => {
      const result = await exportSvgChart({
        generation: 'comparison',
        chartType,
        ownerDocument: document,
        projection,
        series,
        title: 'Actual versus budget',
        locale: 'en-US',
        currency: 'USD',
        width: 640,
        height: 360,
        background: '#ffffff',
        suggestedFilename: 'comparison.svg',
        annotations: { north: 'Watch' },
        emphasis: { north: 'highlight' },
        appearance: {
          legend: true,
          tooltip: true,
          animation: { enabled: true, duration: 200 },
          colors: { series: [{ seriesId: 'budget', color: '#123456' }] },
        },
      });

      const interval = intervalSpec();
      expect(interval.data?.map(datum => [datum.nodeId, datum.seriesId])).toEqual([
        ['north', 'actual'],
        ['north', 'budget'],
      ]);
      expect(interval.scale?.color).toEqual({
        type: 'ordinal',
        domain: ['actual', 'budget'],
        range: ['#0072B2', '#123456'],
      });
      expect(interval.legend).not.toBe(false);
      expect(interval.tooltip).toBe(false);
      expect(interval.animate).toBe(false);
      expect(await result.blob.text()).toContain('Actual versus budget');
      expect(document.querySelector('[data-tellplot-offscreen-chart]')).toBeNull();
    },
  );

  it.each([true, false] as const)(
    'allows a legal empty comparison projection with legend=%s and explicit series domain',
    async legend => {
      const result = await exportSvgChart({
        generation: 'comparison',
        chartType: 'column',
        ownerDocument: document,
        projection: [],
        series,
        title: 'Empty comparison',
        locale: 'en-US',
        currency: undefined,
        width: 480,
        height: 320,
        background: '#fefefe',
        suggestedFilename: 'empty.svg',
        annotations: {},
        emphasis: {},
        appearance: { legend },
      });

      expect(intervalSpec().scale?.color?.domain).toEqual(['actual', 'budget']);
      expect(intervalSpec().legend).toEqual({
        color: legend ? { labelFormatter: expect.any(Function) } : false,
      });
      expect(await result.blob.text()).toContain('Empty comparison');
      expect(result).toMatchObject({ width: 480, height: 320 });
    },
  );

  it('renders comparison PNG from a fresh offscreen spec instead of a screen canvas', async () => {
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      const element = createElement(tagName);
      if (tagName.toLowerCase() === 'canvas') {
        const canvas = element as HTMLCanvasElement;
        vi.spyOn(canvas, 'getContext').mockReturnValue({
          fillStyle: '',
          fillRect: vi.fn(),
          drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D);
        Object.defineProperty(canvas, 'toBlob', {
          configurable: true,
          value: (callback: BlobCallback) =>
            callback(new Blob(['nonblank-png'], { type: 'image/png' })),
        });
      }
      return element;
    });

    const result = await exportPngChart(
      {
        generation: 'comparison',
        chartType: 'column',
        ownerDocument: document,
        projection,
        series,
        title: 'Comparison PNG',
        locale: 'en-US',
        currency: 'USD',
        width: 640,
        height: 360,
        annotations: {},
        emphasis: {},
        appearance: { legend: false },
      },
      {
        format: 'png',
        pixelRatio: 2,
        background: '#ffffff',
        suggestedFilename: 'comparison.png',
      },
    );

    expect(intervalSpec().legend).toEqual({ color: false });
    expect(result).toMatchObject({ mimeType: 'image/png', width: 1280, height: 720 });
    expect(result.blob.size).toBeGreaterThan(0);
  });
});
