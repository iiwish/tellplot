# TellPlot 技术决策记录

## Metadata

- Version: 0.11.0
- Status: Confirmed
- Last updated: 2026-07-23
- Approval: 用户于 2026-07-20 明确确认轻量基础图表库边界、G2 ownership 和目标级交付方式，并于
  2026-07-23 批准首个公开 Beta 发布决策

## Decision Context

TellPlot 需要在财务正确性、直接操作体验和可嵌入性之间取得平衡。当前技术方向只覆盖已经确认的产品约束，不承诺未经原型验证的公共 API。

## TDR-001 图表渲染引擎

- Status: Confirmed
- Decision: 第一阶段仅使用 AntV G2 渲染瀑布图、分类条形图和分类柱状图。
- Rationale: G2 已提供图形事件、状态以及 enter/update/exit 动画；单引擎可以减少命中测试、坐标映射、导出和动画状态的重复实现。
- Alternatives: ECharts、Vega、D3、自研 Canvas 渲染层。
- Consequences: 第一阶段的图表能力受 G2 可扩展边界约束；不建设多引擎适配层。
- Exit criteria: 只有真实原型证明 G2 无法满足阻断性交互或导出需求，才重新评估渲染引擎。

## TDR-002 编辑状态与命令模型

- Status: Confirmed
- Decision: 原始 `SourceData`、可编辑 `ViewSpec` 和可重放 `CommandLog` 分离；所有编辑入口调用同一套类型化命令。
- Rationale: 该模型让直接操作、结构大纲、键盘和宿主调用共享财务不变量、撤销重做、审计和冲突处理边界。
- Alternatives: 直接修改 G2 options、各交互入口维护独立状态、宿主直接替换完整图表配置。
- Consequences: 第一阶段必须先定义 schema、命令前置条件和不变量，再实现图表交互。
- Exit criteria: 无。该决策属于产品正确性约束，变化需要同步修改项目章程。

## TDR-003 UI 动画依赖

- Status: Confirmed
- Decision: G2 负责图表画布内的图形过渡；拖拽期间位置直接跟随指针。Phase 1A 不引入 Motion，简单 DOM 反馈使用 CSS transition；只有后续原型证明复杂布局连续性需要它时才单独引入。
- Rationale: 图表动画和 DOM 布局动画属于不同渲染树。由 Motion 接管 G2 Canvas 会形成双状态源，而完全手写 DOM 重排动画会增加中断、reduced motion 和布局测量成本。
- Alternatives: 只使用 CSS/Web Animations API、Motion 同时负责图表与 UI、自建 `AnimationEngine`。
- Consequences: 初始依赖更少，图表和 UI 动画的所有权清晰。复杂 DOM 布局动画需要通过真实原型证明 CSS 无法以更低复杂度完成。
- Acceptance threshold: Motion 只有在显著减少已存在的 DOM 重排代码，并满足可打断、低弹性和 `prefers-reduced-motion` 要求时才引入。
- Rejected boundary: 不创建独立通用动画引擎，不使用弹簧插值追赶拖拽指针。

## TDR-004 仓库与包边界

- Status: Superseded by TDR-022
- Decision: 使用 pnpm workspace。`packages/editor` 是唯一产品包，内部按 `domain`、`charts`、`rendering/g2`、`interactions`、`components`、`export` 和 `styles` 分层；`apps/playground` 是薄参考编辑器；`e2e` 保存跨包浏览器测试。
- Rationale: 单产品包避免过早拆分公共 core；chart-family ownership 与共享 G2 runtime 已由 waterfall 和 categorical 两类真实消费者证明。参考编辑器不复制业务逻辑。
- Alternatives: 单应用仓库、`core` 与 `react` 多包、通用插件式图表框架。
- Consequences: 没有独立发布与版本价值前不拆分 `core` 包；公共入口只导出稳定组件、类型和宿主集成契约。

## TDR-005 状态与 React 集成

