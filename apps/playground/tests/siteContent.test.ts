import { describe, expect, it } from 'vitest';

import { EXAMPLE_CATALOG, exampleById } from '../src/exampleCatalog';
import { resolveSiteRoute, siteTitleForRoute } from '../src/siteRouting';

describe('playground website content', () => {
  it('keeps the example catalog explicit, unique, and limited to validated chart types', () => {
    expect(EXAMPLE_CATALOG.map(example => example.id)).toEqual(['waterfall', 'column', 'bar']);
    expect(new Set(EXAMPLE_CATALOG.map(example => example.id)).size).toBe(EXAMPLE_CATALOG.length);
    expect(EXAMPLE_CATALOG.map(example => example.chartType)).toEqual([
      'waterfall',
      'column',
      'bar',
    ]);
  });

  it('maps examples to deterministic workbench fixtures', () => {
    expect(exampleById('waterfall')?.workbenchHref).toBe('/playground');
    expect(exampleById('column')?.workbenchHref).toBe('/playground?fixture=categorical-column');
    expect(exampleById('bar')?.workbenchHref).toBe('/playground?fixture=categorical-bar');
  });

  it('keeps gallery categories explicit without becoming a runtime registry', () => {
    expect(EXAMPLE_CATALOG.map(example => example.category)).toEqual([
      'financial',
      'categorical',
      'categorical',
    ]);
  });
});

describe('playground website routes', () => {
  it.each([
    ['https://tellplot.dev/', 'home'],
    ['https://tellplot.dev/examples', 'examples'],
    ['https://tellplot.dev/docs', 'docs'],
    ['https://tellplot.dev/playground?fixture=categorical-bar', 'playground'],
    ['https://tellplot.dev/not-found', 'not-found'],
  ] as const)('resolves %s as %s', (href, expected) => {
    expect(resolveSiteRoute(new URL(href)).page).toBe(expected);
  });

  it('returns a useful document title for every top-level route', () => {
    expect(siteTitleForRoute({ page: 'home' })).toBe('TellPlot | 可编辑基础图表');
    expect(siteTitleForRoute({ page: 'examples' })).toContain('示例');
    expect(siteTitleForRoute({ page: 'docs' })).toContain('文档');
    expect(siteTitleForRoute({ page: 'playground' })).toContain('在线编辑');
    expect(siteTitleForRoute({ page: 'not-found' })).toContain('页面不存在');
  });
});
