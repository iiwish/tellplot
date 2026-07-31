import { readFile } from 'node:fs/promises';

const editor = await import('../../dist/index.js');

const expected = ['createEditor'];

if (JSON.stringify(Object.keys(editor).sort()) !== JSON.stringify(expected)) {
  throw new Error('ESM runtime API does not match the stable 1.x surface');
}

const packageJson = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
);
if (
  packageJson.exports?.['./styles.css']?.types !== './dist/styles.d.ts' ||
  packageJson.exports?.['./styles.css']?.default !== './dist/styles.css'
) {
  throw new Error('ESM package does not expose the approved styles.css subpath');
}
if (!Array.isArray(packageJson.sideEffects) || !packageJson.sideEffects.includes('**/*.css')) {
  throw new Error('ESM package does not preserve stylesheet side effects');
}

const stylesheet = await readFile(new URL('../../dist/styles.css', import.meta.url), 'utf8');
if (stylesheet.trim().length === 0) {
  throw new Error('ESM package styles.css export is empty');
}
if (!stylesheet.includes('.tp-editor')) {
  throw new Error('ESM package stylesheet is missing the editor scope');
}
if (/^\s*(?::root|html|body)\b/m.test(stylesheet)) {
  throw new Error('ESM package stylesheet contains an unscoped document selector');
}
