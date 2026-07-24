import {
  ArrowDown,
  Braces,
  ChartNoAxesCombined,
  Check,
  Clipboard,
  Code2,
  Database,
  MousePointer2,
  Terminal,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { EXAMPLE_CATALOG, exampleById, type ShowcaseExampleId } from './exampleCatalog';
import { writeClipboard } from './clipboard';
import { ShowcaseChart } from './ShowcaseChart';
import { SiteFooter } from './SiteFooter';

const INSTALL_COMMAND = 'pnpm add @tellplot/editor @antv/g2';

const DATA_FLOW = [
  {
    id: 'source',
    label: 'SourceData',
    description: '宿主持有的不可变业务数据',
    icon: Database,
  },
  {
    id: 'command',
    label: 'Command',
    description: '点击、拖拽和键盘进入同一命令',
    icon: MousePointer2,
  },
  {
    id: 'view',
    label: 'ViewSpec',
    description: '顺序、分组与强调可保存、可重放',
    icon: Braces,
  },
  {
    id: 'render',
    label: 'G2',
    description: '同一投影负责屏幕、动画与导出',
    icon: ChartNoAxesCombined,
  },
] as const;

const CONFIG_EXAMPLE = `import { ChartEditor } from '@tellplot/editor';
import '@tellplot/editor/styles.css';
import { revenueData } from './revenue.data';

const config = {
  type: 'column',
  data: revenueData,
} as const;

export function RevenueChart() {
  return <ChartEditor config={config} />;
}`;
const CONFIG_LINES = CONFIG_EXAMPLE.split('\n');

export function HomePage(): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<ShowcaseExampleId>('waterfall');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [compactChart, setCompactChart] = useState(
    () =>
      typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 820px)').matches,
  );
  const selected = exampleById(selectedId);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const media = window.matchMedia('(max-width: 820px)');
    const syncCompactChart = (): void => setCompactChart(media.matches);
    syncCompactChart();
    media.addEventListener('change', syncCompactChart);
    return () => media.removeEventListener('change', syncCompactChart);
  }, []);

  useEffect(() => {
    if (copyState !== 'copied') {
      return undefined;
    }
    const timeout = window.setTimeout(() => setCopyState('idle'), 1600);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const copyInstall = async (): Promise<void> => {
    await writeClipboard(INSTALL_COMMAND);
    setCopyState('copied');
  };

  return (
    <>
      <main className="site-main site-home" aria-label="TellPlot 首页">
        <section className="site-home-hero" aria-labelledby="site-home-hero-title">
          <div className="site-home-hero__inner">
            <header className="site-home-hero__masthead">
              <div className="site-home-hero__brand">
                <p className="site-home-eyebrow">Editable charts, built on AntV G2</p>
                <h1 id="site-home-hero-title">TellPlot</h1>
              </div>
              <div className="site-home-hero__pitch">
                <p className="site-home-hero__lead">让图表不止被看见，也能被编辑。</p>
                <p>
                  面向 React 的轻量可编辑图表库。一份声明式配置，让排序、分组、撤销与导出保持一致。
                </p>
                <div className="site-home-hero__actions">
                  <a
                    className="site-button site-button--primary site-home-hero__jump"
                    href="#quick-start"
                  >
                    查看接入方式 <ArrowDown size={16} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </header>

            <div className="site-home-hero__stage" data-accent={selected.accent}>
              <div className="site-home-hero__stage-bar">
                <div className="site-home-hero__chart-meta" aria-live="polite">
                  <span>{selected.eyebrow}</span>
                  <strong>{selected.title}</strong>
                  <p>{selected.description}</p>
                </div>
                <div className="site-home-hero__selector" role="group" aria-label="选择图表家族">
                  {EXAMPLE_CATALOG.map(example => (
                    <button
                      key={example.id}
                      type="button"
                      aria-label={example.title}
                      aria-pressed={selectedId === example.id}
                      onClick={() => setSelectedId(example.id)}
                    >
                      <span>{example.ordinal}</span>
                      {example.shortTitle}
                    </button>
                  ))}
                </div>
              </div>
              <div className="site-home-hero__chart">
                <ShowcaseChart
                  key={`${selected.id}-${compactChart ? 'compact' : 'full'}`}
                  exampleId={selected.id}
                  compact={compactChart}
                  interactive
                  testId="showcase-chart"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          className="site-home-developer"
          id="quick-start"
          aria-labelledby="site-home-developer-title"
        >
          <div className="site-home-developer__inner">
            <div className="site-home-developer__copy">
              <p className="site-home-eyebrow">Quick start</p>
              <h2 id="site-home-developer-title">一个配置，直接开始</h2>
              <p className="site-home-developer__summary">
                安装依赖，复制右侧最小配置即可运行；外观和编辑选项可以按需添加。
              </p>

              <div className="site-home-install">
                <Terminal size={17} aria-hidden="true" />
                <code>{INSTALL_COMMAND}</code>
                <button
                  type="button"
                  aria-label="复制安装命令"
                  title="复制安装命令"
                  onClick={() => void copyInstall()}
                >
                  {copyState === 'copied' ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <Clipboard size={17} aria-hidden="true" />
                  )}
                </button>
                <span role="status" aria-live="polite">
                  {copyState === 'copied' ? '已复制' : ''}
                </span>
              </div>

              <ol className="site-home-developer__flow" aria-label="TellPlot 数据处理流程">
                {DATA_FLOW.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.id}>
                      <span className="site-home-developer__index">0{index + 1}</span>
                      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                      <span>
                        <strong>{step.label}</strong>
                        <small>{step.description}</small>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="site-home-code" aria-label="TellPlot 最小配置示例">
              <div className="site-home-code__header">
                <span>
                  <Code2 size={16} aria-hidden="true" />
                  RevenueChart.tsx
                </span>
                <small>React · TypeScript</small>
              </div>
              <pre tabIndex={0} aria-label="可横向滚动的 TypeScript 配置代码">
                <code>
                  {CONFIG_LINES.map((line, index) => (
                    <span key={`${index}-${line}`} data-line-number={index + 1}>
                      {line.length === 0 ? ' ' : line}
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
