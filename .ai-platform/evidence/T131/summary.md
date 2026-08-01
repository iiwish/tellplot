# T131 Evidence Summary

## Status

- Task: T131
- Goal: G007
- Status: Accepted
- Date: 2026-08-01

## Scope

`tellplot` 是唯一公共 npm package；根、core、React、Vue 与 CSS 通过 subpath exports 分发。core、editor、
React adapter 和 Vue adapter 继续作为私有 workspace layer，并由 architecture policy 独立约束。

## Current Evidence

- 单包 package contract 已先以 RED 测试固定，随后由 `packages/tellplot` 实现。
- playground、长期文档和全部 consumer fixture 已迁移到 `tellplot` 及其子路径。
- `publint`、ATTW、ESM、CJS、NodeNext types、CSS 与 pack contract 通过。
- imperative no-framework、React 18.3.1、React 19.2.7 和 Vue 3.5.27 从同一 tarball 完成 strict peer
  install、真实 G2 渲染、受控移动/撤销、SVG 导出和 clean unmount。
- architecture、release audit、supply-chain、production advisory、coverage、当前/上一浏览器、a11y、
  performance 与 376-file isolated-source rehearsal 通过。
- 隔离源码复演曾发现 playground source alias 依赖本机已构建 dist；补齐 TypeScript/Vite/Vitest source
  aliases 后复演通过，该回归由单包合同测试固定。
- release artifact 会规范化 tarball 内的 package manifest key order 和 gzip stream；在锁定的 Node
  22.20.0 runtime 下连续重建保持 485325 bytes 与同一 SHA-256。
- GitHub Actions run `30701441776` 从 exact `v1.0.0` tag 和提交
  `a3e07c9ac9b20183092729cde234322db98f9835` 完成 verify 与 stage job；`npm-production` environment
  审批记录对应 deployment `5705046643`。
- npm stage `187969a4-f39a-40e0-b602-8bccb975f9b2` 由 GitHub Actions 的 trusted automation 创建；下载件
  SHA-1 为 `662d0280de22a634c80471e6d16cca2a312cd829`，SHA-256 与本地 manifest 完全一致，经人类 2FA
  approval 后公开。
- npm `latest` 指向 `tellplot@1.0.0`，`bootstrap` 保留指向 `0.0.0-bootstrap.0`；pending stage queue 为空。
- SLSA provenance 固定 workflow `.github/workflows/publish-npm.yml`、ref `refs/tags/v1.0.0`、上述提交和
  GitHub-hosted runner；GitHub Release 为 `https://github.com/iiwish/tellplot/releases/tag/v1.0.0`。
- 官方 Registry 的 imperative no-framework、React 18.3.1、React 19.2.7 与 Vue 3.5.27 fresh consumer
  均通过 strict peer install、ESM/CJS import 和 Vite production build；无框架 consumer 未安装 React/Vue。
- 旧 `@tellplot/core`、`@tellplot/editor`、`@tellplot/react`、`@tellplot/vue` bootstrap versions 均已
  deprecate，并明确指向 `tellplot`。
