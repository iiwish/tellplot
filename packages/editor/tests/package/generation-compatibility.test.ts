import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import {
  createInitialViewSpec,
  parseViewSpec,
  projectCategorical,
  projectCategoricalComparison,
  projectWaterfall,
  serializeViewSpec,
  validateChartConfig,
  type ChartConfig,
  type SourceData,
} from '../../../tellplot/src/index';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());

const generations = [
  {
    name: 'legacy-v1-waterfall',
    config: {
      type: 'waterfall',
      data: {
        schemaVersion: '1.0.0',
        datasetId: 'legacy-v1-waterfall',
        items: [
          { id: 'start', label: 'Start', amount: 10, kind: 'start' },
          { id: 'change', label: 'Change', amount: 2, kind: 'contribution' },
          { id: 'end', label: 'End', amount: 12, kind: 'end' },
        ],
      },
    },
    project: projectWaterfall,
  },
  {
    name: 'current-v2-waterfall',
    config: {
      type: 'waterfall',
      data: {
        schemaVersion: '2.0.0',
        dataKind: 'waterfall',
        datasetId: 'current-v2-waterfall',
        items: [
          { id: 'start', label: 'Start', amount: 10, kind: 'start' },
          { id: 'change', label: 'Change', amount: -2, kind: 'contribution' },
          { id: 'end', label: 'End', amount: 8, kind: 'end' },
        ],
      },
    },
    project: projectWaterfall,
  },
  {
    name: 'scalar-v2-categorical',
    config: {
      type: 'column',
      data: {
        schemaVersion: '2.0.0',
        dataKind: 'categorical',
        datasetId: 'scalar-v2-categorical',
        items: [{ id: 'revenue', label: 'Revenue', amount: 10 }],
      },
    },
    project: projectCategorical,
  },
] as const satisfies readonly {
  readonly name: string;
  readonly config: ChartConfig;
  readonly project: typeof projectWaterfall | typeof projectCategorical;
}[];

describe('public package generation compatibility', () => {
  it.each(generations)('$name compiles, runs and round-trips without a wire migration', fixture => {
    expect(validateChartConfig(fixture.config)).toEqual({
      ok: true,
      value: fixture.config,
      errors: [],
    });
    const initial = createInitialViewSpec(fixture.config.data, { chartType: fixture.config.type });
    expect(initial.ok).toBe(true);
    if (!initial.ok) throw new Error('Expected a concrete legacy/current view.');
    expect(fixture.project(fixture.config.data, initial.value).ok).toBe(true);
    expect(parseViewSpec(serializeViewSpec(initial.value), fixture.config.data)).toEqual(initial);
  });

  it('constructs, projects and round-trips a strict comparison-v3 consumer', () => {
    const source = {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: 'comparison-v3',
      series: [
        { id: 'actual', label: 'Actual' },
        { id: 'budget', label: 'Budget' },
      ],
      items: [
        {
          id: 'revenue',
          label: 'Revenue',
          values: [
            { seriesId: 'actual', amount: 10 },
            { seriesId: 'budget', amount: 12 },
          ],
        },
      ],
    } as const satisfies SourceData;
    const initial = createInitialViewSpec(source, { chartType: 'column' });
    expect(initial.ok).toBe(true);
    if (!initial.ok) throw new Error('Expected a comparison view.');
    expect(projectCategoricalComparison(source, initial.value)).toMatchObject({ ok: true });
    expect(parseViewSpec(serializeViewSpec(initial.value), source)).toEqual(initial);
  });

  it('proves the exhaustive-union source break and the explicit schema-3 migration', () => {
    const run = (config: string) =>
      spawnSync('pnpm', ['exec', 'tsc', '-p', config, '--pretty', 'false'], {
        cwd: root,
        encoding: 'utf8',
      });
    const before = run('packages/editor/tests/package/fixtures/tsconfig.before.json');
    const after = run('packages/editor/tests/package/fixtures/tsconfig.after.json');

    expect(before.status).not.toBe(0);
    expect(`${before.stdout}${before.stderr}`).toMatch(
      /error TS2322: Type 'CategoricalComparisonSourceData' is not assignable to type 'never'/u,
    );
    expect(after.status, `${after.stdout}${after.stderr}`).toBe(0);
  });
});
