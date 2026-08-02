import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

import { SITE_METADATA, type SiteMetadata } from './src/siteMetadata';

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderRouteShell(source: string, metadata: SiteMetadata): string {
  const title = escapeHtmlAttribute(metadata.title);
  const description = escapeHtmlAttribute(metadata.description);
  const canonicalUrl = escapeHtmlAttribute(metadata.canonicalUrl);

  return source
    .replace(/<title>[^<]*<\/title>/u, `<title>${title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*" \/>/u,
      `<meta name="description" content="${description}" />`,
    )
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/u,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/u,
      `<meta property="og:title" content="${title}" />`,
    )
    .replace(
      /<meta property="og:description" content="[^"]*" \/>/u,
      `<meta property="og:description" content="${description}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/u,
      `<meta property="og:url" content="${canonicalUrl}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/u,
      `<meta name="twitter:title" content="${title}" />`,
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*" \/>/u,
      `<meta name="twitter:description" content="${description}" />`,
    );
}

function staticRouteShells(): Plugin {
  return {
    name: 'tellplot-static-route-shells',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const indexAsset = bundle['index.html'];
      if (indexAsset?.type !== 'asset') {
        this.error('Expected Vite to emit index.html before static route shells');
      }

      const source =
        typeof indexAsset.source === 'string'
          ? indexAsset.source
          : Buffer.from(indexAsset.source).toString('utf8');
      indexAsset.source = renderRouteShell(source, SITE_METADATA.home);

      for (const metadata of Object.values(SITE_METADATA)) {
        if (metadata.path === '/') {
          continue;
        }
        this.emitFile({
          type: 'asset',
          fileName: `${metadata.path.slice(1)}/index.html`,
          source: renderRouteShell(source, metadata),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), staticRouteShells()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'g2-runtime',
              test: /node_modules[\\/]@antv[\\/]g2[\\/]/,
              priority: 10,
              minSize: 96 * 1024,
              // Rolldown applies this target before minification.
              maxSize: 1_300 * 1024,
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '@tellplot/core',
        replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      },
      {
        find: '@tellplot/editor',
        replacement: fileURLToPath(new URL('../../packages/editor/src/index.ts', import.meta.url)),
      },
      {
        find: '@tellplot/react',
        replacement: fileURLToPath(new URL('../../packages/react/src/index.tsx', import.meta.url)),
      },
      {
        find: '@tellplot/vue',
        replacement: fileURLToPath(new URL('../../packages/vue/src/index.ts', import.meta.url)),
      },
      {
        find: 'tellplot/styles.css',
        replacement: fileURLToPath(
          new URL('../../packages/tellplot/src/styles.css', import.meta.url),
        ),
      },
      {
        find: 'tellplot/react',
        replacement: fileURLToPath(
          new URL('../../packages/tellplot/src/react.ts', import.meta.url),
        ),
      },
      {
        find: 'tellplot',
        replacement: fileURLToPath(
          new URL('../../packages/tellplot/src/index.ts', import.meta.url),
        ),
      },
    ],
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
