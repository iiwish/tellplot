# TellPlot 分类图验证切片任务图

## Metadata

- Feature ID: `004-categorical-chart-validation`
- Version: 0.15.0
- Status: Confirmed
- Last updated: 2026-07-20
- Approval: 用户于 2026-07-20 明确验收 T116-A001
- Execution state: T111-T116 Accepted；E004 完成

## Work Graph

### Epic E004 分类图验证切片

交付单序列 bar/column 的确定性编辑、G2 渲染、直接操作、持久化、导出和可访问性，并在第二类图表
通过后收敛内部多图表架构。

### Stories

| Story | User value | Tasks |
| --- | --- | --- |
| S004-1 类型安全的分类叙事状态 | 分类数据可以安全创建、保存和编辑，不破坏 legacy waterfall | T111, T112 |
| S004-2 G2 分类图与直接操作 | 用户可以在 bar/column 中看到并拖动同一叙事顺序 | T113, T114 |
| S004-3 完整编辑与输出 | 用户可以分组、撤销、导出并使用键盘/辅助技术 | T115 |
| S004-4 可维护的多图表内核 | 两类图表共享被真实证明的运行时边界并通过全量门禁 | T116 |

### Dependency Graph

```text
T111
  -> T112
       -> T113 [P] --+
       -> T114 [P] --+-> T115 -> T116
```

T113 与 T114 只有在 T112 Accepted 后才允许并行。T113 只拥有 categorical projection/spec，T114 只拥有
axis-neutral interaction primitives，二者不得修改同一文件。

## T111 - 审批分类图需求与技术合同

- Status: Accepted
- Priority: P0
- Dependencies: T110 Accepted
- Blocks: T112、T113、T114、T115、T116
- Story / Requirement: `US-003`、`FR-005`、CAT-FR-001 至 CAT-FR-009、CAT-NFR-001 至 CAT-NFR-006
- Parallel: false
- Conflicts with: 任何分类图运行时代码、schema 修改、公共 API 修改或架构重构
- Goal: 确认分类图产品范围、schema v2、legacy 兼容矩阵、公共 API、G2/交互边界、任务图和质量门禁。
- Allowed files: `.ai-platform/specs/004-categorical-chart-validation/**`；批准后同步
  `.ai-platform/docs/technology-decision-record.md`、`.ai-platform/docs/tasks.md`、`AGENTS.md`
- Test targets: requirements checklist、cross-artifact analysis、artifact validator、文档链接和 placeholder audit
- Deliverables: 经用户明确批准并标记为 `Confirmed` 的 spec、data model、API contract、plan 和 tasks；完成的
  checklist/analysis；首个任务执行前 packet
- Acceptance criteria: 用户明确批准数据合同、兼容策略、非目标、技术计划、任务顺序和验证矩阵；analysis
  不含 Critical/High finding。
- Definition of Done: T111 状态为 `Accepted`；feature artifacts 为 `Confirmed`；T112 packet 自包含且 T112
  状态为 `Ready`。
- Validation commands: `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 004-categorical-chart-validation`；`git diff --check`
- TDD plan: 不适用；本任务只验证自然语言需求、技术决策和工作图，不实现行为。
- Packet path: 不适用；审批任务不生成实现 execution packet。
- Evidence required: 用户明确审批记录、artifact validator、placeholder audit、cross-artifact analysis 和文档 diff。

## T112 - 扩展数据合同与共享命令策略

- Status: Accepted
- Priority: P0
- Dependencies: T111 Accepted
- Blocks: T113、T114、T115、T116
- Story / Requirement: S004-1；CAT-FR-001、CAT-FR-002、CAT-FR-003、CAT-FR-008；CAT-NFR-001、
  CAT-NFR-004、CAT-NFR-006；CAT-AC-001、CAT-AC-004、CAT-AC-005、CAT-AC-009
- Parallel: false
- Conflicts with: T113、T114、T115、T116；任何原始 G2Spec 公开、implicit schema migration 或 command
  wire shape 修改
- Goal: 以 strict discriminated union 支持 legacy waterfall、current waterfall 和 current categorical，建立
  source/view compatibility、initial view、version-preserving persistence 和最小内部 chart policy。
