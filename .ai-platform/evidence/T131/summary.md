# T131 Evidence Summary

## Status

- Task: T131
- Goal: G007
- Status: In_Progress
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
- 远程 staging 与公开 registry evidence 待完成后补齐。
