# T123 稳定版验证结果

## Metadata

- Date: 2026-07-24
- Release runtime: Node 22.20.0 / pnpm 11.1.3
- Result: Passed

## Stable Gates

| Command / Gate | Result |
| --- | --- |
| `pnpm release:architecture` | 48 source files；245 import edges；0 runtime cycles |
| `pnpm release:audit` | version 1.0.0；11 runtime exports；19 public files；306 audited files |
| `pnpm release:check` | 全部稳定版阻断门禁 passed |
| `pnpm release:rehearse` | isolated 285 source files；frozen install 到 package 全部 passed |
| `pnpm format:check` | passed |
| `pnpm lint` | passed，0 warning |
| `pnpm typecheck` | editor 与 playground passed |
| `pnpm test:unit` | 52 files；453/453 passed |
| `pnpm test:coverage` | 453/453；statements 86.98%；branches 81.90%；functions 90.05%；lines 87.10% |
| constrained domain/chart/G2 coverage | all >=95% |
| `pnpm build` | passed；仅保留既有 G2 chunk-size warning |
| `pnpm test:package` | publint、ATTW、ESM、CJS、types、quickstart、tarball contract passed |
| `pnpm test:react-matrix` | React 18.3.1 / 19.2.7；各 87405 painted pixels；clean unmount |
| `pnpm test:e2e` | current Chromium/Firefox/WebKit 180/180 passed |
| `pnpm test:a11y` | 45/45 passed |
| `pnpm test:performance` | waterfall p95 69.6ms；categorical p95 96.3ms；budget 150ms |
| previous Playwright release | Chromium 148、Firefox 150.0.2、WebKit 26.4；180/180 passed |
| WebKit previous major | WebKit 18.4；60/60 passed |
| `pnpm audit --prod --registry=https://registry.npmjs.org/` | no known vulnerabilities |
| strict artifact validator | feature/task strict 与 root validator passed |
| `git diff --check` | passed |

## TDD And Regression Detail

- 本轮 `stable-release.test.ts` RED 2/4，锁定 npm registry 和完整聚合门禁；实现后 4/4 通过。
- 单 worker WebKit 在完整矩阵第 44 个用例出现进程资源耗尽；focused WebKit 12/12 和双 worker
  完整矩阵 180/180 证明问题属于浏览器长队列隔离。当前与旧版矩阵固定双 worker，且保留
  `TELLPLOT_E2E_WORKERS` 环境覆盖。
- 发布审计扩展到 `.ai-platform` 后首次发现 43 个含个人或临时绝对路径的交付文件；全部规范化为
  可移植占位符后，306 个文件通过审计。
- Node 24 启动的完整门禁在 previous-browser 阶段按设计拒绝；Node 22.20.0 下整套
  `pnpm release:check` 通过。
- 最终 isolated source 运行 52 个 unit 文件和 453 个测试，不读取工作树预生成 `dist`。

## Artifact And Package Checks

- `tarball-manifest.json` 只包含 13 个 allowlist 文件。
- tarball 的 publint、ATTW、ESM、CJS 和 TypeScript consumer 均通过。
- 当前源码 release audit 扫描 306 个源码、公开文件与交付记录；隔离副本扫描 191 个，均未发现阻断项。
- TypeScript AST architecture audit 未发现越层依赖、非法 G2 import、公共入口泄漏或 runtime cycle。

## Post-Candidate Additive Label Verification

用户批准的对象式标签配置与分组边界退出/click-drag correction 均保持公共合同向后兼容，并已纳入
上述 453 个 unit、当前/旧版浏览器、a11y、performance、package 与隔离源码门禁。未执行 publish、
tag、GitHub Release 或部署。
