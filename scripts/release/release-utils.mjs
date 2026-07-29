import { readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function toPosix(path) {
  return path.replaceAll('\\', '/');
}

export function walkFiles(root, options = {}) {
  const excluded = new Set(options.excludedNames ?? []);
  const files = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (excluded.has(entry.name)) {
        continue;
      }
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }

  if (statSync(root).isDirectory()) {
    visit(root);
  }
  return files;
}

export function repositoryPath(path) {
  return toPosix(relative(repositoryRoot, path));
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    if (!options.inherit) {
      process.stderr.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status ?? 'null'}`,
    );
  }
  return result.stdout ?? '';
}

export function fail(title, findings) {
  process.stderr.write(`${title}\n`);
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exitCode = 1;
}
