# G003 多序列分类比较 Goal Graph

## Metadata

- Feature ID: `015-multi-series-categorical-comparison`
- Goal ID: `G003`
- Version: 0.11.0
- Status: Accepted；T140 amendment 为 Confirmed
- Last updated: 2026-08-28
- Approval: 用户于 2026-08-12 明确批准产品范围、精确 breaking contract、本 work graph、TDR-025 与 plan；于
  2026-08-27 明确批准 TDR-025-A01 与 T140 amendment；于 2026-08-28 在收到目标级 evidence 后明确要求
  进入下一阶段，完成 G003 目标级验收
- Execution gate: T135-T141 与 G003 均为 `Accepted`；完整质量矩阵与三层终审为
  Critical 0 / High 0 / Medium 0

## Epic E015 - Business-Ready Categorical Comparison

TellPlot以schema `3.0.0`交付2至4 series的分组bar/column，使category-only叙事编辑、逐series数据正确性、
renderer-owned直接操作、三宿主体验、screen/export与local `tellplot@2.0.0` candidate形成一个可复演目标。

## Work Graph

```text
T135 Schema 3 + public types/validation
  -> T136 comparison projection + state invariants
  -> T137 G2 comparison presentation
  -> T138 authoritative receipt + direct manipulation
  -> T139 workbench/a11y/host parity
  -> T140 export/docs/playground/local package candidate
  -> T141 performance/full matrix/goal evidence
```

任务默认串行。T139与T140在T138集成后理论上可按文件隔离，但公共fixture、update语义与同一主worktree的
集成风险高于节省时间，因此`Parallel: false`；只并行独立review，不并行实现。

## Story Mapping

- Story S015-1 / US-MSC-001：schema、projection与G2 comparison chart。
- Story S015-2 / US-MSC-002：从任意series mark编辑完整category。
- Story S015-3 / US-MSC-003：递归分组、逐series collapse与锁定不变量。
- Story S015-4 / US-MSC-004：Inspector、Tooltip、summary与SVG/PNG交付。
- Story S015-5 / US-MSC-005：v1/v2兼容、2.0 migration与单包candidate。

## T135 - 建立 schema 3 与精确 Public Type 基础

- Status: Accepted
- Priority: P0
- Depends on: Confirmed G003 spec、data model、public/validation/editor/migration contracts
- Blocks: T136-T141
- Story / Requirement: US-MSC-001、US-MSC-005；MSC-FR-001、008、009、011；MSC-NFR-005、006
- Parallel: false
- Conflicts with: T136-T141；core public unions、validator、package contract allowlist

- Goal:

建立16个已批准comparison type exports、schema `3.0.0` closed validation、appearance/config、initial view、
persistence与canonical fingerprint基础，同时让旧projectors和内部consumer对扩展联合完成防御性narrowing；
不在本task实现comparison runtime projector。

- Allowed files:

- `packages/core/src/domain/ids.ts`
- `packages/core/src/domain/model.ts`
- `packages/core/src/domain/errors.ts`
- `packages/core/src/domain/validation.ts`
- `packages/core/src/domain/createInitialViewSpec.ts`
- `packages/core/src/domain/persistence.ts`
- `packages/core/src/domain/session.ts`
- `packages/core/src/domain/chartPolicy.ts`
- `packages/core/src/domain/history.ts`
- `packages/core/src/config/chartConfig.ts`
- `packages/core/src/config/chartAppearance.ts`
- `packages/core/src/charts/categorical/projection.ts`（仅wrong-generation guard/union narrowing）
- `packages/core/src/charts/categorical/comparisonTypes.ts`（新建；只定义projection types，不实现projector）
- `packages/core/src/charts/waterfall/projection.ts`（仅wrong-generation guard/union narrowing）
- `packages/core/src/interactions/groupSelection.ts`
- `packages/core/src/index.ts`（仅type exports）
- `packages/core/tests/domain/**`
- `packages/core/tests/config/**`
- `packages/core/tests/import-boundary.test.ts`
- `packages/core/tests/public-api.mjs`
- `scripts/release/validate-package-surface.mjs`（可新建；只执行package-contract exact surface，无1.0 manifest/version语义）
- `packages/core/tests/fixtures/**`
- `packages/editor/tests/package/types-consumer.ts`
- `packages/tellplot/tests/package/**`（仅type/public-surface基础fixture）
- `apps/playground/src/ExampleWorkbench.tsx`（仅新增schema3 exhaustive guard，禁止加入最终example）
- `apps/playground/src/ShowcaseChart.tsx`（仅新增schema3 exhaustive guard，禁止加入最终example）
- `apps/playground/tests/**`（仅schema3 compile/exhaustive guard tests）
- `scripts/release/package-contracts.json`
- `.ai-platform/evidence/T135/**`、本feature T135状态字段

- Test targets:

- 新建`packages/core/tests/domain/schema-v3.test.ts`。
- 新建`packages/core/tests/config/comparison-chart-config.test.ts`。
- 扩展create-initial、persistence、fingerprint、history、group-selection、public API与concrete v1/v2 fixtures。

- Deliverables:

- 16个exact named type exports与approved union expansions；comparison runtime projector由T136交付。
- 9个exact validation reasons/messages/paths/details/precedence。
- dense 2-4 series source、v3 view与comparison appearance/config validation。
- v3 initial view/persistence/fingerprint zero-sign canonicalization；v1/v2算法保持。
- wrong-generation/projector与group-selection/history的显式generation guards。

- Acceptance criteria:

