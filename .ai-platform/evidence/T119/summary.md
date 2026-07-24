# T119 开源官网与示例中心交付摘要

## Metadata

- Goal: `G002-R2`
- Task: `T119`
- Packet: `EP-G002-R2-A001`
- Status: `Needs_Review`
- Date: 2026-07-23
- Branch: `codex/t112-categorical-data-contract`

## Outcome

TellPlot 本地网站提供四个连续入口：

- `/`：以真实 `FinancialChartEditor` 为主视觉的产品首页，可切换 waterfall、column 和 bar。
- `/examples`：以分类侧栏、搜索和等权真实图表网格收录三个已验证图表家族。
- `/docs`：安装、React 接入、SourceData/ViewSpec、配置边界和导出入口。
- `/playground`：完整保留亮色双向图表文档、G2 图形、结构大纲、检查器与导入导出工作流。

站点使用现有 React、Vite、CSS、lucide 与 `@tellplot/editor`，未新增依赖、图表家族、远程内容或
runtime registry。核心包、公共 API、schema 和命令协议不在 T119 diff 中。

## Requirement Results

- SHOWCASE-SC-001：桌面与移动首屏显示 TellPlot、真实图表、主操作和下一章节线索；家族切换通过。
- SHOWCASE-SC-002：示例目录严格为 waterfall、column、bar，分类、搜索、入口 fixture 与图表类型一致。
- SHOWCASE-SC-003：既有工作台迁移至 `/playground`，两次完整 current-browser E2E 均为 176/177；
  同一既有 WebKit 导航用例隔离复跑 1/1 通过。
- SHOWCASE-SC-004：文档覆盖 beta 安装、接入、数据/视图、配置和导出。
- SHOWCASE-SC-005：桌面/移动视觉、axe、浏览器、package、React、性能与静态门禁全部通过。

## TDD Receipt

- RED：站点内容测试因 `exampleCatalog` 不存在失败；浏览器测试因首页缺少 `TellPlot` H1 失败。
- GREEN：最小路由壳、网站页面、真实图表预览与 `/playground` 连续工作台通过 focused tests。
- REFACTOR：原工作台提取为 `ExampleWorkbench`，内容目录和 history 路由保持 playground-only。
- VISUAL CORRECTION：以 ECharts 的产品定位清晰度和 G2 的示例浏览结构为意图参考，重做首页留白、
  导航、搜索、分类侧栏、等权图表网格与亮色视觉系统；未复制品牌资产或引入远程素材。

## Visual Evidence

- [桌面首页](visual/home-desktop.png)
- [桌面首页首屏](visual/home-first-viewport.png)
- [桌面示例中心](visual/examples-desktop.png)
- [桌面示例首屏](visual/examples-first-viewport.png)
- [移动首页](visual/home-mobile.png)
- [移动示例中心](visual/examples-mobile.png)
- [移动文档](visual/docs-mobile.png)
- [移动工作台](visual/playground-mobile.png)

## Diff Evidence

- Baseline manifest: 338 files；SHA-256
  `0440f851c6553fa2d0ffe916776c11639134a44e329b8904d8cf779fe31391e4`
- Task-only patch: [diff.patch](diff.patch)
- Patch scope: 40 files；4977 insertions；456 deletions
- Patch SHA-256: `31d788a106a974c7abd9c2c2e823ffc935fd73d184e5c4dad70068270384e041`
- Reverse apply check: passed

## Delivery Boundary

未执行 stage、commit、push、PR、merge、npm publish、release 或网站部署。G002-R2 / T119 的实现、
review 和门禁均已完成，状态为 `Needs_Review`，与 G002、G002-R1、G002-R3 统一等待用户目标级验收。
T119 当时的完整矩阵保留一个已隔离通过的低风险 WebKit 导航超时；后续 T122 完整矩阵已 177/177 通过。
