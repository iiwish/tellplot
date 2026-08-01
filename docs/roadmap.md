# TellPlot 产品路线图

## North Star

TellPlot 让不同前端技术栈用简洁、稳定的 API 嵌入可编辑基础图表，并把状态、渲染、动画、交互和导出
统一在基于 G2 的框架无关实现中。

## Planning Model

路线图以大目标为交付和验收单位。每个目标可以包含多个工程任务；用户批准目标后，内部任务连续
执行并在目标完成时统一汇报，不逐项请求验收。

以下变化仍需要独立批准：新增产品范围、breaking public API、schema、依赖、远程 Git、npm publish
和正式发布。

## G001 多图表基础能力

- Status: Accepted
- Outcome: TellPlot 已提供瀑布图、分类条形图和分类柱状图。
- Capability: 类型化数据、G2 渲染与动画、排序、递归分组、折叠、固定、历史、持久化、SVG/PNG、
  可访问性和安全语义配置。
- Architecture: chart-family modules、shared G2 screen/export runtime 和 X/Y category-axis 边界已通过
  多图表真实使用验证。
- Evidence: T101-T116 已完成验证并由用户验收。

## G002 轻量图表库 Beta

- Status: Accepted
- Goal: 把当前三个图表家族整理成开发者可以直接安装、理解和稳定集成的 beta 版本。
- Included outcomes:
  - 收敛并记录公共数据、配置、事件、持久化和导出 API。
  - 完善最小安装示例、图表用法、受控/非受控模式和常见错误说明。
  - 验证发布 tarball、类型、浏览器、可访问性、性能和导出。
  - 确定 beta 版本、变更记录和迁移规则。
- Excluded: 新图表类型、通用插件系统、Dashboard 和服务端能力。
- Acceptance: 用户于 2026-07-29 与 G002-R1、G002-R2、G002-R3、G004 统一验收。

## G002-R1 分组与跨层编辑体验

- Status: Accepted
- Goal: 让分组选择、跨层拖拽和展开区域在结构大纲与图表中具有一致、可理解的编辑反馈。
- Outcome: 已完成上下文选择、组内子分组、跨边界整组提升、跨层移动、最小分组自动解散和可配置展开
  分组背景区域。
- Boundary: 所有动作继续进入共享确定性命令，原始数据与 G2 runtime ownership 保持不变。

## G002-R2 开源官网与示例中心

- Status: Accepted
- Goal: 用真实图表首页、示例中心、开发者文档入口和连续工作台承载 TellPlot 的开源使用体验。
- Outcome: `/`、`/examples`、`/docs` 和 `/playground` 已覆盖当前三个图表家族及 beta 接入路径。
- Extension model: 新图表示例进入 playground 内容目录，不形成核心或公共 plugin registry。
- Boundary: 当前目标不包含新图表、远程内容、登录、搜索服务、npm publish 或网站部署。

## G002-R3 公共配置 API v1

- Status: Accepted
- Goal: 使用一份判别式 `ChartConfig` 完成普通接入，并把可编辑 `ViewSpec` 作为独立高级状态。
- Outcome: 类型和运行时配置校验、公开 facade、config/view 双文件工作台、迁移说明和发布候选回归。
- Boundary: 不增加图表家族、schema、依赖、raw G2Spec 或第二套领域状态。

## G003 基础图表扩展

- Status: Candidate
- Goal: 根据明确使用需求增加下一组基础图表，并保持数据、配置、动画、交互和导出体验一致。
- Entry criteria:
  - 明确目标图表、使用场景和数据合同。
  - 证明 G2 原生能力可以满足核心渲染与交互。
  - 不要求公共 registry、第二渲染引擎或破坏现有 API。
- Execution rule: 每个图表扩展目标包含设计、实现、测试、示例和兼容性验证，完成后整体验收。

## G004 首个稳定版 1.0 候选

- Status: Accepted
- Goal: 形成可复现、可审计的 `@tellplot/editor@1.0.0` 本地稳定候选。
- Included outcomes: 1.x 兼容合同、架构/cycle 门禁、稳定版文档、开源维护资料、tarball 审计、
  隔离源码 frozen-install 复演和完整兼容矩阵。
- Outcome: `@tellplot/editor@1.0.0` 本地 tarball 与上述门禁已完成，并于 2026-07-29 通过目标级验收。
- Boundary: 不新增图表、依赖、schema、breaking API 或通用 registry；不执行远程发布。

## G005 四包公开稳定版发布

- Status: Superseded
- Outcome: T130 建立的 source preflight、官方 registry audit、protected environment、stage-only Trusted
  Publishing、provenance、固定 artifact hash 和 2FA approval 继续作为发布安全基线。
- Superseded scope: 四个 scoped package 的公开发布不再执行；公共分发目标由 G007 的单包合同取代。

## G006 框架无关编辑器架构

- Status: Accepted
- Goal: 以内部 `@tellplot/core` 和 `@tellplot/editor` 作为唯一领域/runtime，实现 React 18/19 与 Vue 3 薄适配。
- Included outcomes: imperative DOM API、统一 EditorStore、完整工作台迁移、分层类型/构建/消费合同和三种
  quickstart。
- Outcome: T125-T129 已完成实现、质量矩阵、内部四层 package evidence 和目标级验收；用户于 2026-07-30
  接受 G006。
- Boundary: 不增加图表家族、schema、通用 plugin registry、第二渲染引擎或历史兼容层；不执行远程发布。
- Release relation: G006 固定内部架构，不要求内部 layer 与公共 npm package 一一对应。

## G007 单包分发与公开发布

- Status: In_Progress
- Goal: 只发布无 scope 的 `tellplot@1.0.0`，通过稳定子路径交付 imperative DOM、core、React、Vue 与 CSS。
- Public entrypoints: `tellplot`、`tellplot/core`、`tellplot/react`、`tellplot/vue`、`tellplot/styles.css`。
- Internal architecture: core、editor、React adapter 与 Vue adapter 继续是 private workspace layers，保持
  G006 的依赖方向、测试隔离和唯一 runtime ownership。
- Release controls: T131 使用单一可复现 tarball、exact annotated tag、protected `npm-production`
  environment、stage-only Trusted Publisher、provenance、人类 artifact 复核与 2FA approval。
- Completion: package/framework/browser/security/isolated-source 门禁、旧 stage 清理、public fresh install、
  provenance、tag、GitHub Release 和 Registry evidence 全部一致。

## Decision Gates

- 内部 `@tellplot/core` 保持无 DOM/G2/framework 依赖，`@tellplot/editor` 保持无 React/Vue 依赖。
- 新图表只在 G003 的具体目标获得批准后实现。
- 原始 G2 options、G2 Chart instance 和内部 runtime handle 不进入公共 API。
- 项目不规划 Dashboard、通用插件平台或第二渲染引擎。
