# TellPlot 产品设计 SSOT

## Metadata

- Version: 1.4.0
- Status: Confirmed
- Last updated: 2026-08-12
- Approval: 用户已确认轻量可编辑基础图表库定位、框架无关编辑器架构、单包分发、首个公开稳定版、
  官网生产部署目标与 G003 多序列分类比较产品范围

## Product Positioning

TellPlot 是基于 AntV G2 的轻量、可嵌入、可编辑基础图表库。它面向需要稳定业务图表能力的 Web
应用，提供经过封装的数据合同、框架无关编辑器 runtime、直接操作、结构编辑、历史、导出和安全语义配置。

G2 是唯一图表渲染与图形动画引擎。TellPlot 不复制 G2 的绘制、场景图、比例尺或动画系统，也不以
替代 G2、建设通用 BI 平台或提供任意图表插件框架为目标。

已交付的内建图表为：

- 瀑布图。
- 单序列分类条形图。
- 单序列分类柱状图。

G003 已确认把分类条形图和分类柱状图扩展为 2 至 4 个序列的业务比较图。该扩展以 category 作为唯一
叙事编辑原子，以 series 作为只读比较维度，并采用本地 `tellplot@2.0.0` candidate 与 schema `3.0.0`。
精确公开 API/schema contract 已确认；技术 plan/TDR/work graph 与 runtime 实现保留后续审批闸门。

其他图表类型以明确的使用需求为输入，按图表家族逐步实现。项目不为尚未确认的图表提前增加
registry、通用 adapter 或公共扩展协议。

## Delivery Form

项目通过一个公共 `tellplot` 包交付框架无关核心、imperative 编辑器 runtime、React/Vue 薄适配和参考编辑器：

- `tellplot` 根入口提供数据、配置、命令、历史、投影、不变量、持久化与 `createEditor(container, options)`。
- `tellplot/core` 提供显式 core-only 入口；内部 core layer 不依赖 DOM、G2 或 UI 框架。
- `tellplot/react` 与 `tellplot/vue` 只映射宿主生命周期、属性、事件和实例方法，不拥有第二套领域状态、
  图表 runtime 或编辑行为。
- `tellplot/styles.css` 提供完整编辑器样式。
- core、editor、React adapter 与 Vue adapter 保持私有 workspace layer，公共分发不要求 npm organization
  或多个独立版本。
- 参考编辑器只提供示例数据、功能演示和视觉验收，不复制领域状态或业务逻辑。
- 开源官网在参考应用中提供品牌首页、真实图表示例目录、开发者文档入口和在线工作台；它只消费公共组件，
  不进入核心包或图表运行时。
- 宿主应用负责数据获取、权限、页面导航和服务端存储。
- 核心包不发起网络请求，不连接模型、数据平台或第三方业务服务。

## Target Users

### TU-001 Web 应用开发者

需要在原生 DOM、React 或 Vue 业务系统中快速嵌入稳定、可配置、可导出的图表，而不直接维护 G2
生命周期、事件和导出细节。

### TU-002 财务分析与汇报用户

需要调整瀑布图、条形图和柱状图的顺序、分组、折叠和表达重点，同时保持原始金额与来源关系不变。

## Jobs To Be Done

### JTBD-001 快速嵌入基础图表

开发者可以使用类型化数据和配置创建图表，并在原生 DOM、React 或 Vue 宿主中可靠地创建、更新和销毁。

### JTBD-002 调整图表叙事顺序

用户可以直接重排图表项目，使展示顺序符合分析和汇报逻辑，而不改写原始数据。

### JTBD-003 控制图表层级

用户可以分组、取消分组、折叠和展开项目，并保持聚合值、来源映射和顺序确定。

### JTBD-004 形成可交付图表

用户可以保存视图状态，并导出与当前屏幕语义一致的 SVG 和 PNG。

## User Stories And Scenarios

### US-001 瀑布图拖拽排序

用户可以拖动贡献项改变展示顺序，且不会修改金额、来源或最终合计。

### US-002 分组、折叠与展开

用户可以对同层项目创建递归分组、取消分组、折叠和展开，并查看确定的聚合值与来源。

### US-003 条形图与柱状图排序

用户可以在分类条形图或柱状图中重排、固定和分组分类项。

### US-004 精确结构编辑

用户可以在结构大纲中完成精确排序、层级调整和键盘操作；图表与大纲保持同步。

### US-005 可恢复编辑

用户可以撤销、重做、保存和恢复视图编辑。

### US-006 宿主集成

开发者可以通过 imperative API 或框架适配组件把图表接入 Web 应用，而不操作 G2 instance。

### US-007 图表输出

用户可以导出保持当前顺序、分组、折叠、标签和强调样式的 SVG 与 PNG。

