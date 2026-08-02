# TellPlot 任务图

## Metadata

- Version: 0.39.0
- Status: Active
- Last updated: 2026-08-02
- Scope: T101-T116、G002 系列、G004、G006 与 G007 已验收；`tellplot@1.0.0` 已完成公开发布

## Goal-Level Delivery

- 用户审批和验收单位是可独立交付的大目标，不是每个内部任务。
- 每个目标在执行前固定范围、不可变边界、质量门禁和最终成果。
- 内部任务、TDD 循环和缺陷修复由执行方连续完成并整合为目标级 evidence。
- 目标完成后统一进入 `Needs_Review`；breaking API、schema、依赖、远程 Git、publish 和 release
  保留独立人工闸门。

## Goal Portfolio

| Goal | Status | Outcome |
| --- | --- | --- |
| G001 - 多图表基础能力 | Accepted | T101-T116；waterfall、bar、column 与共享 G2 runtime 完整验收 |
| G002 - 轻量图表库 Beta | Accepted | T117；发布包、文档、兼容性和 beta 质量闭环 |
| G002-R1 - 分组与跨层编辑体验 | Accepted | T118；上下文选择、跨层拖拽和可配置展开分组区域 |
| G002-R2 - 开源官网与示例中心 | Accepted | T119；真实图表首页、示例中心、文档入口和连续工作台 |
| G002-R3 - 公共配置 API v1 | Accepted | T122；声明式配置、公共 facade 与 config/view 双文件工作台 |
| G003 - 基础图表扩展 | Candidate | 按明确需求增加下一组图表家族 |
| G004 - 首个稳定版 1.0 候选 | Accepted | T123；稳定合同、发布门禁与隔离源码复演 |
| G005 - 四包公开稳定版发布 | Superseded | T130 的安全门禁由 G007 复用；四包公开目标由单包决策取代 |
| G006 - 框架无关编辑器架构 | Accepted | T125-T129；内部四层架构、完整编辑器与质量门禁已验收 |
| G007 - 单包分发与公开发布 | Accepted | T131；`tellplot@1.0.0` 已发布，内部 core/editor/React/Vue layers 保持 private |

## T001 - 确认产品设计与项目章程

- Status: Completed
- Priority: P0
- Dependencies: 无
- Blocks: 无
- Story / Requirement: `product-design.md` 全部需求与 `constitution.md` 全部原则
- Parallel: 否
- Conflicts with: 在产品范围确认前创建源码、依赖或实现任务
- Goal: 确认产品定位、第一阶段图表范围、交付形态、导出边界和网络边界。
- Allowed files: `.ai-platform/docs/product-design.md`、`.ai-platform/memory/constitution.md`、`.ai-platform/docs/technology-decision-record.md`、`.ai-platform/docs/tasks.md`、`README.md`、`AGENTS.md`
- Test targets: 文档一致性、范围完整性、阻断问题闭环、artifact validator
- Deliverables: 经用户批准的产品设计 SSOT 与项目章程；明确的 `OQ-001` 至 `OQ-004` 结论
- Acceptance criteria: 用户明确批准产品定位、Phase 1A/1B 边界及项目原则；所有阻断问题有确定答案。
- Definition of Done: 产品设计与项目章程状态为 `Confirmed`，技术决策进入审批。
- Validation commands: `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root .`；`git diff --check`
- TDD plan: 不适用；当前任务不实现运行时代码。
- Packet path: 不适用；产品审批任务不生成实现执行包。
- Evidence required: 用户明确审批记录、artifact validator 通过、`git diff --check` 通过。

## T002 - 审批瀑布图基础切片技术方案

- Status: Completed
- Priority: P0
- Dependencies: T001
- Blocks: `.ai-platform/specs/001-waterfall-editor-foundation/tasks.md` 中全部实现任务
- Story / Requirement: US-001、US-002、US-004、US-005、US-007；FR-001 至 FR-009、FR-011、FR-012
- Parallel: 否
- Conflicts with: 在技术方案审批前创建应用源码或依赖
- Goal: 确认仓库结构、领域模型、组件 API、交互设计、依赖边界、测试分层和执行顺序。
- Allowed files: `.ai-platform/**`、`README.md`、`AGENTS.md`
- Test targets: requirements checklist、cross-artifact analysis、artifact validator
- Deliverables: `001-waterfall-editor-foundation` 下的 spec、plan、tasks、design contract、data model、contracts、research 与 analysis
- Acceptance criteria: 用户明确批准技术决策和 feature task graph；analysis 不含 Critical 或 High finding。
- Definition of Done: feature artifacts 状态为 `Confirmed`，首个实现任务转为 `Ready` 并生成执行包。
- Validation commands: `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 001-waterfall-editor-foundation`；`git diff --check`
- TDD plan: 不适用；当前任务生成和审核技术 artifact，不实现运行时代码。
- Packet path: 不适用；审批任务不生成实现执行包。
- Evidence required: 用户审批记录、validator 通过、analysis 结论、文档 diff summary。

