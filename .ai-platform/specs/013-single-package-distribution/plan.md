# G007 单包分发与公开发布 Plan

## Metadata

- Feature ID: `013-single-package-distribution`
- Goal ID: `G007`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-01
- Approval: 用户已批准单包公共分发与后续发布执行

## Delivery Strategy

1. 先用 package contract 测试固定一个公共包、五个子路径、optional framework peers 和私有内部 layers。
2. 建立 `packages/tellplot` 聚合构建入口，并保持 workspace source dependency graph 可审计、无环。
3. 批量迁移 playground、公共文档、consumer fixtures、release scripts 与 workflow。
4. 生成唯一可复现 tarball，执行 package/framework/browser/security/isolated-source 完整质量门禁。
5. 清理旧四包 staged candidates，bootstrap `tellplot`，配置 stage-only Trusted Publisher 和 package 2FA。
6. 提交并推送最终 clean main，受控重建并保护 annotated `v1.0.0`，从 exact tag 执行 staged publish。
7. 下载 staged artifact 复核 hash、metadata 与 provenance；经人类 2FA approval 后验证公开 fresh install。

## Architecture Boundary

```text
private workspace layers
  @tellplot/core -> @tellplot/editor -> @tellplot/react
                                  \-> @tellplot/vue

public distribution
  tellplot
    |- . / core
    |- react
    |- vue
    \- styles.css
```

构建可以内联私有 workspace layer，但根入口的静态运行时图不得加载 React 或 Vue。G2 和 G SVG 作为公共包
直接依赖，由 package manager 保证单一安装合同。

## Risk Controls

- 不通过 re-export 私有 workspace package specifier 暴露不可安装依赖。
- 使用 publint、ATTW、Node ESM/CJS、NodeNext TS 与 strict peer consumer 验证真实 tarball。
- artifact manifest、workflow SHA、staged download SHA 三者必须一致。
- 旧 scoped stage 在新 workflow 前拒绝，避免维护者误批历史候选。
- tag 更新使用 expected-old-object lease；main、annotated tag peeled commit 与 workflow head 必须相同。
- staging 和公开 approval 分离；任一未知状态失败关闭。

## Validation

- `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test:coverage`、`pnpm build`。
- `pnpm release:architecture`、`pnpm release:audit`、`pnpm test:package`、`pnpm test:framework-matrix`。
- `pnpm test:e2e`、`pnpm test:a11y`、`pnpm test:performance`、`pnpm test:browser-previous`。
- `pnpm security:lock`、`pnpm security:dependencies`、`pnpm audit:prod`、`pnpm release:rehearse`。
- `pnpm release:artifact`、strict artifact validator、`git diff --check`。
