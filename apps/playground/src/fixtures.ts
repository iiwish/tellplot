import type { SourceData } from 'tellplot';

const financialFixture = {
  schemaVersion: '1.0.0',
  datasetId: '2026-h1-operating-profit-bridge',
  currency: 'CNY',
  items: [
    { id: 'opening-profit', label: '期初营业利润', amount: 3_200, kind: 'start' },
    { id: 'sales-volume', label: '销量增长', amount: 980, kind: 'contribution' },
    { id: 'price-impact', label: '价格提升', amount: 540, kind: 'contribution' },
    { id: 'product-mix', label: '产品结构', amount: 260, kind: 'contribution' },
    { id: 'material-cost', label: '原材料成本', amount: -720, kind: 'contribution' },
    { id: 'freight-cost', label: '运输费用', amount: -250, kind: 'contribution' },
    { id: 'labor-cost', label: '人工成本', amount: -320, kind: 'contribution' },
    { id: 'operating-subtotal', label: '经营利润小计', amount: 3_690, kind: 'subtotal' },
    { id: 'exchange-impact', label: '汇率影响', amount: -110, kind: 'contribution' },
    { id: 'tax-impact', label: '所得税影响', amount: -210, kind: 'contribution' },
    { id: 'one-off-income', label: '一次性收益', amount: 70, kind: 'contribution' },
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

const categoricalFixture = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: '2026-h1-category-performance',
  currency: 'CNY',
  items: [
    { id: 'enterprise', label: '企业订阅', amount: 1_680 },
    { id: 'consumer', label: '个人订阅', amount: 1_220 },
    { id: 'services', label: '专业服务', amount: 860 },
    { id: 'marketplace', label: '应用市场', amount: 590 },
    { id: 'support', label: '客户支持投入', amount: -380 },
    { id: 'infrastructure', label: '基础设施投入', amount: -690 },
    { id: 'research', label: '研发投入', amount: -980 },
    { id: 'other', label: '其他经营项目', amount: 260 },
  ],
} as const satisfies SourceData;

const emptyCategoricalFixture = {
  ...categoricalFixture,
  datasetId: 'empty-category-performance',
  items: [],
} as const satisfies SourceData;

const invalidCategoricalFixture = {
  ...categoricalFixture,
  datasetId: 'invalid-category-performance',
  items: categoricalFixture.items.map(item =>
    item.id === 'infrastructure' ? { ...item, amount: Number.POSITIVE_INFINITY } : item,
  ),
} satisfies SourceData;

const categoricalPerformanceFixture = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'categorical-performance-200',
  currency: 'CNY',
  items: Array.from({ length: 200 }, (_, index) => ({
    id: `category-${String(index + 1).padStart(3, '0')}`,
    label: `分类项目 ${String(index + 1).padStart(3, '0')}`,
    amount: (index % 2 === 0 ? 1 : -1) * (300 + (index % 11) * 45),
  })),
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
  if (fixture === 'categorical-column' || fixture === 'categorical-bar') {
    return categoricalFixture;
  }
  if (fixture === 'categorical-empty') {
    return emptyCategoricalFixture;
  }
  if (fixture === 'categorical-invalid') {
    return invalidCategoricalFixture;
  }
  if (fixture === 'categorical-performance') {
    return categoricalPerformanceFixture;
  }
  return financialFixture;
}

/** Keeps fixture selection out of the editor while allowing an explicit horizontal layout. */
export function getPlaygroundChartType(search: string): 'bar' | undefined {
  return new URLSearchParams(search).get('fixture') === 'categorical-bar' ? 'bar' : undefined;
}
