import type { SourceData } from '@tellplot/core';

export const financialSourceData = {
  schemaVersion: '1.0.0',
  datasetId: 'profit-bridge-2026-q1',
  currency: 'CNY',
  items: [
    {
      id: 'opening-profit',
      label: '期初利润',
      amount: 1_000,
      kind: 'start',
      sourceRef: 'ledger:opening',
      metadata: { audited: true, period: '2026-Q1' },
    },
    {
      id: 'revenue-growth',
      label: '收入增长',
      amount: 320.5,
      kind: 'contribution',
      sourceRef: 'ledger:revenue',
    },
    {
      id: 'cost-pressure',
      label: '成本压力',
      amount: -140.25,
      kind: 'contribution',
      sourceRef: 'ledger:cost',
    },
    {
      id: 'operating-profit',
      label: '经营利润',
      amount: 1_180.25,
      kind: 'subtotal',
      sourceRef: 'ledger:operating-profit',
    },
    {
      id: 'tax-impact',
      label: '税务影响',
      amount: -80.25,
      kind: 'contribution',
      sourceRef: 'ledger:tax',
    },
    {
      id: 'ending-profit',
      label: '期末利润',
      amount: 1_100,
      kind: 'end',
      sourceRef: 'ledger:ending',
    },
  ],
} as const satisfies SourceData;

export const anchorsOnlySourceData = {
  schemaVersion: '1.0.0',
  datasetId: 'anchors-only',
  items: [
    { id: 'start', label: '起点', amount: 0, kind: 'start' },
    { id: 'end', label: '终点', amount: 0, kind: 'end' },
  ],
} as const satisfies SourceData;
