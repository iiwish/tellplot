import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

function listFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function runScript(
  path: string,
  args: readonly string[] = [],
): { readonly status: number | null; readonly output: string } {
  const result = spawnSync(process.execPath, [resolve(root, path), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

function runModuleSource(source: string): {
  readonly status: number | null;
  readonly output: string;
} {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
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
    const internalPackageManifests = [
      json('packages/core/package.json'),
      json('packages/editor/package.json'),
      json('packages/react/package.json'),
      json('packages/vue/package.json'),
    ];
    const publicPackageManifest = json('packages/tellplot/package.json');
    const workspaceManifest = json('package.json');
    const artifactScript = text('scripts/release/package-artifact.mjs');
    const scripts = workspaceManifest['scripts'] as Record<string, unknown>;
    for (const packageManifest of internalPackageManifests) {
      expect(packageManifest['version']).toBe('0.0.0');
      expect(packageManifest['private']).toBe(true);
      expect(packageManifest['publishConfig']).toBeUndefined();
    }
    expect(publicPackageManifest['name']).toBe('tellplot');
    expect(publicPackageManifest['version']).toBe('1.0.0');
    expect(publicPackageManifest['publishConfig']).toEqual({
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    });
    expect(scripts['release:architecture']).toBe('node scripts/release/check-architecture.mjs');
    expect(scripts['release:audit']).toBe('node scripts/release/audit-release.mjs');
    expect(scripts['security:lock']).toBe(
      'node scripts/release/audit-dependencies.mjs --lock-only',
    );
    expect(scripts['security:dependencies']).toBe('node scripts/release/audit-dependencies.mjs');
    expect(scripts['audit:prod']).toBe('node scripts/release/audit-production.mjs');
    expect(scripts['security:production-audit']).toBe('pnpm audit:prod');
    expect(scripts['test:package']).toBe('node scripts/release/test-packages.mjs');
    expect(scripts['release:artifact']).toBe('node scripts/release/package-artifact.mjs');
    expect(scripts['release:artifact:refresh']).toBe(
      'node scripts/release/package-artifact.mjs --write',
    );
    expect(scripts['release:check']).toBe('node scripts/release/check-stable.mjs');
    expect(scripts['release:preflight']).toBe('node scripts/release/preflight-public.mjs');
    expect(scripts['release:preflight:ci']).toBe('node scripts/release/preflight-public.mjs --ci');
    expect(scripts['release:public:preflight']).toBe('pnpm release:preflight');
    expect(scripts['release:trust-readiness']).toBe(
      'node scripts/release/check-package-availability.mjs',
    );
    expect(scripts['release:trust-readiness:ci']).toBe(
      'node scripts/release/check-package-availability.mjs --ci',
    );
    expect(scripts['release:availability']).toBe('pnpm release:trust-readiness');
    expect(scripts['release:rehearse']).toBe('node scripts/release/rehearse-source.mjs');
    expect(Object.values(scripts).some(script => String(script).includes('npm publish'))).toBe(
      false,
    );
    const productionAudit = text('scripts/release/audit-production.mjs');
    expect(productionAudit).toContain(
      "export const OFFICIAL_NPM_REGISTRY = 'https://registry.npmjs.org/'",
    );
    expect(productionAudit).toContain("'--prod'");
    expect(productionAudit).toContain("'--audit-level=info'");
    expect(productionAudit).not.toContain("'--audit-level=low'");
    expect(productionAudit).not.toContain("'--audit-level=moderate'");
    expect(productionAudit).not.toContain('--ignore-registry-errors');
    expect(artifactScript).toContain("resolve(repositoryRoot, '.nvmrc')");
    expect(artifactScript).toContain('process.versions.node');
    expect(artifactScript).toContain("const packageDirectories = ['tellplot']");
    expect(artifactScript).toContain("'.ai-platform/evidence/T131'");
  });

  it('normalizes npm tarball compression without changing package contents', () => {
    const result = runModuleSource(`
      import { createHash } from 'node:crypto';
      import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
      import { gzipSync, gunzipSync } from 'node:zlib';
      import { tmpdir } from 'node:os';
      import { resolve } from 'node:path';
      import { canonicalizeNpmTarball } from './scripts/release/canonical-gzip.mjs';

      const directory = mkdtempSync(resolve(tmpdir(), 'tellplot-gzip-header-'));
      try {
        const tar = manifest => {
          const payload = Buffer.from(JSON.stringify(manifest, null, 2) + '\\n');
          const archive = Buffer.alloc(512 + 512 + 1024);
          archive.write('package/package.json', 0, 'utf8');
          archive.write(payload.length.toString(8).padStart(11, '0') + '\\0', 124, 'ascii');
          payload.copy(archive, 512);
          return archive;
        };
        const firstPayload = tar({ name: 'tellplot', devDependencies: { vue: '3', react: '19' } });
        const secondPayload = tar({ devDependencies: { react: '19', vue: '3' }, name: 'tellplot' });
        const macos = gzipSync(firstPayload, { level: 1, mtime: 0 });
        const linux = gzipSync(secondPayload, { level: 9, mtime: 0 });
        macos[9] = 19;
        linux[9] = 3;
        const macosPath = resolve(directory, 'macos.tgz');
        const linuxPath = resolve(directory, 'linux.tgz');
        writeFileSync(macosPath, macos);
        writeFileSync(linuxPath, linux);

        canonicalizeNpmTarball(macosPath);
        canonicalizeNpmTarball(linuxPath);

        const normalizedMacos = readFileSync(macosPath);
        const normalizedLinux = readFileSync(linuxPath);
        const digest = value => createHash('sha256').update(value).digest('hex');
        if (normalizedMacos[9] !== 255 || normalizedLinux[9] !== 255) process.exit(1);
        if (digest(normalizedMacos) !== digest(normalizedLinux)) process.exit(1);
        if (!gunzipSync(normalizedMacos).equals(gunzipSync(normalizedLinux))) process.exit(1);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    `);

    expect(result.status, result.output).toBe(0);
    expect(text('scripts/release/package-artifact.mjs')).toContain(
      'canonicalizeNpmTarball(freshArtifactPath)',
    );
  });

  it('keeps the public release command and browser matrix release-complete', () => {
    const stableCheck = text('scripts/release/check-stable.mjs');
    const ciWorkflow = text('.github/workflows/ci.yml');
    const playwrightConfig = text('playwright.config.ts');
    const performanceSpec = text('e2e/performance.spec.ts');
    const previousBrowserRunner = text(
      'packages/editor/tests/browser-matrix/run-previous-browsers.mjs',
    );
    const frameworkMatrixRunner = text('packages/editor/tests/react-matrix/run-react-matrix.mjs');
    const processLifecycle = text('packages/editor/tests/helpers/processLifecycle.mjs');
    const releaseAudit = text('scripts/release/audit-release.mjs');
    const sourceRehearsal = text('scripts/release/rehearse-source.mjs');
    const packageTestRunner = text('scripts/release/test-packages.mjs');
    const requiredGates = [
      'security:lock',
      'security:dependencies',
      'audit:prod',
      'test:coverage',
      'release:artifact',
      'test:package',
      'test:framework-matrix',
      'test:e2e',
      'test:a11y',
      'test:performance',
      'test:browser-previous',
      'release:rehearse',
    ];

    for (const gate of requiredGates) {
      expect(stableCheck).toContain(gate);
    }
    expect(stableCheck).not.toContain('release:preflight');
    const lockGateIndexes = [...ciWorkflow.matchAll(/pnpm security:lock/gu)].map(
      match => match.index ?? -1,
    );
    const installIndexes = [...ciWorkflow.matchAll(/pnpm install --frozen-lockfile/gu)].map(
      match => match.index ?? -1,
    );
    expect(lockGateIndexes).toHaveLength(3);
    expect(installIndexes).toHaveLength(3);
    expect(
      lockGateIndexes.every((index, position) => index < (installIndexes[position] ?? 0)),
    ).toBe(true);
    expect(ciWorkflow).toContain('pnpm security:dependencies');
    expect(ciWorkflow).toContain('pnpm audit:prod');
    expect(ciWorkflow).toContain('pnpm test:framework-matrix');
    expect(ciWorkflow).not.toContain('pnpm test:react-matrix');
    expect(ciWorkflow).toContain('name: Process lifecycle (${{ matrix.os }})');
    expect(ciWorkflow).toContain('os: [ubuntu-24.04, windows-2025]');
    expect(ciWorkflow).toContain(
      'pnpm exec vitest run packages/editor/tests/package/process-lifecycle.test.ts',
    );
    expect(ciWorkflow).toContain('needs: [quality, lifecycle]');
    const workflowFiles = listFiles(resolve(root, '.github/workflows')).filter(path =>
      /\.ya?ml$/u.test(path),
    );
    const workflowSources = workflowFiles.map(path => text(path));
    const actionReferences = workflowSources
      .flatMap(source =>
        [...source.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/gmu)].map(
          match => match[1],
        ),
      )
      .filter(reference => !reference?.startsWith('./'));
    const expectedActionPins = new Map([
      ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1'],
      ['actions/setup-node', '820762786026740c76f36085b0efc47a31fe5020'],
      ['actions/upload-artifact', '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a'],
      ['pnpm/action-setup', '0ebf47130e4866e96fce0953f49152a61190b271'],
    ]);
    expect(actionReferences.length).toBeGreaterThan(0);
    expect(actionReferences.every(reference => /@[0-9a-f]{40}$/u.test(reference ?? ''))).toBe(true);
    for (const [action, commit] of expectedActionPins) {
      const references = actionReferences.filter(reference => reference?.startsWith(`${action}@`));
      expect(references.length).toBeGreaterThan(0);
      expect(new Set(references)).toEqual(new Set([`${action}@${commit}`]));
    }
    const setupNodeReferences = actionReferences.filter(reference =>
      reference?.startsWith('actions/setup-node@'),
    );
    const explicitAutoCacheDisables = workflowSources.flatMap(source =>
      [...source.matchAll(/^\s+package-manager-cache: false$/gmu)].map(match => match[0]),
    );
    expect(explicitAutoCacheDisables).toHaveLength(setupNodeReferences.length);
    expect(playwrightConfig).toContain("process.env['TELLPLOT_E2E_WORKERS'] ?? '2'");
    expect(playwrightConfig).toContain('workers: e2eWorkers');
    expect(playwrightConfig).toMatch(
      /name: 'chromium-performance',[\s\S]*?retries: 0,[\s\S]*?testMatch: performanceSpec/u,
    );
    expect(playwrightConfig).toContain('reuseExistingServer: false');
    expect(playwrightConfig).toContain('timeout: 180_000');
    expect(playwrightConfig).toContain("trace: 'off'");
    expect(playwrightConfig).toContain("video: 'off'");
    expect(performanceSpec).toContain("document.addEventListener('keydown', handleKeyDown, true)");
    expect(performanceSpec).toContain('queueMicrotask(() => requestAnimationFrame(inspect))');
    expect(performanceSpec).toContain('async function waitForStableCanvas');
    expect(performanceSpec).toContain('const targetStateMatches = (): boolean');
    expect(performanceSpec).toContain(
      "test('latency probe waits for an unfinished prior canvas animation to settle'",
    );
    expect(performanceSpec).not.toContain('metric.start');
    expect([
      ...performanceSpec.matchAll(
        /const previousSignature = await waitForStableCanvas\(canvas, signatureRegion\)/gu,
      ),
    ]).toHaveLength(2);
    expect([
      ...performanceSpec.matchAll(
        /await armFirstVisibleCanvasUpdate\([\s\S]{0,500}?expectedRevision:[\s\S]{0,500}?expectedPrefix[\s\S]{0,500}?await page\.keyboard\.press\([\s\S]{0,300}?await waitForFirstVisibleCanvasUpdate\(page\)/gu,
      ),
    ]).toHaveLength(2);
    expect(previousBrowserRunner).toContain('workers: 2');
    expect(previousBrowserRunner).toContain(
      "const retryDiagnostics = process.env.CI ? 'on-first-retry' : 'off';",
    );
    expect(previousBrowserRunner).toContain('trace: retryDiagnostics');
    expect(previousBrowserRunner).toContain('video: retryDiagnostics');
    expect(previousBrowserRunner).not.toContain("trace: 'retain-on-failure'");
    expect(previousBrowserRunner).not.toContain("video: 'retain-on-failure'");
    expect(previousBrowserRunner).toContain("createProcessLifecycle('previous-browser-matrix')");
    expect(previousBrowserRunner).toContain('await lifecycle.stopActiveProcesses()');
    expect(previousBrowserRunner).toContain('cleanupPromise ??=');
    expect(previousBrowserRunner).toContain('lifecycle.finishCleanup()');
    expect(frameworkMatrixRunner).toContain("createProcessLifecycle('framework-matrix')");
    expect(frameworkMatrixRunner).toContain('await lifecycle.stopActiveProcesses()');
    expect(frameworkMatrixRunner).toContain('cleanupPromise ??=');
    expect(frameworkMatrixRunner).toContain('lifecycle.finishCleanup()');
    expect(processLifecycle).toContain("process.once('SIGINT', handleSigint)");
    expect(processLifecycle).toContain("process.once('SIGTERM', handleSigterm)");
    expect(processLifecycle).toContain('process.kill(process.pid, signal)');
    expect(processLifecycle).toContain('Promise.allSettled(');
    expect(frameworkMatrixRunner).toContain("join(directory, 'vite.config.mjs')");
    expect(frameworkMatrixRunner).toContain("name: 'g2-runtime'");
    expect(frameworkMatrixRunner).toContain('codeSplitting');
    expect(frameworkMatrixRunner).toContain("framework: 'Vue'");
    expect(frameworkMatrixRunner).toContain("const ROLLDOWN_VERSION = '1.1.5'");
    expect(frameworkMatrixRunner).toContain("const NAPI_WASM_RUNTIME_VERSION = '1.1.6'");
    expect(frameworkMatrixRunner).toContain("'--strict-peer-dependencies'");
    expect(frameworkMatrixRunner).toContain(
      "'@napi-rs/wasm-runtime': '${NAPI_WASM_RUNTIME_VERSION}'",
    );
    expect(frameworkMatrixRunner).toContain("rolldown: '${ROLLDOWN_VERSION}'");
    expect(releaseAudit).toContain("resolve(repositoryRoot, '.ai-platform')");
    expect(sourceRehearsal).toContain("'.copyright-application'");
    expect(sourceRehearsal).toContain("'tmp'");
    expect(sourceRehearsal.indexOf("['pnpm', ['security:lock']]")).toBeLessThan(
      sourceRehearsal.indexOf("['pnpm', ['install', '--frozen-lockfile']]"),
    );
    expect(packageTestRunner).toContain('NPM_CONFIG_CACHE');
    expect(packageTestRunner).toContain("const packageNames = ['tellplot']");
  });

  it('keeps public npm staging manual, approved, provenance-enabled, minimal, and ordered', () => {
    const workflow = text('.github/workflows/publish-npm.yml');
    const preflight = text('scripts/release/preflight-public.mjs');
    const verifyJobIndex = workflow.indexOf('\n  verify:');
    const stageJobIndex = workflow.indexOf('\n  stage:');
    const verifyJob = workflow.slice(verifyJobIndex, stageJobIndex);
    const stageJob = workflow.slice(stageJobIndex);

    expect(workflow).toMatch(/^on:\n {2}workflow_dispatch:/mu);
    expect(workflow).not.toMatch(/^\s{2}(?:push|pull_request|release):/mu);
    expect(workflow).toContain('environment: npm-production');
    expect(workflow).toContain('needs: verify');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).not.toMatch(/^\s+cache:/mu);
    expect(workflow).toContain('npm@11.18.0');
    expect(workflow).toContain('stage 1.0.0 stage-only-trusted-publishers-verified');
    expect(workflow).toContain('pnpm release:preflight:ci');
    expect(workflow).toContain('pnpm release:trust-readiness:ci');
    expect(workflow).not.toContain(' -- --ci');
    expect(workflow).toContain('pnpm release:check');
    expect(workflow).toContain('--provenance');
    expect(workflow).toContain('--registry=https://registry.npmjs.org/');
    expect(workflow).not.toContain('NODE_AUTH_TOKEN');
    expect(verifyJobIndex).toBeGreaterThan(0);
    expect(stageJobIndex).toBeGreaterThan(verifyJobIndex);
    expect(verifyJob).not.toContain('id-token: write');
    expect(verifyJob).toContain('pnpm release:artifact');
    expect(verifyJob).toContain(`test "$(npm --version)" = '11.18.0'`);
    expect(stageJob).toContain('id-token: write');
    expect(stageJob).toContain('ref: ${{ github.sha }}');
    expect(stageJob).toContain('persist-credentials: false');
    expect([...workflow.matchAll(/persist-credentials: false/gu)]).toHaveLength(2);
    expect(stageJob).toContain('sparse-checkout: .ai-platform/evidence/T131/artifacts');
    expect(stageJob).toContain('node-version: 22.20.0');
    expect(stageJob).toContain('npm_config="$RUNNER_TEMP/tellplot-stage.npmrc"');
    expect(stageJob).toContain('NPM_CONFIG_USERCONFIG=%s');
    expect(stageJob).toContain('"$GITHUB_ENV"');
    expect(stageJob).toContain('npm install --global npm@11.18.0');
    expect(stageJob).toContain(`test "$(npm --version)" = '11.18.0'`);
    expect([...workflow.matchAll(/test "\$\(npm --version\)" = '11\.18\.0'/gu)]).toHaveLength(2);
    expect(stageJob).toContain('--ignore-scripts');
    expect(stageJob).not.toMatch(/\bpnpm\b/u);
    expect(stageJob).not.toContain('node scripts/');
    expect(stageJob).not.toMatch(/\b(?:release|security):/u);
    expect(stageJob).not.toContain('.mjs');
    expect(stageJob).not.toMatch(/\bnpm (?:run|exec|ci|install (?!--global npm@11\.18\.0))/u);
    expect(stageJob).toContain('git ls-remote --exit-code --refs');
    expect(stageJob).toContain('GIT_CONFIG_GLOBAL=/dev/null');
    expect(stageJob).toContain('GIT_CONFIG_NOSYSTEM=1');
    expect(stageJob).toContain('git -C "$RUNNER_TEMP" "$@"');
    expect([...stageJob.matchAll(/remote_git ls-remote/gu)]).toHaveLength(2);
    expect(stageJob).not.toMatch(/^\s+git ls-remote/gmu);
    expect(stageJob).toContain('refs/heads/main');
    expect(stageJob).toContain('refs/tags/v1.0.0^{}');
    expect(stageJob).toContain('test "$(git rev-parse --verify HEAD)" = "$GITHUB_SHA"');
    expect(stageJob).toContain('test "$remote_main_commit" = "$GITHUB_SHA"');
    expect(stageJob).toContain('test -n "$remote_tag_object"');
    expect(stageJob).toContain('test -n "$remote_tag_commit"');
    expect(stageJob).toContain('test "$remote_tag_object" != "$remote_tag_commit"');
    expect(stageJob).toContain('test "$remote_tag_commit" = "$GITHUB_SHA"');
    expect(stageJob).not.toContain('remote_tag_commit="$remote_tag_object"');
    expect(stageJob).toContain('https://registry.npmjs.org/tellplot');
    expect(stageJob).toContain('https://registry.npmjs.org/tellplot/1.0.0');
    expect(preflight).toContain(
      "gitCommand(['status', '--porcelain=v1', '--untracked-files=all'])",
    );
    expect(preflight).toContain("commandRunner('npm', ['config', 'get', 'registry'])");
    expect(preflight).toContain("gitCommand(['cat-file', '-t', `refs/tags/${tag}`])");
    expect(preflight).toContain("'refs/heads/main'");
    expect(preflight).toContain("'.ai-platform/evidence/T131/tarball-manifest.json'");
    expect(preflight).toContain(
      "const CANONICAL_REMOTE_QUERY_URL = 'https://github.com/iiwish/tellplot.git';",
    );
    expect(preflight).toContain("GIT_CONFIG_NOSYSTEM: '1'");
    expect(preflight).not.toMatch(/'ls-remote'[\s\S]{0,160}'origin'/u);

    expect(stageJob).toContain('tellplot-1.0.0.tgz');
    expect(stageJob).not.toMatch(/tellplot-(?:core|editor|react|vue)-1\.0\.0\.tgz/u);
    const stageCommands = [
      ...stageJob.matchAll(
        /^\s+npm stage publish [^\n]+\n\s+--ignore-scripts [^\n]+\n\s+--registry=[^\n]+$/gmu,
      ),
    ].map(match => match[0]);
    expect(stageCommands).toHaveLength(1);
    for (const command of stageCommands) {
      expect(command).toContain('--ignore-scripts');
      expect(command).toContain('--tag=latest');
      expect(command).toContain('--provenance');
      expect(command).toContain('--registry=https://registry.npmjs.org/');
    }
    expect([...workflow.matchAll(/\bnpm publish\b/gu)]).toHaveLength(0);
    expect([...workflow.matchAll(/pnpm release:preflight:ci/gu)]).toHaveLength(1);
    expect([...workflow.matchAll(/pnpm release:trust-readiness:ci/gu)]).toHaveLength(1);
    expect([...workflow.matchAll(/id-token: write/gu)]).toHaveLength(1);
    expect(verifyJob.indexOf('pnpm security:lock')).toBeLessThan(
      verifyJob.indexOf('pnpm install --frozen-lockfile'),
    );
    expect(verifyJob.indexOf('pnpm install --frozen-lockfile')).toBeLessThan(
      verifyJob.indexOf('pnpm release:check'),
    );
    expect(verifyJob.indexOf('pnpm release:check')).toBeLessThan(
      verifyJob.indexOf('pnpm release:artifact'),
    );

    expect(stageJob).toMatch(
      /^\s+[0-9a-f]{64}\s+\.ai-platform\/evidence\/T131\/artifacts\/tellplot-1\.0\.0\.tgz$/mu,
    );
  });

  it('keeps the canonical post-release evidence immutable and status-aligned', () => {
    const report = text('.ai-platform/docs/release-report.md');
    const workflow = text('.github/workflows/publish-npm.yml');
    const tasks = text('.ai-platform/docs/tasks.md');
    const roadmap = text('docs/roadmap.md');
    const agentGuide = text('AGENTS.md');

    expect(tasks).toContain('G007');
    expect(tasks).toContain('T131');
    expect(roadmap).toContain('T131');
    expect(agentGuide).toContain('G007 / T131');
    expect(tasks).toContain('| G007 - 单包分发与公开发布 | Accepted |');
    expect(roadmap).toContain('- Status: Accepted');
    expect(agentGuide).toContain('`tellplot@1.0.0` 已发布到 npm 和 GitHub');
    expect(report).toContain('- Status: Released');
    expect(report).toContain('a3e07c9ac9b20183092729cde234322db98f9835');
    expect(report).toContain('d86cc8dff46f64c7e487153121b3f503e76ba5dc');
    expect(report).toContain('Tag protection ruleset | `20169540`，active');
    expect(report).toContain('Workflow run | `30701441776`');
    expect(report).toContain('Environment deployment | `5705046643`');
    expect(report).toContain('npm-production');
    expect(report).toContain('187969a4-f39a-40e0-b602-8bccb975f9b2');
    expect(report).toContain(
      'sha512-+GHSo5QRkYyKTmFpn5Qbq6h4BrVizS31g0nn+QjL+5kOA8RBdC9w6nua2rENjx8mUocEtfr1yQkdEgHdlRFbqw==',
    );
    expect(report).toContain('`latest` 指向 `tellplot@1.0.0`');
    expect(report).toContain('SLSA provenance v1');
    expect(report).toContain('refs/tags/v1.0.0');
    expect(report).toContain('React 18.3.1、React 19.2.7、Vue 3.5.27');
    expect(report).toContain('四个 scoped bootstrap package 已全部 unpublished');
    expect(report).toContain('Registry API 与 fresh npm cache 均返回 404');
    expect(report).not.toContain('仅保留历史占位');
    expect(report).toContain('.ai-platform/evidence/T131/tarball-manifest.json');
    expect(report).toContain('没有已知发布阻塞');
    expect(report).not.toContain('TELLPLOT_FINAL_COMMIT_SHA');
    expect(report).not.toContain('- Status: Not_Released');
    const workflowSha = workflow.match(
      /^\s+([0-9a-f]{64})\s+\.ai-platform\/evidence\/T131\/artifacts\/tellplot-1\.0\.0\.tgz$/mu,
    )?.[1];
    expect(workflowSha).toMatch(/^[0-9a-f]{64}$/u);
    expect(report).toContain(String(workflowSha));
  });

  it('separates clean public-release source checks from the dirty-capable local RC gate', () => {
    const result = runModuleSource(`
      import assert from 'node:assert/strict';
      import {
        createRemoteQueryEnvironment,
        validatePublicReleaseState,
      } from './scripts/release/preflight-public.mjs';

      const head = 'a'.repeat(40);
      const packageVersions = [['tellplot', '1.0.0']];
      const artifactSha = 'c'.repeat(64);
      const filenames = ['tellplot-1.0.0.tgz'];
      const packageManifests = packageVersions.map(([name, version]) => ({
        name,
        version,
        publishConfig: {
          access: 'public',
          registry: 'https://registry.npmjs.org/',
        },
      }));
      const artifactManifest = {
        version: '1.0.0',
        packages: packageVersions.map(([name, version], index) => ({
          name,
          version,
          filename: filenames[index],
          sizeBytes: 100 + index,
          sha256: artifactSha,
        })),
      };
      const artifactFiles = filenames.map((filename, index) => ({
        filename,
        sizeBytes: 100 + index,
        sha256: artifactSha,
      }));
      const remoteEnvironment = createRemoteQueryEnvironment({
        PATH: '/test/bin',
        HTTPS_PROXY: 'https://proxy.test.invalid',
        NO_PROXY: 'registry.npmjs.org',
        HOME: '/hostile/home',
        GIT_CONFIG_GLOBAL: '/hostile/global.gitconfig',
        GIT_CONFIG_SYSTEM: '/hostile/system.gitconfig',
        GIT_CONFIG_COUNT: '1',
      });
      assert.equal(remoteEnvironment.PATH, '/test/bin');
      assert.equal(remoteEnvironment.HTTPS_PROXY, 'https://proxy.test.invalid');
      assert.equal(remoteEnvironment.NO_PROXY, 'registry.npmjs.org');
      assert.equal(remoteEnvironment.GIT_CONFIG_NOSYSTEM, '1');
      assert.notEqual(remoteEnvironment.GIT_CONFIG_GLOBAL, '/hostile/global.gitconfig');
      assert.equal(remoteEnvironment.HOME, undefined);
      assert.equal(remoteEnvironment.GIT_CONFIG_SYSTEM, undefined);
      assert.equal(remoteEnvironment.GIT_CONFIG_COUNT, undefined);
      const local = {
        mode: 'local',
        packageVersions,
        packageManifests,
        artifactManifest,
        artifactFiles,
        status: '',
        head,
        tag: 'v1.0.0',
        tagObject: 'd'.repeat(40),
        tagObjectType: 'tag',
        tagCommit: head,
        remoteUrl: 'https://github.com/iiwish/tellplot.git',
        nodeVersion: '22.20.0',
        npmVersion: '11.18.0',
        npmRegistry: 'https://registry.npmjs.org',
        branch: 'main',
        upstream: 'origin/main',
        upstreamCommit: head,
        remoteMainCommit: head,
        remoteTagObject: 'd'.repeat(40),
        remoteTagCommit: head,
      };
      assert.deepEqual(validatePublicReleaseState(local), []);
      assert.ok(
        validatePublicReleaseState({ ...local, tagObjectType: 'commit' }).some(finding =>
          finding.includes('annotated tag object'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...local, status: '?? local-only.txt' }).some(finding =>
          finding.includes('worktree'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...local, upstreamCommit: 'b'.repeat(40) }).some(finding =>
          finding.includes('upstream'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...local, nodeVersion: undefined }).some(finding =>
          finding.includes('Node 22.14.0'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...local, npmVersion: '11.14.9' }).some(finding =>
          finding.includes('npm 11.15.0'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({
          ...local,
          npmRegistry: 'https://registry.npmmirror.com/',
        }).some(finding => finding.includes('npm config registry')),
      );
      assert.ok(
        validatePublicReleaseState({ ...local, branch: 'release' }).some(finding =>
          finding.includes('main'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...local, remoteMainCommit: 'b'.repeat(40) }).some(finding =>
          finding.includes('origin/main'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({
          ...local,
          packageManifests: packageManifests.map((manifest, index) =>
            index === 0
              ? {
                  ...manifest,
                  publishConfig: {
                    access: 'public',
                    registry: 'https://registry.npmmirror.com/',
                  },
                }
              : manifest,
          ),
        }).some(finding => finding.includes('official npm registry')),
      );
      assert.ok(
        validatePublicReleaseState({ ...local, artifactFiles: artifactFiles.slice(1) }).some(
          finding => finding.includes('release artifact'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...local, artifactManifest: undefined }).some(finding =>
          finding.includes('artifact manifest'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({
          ...local,
          artifactFiles: artifactFiles.map((artifact, index) =>
            index === 0 ? { ...artifact, sha256: 'd'.repeat(64) } : artifact,
          ),
        }).some(finding => finding.includes('integrity')),
      );

      const ci = {
        mode: 'ci',
        packageVersions,
        packageManifests,
        artifactManifest,
        artifactFiles,
        status: '',
        head,
        tag: 'v1.0.0',
        tagObject: 'd'.repeat(40),
        tagObjectType: 'tag',
        tagCommit: head,
        remoteUrl: 'git@github.com:iiwish/tellplot.git',
        nodeVersion: '22.20.0',
        npmVersion: '11.18.0',
        npmRegistry: 'https://registry.npmjs.org/',
        githubActions: 'true',
        runnerEnvironment: 'github-hosted',
        eventName: 'workflow_dispatch',
        refType: 'tag',
        refName: 'v1.0.0',
        sha: head,
        repository: 'iiwish/tellplot',
        visibility: 'public',
        remoteMainCommit: head,
        remoteTagObject: 'd'.repeat(40),
        remoteTagCommit: head,
        workflowRef:
          'iiwish/tellplot/.github/workflows/publish-npm.yml@refs/tags/v1.0.0',
        confirmation: 'stage 1.0.0 stage-only-trusted-publishers-verified',
      };
      assert.deepEqual(validatePublicReleaseState(ci), []);
      assert.ok(
        validatePublicReleaseState({ ...ci, remoteTagObject: undefined }).some(finding =>
          finding.includes('remote release tag must expose an annotated object'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...ci, remoteTagCommit: 'b'.repeat(40) }).some(finding =>
          finding.includes('remote release tag'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...ci, eventName: 'push' }).some(finding =>
          finding.includes('workflow_dispatch'),
        ),
      );
      assert.ok(
        validatePublicReleaseState({ ...ci, visibility: 'private' }).some(finding =>
          finding.includes('public repository'),
        ),
      );
    `);

    expect(result, result.output).toMatchObject({ status: 0 });
  });

  it('collects an annotated remote tag and rejects a real lightweight tag hermetically', () => {
    const result = runModuleSource(`
      import assert from 'node:assert/strict';
      import { createHash } from 'node:crypto';
      import { spawnSync } from 'node:child_process';
      import {
        mkdirSync,
        mkdtempSync,
        rmSync,
        statSync,
        writeFileSync,
      } from 'node:fs';
      import { tmpdir } from 'node:os';
      import { resolve } from 'node:path';
      import { pathToFileURL } from 'node:url';
      import {
        collectPublicReleaseState,
        validatePublicReleaseState,
      } from './scripts/release/preflight-public.mjs';

      const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-preflight-git-'));
      const remote = resolve(temporaryRoot, 'origin.git');
      const repository = resolve(temporaryRoot, 'source');
      const hostileConfig = resolve(temporaryRoot, 'hostile.gitconfig');
      const missingRemote = resolve(temporaryRoot, 'missing-origin.git');
      const canonicalRemote = 'https://github.com/iiwish/tellplot.git';
      const remoteQueryUrl = pathToFileURL(remote).href;
      const packages = ['tellplot'];

      function git(cwd, args) {
        const command = spawnSync('git', args, { cwd, encoding: 'utf8' });
        assert.equal(command.status, 0, command.stderr);
        return command.stdout.trim();
      }

      try {
        git(temporaryRoot, ['init', '--bare', remote]);
        mkdirSync(repository);
        git(repository, ['init']);
        git(repository, ['checkout', '-b', 'main']);
        git(repository, ['config', 'user.name', 'TellPlot Test']);
        git(repository, ['config', 'user.email', 'test@tellplot.invalid']);

        const artifactsRoot = resolve(
          repository,
          '.ai-platform/evidence/T131/artifacts',
        );
        mkdirSync(artifactsRoot, { recursive: true });
        const artifactEntries = packages.map(directory => {
          const packageRoot = resolve(repository, 'packages', directory);
          mkdirSync(packageRoot, { recursive: true });
          writeFileSync(
            resolve(packageRoot, 'package.json'),
            JSON.stringify({
              name: directory,
              version: '1.0.0',
              publishConfig: {
                access: 'public',
                registry: 'https://registry.npmjs.org/',
              },
            }),
          );
          const filename = 'tellplot-1.0.0.tgz';
          const artifactPath = resolve(artifactsRoot, filename);
          writeFileSync(artifactPath, \`artifact:\${directory}\`);
          return {
            name: directory,
            version: '1.0.0',
            filename,
            sizeBytes: statSync(artifactPath).size,
            sha256: createHash('sha256')
              .update(\`artifact:\${directory}\`)
              .digest('hex'),
          };
        });
        writeFileSync(
          resolve(repository, '.ai-platform/evidence/T131/tarball-manifest.json'),
          JSON.stringify({ version: '1.0.0', packages: artifactEntries }),
        );

        git(repository, ['add', '.']);
        git(repository, ['commit', '-m', 'test: clean release source']);
        git(repository, ['tag', '-a', 'v1.0.0', '-m', 'v1.0.0']);
        git(repository, ['remote', 'add', 'origin', remoteQueryUrl]);
        git(repository, ['push', '--set-upstream', 'origin', 'main']);
        git(repository, ['push', 'origin', 'v1.0.0']);
        git(repository, ['remote', 'set-url', 'origin', canonicalRemote]);

        writeFileSync(
          hostileConfig,
          [
            \`[url "\${pathToFileURL(missingRemote).href}"]\`,
            \`  insteadOf = \${remoteQueryUrl}\`,
          ].join('\\n'),
        );
        const hostileEnvironment = {
          ...process.env,
          GIT_CONFIG_GLOBAL: hostileConfig,
          GIT_CONFIG_NOSYSTEM: '0',
        };
        const hostileProbe = spawnSync(
          'git',
          ['ls-remote', '--exit-code', '--refs', remoteQueryUrl, 'refs/heads/main'],
          { cwd: repository, encoding: 'utf8', env: hostileEnvironment },
        );
        assert.notEqual(hostileProbe.status, 0);

        const state = collectPublicReleaseState('local', {
          repositoryRoot: repository,
          npmVersion: '11.18.0',
          npmRegistry: 'https://registry.npmjs.org/',
          remoteQueryUrl,
          env: hostileEnvironment,
        });
        assert.equal(state.status, '');
        assert.equal(state.branch, 'main');
        assert.equal(state.upstream, 'origin/main');
        assert.equal(state.remoteMainCommit, state.head);
        assert.equal(state.tagObjectType, 'tag');
        assert.notEqual(state.tagObject, state.head);
        assert.equal(state.remoteTagObject, state.tagObject);
        assert.equal(state.remoteTagCommit, state.head);
        assert.deepEqual(validatePublicReleaseState(state), []);

        const ciState = collectPublicReleaseState('ci', {
          repositoryRoot: repository,
          npmVersion: '11.18.0',
          npmRegistry: 'https://registry.npmjs.org/',
          remoteQueryUrl,
          env: {
            ...hostileEnvironment,
            GITHUB_ACTIONS: 'true',
            RUNNER_ENVIRONMENT: 'github-hosted',
            GITHUB_EVENT_NAME: 'workflow_dispatch',
            GITHUB_REF_TYPE: 'tag',
            GITHUB_REF_NAME: 'v1.0.0',
            GITHUB_SHA: state.head,
            GITHUB_REPOSITORY: 'iiwish/tellplot',
            GITHUB_WORKFLOW_REF:
              'iiwish/tellplot/.github/workflows/publish-npm.yml@refs/tags/v1.0.0',
            TELLPLOT_REPOSITORY_VISIBILITY: 'public',
            TELLPLOT_RELEASE_CONFIRMATION:
              'stage 1.0.0 stage-only-trusted-publishers-verified',
          },
        });
        assert.equal(ciState.tagObjectType, 'tag');
        assert.equal(ciState.remoteTagObject, ciState.tagObject);
        assert.equal(ciState.remoteTagCommit, ciState.head);
        assert.deepEqual(validatePublicReleaseState(ciState), []);

        git(repository, ['tag', '--delete', 'v1.0.0']);
        git(repository, ['tag', 'v1.0.0']);
        git(repository, ['push', '--force', remoteQueryUrl, 'refs/tags/v1.0.0']);
        const lightweightState = collectPublicReleaseState('local', {
          repositoryRoot: repository,
          npmVersion: '11.18.0',
          npmRegistry: 'https://registry.npmjs.org/',
          remoteQueryUrl,
          env: hostileEnvironment,
        });
        assert.equal(lightweightState.tagObjectType, 'commit');
        assert.equal(lightweightState.remoteTagObject, lightweightState.head);
        assert.equal(lightweightState.remoteTagCommit, undefined);
        assert.ok(
          validatePublicReleaseState(lightweightState).some(finding =>
            finding.includes('annotated'),
          ),
        );
      } finally {
        rmSync(temporaryRoot, { force: true, recursive: true });
      }
    `);

    expect(result, result.output).toMatchObject({ status: 0 });
  });

  it('fails package availability atomically before the first npm stage publish', () => {
    const result = runModuleSource(`
      import assert from 'node:assert/strict';
      import {
        packageRootUrl,
        packageVersionUrl,
        validateTrustReadiness,
      } from './scripts/release/check-package-availability.mjs';

      const packages = [{ name: 'tellplot', version: '1.0.0' }];
      const ready = packages.map(({ name, version }) => ({
        name,
        version,
        rootStatus: 'exists',
        versionStatus: 'available',
      }));
      const confirmation = 'stage 1.0.0 stage-only-trusted-publishers-verified';
      assert.deepEqual(validateTrustReadiness(packages, ready, confirmation), []);
      assert.equal(
        packageRootUrl('tellplot'),
        'https://registry.npmjs.org/tellplot',
      );
      assert.equal(
        packageVersionUrl('tellplot', '1.0.0'),
        'https://registry.npmjs.org/tellplot/1.0.0',
      );
      const bootstrapFindings = validateTrustReadiness(
        packages,
        [{ ...ready[0], rootStatus: 'bootstrap-required' }],
        confirmation,
      );
      assert.ok(bootstrapFindings.some(finding => finding.includes('bootstrap required')));
      assert.ok(bootstrapFindings.some(finding => finding.includes('allow-stage-publish enabled')));
      assert.ok(bootstrapFindings.some(finding => finding.includes('allow-publish disabled')));
      assert.ok(
        validateTrustReadiness(
          packages,
          [{ ...ready[0], versionStatus: 'exists' }],
          confirmation,
        ).some(finding => finding.includes('already exists')),
      );
      assert.ok(
        validateTrustReadiness(
          packages,
          [{ ...ready[0], rootStatus: 'query-failed' }],
          confirmation,
        ).some(finding => finding.includes('package root query failed')),
      );
      assert.ok(
        validateTrustReadiness(packages, ready, 'stage 1.0.0').some(finding =>
          finding.includes('trusted publishers'),
        ),
      );
      assert.ok(
        validateTrustReadiness(packages, [], confirmation).some(finding =>
          finding.includes('tellplot@1.0.0'),
        ),
      );
    `);

    expect(result, result.output).toMatchObject({ status: 0 });
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

  it('documents copyable host installs and the exact state lifecycle contract', () => {
    const readme = text('README.md');
    const gettingStarted = text('docs/getting-started.md');
    const api = text('docs/api.md');
    const errors = text('docs/errors.md');
    const packageReadme = text('packages/tellplot/README.md');
    const internalReadmes = ['core', 'editor', 'react', 'vue'].map(directory =>
      text(`packages/${directory}/README.md`),
    );

    expect(readme).toContain('## 快速开始');
    expect(packageReadme).toContain('pnpm add tellplot');
    for (const internalReadme of internalReadmes) {
      expect(internalReadme).toContain('消费者应安装 `tellplot`');
      expect(internalReadme).not.toContain('pnpm add @tellplot/');
    }
    expect(gettingStarted).toContain('受控模式不会自行提交候选视图');
    expect(api).toContain('`dispatch(command): CommandResult | null`');
    expect(api).toContain('`getView(): ViewSpec`');
    expect(errors).toContain('销毁后的精确行为');
  });

  it('passes the executable architecture and public release audits', () => {
    const lock = runScript('scripts/release/audit-dependencies.mjs', ['--lock-only']);
    const dependencies = runScript('scripts/release/audit-dependencies.mjs');
    const architecture = runScript('scripts/release/check-architecture.mjs');
    const release = runScript('scripts/release/audit-release.mjs');

    expect(lock, lock.output).toMatchObject({ status: 0 });
    expect(lock.output).toContain('"scope": "lockfile"');
    expect(dependencies, dependencies.output).toMatchObject({ status: 0 });
    expect(architecture, architecture.output).toMatchObject({ status: 0 });
    expect(release, release.output).toMatchObject({ status: 0 });
  });

  it('rejects unreviewed AntV versions and install-time compromise indicators', () => {
    const policy = runModuleSource(`
      import assert from 'node:assert/strict';
      import {
        validateAntvLock,
        validateInstalledAntvManifest,
      } from './scripts/release/audit-dependencies.mjs';

      const integrity = 'sha512-YWJjZA==';
      const trusted = { '@antv/g2': { '5.4.8': integrity } };
      assert.deepEqual(
        validateAntvLock(
          [
            "lockfileVersion: '9.0'",
            '',
            'packages:',
            '',
            "  '@antv/g2@5.4.8':",
            \`    resolution: {integrity: \${integrity}}\`,
            '',
            'snapshots:',
          ].join('\\n'),
          trusted,
        ),
        [],
      );
      const lockFindings = validateAntvLock(
        [
          "lockfileVersion: '9.0'",
          '',
          'packages:',
          '',
          "  '@antv/g2@5.5.8':",
          '    resolution: {tarball: https://example.invalid/g2.tgz}',
          '',
          "  '@antv/setup@1.0.0':",
          '    resolution: {}',
          '',
          'snapshots:',
        ].join('\\n'),
        trusted,
      );
      assert.ok(lockFindings.some(finding => finding.includes('@antv/g2@5.5.8')));
      assert.ok(lockFindings.some(finding => finding.includes('@antv/setup')));

      for (const resolution of [
        '    resolution: {}',
        '    resolution: {integrity: sha512-ZGlmZmVyZW50}',
        '    resolution: {tarball: https://example.invalid/g2.tgz}',
        \`    resolution: {integrity: \${integrity}, tarball: https://example.invalid/g2.tgz}\`,
      ]) {
        const findings = validateAntvLock(
          [
            "lockfileVersion: '9.0'",
            '',
            'packages:',
            '',
            "  '@antv/g2@5.4.8':",
            resolution,
            '',
            'snapshots:',
          ].join('\\n'),
          trusted,
        );
        assert.ok(findings.some(finding => finding.includes('@antv/g2@5.4.8')));
      }

      const hiddenEntryFindings = validateAntvLock(
        [
          "lockfileVersion: '9.0'",
          '',
          'packages:',
          '',
          "  '@antv/g2@5.4.8':",
          \`    resolution: {integrity: \${integrity}}\`,
          '# comments do not terminate a YAML mapping',
          "  '@antv/g2@5.4.8':",
          '    resolution: {tarball: https://example.invalid/g2.tgz}',
          '',
          'snapshots:',
        ].join('\\n'),
        trusted,
      );
      assert.ok(hiddenEntryFindings.some(finding => finding.includes('duplicate')));

      assert.deepEqual(
        validateInstalledAntvManifest(
          { name: '@antv/g2', version: '5.4.8', scripts: {} },
          'node_modules/@antv/g2/package.json',
          trusted,
        ),
        [],
      );
      assert.ok(
        validateInstalledAntvManifest(
          {
            name: '@antv/g2',
            version: '5.4.8',
            scripts: { postinstall: 'node unexpected.js' },
          },
          'node_modules/@antv/g2/package.json',
          trusted,
        ).some(finding => finding.includes('(postinstall)')),
      );
      const manifestFindings = validateInstalledAntvManifest(
        {
          name: '@antv/g2',
          version: '5.5.8',
          scripts: { preinstall: 'bun run index.js' },
          optionalDependencies: { '@antv/setup': 'github:antvis/G2#malicious' },
        },
        'node_modules/@antv/g2/package.json',
        trusted,
      );
      assert.ok(manifestFindings.length >= 4);
    `);

    expect(policy, policy.output).toMatchObject({ status: 0 });
  });

  it('matches forbidden framework packages and their subpath imports', () => {
    const policy = runModuleSource(`
      import assert from 'node:assert/strict';
      import {
        isCoreForbidden,
        isFrameworkNeutralForbidden,
        matchesPackageSpecifier,
      } from './scripts/release/architecture-policy.mjs';
      assert.equal(matchesPackageSpecifier('react', 'react'), true);
      assert.equal(matchesPackageSpecifier('react/jsx-runtime', 'react'), true);
      assert.equal(matchesPackageSpecifier('react-error-boundary', 'react'), false);
      assert.equal(isCoreForbidden('react/jsx-runtime'), true);
      assert.equal(isCoreForbidden('@antv/g2/extension'), true);
      assert.equal(isFrameworkNeutralForbidden('@dnd-kit/core'), true);
      assert.equal(isFrameworkNeutralForbidden('lucide-react/icons'), true);
    `);

    expect(policy, policy.output).toMatchObject({ status: 0 });
  });

  it('uses structural package and public-surface allowlists', () => {
    const policy = runModuleSource(`
      import assert from 'node:assert/strict';
      import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
      import { tmpdir } from 'node:os';
      import { resolve } from 'node:path';
      import {
        collectPublicSurface,
        packageContracts,
        validatePackageContract,
      } from './scripts/release/package-contracts.mjs';

      const directory = mkdtempSync(resolve(tmpdir(), 'tellplot-public-surface-'));
      try {
        writeFileSync(
          resolve(directory, 'values.ts'),
          [
            'export interface Shape { readonly id: string }',
            'export type Alias = string;',
            'export const value = 1;',
            'export function run(): void {}',
          ].join('\\n'),
        );
        writeFileSync(
          resolve(directory, 'index.ts'),
          [
            "export * from './values';",
            "export type { Shape as PublicShape } from './values';",
          ].join('\\n'),
        );

        assert.deepEqual(collectPublicSurface(resolve(directory, 'index.ts')), {
          runtime: ['run', 'value'],
          types: ['Alias', 'PublicShape', 'Shape'],
        });
        assert.equal(packageContracts.length, 5);

        const contract = {
          name: '@fixture/package',
          dependencies: { '@fixture/runtime': '1.0.0' },
          devDependencies: {},
          peerDependencies: {},
          runtimeExports: ['run'],
          typeExports: ['Shape'],
        };
        assert.deepEqual(
          validatePackageContract(
            {
              dependencies: { '@fixture/runtime': '1.0.0' },
              devDependencies: {},
              peerDependencies: {},
            },
            { runtime: ['run'], types: ['Shape'] },
            contract,
          ),
          [],
        );
        const findings = validatePackageContract(
          {
            dependencies: {
              '@fixture/runtime': '1.0.0',
              '@fixture/unapproved': '1.0.0',
            },
            devDependencies: {},
            peerDependencies: {},
          },
          { runtime: ['run', 'surprise'], types: ['Shape', 'PrivateType'] },
          contract,
        );
        assert.equal(
          findings.some(
            finding =>
              finding.includes('dependencies') && finding.includes('@fixture/unapproved'),
          ),
          true,
        );
        assert.equal(
          findings.some(
            finding => finding.includes('runtime exports') && finding.includes('surprise'),
          ),
          true,
        );
        assert.equal(
          findings.some(
            finding => finding.includes('type exports') && finding.includes('PrivateType'),
          ),
          true,
        );
      } finally {
        rmSync(directory, { force: true, recursive: true });
      }
    `);

    expect(policy, policy.output).toMatchObject({ status: 0 });
  });
});
