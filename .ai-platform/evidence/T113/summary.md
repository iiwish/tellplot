# T113 分类投影与 G2 Spec Evidence

## Status

- Task: `T113`
- Packet: `.ai-platform/specs/004-categorical-chart-validation/packets/T113.yaml`
- Attempt: `T113-A001`
- Executor: Codex direct execution
- Worktree: `codex/t112-categorical-data-contract`
- Status: `Needs_Review`
- Direct reason: 用户批准 packet 与实现但未授权 delegation；当前 T112 验收基线尚未提交，因此在同一 worktree 顺序执行。

## Outcome

T113 已实现一个 chart-neutral `CategoricalProjection` 和一个内部纯 G2 5.4 interval spec factory。bar 与
column 使用 deep-equal projection、相同 data/encode/key/palette/annotation/emphasis/Tooltip 语义；bar 仅通过
G2 transpose、category scale reverse、视觉轴映射、label position 与原生 `growInX` 改变方向，column 使用
Cartesian 与 `growInY`。本任务没有接入 React、screen/export runtime 或 interaction。

## Changed Files

- `packages/editor/src/categorical/categoricalTypes.ts`
- `packages/editor/src/categorical/projectCategorical.ts`
- `packages/editor/src/categorical/categoricalChartSpec.ts`
- `packages/editor/tests/categorical/projectCategorical.test.ts`
- `packages/editor/tests/categorical/categorical-invariants.test.ts`
- `packages/editor/tests/export/categorical-chart-spec.test.ts`
- `vitest.config.ts`

Governance/evidence status files 另行同步。`packages/editor/src/index.ts`、waterfall runtime/tests、React、
interactions、export runtime、依赖和 package metadata 均未由 T113 修改。

## Behavioral Evidence

- Projection 覆盖 empty、single、positive、negative、zero、重复 label、bar/column determinism、普通 pinned item、
  recursive collapsed/expanded group、pinned descendant、mixed-sign compensated sum、unsafe aggregate 和 hostile input。
- Collapsed group 的 `sourceIds` 按逻辑叶子顺序展开；expanded group 不额外输出 datum；`order` 是稳定零基索引。
- unsafe aggregate 返回 `INVALID_SOURCE_DATA / UNSAFE_AMOUNT` 和源 item path，不返回部分 projection。
- G2 spec 使用 `interval`、`encode.key=nodeId`、零基线 linear scale、语义 palette、受控 axis/labels/Tooltip、
  annotation/emphasis 和 enter/update/exit native animation。
- `FinancialChartAppearance` wire shape/default 未改变，内部 projector/spec factory 未进入 package public entrypoint。

## Review

### Spec Compliance

通过。CAT-FR-004、CAT-FR-005、CAT-FR-009 与 T113 对应 acceptance 全部有实现和可执行断言；无 T114/T115/
T116 scope 提前实现，无 raw G2 public API。

### Engineering

通过，无 blocking finding。投影先调用 canonical `validateViewSpec`，使用独立 Neumaier accumulator，失败不返回
partial data；spec factory 保持纯函数。严格搜索未发现 `any`、`@ts-ignore`、`@ts-expect-error` 或日志。

### QA Acceptance

通过，无 blocking finding。focused GREEN、全量 coverage、typecheck、build、lint、format、artifact validator 和
diff check 均通过；existing waterfall chart-spec expectations 未修改。

## Residual Risks

- T113 只验证纯 projection/spec 结构；真实 G2 screen/export render、SVG/PNG、视觉顺序截图和浏览器动画中断由
  T115 验收。
- bar top-to-bottom 顺序目前由 transpose + reversed category scale 的结构断言锁定；真实场景 bounds 与 Y-axis
  drag parity 由 T114/T115 验收。
- Playground build 保留既有大 chunk warning；构建成功，T113 未增加 runtime dependency 或公共 bundle entry。

## Acceptance Gate

T113 保持 `Needs_Review`。只有用户明确验收后才能标记为 `Accepted` 并推进后续任务。
