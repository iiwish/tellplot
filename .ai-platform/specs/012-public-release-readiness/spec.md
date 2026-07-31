# G005 本地发布准备修复 Spec

## Metadata

- Feature ID: `012-public-release-readiness`
- Goal ID: `G005`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-07-31
- Approval: 用户在收到 2026-07-30 发布复核 findings 后明确要求修复上述问题

## Objective

关闭阻止 TellPlot 1.0.0 进入公开发布执行阶段的本地缺口，同时继续保留远程动作人工闸门。完成后，
维护者可以从干净提交运行确定、可复核的发布前检查，并通过受保护的 stage-only Trusted Publishing
工作流提交未来已授权的 npm staged release。四包只有在人类完成内容复核与 2FA approval 后才会公开。

## Requirements

### RELEASE-FR-001 确定的浏览器门禁

完整 E2E 必须使用稳定语义和 authoritative ready 状态同步，不以增加固定等待、重试次数、跳过测试或
弱化断言掩盖失败。浏览器资源必须按可移植方式有界释放，完整矩阵应能连续重跑。

### RELEASE-FR-002 官方安全审计

公开发布检查必须显式查询 `https://registry.npmjs.org` 的 production advisory endpoint，不依赖开发机
默认 registry。查询失败和任何 vulnerability 均阻断公开发布。

### RELEASE-FR-003 发布来源预检

本地候选验证与公开发布预检保持分离。公开发布预检必须拒绝 dirty worktree、非 `main`、未推送 commit、
版本不一致、非官方 registry、缺失 artifact、lightweight/stale tag 或未通过质量门禁的来源。远端
main/tag 查询必须使用隔离 Git 配置的 canonical HTTPS URL，不得被 repo/global `url.*.insteadOf` 改写；
本地 dirty candidate 仍可运行 `release:check` 进行开发验证。

### RELEASE-FR-004 受保护的发布工作流

仓库应提供手工触发、production environment 审批、最小 GitHub permissions、npm stage-only Trusted
Publishing、provenance 和可追溯 artifact 的 staging 工作流。无 OIDC 的 verify job 必须先完成 source
preflight、完整质量检查与 artifact 校验；OIDC job 只能复核不可变 tarball 与外部状态，再按
`core -> editor -> react -> vue` 顺序执行 `npm stage publish`。除使用 `--ignore-scripts` 安装固定版本
npm CLI 外，OIDC job 不得安装项目 dependencies、build 或运行仓库脚本。工作流不得直接执行
`npm publish`，不得在任何包已存在或前置条件不满足时继续，也不得让部分成功的 stage 自动公开。

### RELEASE-FR-005 Canonical 文档

roadmap、release report 与任务状态必须一致描述 G006 已验收、G005 尚未公开发布，以及实际完成的在线
安全审计。不得把本地候选描述为 npm、GitHub 或生产网站版本。

## Non-Functional Requirements

- RELEASE-NFR-001：不新增 runtime dependency，不改变公共 API、schema、命令、图表或编辑行为。
- RELEASE-NFR-002：不得写入或输出 npm token、GitHub token、业务数据或本机个人路径。
- RELEASE-NFR-003：不得执行 stage、commit、push、仓库公开、DNS、deploy、tag、GitHub Release 或
  `npm publish`。
- RELEASE-NFR-004：发布脚本失败必须非零退出并给出稳定、无 secret 的诊断。

## Success Criteria

- RELEASE-SC-001：浏览器 focused regression 与完整 `release:check` 通过。
- RELEASE-SC-002：官方 production audit 返回 0 vulnerability，默认 registry 不影响结果。
- RELEASE-SC-003：当前 dirty worktree 被 public-release preflight 明确拒绝；隔离干净 annotated-tag
  fixture 通过，lightweight tag 与 hostile URL rewrite fixture 被拒绝或隔离。
- RELEASE-SC-004：workflow contract tests 证明 environment approval、最小 OIDC、stage-only trust、
  provenance、质量门禁、不可变 tarball 与包顺序。
- RELEASE-SC-005：canonical docs 无 G006 `Needs Review` 或过期 audit 声明。
- RELEASE-SC-006：无 unresolved Critical、High 或 Medium finding。

## Non-Goals

- 实际提交、推送或公开 GitHub 仓库。
- 配置 npm scope、bootstrap package root、Trusted Publisher、GitHub environment reviewer 或生产托管账号。
- 部署网站、设置 DNS、创建 tag/GitHub Release、执行 `npm stage publish`、2FA approval 或发布 npm 包。
- 新图表、公共 API、schema、依赖或产品范围。
