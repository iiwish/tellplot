export type SitePage = 'home' | 'examples' | 'docs' | 'playground' | 'not-found';

export interface SiteRoute {
  readonly page: SitePage;
}

function normalizePath(pathname: string): string {
  if (pathname === '/') {
    return pathname;
  }
  return pathname.replace(/\/+$/, '');
}

/** Resolves the small static website surface without introducing a router dependency. */
export function resolveSiteRoute(url: URL): SiteRoute {
  const pathname = normalizePath(url.pathname);
  if (pathname === '/') {
    return { page: 'home' };
  }
  if (pathname === '/examples') {
    return { page: 'examples' };
  }
  if (pathname === '/docs') {
    return { page: 'docs' };
  }
  if (pathname === '/playground') {
    return { page: 'playground' };
  }
  return { page: 'not-found' };
}

export function siteTitleForRoute(route: SiteRoute): string {
  switch (route.page) {
    case 'home':
      return 'TellPlot | 可编辑基础图表';
    case 'examples':
      return '图表示例 | TellPlot';
    case 'docs':
      return '开发者文档 | TellPlot';
    case 'playground':
      return '在线编辑 | TellPlot';
    case 'not-found':
      return '页面不存在 | TellPlot';
  }
}

export function siteDescriptionForRoute(route: SiteRoute): string {
  switch (route.page) {
    case 'home':
      return 'TellPlot 是基于 AntV G2 的轻量、可嵌入、可编辑基础图表库。';
    case 'examples':
      return '浏览 TellPlot 已验证的瀑布图、分类柱状图和分类条形图示例。';
    case 'docs':
      return '了解 @tellplot/editor 的安装、数据合同、安全配置和导出能力。';
    case 'playground':
      return '实时编辑 TellPlot 公共图表配置与视图状态，并同步查看结构和图形变化。';
    case 'not-found':
      return '当前 TellPlot 页面不存在。';
  }
}
