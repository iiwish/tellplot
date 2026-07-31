import { ArrowRight, Braces, Database, Download, Palette } from 'lucide-react';

import { DEMO_WATERFALL_COLORS } from './demoPresentation';
import { SiteFooter } from './SiteFooter';
import { SiteLink } from './SiteLink';

const MINIMAL_REACT_EXAMPLE = `import type { ChartConfig } from '@tellplot/core';
import { ChartEditor } from '@tellplot/react';
import '@tellplot/react/styles.css';

const config = {
  type: 'waterfall',
  data: sourceData,
  height: 680,
  locale: 'zh-CN',
} as const satisfies ChartConfig;

export function ProfitBridge() {
  return <ChartEditor config={config} onViewChange={saveView} />;
}`;

const APPEARANCE_EXAMPLE = `appearance: {
  colors: {
    start: '${DEMO_WATERFALL_COLORS.start}',
    positive: '${DEMO_WATERFALL_COLORS.positive}',
    negative: '${DEMO_WATERFALL_COLORS.negative}',
    subtotal: '${DEMO_WATERFALL_COLORS.subtotal}',
    group: '${DEMO_WATERFALL_COLORS.group}',
    end: '${DEMO_WATERFALL_COLORS.end}',
  },
  labels: {
    value: {
      display: 'auto',
      placement: 'outside',
      offset: 6,
      color: '#172B4D',
      fontSize: 12,
      fontWeight: 600,
    },
    group: 'never',
  },
}`;

const DOC_SECTIONS = [
  { href: '#installation', label: '安装' },
  { href: '#react', label: 'React 接入' },
  { href: '#model', label: 'SourceData 与 ViewSpec' },
  { href: '#appearance', label: '安全配置边界' },
  { href: '#export', label: '导出' },
] as const;

export function DocsPage({
  onNavigate,
}: {
  readonly onNavigate: (href: string) => void;
}): React.JSX.Element {
  return (
    <>
      <main className="site-main site-docs" aria-label="TellPlot 开发者文档">
        <header className="site-page-intro site-page-intro--docs">
          <p className="site-kicker">DEVELOPER GUIDE · 1.0</p>
          <h1>开发者文档</h1>
          <p>
            用类型化数据和有限语义配置接入真实业务图表。TellPlot 管理编辑状态与 G2
            生命周期，宿主继续拥有数据、权限和保存策略。
          </p>
        </header>

        <div className="site-docs-layout">
          <nav className="site-docs-nav" aria-label="文档目录">
            <span>本页目录</span>
            {DOC_SECTIONS.map(section => (
              <a key={section.href} href={section.href}>
                {section.label}
              </a>
            ))}
          </nav>

          <article className="site-docs-content">
            <section id="installation">
              <header>
                <Braces size={20} aria-hidden="true" />
                <span>01</span>
                <h2>安装</h2>
              </header>
              <p>
                <code>@tellplot/core</code> 提供领域能力，<code>@tellplot/editor</code> 提供 DOM/G2
                runtime，<code>@tellplot/react</code> 只负责 React 生命周期。
              </p>
              <pre>
                <code>
                  pnpm add @tellplot/core @tellplot/editor @tellplot/react @antv/g2@5.4.8 react
                  react-dom
                </code>
              </pre>
            </section>

            <section id="react">
              <header>
                <Braces size={20} aria-hidden="true" />
                <span>02</span>
                <h2>React 接入</h2>
              </header>
              <p>
                引入组件与样式即可渲染。未传入 <code>view</code> 时，组件创建确定的初始视图。
              </p>
              <pre>
                <code>{MINIMAL_REACT_EXAMPLE}</code>
              </pre>
              <SiteLink className="site-text-link" href="/playground" onNavigate={onNavigate}>
                在实时工作台查看完整文档 <ArrowRight size={16} aria-hidden="true" />
              </SiteLink>
            </section>

            <section id="model">
              <header>
                <Database size={20} aria-hidden="true" />
                <span>03</span>
                <h2>SourceData 与 ViewSpec</h2>
              </header>
              <div className="site-docs-comparison">
                <div>
                  <strong>SourceData</strong>
                  <p>宿主持有的金额、标签、稳定 ID 和来源关系。图表编辑动作不会直接修改它。</p>
                </div>
                <div>
                  <strong>ViewSpec</strong>
                  <p>顺序、分组、折叠、注释和强调。它可校验、持久化、撤销并确定性恢复。</p>
                </div>
              </div>
            </section>

            <section id="appearance">
              <header>
                <Palette size={20} aria-hidden="true" />
                <span>04</span>
                <h2>安全配置边界</h2>
              </header>
              <p>
                <code>config.appearance</code>{' '}
                允许标题、语义色、坐标轴、标签、Tooltip、数字格式、动画与展开分组区域。数据、encode、
                稳定 key、事件和 G2 instance 始终由内部 adapter 管理。
              </p>
              <pre>
                <code>{APPEARANCE_EXAMPLE}</code>
              </pre>
              <p>
                颜色可以按增长、减少、锁定锚点和分组分别设置。标签支持显示策略、内外位置、偏移、
                颜色、字号、字重和可选背景；数值格式由 <code>numberFormat</code> 管理。任意
                formatter、逐数据项回调和原始 G2 配置仍不开放。
              </p>
              <div className="site-docs-callout">
                <strong>为什么不透传 G2Spec？</strong>
                <span>任意 merge 会破坏稳定命中、导出一致性和公共 API 的可演进性。</span>
              </div>
            </section>

            <section id="export">
              <header>
                <Download size={20} aria-hidden="true" />
                <span>05</span>
                <h2>导出</h2>
              </header>
              <p>
                通过组件 ref 导出 SVG 或 PNG，通过 <code>serializeViewSpec</code> 保存视图
                JSON。屏幕与图像导出共享同一投影、顺序、分组区域和值标签语义。
              </p>
            </section>
          </article>

          <aside className="site-docs-meta" aria-label="当前版本信息">
            <span>CURRENT CHANNEL</span>
            <strong>1.0.0</strong>
            <dl>
              <div>
                <dt>React</dt>
                <dd>18 / 19</dd>
              </div>
              <div>
                <dt>Schema</dt>
                <dd>1.0 / 2.0</dd>
              </div>
              <div>
                <dt>Renderer</dt>
                <dd>G2 5</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
