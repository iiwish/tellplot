import { ArrowUpRight, Menu, SquareTerminal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { SitePage } from './siteRouting';
import { SiteLink } from './SiteLink';

const NAV_ITEMS = [
  { page: 'examples', href: '/examples', label: '示例' },
  { page: 'docs', href: '/docs', label: '文档' },
] as const;

const MOBILE_NAV_ITEMS = [
  ...NAV_ITEMS,
  { page: 'playground', href: '/playground', label: '在线编辑' },
] as const;

export interface SiteHeaderProps {
  readonly page: SitePage;
  readonly onNavigate: (href: string) => void;
}

function GitHubMark(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

export function SiteHeader({ page, onNavigate }: SiteHeaderProps): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }
    const closeMenu = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };
    document.addEventListener('keydown', closeMenu);
    return () => document.removeEventListener('keydown', closeMenu);
  }, [mobileOpen]);

  const navigateAndClose = (href: string): void => {
    setMobileOpen(false);
    onNavigate(href);
  };

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <SiteLink className="site-brand" href="/" onNavigate={onNavigate} ariaLabel="TellPlot 首页">
          <span className="site-brand__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <strong>TellPlot</strong>
          <span className="site-brand__version">1.0</span>
        </SiteLink>

        <nav className="site-desktop-nav" aria-label="主导航">
          {NAV_ITEMS.map(item => (
            <SiteLink
              key={item.page}
              href={item.href}
              current={page === item.page}
              onNavigate={onNavigate}
            >
              {item.label}
            </SiteLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <a
            className="site-header__github"
            href="https://github.com/iiwish/tellplot"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在 GitHub 查看 TellPlot"
            title="在 GitHub 查看 TellPlot"
          >
            <GitHubMark />
          </a>

          <SiteLink
            className="site-header__workbench"
            href="/playground"
            current={page === 'playground'}
            onNavigate={onNavigate}
          >
            <SquareTerminal size={16} aria-hidden="true" />
            <span>打开工作台</span>
          </SiteLink>
        </div>

        <button
          ref={menuButtonRef}
          className="site-mobile-menu-button"
          type="button"
          aria-label={mobileOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-controls="site-mobile-navigation"
          aria-expanded={mobileOpen}
          title={mobileOpen ? '关闭导航菜单' : '打开导航菜单'}
          onClick={() => setMobileOpen(open => !open)}
        >
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      <nav
        className="site-mobile-nav"
        id="site-mobile-navigation"
        aria-label="移动导航"
        hidden={!mobileOpen}
      >
        {MOBILE_NAV_ITEMS.map(item => (
          <SiteLink
            key={item.page}
            href={item.href}
            current={page === item.page}
            onNavigate={navigateAndClose}
          >
            <span>{item.label}</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </SiteLink>
        ))}
      </nav>
    </header>
  );
}
