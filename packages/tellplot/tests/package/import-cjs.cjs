const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const tellplot = require('../../dist/index.cjs');
const core = require('../../dist/core.cjs');
const react = require('../../dist/react.cjs');
const vue = require('../../dist/vue.cjs');

if (typeof tellplot.createEditor !== 'function') {
  throw new Error('CJS root does not expose createEditor');
}
if (typeof tellplot.validateChartConfig !== 'function') {
  throw new Error('CJS root does not expose the stable core API');
}
if ('ChartEditor' in tellplot) {
  throw new Error('CJS root must not eagerly expose a framework adapter');
}
if (typeof core.validateChartConfig !== 'function' || 'createEditor' in core) {
  throw new Error('CJS core subpath is not isolated');
}
if (Object.keys(react).join(',') !== 'ChartEditor') {
  throw new Error('CJS React subpath must expose only ChartEditor at runtime');
}
if (Object.keys(vue).join(',') !== 'ChartEditor') {
  throw new Error('CJS Vue subpath must expose only ChartEditor at runtime');
}

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
if (packageJson.exports?.['./styles.css']?.default !== './dist/styles.css') {
  throw new Error('CJS package does not expose styles.css');
}
const stylesheet = readFileSync(resolve(__dirname, '../../dist/styles.css'), 'utf8');
if (!stylesheet.includes('.tp-editor') || !stylesheet.includes('.tellplot-vue-host')) {
  throw new Error('CJS package stylesheet is incomplete');
}