- Allowed files: `packages/editor/src/domain/model.ts`、`packages/editor/src/domain/errors.ts`、
  `packages/editor/src/domain/validation.ts`、`packages/editor/src/domain/createInitialViewSpec.ts`、
  `packages/editor/src/domain/session.ts`、`packages/editor/src/domain/history.ts`、
  `packages/editor/src/domain/invariants.ts`、`packages/editor/src/domain/executeCommand.ts`、
  `packages/editor/src/domain/persistence.ts`、`packages/editor/src/domain/viewTree.ts`、
  `packages/editor/src/domain/chartPolicy.ts`、
  `packages/editor/src/index.ts`、`packages/editor/src/waterfall/projectWaterfall.ts`（仅允许对新增 union 做类型收窄，
  不改变 waterfall projection 语义）、`packages/editor/src/components/FinancialChartEditor.tsx` 与
  `packages/editor/src/interactions/groupSelection.ts`（仅允许对不存在 `kind` 的 categorical item 做防御性
  类型收窄，不接入 categorical UI/interaction）、`packages/editor/tests/domain/**`、
  `packages/editor/tests/package/**`、
  `.ai-platform/evidence/T112/**`
- Test targets: schema discriminator/closed input、legacy identity、compatibility matrix、initial default/explicit type、
  tree coverage、waterfall segment policy、categorical movable policy、fingerprint、parse/serialize、public types
- Deliverables: public discriminated types；chart-compatible validators；initial view options；version-preserving
  persistence；internal chart policy；T112 evidence
- Acceptance criteria: legacy `1.0.0` waterfall calls 保持 deep-equal 行为；categorical default column/explicit bar
  生效；全部 incompatible combinations 稳定拒绝；command wire schema 不变；无财务值泄露。
- Definition of Done: RED/GREEN receipt、domain coverage 四项不低于 95%、package type consumer 通过、spec 与
  engineering review 无 blocking finding、evidence 完整，状态进入 `Needs_Review`。
- Validation commands: `pnpm exec vitest run packages/editor/tests/domain packages/editor/tests/package`；
  `pnpm test:coverage`；`pnpm typecheck`；
  `pnpm build`；`pnpm test:package`；`pnpm lint`；`git diff --check`
- TDD plan: RED 先锁定 v2 discriminator、legacy contract、compatibility、policy 和 round-trip；GREEN 实现最小
  schema dispatch/policy；REFACTOR 只在 domain suite green 后消除重复，保持 command wire 和 v1 identity。
- Packet path: `.ai-platform/specs/004-categorical-chart-validation/packets/T112.yaml`
- Evidence required: RED/GREEN 命令输出、changed files、public type diff、schema compatibility matrix results、
  coverage、review findings、residual risk 和 final patch。
- Review state: spec compliance、engineering 和 QA 自审均无 blocking finding；fresh unit 341/341、domain
  coverage 98.09/95.61/100/98.05、waterfall coverage 97.56/96.15/100/97.54、type/build/package/lint/format
  全绿。
- Acceptance authority: 用户于 2026-07-19 明确回复“T112 验收通过”。

## T113 - 实现分类投影与 G2 Spec

- Status: Accepted
- Priority: P0
- Dependencies: T112 Accepted
- Blocks: T115、T116
- Story / Requirement: S004-2；CAT-FR-004、CAT-FR-005、CAT-FR-009；CAT-NFR-001、CAT-NFR-003、
  CAT-NFR-004；CAT-AC-003、CAT-AC-006、CAT-AC-007、CAT-AC-008
- Parallel: true，允许与 T114 并行，前提是独立 worktree 且不修改 interactions/components
- Conflicts with: T115、T116；T114 的 interactions ownership；waterfall behavior 和 chartAppearance public shape
- Goal: 建立一个确定性 categorical projection 和一个由 chartType 决定方向的 G2 interval spec factory，
  覆盖聚合、顺序、颜色、标签、annotation、emphasis、Tooltip 和原生动画。
- Allowed files: `packages/editor/src/categorical/**`、`packages/editor/src/config/chartAppearance.ts`、
  `packages/editor/tests/categorical/**`、`packages/editor/tests/export/categorical-chart-spec.test.ts`、
  `vitest.config.ts`、`.ai-platform/evidence/T113/**`
- Test targets: empty/single/positive/negative/zero、重复标签、递归 collapsed/expanded、mixed-sign group、pinned
  descendant、compensated sum/overflow、determinism、column Cartesian/bar transpose、category scale/order、
  appearance、reduced motion、stable key、tooltip/labels/annotations/emphasis
- Deliverables: CategoricalDatum/Projection；projectCategorical；bar/column shared spec factory；95% coverage gate；
  T113 evidence
- Acceptance criteria: 同一 source/view 的 bar 与 column projection deep-equal；逻辑顺序稳定；group amount 和
  sourceIds 正确；G2 spec 只改变方向相关编码；无 raw G2 public export；waterfall spec tests 无回归。