- valid/empty/2/4-series与全部invalid closed/relational inputs原子返回approved结果。
- source errors嵌入config时path前缀、privacy-safe details和hostile input identity正确。
- v3 `0`/`-0` validation identity保留，fingerprint等价；v1/v2 signed-zero行为未改变。
- `CurrentSchemaVersion`、v1/v2 concrete types与现有projector signatures精确不变；root typecheck/build中的
  playground exhaustive consumers已显式拒绝或narrow v3，不会误落入waterfall路径。
- 本task结束时`projectCategoricalComparison`仍未作为runtime implementation交付，T136边界清晰。

- Definition of Done:

- RED因missing schema/types/reasons/guards失败且原因匹配。
- GREEN focused/core/package/type/architecture gates通过。
- 无`any`或error suppression，无G2/DOM/framework import，无dependency/lockfile变更。
- T135 evidence包含changed files、RED/GREEN输出、diff summary与residual risk。

- Validation commands:

- `pnpm exec vitest run packages/core/tests/domain/schema-v3.test.ts packages/core/tests/config/comparison-chart-config.test.ts apps/playground/tests`
- `pnpm --filter @tellplot/core test`
- `pnpm --filter @tellplot/core typecheck`
- `pnpm --filter @tellplot/core build`
- `pnpm typecheck`
- `pnpm build`
- `pnpm --filter @tellplot/core test:package`
- `pnpm --filter @tellplot/editor test:package`
- `node scripts/release/validate-package-surface.mjs`
- `pnpm test:package`
- `pnpm release:architecture`
- `pnpm lint`
- `git diff --check`

- TDD plan:

- RED: 先添加schema/config/public type与旧variant精确fixture，确认missing exports与validation mismatch。
- GREEN: 最小增加v3 concrete contracts、validator与防御性generation branches。
- REFACTOR: 在tests green后抽取schema-specific helper，保持closed path与v1/v2 identity。

- Packet path:

`.ai-platform/specs/015-multi-series-categorical-comparison/packets/T135.yaml`

- Evidence required:

- `.ai-platform/evidence/T135/summary.md`
- `.ai-platform/evidence/T135/test-results.md`
- `.ai-platform/evidence/T135/diff.patch`

## T136 - 实现 Comparison Projection 与 State Invariants

- Status: Accepted
- Priority: P0
- Depends on: T135 Needs_Review且spec-compliance review通过
- Blocks: T137-T141
- Story / Requirement: US-MSC-001、002、003、005；MSC-FR-002、003、009；MSC-NFR-001、005、006
- Parallel: false
- Conflicts with: T135、T137；core categorical/session/store/public runtime export

- Goal:

实现唯一新增runtime export、逐series投影/聚合、category-only command/history与完整source update/session语义，
用不变量和property tests证明不跨series求和且不修改source。

- Allowed files:

- `packages/core/src/charts/categorical/types.ts`（仅保持v2精确合同或共享private helper）
- `packages/core/src/charts/categorical/comparisonTypes.ts`（消费T135定义；仅在实现证明type缺陷时精确修正）
- `packages/core/src/charts/categorical/comparisonProjection.ts`（新建）
- `packages/core/src/charts/categorical/projection.ts`
- `packages/core/src/domain/session.ts`
- `packages/core/src/domain/executeCommand.ts`
- `packages/core/src/domain/history.ts`
- `packages/core/src/domain/invariants.ts`
- `packages/core/src/domain/viewTree.ts`
- `packages/core/src/domain/chartPolicy.ts`
- `packages/core/src/interactions/groupSelection.ts`
- `packages/core/src/store/editorStore.ts`
- `packages/core/src/index.ts`（新增唯一runtime export与projection type wiring）
- `packages/core/tests/categorical/**`
- `packages/core/tests/domain/commands.test.ts`
- `packages/core/tests/domain/history.test.ts`
- `packages/core/tests/domain/invariants.test.ts`
- `packages/core/tests/domain/immutability.test.ts`
- `packages/core/tests/domain/property-sequences.test.ts`
- `packages/core/tests/domain/recursive-groups.test.ts`
- `packages/core/tests/editorStore.test.ts`
- `packages/core/tests/public-api.mjs`
- `scripts/release/package-contracts.json`
- `scripts/release/validate-package-surface.mjs`（消费T135 exact surface gate）
- `.ai-platform/evidence/T136/**`、本feature T136状态字段

- Test targets:

- 新建`projectCategoricalComparison.test.ts`、`comparison-invariants.test.ts`与
  `comparison-property-sequences.test.ts`。
- 扩展commands/history/immutability/recursive groups/editorStore update matrix。

- Deliverables:

- `CategoricalComparisonDatum` projection与`projectCategoricalComparison`。
- nested collapsed group逐series Neumaier aggregation、sourceIds与atomic overflow。
- category-only move/group/collapse/pin/annotation/emphasis输入、undo/redo与selection不变量。
- controlled/uncontrolled/defaultView/category-order/series-order/semantic/zero-sign/session update语义。

- Acceptance criteria:

- 普通category与collapsed group始终按current source series order输出2-4 values。
- 每series聚合与独立source sum一致；任一series overflow使whole projection失败且path/details安全。
- property sequences证明来源不丢失不重复、无cross-series total、source immutable、undo deep-equal。
- projector mismatch遵守full compatibility优先级和dedicated wrong-generation reason。
- series/category/source update只产生approved session/history/selection/callback结果。

- Definition of Done:

- RED projection/property/store tests因missing behavior失败；GREEN focused与broad core gates通过。
- core coverage继续满足repository threshold；public runtime allowlist恰好新增一个function。
- 不修改editor/G2/package/docs，不改变command union wire shape。
- T136 evidence与spec-compliance review完整。

- Validation commands:

