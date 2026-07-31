import { Braces, Check, Copy, FileJson2, PackageOpen, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { ChartConfig, ViewSpec } from '@tellplot/core';

import { writeClipboard } from './clipboard';
import { DEMO_WATERFALL_COLORS } from './demoPresentation';
import { LiveChartEditor } from './LiveChartEditor';

const INSTALL_CODE =
  'pnpm add @tellplot/core @tellplot/editor @tellplot/react @antv/g2@5.4.8 react react-dom';

const REACT_CODE = `import { ChartEditor } from '@tellplot/react';
import '@tellplot/react/styles.css';
import { sourceData } from './profit-bridge.data';

const config = {
  type: 'waterfall',
  data: sourceData,
} as const;

export function ProfitBridge() {
  return <ChartEditor config={config} />;
}`;

const APPEARANCE_CODE = `import { ChartEditor } from '@tellplot/react';
import { sourceData } from './profit-bridge.data';

const config = {
  type: 'waterfall',
  data: sourceData,
  appearance: {
    title: '经营变动瀑布图',
    colors: {
      start: '${DEMO_WATERFALL_COLORS.start}',
      positive: '${DEMO_WATERFALL_COLORS.positive}',
      negative: '${DEMO_WATERFALL_COLORS.negative}',
      subtotal: '${DEMO_WATERFALL_COLORS.subtotal}',
      group: '${DEMO_WATERFALL_COLORS.group}',
      end: '${DEMO_WATERFALL_COLORS.end}',
    },
    labels: {
      value: { display: 'auto', placement: 'outside', offset: 6 },
      group: 'never',
    },
    groupRegion: { enabled: true, opacity: 0.08 },
  },
} as const;

export function ProfitBridge() {
  return <ChartEditor config={config} />;
}`;

const GUIDE_TABS = [
  {
    id: 'install',
    label: '安装',
    icon: PackageOpen,
    code: INSTALL_CODE,
    copyLabel: '复制安装命令',
  },
  {
    id: 'react',
    label: 'React',
    icon: Braces,
    code: REACT_CODE,
    copyLabel: '复制 React 代码',
  },
  {
    id: 'appearance',
    label: '配置',
    icon: SlidersHorizontal,
    code: APPEARANCE_CODE,
    copyLabel: '复制配置代码',
  },
] as const;

type GuideTabId = (typeof GUIDE_TABS)[number]['id'];
type DeveloperView = 'live' | 'examples';
type CopyState = 'idle' | 'copied' | 'failed';

interface UsageGuideProps {
  readonly id: string;
  readonly variant: 'panel' | 'dialog';
  readonly config: ChartConfig | null;
  readonly view: ViewSpec | null;
  readonly onApplyConfig: (config: ChartConfig) => void;
  readonly onApplyView: (view: ViewSpec) => void;
  readonly onClose: () => void;
}

export function UsageGuide({
  id,
  variant,
  config,
  view,
  onApplyConfig,
  onApplyView,
  onClose,
}: UsageGuideProps): React.JSX.Element {
  const [developerView, setDeveloperView] = useState<DeveloperView>('live');
  const [activeTab, setActiveTab] = useState<GuideTabId>('install');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const developerViewRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const copyResetRef = useRef<number | undefined>(undefined);
  const selectedTab = GUIDE_TABS.find(tab => tab.id === activeTab) ?? GUIDE_TABS[0];

  useEffect(() => {
    if (variant !== 'dialog') {
      return undefined;
    }
    const dialog = dialogRef.current;
    if (dialog === null) {
      return undefined;
    }
    dialog.showModal();
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [variant]);

  useEffect(
    () => () => {
      if (copyResetRef.current !== undefined) {
        window.clearTimeout(copyResetRef.current);
      }
    },
    [],
  );

  const selectTab = (tabId: GuideTabId): void => {
    setActiveTab(tabId);
    setCopyState('idle');
  };

  const selectDeveloperView = (view: DeveloperView): void => {
    setDeveloperView(view);
    setCopyState('idle');
  };

  const navigateDeveloperViews = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    const views: readonly DeveloperView[] = ['live', 'examples'];
    let target: number | undefined;
    if (event.key === 'ArrowRight') {
      target = (index + 1) % views.length;
    } else if (event.key === 'ArrowLeft') {
      target = (index - 1 + views.length) % views.length;
    } else if (event.key === 'Home') {
      target = 0;
    } else if (event.key === 'End') {
      target = views.length - 1;
    }
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    const view = views[target];
    if (view !== undefined) {
      selectDeveloperView(view);
      developerViewRefs.current[target]?.focus();
    }
  };

  const navigateTabs = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let target: number | undefined;
    if (event.key === 'ArrowRight') {
      target = (index + 1) % GUIDE_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      target = (index - 1 + GUIDE_TABS.length) % GUIDE_TABS.length;
    } else if (event.key === 'Home') {
      target = 0;
    } else if (event.key === 'End') {
      target = GUIDE_TABS.length - 1;
    }
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    const tab = GUIDE_TABS[target];
    if (tab !== undefined) {
      selectTab(tab.id);
      tabRefs.current[target]?.focus();
    }
  };

  const copySelectedCode = async (): Promise<void> => {
    if (copyResetRef.current !== undefined) {
      window.clearTimeout(copyResetRef.current);
    }
    try {
      await writeClipboard(selectedTab.code);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    copyResetRef.current = window.setTimeout(() => setCopyState('idle'), 1800);
  };

  const content = (
    <div className="playground-usage-content">
      <header className="playground-usage-header">
        <div>
          <h2 id={`${id}-title`}>在项目中使用 TellPlot</h2>
          <code>{developerView === 'live' ? 'tellplot.config.json' : '@tellplot/react'}</code>
        </div>
        <button
          ref={closeButtonRef}
          className="playground-icon-button"
          type="button"
          aria-label="关闭使用说明"
          title="关闭"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="playground-developer-tabs" role="tablist" aria-label="开发者工具">
        {(
          [
            { id: 'live', label: '实时配置', icon: FileJson2 },
            { id: 'examples', label: '接入示例', icon: Braces },
          ] as const
        ).map((view, index) => {
          const Icon = view.icon;
          const selected = view.id === developerView;
          return (
            <button
              key={view.id}
              ref={element => {
                developerViewRefs.current[index] = element;
              }}
              id={`${id}-developer-tab-${view.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-developer-panel-${view.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectDeveloperView(view.id)}
              onKeyDown={event => navigateDeveloperViews(event, index)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{view.label}</span>
            </button>
          );
        })}
      </div>

      {developerView === 'live' ? (
        <LiveChartEditor
          id={`${id}-developer-panel-live`}
          labelledBy={`${id}-developer-tab-live`}
          config={config}
          view={view}
          onApplyConfig={onApplyConfig}
          onApplyView={onApplyView}
        />
      ) : (
        <section
          id={`${id}-developer-panel-examples`}
          className="playground-usage-examples"
          role="tabpanel"
          aria-labelledby={`${id}-developer-tab-examples`}
        >
          <div className="playground-usage-tabs" role="tablist" aria-label="使用方式">
            {GUIDE_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  ref={element => {
                    tabRefs.current[index] = element;
                  }}
                  id={`${id}-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${id}-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(tab.id)}
                  onKeyDown={event => navigateTabs(event, index)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <section
            id={`${id}-panel-${selectedTab.id}`}
            className="playground-code-panel"
            role="tabpanel"
            aria-labelledby={`${id}-tab-${selectedTab.id}`}
            tabIndex={0}
          >
            <div className="playground-code-panel__toolbar">
              <span>{selectedTab.label}</span>
              <div className="playground-copy-control">
                <span
                  className="playground-copy-status"
                  role="status"
                  aria-label="代码复制状态"
                  aria-live="polite"
                >
                  {copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : ''}
                </span>
                <button
                  className="playground-icon-button playground-icon-button--code"
                  type="button"
                  aria-label={selectedTab.copyLabel}
                  title={selectedTab.copyLabel}
                  onClick={() => void copySelectedCode()}
                >
                  {copyState === 'copied' ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <Copy size={17} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <pre tabIndex={0} aria-label={`${selectedTab.label}代码`}>
              <code>{selectedTab.code}</code>
            </pre>
          </section>
        </section>
      )}
    </div>
  );

  if (variant === 'panel') {
    return (
      <aside id={id} className="playground-usage-sidebar" aria-labelledby={`${id}-title`}>
        {content}
      </aside>
    );
  }

  return (
    <dialog
      id={id}
      ref={dialogRef}
      className="playground-usage-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {content}
    </dialog>
  );
}
