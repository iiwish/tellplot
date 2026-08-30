import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import * as core from '../dist/index.js';

const rendererInternals = [
  'ChartCategoryElementPointer',
  'ChartCategoryPointerResult',
  'ChartCategoryTargetReadResult',
  'ChartPointerPoint',
  'ChartSceneElementBounds',
  'readChartCategoryElementPointer',
  'readChartElementBounds',
  'readChartPointerPoint',
  'readChartTargetCoordinate',
];
const comparisonTypes = [
  'SeriesId',
  'ComparisonSchemaVersion',
  'CategoricalComparisonSeries',
  'CategoricalComparisonValue',
  'CategoricalComparisonSourceItem',
  'CategoricalComparisonSourceData',
  'CategoricalComparisonViewSpec',
  'CategoricalComparisonDatumKind',
  'CategoricalComparisonSeriesValue',
  'CategoricalComparisonDatum',
  'CategoricalComparisonProjection',
  'CategoricalComparisonProjectionResult',
  'CategoricalComparisonSeriesColor',
  'CategoricalComparisonChartColors',
  'CategoricalComparisonChartAppearance',
  'CategoricalComparisonChartConfig',
];

for (const name of rendererInternals) {
  assert.equal(Object.hasOwn(core, name), false, `${name} must not be a core runtime export`);
}
assert.equal(
  typeof core.projectCategoricalComparison,
  'function',
  'T136 must export the comparison runtime projector',
);

const declarations = await readFile(new URL('../dist/index.d.ts', import.meta.url), 'utf8');
for (const name of rendererInternals) {
  assert.equal(
    new RegExp(`\\b${name}\\b`, 'u').test(declarations),
    false,
    `${name} must not be a core type export`,
  );
}
for (const name of comparisonTypes) {
  assert.equal(
    new RegExp(`\\b${name}\\b`, 'u').test(declarations),
    true,
    `${name} must be a core type export`,
  );
}
