import { type IndexableSitePage, siteMetadataForPage } from './siteMetadata';

export type SitePage = IndexableSitePage | 'not-found';

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
  if (route.page === 'not-found') {
    return '页面不存在 | TellPlot';
  }
  return siteMetadataForPage(route.page).title;
}

export function siteDescriptionForRoute(route: SiteRoute): string {
  if (route.page === 'not-found') {
    return '当前 TellPlot 页面不存在。';
  }
  return siteMetadataForPage(route.page).description;
}