## Feature Execution

权威实现任务图位于 `.ai-platform/specs/001-waterfall-editor-foundation/tasks.md`。

| Task | Status | Gate |
| --- | --- | --- |
| T101 - workspace 与质量工具链 | Accepted | 完成 |
| T102 - SourceData、ViewSpec 与验证器 | Accepted | 完成 |
| T103 - 命令执行器与历史 | Accepted | 完成 |
| T104 - 瀑布投影 | Accepted | 完成 |
| T105 - React 工作台与 G2 渲染 | Accepted | 完成 |
| T106 - 排序、分组与折叠交互 | Accepted | 用户已完成整行拖拽热区复验 |
| T106-CR001 - 递归分组与图表直接编排闭环 | Accepted | 用户已验收真实柱宽 X-only 排序、4px pending 手势、递归分组与锁定锚点 |
| T107 - 持久化、导出与可访问性闭环 | Accepted | 用户于 2026-07-16 明确验收 |
| T108 - 集成、包质量与视觉验收 | Accepted | 用户于 2026-07-18 明确验收；全量验证、final patch/validator 与全部独立 review 已通过 |

## T109 - TellPlot 品牌与独立仓库迁移

- Status: Accepted
- Priority: P0
- Dependencies: T108
- Blocks: 旧仓库处置决策与公开发布准备
- Story / Requirement: CD-004、TDR-011
- Parallel: 否
- Conflicts with: 归档、改名或删除旧 GitHub 仓库；npm publish；修改产品行为
- Goal: 将已验收的发布候选迁入独立 TellPlot Git 根目录，统一品牌与公共命名空间，并以可验证的干净历史推送到新私有仓库。
- Allowed files: TellPlot 新仓库全部文件；新建 `iiwish/tellplot` GitHub 仓库及其设置
- Forbidden targets: `iiwish/g2touch` 的仓库名称、归档状态、分支和内容
- Test targets: 品牌残留、格式、lint、类型、单元/coverage、构建、包消费、React/浏览器兼容、E2E、可访问性、性能、artifact validator、远程 CI
- Deliverables: 独立 TellPlot 仓库、规范 `main` 根提交、通过的本地与远程验证、迁移 evidence
- Acceptance criteria: 当前源码与规范不含旧品牌标识；`@tellplot/editor` 可构建和消费；GitHub CI 通过；旧远端保持不变。
- Definition of Done: 新仓库可从干净 clone 安装和验证，`main` 已推送且远程 CI 通过；仓库规则能力已审计，外部计划限制有明确证据；旧仓库处理仍处于单独后续闸门。
- Validation commands: `pnpm install --frozen-lockfile`；`pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:react-matrix`；`pnpm test:browser-previous`；`pnpm test:e2e`；`pnpm test:a11y`；`pnpm test:performance`；brand residue audit；artifact validator；GitHub Actions
- TDD plan: RED：先证明当前命名残留扫描会发现旧品牌；GREEN：完成包、公共标识、文档和配置的最小一致迁移；REFACTOR：统一公开 namespace 并保持历史 evidence patch 不变。迁移不改变产品行为。
- Packet path: `.ai-platform/specs/002-tellplot-repository-migration/packets/T109.yaml`
- Evidence required: 源/目标清单、旧历史镜像校验、品牌扫描、本地验证、GitHub CI、仓库设置与旧远端不变证明。

## T110 - 长期文档与安全图表配置层

- Status: Accepted
- Priority: P0
- Dependencies: T108；TellPlot 独立仓库已建立
- Blocks: 分类图验证切片与稳定公共配置文档
- Story / Requirement: FR-013、CD-006、TDR-012
- Parallel: 否
- Conflicts with: 新图表类型、ViewSpec schema 修改、任意 G2Spec 透传、旧仓库操作
- Goal: 提供长期文档入口与有限、类型化、屏幕/导出一致的 `FinancialChartAppearance`。
- Allowed files: `docs/**`、`README.md`、`AGENTS.md`、`.ai-platform/**`、editor 配置/组件/导出/react/公共入口、相关 tests/e2e
- Test targets: 配置解析、G2 spec、组件 rerender、导出、公共类型、package、E2E、a11y、performance
- Deliverables: roadmap、architecture、configuration 文档；安全公共配置 API；T110 evidence
- Acceptance criteria: 默认行为不变；批准配置映射确定；无原始 G2 escape hatch；全量验证通过。
- Definition of Done: TDD、全量验证、review、evidence 与用户验收全部完成。
- Validation commands: `pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:e2e`；`pnpm test:a11y`；`pnpm test:performance`；artifact validator；`git diff --check`
- TDD plan: RED 配置/映射/一致性测试；GREEN 最小配置层；REFACTOR 统一默认值与 screen/export spec。
- Packet path: `.ai-platform/specs/003-chart-configuration-foundation/packets/T110.yaml`
- Evidence required: RED receipt、测试结果、API 边界 review、最终 diff 与残余风险。

