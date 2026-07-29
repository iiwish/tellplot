# T115 分类图编辑、导出与可访问性 Evidence

## Status

- Task: `T115`
- Packet: `.ai-platform/specs/004-categorical-chart-validation/packets/T115.yaml`
- Attempt: `T115-A001`
- Executor: Codex direct execution
- Worktree: `codex/t112-categorical-data-contract`
- Status: `Accepted`
- Authorization: 用户于 2026-07-19 要求在 T114 clean review 后执行一个 6-7 小时长目标；目标明确限定为 T115，并要求停在用户验收闸门前。
- Acceptance: 用户于 2026-07-20 明确回复“验收 T115”，同时确认本 evidence 中披露的 `groupSelection.ts` 最小执行偏差。

## Outcome

T115 已把 T113 的 deterministic categorical projection/G2 interval spec 与 T114 的 X/Y category-axis
primitives 接入唯一 `FinancialChartEditor`。column 与 bar 共用既有 controller、session、command、history、
selection、outline、inspector 和 feedback；G2 继续拥有真实 marks、scene bounds、events 与 animation。直接拖动、
键盘、outline、分组、折叠、展开、取消分组、撤销/重做、SVG/PNG、summary、aria-live、empty/invalid/render error
和 200 项 performance 均已形成真实浏览器闭环。

没有新增 dependency、renderer、chart-switch command、公共 `G2Spec`、第二套领域状态或手绘 chart marks。
T116 未开始。

## Changed Files

### Runtime and playground

- `packages/editor/src/components/CategoricalCanvas.tsx`
- `packages/editor/src/components/FinancialChartEditor.tsx`
- `packages/editor/src/components/AccessibleChartSummary.tsx`
- `packages/editor/src/components/OutlinePanel.tsx`
- `packages/editor/src/components/InspectorPanel.tsx`
- `packages/editor/src/components/editorMessages.ts`
- `packages/editor/src/export/svgExport.ts`
- `packages/editor/src/export/pngExport.ts`
- `packages/editor/src/styles/editor.css`
- `packages/editor/src/interactions/groupSelection.ts`
- `apps/playground/src/App.tsx`
- `apps/playground/src/fixtures.ts`

### Tests

- `packages/editor/tests/components/categorical-canvas.test.tsx`
- `packages/editor/tests/components/categorical-editor.test.tsx`
- `packages/editor/tests/components/group-actions.test.tsx`
- `packages/editor/tests/export/categorical-export.test.ts`
- `e2e/categorical-editor.spec.ts`
- `e2e/accessibility.spec.ts`
- `e2e/export.spec.ts`
- `e2e/performance.spec.ts`

### Governance and evidence

- `.ai-platform/specs/004-categorical-chart-validation/packets/T115.yaml`
- `.ai-platform/specs/004-categorical-chart-validation/tasks.md`
- `.ai-platform/docs/tasks.md`
- `AGENTS.md`
- `.ai-platform/evidence/T115/**`

## Scope Audit

所有 T115 task-only runtime/test 变更均在 packet allowlist 内，只有一个明确记录的低风险执行偏差：
`packages/editor/src/interactions/groupSelection.ts` 原列为 read-only，但 accepted T112 evaluator 把没有
waterfall `kind` 字段的 categorical item 全部判为 locked，导致已批准的 categorical grouping 无法工作。
修复仅把 current categorical source 识别为可分组 leaf，同时保留 missing item、waterfall anchor 与 pinned
rejection；对应 regression test 已加入。把该判断复制到 component 会违反单一 group policy，因此选择了共享 evaluator
中的最小修复。此偏差不扩大产品/架构范围，并已随 T115 于 2026-07-20 获得用户确认。

其余 `domain/**`、`categorical/**`、T114 category-axis primitives、`waterfall/**`、`chartAppearance.ts`、
dependencies、`vitest.config.ts` 和公共入口均未由 T115 修改。T112-T114 未提交 baseline 被完整保留。

## Behavior Matrix

| Surface | Column | Bar | Shared contract evidence |
| --- | --- | --- | --- |
| Dispatch | source-only default `column` | explicit `ViewSpec.chartType=bar` | closed source/view narrowing；invalid combination 不渲染 canvas |
| G2 screen | X category axis，首项最左 | Y category axis，transpose 后首项最上 | 同一 categorical projection/spec factory；8 个真实 interval marks，painted pixels > 500 |
| Direct reorder | X scene bounds | Y scene bounds | 同一 `moveTargets -> command -> session`；两者均得到 `consumer, enterprise, services` |
| Selection/group | click、marquee、pin feedback | 同一行为 | create/collapse/expand/ungroup、undo/redo 使用原 controller/history |
| Outline/summary | logical `rootOrder` | logical top-to-bottom `rootOrder` | 初始 8 项与 reorder 后顺序完全一致 |
| Export | column SVG/PNG | bar SVG/PNG | canonical accepted view；collapsed group 顺序一致；active preview 返回 `EXPORT_UNAVAILABLE /export` |
| States/a11y | empty、invalid、render error、keyboard、aria-live | 同一行为 | stable code/path，无 source label/amount 泄露；reduced motion 生效 |

