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

const comparisonPerformanceFixture = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'comparison-performance-200x2',
  currency: 'CNY',
  series: [
    { id: 'comparison-perf-series-1', label: '基准序列甲' },
    { id: 'comparison-perf-series-2', label: '基准序列乙' },
  ],
  items: Array.from({ length: 200 }, (_, index) => ({
    id: `comparison-perf-${String(index + 1).padStart(3, '0')}`,
    label: `性能分类 ${String(index + 1).padStart(3, '0')}`,
    values: [
      {
        seriesId: 'comparison-perf-series-1',
        amount: 450 + (index % 17) * 37,
      },
      {
        seriesId: 'comparison-perf-series-2',
        amount: 360 + (index % 13) * 29,
      },
    ],
  })),
} satisfies SourceData;

const responsiveSeriesIds = [
  'responsive-series-1',
  'responsive-series-2',
  'responsive-series-3',
  'responsive-series-4',
] as const;

function createResponsiveComparisonFixture(locale: 'zh-CN' | 'en-US'): SourceData {
  const labels =
    locale === 'zh-CN'
      ? ['方案甲', '方案乙', '方案丙', '方案丁']
      : ['Scenario A', 'Scenario B', 'Scenario C', 'Scenario D'];
  return {
    schemaVersion: '3.0.0',
    dataKind: 'categorical',
    datasetId: `comparison-responsive-50x4-${locale}`,
    currency: 'CNY',
    series: responsiveSeriesIds.map((id, index) => ({ id, label: labels[index] ?? id })),
    items: Array.from({ length: 50 }, (_, index) => ({
      id: `responsive-category-${String(index + 1).padStart(3, '0')}`,
      label:
        locale === 'zh-CN'
          ? `分类项目第${String(index + 1).padStart(3, '0')}号样本项`
          : `Comparison category ${String(index + 1).padStart(3, '0')}${index === 0 ? 'x' : ''}`,
      values: responsiveSeriesIds.map((seriesId, seriesIndex) => ({
        seriesId,
        amount: 320 + seriesIndex * 85 + (index % 9) * 24,
      })),
    })),
  };
}

const comparisonResponsiveZhFixture = createResponsiveComparisonFixture('zh-CN');
const comparisonResponsiveEnFixture = createResponsiveComparisonFixture('en-US');

const actualVersusBudgetFixture = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: '2026-actual-versus-budget',
  currency: 'CNY',
  series: [
    { id: 'actual', label: '实际' },
    { id: 'budget', label: '预算' },
  ],
  items: [
    {
      id: 'enterprise',
      label: '企业业务',
      values: [
        { seriesId: 'actual', amount: 1_680 },
        { seriesId: 'budget', amount: 1_540 },
      ],
    },
    {
      id: 'consumer',
      label: '消费者业务',
      values: [
        { seriesId: 'actual', amount: 1_120 },
        { seriesId: 'budget', amount: 1_260 },
      ],
    },
    {
      id: 'services',
      label: '专业服务',
      values: [
        { seriesId: 'actual', amount: 860 },
        { seriesId: 'budget', amount: 820 },
      ],
    },
    {
      id: 'investment',
      label: '新增投入',
      values: [
        { seriesId: 'actual', amount: -520 },
        { seriesId: 'budget', amount: -460 },
      ],
    },
  ],
} as const satisfies SourceData;

const fourSeriesFixture = {
  ...actualVersusBudgetFixture,
  datasetId: '2026-business-line-scenarios',
  series: [
    { id: 'actual', label: '实际' },
    { id: 'budget', label: '预算' },
    { id: 'forecast', label: '预测' },
    { id: 'stretch', label: '挑战目标' },
  ],
  items: actualVersusBudgetFixture.items.map((item, index) => ({
    ...item,
    values: [
      ...item.values,
      { seriesId: 'forecast', amount: (item.values[0]?.amount ?? 0) + (index + 1) * 35 },
      { seriesId: 'stretch', amount: (item.values[1]?.amount ?? 0) + (index + 1) * 80 },
    ],
  })),
} satisfies SourceData;

const emptyComparisonFixture = {
  ...actualVersusBudgetFixture,
  datasetId: 'empty-actual-versus-budget',
  items: [],
} as const satisfies SourceData;

const allZeroComparisonFixture = {
  ...actualVersusBudgetFixture,
  datasetId: 'all-zero-actual-versus-budget',
  items: actualVersusBudgetFixture.items.map(item => ({
    ...item,
    values: item.values.map(value => ({ ...value, amount: 0 })),
  })),
} satisfies SourceData;

const allZeroFourSeriesFixture = {
  ...fourSeriesFixture,
  datasetId: 'all-zero-business-line-scenarios',
  items: fourSeriesFixture.items.map(item => ({
    ...item,
    values: item.values.map(value => ({ ...value, amount: 0 })),
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
  if (fixture === 'comparison-performance') {
    return comparisonPerformanceFixture;
  }
  if (fixture === 'comparison-responsive-zh') {
    return comparisonResponsiveZhFixture;
  }
  if (fixture === 'comparison-responsive-en') {
    return comparisonResponsiveEnFixture;
  }
  if (fixture === 'comparison-actual-budget' || fixture === 'comparison-actual-budget-bar') {
    return actualVersusBudgetFixture;
  }
  if (fixture === 'comparison-four-series') {
    return fourSeriesFixture;
  }
  if (fixture === 'comparison-empty') {
    return emptyComparisonFixture;
  }
  if (fixture === 'comparison-all-zero') {
    return allZeroComparisonFixture;
  }
  if (fixture === 'comparison-four-series-zero') {
    return allZeroFourSeriesFixture;
  }
  return financialFixture;
}

/** Keeps fixture selection out of the editor while allowing an explicit horizontal layout. */
export function getPlaygroundChartType(search: string): 'bar' | undefined {
  const fixture = new URLSearchParams(search).get('fixture');
  const chart = new URLSearchParams(search).get('chart');
  return fixture === 'categorical-bar' ||
    fixture === 'comparison-actual-budget-bar' ||
    chart === 'bar'
    ? 'bar'
    : undefined;
}
