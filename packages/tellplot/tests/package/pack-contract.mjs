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

const output = JSON.parse(result.stdout);
const manifest = Array.isArray(output) ? output[0] : output;
const paths = manifest.files.map(file => file.path).sort();
const requiredPaths = [
  'LICENSE',
  'README.md',
  'dist/core.cjs',
  'dist/core.d.cts',
  'dist/core.d.ts',
  'dist/core.js',
  'dist/index.cjs',
  'dist/index.d.cts',
  'dist/index.d.ts',
  'dist/index.js',
  'dist/react.cjs',
  'dist/react.d.cts',
  'dist/react.d.ts',
  'dist/react.js',
  'dist/styles.css',
  'dist/vue.cjs',
  'dist/vue.d.cts',
  'dist/vue.d.ts',
  'dist/vue.js',
  'package.json',
];

if (manifest.name !== 'tellplot') {
  throw new Error(`Unexpected package name: ${manifest.name}`);
}
if (manifest.version !== '2.0.0') {
  throw new Error(`Unexpected candidate version: ${manifest.version}`);
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
