import { cpSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';

import { repositoryRoot, run, walkFiles } from './release-utils.mjs';

const targetRoot = mkdtempSync(join(tmpdir(), 'tellplot-1.0.0-rehearsal-'));
const excluded = new Set([
  '.git',
  '.copyright-application',
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  'blob-report',
  'tmp',
]);

function includeSource(source) {
  const relativePath = relative(repositoryRoot, source);
  const segments = relativePath.split(sep);
  if (segments.some(segment => excluded.has(segment))) {
    return false;
  }
  if (segments[0] === '.ai-platform' && segments[1] === 'evidence') {
    return false;
  }
  return true;
}

for (const entry of readdirSync(repositoryRoot)) {
  if (excluded.has(entry)) {
    continue;
  }
  const source = resolve(repositoryRoot, entry);
  if (!includeSource(source)) {
    continue;
  }
  cpSync(source, resolve(targetRoot, basename(source)), {
    recursive: true,
    filter: includeSource,
  });
}

const gates = [
  ['pnpm', ['install', '--frozen-lockfile']],
  ['pnpm', ['release:architecture']],
  ['pnpm', ['release:audit']],
  ['pnpm', ['typecheck']],
  ['pnpm', ['test:unit']],
  ['pnpm', ['build']],
  ['pnpm', ['test:package']],
];

for (const [command, args] of gates) {
  process.stdout.write(`\n[rehearsal] ${command} ${args.join(' ')}\n`);
  run(command, args, { cwd: targetRoot, inherit: true });
}

process.stdout.write(
  `${JSON.stringify(
    {
      status: 'passed',
      version: '1.0.0',
      isolatedRoot: targetRoot,
      sourceFiles: walkFiles(targetRoot, { excludedNames: ['node_modules', 'dist'] }).length,
      gates: gates.map(([command, args]) => `${command} ${args.join(' ')}`),
    },
    null,
    2,
  )}\n`,
);
