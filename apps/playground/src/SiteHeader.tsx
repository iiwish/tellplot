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

        <SiteLink
          className="site-header__workbench"
          href="/playground"
          current={page === 'playground'}
          onNavigate={onNavigate}
        >
          <SquareTerminal size={16} aria-hidden="true" />
          <span>打开工作台</span>
        </SiteLink>

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
