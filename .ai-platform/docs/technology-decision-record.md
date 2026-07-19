# TellPlot 技术决策记录

## Metadata

- Version: 0.5.0
- Status: Confirmed
- Last updated: 2026-07-19
- Approval: 用户于 2026-07-19 明确批准长期文档与安全语义图表配置方向

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
- Rationale: 该模型同时支持直接操作、结构大纲、键盘和 AI，并让财务不变量、撤销重做、审计和冲突处理拥有单一执行边界。
- Alternatives: 直接修改 G2 options、各交互入口维护独立状态、AI 直接生成完整图表配置。
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

- Status: Confirmed
- Decision: 使用 pnpm workspace。`packages/editor` 是唯一产品包，内部按 `domain`、`waterfall`、`components` 和 `styles` 分层；`apps/playground` 是薄参考编辑器；`e2e` 保存跨包浏览器测试。
- Rationale: 单产品包避免在只有一个图表切片时过早抽取公共 core，同时让领域逻辑保持纯 TypeScript、可独立测试。参考编辑器不复制业务逻辑。
- Alternatives: 单应用仓库、`core` 与 `react` 多包、通用插件式图表框架。
- Consequences: 分类图切片验收前不拆分 `core` 包；公共入口只导出稳定组件、类型和宿主集成契约。

## TDR-005 状态与 React 集成

- Status: Confirmed
- Decision: 领域命令执行器是纯函数；React 组件通过 reducer 持有 `EditorSession`。G2 生命周期封装在单独 adapter 组件内，不把 G2 chart instance 写入领域状态。
- Rationale: 纯领域状态便于 TDD、重放、序列化和 AI 命令复用；命令历史不依赖 React 或 G2。
- Alternatives: 全局状态库、直接修改 G2 options、每个组件维护局部业务状态。
- Consequences: Phase 1A 不引入 Redux、Zustand 或其他全局状态库。

## TDR-006 拖拽与键盘排序

- Status: Confirmed
- Decision: 图表拖拽使用 Pointer Events 与 G2 命中信息；结构大纲使用稳定版 `@dnd-kit/core` 和 `@dnd-kit/sortable`，同时提供键盘排序按钮与快捷操作。
- Rationale: 图表拖拽必须理解坐标轴和锁定项，通用 DOM 拖拽库不能代替；结构大纲需要成熟的传感器、碰撞检测和键盘能力。
- Alternatives: HTML Drag and Drop、Motion Reorder、完全手写 DOM 拖拽。
- Consequences: dnd-kit 只存在于 React UI 层，不进入领域包边界或图表 adapter。

## TDR-007 工具链与质量门槛

- Status: Confirmed
- Decision: 使用 Node 22.13+、pnpm 11、TypeScript 6、React 19、Vite 8、Vitest 4、Playwright 1.61、ESLint 10 和 Prettier 3。包构建采用 tsup，应用构建采用 Vite。
- Rationale: 这些版本在 2026-07-15 的 npm registry 中互相兼容，并支持严格类型、现代 ESM、快速单测与真实浏览器验证。
- Alternatives: 单一 Vite 构建所有目标、Rollup 手工配置、Jest、仅浏览器手工测试。
- Consequences: 开发环境最低 Node 版本由 ESLint 与 Vite 的兼容交集决定；依赖使用精确版本并由 lockfile 固化。

## TDR-008 测试分层

- Status: Confirmed
- Decision: 领域和投影逻辑使用 Vitest TDD；React 行为使用 Testing Library；拖拽、导出、键盘、可访问性和真实 G2 渲染使用 Playwright；浏览器性能门禁运行生产 Vite 构建；公共包通过 build、publint 和类型消费示例验证。
- Rationale: Mock 无法证明 Canvas 命中、拖拽、导出或真实布局正确，纯 E2E 又无法高效覆盖不变量组合。
- Alternatives: 只做单元测试、只做 E2E、截图代替行为断言。
- Consequences: coverage 只作为最低信号；财务不变量、失败路径和浏览器证据是阻断门槛。

## TDR-009 递归分组树

