import { useId, useRef, useState } from 'react';

type PanelRailTab = 'outline' | 'inspector';

interface PanelRailProps {
  readonly outline: React.ReactNode;
  readonly inspector: React.ReactNode;
  readonly outlineLabel: string;
  readonly inspectorLabel: string;
  readonly side: 'left' | 'right';
}

export function PanelRail({
  outline,
  inspector,
  outlineLabel,
  inspectorLabel,
  side,
}: PanelRailProps): React.JSX.Element | null {
  const railId = useId();
  const tabs = [
    ...(outline === null ? [] : (['outline'] as const)),
    ...(inspector === null ? [] : (['inspector'] as const)),
  ];
  const [activeTab, setActiveTab] = useState<PanelRailTab>(tabs[0] ?? 'outline');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 0) {
    return null;
  }

  const selectedTab = tabs.includes(activeTab) ? activeTab : tabs[0];

  if (tabs.length === 1) {
    const tab = tabs[0];
    const label = tab === 'outline' ? outlineLabel : inspectorLabel;
    return (
      <aside className="tp-static-panel tp-panel-rail-static" data-side={side} aria-label={label}>
        {tab === 'outline' ? outline : inspector}
      </aside>
    );
  }

  const selectTab = (tab: PanelRailTab, index: number): void => {
    setActiveTab(tab);
    tabRefs.current[index]?.focus();
  };

  const navigateTabs = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let target: number | undefined;
    if (event.key === 'ArrowRight') {
      target = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      target = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      target = 0;
    } else if (event.key === 'End') {
      target = tabs.length - 1;
    }
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    const tab = tabs[target];
    if (tab !== undefined) {
      selectTab(tab, target);
    }
  };

  return (
    <aside
      className="tp-static-panel tp-panel-rail-static tp-panel-rail-static--tabbed"
      data-side={side}
      aria-label={`${outlineLabel} / ${inspectorLabel}`}
    >
      <div
        className="tp-panel-tabs"
        role="tablist"
        aria-label={`${outlineLabel} / ${inspectorLabel}`}
      >
        {tabs.map((tab, index) => {
          const label = tab === 'outline' ? outlineLabel : inspectorLabel;
          const selected = tab === selectedTab;
          return (
            <button
              key={tab}
              ref={element => {
                tabRefs.current[index] = element;
              }}
              id={`${railId}-${tab}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${railId}-${tab}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab, index)}
              onKeyDown={event => navigateTabs(event, index)}
            >
              {label}
            </button>
          );
        })}
      </div>
      {tabs.map(tab => {
        const selected = tab === selectedTab;
        return (
          <div
            key={tab}
            id={`${railId}-${tab}-panel`}
            className="tp-panel-tab-content"
            role="tabpanel"
            aria-labelledby={`${railId}-${tab}-tab`}
            hidden={!selected}
          >
            {tab === 'outline' ? outline : inspector}
          </div>
        );
      })}
    </aside>
  );
}
