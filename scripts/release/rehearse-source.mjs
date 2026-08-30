import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';

import { currentRelease } from './current-release.mjs';
import { repositoryRoot, run, walkFiles } from './release-utils.mjs';

const targetRoot = mkdtempSync(join(tmpdir(), `tellplot-${currentRelease.version}-rehearsal-`));
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
  if (
    segments.some(segment => excluded.has(segment) || isLocalEnvironmentFile(segment)) ||
    excludedGeneratedRoots.some(
      root => relativePath === root || relativePath.startsWith(`${root}${sep}`),
    )
  ) {
    return false;
  }
  if (segments[0] === '.ai-platform' && segments[1] === 'evidence') {
    return false;
  }
  return true;
}

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

  const gates = [
    ['pnpm', ['security:lock']],
    ['pnpm', ['install', '--frozen-lockfile']],
    ['pnpm', ['security:dependencies']],
    ['pnpm', ['release:architecture']],
    ['pnpm', ['release:audit']],
    ['pnpm', ['build']],
    ['pnpm', ['typecheck']],
    ['pnpm', ['test:unit']],
    ['pnpm', ['test:package']],
    ['pnpm', ['test:framework-matrix']],
    ['pnpm', ['release:artifact:refresh']],
    ['pnpm', ['release:artifact']],
  ];

  for (const [command, args] of gates) {
    process.stdout.write(`\n[rehearsal] ${command} ${args.join(' ')}\n`);
    run(command, args, { cwd: targetRoot, inherit: true });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'passed',
        version: currentRelease.version,
        evidenceTask: currentRelease.evidenceTask,
        nodeVersion: process.versions.node,
        sourceFiles: walkFiles(targetRoot, { excludedNames: ['node_modules', 'dist'] }).length,
        gates: gates.map(([command, args]) => `${command} ${args.join(' ')}`),
      },
      null,
      2,
    )}\n`,
  );
} finally {
  rmSync(targetRoot, { recursive: true, force: true });
}
