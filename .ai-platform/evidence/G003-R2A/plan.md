# G003-R2A Git Handoff A Technical Plan

## Metadata

- Goal ID: `G003-R2A`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-28
- Approval: 用户于 2026-08-28 明确批准创建并执行 G003-R2A，允许只读 fetch、remote reconciliation、
  clean-source 集成和本地 commit candidate；不授权 push、PR、merge、tag 或公开发布。
- Governing decision: TDR-026 与 `.ai-platform/evidence/T145/release-authorization.md` 的 Approval 1。

## Objective

把已验收的 G003/G003-R1 source 与 evidence 从 fresh `origin/main` 重放到独立 clean Git worktree，形成一个
可审计的本地 Conventional Commit candidate。当前目标只改变本地 fetch tracking ref、独立 worktree、候选分支
和本地 commit；共享 dirty worktree/index 保持不变，所有远端写入与公开发布动作继续禁止。

## Scope

1. T146 只读 fetch `origin/main`，记录 fetch 前后 commit，证明 remote main 是否相对 T145 observed commit 漂移。
2. T147 从 fresh fetched `origin/main` 创建 `codex/g003-r2a` clean worktree，应用 T143 frozen source patch，
   加入已验收 T135-T145 evidence 与本阶段预提交治理记录，复核 source manifest、descriptor、workflow 和 tarball。
3. T148 审计 staged diff、生成候选 tree receipt，并创建本地 Conventional Commit；验证 commit parent、tree、
   status、shared index、artifact hash 与禁止边界。

## Invariants

- T145 observed `origin/main` 为 `4d754cc9d635d097370b674633c972fb0ac199a1`；若 fresh fetch 不同，立即停止。
- T143 source patch SHA-256 保持
  `19fd38c377c45dcc0af6a3df6848bad684d079e1332b2fc296ad307f5805459d`。
- `tellplot-2.0.0.tgz` 保持 597,508 bytes、41 files、SHA-256
  `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`。
- release descriptor 与 workflow SHA-256 分别保持
  `729bf4a1e67d8249d1146ebf5e961f0376f059ff8aa14750127c99c565570182` 与
  `d85da954fee1e5696ddfd6bd678f68ead50f2d4d815ecda45ca9e9d2ea53ac63`。
- 共享 `.git/index` SHA-256 保持
  `3f83dab964030f0816078e1ff7312e063fd8920167c0fa3c610d972b7cc69fd8`。
- 不改写 T131 evidence、`v1.0.0` tag、dependency、lockfile、public API/schema、测试阈值或 workflow trust boundary。

## Validation Strategy

- Remote: exact fetched `origin/main` identity、ancestry、fetch-only state receipt。
- Clean integration: `git apply --check`、T143 path/mode/size/SHA manifest parity、frozen artifact/descriptor/workflow
  exact hash、package/release focused checks、`git diff --check`。
- Commit candidate: staged path/secret/local-metadata/forbidden-action audit、parent/tree receipt、Conventional Commit、
  clean candidate worktree 与 shared worktree/index unchanged。

## Stop Conditions

- Fresh `origin/main` 不等于 T145 observed commit。
- T143 patch不能 clean apply，source manifest或 artifact/descriptor/workflow 任一漂移。
- staged diff包含 credential、环境文件、本机路径、生成报告、T131 改写或 scope 外文件。
- 需要 pull/merge/rebase、force、push、PR、merge、tag、workflow dispatch、npm/GitHub release 或 production action。

## Release Boundary

本目标完成只形成本地 commit candidate。`push`、PR、merge、tag、workflow dispatch、npm stage/public approval、
GitHub Release、dist-tag 和 production promotion 均为 `Not_Run_Not_Authorized`。
