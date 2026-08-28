import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DocsPage } from '../src/DocsPage';
import { EXAMPLE_CATALOG, exampleById } from '../src/exampleCatalog';
import { getPlaygroundFixture } from '../src/fixtures';
import { createShowcaseConfig } from '../src/showcaseConfig';
import { SiteHeader } from '../src/SiteHeader';
import { SITE_METADATA, SITE_ORIGIN, siteMetadataForPage } from '../src/siteMetadata';
import { resolveSiteRoute, siteTitleForRoute } from '../src/siteRouting';

describe('playground website header', () => {
  it('links the GitHub icon to the public TellPlot repository', () => {
    const markup = renderToStaticMarkup(
      createElement(SiteHeader, {
        page: 'home',
        onNavigate: () => undefined,
      }),
    );

    expect(markup).toContain('href="https://github.com/iiwish/tellplot"');
    expect(markup).toContain('aria-label="在 GitHub 查看 TellPlot"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});

describe('playground website content', () => {
  it('keeps the example catalog explicit, unique, and limited to validated chart types', () => {
    expect(EXAMPLE_CATALOG.map(example => example.id)).toEqual([
      'waterfall',
      'column',
      'bar',
      'comparison-column',
      'comparison-bar',
    ]);
    expect(new Set(EXAMPLE_CATALOG.map(example => example.id)).size).toBe(EXAMPLE_CATALOG.length);
    expect(EXAMPLE_CATALOG.map(example => example.chartType)).toEqual([
      'waterfall',
      'column',
      'bar',
      'column',
      'bar',
    ]);
  });

  it('maps examples to deterministic workbench fixtures', () => {
    expect(exampleById('waterfall')?.workbenchHref).toBe('/playground');
    expect(exampleById('column')?.workbenchHref).toBe('/playground?fixture=categorical-column');
    expect(exampleById('bar')?.workbenchHref).toBe('/playground?fixture=categorical-bar');
    expect(EXAMPLE_CATALOG.find(example => example.id === 'comparison-column')?.workbenchHref).toBe(
      '/playground?fixture=comparison-actual-budget',
    );
    expect(EXAMPLE_CATALOG.find(example => example.id === 'comparison-bar')?.workbenchHref).toBe(
      '/playground?fixture=comparison-actual-budget-bar',
    );
  });

  it('uses schema 3 dense comparison fixtures for both website comparison examples', () => {
    const comparisons = EXAMPLE_CATALOG.filter(example => example.id.startsWith('comparison-'));

    expect(comparisons).toHaveLength(2);
    for (const example of comparisons) {
      const source = getPlaygroundFixture(example.fixtureSearch);
      expect(source.schemaVersion).toBe('3.0.0');
      if (source.schemaVersion !== '3.0.0') {
        throw new Error('Expected schema 3 comparison fixture');
      }
      expect(source.series.map(series => series.label)).toEqual(['实际', '预算']);
      expect(source.items.every(item => item.values.length === source.series.length)).toBe(true);
    }
  });

  it('keeps comparison values readable when the interactive showcase becomes compact', () => {
    const source = getPlaygroundFixture('?fixture=comparison-actual-budget');
    const compact = createShowcaseConfig(source, 'column', '实际与预算柱状图', true, true);
    const desktop = createShowcaseConfig(source, 'column', '实际与预算柱状图', false, true);

    expect(compact?.appearance?.labels).toEqual({ value: 'never', group: 'never' });
    expect(desktop?.appearance?.labels).toMatchObject({
      value: { display: 'always', placement: 'outside' },
      group: 'never',
    });
  });

  it('keeps gallery categories explicit without becoming a runtime registry', () => {
    expect(EXAMPLE_CATALOG.map(example => example.category)).toEqual([
      'financial',
      'categorical',
      'categorical',
      'categorical',
      'categorical',
    ]);
  });

  it('presents the 2.0 and schema 3 comparison contract in the website developer guide', () => {
    const markup = renderToStaticMarkup(
      createElement(DocsPage, {
        onNavigate: () => undefined,
      }),
    );

    expect(markup).toContain('DEVELOPER GUIDE · 2.0');
    expect(markup).toContain('2 至 4 个序列');
    expect(markup).toContain('实际与预算');
    expect(markup).toContain('/playground?fixture=comparison-actual-budget');
    expect(markup).toContain('<strong>2.0.0</strong>');
    expect(markup).toContain('<dd>1.0 / 2.0 / 3.0</dd>');
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

  it('provides canonical production metadata for every indexable route', () => {
    expect(SITE_ORIGIN).toBe('https://tellplot.com');
    expect(Object.keys(SITE_METADATA)).toEqual(['home', 'examples', 'docs', 'playground']);
    expect(siteMetadataForPage('home').canonicalUrl).toBe('https://tellplot.com/');
    expect(siteMetadataForPage('examples').canonicalUrl).toBe('https://tellplot.com/examples');
    expect(siteMetadataForPage('docs').title).toContain('文档');
    expect(siteMetadataForPage('playground').description).toContain('实时编辑');
  });
});
