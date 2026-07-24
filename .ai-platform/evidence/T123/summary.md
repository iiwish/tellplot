# T123 / G004 1.0.0 稳定版候选交付摘要

## Metadata

- Goal: `G004`
- Task: `T123`
- Packet: `EP-G004-T123-A001`
- Status: `Needs_Review`
- Date: 2026-07-24
- Branch: `codex/t112-categorical-data-contract`

## Outcome

`@tellplot/editor@1.0.0` 本地稳定版候选已经完成。当前包继续提供 waterfall、bar 和 column 三个图表
家族，以 `ChartEditor + ChartConfig` 作为普通接入入口，以独立 `ViewSpec` 保存高级编辑状态。G004
没有增加图表、依赖、schema、命令或第二套运行时。

稳定版工作补齐 1.x 兼容与弃用政策、公开维护资料、结构化架构检查、完整发布门禁、隔离源码复演和
兼容矩阵。生成的本地 tarball 只包含 13 个允许文件；npm、GitHub Release 和生产网站均未发布。

## Delivered

- package、网站、README、CHANGELOG、测试和文档统一为 `1.0.0` 稳定身份。
- runtime export 精确锁定为 `ChartEditor`、`validateChartConfig` 和九个既有 domain/session API。
- 新增 SemVer、1.x compatibility、deprecation、React/G2/Node/browser 和 schema 支持政策。
- 新增 CONTRIBUTING、SECURITY、CODE_OF_CONDUCT、SUPPORT、Issue 和 PR templates。
- 新增 TypeScript AST import graph、依赖方向、G2 import、公共入口和 runtime cycle 门禁。
- 发布审计覆盖公开文件、Markdown link、secret/private key、个人/临时绝对路径、版本、
  runtime export 和 `.ai-platform` 交付记录。
- `release:check` 聚合全部稳定版阻断项，`release:rehearse` 从隔离源码验证 frozen install 到 tarball。
- 新增 source aliases，保证隔离源码在没有预生成 `dist` 时也能运行 playground unit tests。
- 把复杂命令一致性 E2E 改为读取实时同步的公开 ViewSpec 文件；下载能力继续由独立 export E2E 覆盖。
- 当前与旧版浏览器矩阵使用双 worker，避免 WebKit 长队列进程资源耗尽。
- package 固定 public access 和 npm 官方 registry，避免开发机全局 registry 污染发布目标。
- 来源分组拖拽使用 G2 scene bounds 区分区域内排序与跨边界退出；首成员柱 click 保留分组动作，
  达到拖拽阈值后才隐藏。公共 API、schema 和命令合同保持不变。

## TDD Receipt

- RELEASE REVIEW RED：package contract 2/4 失败，锁定官方 registry 和完整聚合门禁；发布审计扩展后
  暴露 43 个含个人/临时路径的文件。
- GREEN：package contract 4/4，release audit 306 files，Node 22.20.0 下完整
  `pnpm release:check` 通过。
- REGRESSION：unit 453/453、current 180/180、previous 180/180、WebKit 18.4 60/60、a11y 45/45；
  200-item waterfall/categorical p95 为 69.6ms / 96.3ms，预算 150ms。
- REHEARSAL：隔离 285 个源码文件完成 frozen install、architecture、audit、typecheck、453 unit、
  build 与 package。

## Package Evidence

- Tarball: [tellplot-editor-1.0.0.tgz](artifacts/tellplot-editor-1.0.0.tgz)
- Manifest: [tarball-manifest.json](tarball-manifest.json)
- Size: 486233 bytes
- SHA-256: `cdc9ec9469a41e549c99a60bf73261aff8c133838cfe7e982108f94b84b6abc7`
- Contents: 10 个 dist 文件、LICENSE、package.json 和 README，共 13 个文件。

## Source Evidence

- 1.0 candidate commits: `bf8f007`、`90af6f2`、`42c0342`
- Task patch: [diff.patch](diff.patch)
- `diff.patch` 保留 G004 初始稳定化范围；后续发布门禁与分组交互 correction 由上述本地 commits
  和当前 evidence 记录。
- patch 与审计排除 `.git`、node_modules、dist、coverage、Playwright output 和测试运行产物。

## Delivery Boundary

lockfile 与依赖集合保持不变；editor package 固定 1.0.0、public access 和 npm 官方 registry。
没有修改 domain、schema、commands、projection、G2 runtime 或 export implementation。交互 correction
只在既有 chart pointer/session 与 move target 合同内完成。
没有执行 push、PR、merge、visibility、deploy、DNS、tag、GitHub Release 或 npm publish。

G004 / T123 进入 `Needs_Review`。公开发布仍属于 G005，必须在目标验收后逐类取得远程授权。