## Next Gate

## T111 - 审批分类图需求与技术合同

- Status: Accepted
- Priority: P0
- Dependencies: T110 Accepted
- Blocks: T112-T116
- Story / Requirement: US-003、FR-005、TDR-013、TDR-014
- Parallel: 否
- Conflicts with: 未经审批修改 schema、公共 API、图表范围或开始实现
- Goal: 确认分类图范围、schema v2、legacy 兼容矩阵、公共 API、G2/交互边界、任务图和质量门禁。
- Allowed files: `.ai-platform/specs/004-categorical-chart-validation/**`、`.ai-platform/docs/technology-decision-record.md`、`.ai-platform/docs/tasks.md`、`AGENTS.md`
- Test targets: requirements checklist、cross-artifact analysis、artifact validator
- Deliverables: Confirmed feature artifacts、Completed checklist/analysis、T112 execution packet
- Acceptance criteria: 用户明确批准全部 004 artifacts；analysis 无 Critical/High finding；T112 packet 自包含。
- Definition of Done: 用户于 2026-07-19 明确批准；T111 Accepted；T112 Ready。
- Validation commands: `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 004-categorical-chart-validation`；`git diff --check`
- TDD plan: 不适用；本任务只审批技术 artifact。
- Packet path: 不适用；审批任务不生成实现 packet。
- Evidence required: 用户审批记录、validator、analysis、文档 diff。

## Feature 004 Execution

权威实现任务图位于 `.ai-platform/specs/004-categorical-chart-validation/tasks.md`。

| Task | Status | Gate |
| --- | --- | --- |
| T111 - 审批分类图需求与技术合同 | Accepted | 用户于 2026-07-19 明确批准 |
| T112 - 扩展数据合同与共享命令策略 | Accepted | 用户于 2026-07-19 明确验收；实现、evidence 与质量门禁完整 |
| T113 - 分类投影与 G2 Spec | Accepted | clean review 后用户条件验收成立 |
| T114 - 方向感知分类轴交互 | Accepted | 用户条件验收成立；fresh review 与全部门禁通过 |
| T115 - 分类图编辑、导出与可访问性 | Accepted | 用户于 2026-07-20 明确验收实现、evidence 与已披露执行偏差 |
| T116 - 多图表内部架构收敛 | Accepted | 用户于 2026-07-20 明确验收；G001 完成 |

## G002 Execution

G002 已由用户批准并以 T117 连续完成。发布包、文档、兼容性、可配置 panel、布局和双向工作台 evidence
完整；用户于 2026-07-29 完成统一验收。权威目标图位于
`.ai-platform/specs/005-lightweight-chart-library-beta/tasks.md`。旧仓库处置、npm publish 和正式发布保持
独立闸门。

## G002-R1 Execution

G002-R1 已由用户批准并以 T118 连续完成。上下文选择、区域边界退出、click/drag 动作区分、跨层移动、
原子解散和展开分组区域 evidence 完整；用户于 2026-07-29 完成统一验收。权威目标图位于
`.ai-platform/specs/006-group-cross-level-experience/tasks.md`。

## G002-R2 Execution

G002-R2 已由用户批准并以 T119 连续完成。真实图表首页、示例中心、开发者文档入口、连续工作台以及
桌面/移动验证均已交付；用户于 2026-07-29 完成统一验收。权威目标图、设计合同与任务证据位于
`.ai-platform/specs/007-open-source-showcase/` 和 `.ai-platform/evidence/T119/`。

## G002-R3 Execution

G002-R3 已由用户于 2026-07-23 批准 breaking public API 和连续执行，内部以 T122 完成交付
`ChartEditor`、判别式 `ChartConfig`、`validateChartConfig`、config/view 双文件工作台、迁移说明和完整
发布候选门禁；用户于 2026-07-29 完成统一验收，状态为 `Accepted`。权威目标图位于
`.ai-platform/specs/009-public-configuration-api/tasks.md`。

## G004 Execution

