# T123 / G004 1.0.0 稳定版候选交付摘要

## Metadata

- Goal: `G004`
- Task: `T123`
- Packet: `EP-G004-T123-A001`
- Status: `Needs_Review`
- Date: 2026-07-23
- Branch: `codex/t112-categorical-data-contract`

## Outcome

`@tellplot/editor@1.0.0` 本地稳定版候选已经完成。当前包继续提供 waterfall、bar 和 column 三个图表
家族，以 `ChartEditor + ChartConfig` 作为普通接入入口，以独立 `ViewSpec` 保存高级编辑状态。G004
没有增加图表、依赖、schema、命令或第二套运行时。

稳定版工作补齐 1.x 兼容与弃用政策、公开维护资料、结构化架构检查、发布审计、隔离源码复演和完整
兼容矩阵。生成的本地 tarball 只包含 13 个允许文件；npm、GitHub Release 和生产网站均未发布。

## Delivered

- package、网站、README、CHANGELOG、测试和文档统一为 `1.0.0` 稳定身份。
- runtime export 精确锁定为 `ChartEditor`、`validateChartConfig` 和九个既有 domain/session API。
- 新增 SemVer、1.x compatibility、deprecation、React/G2/Node/browser 和 schema 支持政策。
- 新增 CONTRIBUTING、SECURITY、CODE_OF_CONDUCT、SUPPORT、Issue 和 PR templates。
- 新增 TypeScript AST import graph、依赖方向、G2 import、公共入口和 runtime cycle 门禁。
- 新增公开文件、Markdown link、secret/private key、个人路径、版本和 runtime export 发布审计。
- 新增一条 `release:check` 稳定门禁和隔离源码 `release:rehearse`。
- 新增 source aliases，保证隔离源码在没有预生成 `dist` 时也能运行 playground unit tests。
- 把复杂命令一致性 E2E 改为读取实时同步的公开 ViewSpec 文件；下载能力继续由独立 export E2E 覆盖。

## TDD Receipt

- RED：`stable-release.test.ts` 3/3 失败，分别锁定 beta 版本、九个缺失公开文件和缺失 release scripts。
- GREEN：版本、维护文档和 release scripts 完成后，focused 3/3 与 package checks 通过。
- REHEARSAL：第一次隔离源码复演发现 playground unit 隐式依赖工作树 `dist`；第二次证明只有 root alias
  不会进入 inline project；补齐 root/project source aliases 后最终复演通过。
- REGRESSION：完整 Chromium 尾部的命令一致性测试被重复下载 UI 阻塞；移除重复职责后 focused 1/1、
  current 177/177、previous 177/177 与 WebKit 18.4 59/59 全部通过。

## Package Evidence

- Tarball: [tellplot-editor-1.0.0.tgz](artifacts/tellplot-editor-1.0.0.tgz)
- Manifest: [tarball-manifest.json](tarball-manifest.json)
- Size: 475886 bytes
- SHA-256: `ccc4b112015fe5184727d1346b8608d545e6205a87f271dae115c3e76985e437`
- Contents: 10 个 dist 文件、LICENSE、package.json 和 README，共 13 个文件。

## Diff Evidence

- Baseline: `/tmp/tellplot-G004-stable.PBkJ9I/worktree`
- Task-only patch: [diff.patch](diff.patch)
- Patch scope: 50 files；1394 insertions；102 deletions
- Patch SHA-256: `8e10d52bf729571209c6e2365d4e6d02d46940ee8adad8c1dffb01afc2c4ca00`
- Patch 排除 `.git`、node_modules、dist、coverage、Playwright output 和 evidence 自身。

## Delivery Boundary

lockfile 与依赖集合保持不变；editor package 除版本外的 manifest 保持不变。没有修改 domain、schema、
commands、projection、interactions、G2 runtime 或 export implementation。没有执行 stage、commit、
push、PR、merge、visibility、deploy、DNS、tag、GitHub Release 或 npm publish。

G004 / T123 进入 `Needs_Review`。公开发布仍属于 G005，必须在目标验收后逐类取得远程授权。
