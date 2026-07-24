import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());

function json(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8')) as Record<string, unknown>;
}

function text(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

function runScript(path: string): { readonly status: number | null; readonly output: string } {
  const result = spawnSync(process.execPath, [resolve(root, path)], {
    cwd: root,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

describe('1.0 stable release contract', () => {
  it('uses stable package metadata and release commands', () => {
    const packageManifest = json('packages/editor/package.json');
    const workspaceManifest = json('package.json');
    const scripts = workspaceManifest['scripts'] as Record<string, unknown>;
    const publishConfig = packageManifest['publishConfig'] as Record<string, unknown>;

    expect(packageManifest['version']).toBe('1.0.0');
    expect(publishConfig).toEqual({
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    });
    expect(scripts['release:architecture']).toBe('node scripts/release/check-architecture.mjs');
    expect(scripts['release:audit']).toBe('node scripts/release/audit-release.mjs');
    expect(scripts['release:check']).toBe('node scripts/release/check-stable.mjs');
    expect(scripts['release:rehearse']).toBe('node scripts/release/rehearse-source.mjs');
  });

  it('keeps the public release command and browser matrix release-complete', () => {
    const stableCheck = text('scripts/release/check-stable.mjs');
    const playwrightConfig = text('playwright.config.ts');
    const previousBrowserRunner = text(
      'packages/editor/tests/browser-matrix/run-previous-browsers.mjs',
    );
    const releaseAudit = text('scripts/release/audit-release.mjs');
    const requiredGates = [
      'test:coverage',
      'test:package',
      'test:react-matrix',
      'test:e2e',
      'test:a11y',
      'test:performance',
      'test:browser-previous',
      'release:rehearse',
    ];

    for (const gate of requiredGates) {
      expect(stableCheck).toContain(gate);
    }
    expect(playwrightConfig).toContain("process.env['TELLPLOT_E2E_WORKERS'] ?? '2'");
    expect(playwrightConfig).toContain('workers: e2eWorkers');
    expect(previousBrowserRunner).toContain('workers: 2');
    expect(releaseAudit).toContain("resolve(repositoryRoot, '.ai-platform')");
  });

  it('ships the public maintenance and stability documents', () => {
    const required = [
      'CONTRIBUTING.md',
      'SECURITY.md',
      'CODE_OF_CONDUCT.md',
      'SUPPORT.md',
      'docs/versioning.md',
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      '.github/ISSUE_TEMPLATE/feature_request.yml',
      '.github/ISSUE_TEMPLATE/config.yml',
      '.github/pull_request_template.md',
    ];

    expect(required.filter(path => !existsSync(resolve(root, path)))).toEqual([]);
    expect(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8')).toContain('## 1.0.0');
    expect(readFileSync(resolve(root, 'docs/versioning.md'), 'utf8')).toContain('至少跨一个 minor');
  });

  it('passes the executable architecture and public release audits', () => {
    const architecture = runScript('scripts/release/check-architecture.mjs');
    const release = runScript('scripts/release/audit-release.mjs');

    expect(architecture, architecture.output).toMatchObject({ status: 0 });
    expect(release, release.output).toMatchObject({ status: 0 });
  });
});