- `pnpm exec vitest run packages/core/tests/categorical packages/core/tests/domain/commands.test.ts packages/core/tests/domain/history.test.ts packages/core/tests/domain/property-sequences.test.ts packages/core/tests/editorStore.test.ts`
- `pnpm --filter @tellplot/core test`
- `pnpm test:coverage`
- `pnpm --filter @tellplot/core typecheck`
- `pnpm --filter @tellplot/core build`
- `pnpm --filter @tellplot/core test:package`
- `node scripts/release/validate-package-surface.mjs`
- `pnpm test:package`
- `pnpm release:architecture`
- `pnpm lint`
- `git diff --check`

- TDD plan:

- RED: public projector、per-series aggregation、overflow、zero-sign、commands与update matrix tests。
- GREEN: 最小comparison traversal/accumulators与schema-specific store/session branches。
- REFACTOR: 只抽取真实共享tree/sum helpers，不把v2/v3 public datum宽化。

- Packet path:

`.ai-platform/specs/015-multi-series-categorical-comparison/packets/T136.yaml`

- Evidence required:

- `.ai-platform/evidence/T136/summary.md`
- `.ai-platform/evidence/T136/test-results.md`
- `.ai-platform/evidence/T136/diff.patch`
- Property/invariant receipt与spec-compliance review。

## T137 - 实现 G2 Comparison Presentation

- Status: Accepted
- Priority: P0
- Depends on: T136 Needs_Review且spec-compliance review通过；TDR-025 Confirmed
- Blocks: T138-T141
- Story / Requirement: US-MSC-001、003、004；MSC-FR-004、007、008；MSC-NFR-001、003、005、006
- Parallel: false
- Conflicts with: T136、T138；categorical spec、G2 runtime、group region与canonical spec tests

- Goal:

以一个G2 interval、显式series/color domains、只读legend、shared Tooltip、transparent point labels与
comparison group regions交付bar/column screen spec，并用真实Canvas characterization固定G2 5.4.8 screen行为；
真实SVG/PNG由T140验证。

- Allowed files:

- `packages/editor/src/charts/categorical/spec.ts`（v2保持；只允许shared helper接缝）
- `packages/editor/src/charts/categorical/comparisonSpec.ts`（新建）
- `packages/editor/src/charts/categorical/comparisonAppearance.ts`（新建）
- `packages/editor/src/charts/categorical/comparisonLabels.ts`（新建）
- `packages/editor/src/rendering/g2/comparisonLabelTransform.ts`（新建；只从declared `@antv/g2`读取类型）
- `packages/editor/src/charts/groupRegions.ts`
- `packages/editor/src/charts/labelStyle.ts`
- `packages/editor/src/charts/safeTooltip.ts`
- `packages/editor/src/charts/valueDomain.ts`
- `packages/editor/src/editor/projection.ts`
- `packages/editor/src/editor/formatAmount.ts`
- `packages/editor/src/rendering/g2/chartRuntime.ts`（仅spec/render lifecycle接缝与fresh registry identity）
- `packages/editor/src/editor/chartSurface.ts`（仅generation-aware spec routing与presentation/fresh runtime；
  receipt/geometry留给T138）
- `packages/editor/src/editor/domEditor.ts`、`outline.ts`（仅generation narrowing、no-total compile-safe read-only
  presentation与comparison chart interaction fail-closed；exact Inspector/summary/focus留给T139）
- `scripts/release/check-architecture.mjs`（只为`comparisonSpec.ts`增加精确raw-G2 allowlist）
- `packages/editor/tests/package/architecture-boundary.test.ts`
- `packages/editor/tests/export/categorical-chart-spec.test.ts`
- `packages/editor/tests/export/comparison-chart-spec.test.ts`（新建）
- `packages/editor/tests/export/safe-tooltip.test.ts`
- `packages/editor/tests/rendering/group-regions.test.ts`
- `packages/editor/tests/rendering/comparison-group-regions.test.ts`（新建）
- `packages/editor/tests/rendering/g2/chart-runtime.test.ts`
- `packages/editor/tests/rendering/g2/comparison-label-transform.test.ts`（新建）
- `packages/editor/tests/runtime/editor.test.ts`
- `packages/editor/tests/runtime/chart-surface.test.ts`（只为现有scalar projection fixture补精确
  `generation: 'scalar'`判别，不新增T138 receipt/geometry行为）
- `packages/editor/tests/runtime/outline.test.ts`（可新建；只验证T137最小generation guard）
- `packages/editor/tests/fixtures/**`
- `e2e/comparison-rendering.spec.ts`（新建）
- `apps/playground/src/fixtures.ts`（只增加private G2 characterization fixture；最终public examples留给T140）
- `.ai-platform/evidence/T137/**`、本feature T137状态字段

- Test targets:

- canonical spec/appearance/Tooltip/group-region structural tests。
- 真实editor G2 Canvas：2/4 series、bar/column、positive/negative/zero/mixed、empty、live registry reorder、
  helper-label center与legend visible order；真实export SVG/PNG ownership留给T140。
- 固定characterization表为`bar|column x 2|4 series x mixed-sign|all-zero`八格；all-zero另覆盖positive-domain与
  all-negative-domain baseline位置。live reorder使用per-series固定颜色与Canvas legend marker坐标验证可见顺序，
  不以component data代替；SVG text/bbox顺序由T140 export matrix验证。

- Deliverables:

- private comparison flatten/spec/appearance resolver与collision-free element keys。
- interval + dodge、explicit reverse/domain/padding/palette、read-only legend与source-ordered shared Tooltip。
- transparent point per-series value labels、nonzero annotation、all-zero category-centered annotation。
- private label transform顺序固定为`flip-to-interior`后G2 `exceedAdjust(bounds:'main')`；structural guard失败时
  fail closed，不直接import transitive `@antv/g`。
