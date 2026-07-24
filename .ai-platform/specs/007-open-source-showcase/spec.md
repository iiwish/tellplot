# G002-R2 开源官网与示例中心 Spec

## Metadata

- Feature ID: `007-open-source-showcase`
- Goal ID: `G002-R2`
- Version: 0.1.0
- Status: Confirmed
- Last updated: 2026-07-23
- Approval: 用户于 2026-07-23 明确批准并要求继续实现 G002-R2

## Goal

把薄参考编辑器扩展为可持续承载 TellPlot 品牌、真实图表示例、开发者文档入口和在线工作台的开源官网。
网站继续直接消费 `@tellplot/editor`，不复制图表领域逻辑，不改变核心包、公共 API、schema 或 G2 ownership。

## User Outcomes

- 访问首页即可理解 TellPlot 是基于 G2 的轻量可编辑基础图表库，并看到真实可交互图表。
- 开发者可以浏览当前已验证的 waterfall、column 和 bar 示例，并进入对应实时配置工作台。
- 现有双向公共配置/视图编辑、结构编辑、导入和导出能力完整保留。
- 开发者可以从网站进入快速开始、配置边界、编辑模型和导出说明。
- 后续新增图表只需增加 playground 内容目录和示例页面，不进入核心 chart registry。

## Requirements

### SHOWCASE-FR-001 网站壳

提供 TellPlot 品牌导航、首页、示例中心、文档入口和在线工作台。桌面导航常驻，移动端使用可访问菜单；
内部导航支持浏览器前进/后退与直接 URL。

### SHOWCASE-FR-002 真实产品首页

首页 H1 为 `TellPlot`，首屏以真实 `ChartEditor` 图表作为主视觉，不使用装饰性插画替代产品。
用户可以在 waterfall、column 和 bar 间切换，图形过渡由 G2 负责。首屏保留明确的示例与文档入口，并在
常见桌面和移动视口露出下一段内容线索。

### SHOWCASE-FR-003 可扩展示例中心

playground 维护显式、有限的示例内容目录，当前只包含已验证的三个图表类型。目录记录名称、说明、标签、
数据 fixture 和工作台 URL；它不导出到 `@tellplot/editor`，也不形成公共或内部通用图表插件协议。

### SHOWCASE-FR-004 工作台连续性

现有亮色双向配置编辑器、中间 G2 图表、右侧 panel rail、导入、导出和错误草稿行为迁移到
`/playground`。当前 E2E 覆盖的所有编辑、分组、导出、可访问性和性能行为保持一致。

### SHOWCASE-FR-005 开发者文档入口

网站提供安装、最小 React 接入、数据与视图分离、配置边界和导出能力的可扫描入口，并链接到在线工作台。
代码示例继续使用当前 beta 公共 API；网站不建设独立 Markdown runtime、版本服务或搜索后端。

### SHOWCASE-FR-006 响应式信息架构

首页、示例中心和文档在 `390x844`、`768x1024`、`1440x900` 和宽屏视口均无重叠、截断或横向溢出。
工作台窄屏继续使用现有按需代码对话面板。网站导航、图表家族选择、示例链接和文档锚点具有键盘路径和
清晰焦点。

## Non-Functional Requirements

- SHOWCASE-NFR-001：不新增、删除或升级 runtime/dev dependency。
- SHOWCASE-NFR-002：TypeScript strict；禁止 `any`、`@ts-ignore`、`@ts-expect-error`。
- SHOWCASE-NFR-003：G2 独占图形动画；网站微交互只使用 CSS transform/opacity，并遵循 reduced motion。
- SHOWCASE-NFR-004：网站使用现有 Vite/React/CSS/lucide 工具链；不引入 router、docs 或 animation 框架。
- SHOWCASE-NFR-005：核心包不发起网络请求，网站不增加远程数据、分析、字体或图片请求。
- SHOWCASE-NFR-006：现有 unit、package、React、current/previous browser、a11y 和 performance 门禁不得弱化。
- SHOWCASE-NFR-007：站点页面具有准确 title、description、landmark、heading 和可访问名称。

## Non-Goals

- 新图表类型、多序列、Dashboard、AI、数据准备或服务端工作流。
- 公共 ChartPlugin registry、示例目录公共化、原始 G2Spec 或 chart instance 暴露。
- 新 router、文档站、动画、状态、图标或语法高亮依赖。
- 登录、搜索服务、在线保存、遥测、远程内容或协作。
- npm publish、GitHub Release、push、PR、merge、tag 或网站部署。

## Success Criteria

- SHOWCASE-SC-001：首页首屏在桌面和移动端明确显示 TellPlot、真实图表和主操作，图表家族切换可用。
- SHOWCASE-SC-002：示例中心只显示当前三个已验证图表，所有入口打开正确 fixture 与 chart type。
- SHOWCASE-SC-003：`/playground` 保留双向编辑、结构命令、导入导出、非法草稿和响应式面板行为。
- SHOWCASE-SC-004：文档页覆盖安装、React 接入、source/view、配置和导出，并与 beta 公共 API 一致。
- SHOWCASE-SC-005：桌面/移动视觉检查、导航 E2E、axe、全量 release-candidate gates 全部通过，无 unresolved
  Critical、High 或 Medium finding。

## Approval Gate

用户已批准 G002-R2 的网站范围和连续执行方式。目标内内部任务不设置逐项用户验收；dependency、公共 API、
schema、远程 Git、publish、release 和部署仍需独立明确授权。
