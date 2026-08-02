import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));

async function readJson(path: string): Promise<Record<string, unknown>> {
  const source = await readFile(
    new URL(path, `${new URL(repositoryRoot, import.meta.url).href}/`),
    'utf8',
  );
  return JSON.parse(source) as Record<string, unknown>;
}

describe('production website deployment contract', () => {
  it('uses the exact workspace toolchain and a stable site build command', async () => {
    const packageJson = await readJson('package.json');
    const scripts = packageJson['scripts'] as Record<string, unknown>;

    expect(packageJson['packageManager']).toBe('pnpm@11.1.3');
    expect(scripts['build:site']).toBe('pnpm --filter @tellplot/playground build');
  });

  it('builds the Vite app from the repository root with explicit routes and hardening', async () => {
    const config = await readJson('vercel.json');
    const rewrites = config['rewrites'] as readonly Record<string, unknown>[];
    const headers = config['headers'] as readonly Record<string, unknown>[];

    expect(config['framework']).toBe('vite');
    expect(config['installCommand']).toBe('npx --yes pnpm@11.1.3 install --frozen-lockfile');
    expect(config['buildCommand']).toBe('npx --yes pnpm@11.1.3 build:site');
    expect(config['outputDirectory']).toBe('apps/playground/dist');
    expect(rewrites).toEqual([
      { source: '/examples', destination: '/examples/index.html' },
      { source: '/docs', destination: '/docs/index.html' },
      { source: '/playground', destination: '/playground/index.html' },
    ]);
    expect(JSON.stringify(headers)).toContain('Content-Security-Policy');
    expect(JSON.stringify(headers)).toContain('max-age=0, must-revalidate');
    expect(JSON.stringify(headers)).toContain('max-age=31536000, immutable');
  });
});