- all-member×series+zero expanded region与cluster-center group label anchor。
- series registry ID/order/count change使用fresh private G2 chart/view identity。
- T137 owns runtime `structuralIdentity`/generation token：recreate时取消queued flush/observer、increment generation、
  destroy旧chart，并让initialize/render/forceFit async callback忽略stale generation。T138只消费当前generation的
  geometry-invalidated/settled lifecycle建立receipt。
- architecture allowlist只允许comparison spec/G2 adapter读取raw G2，并断言comparison spec、labels、receipt与
  geometry均不从public entry导出。

- Acceptance criteria:

- marks/legend/Tooltip/labels在initial与live update后均按current source order；真实可见位置而非仅spec data正确。
- helper marks不生成axis/legend/Tooltip、不拦截pointer、不进入main interval identity。
- bar/column Canvas的point center与对应interval category-axis center在pixel tolerance内，2/4 series均通过；
  T140再用真实SVG `getBBox()`证明export对齐。
- annotation tie/all-zero/interior flip与comparison group extent/anchor在screen正确；T140验证SVG parity。
- empty source可保留series registry与可选legend；如需要legend-carrier，仅为noninteractive internal helper。
- v2 categorical/waterfall spec与visual contract tests保持通过。
- structural registry update后旧constructor/render/ResizeObserver promise不能回写或复活旧chart。

- Definition of Done:

- RED canonical/real-G2 tests先失败；GREEN unit + Chromium Canvas characterization通过。
- comparison spec factory成为screen/export后续唯一输入，T138/T140不得复制spec。
- 无新dependency、无public G2/appearance resolver export。
- T137 evidence包含关键Canvas assertions与residual G2-version risk。

- Validation commands:

- `pnpm exec vitest run packages/editor/tests/export/comparison-chart-spec.test.ts packages/editor/tests/rendering/comparison-group-regions.test.ts packages/editor/tests/export/safe-tooltip.test.ts packages/editor/tests/rendering/g2/chart-runtime.test.ts`
- `pnpm --filter @tellplot/editor test`
- `pnpm --filter @tellplot/editor typecheck`
- `pnpm --filter @tellplot/editor build`
- `pnpm exec playwright test e2e/comparison-rendering.spec.ts --project=chromium`
- `pnpm release:architecture`
- `pnpm lint`
- `git diff --check`

- TDD plan:

- RED: exact spec、palette、Tooltip sort、label anchor、group extent与real G2 visible-order/alignment tests。
- GREEN: 最小comparison adapter/helper marks/fresh registry runtime。
- REFACTOR: 提取screen/export共享spec builder，不泛化为public chart registry。

- Packet path:

`.ai-platform/specs/015-multi-series-categorical-comparison/packets/T137.yaml`

- Evidence required:

- `.ai-platform/evidence/T137/summary.md`
- `.ai-platform/evidence/T137/test-results.md`
- `.ai-platform/evidence/T137/diff.patch`
- Canvas characterization receipt与spec-compliance review。

## T138 - 建立 Authoritative Scene Receipt 与整组直接操作

- Status: Accepted
- Priority: P0
- Depends on: T137 Needs_Review且spec-compliance review通过
- Blocks: T139-T141
- Story / Requirement: US-MSC-002、003；MSC-FR-005；MSC-NFR-001、003、005、006
- Parallel: false
- Conflicts with: T137、T139；G2 runtime、chart surface、pointer/geometry lifecycle

- Goal:

把每个visible node × series的settled interval scene data收敛为严格authoritative receipt，并按exact/drop/
ghost/marquee/all-zero用途派生renderer-owned geometry，使任意series mark只提交一条category command。

- Allowed files:

- `packages/core/src/interactions/categoryAxis.ts`
- `packages/core/src/interactions/categoryAxis.ts`不得新增、删除或重命名任何public exported identifier；
  comparison receipt/geometry types与helpers必须留在editor private adapter。
- `packages/core/tests/interactions/categoryAxis.test.ts`
- `packages/editor/src/rendering/g2/comparisonSceneReceipt.ts`（新建）
- `packages/editor/src/rendering/g2/chartPointer.ts`
- `packages/editor/src/rendering/g2/chartRuntime.ts`
- `packages/editor/src/editor/chartSurface.ts`
- `packages/editor/src/editor/projection.ts`
- `packages/editor/tests/rendering/g2/comparison-scene-receipt.test.ts`（新建）
- `packages/editor/tests/rendering/g2/chart-pointer.test.ts`
- `packages/editor/tests/rendering/g2/chart-runtime.test.ts`
- `packages/editor/tests/runtime/chart-surface.test.ts`
- `packages/core/tests/public-api.mjs`
- `scripts/release/validate-package-surface.mjs`（只运行exact package-contract audit，证明T138无新增public surface）
- `packages/editor/tests/fixtures/**`
- `e2e/comparison-interaction.spec.ts`（新建）
- `e2e/interaction-cancel.spec.ts`
- `.ai-platform/evidence/T138/**`、本feature T138状态字段

- Test targets:

- receipt completeness/uniqueness/signature/key/type/bounds/traversal-order tests。
- actual rect exact hit、gap marquee、axis union drop、midpoint tie、2D ghost、per-mark marquee dedupe。
- local/global all-zero、all-negative domain、resize/update/render/animation/pointer-loss/Escape/unmount cancellation。

- Deliverables:

- private render-revision-bound comparison receipt与current-generation geometry-invalidated/settled lifecycle；只消费
  T137建立的structural generation token，不重复拥有或重建token。
- N×S exact validation；任一missing/duplicate/unregistered/stale/invalid导致whole direct-manipulation fail closed。
- four-purpose category geometry与32px plot-interior all-zero target。
- pointerdown finish-animation/re-read、geometry-change cancellation与Outline/keyboard fallback。
- any series mark到现有category/group command的统一映射。

