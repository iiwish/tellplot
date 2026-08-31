# TellPlot 2.0 Release Authorization Dossier

## Authorization State

- Candidate: `tellplot@2.0.0` / schema `3.0.0`。
- Accepted Git handoff: Completed；G003-R2 merged commit
  `5a26352fc16ce4173d11be0f8ad0c7b947207675`。
- Release-control recovery: `Local_Commit_Candidate_Pending_Git_Handoff`。
- Local release readiness: Passed for the accepted product source and frozen artifact；release-control recovery
  仍需 fresh CI 与 merge receipt。
- External release controls: Passed；GitHub v2 protection与npm live account/package controls均已核验。
- Release readiness: Pending recovery Git handoff与fresh CI；public release仍未授权。
- Public release authorization: `Not_Run_Not_Authorized`。
- 本 dossier 是后续决策输入，不是执行许可；其中任何步骤都不得从本地 readiness 或目标验收自动推出。

## Reviewed Candidate

- Remote `main` fetched on 2026-08-31: `5a26352fc16ce4173d11be0f8ad0c7b947207675`。
- Remote `main` tree: `ec575b7c8c571bab340337a6c70eab324fa9596e`；与 G003-R2 accepted candidate tree一致。
- Merge-triggered main CI: run `33355542311`，Passed。
- `v2.0.0` tag: Absent；不得在独立 public release授权前创建。
- Recovery source: clean worktree branch `codex/g003-release-control-recovery` from exact remote `main`；只修改
  release gate orchestration、对应 contract test与本 dossier，不改变 public API/schema、dependency、lockfile、
  product behavior、performance budget或 artifact packlist。

## Frozen Artifact

- File: `.ai-platform/evidence/T143/artifacts/tellplot-2.0.0.tgz`。
- Size/files: 597,508 bytes / 41 package files。
- SHA-256: `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`。
- Descriptor SHA-256: `729bf4a1e67d8249d1146ebf5e961f0376f059ff8aa14750127c99c565570182`。
- Workflow SHA-256: `d85da954fee1e5696ddfd6bd678f68ead50f2d4d815ecda45ca9e9d2ea53ac63`。
- T143 manifest、descriptor 与 workflow 对 package/version/tag/evidence/path/size/hash 精确一致。

## Local Gate Decision

- Current unit/coverage: 72 files / 616 tests；statements 90.29%、branches 84.38%、functions 91.13%、
  lines 90.40%。
- Current browser: 321/321；a11y: 48/48；previous Playwright: 321/321；previous-major WebKit: 107/107。
- Fresh exact-main performance after host cooldown: 4/4；waterfall 147.3ms、categorical 133.1ms、comparison
  keyboard/direct 104.0ms / 103.2ms，budget 150ms，root commit delta 0。
- Recovery orchestration performance: 60s fixed cooldown后 4/4；waterfall 45.8ms、categorical 42.7ms、comparison
  keyboard/direct 49.5ms / 55.2ms，budget、samples与assertions均未调整。
- Recovery contract: focused `stable-release.test.ts` 15/15；performance gate在 coverage/build/package/framework
  之前执行，避免 release orchestration自身使 timing evidence order-dependent。
- Package/framework/security/architecture/audit/artifact gates全部通过。
- Exact-main isolated `release:rehearse` fresh通过；artifact refresh/verify仍为同一hash。Recovery full orchestration
  在 performance、coverage、build、artifact、package与framework通过后遇到无关 Firefox 30s host-saturation
  timeout并停止；不得把该环境失败描述为 fresh full pass，fresh CI是 recovery merge前的强制 gate。
- 三视角 review：Critical 0 / High 0 / Medium 0 / Low 0 unresolved。

## External Control Receipt

- GitHub `npm-production` deployment policy允许 exact tags `v1.0.0` 与 `v2.0.0`；v2 policy id `58682642`。
- Active ruleset `21903450` 精确匹配 `refs/tags/v2.0.0`，无 bypass actor，并禁止 tag update与deletion。
- Registry root `tellplot` 为 public；dist-tags为 `latest=1.0.0`、`bootstrap=0.0.0-bootstrap.0`；
  `tellplot@2.0.0` 返回 404，版本仍可用。
- 维护者于2026-08-31通过npm WebAuthn/security-key登录后完成live browser receipt：当前身份为`iiwish`；
  Trusted Publisher精确指向GitHub repository `iiwish/tellplot`、workflow `publish-npm.yml`与environment
  `npm-production`，唯一权限为`npm stage publish`，未开放direct `npm publish`。
- Package access为public；publishing access选中最严格的“require 2FA and disallow bypass 2FA tokens”；唯一
  maintainer为`iiwish`且具有write access。
- npm `Staged Packages` live view显示没有等待review的版本；不存在遗留stage占用`tellplot@2.0.0`。CLI未建立
  本地session token，也未执行stage、approve、reject或publish操作。

## Approval 1: Git Handoff

G003-R2 Git handoff已完成并验收。当前 release-control recovery必须形成独立最小 Conventional Commit；push、PR、
CI与merge仍需明确授权。该 handoff 不允许 tag、workflow dispatch、npm stage/publish或GitHub Release。

Recovery Git handoff立即停止条件：remote main漂移；artifact/hash变化；出现dependency、lockfile、public API/schema、
performance threshold、workflow trust boundary或额外产品行为变化；fresh CI未全绿。任一条件出现均需重新审查。

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