- Status: Superseded by TDR-022
- Decision: 领域命令执行器是纯函数；React 组件通过 reducer 持有 `EditorSession`。G2 生命周期封装在单独 adapter 组件内，不把 G2 chart instance 写入领域状态。
- Rationale: 纯领域状态便于 TDD、重放、序列化和宿主复用；命令历史不依赖 React 或 G2。
- Alternatives: 全局状态库、直接修改 G2 options、每个组件维护局部业务状态。
- Consequences: Phase 1A 不引入 Redux、Zustand 或其他全局状态库。

## TDR-006 拖拽与键盘排序

- Status: Superseded by TDR-022
- Decision: 图表拖拽使用 Pointer Events 与 G2 命中信息；结构大纲使用稳定版 `@dnd-kit/core` 和 `@dnd-kit/sortable`，同时提供键盘排序按钮与快捷操作。
- Rationale: 图表拖拽必须理解坐标轴和锁定项，通用 DOM 拖拽库不能代替；结构大纲需要成熟的传感器、碰撞检测和键盘能力。
- Alternatives: HTML Drag and Drop、Motion Reorder、完全手写 DOM 拖拽。
- Consequences: dnd-kit 只存在于 React UI 层，不进入领域包边界或图表 adapter。

## TDR-007 工具链与质量门槛

- Status: Confirmed
- Decision: 使用 Node 22.13+、pnpm 11、TypeScript 6、React 19、Vue 3、Vite 8、Vitest 4、Playwright 1.61、ESLint 10 和 Prettier 3。包构建采用 tsup，应用构建采用 Vite。
- Rationale: 这些版本在 2026-07-15 的 npm registry 中互相兼容，并支持严格类型、现代 ESM、快速单测与真实浏览器验证。
- Alternatives: 单一 Vite 构建所有目标、Rollup 手工配置、Jest、仅浏览器手工测试。
- Consequences: 开发环境最低 Node 版本由 ESLint 与 Vite 的兼容交集决定；依赖使用精确版本并由 lockfile 固化。

## TDR-008 测试分层

- Status: Confirmed
- Decision: 领域和投影逻辑使用 Vitest TDD；imperative runtime 与 React/Vue adapter 使用各自生命周期测试；拖拽、导出、键盘、可访问性和真实 G2 渲染使用 Playwright；浏览器性能门禁运行生产 Vite 构建；公共 `tellplot` 包的全部子路径通过 build、publint、类型消费与 framework matrix 验证。
- Rationale: Mock 无法证明 Canvas 命中、拖拽、导出或真实布局正确，纯 E2E 又无法高效覆盖不变量组合。
- Alternatives: 只做单元测试、只做 E2E、截图代替行为断言。
- Consequences: coverage 只作为最低信号；财务不变量、失败路径和浏览器证据是阻断门槛。

## TDR-009 递归分组树

- Status: Confirmed
- Decision: `ViewSpec` 使用规范化邻接树；`rootOrder` 保存根节点，group entity 的 children 可以引用 contribution 或 group。父级索引、叶子来源、层级和聚合值全部派生，不重复持久化。
- Rationale: 稳定 node ID 和单一树结构可以统一嵌套分组、折叠恢复、撤销重做、宿主命令和大纲层级，避免在 group 与 source 之间维护多份父子关系。
- Invariants: 每个非根节点只有一个父级；禁止循环、孤儿、重复成员和跨 subtotal segment；每组至少两个直接子节点；每个 contribution 恰好覆盖一次。
- Consequences: validator、command executor、projection、outline、persistence 与 property tests 使用同一递归语义；模型不硬编码最大分组深度。

## TDR-010 图表手势状态机

- Status: Confirmed
- Decision: 图表手势采用 `idle -> pending-bar -> dragging` 与 `idle -> marquee` 两条互斥路径。项目在物理 category axis 移动达到 4px 才开始拖动，空白区域拖动显示选区；锁定项目和只读模式保留 pending 点击选择，拖动尝试不进入 dragging。拖动和框选预览属于临时交互状态，提交时只产生一个领域命令。
- Rationale: 该状态机避免点击选择、柱子拖动和空白框选争夺 pointer，并保持一次用户意图对应一次撤销。
- Marquee grouping: 图表框选和大纲多选先把可见命中归一化为最低共同容器下的直接子节点。选择只覆盖
  展开分组内的连续子集时在该分组内创建子分组；选择跨越边界时，后代提升为共同父级下的完整 group
  节点。归一化不自动补齐普通间隔节点，不允许产生单成员父分组，并在确认前显示实际生效范围。
