import { ArrowRight, Search, X } from 'lucide-react';
import { useState } from 'react';

import {
  EXAMPLE_CATALOG,
  type ShowcaseExample,
  type ShowcaseExampleCategory,
} from './exampleCatalog';
import { ShowcaseChart } from './ShowcaseChart';
import { SiteFooter } from './SiteFooter';
import { SiteLink } from './SiteLink';

type ExampleFilter = 'all' | ShowcaseExampleCategory;

const EXAMPLE_FILTERS: readonly {
  readonly id: ExampleFilter;
  readonly label: string;
  readonly description: string;
}[] = [
  { id: 'all', label: '全部图表', description: '当前已验证的全部图表' },
  { id: 'financial', label: '财务图表', description: '起点、贡献、小计与终点' },
  {
    id: 'categorical',
    label: '分类比较',
    description: '单序列与 2 至 4 序列的纵向或横向比较',
  },
] as const;

function matchesSearch(example: ShowcaseExample, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  if (normalizedQuery.length === 0) {
    return true;
  }
  return [example.title, example.shortTitle, example.eyebrow, ...example.tags].some(value =>
    value.toLocaleLowerCase('zh-CN').includes(normalizedQuery),
  );
}

export function ExamplesPage({
  onNavigate,
}: {
  readonly onNavigate: (href: string) => void;
}): React.JSX.Element {
  const [filter, setFilter] = useState<ExampleFilter>('all');
  const [query, setQuery] = useState('');
  const visibleExamples = EXAMPLE_CATALOG.filter(
    example => (filter === 'all' || example.category === filter) && matchesSearch(example, query),
  );
  const activeFilter = EXAMPLE_FILTERS.find(candidate => candidate.id === filter);

  return (
    <>
      <main className="site-main site-examples" aria-label="TellPlot 图表示例">
        <header className="site-example-library-header">
          <div>
            <span className="site-kicker">Examples</span>
            <h1>图表示例</h1>
            <p>浏览真实运行的 TellPlot 图表，选择示例即可进入在线编辑。</p>
          </div>
          <label className="site-example-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">搜索图表示例</span>
            <input
              type="search"
              placeholder="搜索图表"
              value={query}
              onChange={event => setQuery(event.currentTarget.value)}
            />
            {query.length > 0 ? (
              <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}>
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </label>
        </header>

        <div className="site-example-browser">
          <aside className="site-example-sidebar">
            <strong>图表类型</strong>
            <nav aria-label="筛选图表示例">
              {EXAMPLE_FILTERS.map(option => {
                const count =
                  option.id === 'all'
                    ? EXAMPLE_CATALOG.length
                    : EXAMPLE_CATALOG.filter(example => example.category === option.id).length;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={filter === option.id}
                    title={option.description}
                    onClick={() => setFilter(option.id)}
                  >
                    <span>{option.label}</span>
                    <small>{count}</small>
                  </button>
                );
              })}
            </nav>
            <div className="site-example-sidebar__note">
              <strong>基于 G2</strong>
              <p>示例直接运行真实组件，不使用静态缩略图。</p>
            </div>
          </aside>

          <section className="site-example-results" aria-label="已验证图表示例">
            <header className="site-example-results__header">
              <div>
                <h2>{activeFilter?.label ?? '图表示例'}</h2>
                <p>{activeFilter?.description}</p>
              </div>
              <span aria-live="polite">{visibleExamples.length} 个示例</span>
            </header>

            {visibleExamples.length > 0 ? (
              <div className="site-example-grid">
                {visibleExamples.map(example => (
                  <article
                    key={example.id}
                    className="site-example-card"
                    data-accent={example.accent}
                  >
                    <div className="site-example-card__preview">
                      <ShowcaseChart exampleId={example.id} compact />
                      <SiteLink
                        className="site-example-card__open"
                        href={example.workbenchHref}
                        ariaLabel={`打开${example.title}工作台`}
                        onNavigate={onNavigate}
                      >
                        打开工作台 <ArrowRight size={15} aria-hidden="true" />
                      </SiteLink>
                    </div>
                    <div className="site-example-card__body">
                      <div>
                        <small>{example.eyebrow}</small>
                        <h3>{example.title}</h3>
                      </div>
                      <p>{example.description}</p>
                      <div
                        className="site-example-card__tags"
                        aria-label={`${example.title}能力标签`}
                      >
                        {example.tags.map(tag => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="site-example-empty" role="status">
                <Search size={24} aria-hidden="true" />
                <h3>没有匹配的图表</h3>
                <p>尝试搜索“瀑布图”“实际与预算”或清空当前筛选。</p>
                <button
                  type="button"
                  onClick={() => {
                    setFilter('all');
                    setQuery('');
                  }}
                >
                  查看全部图表
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="site-example-next" aria-labelledby="example-next-title">
          <div>
            <span>持续扩展</span>
            <h2 id="example-next-title">从真实需求增加下一组图表</h2>
          </div>
          <p>
            每个新增图表都会一起完成数据合同、交互、导出和浏览器验证，而不是只增加一张静态演示图。
          </p>
          <SiteLink className="site-button site-button--quiet" href="/docs" onNavigate={onNavigate}>
            了解设计边界 <ArrowRight size={16} aria-hidden="true" />
          </SiteLink>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
