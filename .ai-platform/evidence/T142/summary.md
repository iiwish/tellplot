# T142 Execution Summary

## Status

- Task: T142 - 建立 2.0 Current-Release Contract 与 Pipeline
- Attempt: T142-A003（T143 clean rehearsal 定向恢复）
- Executor: Codex direct execution；用户要求不创建子任务，按已批准 packet 串行执行
- Result: Needs_Review

## Delivered

- 新增 closed structured descriptor：`scripts/release/current-release.json` 与 fail-closed loader/validator
  `current-release.mjs`。
- HEAD current-release semantics 精确切换为 `tellplot@2.0.0`、`v2.0.0`、T143 artifact root、official npm
  registry、Node `22.20.0`、pnpm `11.1.3`、npm `11.18.0` 与已验证 candidate SHA-256。
- `audit-release`、`package-artifact`、`check-stable`、`preflight-public`、trust-readiness 与 isolated rehearsal
  统一消费 descriptor；package artifact 在 descriptor mismatch 时不会写入 evidence。
- `publish-npm.yml` 本地 definition 固定 exact `v2.0.0`、T143 single tarball/hash、protected environment、minimal
  OIDC、stage-only Trusted Publishing 与 provenance，未触发 workflow。
- public preflight fixtures覆盖 dirty、wrong branch/tag、lightweight tag、remote drift、hostile Git config、wrong
  registry/hash/toolchain；hermetic fixture descriptor 只能通过函数测试入口注入，生产 CLI 固定 repository descriptor。
- 1.0 history 保持独立：T131 六个 evidence/artifact files 与 T141 immutable receipts 完全一致；1.0 release report
  继续保留 published facts。
- T143 freeze preflight 发现 source rehearsal 会复制本机 `.env.local` 与 `.vercel`；T142-A002 以 RED
  contract test 固定边界，并使 current/candidate isolated rehearsal 一致排除 Git-ignore 定义的本地
  environment files 与 Vercel metadata。
- T143 首次 clean rehearsal 证明未生成内部 declaration 时 `typecheck` 无法先于 `build`成立；
  T142-A003 以 RED order assertion 固定 `build -> typecheck`，不改变任何门禁集合或通过标准。

## TDD Receipt

- RED：新增 descriptor contract test 后，因 `scripts/release/current-release.json` 不存在而精确失败，1 test failed。
- GREEN：实现 descriptor/loader并迁移 current release pipeline；focused suite最终 `3/3` files、`31/31` tests通过。
- REFACTOR：只抽取 current release private descriptor/validator；未建立通用 registry/plugin framework。
- A002 RED：`keeps the public release command...` 因 rehearsal 缺少 `.vercel` 与 local environment
  exclusion 精确失败，1 failed / 14 skipped。
- A002 GREEN：两条 isolated rehearsal 统一排除 `.env`、`.env.local`、`.env.*.local` 与 `.vercel`；
  focused suite 3/3 files、31/31 tests 再次通过。
- A003 RED：clean rehearsal 实际在 `typecheck` 因内部 package declarations 未生成失败；随后新增
  gate-order test 精确失败，1 failed / 14 skipped。
- A003 GREEN：仅把既有 `build` gate 前移到 `typecheck` 之前；focused 31/31、package、
  architecture、lint、format 与 patch replay 通过。

## Patch And Replay

- T142 product/tooling patch: 12 paths，58,482 bytes。
- SHA-256: `b409e10d8015765a8f840b9197500cc50d46a3a105a811e9efc3d0c40dd74f88`。
- Baseline: exact T141 reviewed product tree reconstructed from base commit、predecessor cumulative patch与T141 patch。
- Replay: forward apply、12-path byte comparison、reverse apply check与patch whitespace check均通过。
- Shared index: unstaged；无 stage/commit/push/tag/remote/publish action。

## Residual Risk

- Descriptor 中的 artifact size/hash仍是 T141 candidate baseline；T143 必须从 integrated isolated source fresh
  重建并原子确认或刷新 descriptor、workflow与manifest。
- npm availability、Trusted Publisher、GitHub environment、remote freshness与tag状态未查询，均为
  `Not_Run_Not_Authorized`。
