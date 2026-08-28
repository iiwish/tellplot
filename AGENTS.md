# AGENTS.md - TellPlot AI Agent Guide

## 项目状态

- 当前阶段：T101-T116、G002 / T117、G002-R1 / T118、G002-R2 / T119、G002-R3 / T122、
  G004 / T123、G006 / T125-T129 与 G007 / T131 均已验收；`tellplot@1.0.0` 已发布到 npm 和 GitHub。
- G008 / T132-T134 已完成并处于 `Needs_Review`；官网由 Vercel 从 clean Git source 部署到
  `https://tellplot.com`，Cloudflare 保持权威 DNS，Preview/Production、HTTPS、静态可发现性与部署 evidence
  均已验收；该目标不包含 npm publish、tag 或公共包变更。
- G003 多序列分类比较的产品范围、本地 `tellplot@2.0.0` / schema `3.0.0` 方向与精确 breaking public
  API/schema contracts、TDR-025、technical plan 与 T135-T141 work graph 已确认，planning analysis 无阻断 finding。
  G003 与 T135-T141 已由用户于 2026-08-28 完成目标级验收并处于 `Accepted`；完整质量矩阵与三层终审均为
  Critical 0 / High 0 / Medium 0。T135 唯一 editor package version assertion 失败仍是其执行前即存在的 baseline exception。T140
  的真实 G2/export review 形成的 TDR-025-A01 / T140 amendment 已由用户于 2026-08-27 明确批准；T140 A008/A009
  定向恢复与 fresh evidence 已通过三层终审。T141-A003 format hygiene 与 candidate rehearsal amendment 已获批准；
  200x2 performance、50x4 responsive、current/previous browser、package/framework/security、可复现 candidate 和
  目标级 evidence 均已收口。dependency、远程 Git、
  stage/commit/push/PR、publish、tag、release 与 production promotion 仍需独立明确批准。
- G003-R1 TellPlot 2.0 发布准备范围已由用户于 2026-08-28 确认；feature
  `.ai-platform/specs/016-tellplot-v2-release-readiness/` 的 requirements checklist 已完成，TDR-026、Technical
  Plan、T142-T145 Work Graph、packets 与 planning analysis 已于同日获用户明确批准。G003/T135-T141
  已完成验收；T142 已通过 focused gates 与三层终审并处于 `Needs_Review`，T143 为
  `Running`，T144-T145 按串行前置推进。本目标只建设本地 current-release contract、
  integrated-source artifact、fresh rehearsal 与授权材料，不执行远程 Git、tag、stage、publish 或 release。
- 当前仓库以 `tellplot` 作为唯一公共包；内部 `@tellplot/core`、`@tellplot/editor`、`@tellplot/react`、
  `@tellplot/vue` 均为 private workspace layers。playground、单元/组件/E2E/兼容性测试和单包发布 evidence
  共同验证公共入口；npm Registry 不保留 scoped 可安装版本，发布使用 stage-only Trusted Publisher、人类
  2FA approval 与 SLSA provenance。
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
