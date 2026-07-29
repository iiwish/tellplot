import { ArrowLeft } from 'lucide-react';

import { SiteLink } from './SiteLink';

export function NotFoundPage({
  onNavigate,
}: {
  readonly onNavigate: (href: string) => void;
}): React.JSX.Element {
  return (
    <main className="site-not-found" aria-labelledby="not-found-title">
      <span>404 / ROUTE_NOT_FOUND</span>
      <h1 id="not-found-title">页面不存在</h1>
      <p>这个地址不在当前 TellPlot 网站结构中。</p>
      <SiteLink className="site-button site-button--primary" href="/" onNavigate={onNavigate}>
        <ArrowLeft size={17} aria-hidden="true" />
        返回首页
      </SiteLink>
    </main>
  );
}
