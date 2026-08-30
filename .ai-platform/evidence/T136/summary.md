# T136 Execution Summary

- Task: `T136 - 实现 Comparison Projection 与 State Invariants`
- Packet: `.ai-platform/specs/015-multi-series-categorical-comparison/packets/T136.yaml`
- Executor: Codex worker
- Attempts: `T136-A001`，以及经编排器授权的受控 recovery `T136-A002`
- Status: `Needs_Review`；未标记 `Accepted`

## Baseline 与范围

- 执行前工作树包含已评审的 T135 与 G003 治理变更；T135 task-local diff SHA-256 为
  `ad8c31b3e0da1c14ac5e3d28e8ac9143fa9d4d4d1b71a34edec94795179a0c6c`。
- `diff.patch` 以执行前保存的 T135 reviewed baseline 为父版本，仅包含 T136 delta；没有回滚或覆盖前置变更。
- 执行前 `git status --short --branch` 为 `main...origin/main`，并包含 packet 已记录的 G003 governance、T135
  runtime/tests 与 T135 evidence 未提交基线；没有发现未记录且与 T136 ownership 冲突的路径。
- 只修改 packet allowlist 内文件。未修改 editor/G2 渲染、依赖、lockfile、package manifest/version、command wire、
  T137-T141、release/publish/tag 或远程 Git。

## T136 Delta

- Runtime/state: `packages/core/src/charts/categorical/comparisonProjection.ts`、`packages/core/src/store/editorStore.ts`、
  `packages/core/src/index.ts`。
- Tests/contracts: 三个 comparison categorical test files、`packages/core/tests/editorStore.test.ts`、
  `packages/core/tests/public-api.mjs`、`scripts/release/package-contracts.json`。
- Governance/evidence: 本 feature `tasks.md` 仅将 T136 status 改为 `Needs_Review`，以及本 evidence 目录。
- 机械 diff summary: 10 files changed，2221 insertions，8 deletions；其中 4 个 T136 新文件按 `/dev/null`
  生成，6 个 overlapping files 与保存的 T135 baseline 比较。

## 实现结果

- 新增唯一 runtime export `projectCategoricalComparison`。它按 source series 声明顺序输出 category-major
  values，对每个 series 独立执行 Neumaier 聚合，规范化零符号，并在任一累加器不安全时原子失败。
- projector 对实际消费的 source 与 view 建立 descriptor-backed 私有快照，重新执行完整
  `validateViewSpec`，并且只投影 trusted snapshots；root、nested 与 view TOCTOU Proxy 均不能注入未验证的
  `NaN`/`Infinity`，反射错误保持 fail-closed 与 privacy-safe。公共 validator 的 identity 合同未改变。
- category/group command、nested group、move/history/undo/redo 与 category/series 同字符串 namespace 保持
  category-only；property sequences 证明每 series 独立、无来源丢失/重复、无 cross-series total，source/view
  输入保持不变。
- store update 覆盖 presentation、零符号、category source order、series/amount semantic update、controlled view、
  `defaultView`、category-ID replacement，以及 v3 layout/dataset/v2-v3 generation boundary。边界清除 selection
  exactly once，并重置 history/processed IDs，不合成 command/view callback；纯 v1/v2 行为保持原合同。
- package surface allowlist 精确新增一个 runtime function；没有扩大 v2 `CategoricalDatum` 或 command union。

## TDD 与 Review Fix

- A001 authoritative RED: 4/9 files failed，10/85 tests failed；9 条因 projector 缺失，1 条因 selection callback
  语义缺失。失败不是 timeout、fixture 或环境错误。
- A001 GREEN: focused projection/state/store tests 通过。随后补齐 approved update matrix、redo/processed IDs、
  immutability、controlled/defaultView、namespace 与 nested-history 证据。
- A002 recovery: 单独复演原 coverage timeout 文件通过；独立 review 发现 hostile TOCTOU 后，先得到真实 focused
  RED，再加入 private snapshot + second validation。后续复审发现 post-validation descriptor trap，补充 never
  throw/privacy-safe 与 source-classification regressions。
- Spec compliance: pass，未发现 unresolved Critical/High/Medium finding。
- Bug/code quality: pass；TOCTOU Medium finding 已在 A002 修复并回归验证。
- QA acceptance: pass；完整 validation commands 通过。

## Residual Risk

- A001 coverage 两次只在既有 `stable-release.test.ts` 固定 15 秒用例上超时；A002 单文件低并发复演通过，最终
  原始 `pnpm test:coverage` 也已完整通过。机器负载会显著影响耗时，但没有剩余功能失败。
- T135 既有 private editor package version assertion exception 未改动，也未被本任务授权修复。