- Definition of Done: RED/GREEN、categorical coverage 四项不低于 95%、type/lint/build 通过、projection/spec
  review 无 blocking finding、evidence 完整，状态进入 `Needs_Review`。
- Validation commands: `pnpm exec vitest run packages/editor/tests/categorical packages/editor/tests/export/categorical-chart-spec.test.ts packages/editor/tests/export/chart-spec.test.ts`；`pnpm test:coverage`；`pnpm typecheck`；`pnpm lint`；`pnpm build`；`pnpm format:check`；`python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 004-categorical-chart-validation --task-id T113`；`git diff --check`
- TDD plan: RED 先覆盖投影不变量和两种 encode；GREEN 实现独立 categorical projection/spec；REFACTOR 只复用
  已存在的纯金额格式/appearance 函数，不移动 waterfall runtime。
- Packet path: `.ai-platform/specs/004-categorical-chart-validation/packets/T113.yaml`
- Evidence required: RED/GREEN 输出、projection fixtures、G2 spec snapshots/structural assertions、coverage、
  waterfall regression results、review findings、residual risk 和 final patch。
- Packet review state: 用户于 2026-07-19 明确批准 T113 packet 并授权开始实现。
- Review state: focused 23/23、full coverage 357/357；categorical coverage
  98.90/100/100/98.88；type/build/lint/format/artifact/diff 全绿；三层 review 无 blocking finding。
- Acceptance authority: 用户要求 review T113，若无问题继续 T114；review 无 actionable finding，条件验收成立。

## T114 - 建立方向感知的分类轴交互

- Status: Accepted
- Priority: P0
- Dependencies: T112 Accepted
- Blocks: T115、T116
- Story / Requirement: S004-2；CAT-FR-006、CAT-FR-007；CAT-NFR-001、CAT-NFR-002、CAT-NFR-003、
  CAT-NFR-004；CAT-AC-002、CAT-AC-004、CAT-AC-007
- Parallel: true，允许与 T113 并行，前提是独立 worktree 且不修改 categorical projection/spec
- Conflicts with: T115、T116；T113 的 categorical ownership；猜测固定图形尺寸或引入第二个拖拽内核
- Goal: 把 G2 scene bounds 与 pointer collision 扩展为 X/Y category-axis primitive，保持瀑布/column 的
  X 行为，并为 bar 提供 top-to-bottom Y 排序。
- Allowed files: `packages/editor/src/interactions/chartPointer.ts`、
  `packages/editor/src/interactions/moveTargets.ts`、`packages/editor/src/interactions/categoryAxis.ts`、
  `packages/editor/tests/components/chartPointer.test.ts`、
  `packages/editor/tests/components/categoryAxis.test.ts`、`.ai-platform/evidence/T114/**`
- Test targets: scene bounds min/center/max、X/Y edge、top-to-bottom order、translated rectangle collision、同父级
  target、4px threshold input、reverse drag、return-to-origin、invalid/stale bounds、locked target、hostile G2 event
- Deliverables: axis-neutral bounds/collision types and functions；兼容 waterfall X wrappers；bar Y primitives；
  T114 evidence
- Acceptance criteria: 现有 waterfall pointer tests 保持 deep-equal；column 与 bar 的等价 gesture 产生相同
  logical target；value-axis movement 不改变 target；不读取固定 bar width/row height；结构化失败不抛异常。
- Definition of Done: RED/GREEN、interaction tests/coverage 通过、type/lint 通过、G2 event boundary review 无
  blocking finding、evidence 完整，状态进入 `Needs_Review`。
- Validation commands: `pnpm exec vitest run packages/editor/tests/components/chartPointer.test.ts packages/editor/tests/components/categoryAxis.test.ts packages/editor/tests/components/group-actions.test.ts`；`pnpm test:unit`；`pnpm test:coverage`；`pnpm typecheck`；`pnpm lint`；`pnpm format:check`；`python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 004-categorical-chart-validation --task-id T114`；`git diff --check`
- TDD plan: RED 先固定 Y-axis 和 X regression；GREEN 实现最小 coordinate adapter；REFACTOR 在 parity green 后
  用 category-axis 内核替代 horizontal-only 私有重复，保留兼容函数直到 T115 集成。
- Packet path: `.ai-platform/specs/004-categorical-chart-validation/packets/T114.yaml`
- Evidence required: RED/GREEN 输出、axis parity table、hostile event cases、waterfall regression、review findings、
  residual risk 和 final patch。
- Packet review state: 用户于 2026-07-19 明确授权在 T113 clean review 后继续 T114；条件已满足。
- Review state: scoped 34/34、full unit/coverage 370/370；category-axis coverage
  98.71/95.78/100/98.66；type/build/lint/format/strict artifact/reverse patch/diff 全绿；三层 review 无
  blocking finding。