- Acceptance criteria:

- scene traversal或helper marks不能改变receipt order/contents；禁止first/last wins。
- inactive cluster gap不exact hit，marquee只命中实际marks；active drag gap可用于drop。
- all-zero target来自完整G2 band，padding区不命中；baseline interior target在bar/column/all-negative domain可达。
- resize/source/view/config/render会无历史地取消active interaction并使旧receipt不可用。
- 从任意series mark、Outline、keyboard、host command重排得到deep-equal tree和一条history entry。
- receipt invalid时chart操作禁用但Outline/keyboard/Inspector可用。

- Definition of Done:

- RED pure receipt/geometry与real-browser interaction tests先失败；GREEN focused/editor/Chromium通过。
- 不为测试暴露public scene hook，不猜测DOM/band geometry。
- T138 evidence包含invalid-receipt fallback、all-zero与cancellation receipts。

- Validation commands:

- `pnpm exec vitest run packages/core/tests/interactions/categoryAxis.test.ts packages/editor/tests/rendering/g2/comparison-scene-receipt.test.ts packages/editor/tests/rendering/g2/chart-pointer.test.ts packages/editor/tests/rendering/g2/chart-runtime.test.ts packages/editor/tests/runtime/chart-surface.test.ts`
- `pnpm --filter @tellplot/editor test`
- `pnpm --filter @tellplot/editor typecheck`
- `pnpm --filter @tellplot/editor build`
- `pnpm exec playwright test e2e/comparison-interaction.spec.ts e2e/interaction-cancel.spec.ts --project=chromium`
- `pnpm release:architecture`
- `node scripts/release/validate-package-surface.mjs`
- `pnpm lint`
- `git diff --check`

- TDD plan:

- RED: exact receipt、four geometry、all-zero与lifecycle cancellation tests。
- GREEN: 最小scanner/validator/geometry adapter与surface integration。
- REFACTOR: 只抽取pure receipt/axis helpers，保持G2 access集中于adapter。

- Packet path:

`.ai-platform/specs/015-multi-series-categorical-comparison/packets/T138.yaml`

- Evidence required:

- `.ai-platform/evidence/T138/summary.md`
- `.ai-platform/evidence/T138/test-results.md`
- `.ai-platform/evidence/T138/diff.patch`
- Interaction/geometry browser receipt与spec-compliance review。

## T139 - 完成 Workbench、Accessibility 与 Host Parity

- Status: Accepted
- Priority: P0
- Depends on: T138 Needs_Review且spec-compliance review通过
- Blocks: T140、T141
- Story / Requirement: US-MSC-002、003、004；MSC-FR-006、007、009、010、011；MSC-NFR-003、004、005、006
- Parallel: false
- Conflicts with: T138、T140；DOM editor、host update fixtures、focus与E2E selectors

- Goal:

让Outline、Inspector、summary、focus、update/readOnly/panel semantics在imperative DOM、React与Vue中完整表达
category-only comparison，不建立framework-specific state。

- Allowed files:

- `packages/editor/src/editor/domEditor.ts`
- `packages/editor/src/editor/dom.ts`
- `packages/editor/src/editor/outline.ts`
- `packages/editor/src/editor/layout.ts`
- `packages/editor/src/editor/messages.ts`
- `packages/editor/src/editor/modalFocus.ts`
- `packages/editor/src/editor/types.ts`
- `packages/editor/src/editor/chartSurface.ts`（只消费T138 receipt/API，不改变其geometry contract）
- `packages/editor/src/editor/formatAmount.ts`
- `packages/editor/src/styles/editor.css`
- `packages/editor/tests/runtime/**`
- `packages/editor/tests/fixtures/**`
- `packages/react/src/**`
- `packages/react/tests/**`
- `packages/vue/src/**`
- `packages/vue/tests/**`
- `packages/editor/tests/react-matrix/**`
- `e2e/accessibility.spec.ts`
- `e2e/categorical-editor.spec.ts`
- `e2e/comparison-interaction.spec.ts`
- `e2e/container-responsive.spec.ts`
- `e2e/editorPanels.ts`
- `e2e/interaction-cancel.spec.ts`
- `.ai-platform/evidence/T139/**`、本feature T139状态字段

- Test targets:

- 新建focused `packages/editor/tests/runtime/comparison-editor.test.ts`。
- Inspector四种selection语义、DFS summary/empty registry、focus fallback、完整update/mode/readOnly matrix。
- React/Vue same-render/flush controlled pair、standalone view/defaultView与callback/state parity。
- framework matrix保留legacy v1 scenario，并增加真实tarball/G2 v3 2-series controlled pair、move/undo、series
  reorder palette/legend/summary与4-series registry update；v3 SVG由T140实现export后补入matrix，不可用既有
  v1-only matrix代替comparison parity。

- Deliverables:

- Outline one-node-per-category/group + series count/no total。
- category/collapsed/expanded/multi-selection exact Inspector。
- empty/nonempty series registry + narrative DFS accessible summary与lock/pin/annotation/emphasis states。
- connected/visible/enabled/focusable-aware focus retention与panel-aware fallback。
- complete presentation/source/view/defaultView/mode/readOnly/history/update callbacks semantics。
- imperative/React18/19/Vue3共用同一runtime和public types。

- Acceptance criteria:

- series/cell不成为treeitem、selection或command；multi-selection不选primary、不跨category求value。
- empty source且legend off时summary仍按source order朗读全部series label。
- hidden panel/mode/readOnly使target失效时即使selection保留也执行approved focus fallback。
- source semantic update与presentation update只发approved callback次数；invalid state与hostile inspection分支明确。
- React/Vue不拥有第二session/projection/G2 lifecycle；controlled pair timing测试通过。
- category/group keyboard、aria-live、reduced motion与颜色非唯一识别通过axe和语义assertions。

