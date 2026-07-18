import type { SourceData } from '@tellplot/editor';

const financialFixture = {
  schemaVersion: '1.0.0',
  datasetId: '2026-h1-operating-profit-bridge',
  currency: 'CNY',
  items: [
    { id: 'opening-profit', label: '期初营业利润', amount: 3_200, kind: 'start' },
    { id: 'sales-volume', label: '销量增长', amount: 860, kind: 'contribution' },
    { id: 'price-impact', label: '价格提升', amount: 420, kind: 'contribution' },
    { id: 'product-mix', label: '产品结构', amount: 160, kind: 'contribution' },
    { id: 'material-cost', label: '原材料成本', amount: -510, kind: 'contribution' },
    { id: 'freight-cost', label: '运输费用', amount: -180, kind: 'contribution' },
    { id: 'labor-cost', label: '人工成本', amount: -260, kind: 'contribution' },
    { id: 'operating-subtotal', label: '经营利润小计', amount: 3_690, kind: 'subtotal' },
    { id: 'exchange-impact', label: '汇率影响', amount: -90, kind: 'contribution' },
    { id: 'tax-impact', label: '所得税影响', amount: -240, kind: 'contribution' },
    { id: 'one-off-income', label: '一次性收益', amount: 80, kind: 'contribution' },
    { id: 'ending-profit', label: '期末净利润', amount: 3_440, kind: 'end' },
  ],
} as const satisfies SourceData;

const emptyFixture = {
  schemaVersion: '1.0.0',
  datasetId: 'empty-profit-bridge',
  currency: 'CNY',
  items: [
    { id: 'opening-profit', label: '期初利润', amount: 0, kind: 'start' },
    { id: 'ending-profit', label: '期末利润', amount: 0, kind: 'end' },
  ],
} as const satisfies SourceData;

const invalidFixture = {
  ...financialFixture,
  datasetId: 'invalid-profit-bridge',
  items: financialFixture.items.map(item =>
    item.id === 'material-cost' ? { ...item, amount: Number.POSITIVE_INFINITY } : item,
  ),
} satisfies SourceData;

const performanceContributions = Array.from({ length: 200 }, (_, index) => ({
  id: `perf-${String(index + 1).padStart(3, '0')}`,
  label: `性能贡献 ${String(index + 1).padStart(3, '0')}`,
  amount: index % 2 === 0 ? 600 : -600,
  kind: 'contribution' as const,
}));

const performanceFixture = {
  schemaVersion: '1.0.0',
  datasetId: 'interaction-performance-200',
  currency: 'CNY',
  items: [
    { id: 'performance-start', label: '性能期初', amount: 10_000, kind: 'start' },
    ...performanceContributions,
    { id: 'performance-end', label: '性能期末', amount: 10_000, kind: 'end' },
  ],
} satisfies SourceData;

/** Resolves deterministic visual fixtures without adding playground-only editor state. */
export function getPlaygroundFixture(search: string): SourceData {
  const fixture = new URLSearchParams(search).get('fixture');
  if (fixture === 'empty') {
    return emptyFixture;
  }
  if (fixture === 'invalid') {
    return invalidFixture;
  }
  if (fixture === 'performance') {
    return performanceFixture;
  }
  return financialFixture;
}
