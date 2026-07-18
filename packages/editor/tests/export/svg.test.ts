import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitialViewSpec } from '../../src/domain/createInitialViewSpec';
import { createSafeSvgResult, exportSvgChart } from '../../src/export/svgExport';
import { projectWaterfall } from '../../src/waterfall/projectWaterfall';
import { financialSourceData } from '../fixtures/financialSourceData';

const svgG2Mock = vi.hoisted(() => {
  class Chart {
    static specs: unknown[] = [];

    readonly container: HTMLElement;
    spec: unknown;

    constructor(config: unknown) {
      this.container = (config as { readonly container: HTMLElement }).container;
    }

    options(spec: unknown): this {
      this.spec = spec;
      Chart.specs.push(spec);
      return this;
    }

    render(): Promise<void> {
      const svg = this.container.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const title = (this.spec as { readonly title?: string | { readonly title?: string } }).title;
      const titleText = typeof title === 'string' ? title : title?.title;
      if (titleText !== undefined) {
        const element = this.container.ownerDocument.createElementNS(
          'http://www.w3.org/2000/svg',
          'text',
        );
        element.textContent = titleText;
        svg.append(element);
      }
      const child = (this.spec as { readonly children?: readonly unknown[] }).children?.[0] as
        | {
            readonly data?: readonly unknown[];
            readonly labels?: readonly Readonly<Record<string, unknown>>[];
          }
        | undefined;
      const annotationLabel = child?.labels?.find(label => label['position'] === 'inside');
      const text = annotationLabel?.['text'];
      if (typeof text === 'function') {
        const accessor = text as (datum: unknown) => string;
        for (const datum of child?.data ?? []) {
          const value = accessor(datum);
          if (value === '') {
            continue;
          }
          const element = this.container.ownerDocument.createElementNS(
            'http://www.w3.org/2000/svg',
            'text',
          );
          element.textContent = value;
          svg.append(element);
        }
      }
      this.container.append(svg);
      return Promise.resolve();
    }

    destroy(): void {
      // The production exporter owns host cleanup; the mock only models G2 output.
    }
  }

  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: svgG2Mock.Chart }));
vi.mock('@antv/g-svg', () => ({
  Renderer: class Renderer {
    readonly type = 'svg';
  },
}));

beforeEach(() => {
  svgG2Mock.Chart.specs = [];
});

describe('SVG export safety', () => {
  it('keeps visible ordered text while removing scripts, external URLs and hidden metadata', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML = [
      '<script>alert(1)</script>',
      '<foreignObject><div>private</div></foreignObject>',
      '<a href="https://example.com/private"><text>external</text></a>',
      '<g data-source-ref="ledger:private" data-node-id="first"><text>收入增长</text></g>',
      '<g data-node-id="second"><text>成本压力</text></g>',
    ].join('');

    const result = createSafeSvgResult(svg, {
      width: 640,
      height: 360,
      background: '#ffffff',
      suggestedFilename: 'bridge.svg',
    });
    const text = await result.blob.text();

    expect(result).toMatchObject({
      mimeType: 'image/svg+xml',
      suggestedFilename: 'bridge.svg',
      width: 640,
      height: 360,
    });
    expect(text.indexOf('收入增长')).toBeLessThan(text.indexOf('成本压力'));
    expect(text).not.toContain('<script');
    expect(text).not.toContain('foreignObject');
    expect(text).not.toContain('https://');
    expect(text).not.toContain('ledger:');
    expect(text).not.toContain('data-source-ref');
    expect(text).toContain('fill="#ffffff"');
  });

  it('renders visible annotations through the shared G2 SVG chart spec as escaped text', async () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid SVG annotation fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid SVG annotation projection');
    }

    const result = await exportSvgChart({
      ownerDocument: document,
      projection: projection.value,
      title: '经营变动瀑布图',
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      width: 960,
      height: 520,
      background: '#ffffff',
      suggestedFilename: 'bridge.svg',
      annotations: {
        'revenue-growth': '重点客户续约',
        'cost-pressure': '<script>private()</script>',
        hidden: '不可见注释',
      },
      emphasis: {},
    });
    const text = await result.blob.text();

    expect(text).toContain('经营变动瀑布图');
    expect(text).toContain('重点客户续约');
    expect(text).toContain('&lt;script&gt;private()&lt;/script&gt;');
    expect(text).not.toContain('<script>');
    expect(text).not.toContain('不可见注释');
  });

  it('uses the visible-chart amount-label policy instead of forcing extra SVG labels', async () => {
    const view = createInitialViewSpec(financialSourceData);
    if (!view.ok) {
      throw new Error('Expected a valid SVG label-policy fixture');
    }
    const projection = projectWaterfall(financialSourceData, view.value);
    if (!projection.ok) {
      throw new Error('Expected a valid SVG label-policy projection');
    }
    const contribution = projection.value.find(datum => datum.kind === 'positive');
    if (contribution === undefined) {
      throw new Error('Expected a contribution datum');
    }
    const denseProjection = Array.from({ length: 41 }, (_, index) => ({
      ...contribution,
      nodeId: `dense-${index}`,
      label: `Dense ${index}`,
      sourceIds: [`dense-${index}`],
      order: index,
    }));

    await exportSvgChart({
      ownerDocument: document,
      projection: denseProjection,
      title: '经营变动瀑布图',
      locale: 'zh-CN',
      currency: financialSourceData.currency,
      width: 960,
      height: 520,
      background: '#ffffff',
      suggestedFilename: 'bridge.svg',
      annotations: {},
      emphasis: {},
    });

    const spec = svgG2Mock.Chart.specs.at(-1) as
      { readonly children?: readonly { readonly labels?: readonly unknown[] }[] } | undefined;
    expect(spec?.children?.[0]?.labels).toEqual([]);
  });
});