### US-008 多序列分类比较

用户可以在同一分类下比较 2 至 4 个序列，并继续把完整分类作为排序、分组、折叠、固定、注释、强调和
历史操作的唯一编辑原子。

## Core User Journey

1. 宿主应用向 `createEditor` 或框架适配组件传入声明图表类型、数据、外观和编辑能力的 `ChartConfig`。
2. TellPlot 创建确定的初始 `ViewSpec` 并通过 G2 渲染图表。
3. 用户通过图表或结构大纲调整顺序、分组和折叠，通过 Inspector 编辑注释；宿主可以在 `ViewSpec`
   中提供强调状态。
4. 系统通过同一套类型化命令校验并提交变更。
5. 用户撤销、重做、保存视图或导出 SVG/PNG。

## Functional Requirements

### FR-001 原始数据不可变

排序、分组、折叠、注释和样式操作只修改 `ViewSpec`，不得直接改写宿主传入的原始数据。

### FR-002 稳定对象标识

每个数据项和分组使用稳定 ID。重复名称、名称修改和重新排序不得破坏来源映射。

### FR-003 统一命令模型

所有编辑入口转换为类型化命令，覆盖移动、分组、取消分组、折叠、展开、固定、排序、注释、撤销和重做。

### FR-004 瀑布图

瀑布图支持起点、终点、贡献项、小计、排序、递归分组、折叠、展开、锁定和合计校验。

### FR-005 分类条形图与柱状图

条形图和柱状图共享单序列分类模型，支持排序、固定、递归分组、折叠、展开和恢复默认顺序。

### FR-006 图表直接操作

图表区分点击、拖动和空白区域框选，并提供重排预览、落点指示、取消、非法反馈和短过渡动画。

### FR-007 结构大纲

结构大纲显示顺序、层级、折叠、固定和来源数量，并支持鼠标与键盘操作。

### FR-008 历史与恢复

系统支持撤销、重做、命令历史和视图恢复。一次完成的用户操作只产生一个可撤销命令。

### FR-009 数据与视图不变量

系统校验来源不丢失、不重复，聚合值正确，总额不漂移，锁定项不被非法修改，撤销后 `ViewSpec`
完全一致。

### FR-010 宿主控制

宿主可以通过 imperative editor instance、框架适配组件、事件和类型化命令控制图表。核心包不连接
外部业务服务或提供自动执行层。

### FR-011 保存与加载

系统支持保存、加载和版本化 `ViewSpec`，并通过明确 schema 版本处理兼容性，不进行启发式迁移。

### FR-012 导出

系统支持 SVG 和 PNG 导出。导出结果与当前可见图表共享顺序、分组、折叠、标签、注释和显示语义。

### FR-013 安全图表配置

宿主通过 TellPlot 语义配置调整标题、颜色、坐标轴、数值/分组标签的显示、位置、有限偏移、字体、背景、
Tooltip、数字格式和动画。标签配置保持可序列化，不接受任意 formatter、逐数据项 callback 或碰撞回调。
配置不得覆盖 G2 数据、编码、稳定 ID、事件注册或交互状态机。

### FR-014 分组与跨层编辑体验

展开分组在图表中具有清晰、可配置且可导出的区域表达。图表和结构大纲提供 `before`、`after` 与
`inside` 语义落点，并允许在不违反锁定、循环和瀑布 segment 约束的前提下跨分组移动节点。移动使来源
分组只剩一个直接子节点时，系统在同一条可撤销命令中解散来源分组，不持久化单成员分组。展开分组中的
框选按递归树边界归一化：组内连续子集创建子分组；选择跨越分组边界时，命中的后代提升为共同父级下的
完整分组节点，再与其他连续节点创建上层分组。界面在提交前展示归一化后的实际选择范围。

### FR-015 开源官网与示例中心

参考应用提供真实图表驱动的品牌首页、当前图表家族示例目录、开发者文档入口和双向在线工作台。示例目录
属于 playground 内容，不导出为核心 registry；新增示例不得复制图表领域逻辑或改变 G2 ownership。

### FR-016 声明式公共配置

框架无关入口使用 `createEditor(container, options)` 和以 `type` 判别的 `ChartConfig`；React/Vue
适配层提供同语义的 `ChartEditor`。图表配置承载宿主意图，`ViewSpec` 独立承载排序、分组、折叠、固定、
注释和强调；普通接入不要求手工初始化视图。TypeScript 和 `validateChartConfig` 必须拒绝图表家族、
数据和配置字段冲突。

### FR-017 稳定版合同