- Chart boundary: 图表和结构大纲都把落点解析为 `before`、`after` 或 `inside`，并提交相同的 container/index
  命令。图表使用 pointer down 时的 G2 scene category-axis 边界快照，waterfall/column 使用 X，bar 使用
  Y，value-axis 位移不影响目标；结构大纲保留完整层级与键盘入口。
- Group cleanup: 跨容器移动使来源分组只剩一个直接子节点时，命令执行器用该子节点替换来源分组，并在
  同一次状态提交中删除来源分组的折叠、注释和强调状态；一次 undo 恢复完整移动与分组。
- Motion: G2 负责柱子重投影，DOM overlay 负责真实图标按钮和命名对话框；不引入额外动画库。

## TDR-011 品牌与仓库身份

- Status: Confirmed
- Decision: 产品使用 `TellPlot` 品牌，规范代码仓库为 `iiwish/tellplot`，公共 npm 包为 `tellplot`；
  `@tellplot/*` 仅用于 private workspace layer 标识。仓库使用独立根历史，初始提交承载已经验收的瀑布图
  基础切片与对应 SSOT/evidence。公共 package naming 由 TDR-023 固定。
- Rationale: 产品定位是基于 G2 的轻量可编辑基础图表库，不让底层渲染实例或单一交互实现进入长期品牌与公共 API。独立根历史让仓库只保留当前架构和可验证资产。
- Public identity: npm 包为 `tellplot`，React 入口为 `tellplot/react`；DOM scope 使用 `[data-tellplot]`；
  CSS 使用 `.tp-` / `--tp-` 前缀；运行时错误类型使用 `TellPlot*`；环境变量使用 `TELLPLOT_*`。
- Historical boundary: `.ai-platform/evidence/**` 中的既有 patch 是不可变验收记录，可以保留交付时使用的旧标识；当前源码、配置和规范文档不得继续暴露旧命名空间。
- Consequences: 首次远程提交前必须完成全量品牌残留扫描、包消费测试、浏览器矩阵和干净安装验证。

## TDR-012 安全图表配置层

- Status: Confirmed
- Decision: `ChartEditor` 通过 `ChartConfig.appearance` 控制标题、财务语义色、坐标轴、数值/分组标签、
  Tooltip、数字格式、动画和展开分组区域。标签支持显示、内外位置、有限偏移、颜色、字号、字重、可选
  背景。内部解析器生成确定的默认值并映射为屏幕与导出共享的 `G2Spec`。
- Rationale: 宿主需要常见呈现配置，但任意 G2Spec merge 会破坏稳定编码、拖拽命中、导出一致性和公共 API 可演进性。
- Ownership: G2 `data`、transform、encode、key、band geometry、chart instance、renderer、事件和交互状态由内部 adapter 独占。
- Persistence: `ChartConfig.appearance` 是宿主级配置，不进入 `ViewSpec`；需要持久化的呈现语义必须通过单独 schema 版本决策。
- Runtime safety: 无效数字和空字符串回退到安全默认值；动画时长和小数位被限制在文档范围；reduced motion 始终优先。
- Rejected alternatives: 原始 `G2Spec` prop、任意 spec transform、chart instance ref、深度 merge G2 options。

## TDR-017 展开分组区域

- Status: Confirmed
- Decision: 展开分组投影为共享的 renderer-neutral `ExpandedGroupRegion`，包含稳定 group ID、label、depth、
  第一个和最后一个可见节点、可见成员的数值上下界，以及第一个成员的柱顶标签锚点。waterfall、column
  和 bar 的 G2 spec 在主 interval 之前渲染有界 `range` 矩形，并在 interval 之后用高 `zIndex` 的独立
  `text` mark 渲染标签；bar 继续由同一 coordinate transpose 负责方向转换。柱形数值标签同样由 interval
  之后的独立 `text` mark 渲染，显式锚定真实数值端点。value label 使用 `zIndex: 5`，group label 使用
  `zIndex: 10`，不依赖 interval 内部 label 的绘制顺序。
