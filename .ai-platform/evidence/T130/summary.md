# T130 本地公开发布准备交付摘要

- Status: Needs_Review
- Version: 1.0.0
- Runtime: Node 22.20.0 / pnpm 11.1.3
- Scope: browser determinism、production audit、public source preflight、stage-only workflow、
  canonical docs 与发布证据
- Remote boundary: 未执行 stage、commit、push、PR、merge、tag、GitHub Release、deploy、DNS 或
  `npm publish`

## Outcome

T130 的 `RELEASE-SC-001` 至 `RELEASE-SC-006` 全部满足，未解决 Critical / High / Medium finding 为
`0 / 0 / 0`。本地 1.0.0 候选已具备进入用户验收的条件，任务按目标级交付合同保持 `Needs_Review`。
G005 仍因 clean commit、独立远程授权、npm package bootstrap、stage-only trust、2FA approval、
公开仓库与生产托管条件保持 `Blocked`。

## Delivered Controls

- quickstart 以 authoritative scene geometry 和新鲜 feedback transition 验证锁定项，不依赖 stale
  DOM 状态、retry 或放宽断言。
- Playwright 默认使用 2 workers；成功测试不持续录制 trace/video，失败诊断继续保留。previous-browser
  与 framework runner 共享可移植的有界进程树清理，POSIX 覆盖整个 process group，Windows 使用
  `taskkill /T` 并在失败或超时后使用 `/F`。
- 性能采样在每次布防前等待 canvas 连续四个 animation frame 稳定，并要求 exact key、目标 revision、
  目标 root prefix 和新像素同时成立；8-frame 未完成动画负向回归阻断前序帧串扰。
- production audit 固定官方 npm Registry、production dependencies 和 `--audit-level=info`，Registry
  错误或任意 severity vulnerability 均失败关闭。
- public source preflight 拒绝 dirty/non-main/unpushed source、非官方 registry、缺失 artifact、
  lightweight/stale tag 与远端漂移；远端查询使用仓库外隔离 Git 配置和 canonical HTTPS URL。
- `publish-npm.yml` 把无 OIDC 的完整 verify 与受 `npm-production` environment 保护的最小 OIDC stage
  分离。stage job 只以 `--ignore-scripts` 安装精确 npm CLI，不安装项目 dependencies、不 build 或运行
  仓库脚本；四个固定 tarball 按 `core -> editor -> react -> vue` 执行 `npm stage publish`。工作流没有
  `npm publish`。
- 所有第三方 GitHub Actions 固定到完整 Node 24 runtime commit SHA；所有 `setup-node` 步骤显式关闭
  自动 package-manager cache。

## Final Aggregate

`mise exec node@22.20.0 -- pnpm release:check` 完整通过并输出
`TellPlot 1.0.0 stable release checks passed.`：

- 14 个 AntV package / 17 个精确 artifact / 48 个 installed manifest；
- 50 个 source file / 195 条 import edge / 0 runtime cycle / 4 个 public entry；
- 4 packages / 25 public files / 19 Markdown files / 440 audited files；
- 54 files / 449 unit tests，coverage threshold 全部通过；
- 四包 publint、ATTW、ESM、CJS、types、tarball allowlist、size 与 SHA-256；macOS 与隔离 Linux
  重建逐字节一致；
- imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27 framework matrix；
- performance 3/3，waterfall p95 51.3ms、categorical p95 45.1ms，预算 150ms，
  same-target React root commit delta 0；
- current browser 186/186、a11y 45/45、previous browser 186/186、WebKit 18.4 62/62；
- 353-file isolated-source rehearsal。

## Package Evidence

| Package | Size | SHA-256 |
| --- | ---: | --- |
| `@tellplot/core` | 216937 bytes | `4cfa4d35bc3b2806daeb041e24c06916cf497b489c4f41f6c427474eb2de7e7b` |
| `@tellplot/editor` | 261820 bytes | `3f37a90d566d956d8d0a2d30978b17a0f2b5dd4dd2d2ea26626ac50130bb06a2` |
| `@tellplot/react` | 6481 bytes | `c8d84a0a825883167e056f82f1918adcf80c858b022c7d65651fdcaa18395242` |
| `@tellplot/vue` | 6127 bytes | `a149c504084ea1af7d003e8c3a3374e30660a29afb8159ee68d3d158c5aa8811` |

## Source Evidence

`diff.patch` 是 T129 已验收框架无关候选之上的 T130 task-only patch，排除全部历史与当前 evidence。

- Patch: 28 file headers / 3,531 insertions / 215 deletions / 189,149 bytes。
- SHA-256: `57ed6ce14abf004b6165aef61dd164c1cb8e12ae904ded30e9b543ea2dedc7fd`。
- 在由仓库 HEAD 和 T129 immutable patch 重建的 accepted baseline 上，
  `git apply --check --cached .ai-platform/evidence/T130/diff.patch` 通过。

## Residual External Gates

- 当前候选仍是本地 dirty/uncommitted worktree；必须从用户批准的 clean commit 重新执行 fresh-clone CI、
  官方 Registry audit 和完整 release gate。
- `windows-2025` lifecycle job 已由动态 fixture 和 workflow contract 覆盖，但尚未获得远程
  GitHub-hosted runner 执行证据。
- 四个 npm package root 尚未 bootstrap，stage-only Trusted Publisher、2FA approval 和 staged queue
  复核尚未配置或执行。
- 远端 `v1.0.0` 仍指向旧候选；公开仓库、GitHub Release、生产网站、DNS 与 public install smoke
  均需独立授权和证据。

这些条件不属于 T130 可在本地关闭的缺陷，也不构成任何公开发布授权。
