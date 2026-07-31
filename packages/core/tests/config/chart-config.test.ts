import { describe, expect, it } from 'vitest';

import {
  toFinancialChartAppearance,
  validateChartConfig,
  type ChartConfig,
} from '../../src/config/chartConfig';

const waterfallConfig = {
  type: 'waterfall',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'waterfall',
    datasetId: 'config-waterfall',
    currency: 'CNY',
    items: [
      { id: 'opening', label: '期初', amount: 100, kind: 'start' },
      { id: 'growth', label: '增长', amount: 20, kind: 'contribution' },
      { id: 'ending', label: '期末', amount: 120, kind: 'end' },
    ],
  },
  locale: 'zh-CN',
  height: 560,
  appearance: {
    title: '经营变动瀑布图',
    colors: {
      start: '#5F6B65',
      positive: '#168363',
      negative: '#D5524A',
      subtotal: '#315C8C',
      group: '#A46812',
      end: '#315C8C',
    },
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
    readOnly: false,
    historyLimit: 100,
    panels: { outline: true, inspector: true, toolbar: true },
    outline: { placement: 'right' },
    inspector: { mode: 'tabs' },
  },
} as const satisfies ChartConfig;

describe('public chart config', () => {
  it('accepts a closed declarative config without normalizing it into G2 options', () => {
    expect(validateChartConfig(waterfallConfig)).toEqual({
      ok: true,
      value: waterfallConfig,
      errors: [],
    });
    expect('g2Spec' in waterfallConfig).toBe(false);
  });

  it('accepts styled value and group labels while keeping the legacy string shorthand', () => {
    const configured = {
      ...waterfallConfig,
      appearance: {
        ...waterfallConfig.appearance,
        labels: {
          value: {
            display: 'always',
            placement: 'outside',
            offset: 8,
            color: '#102A43',
            fontSize: 13,
            fontWeight: 700,
            background: true,
            backgroundColor: '#FFFFFF',
            backgroundOpacity: 0.9,
          },
          group: {
            display: 'auto',
            placement: 'inside',
            offset: 6,
            color: '#7A4B00',
            fontSize: 12,
            fontWeight: 600,
            background: true,
            backgroundColor: '#FFF8E8',
            backgroundOpacity: 0.82,
          },
        },
      },
    } as const satisfies ChartConfig;

    expect(validateChartConfig(configured)).toEqual({
      ok: true,
      value: configured,
      errors: [],
    });
    expect(toFinancialChartAppearance(configured)).toMatchObject({
      valueLabels: 'always',
      valueLabelStyle: {
        placement: 'outside',
        offset: 8,
        color: '#102A43',
        fontSize: 13,
        fontWeight: 700,
        background: true,
        backgroundColor: '#FFFFFF',
        backgroundOpacity: 0.9,
      },
      groupRegion: {
        label: 'auto',
        labelStyle: {
          placement: 'inside',
          offset: 6,
          color: '#7A4B00',
          fontSize: 12,
          fontWeight: 600,
          background: true,
          backgroundColor: '#FFF8E8',
          backgroundOpacity: 0.82,
        },
      },
    });
  });

  it('rejects unsafe or out-of-range label style fields with precise paths', () => {
    expect(
      validateChartConfig({
        ...waterfallConfig,
        appearance: {
          ...waterfallConfig.appearance,
          labels: { value: { display: 'always', formatter: () => 'unsafe' } },
        },
      }),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'INVALID_CHART_CONFIG',
          reason: 'UNKNOWN_FIELD',
          path: '/appearance/labels/value/formatter',
        },
      ],
    });

    expect(
      validateChartConfig({
        ...waterfallConfig,
        appearance: {
          ...waterfallConfig.appearance,
          labels: {
            value: { fontSize: 7, offset: 25, backgroundOpacity: 2 },
          },
        },
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ path: '/appearance/labels/value/fontSize' }),
        expect.objectContaining({ path: '/appearance/labels/value/offset' }),
        expect.objectContaining({ path: '/appearance/labels/value/backgroundOpacity' }),
      ]),
    });
  });

  it('rejects unknown fields and invalid nested values with stable public paths', () => {
    expect(
      validateChartConfig({
        ...waterfallConfig,
        appearance: { ...waterfallConfig.appearance, g2Spec: { type: 'interval' } },
      }),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'INVALID_CHART_CONFIG',
          reason: 'UNKNOWN_FIELD',
          path: '/appearance/g2Spec',
        },
      ],
    });

    expect(
      validateChartConfig({
        ...waterfallConfig,
        appearance: {
          ...waterfallConfig.appearance,
          animation: { enabled: true, duration: 1_001 },
        },
      }),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'INVALID_CHART_CONFIG',
          reason: 'INVALID_TYPE',
          path: '/appearance/animation/duration',
        },
      ],
    });
  });

  it('rejects source families that conflict with the declared chart type', () => {
    expect(
      validateChartConfig({
        type: 'bar',
        data: waterfallConfig.data,
      }),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'SOURCE_CONFLICT',
          reason: 'INCOMPATIBLE_CHART_TYPE',
          path: '/type',
        },
      ],
    });
  });

  it('does not execute accessors from untrusted JavaScript input', () => {
    let accessed = false;
    const input = { type: 'waterfall', data: waterfallConfig.data };
    Object.defineProperty(input, 'appearance', {
      enumerable: true,
      get() {
        accessed = true;
        return {};
      },
    });

    expect(validateChartConfig(input)).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_CHART_CONFIG', reason: 'NON_PLAIN_DATA', path: '/appearance' }],
    });
    expect(accessed).toBe(false);
  });
});
