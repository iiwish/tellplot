# T123 稳定版验证结果

## Metadata

- Date: 2026-07-24
- Release runtime: Node 22.20.0 / pnpm 11.1.3
- Result: Passed

## Stable Gates

| Command / Gate | Result |
| --- | --- |
| `pnpm release:architecture` | 48 source files；246 import edges；0 runtime cycles |
| `pnpm release:audit` | clean clone：version 1.0.0；11 runtime exports；19 public files；282 audited files |
| `pnpm release:check` | 全部稳定版阻断门禁 passed |
| `pnpm release:rehearse` | isolated 287 source files；frozen install 到 package 全部 passed |
| `pnpm format:check` | passed |
| `pnpm lint` | passed，0 warning |
| `pnpm typecheck` | editor 与 playground passed |
| `pnpm test:unit` | 53 files；459/459 passed |
| `pnpm test:coverage` | 459/459；statements 87.08%；branches 81.68%；functions 89.97%；lines 87.19% |
| constrained domain/chart/G2 coverage | all >=95% |
| `pnpm build` | passed；G2 保持按需加载，最大 JS chunk 472.56 kB，无 chunk-size warning |
| `pnpm test:package` | publint、ATTW、ESM、CJS、types、quickstart、tarball contract passed |
| `pnpm test:react-matrix` | React 18.3.1 / 19.2.7；87405 / 87405 painted pixels；clean unmount；fixture build 无 chunk warning |
| `pnpm test:e2e` | current Chromium/Firefox/WebKit 183/183 passed |
| `pnpm test:a11y` | 45/45 passed |
| `pnpm test:performance` | waterfall 与 categorical p95 均通过 150ms budget |
| previous Playwright release | Chromium 148、Firefox 150.0.2、WebKit 26.4；183/183 passed |
| WebKit previous major | WebKit 18.4；61/61 passed |
| `pnpm audit --prod --registry=https://registry.npmjs.org/` | no known vulnerabilities |
| strict artifact validator | feature/task strict 与 root validator passed |
| `git diff --check` | passed |

## TDD And Regression Detail

- 本轮 `stable-release.test.ts` RED 2/4，锁定 npm registry 和完整聚合门禁；实现后 4/4 通过。
- tarball provenance 门禁在旧 evidence 上准确报告 manifest size、SHA-256 和存档内容三项不一致；
  刷新候选后，门禁可重建当前 package 并逐项验证 manifest 与存档。
- Playground 生产构建测试 RED 记录最大 JS chunk 为 1032082 bytes；Vite 8 Rolldown
  `g2-runtime` 分组后最大 chunk 为 472.56 kB，主构建与 React 18/19 consumer 构建均无 warning。
- 单 worker WebKit 在完整矩阵第 44 个用例出现进程资源耗尽；focused WebKit 12/12 和双 worker
  完整矩阵 183/183 证明问题属于浏览器长队列隔离。当前与旧版矩阵固定双 worker，且保留
  `TELLPLOT_E2E_WORKERS` 环境覆盖。
- 发布审计扩展到 `.ai-platform` 后首次发现 43 个含个人或临时绝对路径的交付文件；全部规范化为
  可移植占位符后，clean clone 中 282 个文件通过审计。
- Node 24 启动的完整门禁在 previous-browser 阶段按设计拒绝；Node 22.20.0 下整套
  `pnpm release:check` 通过。
- 最终 isolated source 运行 53 个 unit 文件和 459 个测试，不读取工作树预生成 `dist`。

## Artifact And Package Checks

- `tarball-manifest.json` 只包含 13 个 allowlist 文件。
- `pnpm release:artifact` 每次从当前源码构建并 pack 到临时目录，逐项比对 evidence tarball、
  package identity、文件清单、size 与 SHA-256。
- artifact 校验固定使用 `.nvmrc` 的 Node 22.20.0；其他 Node 版本会在构建前明确拒绝，避免
  source map 工具链差异被误报为候选源码漂移。
- tarball 的 publint、ATTW、ESM、CJS 和 TypeScript consumer 均通过。
- clean clone release audit 扫描 282 个源码、公开文件与交付记录；隔离副本扫描 193 个，均未发现阻断项。
- `.copyright-application` 与 `tmp` 由 Git、Prettier 和 rehearsal exclude 同时保护，未进入 commit、
  tarball 或隔离副本。
- TypeScript AST architecture audit 未发现越层依赖、非法 G2 import、公共入口泄漏或 runtime cycle。

## Post-Candidate Additive Label Verification

用户批准的对象式标签配置、分组边界退出/click-drag correction 与实时分组背景预览均保持公共合同
向后兼容，并已纳入上述 459 个 unit、当前/旧版浏览器、a11y、performance、package 与隔离源码门禁。
未执行 publish、tag、GitHub Release 或部署。
