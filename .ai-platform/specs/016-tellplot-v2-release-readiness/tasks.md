# G003-R1 TellPlot 2.0 发布准备 Work Graph

## Metadata

- Feature ID: `016-tellplot-v2-release-readiness`
- Goal ID: `G003-R1`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-28
- Execution gate: G003/T135-T141 已 `Accepted`；TDR-026、Technical Plan 与本 Work Graph 已于
  2026-08-28 获用户明确批准

## Epic E016 - Reproducible TellPlot 2.0 Release Readiness

把已验证的 G003 candidate 转换为 exact current-release contract、隔离 source artifact、fresh full matrix 与
人工发布授权材料，同时保持 1.0 历史 lineage 和所有远程动作闸门。

## Work Graph

```text
G003 Accepted + TDR-026/Plan/Graph Confirmed
  -> T142 2.0 release descriptor + fail-closed pipeline
  -> T143 integrated clean source + final artifact freeze
  -> T144 fresh full release rehearsal
  -> T145 three-lens review + release authorization dossier
  -> G003-R1 Needs_Review
```

所有任务串行。release descriptor、workflow、artifact hash 与 evidence ownership 交叠，不允许并行实现。

## T142 - 建立 2.0 Current-Release Contract 与 Pipeline

- Status: Needs_Review
- Priority: P0
- Depends on: G003/T135-T141 Accepted（已满足）；TDR-026、plan 与 work graph Confirmed（已满足）
- Blocks: T143-T145
- Story / Requirement: US-REL2-002；REL2-FR-001、002、003、007；REL2-NFR-001、002、004、005、006
- Parallel: false
- Conflicts with: T143-T145；published release scripts、workflow 与 package release tests

- Goal: 以 test-first 方式建立 2.0 structured release descriptor，并使 HEAD scripts、package tests 与 workflow
  精确消费该合同、失败关闭，同时保持 T131 evidence 和 v1.0.0 历史内容不变。
- Allowed files: `scripts/release/**`、`.github/workflows/publish-npm.yml`、`package.json`、
  `packages/editor/tests/package/**`、`packages/tellplot/tests/package/**`、`.ai-platform/evidence/T142/**`、
  本 feature T142 状态字段。
- Test targets: descriptor schema/path traversal、2.0 version/tag/evidence/hash consistency、workflow permissions/job
  separation、dirty/wrong-tag/lightweight/stale/hostile rewrite/registry failure fixtures、T131 immutability receipts。
- Deliverables: 2.0 current-release descriptor；descriptor-driven audit/artifact/check/rehearse/preflight/trust tools；
  exact `v2.0.0` stage-only workflow definition；focused tests。
- Acceptance criteria: scripts/tests/workflow 无重复漂移的 release facts；所有负向路径在任何 stage/publish 前非零停止；
  T131 evidence byte-identical；无 live registry 或 remote action。
- Definition of Done: RED 因 1.0/T131 hard-pin 与缺失 descriptor 失败；GREEN focused package/release tests、type/lint/
  architecture 通过；T142 三层 review无 Critical/High/Medium finding。
- Validation commands: `pnpm exec vitest run packages/editor/tests/package/stable-release.test.ts packages/editor/tests/package/single-package-distribution.test.ts packages/editor/tests/package/candidate-tools.test.ts`；
  `pnpm test:package`；`pnpm release:architecture`；`pnpm lint`；`git diff --check`。
- TDD plan: RED 固定 descriptor 与 2.0 workflow contract；GREEN 最小迁移 current-release tools；REFACTOR 只抽取
  structured config reader/validator，不建立通用多包发布框架。
- Packet path: `.ai-platform/specs/016-tellplot-v2-release-readiness/packets/T142.yaml`
- Evidence required: `.ai-platform/evidence/T142/summary.md`、`test-results.md`、`diff.patch`、`review.md`。

## T143 - 整合 Clean Source 并冻结最终 2.0 Artifact

- Status: Running
- Priority: P0
- Depends on: T142 Needs_Review 且三层 review通过
- Blocks: T144-T145
- Story / Requirement: US-REL2-001；REL2-FR-004、005；REL2-NFR-002、003、005、006
- Parallel: false
- Conflicts with: T142、T144；README lineage、descriptor、workflow hash、artifact evidence

- Goal: 在不改变 shared Git/index/remote 的前提下，整合本地可见 `origin/main` 双语 README lineage、G003 reviewed
  tree 与 T142 release-only delta，从隔离 source 连续重建并冻结最终唯一 2.0 tarball。
- Allowed files: `README.md`、`README.en.md`、`scripts/release/current-release.*`、
  `.github/workflows/publish-npm.yml`、`.ai-platform/evidence/T143/**`、
  本 feature T143 状态字段。不得修改 T131 evidence、lockfile、package implementation 或 G003 behavior tests。
- Test targets: cumulative patch apply/reverse、path/mode/size/SHA receipts、shared index unchanged、isolated frozen install/
  build/package、two-run byte identity、descriptor/workflow/manifest exact hash parity、README bilingual semantics。
- Deliverables: isolated integrated-source manifest；final `tellplot-2.0.0.tgz`；tarball manifest；final descriptor/hash；
  source replay receipt。
- Acceptance criteria: 两次 artifact filename/size/files/SHA-256 完全一致；descriptor、workflow 与 manifest 同 hash；
  README 两侧已确认内容均保留；本地 tracking ref 只表述为 observed，不宣称 remote fresh。