- Appearance: `ChartConfig.appearance.labels` 以可序列化语义配置标签显示、内外位置、有限偏移、颜色、
  字号、字重和可选背景。分组区域启用状态与有限透明度位于 `groupRegion`，未指定的分组标签颜色继承
  `palette.group`。密集度使用内部 `auto` 策略；碰撞选项不开放，避免透传对独立 text mark 无法可靠
  生效的 G2 label transform。交互时的选中和落点强调属于内部临时状态，不进入 `ViewSpec`。
- Interaction ownership: 背景和标签 mark 均不拦截柱形事件或空白框选。拖拽落点继续来自 G2 scene category-axis
  边界，禁止用 DOM 估算固定柱宽、行高或 plot geometry。
- Export: 屏幕、SVG 与 PNG 使用相同 region projection 和 G2 spec；折叠分组只显示聚合 mark，不渲染展开
  背景。
- Rejected alternatives: CSS 绝对定位背景、Canvas 手绘 overlay、第二套 scale、原始 G2 callback 配置和新动画
  依赖。

## TDR-013 多图表数据合同与命令策略

- Status: Confirmed
- Decision: `SourceData` 使用显式 schema generation 与 `dataKind` 判别 waterfall/categorical；现有
  `1.0.0` waterfall wire shape 原样兼容，新 chart family 使用 `2.0.0`。`ViewSpec` 共享递归叙事树，并在
  current schema 中支持 `waterfall | bar | column`。source/view compatibility 使用严格矩阵，不启发式推断，
  不隐式迁移。
- Command ownership: tree transform、history、revision、annotation 和 emphasis 保持一份；waterfall
  anchor/segment 与 categorical movable-item 差异由最小内部 chart policy 提供。policy 不属于公共 API，
  不接受宿主 callback。
- Rationale: 放宽 waterfall validator 会让缺失 anchor 的错误输入被误判为分类数据；复制命令内核会产生
  多个状态源。显式判别联合同时保护 legacy compatibility 与 strict TypeScript exhaustiveness。
- Consequences: validator、session、fingerprint、persistence 和 executor 必须覆盖 legacy/current 分支；
  command wire shape 保持不变；bar/column 不建立独立领域模型。
- Rejected alternatives: 把 categorical 解释为无 anchor waterfall、按 item shape 推断 family、复制分类命令
  executor、公共 ChartPlugin registry、静默 schema upgrade。

## TDR-014 分类图方向与 G2 边界

- Status: Confirmed
- Decision: column 使用 canonical `x = nodeId, y = amount` Cartesian interval；bar 保持同一语义 encode，
  使用 G2 `coordinate.transform: transpose`。`ViewSpec.rootOrder` 始终保存逻辑顺序，column 首项位于左侧，
  bar 首项位于顶部。
- Interaction ownership: direct reorder 读取 G2 scene bounds，并在物理 category axis 上计算 collision；
  waterfall/column 使用 X，bar 使用 Y。value-axis 位移与 mark 长度不参与排序，不猜测固定柱宽或行高。
- Runtime extraction: categorical vertical slice 通过前不建立公共或内部通用插件框架；两类 chart green 后只
  抽取真实重复的 G2 load/render/destroy、animation finish、event cleanup 与 offscreen export lifecycle。
- Rationale: transpose 保留统一 categorical spec 语义，并让 G2 负责坐标变换；延迟抽象符合项目章程
  P-006 与 P-009。
- Rejected alternatives: 手工交换并分叉两套投影、DOM 模拟图形、第二渲染引擎、新动画框架、raw G2Spec。

## TDR-015 轻量基础图表产品边界

