export type ShowcaseExampleId =
  'waterfall' | 'column' | 'bar' | 'comparison-column' | 'comparison-bar';
export type ShowcaseChartType = 'waterfall' | 'column' | 'bar';
export type ShowcaseExampleCategory = 'financial' | 'categorical';

export interface ShowcaseExample {
  readonly id: ShowcaseExampleId;
  readonly ordinal: string;
  readonly chartType: ShowcaseChartType;
  readonly category: ShowcaseExampleCategory;
  readonly title: string;
  readonly shortTitle: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly detail: string;
  readonly tags: readonly string[];
  readonly fixtureSearch: string;
  readonly workbenchHref: string;
  readonly accent: 'emerald' | 'blue' | 'coral';
}

/** Website-only content catalog. It is intentionally not a chart runtime registry. */
export const EXAMPLE_CATALOG: readonly ShowcaseExample[] = [
  {
    id: 'waterfall',
    ordinal: '01',
    chartType: 'waterfall',
    category: 'financial',
    title: '经营变动瀑布图',
    shortTitle: '瀑布图',
    eyebrow: 'Waterfall',
    description: '用鲜明的增长、成本和利润锚点解释经营结果如何形成。',
    detail: '清晰展示增长驱动、成本回落、递归分组和确定性合计。',
    tags: ['增长桥接', '分组', '利润锚点'],
    fixtureSearch: '',
    workbenchHref: '/playground',
    accent: 'emerald',
  },
  {
    id: 'column',
    ordinal: '02',
    chartType: 'column',
    category: 'categorical',
    title: '分类柱状图',
    shortTitle: '柱状图',
    eyebrow: 'Column',
    description: '用更清晰的量级节奏比较收入来源与关键投入。',
    detail: '共享排序、固定、分组和 ViewSpec，不复制命令内核。',
    tags: ['分类比较', '纵向', '正负值'],
    fixtureSearch: '?fixture=categorical-column',
    workbenchHref: '/playground?fixture=categorical-column',
    accent: 'blue',
  },
  {
    id: 'bar',
    ordinal: '03',
    chartType: 'bar',
    category: 'categorical',
    title: '分类条形图',
    shortTitle: '条形图',
    eyebrow: 'Bar',
    description: '横向扫描业务项目的正负规模，长标签依然清晰。',
    detail: '由 G2 transpose 负责方向转换，交互读取真实分类轴边界。',
    tags: ['分类比较', '横向', '长标签'],
    fixtureSearch: '?fixture=categorical-bar',
    workbenchHref: '/playground?fixture=categorical-bar',
    accent: 'coral',
  },
  {
    id: 'comparison-column',
    ordinal: '04',
    chartType: 'column',
    category: 'categorical',
    title: '实际与预算柱状图',
    shortTitle: '多序列柱状图',
    eyebrow: 'Comparison column',
    description: '在同一分类下并排比较实际与预算，差异、正负值和序列顺序一眼可见。',
    detail: '2 至 4 个只读序列共享 category 排序、分组、折叠、Tooltip、导出和无障碍语义。',
    tags: ['实际与预算', '2–4 序列', '分组柱状图'],
    fixtureSearch: '?fixture=comparison-actual-budget',
    workbenchHref: '/playground?fixture=comparison-actual-budget',
    accent: 'blue',
  },
  {
    id: 'comparison-bar',
    ordinal: '05',
    chartType: 'bar',
    category: 'categorical',
    title: '实际与预算条形图',
    shortTitle: '多序列条形图',
    eyebrow: 'Comparison bar',
    description: '用横向分组条形扫描多序列业务差异，长分类名称也保持完整可读。',
    detail: 'series 保持 source 顺序且不可单独编辑，完整 category 始终是唯一叙事原子。',
    tags: ['业务比较', '共享 Tooltip', '横向长标签'],
    fixtureSearch: '?fixture=comparison-actual-budget-bar',
    workbenchHref: '/playground?fixture=comparison-actual-budget-bar',
    accent: 'coral',
  },
] as const;

export function exampleById(id: ShowcaseExampleId): ShowcaseExample {
  const example = EXAMPLE_CATALOG.find(candidate => candidate.id === id);
  if (example === undefined) {
    throw new Error(`Unknown showcase example: ${id}`);
  }
  return example;
}
