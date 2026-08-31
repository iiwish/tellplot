import { useEffect, useMemo, useState } from 'react';

import { DocsPage } from './DocsPage';
import { ExampleWorkbench } from './ExampleWorkbench';
import { ExamplesPage } from './ExamplesPage';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';
import { SiteHeader } from './SiteHeader';
import { SITE_ORIGIN, siteMetadataForPage } from './siteMetadata';
import { resolveSiteRoute, siteDescriptionForRoute, siteTitleForRoute } from './siteRouting';

function currentLocationKey(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function setMetaContent(selector: string, content: string): void {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

export function App(): React.JSX.Element {
  const [locationKey, setLocationKey] = useState(currentLocationKey);
  const route = useMemo(
    () => resolveSiteRoute(new URL(locationKey, window.location.origin)),
    [locationKey],
  );

  useEffect(() => {
    const updateLocation = (): void => setLocationKey(currentLocationKey());
    window.addEventListener('popstate', updateLocation);
    return () => window.removeEventListener('popstate', updateLocation);
  }, []);

  useEffect(() => {
    document.title = siteTitleForRoute(route);
    setMetaContent('meta[name="description"]', siteDescriptionForRoute(route));

    if (route.page === 'not-found') {
      const currentUrl = new URL(window.location.pathname, SITE_ORIGIN).href;
      document
        .querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.setAttribute('href', currentUrl);
      setMetaContent('meta[name="robots"]', 'noindex, follow');
      setMetaContent('meta[property="og:title"]', siteTitleForRoute(route));
      setMetaContent('meta[property="og:description"]', siteDescriptionForRoute(route));
      setMetaContent('meta[property="og:url"]', currentUrl);
      setMetaContent('meta[name="twitter:title"]', siteTitleForRoute(route));
      setMetaContent('meta[name="twitter:description"]', siteDescriptionForRoute(route));
      return;
    }

    const metadata = siteMetadataForPage(route.page);
    document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute('href', metadata.canonicalUrl);
    setMetaContent('meta[name="robots"]', 'index, follow');
    setMetaContent('meta[property="og:title"]', metadata.title);
    setMetaContent('meta[property="og:description"]', metadata.description);
    setMetaContent('meta[property="og:url"]', metadata.canonicalUrl);
    setMetaContent('meta[name="twitter:title"]', metadata.title);
    setMetaContent('meta[name="twitter:description"]', metadata.description);
  }, [route]);

  const navigate = (href: string): void => {
    const next = new URL(href, window.location.origin);
    const nextKey = `${next.pathname}${next.search}${next.hash}`;
    if (nextKey !== currentLocationKey()) {
      window.history.pushState(null, '', nextKey);
      setLocationKey(nextKey);
    }
    window.requestAnimationFrame(() => {
      if (next.hash.length > 1) {
        document.querySelector(next.hash)?.scrollIntoView();
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    });
  };

  return (
    <div className="site-app" data-route={route.page}>
      <SiteHeader key={route.page} page={route.page} onNavigate={navigate} />
      {route.page === 'home' ? <HomePage /> : null}
      {route.page === 'examples' ? <ExamplesPage onNavigate={navigate} /> : null}
      {route.page === 'docs' ? <DocsPage onNavigate={navigate} /> : null}
      {route.page === 'playground' ? (
        <ExampleWorkbench key={locationKey} onNavigate={navigate} />
      ) : null}
      {route.page === 'not-found' ? <NotFoundPage onNavigate={navigate} /> : null}
    </div>
  );
}
