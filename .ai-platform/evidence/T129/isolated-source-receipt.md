# T129 Isolated Source Rehearsal Receipt

## Final Run

- Result: `passed`
- Version: `1.0.0`
- Runtime: Node 22.20.0 / pnpm 11.1.3
- Isolated root: `<temporary-directory>/tellplot-1.0.0-rehearsal-*`
- Source files copied: 336
- Excluded: `.git`、node_modules、dist、coverage、Playwright output、test-results 和 evidence

## Gates

1. `pnpm security:lock`
2. `pnpm install --frozen-lockfile`
3. `pnpm security:dependencies`
4. `pnpm release:architecture`
5. `pnpm release:audit`
6. `pnpm typecheck`
7. `pnpm test:unit`
8. `pnpm build`
9. `pnpm test:package`
10. `pnpm test:framework-matrix`

隔离副本在不读取工作树 `dist` 或 evidence 的条件下完成 frozen install，并通过：

- 14 个 AntV package / 17 个精确 artifact / 48 个 installed manifest 供应链门禁；
- 49 source files / 193 import edges / 0 runtime cycles 架构检查；
- 4 packages / 25 public files / 19 Markdown files / 311 copied files 发布审计；
- core/editor/react/vue/playground typecheck 与四包/playground production build；
- 53 files / 439 unit tests；
- 四包 publint、ATTW、ESM、CJS、types 与 package-specific consumer contract；
- imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27 的受控 move/undo、ViewSpec、CommandEvent、
  SVG、真实 G2 canvas、响应式宿主和 clean unmount 等价验证。

四宿主每次 update 均使用克隆 SourceData；React/imperative 回传克隆候选，Vue 使用普通 `ref` 覆盖
reactive Proxy 回传路径。隔离 package test 使用临时 npm cache，不依赖用户主目录 cache 可写性。

## Boundary

该 receipt 证明本地 G006 源码候选可从隔离副本复建，不是公开发布证明。G005 必须从用户批准的干净
commit 在 CI/发布环境重跑同一门禁，并另行取得 push、tag、GitHub Release、网站部署和 npm publish 授权。
