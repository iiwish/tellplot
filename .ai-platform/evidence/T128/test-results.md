# T128 Test Results

## Passed

- `pnpm --filter @tellplot/playground test`
- `pnpm build`
- `pnpm test:package`
  - `@tellplot/core`、`@tellplot/editor`、`@tellplot/react`、`@tellplot/vue` 的 publint、ATTW、ESM、CJS、
    types 与 tarball contract 全部通过
- `pnpm test:framework-matrix`
  - React 18.3.1、React 19.2.7 和 Vue 3.5.27 隔离 tarball consumer 的类型、生产构建、G2 canvas 与卸载通过
- `pnpm release:audit`
  - 4 packages、25 public files、19 Markdown files 全部通过
- `git diff --check`

## TDD Record

- RED: playground 和 package consumer 仍引用旧 editor React 入口，发布脚本只识别单包。
- GREEN: 站点迁移到 `@tellplot/react`，增加四包消费与三框架矩阵，同步公共文档。
- REFACTOR: 将四包元数据、公开文件和 tarball 规则收敛到同一组 release scripts。
