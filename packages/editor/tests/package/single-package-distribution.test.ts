import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());

function json(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8')) as Record<string, unknown>;
}

function text(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

describe('single-package distribution', () => {
  it('publishes one unscoped tellplot package with isolated public subpaths', () => {
    const manifest = json('packages/tellplot/package.json');

    expect(manifest['name']).toBe('tellplot');
    expect(manifest['version']).toBe('1.0.0');
    expect(manifest['private']).not.toBe(true);
    expect(manifest['publishConfig']).toEqual({
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    });
    expect(Object.keys(manifest['exports'] as Record<string, unknown>).sort()).toEqual([
      '.',
      './core',
      './package.json',
      './react',
      './styles.css',
      './vue',
    ]);
    expect(manifest['dependencies']).toEqual({
      '@antv/g-svg': '2.1.1',
      '@antv/g2': '5.4.8',
    });
    expect(manifest['peerDependencies']).toEqual({
      react: '^18.3.0 || ^19.0.0',
      vue: '^3.5.0',
    });
    expect(manifest['peerDependenciesMeta']).toEqual({
      react: { optional: true },
      vue: { optional: true },
    });

    for (const entry of ['index.ts', 'core.ts', 'react.ts', 'vue.ts', 'styles.css']) {
      expect(existsSync(resolve(root, 'packages/tellplot/src', entry))).toBe(true);
    }
  });

  it('keeps the framework layers private and independently testable', () => {
    for (const directory of ['core', 'editor', 'react', 'vue']) {
      const manifest = json(`packages/${directory}/package.json`);
      expect(manifest['private'], directory).toBe(true);
      expect(manifest['publishConfig'], directory).toBeUndefined();
    }
  });

  it('stages only the canonical tellplot tarball', () => {
    const workflow = text('.github/workflows/publish-npm.yml');
    const artifactScript = text('scripts/release/package-artifact.mjs');
    const packageTestScript = text('scripts/release/test-packages.mjs');

    expect(workflow).toContain('tellplot-1.0.0.tgz');
    expect(workflow).toContain('npm stage publish');
    expect(workflow).not.toContain('tellplot-core-1.0.0.tgz');
    expect(workflow).not.toContain('tellplot-editor-1.0.0.tgz');
    expect(workflow).not.toContain('tellplot-react-1.0.0.tgz');
    expect(workflow).not.toContain('tellplot-vue-1.0.0.tgz');
    expect(artifactScript).toContain("const packageDirectories = ['tellplot']");
    expect(packageTestScript).toContain("const packageNames = ['tellplot']");
  });

  it('resolves the public facade from source in a clean playground checkout', () => {
    const playgroundConfig = json('apps/playground/tsconfig.json');
    const compilerOptions = playgroundConfig['compilerOptions'] as Record<string, unknown>;
    const paths = compilerOptions['paths'] as Record<string, unknown>;
    const viteConfig = text('apps/playground/vite.config.ts');

    expect(paths).toMatchObject({
      '@tellplot/core': ['../../packages/core/src/index.ts'],
      '@tellplot/editor': ['../../packages/editor/src/index.ts'],
      '@tellplot/react': ['../../packages/react/src/index.tsx'],
      '@tellplot/vue': ['../../packages/vue/src/index.ts'],
      tellplot: ['../../packages/tellplot/src/index.ts'],
      'tellplot/react': ['../../packages/tellplot/src/react.ts'],
    });
    for (const packageName of [
      '@tellplot/core',
      '@tellplot/editor',
      '@tellplot/react',
      '@tellplot/vue',
    ]) {
      expect(viteConfig).toContain(`find: '${packageName}'`);
    }
  });

  it('documents one install surface without legacy scoped package instructions', () => {
    for (const path of ['README.md', 'docs/getting-started.md', 'docs/api.md']) {
      const contents = text(path);
      expect(contents, path).toContain('pnpm add tellplot');
      expect(contents, path).not.toContain('pnpm add @tellplot/');
    }
  });
});
