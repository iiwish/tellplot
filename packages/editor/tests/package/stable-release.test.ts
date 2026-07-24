import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());

function json(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8')) as Record<string, unknown>;
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

    expect(packageManifest['version']).toBe('1.0.0');
    expect(scripts['release:architecture']).toBe('node scripts/release/check-architecture.mjs');
    expect(scripts['release:audit']).toBe('node scripts/release/audit-release.mjs');
    expect(scripts['release:check']).toBe('node scripts/release/check-stable.mjs');
    expect(scripts['release:rehearse']).toBe('node scripts/release/rehearse-source.mjs');
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
