# T130 测试结果

## Final Aggregate Gate

- Runtime: Node 22.20.0 / pnpm 11.1.3
- Command: `mise exec node@22.20.0 -- pnpm release:check`
- Result: `passed` on 2026-07-31
- Final signal: `TellPlot 1.0.0 stable release checks passed.`
- Retry: 0

## TDD Receipts

- Production audit contract RED：focused stable-release test 要求 `--audit-level=info` 时，旧实现仍为
  `--audit-level=low`，测试按预期失败。GREEN：脚本改为 info 后 focused contract 通过，官方 Registry
  返回 `No known vulnerabilities found`。
- Performance attribution contract RED：focused stable-release test 在缺少 `waitForStableCanvas`、
  target-state attribution 和 unfinished-animation regression 时按预期失败。GREEN：合同通过，真实
  Chromium 8-frame 负向回归通过。
- Windows lifecycle contract RED：CI workflow 缺少 lifecycle matrix 时，stable-release contract
  对 security/install gate 数量与 job dependency 的断言按预期失败。GREEN：Ubuntu 24.04 /
  Windows 2025 matrix、动态 process-tree fixture 和 browser dependency contract 全部通过。
- Tarball reproducibility contract RED：macOS 与 Linux 对同一 npm pack 生成不同 gzip OS header，且
  `core` / `editor` 候选未包含当前源码时，发布门禁按预期失败。GREEN：gzip header 规范化回归、当前
  源码制品刷新及隔离 Linux 重建全部得到相同 SHA-256。

## Focused Verification

- `packages/editor/tests/package/stable-release.test.ts`：14/14。
- `packages/editor/tests/package/process-lifecycle.test.ts`：2/2；动态 leader/grandchild fixture 证明
  signal forwarding、POSIX group escalation、Windows `taskkill /T` -> `/F` 合同和临时目录清理。
- 真实 previous-browser runner 受控 SIGTERM：exit 143，process reference 0，owned temp root 已删除。
- 真实 framework-matrix runner 受控 SIGTERM：exit 143，process reference 0，owned temp root 已删除。
- performance focused：3/3；unfinished-animation regression、waterfall 与 categorical 全部通过。
- actionlint、targeted ESLint、TypeScript、Prettier、Node syntax check 与 `git diff --check`：通过。

## Aggregate Results

- `pnpm security:lock`：14 package / 17 artifact 的精确 version、tarball URL 与 SHA-512 integrity 通过。
- `pnpm security:dependencies`：48 个 installed manifest 与 lockfile allowlist 一致。
- `pnpm audit:prod`：官方 Registry、production-only、info threshold；0 known vulnerability。
- `pnpm release:architecture`：50 source files / 195 import edges / 0 runtime cycles / 4 public entries。
- `pnpm release:audit`：4 packages / 25 public files / 19 Markdown files / 440 audited files。
- format、lint、core/editor/react/vue/playground typecheck：通过。
- `pnpm test:coverage`：54 files / 449 tests；statements 88.44%、branches 80.65%、functions 89.40%、
  lines 88.52%，全部 threshold 通过。
- `pnpm build`：四包与 playground production build 通过；最大 JS chunk 448.82 kB，低于 500 kB 门禁。
- `pnpm release:artifact`：四个 1.0.0 tarball 的文件 allowlist、size 与 SHA-256 同源校验通过；
  Node 22.20.0 / pnpm 11.1.3 的隔离 Linux 重建与 macOS 候选逐字节一致。
- `pnpm test:package`：四包 publint、ATTW、ESM/CJS/types 与 consumer contract 通过。
- `pnpm test:framework-matrix`：imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27 通过
  strict-peer fresh install、受控 move/undo、SVG 与 clean unmount。
- `pnpm test:performance`：3/3；waterfall p95 51.3ms、categorical p95 45.1ms，预算 150ms，
  same-target React root commit delta 0。
- `pnpm test:e2e`：Chromium、Firefox、WebKit 共 186/186。
- `pnpm test:a11y`：45/45，无 serious 或 critical axe violation。
- `pnpm test:browser-previous`：Playwright previous release 186/186；WebKit 18.4 62/62。
- `pnpm release:rehearse`：353-file isolated source 通过 frozen install、供应链、architecture、audit、
  typecheck、449 unit、build、四包 package 与 framework matrix。

## Expected Fail-Closed Gates

- `pnpm release:preflight`：exit 1。当前 dirty worktree、旧/缺失远端 release tag parity、HEAD 与
  `origin/main` 不一致、npm 版本和默认 registry 不满足公开发布合同，均被明确拒绝。
- `pnpm release:trust-readiness`：exit 1。人工 stage-only confirmation 缺失，四个 package root 均
  E404/bootstrap-required，未进入 staging。

以上两个非零结果是当前未获远程授权环境的预期安全结果，不是本地 aggregate failure。

## Final Validation

- Strict artifact validator：exit 0，`ok: delivery artifacts passed lightweight validation`。
- `git apply --check --cached`：在由仓库 HEAD 与 T129 immutable patch 重建的 accepted baseline 上
  exit 0；当前候选上的 `git apply --reverse --check .ai-platform/evidence/T130/diff.patch` 也为 exit 0。
- `git diff --check`：exit 0。
- 最终 focused contract：2 files / 15 tests 通过；全仓 Prettier check 通过。
- 独立 review 覆盖 spec、browser/process lifecycle、performance attribution、供应链、public source、
  workflow 和 canonical docs；最终未解决 Critical / High / Medium finding 为 `0 / 0 / 0`。