- Definition of Done:

- RED editor/adapter/a11y tests先失败；GREEN DOM/React/Vue/focused E2E通过。
- v1/v2workbench、focus、adapter tests保持；无new public component fields/events。
- T139 evidence包含DOM text/a11y/focus/callback receipts与review。

- Validation commands:

- `pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts packages/editor/tests/runtime/editor.test.ts packages/react/tests packages/vue/tests`
- `pnpm --filter @tellplot/editor test`
- `pnpm --filter @tellplot/react test`
- `pnpm --filter @tellplot/vue test`
- `pnpm test:framework-matrix`
- `pnpm typecheck`
- `pnpm build`
- `pnpm exec playwright test e2e/comparison-interaction.spec.ts e2e/accessibility.spec.ts e2e/container-responsive.spec.ts --project=chromium`
- `pnpm lint`
- `git diff --check`

- TDD plan:

- RED: exact Inspector/summary/focus/update/adapter/a11y contracts。
- GREEN: 最小generation-awarepresentation与existing adapter forwarding。
- REFACTOR: 合并重复presentation formatting，不把comparison state复制到framework layers。

- Packet path:

`.ai-platform/specs/015-multi-series-categorical-comparison/packets/T139.yaml`

- Evidence required:

- `.ai-platform/evidence/T139/summary.md`
- `.ai-platform/evidence/T139/test-results.md`
- `.ai-platform/evidence/T139/diff.patch`
- A11y/focus/host-parity receipt与spec-compliance review。

## T140 - 完成 Export、Playground、Docs 与 Local 2.0 Candidate

- Status: Accepted
- Priority: P0
- Depends on: T139 Needs_Review且spec-compliance review通过
- Blocks: T141
- Story / Requirement: US-MSC-001、004、005；MSC-FR-008、009、010、011；MSC-NFR-005、006、007
- Parallel: false
- Conflicts with: T137、T139、T141；spec/export/package/docs/release-candidate tooling

- Goal:

交付comparison SVG/PNG/empty parity、public-only examples、可执行2.0 migration与type docs，并形成不会覆盖
published 1.0 provenance的local `tellplot@2.0.0` package candidate与candidate-only artifact tooling。

- Allowed files:

- `packages/editor/src/export/**`
- `packages/editor/src/rendering/g2/exportRuntime.ts`
- `packages/editor/src/editor/domEditor.ts`（仅comparison export dispatch/empty gate）
- `packages/editor/src/charts/categorical/comparisonSpec.ts`（仅使用private helper scale key隔离G2 guide merge；
  保留唯一main interval guide owner与原T137 paint order）
- `packages/editor/tests/export/**`（T137 canonical comparison spec test只读，除修复已确认contract defect）
- `packages/editor/tests/package/**`
- `packages/editor/tests/react-matrix/**`（在T139 comparison Canvas/host scenario上补v3 SVG export parity）
- `packages/tellplot/**`
- `apps/playground/src/**`
- `apps/playground/tests/**`
- `docs/**`
- `README.md`
- `CHANGELOG.md`
- `SUPPORT.md`
- `packages/*/README.md`
- `package.json`（仅local candidate validation scripts）
- `scripts/release/audit-candidate.mjs`（新建；local candidate only）
- `scripts/release/package-candidate-artifact.mjs`（新建；local candidate only）
- `scripts/release/rehearse-candidate-source.mjs`（新建；local candidate only）
- `scripts/release/audit-release.mjs`、`package-artifact.mjs`、`rehearse-source.mjs`（只读1.0 lineage fixtures）
- `scripts/release/package-contracts.json`
- `scripts/release/test-doc-code.mjs`（可新建）
- `.ai-platform/evidence/T140/**`、本feature T140状态字段

- Forbidden files and effects:

- `.github/workflows/**`
- `.ai-platform/evidence/T131/**`
- npm Registry、Git tag、GitHub Release、Vercel/production状态
- publish/preflight/availability/Trusted Publisher配置或远程命令

- Test targets:

- 新建`packages/editor/tests/export/comparison-export.test.ts`与`e2e/comparison-export.spec.ts`。
- 真实SVG固定`bar|column x 2|4 series x mixed-sign|all-zero`矩阵，验证point/interval category-axis center
  tolerance、annotation/group anchor、live registry reorder后的visible legend text bbox/order与empty legend；PNG验证
  同projection/palette/legend的nonblank像素输出。
- playground actual-vs-budget与4-series public-only examples/tests。
- actual-vs-budget与4-series都必须有完整group edit/collapse/ViewSpec JSON import-export/SVG/PNG journey；不能以
  4-series projection或image matrix替代完整journey。
- 真实SVG对comparison group/annotation使用visible bbox与anchor断言；legal empty legend on/off都必须通过真实
  G2 SVG，不以mock spec替代。
- package fixtures：legacy-v1-waterfall、current-v2-waterfall、scalar-v2-categorical三套concrete source/view/config
  compile + runtime/roundtrip，以及comparison-v3、exhaustive-union migration、preserve narrative。
- data contract、API、configuration与migration文档的全部TypeScript fence extraction/compile；非standalone片段
  必须显式组合，不能任意跳过；包含negative-before/positive-after migration harness。
- local candidate manifest/pack/audit/artifact/rehearsal与published-v1 immutable lineage assertions。

- Deliverables:

