import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { repositoryRoot } from './release-utils.mjs';

const documents = [
  'docs/data-contract.md',
  'docs/api.md',
  'docs/configuration.md',
  'docs/migration.md',
];
const fencePattern = /```(?:ts|typescript|tsx)\s+([^\n]+)\n([\s\S]*?)```/gu;
const identifierPattern = /^[a-z][a-z0-9-]*$/u;
const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-doc-types-'));
const receipts = [];
mkdirSync(resolve(temporaryRoot, 'node_modules'), { recursive: true });
symlinkSync(
  resolve(repositoryRoot, 'packages/tellplot'),
  resolve(temporaryRoot, 'node_modules/tellplot'),
  'dir',
);
writeFileSync(resolve(temporaryRoot, 'package.json'), '{"type":"module"}\n');

function metadata(raw, documentPath) {
  const entries = Object.fromEntries(
    raw
      .trim()
      .split(/\s+/u)
      .map(token => {
        const separator = token.indexOf('=');
        if (separator <= 0) throw new Error(`${documentPath}: invalid TypeScript fence metadata`);
        return [token.slice(0, separator), token.slice(separator + 1)];
      }),
  );
  if (
    Object.keys(entries).sort().join(',') !== 'id,mode' ||
    !identifierPattern.test(entries.id ?? '') ||
    !/^(?:standalone|compose(?:-runtime)?:[a-z][a-z0-9-]*|expected-diagnostic:TS\d+)$/u.test(
      entries.mode ?? '',
    )
  ) {
    throw new Error(`${documentPath}: every TypeScript fence needs exact id and mode metadata`);
  }
  return entries;
}

function compile(id, source, expectedDiagnostic, execute = false) {
  const sourcePath = resolve(temporaryRoot, `${id}.ts`);
  const configPath = resolve(temporaryRoot, `${id}.json`);
  const outputRoot = resolve(temporaryRoot, `runtime-${id}`);
  writeFileSync(sourcePath, source);
  writeFileSync(
    configPath,
    `${JSON.stringify({
      extends: resolve(repositoryRoot, 'tsconfig.base.json'),
      compilerOptions: {
        noEmit: !execute,
        ...(execute ? { outDir: outputRoot } : {}),
        strict: true,
        baseUrl: repositoryRoot,
        paths: {
          tellplot: ['packages/tellplot/dist/index.d.ts'],
          'tellplot/core': ['packages/tellplot/dist/core.d.ts'],
          'tellplot/react': ['packages/tellplot/dist/react.d.ts'],
          'tellplot/vue': ['packages/tellplot/dist/vue.d.ts'],
        },
      },
      files: [sourcePath],
    })}\n`,
  );
  const result = spawnSync('pnpm', ['exec', 'tsc', '-p', configPath, '--pretty', 'false'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  const output = `${result.stdout}${result.stderr}`;
  if (expectedDiagnostic === undefined) {
    if (result.status !== 0) throw new Error(`${id}: TypeScript fence failed\n${output}`);
  } else if (result.status === 0 || !output.includes(`error ${expectedDiagnostic}:`)) {
    throw new Error(`${id}: expected only ${expectedDiagnostic}\n${output}`);
  } else {
    const diagnostics = [...output.matchAll(/error (TS\d+):/gu)].map(match => match[1]);
    if (diagnostics.some(code => code !== expectedDiagnostic)) {
      throw new Error(`${id}: unexpected TypeScript diagnostic\n${output}`);
    }
  }
  if (execute) {
    const runtime = spawnSync(process.execPath, [resolve(outputRoot, `${id}.js`)], {
      cwd: temporaryRoot,
      encoding: 'utf8',
    });
    if (runtime.status !== 0) {
      throw new Error(`${id}: TypeScript fence runtime failed\n${runtime.stdout}${runtime.stderr}`);
    }
  }
}

try {
  const seen = new Set();
  const compositions = new Map();
  for (const documentPath of documents) {
    const source = readFileSync(resolve(repositoryRoot, documentPath), 'utf8');
    const rawTypeFenceCount = [...source.matchAll(/```(?:ts|typescript|tsx)(?:\s|\n)/gu)].length;
    const fences = [...source.matchAll(fencePattern)];
    if (fences.length !== rawTypeFenceCount) {
      throw new Error(`${documentPath}: a TypeScript fence is missing explicit metadata`);
    }
    for (const fence of fences) {
      const fields = metadata(fence[1] ?? '', documentPath);
      const id = fields.id;
      const mode = fields.mode;
      if (id === undefined || mode === undefined || seen.has(id)) {
        throw new Error(`${documentPath}: duplicate or unreadable TypeScript fence id`);
      }
      seen.add(id);
      const code = fence[2] ?? '';
      if (mode.startsWith('compose:') || mode.startsWith('compose-runtime:')) {
        const runtime = mode.startsWith('compose-runtime:');
        const group = mode.slice(runtime ? 'compose-runtime:'.length : 'compose:'.length);
        const existing = compositions.get(group);
        if (existing !== undefined && existing.runtime !== runtime) {
          throw new Error(`${documentPath}: composition runtime mode must stay consistent`);
        }
        compositions.set(group, {
          runtime,
          parts: [...(existing?.parts ?? []), code],
        });
      } else {
        compile(id, code, mode.startsWith('expected-diagnostic:') ? mode.slice(20) : undefined);
      }
      receipts.push({ document: documentPath, id, mode });
    }
  }
  for (const [group, composition] of compositions) {
    compile(`composition-${group}`, composition.parts.join('\n'), undefined, composition.runtime);
  }
  process.stdout.write(
    `${JSON.stringify({
      status: 'passed',
      documents: documents.length,
      fences: receipts.length,
      compositions: compositions.size,
      receipts,
    })}\n`,
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