- Acceptance authority: 用户于 2026-07-19 要求 review T114，并明确授权无问题时设计后续长目标；fresh review
  无 actionable finding，条件验收成立。

## T115 - 完成分类图编辑、导出与可访问性闭环

- Status: Accepted
- Priority: P0
- Dependencies: T113 Accepted、T114 Accepted
- Blocks: T116
- Story / Requirement: S004-2、S004-3；CAT-FR-005 至 CAT-FR-009；CAT-NFR-001 至 CAT-NFR-006；
  CAT-AC-001 至 CAT-AC-008
- Parallel: false
- Conflicts with: T112、T113、T114、T116；独立领域状态、复制 Outline/session、原始 G2Spec 公开、新依赖
- Goal: 把 categorical projection/spec/axis interaction 接入唯一 `FinancialChartEditor`，交付 bar/column 的
  直接操作、outline、history、SVG/PNG、empty/error、a11y 和真实浏览器工作流。
- Allowed files: `packages/editor/src/components/**`、`packages/editor/src/react/**`、
  `packages/editor/src/export/**`、`packages/editor/src/styles/editor.css`、`packages/editor/src/index.ts`、
  `packages/editor/tests/components/**`、`packages/editor/tests/export/**`、`packages/editor/tests/package/**`、
  `apps/playground/**`、`e2e/**`、`playwright.config.ts`、`.ai-platform/evidence/T115/**`
- Test targets: source-only column、defaultViewSpec bar、controlled/uncontrolled、selection、direct X/Y reorder、
  group/collapse/expand/ungroup、pinned feedback、undo/redo、empty/invalid/render error、screen rerender、SVG/PNG、
  summary/keyboard/aria-live/reduced motion、React/package/browser compatibility、200-item performance
- Deliverables: CategoricalCanvas；editor chart dispatch；chart-neutral export request；classification summary/copy；
  playground fixtures；unit/component/E2E/a11y/performance/package evidence
- Acceptance criteria: bar/column 主流程可在真实浏览器完成；逻辑顺序跨 canvas/outline/summary/export 一致；
  screen/export 共享 spec；活动预览不可导出；无第二套 session/command；瀑布全部 baseline 无回归。
- Definition of Done: scoped RED/GREEN、当前浏览器三引擎、React matrix、package、a11y、分类 performance、
  必需截图和 spec/engineering/QA review 通过，evidence 完整，状态进入 `Needs_Review`。
- Validation commands: `pnpm test:unit`；`pnpm test:coverage`；`pnpm typecheck`；`pnpm lint`；`pnpm build`；
  `pnpm test:package`；`pnpm test:react-matrix`；`pnpm test:e2e`；`pnpm test:a11y`；
  `pnpm test:performance`；`git diff --check`
- TDD plan: RED 按 component -> export -> browser 顺序锁定 source/view dispatch 和用户流程；GREEN 接入最小
  CategoricalCanvas 与 chart-neutral export；REFACTOR 仅消除本任务内部重复，不提前移动 waterfall runtime。
- Packet path: `.ai-platform/specs/004-categorical-chart-validation/packets/T115.yaml`
- Evidence required: RED/GREEN 输出、当前三浏览器结果、React/package/a11y/performance、bar/column screen/export
  screenshots、pixel checks、review findings、residual risk 和 final patch。
- Authorization: 用户于 2026-07-19 明确要求在 T114 clean review 后创建可持续执行 6-7 小时的长目标；目标
  仅覆盖已批准 T115，packet 为 `T115-A001`，最终必须停在 `Needs_Review`。
- Review state: scoped 170/170、full unit/coverage 380/380、当前三浏览器 132/132、a11y 27/27、React
  18/19、package、type/build/lint/format、200-item performance 与 strict artifact gate 全绿；三层 review 无
  blocking finding，完整 evidence 位于 `.ai-platform/evidence/T115/`。
- Execution variance: shared `groupSelection.ts` 对 categorical leaf 的 accepted baseline 判定缺陷已做最小
  chart-family-aware 修复，并保留 waterfall anchor/pinned rejection；该 read-only 偏差在 T115 evidence 中显式
  记录，并已随 T115 于 2026-07-20 获得用户确认。
- Acceptance authority: 用户于 2026-07-20 明确回复“验收 T115”。

## T116 - 基于验证结果收敛多图表内部架构

