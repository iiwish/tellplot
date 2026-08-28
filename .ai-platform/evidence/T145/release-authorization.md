# TellPlot 2.0 Release Authorization Dossier

## Authorization State

- Candidate: `tellplot@2.0.0` / schema `3.0.0`。
- Local release readiness: Passed。
- Git handoff authorization: `Not_Run_Not_Authorized`。
- Public release authorization: `Not_Run_Not_Authorized`。
- 本 dossier 是后续决策输入，不是执行许可；其中任何步骤都不得从本地 readiness 或目标验收自动推出。

## Reviewed Candidate

- Shared HEAD at freeze: `cd90ddf3d27bb323c994b5ba01735a4972c46f48`。
- Observed local `origin/main`: `4d754cc9d635d097370b674633c972fb0ac199a1`。
- Remote freshness claim: `local_tracking_ref_only`；没有执行 fetch 或远程查询。
- Integrated source manifest: 462 files，SHA-256
  `fc167c6800dd5474293fedf293e3448f29aeb0d865ed3e03a179d179a4e1958a`。
- Integrated source patch: 154 paths、1,388,784 bytes，SHA-256
  `19fd38c377c45dcc0af6a3df6848bad684d079e1332b2fc296ad307f5805459d`。

## Frozen Artifact

- File: `.ai-platform/evidence/T143/artifacts/tellplot-2.0.0.tgz`。
- Size/files: 597,508 bytes / 41 package files。
- SHA-256: `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`。
- Descriptor SHA-256: `729bf4a1e67d8249d1146ebf5e961f0376f059ff8aa14750127c99c565570182`。
- Workflow SHA-256: `d85da954fee1e5696ddfd6bd678f68ead50f2d4d815ecda45ca9e9d2ea53ac63`。
- T143 manifest、descriptor 与 workflow 对 package/version/tag/evidence/path/size/hash 精确一致。

## Local Gate Decision

- Current unit/coverage: 72 files / 613 tests；statements 90.29%、branches 84.38%、functions 91.13%、
  lines 90.40%。
- Current browser: 321/321；a11y: 48/48；previous Playwright: 321/321；previous-major WebKit: 107/107。
- Performance: 4/4，orchestrated comparison p95 79.1ms / 52.7ms，budget 150ms，root commit delta 0。
- Package/framework/security/architecture/audit/artifact gates全部通过。
- `release:check` 完整通过，并包含 fresh 12-gate isolated-source rehearsal；artifact refresh/verify 仍为同一 hash。
- 三视角 review：Critical 0 / High 0 / Medium 0 / Low 0 unresolved。

## Approval 1: Git Handoff

此授权只允许把已审查 source 交付到 Git；不允许 tag、workflow、npm 或 GitHub Release。

授权后应按以下顺序执行并形成新 evidence：

1. 只读获取并记录 remote refs，比较实际 `origin/main` 与 observed
   `4d754cc9d635d097370b674633c972fb0ac199a1`。
2. 若 remote main 未漂移，在 clean Git source 中重建 T143 integrated tree，核对 source manifest、release
   descriptor、workflow 与 artifact hash；不得把当前 dirty worktree直接作为提交来源。
3. 形成最小 Conventional Commit，复核 staged diff 不含 credentials、local metadata、generated reports、
   T131 历史改写或未批准文件。
4. 经明确 push/PR 授权后才可 push 或创建 PR；CI 必须 green，review 后才可 merge。

Git handoff 立即停止条件：remote main 漂移；patch replay或manifest不一致；artifact/hash变化；出现 dependency、
lockfile、public API/schema、threshold、workflow trust boundary 或额外产品行为变化。任一条件出现都使 T143/T144
receipt 失效，必须重新 review、freeze 与 full rehearsal。

## Approval 2: Public Release

此授权必须在 Git handoff完成、merged main 与所有 frozen receipts一致后单独给出。它不得授权 direct local
`npm publish`。

授权后受保护流程应按以下顺序执行：

1. 在 exact merged main commit 创建并推送 annotated `v2.0.0` tag；tag object、peeled commit、remote main、
   workflow ref 与 source必须一致。
2. 从 exact tag 手动 dispatch `.github/workflows/publish-npm.yml`，使用约定的精确人工 confirmation。
3. Verify job 在无 OIDC 条件下完成 clean-source、full gates、artifact rebuild 与 fixed SHA 校验。
4. Stage job 仅在 protected `npm-production` environment 内取得 minimal OIDC，验证 official registry vacancy、
   exact artifact 与 Trusted Publisher 配置，只执行 stage-only provenance publishing。
5. 人类复核 staged artifact、provenance 和 package content，并通过 WebAuthn/2FA 明确批准公开；随后核验
   registry、dist-tag、fresh install、provenance 与 GitHub Release 一致性。

Public release 立即停止条件：`tellplot@2.0.0` 已占用或 registry query失败；remote main/tag/workflow ref不一致；
tag 为 lightweight；artifact size/hash/packlist漂移；Trusted Publisher、protected environment、OIDC audience、
registry URL 或 confirmation不匹配；staged package内容不被人类批准。任何失败都不得改用 direct publish、
force tag、覆盖版本或跳过 provenance。

## Post-Publish Safety

- 公开版本不可覆盖；发现问题时停止 promotion，并通过新的明确审批进行 deprecate、修复版本或安全响应。
- 不删除或改写 `v1.0.0`、T131 evidence、1.0 provenance 与历史 release report。
- Git handoff、public release 与 production promotion继续是彼此独立的授权边界。