首个公开稳定版对文档化的 core/editor/react/vue runtime、type、schema、error、peer 和 browser 表面遵循
Semantic Versioning。公开发布前不保留未分发候选 API 的兼容包袱；公开 1.x 不进行 breaking public API
或 schema 变更，弃用至少跨一个 minor，并提供替代路径、迁移说明和兼容测试。

### FR-018 多序列分类比较

schema `3.0.0` 分类数据显式声明 2 至 4 个有序 series，并为每个 category 提供按 series 顺序完整覆盖的
finite/safe dense value matrix；缺失值不解释为零。series value 不进入 `ViewSpec` 或命令 union，折叠组对
每个 series 独立使用 compensated sum，系统不定义跨 series total。bar/column 使用 G2 原生分组 interval、
稳定 series 顺序、只读 legend、共享 Tooltip、逐 series 数值和 category-only 直接操作；屏幕、SVG 与 PNG
保持相同 palette/legend；Tooltip、Inspector 与无障碍摘要保持相同 series 文本、顺序和值；结构大纲保持
category/group 叙事树并显示 series 数量，不虚构 total。

## Non-Functional Requirements

### NFR-001 正确性

图表家族的排序、聚合、来源覆盖和锁定规则必须有确定性不变量测试。

### NFR-002 性能

在 200 个可见项目以内，拖拽反馈目标为逐帧更新，普通重排提交后的可见反馈目标为 150ms 内开始。
性能验收使用真实浏览器和真实 G2 图形。

### NFR-003 可打断动画

重排和折叠动画可以被下一次操作快速完成或打断，并遵循 `prefers-reduced-motion`。

### NFR-004 可访问性

核心排序与层级操作具有键盘等价路径、清晰焦点和可被辅助技术识别的状态反馈。

### NFR-005 隐私与网络边界

核心包默认不发起网络请求。错误、日志和性能指标不得包含金额、标签或来源明细。

### NFR-006 可观测性

系统可以记录不含敏感数据的命令类型、失败类型和性能指标，不得把金额、标签或来源明细写入普通日志。

### NFR-007 包兼容性

公共 `tellplot` 包为根、core、React 与 Vue JavaScript 入口提供 ESM、CJS 和类型声明，验证 imperative DOM、
React 18/19、Vue 3、当前及上一发布浏览器。G2/G SVG 是精确审核的 direct dependencies；React/Vue 是
optional peer dependencies，根入口和 imperative consumer 不安装框架也可运行。

### NFR-008 官网生产可用性

官网使用可复现的静态构建部署到全球 HTTPS 边缘网络。首页、示例、文档和工作台必须支持直接访问与刷新；
索引页面具有 canonical、社交分享、robots 与 sitemap 元数据，静态资源使用不可变缓存，HTML 可及时更新。
生产部署绑定 `tellplot.com`，预览部署与生产域名分离，DNS 切换和生产提升保留人工闸门与可回滚记录。

## Current Scope

- 瀑布图、单序列分类条形图和单序列分类柱状图。
- 图表渲染、更新动画、直接排序和结构大纲。
- 分组、取消分组、折叠、展开、固定、撤销和重做。
- `SourceData`、`ViewSpec`、确定性命令和持久化。
- `createEditor`、React/Vue `ChartEditor`、`ChartConfig`、运行时配置校验，以及标题、颜色、坐标轴、标签、Tooltip、数字格式和动画配置。
- 展开分组区域配置、上下文分组操作和跨层级语义拖拽。
- SVG、PNG 和 ViewSpec JSON 导出。
- 单个 `tellplot` 公共包、私有框架无关 core/editor layers、React/Vue 薄适配、参考编辑器和发布候选质量门禁。
- 真实图表驱动的开源官网、示例中心、开发者文档入口和在线工作台。
- Vercel 静态生产托管、Cloudflare 权威 DNS、Preview/Production 分离与 `tellplot.com` HTTPS 域名。

## Confirmed Expansion Target

- G003 为分类条形图和分类柱状图增加 2 至 4 series dense-matrix 业务比较能力。
- category 是唯一编辑原子；series/value 只作为不可编辑的比较维度进入逐 series 投影与 G2 marks。
- 本地交付目标为 `tellplot@2.0.0` candidate，多序列 source/view 使用 closed schema `3.0.0`；v1/v2
  wire、runtime 与 persistence 继续兼容。
- 首期包含分组 bar/column、逐 series 聚合、只读 legend、shared Tooltip、Inspector、无障碍摘要和导出；
  不包含 stacked、双轴、series 编辑、自动业务指标或公开发布。
- 精确 public types/wire/errors/appearance/migration contract 已通过 breaking approval；plan/TDR/task graph
  再经批准后才能修改 runtime。

## Expansion Policy