- Status: Confirmed
- Decision: TellPlot 是基于 G2 的轻量可编辑基础图表库。核心只包含图表家族、类型化数据、语义配置、
  编辑交互、历史、持久化和导出，不包含 AI、Agent、Dashboard、服务端工作流或通用 plugin registry。
- G2 ownership: G2 独占 marks、encode、scene bounds、renderer 和图形动画；TellPlot 只封装已被真实图表
  消费的 lifecycle 与业务语义。
- Expansion: 新图表家族在独立目标中按需求增加，不为未来图表预建 registry、adapter hierarchy 或公共
  extension hook。
- Rationale: 小核心、稳定 API 和逐图表验证比大而全的框架更符合项目目标，也避免重复建设 G2。
- Rejected alternatives: 自研图表引擎、任意 G2Spec 透传、通用 BI 平台、模型驱动图表生成平台。

## TDR-016 目标级交付

- Status: Confirmed
- Decision: 后续开发以大目标为用户审批和验收单位。目标内可以包含多个内部任务、TDD 循环和缺陷修复，
  执行过程中不设置逐任务用户验收；目标完成后统一进入 `Needs_Review`。
- Mandatory gates: 新产品范围、breaking API、schema、依赖、远程 Git、publish 和 release 仍需独立明确批准。
- Evidence: 内部任务保留可复核的测试和 diff evidence，但用户默认只查看目标级结果、风险和验收材料。
- Rationale: 保留工程可追踪性，同时避免把用户拖入微任务和流程负担。

## TDR-018 开源官网与示例目录

- Status: Confirmed
- Decision: `apps/playground` 使用现有 React/Vite 单页应用承载品牌首页、示例中心、文档入口和在线工作台。
  路由使用本地 history API；真实预览直接消费 `tellplot/react` 的 read-only `ChartEditor`；示例内容目录保持 playground
  私有和显式。
- Visual ownership: G2 继续负责图形过渡；网站导航、hover 和进入反馈只使用 CSS。网站不引入远程字体、
  图片、router、docs、编辑器或 animation dependency。
- Runtime boundary: 工作台继续使用既有 SourceData/ViewSpec/Command 路径；网站不复制领域状态，不向
  `tellplot` 导出示例 registry 或页面组件。
- Rationale: 以真实产品为展示资产可以同时提升开源发现、示例浏览和手工验收体验，而不增加核心库重量。
- Rejected alternatives: 独立重型文档站、静态图表截图、通用示例插件协议、第二图表渲染层。

## TDR-019 首个公开 Beta 发布

- Status: Superseded
- Release source: 只从干净 `main` 的确定 commit 生成网站、tag、GitHub Release 和 npm tarball；fresh clone
  必须能够使用锁定工具链复现发布门禁。
- Distribution: `@tellplot/editor@0.1.0-beta.1` 使用公开 `beta` dist-tag，不占用 `latest`。
- Architecture: 保持 `domain -> charts -> G2 runtime -> React surface` 的现有分层，不在发布前增加
  registry、图表家族或大型 Canvas 重构；T120 补强依赖方向和 runtime cycle 自动门禁。
- Public surface: GitHub 仓库、生产网站、README/LICENSE/CHANGELOG、贡献与安全资料、package metadata
  必须在 npm publish 前对公开用户可访问。
- Supply chain: 优先使用 Trusted Publishing；直接发布必须使用 2FA 或受限 token。凭据不得进入仓库、
  构建产物、日志或 evidence。
- Human gates: G002 系列目标级验收后重新批准 G004；push、merge、仓库公开、production deploy、DNS、
  tag、GitHub Release 和 npm publish 在实际执行前仍需独立明确授权。
- Rationale: Beta 应当可追溯、可复现且需要用户主动 opt-in；公开分发不能依赖私有仓库、失效主页或
  未提交工作区。
- Rejected alternatives: 从 dirty worktree publish、Beta 占用 latest、先扩展更多图表、发布前全面重构。

## TDR-020 声明式公共配置 API

- Status: Confirmed
- Decision: framework-neutral 入口为 `createEditor`，React/Vue 入口为 `ChartEditor`，必需配置为判别式
  `config: ChartConfig`。`type` 与
  `data` 家族在编译期和 `validateChartConfig` 运行时同时校验；呈现与编辑器选项分别位于
  `config.appearance` 和 `config.editor`。
