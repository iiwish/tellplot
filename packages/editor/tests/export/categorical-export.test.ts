import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoricalProjection } from '@tellplot/core';
import { exportSvgChart } from '../../src/export/svgExport';

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
      const child = (
        this.spec as { readonly children?: readonly { readonly data?: readonly unknown[] }[] }
      ).children?.[0];
      for (const datum of child?.data ?? []) {
        const label = (datum as { readonly label?: unknown }).label;
        if (typeof label === 'string') {
          const text = this.container.ownerDocument.createElementNS(
            'http://www.w3.org/2000/svg',
            'text',
          );
          text.textContent = label;
          svg.append(text);
        }
      }
      this.container.append(svg);
      return Promise.resolve();
    }

    destroy(): void {
      return;
    }
  }
  return { Chart };
});

vi.mock('@antv/g2', () => ({ Chart: svgG2Mock.Chart }));
vi.mock('@antv/g-svg', () => ({
  Renderer: class Renderer {
    readonly kind = 'svg';
  },
}));

const projection = [
  {
    nodeId: 'first',
    label: 'First category',
    amount: 10,
    kind: 'positive',
    sourceIds: ['first'],
    locked: false,
    order: 0,
  },
  {
    nodeId: 'second',
    label: 'Second category',
    amount: -4,
    kind: 'negative',
    sourceIds: ['second'],
    locked: false,
    order: 1,
  },
] as const satisfies CategoricalProjection;

beforeEach(() => {
  svgG2Mock.Chart.specs = [];
});

describe('categorical SVG export', () => {
  it('uses the canonical categorical spec and preserves top-to-bottom bar order', async () => {
    const result = await exportSvgChart({
      generation: 'scalar',
      chartType: 'bar',
      ownerDocument: document,
      projection,
      title: 'Category bridge',
      locale: 'en-US',
      currency: 'USD',
      width: 640,
      height: 360,
      background: '#ffffff',
      suggestedFilename: 'categories.svg',
      annotations: {},
      emphasis: {},
    });

    const spec = svgG2Mock.Chart.specs.at(-1) as
      | {
          readonly children?: readonly {
            readonly coordinate?: unknown;
            readonly data?: readonly { readonly nodeId: string }[];
            readonly scale?: { readonly x?: { readonly reverse?: boolean } };
          }[];
        }
      | undefined;
    expect(spec?.children?.[0]?.coordinate).toEqual({ transform: [{ type: 'transpose' }] });
    expect(spec?.children?.[0]?.scale?.x?.reverse).toBe(true);
    expect(spec?.children?.[0]?.data?.map(datum => datum.nodeId)).toEqual(['first', 'second']);
    expect(await result.blob.text()).toContain('First category');
  });

  it('passes expanded group regions into the transposed SVG spec', async () => {
    await exportSvgChart({
      generation: 'scalar',
      chartType: 'bar',
      ownerDocument: document,
      projection,
      title: 'Grouped categories',
      locale: 'en-US',
      currency: 'USD',
      width: 640,
      height: 360,
      background: '#ffffff',
      suggestedFilename: 'grouped-categories.svg',
      appearance: { groupRegion: { label: 'auto' } },
      annotations: {},
      emphasis: {},
      groupRegions: [
        {
          regionId: 'group-region:pair',
          groupId: 'pair',
          label: 'Pair',
          depth: 1,
          startNodeId: 'first',
          endNodeId: 'second',
          valueStart: -4,
          valueEnd: 10,
          labelValue: 10,
        },
      ],
    });
    const spec = svgG2Mock.Chart.specs.at(-1) as
      | {
          readonly children?: readonly {
            readonly type?: unknown;
            readonly coordinate?: unknown;
          }[];
        }
      | undefined;

    expect(spec?.children?.map(child => child.type)).toEqual(['range', 'interval', 'text', 'text']);
    expect(spec?.children?.[0]?.coordinate).toEqual({ transform: [{ type: 'transpose' }] });
    expect(spec?.children?.[2]?.coordinate).toEqual({ transform: [{ type: 'transpose' }] });
    expect(spec?.children?.[3]?.coordinate).toEqual({ transform: [{ type: 'transpose' }] });
  });
});
