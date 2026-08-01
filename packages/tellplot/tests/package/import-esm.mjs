import { readFile } from 'node:fs/promises';

const [tellplot, core, react, vue] = await Promise.all([
  import('../../dist/index.js'),
  import('../../dist/core.js'),
  import('../../dist/react.js'),
  import('../../dist/vue.js'),
]);

if (typeof tellplot.createEditor !== 'function') {
  throw new Error('ESM root does not expose createEditor');
}
if (typeof tellplot.validateChartConfig !== 'function') {
  throw new Error('ESM root does not expose the stable core API');
}
if ('ChartEditor' in tellplot) {
  throw new Error('ESM root must not eagerly expose a framework adapter');
}
if (typeof core.validateChartConfig !== 'function' || 'createEditor' in core) {
  throw new Error('ESM core subpath is not isolated');
}
if (Object.keys(react).join(',') !== 'ChartEditor') {
  throw new Error('ESM React subpath must expose only ChartEditor at runtime');
}
if (Object.keys(vue).join(',') !== 'ChartEditor') {
  throw new Error('ESM Vue subpath must expose only ChartEditor at runtime');
}

const packageJson = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
);
if (packageJson.exports?.['./styles.css']?.default !== './dist/styles.css') {
  throw new Error('ESM package does not expose styles.css');
}
if (!Array.isArray(packageJson.sideEffects) || !packageJson.sideEffects.includes('**/*.css')) {
  throw new Error('ESM package does not preserve stylesheet side effects');
}

const stylesheet = await readFile(new URL('../../dist/styles.css', import.meta.url), 'utf8');
if (!stylesheet.includes('.tp-editor') || !stylesheet.includes('.tellplot-react-host')) {
  throw new Error('ESM package stylesheet is incomplete');
}
if (/^\s*(?::root|html|body)\b/m.test(stylesheet)) {
  throw new Error('ESM package stylesheet contains an unscoped document selector');
}