- State boundary: `ChartConfig` 表达宿主意图，`ViewSpec` 表达排序、分组、折叠、固定、注释与强调；
  受控模式使用 `view` 和 `onViewChange`，非受控模式由 facade 创建并维护兼容视图。
- Internal boundary: resolved appearance、projection、G2 spec、chart
  instance 和 runtime handle 不从 package entry 导出。
- Playground: 实时工作台分别编辑公共 `tellplot.config.json` 与 `tellplot.view.json`，不执行 JavaScript，
  非法草稿不改变最后一次合法图表。
- Rationale: 单一声明式配置降低首次接入认知负担，同时保留确定性领域状态、G2 ownership 和高级命令 API。
- Rejected alternatives: 分散顶层 props、把私有 document wrapper 当作配置、raw G2Spec、双公共组件入口。

## TDR-021 首个稳定版 1.0

- Status: Confirmed
- Version: 公共包 `tellplot` 使用 `1.0.0`；本地候选和未来公开版本使用相同稳定 metadata。私有 workspace
  layers 使用非发布版本，不独立形成兼容承诺。
- Compatibility: 1.x 遵循 Semantic Versioning；runtime exports、公共类型、schema、错误码和 peer/browser
  合同只允许向后兼容扩展。弃用至少跨一个 minor，并提供迁移说明。
- Release source: 本地目标使用隔离源码复演；公开 npm/GitHub/网站发布只允许来自独立授权后的干净
  commit、tag 和可追溯 tarball。
- Quality: architecture import graph/cycle、public files、local links、secret/path、单包 tarball、framework matrix、
  current/previous browser、a11y 和 performance 均为阻断门禁。
- Scope: 稳定表示当前 waterfall、bar、column 的文档化能力可被兼容承诺，不表示 TellPlot 已覆盖 G2
  的通用图表范围。
- Rationale: 当前窄公共入口和兼容矩阵已经可以形成稳定合同；不公开 Beta 时，通过本地 tarball consumer
  和隔离源码复演提高首次公开稳定版的前置信心。
- Rejected alternatives: 发布 Beta、用 `0.x` 模糊兼容承诺、为 1.0 增加新图表、从 dirty worktree publish。

## TDR-022 框架无关编辑器架构

- Status: Confirmed
- Decision: TellPlot 使用 `@tellplot/core -> @tellplot/editor -> @tellplot/react|@tellplot/vue` 的依赖方向。
  `@tellplot/core` 持有配置、数据、命令、历史、投影与不变量；`@tellplot/editor` 通过
  `createEditor(container, options)` 持有完整 DOM/G2 编辑器、交互与导出；React/Vue 包只适配宿主生命周期。
- Public contract: imperative instance 提供 `update`、`dispatch`、`undo`、`redo`、`focus`、`getView`、
  `exportImage` 与 `destroy`。所有配置、视图、命令、错误和事件使用共享类型，不暴露 G2 chart instance。
- Runtime boundary: `@tellplot/core` 不访问 DOM；`@tellplot/editor` 不导入 React、React DOM、Vue 或框架专属
  drag-and-drop 库；适配包不得拥有第二套 session、projection、G2 runtime 或交互状态机。
- UI ownership: 完整工具栏、图表直接操作、结构大纲、Inspector、弹层、键盘与无障碍语义由 framework-neutral
  editor runtime 统一拥有。适配包只渲染一个稳定容器并转发更新、事件与实例方法。
- Compatibility: 公开兼容承诺从 `tellplot@1.0.0` 及其文档化子路径开始；不保留旧
  `@tellplot/editor` React component API 或 scoped 包布局。SourceData、ViewSpec、命令和业务不变量继续
  作为产品正确性合同。
- Package strategy: 由 TDR-023 的单包公共分发决策取代；本 TDR 的内部依赖方向和 runtime ownership 保持有效。
- Quality: 包导入无浏览器全局副作用；create/update/destroy 可重复且资源可释放；imperative、React、Vue
  共享 E2E、a11y、performance 和当前/上一浏览器门禁。
