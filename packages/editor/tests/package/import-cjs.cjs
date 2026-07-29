const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const editor = require('../../dist/index.cjs');

const expected = [
  'ChartEditor',
  'createEditorSession',
  'createInitialViewSpec',
  'executeCommand',
  'parseViewSpec',
  'redoSession',
  'serializeViewSpec',
  'undoSession',
  'validateChartConfig',
  'validateSourceData',
  'validateViewSpec',
];

if (JSON.stringify(Object.keys(editor).sort()) !== JSON.stringify(expected)) {
  throw new Error('CJS runtime API does not match the stable 1.x surface');
}

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
if (
  packageJson.exports?.['./styles.css']?.types !== './dist/styles.d.ts' ||
  packageJson.exports?.['./styles.css']?.default !== './dist/styles.css'
) {
  throw new Error('CJS package does not expose the approved styles.css subpath');
}
if (!Array.isArray(packageJson.sideEffects) || !packageJson.sideEffects.includes('**/*.css')) {
  throw new Error('CJS package does not preserve stylesheet side effects');
}

const stylesheet = readFileSync(resolve(__dirname, '../../dist/styles.css'), 'utf8');
if (stylesheet.trim().length === 0) {
  throw new Error('CJS package styles.css export is empty');
}
if (!stylesheet.includes('.tp-editor')) {
  throw new Error('CJS package stylesheet is missing the editor scope');
}
if (/^\s*(?::root|html|body)\b/m.test(stylesheet)) {
  throw new Error('CJS package stylesheet contains an unscoped document selector');
}