- Status: Confirmed
- Decision: `ViewSpec` 使用规范化邻接树；`rootOrder` 保存根节点，group entity 的 children 可以引用 contribution 或 group。父级索引、叶子来源、层级和聚合值全部派生，不重复持久化。
- Rationale: 稳定 node ID 和单一树结构可以统一嵌套分组、折叠恢复、撤销重做、AI 候选命令和大纲层级，避免在 group 与 source 之间维护多份父子关系。
- Invariants: 每个非根节点只有一个父级；禁止循环、孤儿、重复成员和跨 subtotal segment；每组至少两个直接子节点；每个 contribution 恰好覆盖一次。
- Consequences: validator、command executor、projection、outline、persistence 与 property tests 使用同一递归语义；模型不硬编码最大分组深度。

## TDR-010 图表手势状态机

- Status: Confirmed
- Decision: 图表手势采用 `idle -> pending-bar -> dragging` 与 `idle -> marquee` 两条互斥路径。柱子水平移动达到 4px 才开始拖动，空白区域拖动显示选区；锁定柱和只读模式保留 pending 点击选择，拖动尝试不进入 dragging。拖动和框选预览属于临时交互状态，提交时只产生一个领域命令。
- Rationale: 该状态机避免点击选择、柱子拖动和空白框选争夺 pointer，并保持一次用户意图对应一次撤销。
- Chart boundary: 图表只执行同父级重排与分组；排序使用 pointer down 时的 G2 scene 水平边界快照和拖动柱宽，忽略 Y 轴高度；精确跨层级移动由结构大纲完成。
- Motion: G2 负责柱子重投影，DOM overlay 负责真实图标按钮和命名对话框；不引入额外动画库。

## TDR-011 品牌与仓库身份

- Status: Confirmed
- Decision: 产品使用 `TellPlot` 品牌，规范代码仓库为 `iiwish/tellplot`，包命名空间为 `@tellplot`。仓库使用独立根历史，初始提交承载已经验收的瀑布图基础切片与对应 SSOT/evidence。
- Rationale: 产品定位是财务叙事图表编辑能力，不应让渲染引擎或单一交互方式进入长期品牌与公共 API。独立根历史让新仓库只保留当前架构和可验证资产。
- Public identity: React 包为 `@tellplot/editor`；DOM scope 使用 `[data-tellplot]`；CSS 使用 `.tp-` / `--tp-` 前缀；运行时错误类型使用 `TellPlot*`；环境变量使用 `TELLPLOT_*`。
- Historical boundary: `.ai-platform/evidence/**` 中的既有 patch 是不可变验收记录，可以保留交付时使用的旧标识；当前源码、配置和规范文档不得继续暴露旧命名空间。
- Consequences: 首次远程提交前必须完成全量品牌残留扫描、包消费测试、浏览器矩阵和干净安装验证。

## TDR-012 安全图表配置层

- Status: Confirmed
- Decision: `FinancialChartEditor` 通过有限、类型化的 `chartAppearance` 控制标题、财务语义色、坐标轴、数值标签、Tooltip、数字格式和动画。内部解析器生成确定的默认值并映射为屏幕与导出共享的 `G2Spec`。
- Rationale: 宿主需要常见呈现配置，但任意 G2Spec merge 会破坏稳定编码、拖拽命中、导出一致性和公共 API 可演进性。
- Ownership: G2 `data`、transform、encode、key、band geometry、chart instance、renderer、事件和交互状态由内部 adapter 独占。
- Persistence: `chartAppearance` 是宿主级配置，不进入 `ViewSpec`；需要持久化的呈现语义必须通过单独 schema 版本决策。
- Runtime safety: 无效数字和空字符串回退到安全默认值；动画时长和小数位被限制在文档范围；reduced motion 始终优先。
- Rejected alternatives: 原始 `G2Spec` prop、任意 spec transform、chart instance ref、深度 merge G2 options。

## Approval Gate

用户批准本记录与 `001-waterfall-editor-foundation` 任务图后，任务状态才能从 `Draft` 转为 `Ready` 并生成执行包。任何依赖变化必须重新运行兼容性、许可证和包边界检查。