G004 已由用户于 2026-07-23 批准，内部以 T123 连续完成 `@tellplot/editor@1.0.0` 本地稳定候选、
兼容政策、开源资料、完整发布门禁、隔离源码复演和当前/旧版浏览器矩阵。2026-07-24 发布复核关闭了
WebKit 长队列资源耗尽、不完整聚合门禁、npm registry 漂移和内部交付记录个人路径泄漏。用户于
2026-07-29 完成统一验收，状态为 `Accepted`。权威目标图与交付证据位于 `.ai-platform/specs/010-stable-v1-release/` 和
`.ai-platform/evidence/T123/`。

原 G004 Beta 草案与 T120/T121 不再是当前执行入口。公开 Git、仓库可见性、生产网站、DNS、tag、
GitHub Release 和 npm publish 归入 G005，保持 `Blocked`，直到取得独立远程授权并具备发布身份与托管条件。

## G006 Execution

G006 以 T125-T129 交付框架无关 `@tellplot/core`、imperative `@tellplot/editor`、React 18/19 与 Vue 3
薄适配、完整编辑器迁移、四包 tarball 与完整质量矩阵。最终 439 unit、186 current browser、45 a11y、
186 previous browser、62 WebKit 18.4、性能、供应链、tarball 与 336-file 隔离源码复演全部通过，未解决
Critical / High / Medium finding 为 0；用户于 2026-07-30 完成目标级验收，状态为 `Accepted`。权威
目标图、合同和执行证据位于 `.ai-platform/specs/011-framework-neutral-editor/` 与
`.ai-platform/evidence/T125/` 至 `.ai-platform/evidence/T129/`。G005 仅因独立远程授权、发布身份与托管
条件、npm package bootstrap、stage-only trust 和 2FA approval 保持 `Blocked`。

## G005 Local Release Readiness

G005 的本地发布准备由 T130 关闭浏览器确定性、官方 production audit、public source preflight、
stage-only Trusted Publishing workflow 和 canonical 文档缺口。当前状态为 `Needs_Review`；workflow 只把
固定 SHA-256 的四包提交到 npm staging，不直接执行 `npm publish`。公开发布仍要求独立授权、四个
package root bootstrap、stale annotated `v1.0.0` 的受控重建与保护、stage-only trust 配置、人类复核与
2FA approval、公开仓库和生产托管条件。

权威目标图与 evidence 位于 `.ai-platform/specs/012-public-release-readiness/` 和
`.ai-platform/evidence/T130/`。

G005 / T130 保留为已完成的本地发布安全基线；其四包 artifact 目标不再执行。source preflight、官方
registry audit、protected environment、stage-only Trusted Publishing、provenance、固定 hash 和 2FA
approval 继续由 G007 复用。

## G007 Delivery

G007 以 T131 把 npm 公共分发收敛为一个无 scope 的 `tellplot` 包。
公共入口固定为 `tellplot`、`tellplot/core`、`tellplot/react`、`tellplot/vue` 和 `tellplot/styles.css`；
内部 `@tellplot/core`、`@tellplot/editor`、`@tellplot/react`、`@tellplot/vue` 保持 private workspace
layers，不独立发布，不建设兼容 shim。

T131 已完成 package 聚合、playground/文档/consumer/release pipeline 迁移、完整质量门禁、旧 stage
清理、单 package bootstrap/trust、受控 tag 重建、staged artifact 复核、2FA approval、公开 fresh install
和 GitHub Release。npm `latest` 指向 `1.0.0`，provenance 解析到受保护的 `v1.0.0` 与发布提交
`a3e07c9ac9b20183092729cde234322db98f9835`；四个 scoped bootstrap package 无可安装版本，状态为
`Accepted`。权威目标图与 evidence 位于
`.ai-platform/specs/013-single-package-distribution/` 和 `.ai-platform/evidence/T131/`。

## G008 Needs Review

G008 已完成 T132-T134。React/Vite 官网由 Vercel 从 GitHub `main` 的 clean commit 构建，使用 Node 22、
pnpm 11.1.3 和 frozen lockfile；Preview、Production、四个直接路由、404、metadata、缓存与安全头均已验证。
Cloudflare 继续提供权威 DNS，`https://tellplot.com` 是 canonical production origin，`www` 以 308 保留路径
跳转到 apex。TLS、真实 Chrome 图表渲染与 Vercel rollback 入口均有 evidence。

T132-T134 状态均为 `Needs_Review`，无 unresolved Critical、High 或 Medium finding。权威目标图位于
`.ai-platform/specs/014-website-production-deployment/tasks.md`，evidence 位于 `.ai-platform/evidence/T132/`、
`.ai-platform/evidence/T133/` 和 `.ai-platform/evidence/T134/`。
