import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import { describe, expect, it } from 'vitest';

const playgroundRoot = fileURLToPath(new URL('..', import.meta.url));
const viteWarningThresholdBytes = 500_000;

describe('playground production bundle', () => {
  it('keeps lazy chart and application chunks below the Vite warning threshold', async () => {
    const previousNodeEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    const result = await build({
      root: playgroundRoot,
      logLevel: 'silent',
      build: {
        write: false,
      },
    }).finally(() => {
      if (previousNodeEnv === undefined) {
        delete process.env['NODE_ENV'];
      } else {
        process.env['NODE_ENV'] = previousNodeEnv;
      }
    });
    const outputs = Array.isArray(result) ? result : [result];
    const chunks = outputs.flatMap(output => {
      if (!('output' in output)) {
        throw new Error('Expected a completed playground production build');
      }
      return output.output.filter(item => item.type === 'chunk');
    });
    const chunkSizes = chunks.map(chunk => ({
      fileName: chunk.fileName,
      size: Buffer.byteLength(chunk.code),
    }));

    expect(chunkSizes.length).toBeGreaterThan(1);
    expect(chunkSizes.length).toBeLessThanOrEqual(8);
    expect(chunks.some(chunk => chunk.isEntry && chunk.dynamicImports.length > 0)).toBe(true);
    expect(chunkSizes.every(chunk => chunk.size > 0)).toBe(true);
    expect(Math.max(...chunkSizes.map(chunk => chunk.size))).toBeLessThanOrEqual(
      viteWarningThresholdBytes,
    );

    const assets = outputs.flatMap(output => {
      if (!('output' in output)) {
        return [];
      }
      return output.output.filter(item => item.type === 'asset');
    });
    const assetNames = assets.map(asset => asset.fileName);

    expect(assetNames).toEqual(
      expect.arrayContaining([
        'index.html',
        'examples/index.html',
        'docs/index.html',
        'playground/index.html',
      ]),
    );

    const docsShell = assets.find(asset => asset.fileName === 'docs/index.html');
    expect(docsShell).toBeDefined();
    const docsHtml =
      typeof docsShell?.source === 'string'
        ? docsShell.source
        : Buffer.from(docsShell?.source ?? []).toString('utf8');
    expect(docsHtml).toContain('<title>开发者文档 | TellPlot</title>');
    expect(docsHtml).toContain('rel="canonical" href="https://tellplot.com/docs"');
    expect(docsHtml).toContain('property="og:url" content="https://tellplot.com/docs"');

    const publicDirectory = new URL('../public/', import.meta.url);
    const [favicon, socialImage, robots, sitemap] = await Promise.all([
      readFile(new URL('favicon.svg', publicDirectory)),
      readFile(new URL('og-image.png', publicDirectory)),
      readFile(new URL('robots.txt', publicDirectory), 'utf8'),
      readFile(new URL('sitemap.xml', publicDirectory), 'utf8'),
    ]);
    expect(favicon.length).toBeGreaterThan(100);
    expect(socialImage.readUInt32BE(16)).toBe(1200);
    expect(socialImage.readUInt32BE(20)).toBe(630);
    expect(robots).toContain('Sitemap: https://tellplot.com/sitemap.xml');
    expect(sitemap).toContain('<loc>https://tellplot.com/playground</loc>');
  });
});
