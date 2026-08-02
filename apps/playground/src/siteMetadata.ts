export const SITE_ORIGIN = 'https://tellplot.com';

export interface SiteMetadata {
  readonly path: '/' | '/examples' | '/docs' | '/playground';
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: string;
}

export const SITE_METADATA = {
  home: {
    path: '/',
    title: 'TellPlot | 可编辑基础图表',
    description: 'TellPlot 是基于 AntV G2 的轻量、可嵌入、可编辑基础图表库。',
    canonicalUrl: `${SITE_ORIGIN}/`,
  },
  examples: {
    path: '/examples',
    title: '图表示例 | TellPlot',
    description: '浏览 TellPlot 已验证的瀑布图、分类柱状图和分类条形图示例。',
    canonicalUrl: `${SITE_ORIGIN}/examples`,
  },
  docs: {
    path: '/docs',
    title: '开发者文档 | TellPlot',
    description: '了解 tellplot 的安装、数据合同、安全配置和导出能力。',
    canonicalUrl: `${SITE_ORIGIN}/docs`,
  },
  playground: {
    path: '/playground',
    title: '在线编辑 | TellPlot',
    description: '实时编辑 TellPlot 公共图表配置与视图状态，并同步查看结构和图形变化。',
    canonicalUrl: `${SITE_ORIGIN}/playground`,
  },
} as const satisfies Record<string, SiteMetadata>;

export type IndexableSitePage = keyof typeof SITE_METADATA;

export function siteMetadataForPage(page: IndexableSitePage): SiteMetadata {
  return SITE_METADATA[page];
}
