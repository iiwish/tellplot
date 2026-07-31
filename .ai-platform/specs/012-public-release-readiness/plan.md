# G005 本地发布准备修复 Plan

## Metadata

- Feature ID: `012-public-release-readiness`
- Goal ID: `G005`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-07-31
- Approval: 用户明确要求修复发布复核 findings；远程动作继续未授权

## Delivery Strategy

1. 复现 quickstart feedback 与浏览器进程耗尽失败，使用 authoritative state 修复同步和资源边界。
2. 为官方 npm production audit、公开发布来源预检和 workflow contract 先补 RED tests。
3. 保留现有 `release:check` 作为 dirty local candidate 验证，新增只面向公开发布的严格 preflight。
4. 建立受 production environment 保护的 stage-only Trusted Publishing workflow；OIDC job 只以
   `--ignore-scripts` 安装固定版本 npm CLI，不安装项目 dependencies、不 build 或运行仓库脚本，
   本目标不触发 workflow。
5. 更新 canonical 文档并重跑完整本地发布矩阵。

## Release Boundary

```text
dirty working tree
  -> release:check                 # local candidate validation

clean main commit + user approval
  -> release:preflight             # public source validation
  -> separately authorized bootstrap package roots
  -> stage-only npm Trusted Publishers
  -> protected workflow            # four immutable staged packages
  -> human review + 2FA approval
  -> GitHub Release / npm / site
```

## Constitution Check

- P-003：不改变原始数据与确定性命令，满足。
- P-006：不改变 G2 ownership，满足。
- P-010：测试先行、真实浏览器和 release gate 阻断，满足。
- Git/发布边界：只修改本地源码和 workflow definition，不执行远程动作，满足。

## Risk Controls

- 不用 fixed sleep、retry 或 skip 修复 browser failure。
- browser/framework runner 在 POSIX 终止整个进程组，在 Windows 使用有界 `taskkill /T` 并在超时后
  `/F`；动态 fixture 必须证明 signal 退出、孙进程回收和临时目录清理。
- audit registry 在命令中显式指定，不读取开发机镜像配置。
- 只有 stage job 使用 `id-token: write`；它由 production environment 审批，不运行 pnpm、依赖生命周期、
  build 或仓库脚本。
- 无 OIDC 的 verify job 重新构建并校验 tarball；stage job 只接受固定 SHA-256 的四个不可变 artifact。
- Trusted Publisher 只允许 `npm stage publish`，不允许直接 `npm publish`；公开动作需要人类复核和 2FA。
- package root 缺失、1.0.0 已存在、remote annotated tag 漂移、registry 查询失败或人工确认缺失均失败
  关闭；remote query 从仓库外使用隔离 Git 配置和 canonical HTTPS URL。
- 任一完整门禁失败时保持 G005 `Blocked`。

## Validation

- Focused browser regression。
- 跨平台 process lifecycle 动态 fixture 与两个真实 runner 的受控中断 smoke。
- Release workflow/preflight contract tests。
- 当前四个 package root 的 bootstrap-required 负向门禁。
- Official npm production audit。
- Format、lint、typecheck、coverage、package/framework matrix。
- Current/previous browser、a11y、performance、artifact 与 isolated rehearsal。
- Strict artifact validator 与 `git diff --check`。