- Definition of Done: focused artifact/rehearsal tests和 isolated build通过；shared branch/index/tag/remote unchanged；
  T143 三层 review无 Critical/High/Medium finding。
- Validation commands: `pnpm release:artifact`（连续两次并比较）；`pnpm release:audit`；
  `pnpm release:rehearse`；`pnpm test:package`；artifact/descriptor strict validator；`git diff --check`。
- TDD plan: RED 证明 current README lineage/descriptor/hash 不能从 observed origin base clean replay；GREEN 完成最小语义整合
  与原子 hash refresh；REFACTOR 只清理 rehearsal helper，不改变 package output。
- Packet path: `.ai-platform/specs/016-tellplot-v2-release-readiness/packets/T143.yaml`
- Evidence required: `.ai-platform/evidence/T143/summary.md`、`test-results.md`、`diff.patch`、`review.md`、
  `source-manifest.json`、`tarball-manifest.json`、`artifacts/tellplot-2.0.0.tgz`、`isolated-source-receipt.md`。

## T144 - 完成 Fresh Full Release Rehearsal

- Status: Draft
- Priority: P0
- Depends on: T143 Needs_Review 且 final artifact freeze review通过
- Blocks: T145
- Story / Requirement: US-REL2-001、002；REL2-FR-003、004、005、006；REL2-NFR-001 至 006
- Parallel: false
- Conflicts with: T142-T143、T145；release scripts/workflow/hash/evidence

- Goal: 从 T143 integrated source fresh 运行完整质量矩阵与 public-preflight fixtures，证明 2.0 release-only delta
  没有产品回归，且所有未授权或错误来源均失败关闭。
- Allowed files: `.ai-platform/evidence/T144/**`；本 feature T144 状态字段。T144 是 evidence-only full-gate task；
  任何 blocking defect 必须返回 T142/T143 owning task 或先取得精确 owner-variance amendment，不得就地扩张。
- Test targets: format/lint/type/coverage/build/package/framework/current+previous browser/a11y/performance/security/
  architecture/release check/audit/artifact/rehearse；public-preflight negative/isolated-positive fixtures。
- Deliverables: full quality receipt；release rehearsal receipt；负向门禁矩阵；artifact immutability recheck。
- Acceptance criteria: exact matrix fresh 通过；无 skip/threshold/timeout/assertion downgrade；external registry/GitHub/trust
  状态记录为 `Not_Run_Not_Authorized`；T143 artifact/hash仍匹配。
- Definition of Done: 所有本地阻断门禁 green；任何环境重试保留首轮失败和 fresh replay；三层 review无
  Critical/High/Medium finding。
- Validation commands: plan 的 Full Local Matrix 全部命令；delivery artifact validator；patch replay；
  `git diff --check`。
- TDD plan: 不适用；T144 默认不新增行为。若 full gate 暴露 regression，返回 owning task 先补 RED 和最小 GREEN，
  重新冻结 T143 后再恢复 T144；不得改变 spec、threshold 或 release boundary。
- Packet path: `.ai-platform/specs/016-tellplot-v2-release-readiness/packets/T144.yaml`
- Evidence required: `.ai-platform/evidence/T144/summary.md`、`test-results.md`、`diff.patch`、`review.md`、
  `quality-matrix.json`、`preflight-fixtures.json`。

## T145 - 形成目标级 Review 与 Release Authorization Dossier

- Status: Draft
- Priority: P0
- Depends on: T144 Needs_Review 且 full matrix/reviews通过
- Blocks: G003-R1 Needs_Review；后续 Git handoff 与 public release approval
- Story / Requirement: US-REL2-003；REL2-FR-001、005、006、007；REL2-NFR-003、004、006
- Parallel: false
- Conflicts with: T142-T144；canonical goal status、release report 与 evidence summary

- Goal: 独立复核完整 release-readiness diff/evidence，形成不依赖聊天的 Git handoff/public release 授权包，
  并把 G003-R1 推到 `Needs_Review`，不执行 dossier 中的任何命令。
- Allowed files: `.ai-platform/specs/016-tellplot-v2-release-readiness/**`、`.ai-platform/docs/tasks.md`、
  `.ai-platform/docs/technology-decision-record.md`、`docs/roadmap.md`、`AGENTS.md`、
  `.ai-platform/evidence/T145/**`。不得把 `.ai-platform/docs/release-report.md` 从 1.0 历史报告改写为 2.0 released。
- Test targets: cross-artifact validator、status consistency、evidence path/hash integrity、three-lens review、authorization
  boundaries、no-secret/no-absolute-temp-path scan。
- Deliverables: goal summary、spec compliance/engineering/QA reviews、release authorization dossier、residual risks、
  exact next approvals and stop conditions。
- Acceptance criteria: Critical/High/Medium finding为0；G003-R1 `Needs_Review`；G003/T135-T141 只在用户先前明确
  acceptance 后标记 Accepted；所有 remote/public actions保持未执行且单独待批。
- Definition of Done: validator与`git diff --check`通过；artifact/source/quality receipts一致；goal evidence足以供
  用户验收但不制造 release claim。
- Validation commands: `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 016-tellplot-v2-release-readiness`；
  status/evidence integrity scripts；`git diff --check`。
- TDD plan: 不适用，T145 不实现运行时行为；任何执行修复回到 owning task并重新 review。
- Packet path: `.ai-platform/specs/016-tellplot-v2-release-readiness/packets/T145.yaml`
- Evidence required: `.ai-platform/evidence/T145/summary.md`、`test-results.md`、`diff.patch`、`review.md`、
  `release-authorization.md`。
