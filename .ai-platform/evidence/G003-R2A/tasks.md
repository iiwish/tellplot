# G003-R2A Work Graph

## Metadata

- Goal ID: `G003-R2A`
- Status: Confirmed
- Last updated: 2026-08-28
- Approval: 用户已明确批准本 scope；TDR-026 与 T145 Approval 1 已定义执行顺序和停止条件。

## Graph

```text
G003-R1 Accepted
  -> T146 fresh remote reconciliation
  -> T147 clean-source integration
  -> T148 local commit candidate
  -> G003-R2A Needs_Review
```

所有任务串行；不创建子任务或并行执行。

## T146 - Fresh Remote Reconciliation

- Status: Needs_Review
- Priority: P0
- Depends on: G003-R1 Accepted；用户明确 G003-R2A 授权
- Blocks: T147-T148
- Parallel: false
- Conflicts with: 任何 remote write、tag 或 shared worktree/index edit
- Goal: 只读 fetch `origin/main`，比较 fresh commit 与 T145 observed commit，并记录安全状态。
- Allowed state: `refs/remotes/origin/main`、fetch metadata、`.ai-platform/evidence/T146/**`、本 graph/packet 状态。
- Validation: exact commit、ancestry、remote URL、shared HEAD/index/tag digest 前后一致。
- Acceptance: fresh `origin/main` 精确等于 `4d754cc...`；否则停止，不进入 T147。
- Definition of Done: fetch receipt、command/result、boundary review完成，无远端写入。
- Packet: `.ai-platform/evidence/G003-R2A/packets/T146.yaml`
- Evidence: `.ai-platform/evidence/T146/{summary.md,test-results.md,review.md}`。

## T147 - Clean-Source Integration

- Status: Needs_Review
- Priority: P0
- Depends on: T146 Needs_Review 且 remote无漂移
- Blocks: T148
- Parallel: false
- Conflicts with: shared dirty worktree/index；source/hash ownership
- Goal: 从 fresh `origin/main` 建立独立 `codex/g003-r2a` worktree，重放 frozen source并加入已验收 evidence。
- Allowed state: 独立 worktree/branch、T135-T145 与 G003-R2A/T146-T148 evidence、本 task evidence。
- Validation: T143 patch/source manifest parity、artifact/descriptor/workflow hash、focused package/release checks、diff check。
- Acceptance: clean source、已验收 evidence和 frozen release facts一致，shared worktree/index未变。
- Definition of Done: integration receipt与三视角 review通过；候选尚未 commit。
- Packet: `.ai-platform/evidence/G003-R2A/packets/T147.yaml`
- Evidence: `.ai-platform/evidence/T147/{summary.md,test-results.md,review.md,source-receipt.json}`。

## T148 - Local Commit Candidate

- Status: Needs_Review
- Priority: P0
- Depends on: T147 Needs_Review
- Blocks: 后续单独授权的 push/PR/merge 阶段
- Parallel: false
- Conflicts with: remote Git、tag/public release；shared index
- Goal: 审计并 stage clean candidate tree，创建一个本地 Conventional Commit candidate。
- Allowed state: `codex/g003-r2a` 独立 index/branch/local commit、`.ai-platform/evidence/T148/**`。
- Validation: staged path/secret/scope audit、parent/tree receipt、commit message、post-commit clean status、shared index/hash。
- Acceptance: commit parent为 fresh `origin/main`，tree只含已批准 G003/G003-R1与本阶段 evidence，不含 forbidden paths。
- Definition of Done: 本地 commit存在且候选 worktree clean；push/PR/merge/tag/public actions未执行。
- Packet: `.ai-platform/evidence/G003-R2A/packets/T148.yaml`
- Evidence: `.ai-platform/evidence/T148/{summary.md,test-results.md,review.md,commit-candidate.json}`。

## Goal Gate

- Status: Needs_Review
- Result: T146-T148全部完成本地验证和三视角 review；本地 commit candidate待用户目标级验收。
- Still not authorized: push、PR、merge、tag、workflow dispatch、npm/GitHub public release、production promotion。
