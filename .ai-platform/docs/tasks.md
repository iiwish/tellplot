# TellPlot 任务图

## Metadata

- Version: 0.7.0
- Status: Active
- Last updated: 2026-07-19
- Scope: T101-T110 已验收；下一阶段进入分类条形图与柱状图验证切片

## T001 - 确认产品设计与项目章程

- Status: Completed
- Priority: P0
- Dependencies: 无
- Blocks: 无
- Story / Requirement: `product-design.md` 全部需求与 `constitution.md` 全部原则
- Parallel: 否
- Conflicts with: 在产品范围确认前创建源码、依赖或实现任务
- Goal: 确认产品定位、第一阶段图表范围、交付形态、导出边界和 AI 数据边界。
- Allowed files: `.ai-platform/docs/product-design.md`、`.ai-platform/memory/constitution.md`、`.ai-platform/docs/technology-decision-record.md`、`.ai-platform/docs/tasks.md`、`README.md`、`AGENTS.md`
- Test targets: 文档一致性、范围完整性、阻断问题闭环、artifact validator
- Deliverables: 经用户批准的产品设计 SSOT 与项目章程；明确的 `OQ-001` 至 `OQ-004` 结论
- Acceptance criteria: 用户明确批准产品定位、Phase 1A/1B 边界及项目原则；所有阻断问题有确定答案。
- Definition of Done: 产品设计与项目章程状态为 `Confirmed`，技术决策进入审批。
- Validation commands: `python3 /Users/iiwish/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root .`；`git diff --check`
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
- Validation commands: `python3 /Users/iiwish/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 001-waterfall-editor-foundation`；`git diff --check`
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

分类条形图与柱状图验证切片进入 feature 设计。旧仓库归档、npm publish 和正式版本发布保持独立授权闸门。