- Status: Accepted
- Priority: P0
- Dependencies: T115 Accepted
- Blocks: 分类图用户验收、Phase 1A 公共 API 稳定化、真实用户验证
- Story / Requirement: S004-4；CAT-NFR-001 至 CAT-NFR-006；CAT-AC-006 至 CAT-AC-009；P-006、P-009、P-010
- Parallel: false
- Conflicts with: 所有其他实现任务；公共 plugin registry；行为/视觉改版；npm publish 或 release
- Goal: 在 waterfall 与 categorical 均 green 的前提下，只抽取真实重复的 G2 lifecycle、offscreen export 和
  category-axis primitives，建立清晰 chart module ownership，并完成全量发布候选验证与三层 review。
- Allowed files: `packages/editor/src/**`、`packages/editor/tests/**`、`e2e/**`、`apps/playground/**`、
  `vitest.config.ts`、`playwright.config.ts`、`docs/architecture.md`、
  `.ai-platform/specs/004-categorical-chart-validation/**`、`.ai-platform/evidence/T116/**`
- Allowed files rationale: 内部文件移动会更新跨模块 import 和测试路径；禁止公共行为、schema 或产品范围变化。
- Test targets: G2 load/render/destroy queue、stale request、animation finish、event cleanup、callback isolation、
  Canvas/SVG host cleanup、spec parity、all chart domain/projection/interaction/component/export/package/browser/a11y/
  performance regressions
- Deliverables: `charts/waterfall`、`charts/categorical`、按证据成立的 `rendering/g2` 边界；无 export 目录
  ownership 漂移；长期 architecture 文档；全量 evidence 与三层 review
- Acceptance criteria: shared runtime 只包含两类 chart 的真实重复；无 unused generic hook/registry；公共入口和
  visual behavior 不变；全部全量命令 green；artifact validator 无 blocking issue；用户可独立验收两种分类图。
- Definition of Done: characterization RED/green refactor receipt、全量 validation、spec compliance、engineering、
  QA review 无 Critical/High/Medium finding，evidence 完整，状态进入 `Needs_Review`；只有用户明确验收后
  才能 `Accepted`。
- Validation commands: `pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:coverage`；
  `pnpm build`；`pnpm test:package`；`pnpm test:react-matrix`；`pnpm test:e2e`；`pnpm test:a11y`；
  `pnpm test:performance`；`pnpm test:browser-previous`；
  `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 004-categorical-chart-validation`；`git diff --check`
- TDD plan: RED 增加 runtime cleanup、screen/export parity 和 chart dispatch characterization；GREEN 逐块移动
  最小重复并保持所有 tests green；REFACTOR 删除只为对称存在的抽象，更新 canonical architecture 文档。
- Packet path: `.ai-platform/specs/004-categorical-chart-validation/packets/T116.yaml`
- Packet review: `EP-004-T116-A001` 已完成 scope、dependency、ownership、TDD、validation 与 evidence
  复核，无 blocking finding；用户于 2026-07-20 明确批准 `T116-A001` 开始执行。
- Evidence required: pre-refactor characterization、changed/moved files、全量命令与 exit code、coverage、当前/上一代
  浏览器、React/package/a11y/performance、架构 dependency audit、三层 review、residual risk 和 final patch。
- Review state: characterization 40/40；scoped 226/226；full unit/coverage 393/393；current browsers
  132/132；previous browsers 132/132 与 WebKit 18.4 44/44；React 18/19、package、a11y 27/27、
  performance clean run、visual/export parity 与 task-only reverse patch 通过；三层 review 无 unresolved
  Critical/High/Medium finding。
- Evidence: `.ai-platform/evidence/T116/`。
- Acceptance: 用户于 2026-07-20 明确回复“同意验收 T116”。

## Traceability

| Requirement | Tasks |
| --- | --- |
| CAT-FR-001, CAT-FR-002, CAT-FR-003 | T111, T112 |
| CAT-FR-004 | T113 |
| CAT-FR-005, CAT-FR-009 | T113, T115 |
| CAT-FR-006 | T114, T115 |
| CAT-FR-007 | T114, T115 |
| CAT-FR-008 | T112, T115 |
| CAT-NFR-001 | T112, T113, T114, T115, T116 |
| CAT-NFR-002, CAT-NFR-003 | T114, T115, T116 |
| CAT-NFR-004 | T112, T113, T114, T116 |
| CAT-NFR-005, CAT-NFR-006 | T112, T115, T116 |

## Execution Gate

用户已明确批准 feature contracts、Plan 与本任务图，并于 2026-07-20 验收 T116。T111-T116 均为
`Accepted`，E004 分类图验证切片完成。后续工作进入独立的目标级规划，不从本 feature task graph
自动继续。
