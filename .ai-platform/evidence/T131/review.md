# T131 Review

## Status

- Status: Accepted
- Unresolved Critical: 0
- Unresolved High: 0
- Unresolved Medium: 0

## Review Focus

- 根入口不能静态加载 React 或 Vue。
- bundle 不得包含无法从 npm 解析的私有 workspace specifier。
- public exports、types、CSS 和 optional peers 必须在真实 tarball consumer 中验证。
- release scripts 与 workflow 只能处理一个不可变 tarball。
- 旧 scoped bootstrap/staging 状态不得被误认为新的稳定发布候选。

## Findings Closed

- 隔离源码中 playground TypeScript/Vitest 无法解析未构建 private layer：通过显式 source aliases 修复，
  `release:rehearse` 在 376-file fresh source 中通过。
- stable release contract 不应依赖 rehearsal 排除的 evidence 文件：改为从 workflow 提取固定 SHA，并与
  canonical release report 交叉验证。
- npm package README 的相对仓库链接在 Registry 页面不可用：改为 GitHub canonical links，并刷新 artifact。
- `pnpm pack` 的 workspace manifest 重写顺序与流式 gzip 分块会造成相同内容的 tarball SHA 漂移：发布脚本
  固定 package manifest key order、完整重压缩并以差异顺序/压缩级别测试锁定；连续重建通过。
- E2E 接入文档断言仍引用旧 scoped package：迁移为 `pnpm add tellplot` 与
  `import 'tellplot/styles.css'`，当前及上一浏览器矩阵通过。

## Final Verdict

spec compliance、bug/code quality、package artifact、QA、托管 workflow、stage download、2FA approval、
Registry fresh install、SLSA provenance 与 GitHub Release 全部通过；无未解决 Critical、High 或 Medium
finding。`tellplot@1.0.0`、受保护 tag、workflow head、公开 tarball 和 provenance 指向同一发布提交，T131
满足 Definition of Done 并验收为 `Accepted`。
