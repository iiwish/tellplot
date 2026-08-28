import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());
const scripts = [
  'scripts/release/audit-candidate.mjs',
  'scripts/release/package-candidate-artifact.mjs',
  'scripts/release/rehearse-candidate-source.mjs',
] as const;
const invalidArguments = [
  [],
  ['--candidate-version', '2.0.0'],
  ['--evidence-task', 'T140'],
  ['--candidate-version', '1.0.0', '--evidence-task', 'T140'],
  ['--candidate-version', '2.0.0', '--evidence-task', 'T139'],
  ['--candidate-version', '2.0.0', '--candidate-version', '2.0.0', '--evidence-task', 'T140'],
  ['--candidate-version', '2.0.0', '--evidence-task', 'T140', '--evidence-task', 'T140'],
  ['--candidate-version=2.0.0', '--evidence-task', 'T140'],
  ['--candidate-version', '2.0.0', '--evidence-task', '../T140'],
  ['--candidate-version', '2.0.0', '--evidence-task', 'T140/T141'],
  ['--candidate-version', '2.0.0', '--evidence-task', 'T140%2f..%2fT131'],
  ['--candidate-version', '2.0.0', '--evidence-task', '.'],
  ['--candidate-version', '2.0.0', '--evidence-task', resolve(root, '.ai-platform/evidence/T140')],
] as const;

