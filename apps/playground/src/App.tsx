import { useEffect, useMemo, useState } from 'react';

import { DocsPage } from './DocsPage';
import { ExampleWorkbench } from './ExampleWorkbench';
import { ExamplesPage } from './ExamplesPage';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';
import { SiteHeader } from './SiteHeader';
import { resolveSiteRoute, siteDescriptionForRoute, siteTitleForRoute } from './siteRouting';

function currentLocationKey(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
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
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', siteDescriptionForRoute(route));
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
      {route.page === 'playground' ? <ExampleWorkbench key={locationKey} /> : null}
      {route.page === 'not-found' ? <NotFoundPage onNavigate={navigate} /> : null}
    </div>
  );
}