- schema/generation-discriminated internal export request与screen/SVG/PNG共享comparison spec。
- empty v3 SVG/PNG、legend on/off、labels/regions/annotation/emphasis与sanitizer parity。
- actual-vs-budget与4-series examples、workbench import/export journey。
- canonical API/config/errors/getting-started/architecture/versioning/migration docs。
- exact public exports与isolatedstrict type consumers；无public migration helper。
- `tellplot@2.0.0` local manifest/tarball candidate；private package policy保持。
- candidate-only artifact/rehearse command可指定G003 evidence root，默认published 1.0/T131行为不可覆盖。
- candidate-only audit读取current manifest并要求显式candidate version/evidence task；existing `release:audit`、
  `release:artifact`与`release:rehearse`继续作为published 1.0 lineage命令，不改其语义。

- Acceptance criteria:

- screen/SVG/PNG visible order/palette/legend/format/group/annotation语义一致；export无Tooltip/interaction/remote/animation。
- legal empty comparison可导出；v1/v2empty/export behavior保持。
- playground只从public package entrypoints消费comparison，2/4-seriesjourney可编辑、collapse、export。
- data contract、API、configuration与migration文档的全部TS fences isolated compile；non-standalone片段由
  harness显式组合；unmigrated exhaustive fixture按目标diagnostic失败、migrated成功，不使用`@ts-expect-error`。
- package恰好公开approved16 types + 1 runtime function，不暴露G2/receipt/resolver。
- candidate artifacts只写T140/T141 G003 evidence；T131、publish workflow与remote preflight不变。
- candidate artifact/rehearsal在`.nvmrc`精确Node运行，nested output symlink逐层fail closed；artifact、manifest、
  isolated receipt与task-local diff必须在最终源码冻结后重建并可重放。

- Definition of Done:

- RED export/package/docs/example tests先失败；GREEN focused/site/package/candidate-only rehearsal通过。
- packed artifact通过publint/ATTW/ESM/CJS/declarations与isolated consumers。
- 无remote side effect；T140 evidence包含tarball manifest/hash、docs compile与migration receipts。

- Validation commands:

- `pnpm exec vitest run packages/editor/tests/export/comparison-export.test.ts apps/playground/tests packages/tellplot/tests`
- `pnpm exec vitest run packages/editor/tests/package`
- `pnpm --filter @tellplot/playground build`
- `pnpm build`
- `pnpm test:package`
- `pnpm test:framework-matrix`
- `pnpm exec playwright test e2e/comparison-export.spec.ts e2e/live-code-editor.spec.ts e2e/quickstart.spec.ts e2e/showcase.spec.ts --project=chromium`
- `pnpm release:candidate:audit -- --candidate-version 2.0.0 --evidence-task T140`
- `pnpm release:candidate:artifact -- --candidate-version 2.0.0 --evidence-task T140`
- `pnpm release:candidate:rehearse -- --candidate-version 2.0.0 --evidence-task T140`
- `pnpm lint`
- `git diff --check`

`release:candidate:*`是本task需先通过RED contract test再新增/参数化的local-only commands；不得替换为
`release:artifact`、`release:check`、`release:preflight*`或availability/trust-readiness commands。

- TDD plan:

- RED: comparison export/empty、package 2.0、docs fences、migration与candidate evidence isolation tests。
- RED还必须证明candidate commands缺少任一参数、version不是2.0.0、task不在T140/T141 allowlist或包含path
  traversal时fail closed。
- GREEN: 最小generation export dispatch、public examples/docs/package/tooling。
- REFACTOR: 共享screen/export spec与docs fixtures，保持T131/workflow immutable boundary。

- Packet path:

`.ai-platform/specs/015-multi-series-categorical-comparison/packets/T140.yaml`

- Evidence required:

- `.ai-platform/evidence/T140/summary.md`
- `.ai-platform/evidence/T140/test-results.md`
- `.ai-platform/evidence/T140/diff.patch`
- `.ai-platform/evidence/T140/tarball-manifest.json`
- `.ai-platform/evidence/T140/isolated-source-receipt.md`
- Docs/migration/type-consumer receipt与spec-compliance review。

## T141 - 完成性能、完整矩阵与目标级 Evidence

- Status: Accepted
- Priority: P0
- Depends on: T140 Needs_Review且T135-T140无unresolved Critical/High/Medium finding
- Blocks: G003目标级Needs_Review
- Story / Requirement: 全部US-MSC、MSC-FR-001至011、MSC-NFR-001至007、MSC-SC-001至007、MSC-AC-001至012
- Parallel: false
- Conflicts with: T135-T140；全部G003 source/tests/docs；published release/remote state

- Goal:

用真实G2 performance/responsive/browser/package/isolated-source矩阵复演local 2.0 candidate，关闭三层review
findings并形成G003目标级evidence，不执行任何remote或release动作。

- Allowed files:

- `e2e/performance.spec.ts`
- `e2e/performanceBudget.ts`
- `e2e/comparison-responsive.spec.ts`（新建）
- `e2e/comparison-rendering.spec.ts`
- `apps/playground/src/fixtures.ts`（仅final performance fixtures）
- G003相关source/tests/docs仅限修复full-gate发现的blocking defect；必须记录ownership variance并重跑owner task suite
- `scripts/release/**`仅限candidate-only gate defect；禁止publish/preflight/availability语义变化
- `.ai-platform/evidence/T141/**`
- `.ai-platform/specs/015-multi-series-categorical-comparison/**`状态/evidence引用
- `.ai-platform/docs/tasks.md`、`AGENTS.md`、`docs/roadmap.md`（仅目标状态）

- Forbidden files and effects:

- `.ai-platform/evidence/T131/**`、`.github/workflows/**`
- stage、commit、push、PR、tag、npm publish、GitHub Release、production promotion
- `release:artifact`、`release:check`、`release:preflight*`、`release:availability`、`release:trust-readiness*`

- Test targets:

