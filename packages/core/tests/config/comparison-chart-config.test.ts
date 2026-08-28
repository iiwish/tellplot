import { describe, expect, it } from 'vitest';

import {
  toFinancialChartAppearance,
  validateChartConfig,
  viewMatchesChartConfig,
  type CategoricalComparisonChartConfig,
} from '../../src';

const comparisonConfig = {
  type: 'column',
  data: {
    schemaVersion: '3.0.0',
    dataKind: 'categorical',
    datasetId: 'comparison-config',
    series: [
      { id: 'actual', label: 'Actual' },
      { id: 'budget', label: 'Budget' },
    ],
    items: [
      {
        id: 'revenue',
        label: 'Revenue',
        values: [
          { seriesId: 'actual', amount: 120 },
          { seriesId: 'budget', amount: 100 },
        ],
      },
    ],
  },
  appearance: {
    colors: {
      series: [
        { seriesId: 'budget', color: '#D55E00' },
        { seriesId: 'actual', color: '#0072B2' },
      ],
      group: '#A46812',
    },
    legend: true,
  },
} as const satisfies CategoricalComparisonChartConfig;

describe('comparison chart config', () => {
  it('accepts schema 3 config and preserves caller identity', () => {
    expect(validateChartConfig(comparisonConfig)).toEqual({
      ok: true,
      value: comparisonConfig,
      errors: [],
    });
    expect(
      viewMatchesChartConfig(
        {
          schemaVersion: '3.0.0',
          datasetId: 'comparison-config',
          chartType: 'column',
          revision: 0,
          rootOrder: ['revenue'],
          groups: {},
          collapsedGroupIds: [],
          pinnedItemIds: [],
          annotations: {},
          emphasis: {},
        },
        comparisonConfig,
      ),
    ).toBe(true);
  });

  it('validates comparison legend and series color overrides atomically', () => {
    expect(
      validateChartConfig({
        ...comparisonConfig,
        appearance: { ...comparisonConfig.appearance, legend: 'yes' },
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_CHART_CONFIG',
          reason: 'INVALID_TYPE',
          path: '/appearance/legend',
        }),
      ]),
    });

    expect(
      validateChartConfig({
        ...comparisonConfig,
        appearance: {
          colors: {
            series: [
              { seriesId: 'actual', color: '#0072B2' },
              { seriesId: 'actual', color: '#D55E00' },
              { seriesId: 'forecast', color: '#009E73' },
            ],
          },
        },
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_CHART_CONFIG',
          reason: 'DUPLICATE_SERIES_COLOR',
          path: '/appearance/colors/series/1/seriesId',
          message: 'Series color may be configured only once.',
          details: { index: 1, firstIndex: 0 },
        }),
        expect.objectContaining({
          code: 'SOURCE_CONFLICT',
          reason: 'UNKNOWN_SERIES_REFERENCE',
          path: '/appearance/colors/series/2/seriesId',
        }),
      ]),
    });

    expect(
      validateChartConfig({
        ...comparisonConfig,
        appearance: { colors: { positive: '#12B76A', start: '#315C8C' } },
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          reason: 'UNKNOWN_FIELD',
          path: '/appearance/colors/positive',
        }),
        expect.objectContaining({
          reason: 'UNKNOWN_FIELD',
          path: '/appearance/colors/start',
        }),
      ]),
    });
  });

  it('rejects sparse and non-plain series color arrays without executing accessors', () => {
    const sparse: unknown[] = [];
    sparse.length = 2;
    sparse[0] = { seriesId: 'actual', color: '#0072B2' };
    expect(
      validateChartConfig({
        ...comparisonConfig,
        appearance: { colors: { series: sparse } },
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          reason: 'INVALID_TYPE',
          path: '/appearance/colors/series/1',
        }),
      ]),
    });

    let getterCalls = 0;
    const entry = { seriesId: 'actual' };
    Object.defineProperty(entry, 'color', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return '#0072B2';
      },
    });
    expect(
      validateChartConfig({
        ...comparisonConfig,
        appearance: { colors: { series: [entry] } },
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          reason: 'NON_PLAIN_DATA',
          path: '/appearance/colors/series/0/color',
        }),
      ]),
    });
    expect(getterCalls).toBe(0);
  });

  it('prefixes source failures and omits business values from issues', () => {
    const result = validateChartConfig({
      ...comparisonConfig,
      data: {
        ...comparisonConfig.data,
        series: [comparisonConfig.data.series[0]],
      },
    });
    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_SOURCE_DATA',
          reason: 'INVALID_SERIES_COUNT',
          path: '/data/series',
          details: { minimum: 2, maximum: 4, actualCount: 1 },
        }),
      ]),
    });
    expect(JSON.stringify(result)).not.toContain('Actual');
    expect(JSON.stringify(result)).not.toContain('Budget');
  });

  it('preserves embedded source ownership for hostile comparison data', () => {
    const hostileData = new Proxy(comparisonConfig.data, {
      getPrototypeOf() {
        throw new Error('private comparison payload');
      },
    });

    const result = validateChartConfig({ type: 'column', data: hostileData });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'INVALID_SOURCE_DATA',
          reason: 'UNREADABLE_INPUT',
          message: 'Input cannot be inspected safely.',
          path: '/data',
          details: {},
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('private comparison payload');
  });

  it('maps common comparison appearance while materializing the tooltip default', () => {
    expect(toFinancialChartAppearance(comparisonConfig)).toMatchObject({
      palette: { group: '#A46812' },
      tooltip: true,
    });
    expect(
      toFinancialChartAppearance({ ...comparisonConfig, appearance: { tooltip: false } }),
    ).toMatchObject({ tooltip: false });
    expect(toFinancialChartAppearance({ ...comparisonConfig, appearance: undefined })).toEqual({
      tooltip: true,
    });
  });

  it('keeps v2 colors and legend closed', () => {
    const scalarData = {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: 'scalar-config',
      items: [{ id: 'revenue', label: 'Revenue', amount: 120 }],
    } as const;
    expect(
      validateChartConfig({
        type: 'column',
        data: scalarData,
        appearance: { legend: true, colors: { series: [] } },
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ reason: 'UNKNOWN_FIELD', path: '/appearance/legend' }),
        expect.objectContaining({ reason: 'UNKNOWN_FIELD', path: '/appearance/colors/series' }),
      ]),
    });
  });
});
