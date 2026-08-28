import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, relative, resolve, sep } from 'node:path';

import {
  assertCandidateOutputPath,
  assertPinnedCandidateNode,
  parseCandidateArguments,
  runCandidateCommand,
} from './audit-candidate.mjs';
import { repositoryRoot, run, walkFiles } from './release-utils.mjs';

const excluded = new Set([
  '.git',
  '.copyright-application',
  '.vercel',
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  'blob-report',
  'tmp',
]);
const excludedGeneratedRoots = [
  ['apps', 'video', 'out'].join(sep),
  ['apps', 'video', 'public', 'captures'].join(sep),
];

function isLocalEnvironmentFile(segment) {
  return segment === '.env' || segment === '.env.local' || /^\.env\..+\.local$/u.test(segment);
}

function includeSource(source) {
  const relativePath = relative(repositoryRoot, source);
  const segments = relativePath.split(sep);
  return (
    !segments.some(segment => excluded.has(segment) || isLocalEnvironmentFile(segment)) &&
    !excludedGeneratedRoots.some(
      root => relativePath === root || relativePath.startsWith(`${root}${sep}`),
    ) &&
    !(segments[0] === '.ai-platform' && segments[1] === 'evidence')
  );
}

function rehearseCandidateSource() {
  const { candidateVersion, evidenceTask, evidenceRoot } = parseCandidateArguments(
    process.argv.slice(2),
  );
  assertPinnedCandidateNode();
  const receiptTarget = resolve(evidenceRoot, 'isolated-source-receipt.md');
  assertCandidateOutputPath(evidenceRoot, receiptTarget);
  const targetRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-candidate-source-'));

  try {
    for (const entry of readdirSync(repositoryRoot)) {
      if (excluded.has(entry)) continue;
      const source = resolve(repositoryRoot, entry);
      if (!includeSource(source)) continue;
      cpSync(source, resolve(targetRoot, basename(source)), {
        recursive: true,
        filter: includeSource,
      });
    }
    mkdirSync(resolve(targetRoot, '.ai-platform/evidence', evidenceTask), { recursive: true });
    const gates = [
      ['pnpm', ['install', '--frozen-lockfile']],
      ['pnpm', ['build']],
      ['pnpm', ['test:package']],
      [
        'pnpm',
        [
          'release:candidate:audit',
          '--',
          '--candidate-version',
          candidateVersion,
          '--evidence-task',
          evidenceTask,
        ],
      ],
    ];
    for (const [command, args] of gates) {
      run(command, [...args], { cwd: targetRoot, inherit: true });
    }
    const sourceFiles = walkFiles(targetRoot, { excludedNames: ['node_modules', 'dist'] }).length;
    const receipt = [
      '# Isolated Candidate Source Receipt',
      '',
      `- Candidate: tellplot@${candidateVersion}`,
      `- Evidence task: ${evidenceTask}`,
      `- Node runtime: ${process.versions.node} (matches .nvmrc)`,
      '- Isolated root: redacted temporary directory',
      `- Source files: ${sourceFiles}`,
      '- Frozen install: passed',
      '- Candidate build/package/audit gates: passed',
      '',
    ].join('\n');
    assertCandidateOutputPath(evidenceRoot, receiptTarget);
    writeFileSync(receiptTarget, receipt);
    process.stdout.write(
      JSON.stringify({
        status: 'passed',
        version: candidateVersion,
        evidenceTask,
        nodeVersion: process.versions.node,
        sourceFiles,
      }) + '\n',
    );
  } finally {
    rmSync(targetRoot, { recursive: true, force: true });
  }
}

runCandidateCommand(rehearseCandidateSource);
