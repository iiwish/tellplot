# T112 Evidence Summary

## Metadata

- Task: T112 - 扩展数据合同与共享命令策略
- Attempt: T112-A001
- Status: Accepted
- Branch: `codex/t112-categorical-data-contract`
- Date: 2026-07-19
- Executor: Codex direct execution；用户未授权 delegation，按单任务 packet 直接实现
- User acceptance: 用户于 2026-07-19 明确回复“T112 验收通过”
- Remote actions: 未执行 commit、push、PR、merge、publish 或 release

## Scope Result

T112 已建立 legacy `1.0.0` waterfall、current `2.0.0` waterfall 与 current `2.0.0`
categorical 的严格判别联合。current source 使用 `dataKind`，categorical item 不包含 waterfall `kind`；
`SourceItem` 与 `SourceItemKind` 保持原有 waterfall 含义。

本切片同时完成 closed validator、source/view generation 与 chart-family compatibility、categorical 默认
column/显式 bar 初始视图、version-preserving persistence、family-aware fingerprint，以及不公开的最小
`NarrativeChartPolicy`。现有 `EditorCommand` wire union 未变化，categorical move/group/pin 与 undo/redo 复用
同一命令和不变量路径。

严格 union 使现有 waterfall projector、editor empty-state 与 group-selection helper 必须在访问
waterfall-only `kind` 前显式收窄。对应改动只增加 type guard：没有接入 categorical renderer、React UI、
直接操作或 export，也没有改变 waterfall projection/interaction 结果。

## Compatibility Matrix

| Source | View | Result |
| --- | --- | --- |
| legacy `1.0.0` waterfall | legacy `1.0.0` waterfall | 通过；identity 与 wire shape 保持 |
| legacy `1.0.0` waterfall | current `2.0.0` waterfall | `SCHEMA_VERSION_MISMATCH` |
| current `2.0.0` waterfall | current `2.0.0` waterfall | 通过 |
| current categorical | current bar / column | 通过 |
| waterfall | bar / column | `INCOMPATIBLE_CHART_TYPE` |
| categorical | waterfall | `INCOMPATIBLE_CHART_TYPE` |

## TDD Receipt

- RED command：packet 中的 4-file focused Vitest command，exit 1；2 files failed、2 passed，8 tests failed、
  6 passed。失败原因为 schema `2.0.0`/`dataKind`、categorical initialization 与 internal policy 尚不存在，
  符合预期。
- GREEN command：相同 focused command，exit 0；4 files、17/17 tests passed。
- REFACTOR：domain/package focused suite 16 files、179/179；完整 unit 与 coverage 均为 34 files、341/341。
- SourceData identity、legacy fingerprint、command source identity、schema/chart type preservation 与 hostile
  plain-data validation 均有直接回归。

## Public API

新增公共 types：`ChartType`、`SourceDataKind`、`WaterfallSourceData`、`CategoricalSourceData`、
`WaterfallSourceItem`、`CategoricalSourceItem`、`InitialViewSpecOptions`。`SourceData`、`SchemaVersion` 与
`ViewSpec` 扩展为批准的 union；runtime exports 仍精确保持原有 10 项，不导出 chart policy、projector、
G2 spec、renderer 或 chart instance。

生成的 ESM/CJS declarations、publint、ATTW 与 package type consumer 全部通过；没有新增 runtime dependency，
`@antv/g2` 继续是唯一 chart-engine peer。

## Review

- Spec compliance：0 blocking finding。schema、compatibility、initialization、persistence、command policy 与
  public surface 均符合 Confirmed contracts；未实施 T113-T116 范围。
- Engineering：0 blocking finding。strict TypeScript、closed hostile-input validation、stable issue ordering、
  immutable source/session、version-preserving history、privacy-safe errors 与 internal-only policy 均通过检查。
- QA：0 blocking finding。legacy regression、current variants、empty categorical、nested groups、pin lock、
  cross-segment waterfall restriction、round-trip、ESM/CJS/types 和全量 quality gates 通过。

Final `diff.patch` 包含 29 个 code/test/governance file headers，共 165,852 bytes，SHA-256 为
`247f7d2bea27676f52211a4b183a40a7d87fbb1be54c269709781338a5ed3247`。patch 排除
`.ai-platform/evidence/T112/**` 以避免递归；`git apply --check --cached` 与 strict T112 artifact validator
均为 exit 0。

## Changed Files

- Governance：`.ai-platform/docs/tasks.md`、`.ai-platform/docs/technology-decision-record.md`、`AGENTS.md`、
  `.ai-platform/specs/004-categorical-chart-validation/**`。
- Domain/public：`model.ts`、`errors.ts`、`validation.ts`、`createInitialViewSpec.ts`、`session.ts`、
  `history.ts`、`executeCommand.ts`、新增 `chartPolicy.ts`、`index.ts`。
- Compatibility narrowing：`FinancialChartEditor.tsx`、`groupSelection.ts`、`projectWaterfall.ts`。
- Tests：新增 `schema-v2.test.ts`、`chart-policy.test.ts`；更新 `invariants.test.ts`、
  `validation.test.ts`、`persistence.test.ts` 与 package `types-consumer.ts`。
- Evidence：`.ai-platform/evidence/T112/summary.md`、`test-results.md`、`diff.patch`。

## Residual Risk

- T112 只交付 domain boundary；categorical G2 projection/spec、方向感知交互、React/export/a11y 集成分别属于
  T113-T115，当前不能把 categorical data contract 解释为可用 UI。
- 本切片不提供 legacy migration writer；legacy/current generation 必须显式匹配，这是批准的兼容策略。
- playground build 保留既有大 chunk advisory；editor package 仍把 G2 externalize，T112 未改变该边界。

## Handoff

T112 为 `Accepted`。T113 与 T114 的依赖已满足，可以分别生成 execution packet；在 packet 获批前不开始
实现。远程与发布动作仍需单独授权。