## Visual Evidence

- `visual/column-ready.png`：desktop column、8 marks、正负值、outline/inspector 完整。
- `visual/bar-ready.png`：desktop bar、首项 topmost、8 marks、逻辑顺序一致。
- `visual/categorical-group-collapsed.png`：`订阅业务` 聚合为 2,140，7 个可见节点，outline/canvas/inspector 同步。
- `visual/column-collapsed-screen.png`、`visual/bar-collapsed-screen.png`：两种方向的 collapsed screen。
- `visual/column-collapsed-export.svg|png`、`visual/bar-collapsed-export.svg|png`：真实 G2 offscreen export；非空、无 executable/source metadata，group label 位于专业服务之前。
- `visual/categorical-empty.png`：0 项标题、summary、outline 与 inspector 稳定。
- `visual/categorical-invalid.png`：只显示 `INVALID_SOURCE_DATA /items/5/amount`，不显示敏感 label/Infinity，无 canvas。

人工查看上述 screenshots：没有 panel、toolbar、chart、feedback 或 group overlay 重叠；column/bar/group/empty/
invalid 均非空且构图稳定。PNG 默认透明背景在深色图片查看器中会显示黑底，这是既有 export contract，不是 chart
背景回归。

## TDD Receipts

### RED

- 新 component/export tests 首次执行 exit 1：`CategoricalCanvas` 不存在，`FinancialChartEditor` 仍只调用
  `projectWaterfall`，SVG export 仍只接受 waterfall projection。既有 waterfall tests 保持 green。
- 首次真实 grouping browser flow 暴露 categorical item 被共享 evaluator 错判 `ITEM_LOCKED`；新增最小
  chart-family regression 后修复。
- 首次 200-item direct preview 暴露 G2 preview rerender 替换 canvas 后 pointer capture 被释放；增加 active drag
  的 document fallback 与 capture restoration 后，overlay 生命周期、0 same-target React commit 和 cancel identity 全绿。

### GREEN / REFACTOR

- 新增独立 `CategoricalCanvas`，保持 chart-specific composition，不提前抽取 T116 generic runtime。
- `FinancialChartEditor` 只增加 closed chart-family dispatch，仍只有一个 preview/session/command/history path。
- SVG/PNG request 只在内部用 discriminated union 选择 spec；公共 handle 与 `ExportOptions` 不变。
- 两类 canvas 当前存在经过验证的 lifecycle 重复；按批准边界留给 T116，不为对称性提前抽象。

## Review

### Spec Compliance

通过，无 blocking finding。CAT-FR-005 至 CAT-FR-009、CAT-NFR-001 至 CAT-NFR-006 与 CAT-AC-001 至
CAT-AC-008 的 T115 integration boundary 均有自动化或视觉 evidence。唯一 packet read-only 偏差已在 Scope Audit
中显式记录，属于 approved grouping behavior 的 shared-policy baseline correction，不改变需求、schema 或公共 API。

### Engineering

通过，无 blocking finding。G2 仍是 screen/export renderer 和 animation owner；交互只消费 G2 event/scene
`getBounds()` 与 T114 primitives，不猜测固定 bar 尺寸。没有 `any`、`@ts-ignore`、`@ts-expect-error`、敏感日志、
raw G2 public export 或 dependency 变化。task-only patch reverse-apply check、package types、React 18/19 clean unmount
均通过。

### QA Acceptance

通过，无 blocking finding。scoped 170/170、full unit/coverage 380/380、current Chromium/Firefox/WebKit
132/132、a11y 27/27、package、build、type、lint、format 与 performance 全绿。column/bar canvas 和 export 均通过
painted-pixel/nonblank/order assertion；visual evidence 已人工检查。

## Residual Risks

- `CategoricalCanvas` 与 `WaterfallCanvas` 各自保留 G2 lifecycle/event composition，文件较大且存在真实重复；这是
  T115 明确要求的临时边界。T116 依赖已经满足，可在独立 packet 获批后抽取经过两类 chart 验证的 shared runtime。
- `CategoricalCanvas` 单元行覆盖约 58%，但高风险 pointer lifecycle、真实 G2、三浏览器、a11y 与 200-item path
  由 component/E2E/performance 补足；T116 应增加 cleanup/queue characterization 后再移动代码。
- playground production build 仍提示既有 G2 chunk 超过 500 kB；构建成功，本任务没有新增 runtime dependency。
- bar 数值轴标签由当前 G2 auto-layout 纵向显示，未发生重叠且可读；后续视觉 polish 不应混入 T116 架构任务。
- T115 对 `groupSelection.ts` 的最小 read-only 偏差已由用户随整体验收确认；T116 应继续保留该共享 policy，
  不把 chart-family 判定复制回 component。

## Acceptance Gate

用户于 2026-07-20 明确验收 T115。T115 状态为 `Accepted`，T116 依赖闸门已满足，可进入独立 execution
packet 生成与审批；本次验收没有执行 commit、push、PR、merge、publish 或 release。