function run(
  script: (typeof scripts)[number],
  args: readonly string[],
  env: Readonly<Record<string, string>> = {},
) {
  const result = spawnSync(process.execPath, [resolve(root, script), ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('local 2.0 candidate tooling', () => {
  it('provides three isolated candidate-only commands', () => {
    for (const script of scripts) {
      expect(existsSync(resolve(root, script)), script).toBe(true);
    }
  });

  it('keeps host-local video outputs out of isolated candidate source', () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-candidate-generated-video-'));
    const fakeRoot = resolve(realpathSync(temporaryRoot), 'repository');
    const fakeScripts = resolve(fakeRoot, 'scripts/release');
    const evidenceRoot = resolve(fakeRoot, '.ai-platform/evidence/T141');
    const fakeBin = resolve(fakeRoot, 'test-bin');
    try {
      mkdirSync(fakeScripts, { recursive: true });
      mkdirSync(evidenceRoot, { recursive: true });
      mkdirSync(resolve(fakeRoot, 'apps/video/src'), { recursive: true });
      mkdirSync(resolve(fakeRoot, 'apps/video/out'), { recursive: true });
      mkdirSync(resolve(fakeRoot, 'apps/video/public/captures'), { recursive: true });
      mkdirSync(fakeBin, { recursive: true });
      symlinkSync(resolve(root, 'node_modules'), resolve(fakeRoot, 'node_modules'), 'dir');
      writeFileSync(resolve(fakeRoot, '.nvmrc'), `${process.versions.node}\n`);
      writeFileSync(resolve(fakeRoot, 'apps/video/src/keep.txt'), 'source');
      writeFileSync(resolve(fakeRoot, 'apps/video/out/local-render.json'), 'generated');
      writeFileSync(
        resolve(fakeRoot, 'apps/video/public/captures/local-capture.json'),
        'generated',
      );
      for (const filename of [
        'audit-candidate.mjs',
        'canonical-gzip.mjs',
        'package-candidate-artifact.mjs',
        'package-contracts.json',
        'package-contracts.mjs',
        'rehearse-candidate-source.mjs',
        'release-utils.mjs',
      ]) {
        copyFileSync(resolve(root, 'scripts/release', filename), resolve(fakeScripts, filename));
      }
      const fakePnpm = resolve(fakeBin, 'pnpm');
      writeFileSync(
        fakePnpm,
        `#!/usr/bin/env node
const { existsSync } = require('node:fs');
if (!existsSync('apps/video/src/keep.txt')) process.exit(2);
if (existsSync('apps/video/out/local-render.json')) process.exit(3);
if (existsSync('apps/video/public/captures/local-capture.json')) process.exit(4);
`,
      );
      chmodSync(fakePnpm, 0o755);

      const result = spawnSync(
        process.execPath,
        [resolve(fakeRoot, scripts[2]), '--candidate-version', '2.0.0', '--evidence-task', 'T141'],
        {
          cwd: fakeRoot,
          encoding: 'utf8',
          env: { ...process.env, PATH: `${fakeBin}${delimiter}${process.env['PATH'] ?? ''}` },
        },
      );
      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
      expect(readFileSync(resolve(evidenceRoot, 'isolated-source-receipt.md'), 'utf8')).toContain(
        'Candidate build/package/audit gates: passed',
      );
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('rejects the complete missing, duplicate and unsupported argument matrix', async () => {
    const candidateModule = (await import(
      pathToFileURL(resolve(root, scripts[0])).href
    )) as Readonly<{
      parseCandidateArguments?: (args: readonly string[]) => unknown;
    }>;
    const parseCandidateArguments = candidateModule.parseCandidateArguments;
    expect(parseCandidateArguments).toBeTypeOf('function');
    if (parseCandidateArguments === undefined) {
      throw new Error('Candidate argument parser is unavailable');
    }
    for (const args of invalidArguments) {
      expect(() => parseCandidateArguments(args), args.join(' ')).toThrow(
        'Candidate arguments rejected.',
      );
    }
  });

  it.each(scripts)('%s wires missing arguments through the fail-closed parser', script => {
    const result = run(script, []);
    expect(result.status, `${script}\n${result.output}`).not.toBe(0);
    expect(result.output).toContain('Candidate arguments rejected.');
  });

  it('fails closed before every candidate command can follow a symlinked evidence root', () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-candidate-symlink-'));
    const fakeRoot = resolve(realpathSync(temporaryRoot), 'repository');
    const fakeScripts = resolve(fakeRoot, 'scripts/release');
    const evidenceBase = resolve(fakeRoot, '.ai-platform/evidence');
    try {
      mkdirSync(fakeScripts, { recursive: true });
      mkdirSync(evidenceBase, { recursive: true });
      const outside = resolve(temporaryRoot, 'outside');
      mkdirSync(outside);
      symlinkSync(outside, resolve(evidenceBase, 'T140'), 'dir');
      symlinkSync(resolve(root, 'node_modules'), resolve(fakeRoot, 'node_modules'), 'dir');
      for (const filename of [
        'audit-candidate.mjs',
        'canonical-gzip.mjs',
        'package-candidate-artifact.mjs',
        'package-contracts.json',
        'package-contracts.mjs',
        'rehearse-candidate-source.mjs',
        'release-utils.mjs',
      ]) {
        copyFileSync(resolve(root, 'scripts/release', filename), resolve(fakeScripts, filename));
      }

      for (const script of scripts) {
        const result = spawnSync(
          process.execPath,
          [resolve(fakeRoot, script), '--candidate-version', '2.0.0', '--evidence-task', 'T140'],
          { cwd: fakeRoot, encoding: 'utf8' },
        );
        const output = `${result.stdout}${result.stderr}`;
        expect(result.status, `${script}\n${output}`).not.toBe(0);
        expect(output).toContain('Candidate arguments rejected.');
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when the evidence base directory is itself a symlink', () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-candidate-base-symlink-'));
    const fakeRoot = resolve(realpathSync(temporaryRoot), 'repository');
    const fakeScripts = resolve(fakeRoot, 'scripts/release');
    const aiPlatform = resolve(fakeRoot, '.ai-platform');
    const outsideEvidence = resolve(temporaryRoot, 'outside-evidence');
    try {
      mkdirSync(fakeScripts, { recursive: true });
      mkdirSync(aiPlatform, { recursive: true });
      mkdirSync(resolve(outsideEvidence, 'T140'), { recursive: true });
      symlinkSync(outsideEvidence, resolve(aiPlatform, 'evidence'), 'dir');
      symlinkSync(resolve(root, 'node_modules'), resolve(fakeRoot, 'node_modules'), 'dir');
      writeFileSync(resolve(fakeRoot, '.nvmrc'), `${process.versions.node}\n`);
      for (const filename of [
        'audit-candidate.mjs',
        'canonical-gzip.mjs',
        'package-candidate-artifact.mjs',
        'package-contracts.json',
        'package-contracts.mjs',
        'rehearse-candidate-source.mjs',
        'release-utils.mjs',
      ]) {
        copyFileSync(resolve(root, 'scripts/release', filename), resolve(fakeScripts, filename));
      }

      for (const script of scripts) {
        const result = spawnSync(
          process.execPath,
          [resolve(fakeRoot, script), '--candidate-version', '2.0.0', '--evidence-task', 'T140'],
          { cwd: fakeRoot, encoding: 'utf8', timeout: 5_000 },
        );
        const output = `${result.stdout}${result.stderr}`;
        expect(result.status, `${script}\n${output}`).not.toBe(0);
        expect(output).toContain('Candidate arguments rejected.');
        expect(output).not.toContain(fakeRoot);
        expect(output).not.toContain(outsideEvidence);
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it.each(scripts.slice(1))(
    '%s compares the actual runtime with .nvmrc and ignores environment overrides',
    script => {
      const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-candidate-runtime-'));
      const fakeRoot = resolve(realpathSync(temporaryRoot), 'repository');
      const fakeScripts = resolve(fakeRoot, 'scripts/release');
      const evidenceRoot = resolve(fakeRoot, '.ai-platform/evidence/T140');
      try {
        mkdirSync(fakeScripts, { recursive: true });
        mkdirSync(evidenceRoot, { recursive: true });
        symlinkSync(resolve(root, 'node_modules'), resolve(fakeRoot, 'node_modules'), 'dir');
        writeFileSync(resolve(fakeRoot, '.nvmrc'), '0.0.0-test\n');
        for (const filename of [
          'audit-candidate.mjs',
          'canonical-gzip.mjs',
          'package-candidate-artifact.mjs',
          'package-contracts.json',
          'package-contracts.mjs',
          'rehearse-candidate-source.mjs',
          'release-utils.mjs',
        ]) {
          copyFileSync(resolve(root, 'scripts/release', filename), resolve(fakeScripts, filename));
        }

        const result = spawnSync(
          process.execPath,
          [resolve(fakeRoot, script), '--candidate-version', '2.0.0', '--evidence-task', 'T140'],
          {
            cwd: fakeRoot,
            encoding: 'utf8',
            env: { ...process.env, TELLPLOT_CANDIDATE_NODE_VERSION: '0.0.0-test' },
            timeout: 5_000,
          },
        );
        const output = `${result.stdout}${result.stderr}`;
        expect(result.status, output).not.toBe(0);
        expect(output).toContain('Candidate arguments rejected.');
        expect(output).not.toContain(fakeRoot);
      } finally {
        rmSync(temporaryRoot, { recursive: true, force: true });
      }
    },
  );

  it('rejects nested artifact and receipt symlinks without writing through them', () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-candidate-nested-symlink-'));
    const fakeRoot = resolve(realpathSync(temporaryRoot), 'repository');
    const fakeScripts = resolve(fakeRoot, 'scripts/release');
    const evidenceRoot = resolve(fakeRoot, '.ai-platform/evidence/T140');
    const outside = resolve(temporaryRoot, 'outside');
    try {
      mkdirSync(fakeScripts, { recursive: true });
      mkdirSync(evidenceRoot, { recursive: true });
      mkdirSync(outside);
      symlinkSync(resolve(root, 'node_modules'), resolve(fakeRoot, 'node_modules'), 'dir');
      writeFileSync(resolve(fakeRoot, '.nvmrc'), `${process.versions.node}\n`);
      for (const filename of [
        'audit-candidate.mjs',
        'canonical-gzip.mjs',
        'package-candidate-artifact.mjs',
        'package-contracts.json',
        'package-contracts.mjs',
        'rehearse-candidate-source.mjs',
        'release-utils.mjs',
      ]) {
        copyFileSync(resolve(root, 'scripts/release', filename), resolve(fakeScripts, filename));
      }

      const artifactSentinel = resolve(outside, 'artifact-sentinel');
      mkdirSync(artifactSentinel);
      symlinkSync(artifactSentinel, resolve(evidenceRoot, 'artifacts'), 'dir');
      const artifact = spawnSync(
        process.execPath,
        [resolve(fakeRoot, scripts[1]), '--candidate-version', '2.0.0', '--evidence-task', 'T140'],
        { cwd: fakeRoot, encoding: 'utf8' },
      );
      expect(artifact.status, `${artifact.stdout}${artifact.stderr}`).not.toBe(0);
      expect(`${artifact.stdout}${artifact.stderr}`).toContain('Candidate arguments rejected.');
      expect(existsSync(resolve(artifactSentinel, 'tellplot-2.0.0.tgz'))).toBe(false);

      rmSync(resolve(evidenceRoot, 'artifacts'));
      const manifestSentinel = resolve(outside, 'manifest-sentinel');
      writeFileSync(manifestSentinel, 'unchanged');
      symlinkSync(manifestSentinel, resolve(evidenceRoot, 'tarball-manifest.json'), 'file');
      const manifest = spawnSync(
        process.execPath,
        [resolve(fakeRoot, scripts[1]), '--candidate-version', '2.0.0', '--evidence-task', 'T140'],
        { cwd: fakeRoot, encoding: 'utf8' },
      );
      expect(manifest.status, `${manifest.stdout}${manifest.stderr}`).not.toBe(0);
      expect(`${manifest.stdout}${manifest.stderr}`).toContain('Candidate arguments rejected.');
      expect(readFileSync(manifestSentinel, 'utf8')).toBe('unchanged');
      rmSync(resolve(evidenceRoot, 'tarball-manifest.json'));

      const receiptSentinel = resolve(outside, 'receipt-sentinel');
      writeFileSync(receiptSentinel, 'unchanged');
      symlinkSync(receiptSentinel, resolve(evidenceRoot, 'isolated-source-receipt.md'));
      const rehearsal = spawnSync(
        process.execPath,
        [resolve(fakeRoot, scripts[2]), '--candidate-version', '2.0.0', '--evidence-task', 'T140'],
        { cwd: fakeRoot, encoding: 'utf8' },
      );
      expect(rehearsal.status, `${rehearsal.stdout}${rehearsal.stderr}`).not.toBe(0);
      expect(`${rehearsal.stdout}${rehearsal.stderr}`).toContain('Candidate arguments rejected.');
      expect(readFileSync(receiptSentinel, 'utf8')).toBe('unchanged');
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