- 新图表家族必须有明确的数据、编码、交互和导出需求。
- 一次目标只扩展一组强相关图表，不追求快速覆盖全部图表类型。
- G2 原生能力优先；没有真实重复时不抽取通用框架。
- 公共 API 只暴露稳定业务语义，不暴露原始 `G2Spec`、chart instance 或内部 runtime handle。
- 每个目标可以包含多个内部任务；用户在目标开始前批准范围，在目标完成后统一验收结果。

## Non-Goals

- AI 产品、Agent、自然语言图表生成或模型 provider 集成。
- 通用 BI 平台、Dashboard 设计器或数据准备工具。
- 替代 G2 或同时维护多个图表渲染引擎。
- 公共或内部通用 ChartPlugin registry。
- 任意 G2 options 透传或 chart instance 暴露。
- 通过拖动图形修改原始金额。
- 自动写回业务系统或自动发布。
- 第一阶段实现可编辑 PowerPoint 图形对象或 PowerPoint Add-in。
- 为尚未确认的图表、移动端或协同场景提前建设基础设施。

## Success Criteria

- SC-001：当前三个图表家族的主流程、失败路径和财务不变量测试全部通过。
- SC-002：200 个可见项目的真实浏览器重排满足 150ms 反馈预算。
- SC-003：屏幕、SVG、PNG 和无障碍摘要保持顺序与显示语义一致。
- SC-004：公共包通过 ESM、CJS、类型、imperative DOM、React、Vue 和浏览器兼容矩阵。
- SC-005：新增图表不要求宿主接触 G2 instance 或复制 TellPlot 内部生命周期。
- SC-006：核心包不存在模型调用、外部业务请求或未经授权的数据发送。
- SC-007：最小瀑布图、条形图和柱状图接入只需要一份 `ChartConfig`；公共配置与可编辑视图状态边界明确。
- SC-008：`tellplot@1.0.0` 的 package、公开资料、架构/发布审计、隔离源码复演、npm provenance 与
  fresh install 全部通过，并与受保护 Git tag 和 GitHub Release 一致。

## Confirmed Decisions

### CD-001 交付形态

交付一个 `tellplot` 公共包及其框架无关 core/editor、React/Vue 薄适配与参考编辑器，不建设独立 SaaS。

### CD-002 导出边界

提供 SVG、PNG 和 ViewSpec JSON；可编辑 PowerPoint 对象不在当前范围。

### CD-003 网络边界

核心包不发起网络请求，不连接模型或业务服务。宿主负责所有外部数据与服务集成。

### CD-004 产品身份

品牌使用 `TellPlot`，仓库使用 `tellplot`，公共 npm 包使用无 scope 名称 `tellplot`。

### CD-005 编辑模型

`ViewSpec` 使用规范化递归树；图表提供直观的同层和跨分组操作，大纲提供完整层级与键盘操作，所有提交
进入同一确定性命令路径。

### CD-006 配置边界

公共配置使用 TellPlot 语义类型；G2 adapter 独占数据、编码、稳定 key、比例尺、事件和运行时状态。

### CD-007 目标级交付

后续开发以可独立验收的大目标为单位。内部任务用于执行和验证，不要求用户逐项验收；公共范围、
breaking API、schema、依赖、远程 Git 和发布仍是独立人工闸门。

### CD-008 展示网站边界

官网与示例中心是 `apps/playground` 的开发者体验层，只消费 `tellplot` 与 `tellplot/react` 公共 API。网站内容目录不是
核心图表 registry，不向公共包增加路由、文档、动画或在线执行依赖。

### CD-009 公共配置入口

公共 imperative 入口使用 `createEditor`，React/Vue 入口使用 `ChartEditor`；`ChartConfig` 收纳 `type`、
`data`、`appearance`、`editor`、`locale` 和 `height`，受控状态使用 `view`、`defaultView` 与更新事件。
core/editor 保留领域模型和 G2
ownership，不提供 raw `G2Spec`。

### CD-010 稳定版本

公共包 `tellplot` 的首个稳定版本为 `1.0.0`。稳定承诺限定当前 waterfall、bar、column 和文档化公共能力，不以图表数量
作为稳定条件。`1.0.0` 从受保护的 annotated tag、stage-only Trusted Publisher 和人类 2FA approval 发布；
后续公开版本继续只允许来自明确授权的干净 commit、受保护 tag 和可追溯 artifact。

### CD-011 多序列分类比较方向

G003 使用本地 `tellplot@2.0.0` candidate 与 schema `3.0.0` 承载多序列 categorical variant，不修改
schema `1.0.0` 或 `2.0.0` 的 closed wire shape。category 继续是唯一叙事节点，series/value 不成为
`ViewNode`；首期数据限定为 2 至 4 series dense matrix，并排除 stacked、双轴和 series 编辑。
