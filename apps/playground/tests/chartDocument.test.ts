import { describe, expect, it } from 'vitest';

import type { ChartConfig, ViewSpec } from '@tellplot/editor';

import {
  parsePlaygroundChartConfig,
  parsePlaygroundView,
  serializePlaygroundChartConfig,
  serializePlaygroundView,
} from '../src/chartDocument';

const configFixture = {
  type: 'waterfall',
  data: {
    schemaVersion: '1.0.0',
    datasetId: 'live-editor-test',
    currency: 'CNY',
    items: [
      { id: 'opening', label: '期初', amount: 100, kind: 'start' },
      { id: 'growth', label: '增长', amount: 20, kind: 'contribution' },
      { id: 'ending', label: '期末', amount: 120, kind: 'end' },
    ],
  },
  appearance: {
    title: '实时图表',
    colors: { positive: '#168363', negative: '#D5524A' },
    axes: { category: true, value: true },
    labels: { value: 'auto', group: 'auto' },
    tooltip: true,
    animation: { enabled: true, duration: 160 },
    groupRegion: { enabled: true, opacity: 0.06 },
    numberFormat: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      currencyDisplay: 'narrowSymbol',
    },
  },
  editor: {
    panels: { outline: true, inspector: true, toolbar: true },
    outline: { placement: 'right' },
    inspector: { mode: 'tabs' },
  },
} as const satisfies ChartConfig;

const viewFixture = {
  schemaVersion: '1.0.0',
  chartType: 'waterfall',
  datasetId: 'live-editor-test',
  revision: 0,
  rootOrder: ['growth'],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
} as const satisfies ViewSpec;

describe('playground public files', () => {
  it('round-trips the public ChartConfig without a private document wrapper', () => {
    const text = serializePlaygroundChartConfig(configFixture);

    expect(text).toContain('{"id":"opening","label":"期初","amount":100,"kind":"start"}');
    expect(text).toContain('"colors": {"positive":"#168363","negative":"#D5524A"}');
    expect(text.split('\n').length).toBeLessThan(40);
    expect(text).not.toContain('documentVersion');
    expect(text).not.toContain('viewSpec');
    expect(parsePlaygroundChartConfig(text)).toEqual({ ok: true, value: configFixture });
  });

  it('round-trips ViewSpec separately and checks it against the active config', () => {
    const text = serializePlaygroundView(viewFixture);

    expect(parsePlaygroundView(text, configFixture)).toEqual({
      ok: true,
      value: viewFixture,
    });
    expect(
      parsePlaygroundView(JSON.stringify({ ...viewFixture, chartType: 'column' }), configFixture),
    ).toMatchObject({
      ok: false,
      error: { code: 'SOURCE_CONFLICT', path: '/chartType' },
    });
  });

  it('reports malformed JSON and public config validation paths', () => {
    expect(parsePlaygroundChartConfig('{')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_JSON', path: '/' },
    });
    expect(
      parsePlaygroundChartConfig(
        JSON.stringify({
          ...configFixture,
          appearance: { ...configFixture.appearance, g2Spec: { type: 'interval' } },
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CHART_CONFIG', path: '/appearance/g2Spec' },
    });
  });
});
