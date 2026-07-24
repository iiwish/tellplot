# T123 隔离源码复演回执

## Final Run

- Result: `passed`
- Version: `1.0.0`
- Runtime: Node 22.20.0 / pnpm 11.1.3
- Isolated root: `<temporary-directory>/tellplot-1.0.0-rehearsal-*`
- Source files copied: 285
- Excluded: `.git`、node_modules、dist、coverage、Playwright output、test-results 和 evidence

## Gates

1. `pnpm install --frozen-lockfile`
2. `pnpm release:architecture`
3. `pnpm release:audit`
4. `pnpm typecheck`
5. `pnpm test:unit`
6. `pnpm build`
7. `pnpm test:package`

最终结果为 architecture 48 files / 245 edges / 0 cycles，isolated release audit 191 files，
unit 52 files / 453 tests，package
`@tellplot/editor@1.0.0` 的 publint、ATTW、ESM、CJS、types 和 tarball contract 全部通过。

## Finding Closed During Rehearsal

第一次隔离复演发现 playground unit 会通过 workspace package entry 读取工作树中已有的 `dist`，因此
干净源码没有 `dist` 时失败。只在 root Vitest 配置增加 alias 的第二次复演仍失败，因为 inline
playground project 不继承该 alias。

最终在 root 和 playground unit project 同时把 `@tellplot/editor` 与 styles 指向源码。第三次和最终
复演均从无 `dist` 的隔离副本通过。这关闭了一个真实的 clean-source 可复现性缺陷，而没有改变运行时
package resolution。

## Boundary

隔离副本来自本地 1.0 候选源码，不是公开发布来源。G005 仍要求从用户批准的干净 commit 重新执行同一
复演，并在独立授权后才允许 push、tag、GitHub Release、网站部署或 npm publish。
