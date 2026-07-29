import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const result = spawnSync('pnpm', ['pack', '--dry-run', '--json'], {
  cwd: packageRoot,
  encoding: 'utf8',
});

if (result.status !== 0) {
  throw new Error(`pnpm pack --dry-run failed: ${result.stderr || result.stdout}`);
}

const manifest = JSON.parse(result.stdout);
const paths = manifest.files.map(file => file.path).sort();
const requiredPaths = [
  'LICENSE',
  'README.md',
  'dist/index.cjs',
  'dist/index.d.cts',
  'dist/index.d.ts',
  'dist/index.js',
  'dist/styles.css',
  'package.json',
];

if (manifest.name !== '@tellplot/editor') {
  throw new Error(`Unexpected package name: ${manifest.name}`);
}
if (manifest.version !== '1.0.0') {
  throw new Error(`Unexpected stable version: ${manifest.version}`);
}
for (const path of requiredPaths) {
  if (!paths.includes(path)) {
    throw new Error(`Stable tarball is missing ${path}`);
  }
}
for (const path of paths) {
  if (!['LICENSE', 'README.md', 'package.json'].includes(path) && !path.startsWith('dist/')) {
    throw new Error(`Stable tarball contains an internal path: ${path}`);
  }
}
