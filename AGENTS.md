# AGENTS.md - TellPlot AI Agent Guide

## 项目状态

- 当前阶段：T101-T116、G002 / T117、G002-R1 / T118、G002-R2 / T119、G002-R3 / T122、
  G004 / T123、G006 / T125-T129 与 G007 / T131 均已验收；`tellplot@1.0.0` 已发布到 npm 和 GitHub。
- 当前仓库以 `tellplot` 作为唯一公共包；内部 `@tellplot/core`、`@tellplot/editor`、`@tellplot/react`、
  `@tellplot/vue` 均为 private workspace layers。playground、单元/组件/E2E/兼容性测试和单包发布 evidence
  共同验证公共入口；npm 发布使用 stage-only Trusted Publisher、人类 2FA approval 与 SLSA provenance。
- 产品 SSOT：`.ai-platform/docs/product-design.md`。
- 项目原则：`.ai-platform/memory/constitution.md`。
- 技术决策：`.ai-platform/docs/technology-decision-record.md`。
- 当前任务图：`.ai-platform/docs/tasks.md`。
- 长期文档入口：`docs/README.md`。

任何实现、技术选型或任务拆分开始前，必须先读取上述文档以及当前 feature 目录。新增产品范围、架构决策和 feature task graph 未经用户明确批准并标记为 `Confirmed` 前不得执行。

## 工作边界

- 产品是基于 G2 的轻量可编辑基础图表库，当前内建瀑布图、分类条形图和分类柱状图。
- 原始财务数据不可被图表编辑动作直接改写。
- 直接操作、结构大纲、键盘和宿主调用必须进入同一套确定性命令。
- 核心不建设 AI、Agent、Dashboard、服务端工作流或通用图表插件系统。
- 优先使用 G2 原生事件、状态和动画能力，不重复建设图表运行时。
- 新依赖必须解决已确认问题；不得只为“更丝滑”引入动画框架。

## 目标级交付

- 后续规划以大目标为用户审批与验收单位；一个目标可以包含多个内部任务。
- 用户批准目标后，内部任务连续执行，不逐项请求用户验收；目标完成后统一进入 `Needs_Review`。
- breaking public API、schema、依赖、远程 Git、publish、release 或新增产品范围仍需独立明确批准。

## 工程规则

- 默认使用 TypeScript 严格模式。
- 新前端工程默认使用 `pnpm`，除非 SSOT 或已批准 TDR 另有规定。
- 行为实现默认采用 TDD。
- 禁止 `any`、`@ts-ignore`、`@ts-expect-error`，除非批准的技术决策记录明确说明原因。
- 公共 API 必须有明确类型和文档。
- 所有财务聚合、顺序和层级变更必须有不变量测试。
- 不得使用猜测图形边界的方式代替 G2 提供的事件目标、比例尺或场景图能力。

## Git 与交付

- 修改前检查 `git status --short --branch`。
- 不覆盖或回滚用户的无关变更。
- 未经用户明确授权，不执行 push、PR、merge、publish 或其他远程变更。
- 使用 Conventional Commits。
- 产品、架构和任务 artifact 必须经过明确审批闸门。

## 语言

- 与用户沟通及用户直接阅读的文档默认使用简体中文。
- 技术标识、API、命令和错误消息保留英文。
