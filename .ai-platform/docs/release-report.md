# TellPlot 交付状态报告

## Metadata

- Version: 1.0.0
- Status: Not_Released
- Last updated: 2026-07-24
- Working branch: `codex/t112-categorical-data-contract`

## Current State

TellPlot 是基于 G2 的轻量可编辑基础图表库。G001 已验收；G002、G002-R1、G002-R2、G002-R3 与 G004
已完成实现并统一等待验收。`@tellplot/editor@1.0.0` 是通过本地发布门禁的稳定版候选，不是已经
发布到 npm 或 GitHub 的公开版本。当前包提供瀑布图、分类条形图和分类柱状图，以及共享数据/视图模型、
确定性命令、结构大纲、历史、持久化、安全语义配置、SVG/PNG 导出和无障碍支持。

公共 React 入口使用 `ChartEditor` 和判别式 `ChartConfig`。普通接入通过 `config.data`、
`config.appearance` 与 `config.editor` 声明图表；高级受控编辑状态使用独立 `ViewSpec`。playground
在桌面端默认显示左侧亮色公共配置、中央图表和右侧大纲/检查器，紧凑视口使用 dialog。左栏分别编辑
`tellplot.config.json` 和 `tellplot.view.json`，合法 JSON 经过公共校验后更新图形，右侧确定性命令只反向
更新视图文件；非法草稿不改变最后一次合法图表。

标签配置支持字符串显示策略简写和对象式 value/group 配置。对象式配置提供显示、内外位置、有限偏移、
颜色、字号、字重和可选背景，并由同一 G2 spec 用于屏幕、SVG 与 PNG。移动端 `auto` 主动控制密度，
`always` 保留显式覆盖；formatter、逐项 callback、无效碰撞开关和 raw G2 spec 不进入公共合同。

本地网站提供真实图表驱动的 TellPlot 首页、当前三个图表家族的可搜索示例中心、开发者文档入口和连续
在线工作台。首页采用高留白产品舞台，示例中心采用可扩展分类侧栏与等权真实图表网格；首页与示例预览
直接消费 `ChartEditor`。网站内容目录保持在 playground，未形成核心 chart registry。站点支持
直接 URL、浏览器前进/后退、移动导航、分类筛选和准确页面元数据。

G2 继续独占图形渲染、场景边界、事件和动画。TellPlot 不包含 Dashboard、第二渲染引擎或通用图表
plugin registry。

## Accepted Scope

- T101-T108：瀑布图端到端基础能力、包质量和真实浏览器验证。
- T109：TellPlot 品牌与独立仓库迁移。
- T110：长期文档与 `FinancialChartAppearance` 安全语义配置。
- T111-T115：分类数据合同、bar/column projection、X/Y 交互、编辑器、导出与可访问性。
- T116：chart-family ownership、shared G2 screen/export runtime 和多图表架构收敛。

## Needs Review Scope

- G002 / T117：Beta 公共 API、package README/LICENSE、developer docs、tarball 与双向开发者编辑器。
- G002-R1 / T118：分组上下文、跨层拖拽、自动解散和展开分组区域。
- G002-R2 / T119：真实图表首页、示例中心、开发者文档入口、连续工作台与响应式视觉体验。
- G002-R3 / T122：`ChartEditor`、`ChartConfig`、运行时配置校验、config/view 双文件工作台与迁移文档。
- G004 / T123：1.0.0 稳定合同、维护文档、架构/发布审计、隔离源码复演与本地 tarball。

## Blocked Release Goal

- G005：等待 G002 系列与 G004 目标级验收，以及 remote Git、visibility、deploy、DNS、tag、
  GitHub Release 和 npm publish 的逐类明确授权。

## Validation Evidence

- Node 22.20.0 下的 `pnpm release:check` 完整通过；聚合门禁覆盖 architecture、release audit、
  format、lint、typecheck、coverage、build、package、React matrix、current E2E、a11y、performance、
  previous-browser matrix 和 isolated-source rehearsal。
- unit/coverage：52 files / 448 tests；statements 85.68%、branches 80.41%、functions 88.16%、
  lines 85.83%，受约束的 domain、waterfall、categorical 和 G2 runtime 门禁保持 95% 以上。
- current Chromium/Firefox/WebKit：177/177；accessibility：45/45。
- previous Playwright release：177/177；WebKit 18.4：59/59。
- React 18.3.1 / 19.2.7、ESM/CJS/types、compile-checked quickstart 与 package checks 通过。
- 200-item performance：waterfall p95 69.4ms；categorical p95 69.6ms；预算 150ms。
- architecture audit：48 个源码文件、243 条 import edge、0 个 runtime cycle；release audit：
  11 个 runtime export、19 个公开文件、306 个源码与交付记录文件。
- 隔离源码复演：285 个源码文件，frozen install、architecture、audit、typecheck、448 个 unit、
  build 与 package 全部通过。
- 官方 npm registry 生产依赖审计无已知漏洞；package `publishConfig` 固定 public access 与
  `https://registry.npmjs.org/`。
- tarball 为 `@tellplot/editor@1.0.0`，仅包含 13 个 dist/metadata/README/LICENSE 文件；
  485037 bytes，SHA-256 为 `359ea2910a881c8f1f09c211b0173617be6a85337ccb699a11d76483100dd7c9`。
- strict artifact validator、format、lint、typecheck、build、release audit 和 diff checks 通过。

详细结果和残余风险见 `.ai-platform/evidence/T117/`、`.ai-platform/evidence/T118/`、
`.ai-platform/evidence/T119/`、`.ai-platform/evidence/T122/` 与 `.ai-platform/evidence/T123/`。

## Known Limitations

- 1.0 候选与发布复核修复位于本地工作分支；没有 push、PR 或 merge。
- `@tellplot/editor@1.0.0` 只完成本地稳定候选验证，npm publish、GitHub Release 和正式部署未执行。
- playground build 存在既有 G2 chunk size warning；当前没有用户价值证据支持拆分或替换 G2。
- 200-item performance 继续保留 150ms 阻断预算和真实浏览器监测，不弱化预算。
- GitHub 私有仓库计划无法强制 branch protection/rulesets；服务端 required checks 仍受外部计划限制。
- 当前未包含生产网站部署；未来 history URL 托管需要配置 SPA fallback。
- 网站文档是可扫描入口；生产托管、SPA fallback 和公开链接验证归入 G005。
- npm 官方 registry 发布身份尚未授权，仓库公开、域名、GitHub Release 与 npm publish 仍属于
  G005 的独立远程闸门。

## Next Gate

统一验收 G002、G002-R1、G002-R2、G002-R3 与 G004。验收后可单独审批 G005；远程 Git、仓库公开、
网站部署、DNS、Git tag、GitHub Release 和 npm publish 继续保持独立闸门。
