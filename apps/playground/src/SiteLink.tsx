import type { MouseEvent, ReactNode } from 'react';

export interface SiteLinkProps {
  readonly href: string;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly current?: boolean;
  readonly onNavigate: (href: string) => void;
  readonly children: ReactNode;
}

export function SiteLink({
  href,
  className,
  ariaLabel,
  current = false,
  onNavigate,
  children,
}: SiteLinkProps): React.JSX.Element {
  const navigate = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onNavigate(href);
  };

  return (
    <a
      className={className}
      href={href}
      aria-label={ariaLabel}
      aria-current={current ? 'page' : undefined}
      onClick={navigate}
    >
      {children}
    </a>
  );
}