- `200 x 2` warm-up后keyboard/direct pointer交替各30次commit-to-painted-frame samples。
- `50 x 4`两个viewport × 两locale × idle/hover/active-drag真实Canvas responsive matrix。
- 同一spec真实G2 SVG挂DOM后以`getBBox()`检查visible text pairwise intersection；`>40` marks明确断言
  value labels为0，再以Outline/Tooltip/Inspector证明全部category可读可编辑。
- full current/previous browser、a11y、package/framework、security/architecture/audit与candidate-only artifact/rehearsal。
- spec compliance、bug/code-quality、QA acceptance三层independent review。

- Deliverables:

- `performance-samples.json`含两组30 samples、formula、p95、painted revision/order与host root commit delta。
- responsive screenshots/layout assertions与auto labels `>40`隐藏证据；Outline/Tooltip/Inspector仍可读可编辑。
- full validation transcript、candidate tarball manifest/hash与isolated-source receipt。
- review.md包含0 unresolved Critical/High/Medium或明确阻断状态。
- G003在通过后进入Needs_Review；T135-T141不在本轮自动Accepted。

- Acceptance criteria:

- keyboard/direct pointer两组p95均`<=150ms`；preview按RAF且host React root commits为0。
- 50x4 matrix无unexpected horizontal overflow、plot/legend/toolbar overlap或target/必要文本occlusion；auto labels隐藏，
  每category仍可从Outline/Tooltip/Inspector完整读取并整组编辑。
- format/lint/type/coverage/build/package/framework/current+previous browser/E2E/a11y/performance全部green。
- v1/v2 concrete types/wire/runtime/persistence/visual/export继续green；v3 isolated consumers与migration fixturesgreen。
- no dependency drift、network request、privacy leak、public G2 surface或remote side effect。
- T131 evidence/workflow不变；G003 candidate artifacts只写T141 evidence。

- Definition of Done:

- Fresh full matrix而非缓存结论通过；失败不得用skip、阈值放宽或mock隐藏。
- 三层review无unresolved Critical/High/Medium；Low记录residual risk/owner。
- evidence可由clean isolated source复演；artifact validator与`git diff --check`通过。
- 目标只移动到Needs_Review，等待用户目标级验收；无stage/commit/remote action。

- Validation commands:

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:coverage`
- `pnpm build`
- `pnpm test:package`
- `pnpm test:framework-matrix`
- `pnpm test:e2e`
- `pnpm test:a11y`
- `pnpm test:performance`
- `pnpm test:browser-previous`
- `pnpm security:lock`
- `pnpm security:dependencies`
- `pnpm audit:prod`
- `pnpm release:architecture`
- `pnpm release:candidate:audit -- --candidate-version 2.0.0 --evidence-task T141`
- `pnpm release:candidate:artifact -- --candidate-version 2.0.0 --evidence-task T141`
- `pnpm release:candidate:rehearse -- --candidate-version 2.0.0 --evidence-task T141`
- `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 015-multi-series-categorical-comparison`
- `git diff --check`

- TDD plan:

- RED: performance/responsive/candidate isolation gates证明旧单序列或1.0-only paths不满足G003合同。
- GREEN: 只修复真实gate缺陷，逐次重跑owner focused suite。
- REFACTOR: evidence聚合与fixture去重；FINAL从fresh build运行完整矩阵。

- Packet path:

`.ai-platform/specs/015-multi-series-categorical-comparison/packets/T141.yaml`（依赖完成后生成）

- Evidence required:

- `.ai-platform/evidence/T141/summary.md`
- `.ai-platform/evidence/T141/test-results.md`
- `.ai-platform/evidence/T141/diff.patch`
- `.ai-platform/evidence/T141/performance-samples.json`
- `.ai-platform/evidence/T141/responsive-matrix.md`
- `.ai-platform/evidence/T141/review.md`
- `.ai-platform/evidence/T141/tarball-manifest.json`
- `.ai-platform/evidence/T141/isolated-source-receipt.md`

## Requirement Traceability

| Requirement | Primary task(s) |
| --- | --- |
| MSC-FR-001 | T135 |
| MSC-FR-002 | T136 |
| MSC-FR-003 | T136 |
| MSC-FR-004 | T137 |
| MSC-FR-005 | T138 |
| MSC-FR-006 | T139 |
| MSC-FR-007 | T137、T139 |
| MSC-FR-008 | T135、T137、T140 |
| MSC-FR-009 | T135、T136、T139、T140 |
| MSC-FR-010 | T139、T140 |
| MSC-FR-011 | T135、T139、T140 |
| MSC-NFR-001 | T136、T137、T138 |
| MSC-NFR-002 | T141 |
| MSC-NFR-003 | T137、T138、T139 |
| MSC-NFR-004 | T139、T141 |
| MSC-NFR-005 | T135-T141 |
| MSC-NFR-006 | T135、T136、T137、T139、T140、T141 |
| MSC-NFR-007 | T140、T141 |

## Work Graph Approval Gate

- Result: Approved
- Approval evidence: 用户于 2026-08-12 明确批准 TDR-025、technical plan 与本 work graph 的
  task scope/dependency/allowed-files/test/evidence contract；于 2026-08-27 明确批准 TDR-025-A01、
  `comparisonSpec.ts` exact ownership、4-series完整journey、真实SVG evidence与candidate hardening amendment。
- Current status: document原范围与T140 amendment均为`Confirmed`；T135-T141 与 G003 均为
  `Accepted`，完整矩阵与三层终审为 Critical 0 / High 0 / Medium 0。用户于 2026-08-28 完成目标级验收。
- Execution evidence: `.ai-platform/evidence/T141/` 包含 200x2 performance、50x4 responsive、完整当前/旧版
  browser/package/framework/security 矩阵、可复现 candidate、目标级 patch 与三层 review。
- Still separate: dependency、remote Git、publish、tag、release、production promotion。