- Rationale: 框架无关 imperative runtime 让不同宿主共享完整编辑行为，避免在 React/Vue 中复制高风险的
  财务状态、直接操作和导出实现，同时形成与 G2/ECharts 相同的 DOM 容器生命周期边界。
- Risks: imperative DOM controller 同时协调焦点、Pointer Events、G2 异步生命周期与资源释放；包版本和适配器
  peer 范围必须保持同步。
- Mitigations: store、投影与 runtime ownership 分层；create/update/destroy 和容器独占具有合同测试；React/Vue
  适配共用同一 runtime；真实浏览器覆盖主流程、卸载、双框架与资源清理。
- Rejected alternatives: Vue 内嵌 React root、把 React 打入 editor bundle、两套完整 UI、仅提供 read-only Vue、
  Web Component 作为唯一公共合同、公开旧候选后再迁移。

## TDR-023 单包公共分发

- Status: Confirmed
- Decision: npm 只发布无 scope 的 `tellplot`。公共入口为 `tellplot`、`tellplot/core`、`tellplot/react`、
  `tellplot/vue` 和 `tellplot/styles.css`；`@tellplot/core`、`@tellplot/editor`、`@tellplot/react` 与
  `@tellplot/vue` 只作为 private workspace layers。
- Root contract: `tellplot` 根入口导出 core 领域 API 与 `createEditor`，且在模块加载时不依赖 React 或 Vue。
  `tellplot/core` 提供相同 core-only surface；framework 子路径只在消费者显式导入时加载对应 peer。
- Dependency contract: `@antv/g2@5.4.8` 与 `@antv/g-svg@2.1.1` 是 `tellplot` direct dependencies；React
  18/19 和 Vue 3 是 optional peer dependencies。精确 AntV 供应链 allowlist 与现有 G2 runtime ownership
  不变。
- Build contract: 公共 tarball 可以内联私有 workspace 实现，但不得泄漏无法从 npm 安装的 workspace
  specifier。根、core、React、Vue 提供 ESM、CJS 与 declarations，CSS 使用独立 export。
- Release contract: artifact、availability、preflight、Trusted Publisher 和 staging 只处理一个
  `tellplot-1.0.0.tgz`。未批准的 scoped stage 必须拒绝，scoped bootstrap package 不进入 1.x 发布路线。
- Compatibility: scoped 四包从未公开稳定发布，不提供兼容 shim 或双发布。1.x 兼容承诺从 `tellplot` 及其
  文档化子路径开始。
- Rationale: 用户安装一个包即可使用 DOM、React 或 Vue；内部仍保持可测试、无环、ownership 清晰的长期
  架构。与 G2/ECharts 一类库相比，这减少 organization、版本同步、Trusted Publisher 和发布原子性的运维
  成本，同时不牺牲 framework-neutral runtime。
- Risks: 聚合 tarball 体积增加；可选 framework peers 可能影响类型解析；多入口 bundling 可能重复代码或
  意外把 framework 带入根入口。
- Mitigations: shared chunks、optional peer metadata、root no-framework consumer、strict peer matrix、ATTW、
  publint、pack allowlist、bundle inspection 和完整 browser matrix。
- Rejected alternatives: 继续发布四包、只发布 imperative 包、把 React/Vue 作为 direct dependencies、
  使用 `@tellplot/tellplot` organization package、公开四包后再合并。

## Approval Gate

TDR-001 至 TDR-003、TDR-007 至 TDR-018、TDR-020 至 TDR-023 已获得用户明确批准；TDR-004 至 TDR-006
由 TDR-022 取代，TDR-019 由 TDR-021 取代，TDR-022 的公共 package strategy 由 TDR-023 取代。后续实现以 approved goal
为执行单位；内部 task graph 和 execution packet 由执行方维护。任何依赖、schema、breaking public API、
远程 Git 或发布变化必须重新进入审批，并运行兼容性、许可证和包边界检查。
