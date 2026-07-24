# T123 稳定版验证结果

## Metadata

- Date: 2026-07-23
- Primary runtime: Node 24.15.0 / pnpm 11.1.3
- Previous-browser runtime: Node 22.20.0
- Result: Passed

## Stable Gates

| Command / Gate | Result |
| --- | --- |
| `pnpm release:architecture` | 47 source files；240 import edges；0 runtime cycles |
| `pnpm release:audit` | version 1.0.0；11 runtime exports；19 public files；16 Markdown files |
| `pnpm release:check` | architecture、audit、format、lint、typecheck、unit、build、package passed |
| `pnpm release:rehearse` | isolated 280 source files；frozen install 到 package 全部 passed |
| `pnpm format:check` | passed |
| `pnpm lint` | passed，0 warning |
| `pnpm typecheck` | editor 与 playground passed |
| `pnpm test:unit` | 50 files；436/436 passed |
| `pnpm test:coverage` | 436/436；statements 85.57%；branches 80.08%；functions 88.08%；lines 85.72% |
| constrained domain/chart/G2 coverage | all >=95% |
| `pnpm build` | passed；仅保留既有 G2 chunk-size warning |
| `pnpm test:package` | publint、ATTW、ESM、CJS、types、quickstart、tarball contract passed |
| `pnpm test:react-matrix` | React 18.3.1 / 19.2.7；87405 / 89114 painted pixels；clean unmount |
| `pnpm test:e2e` | current Chromium/Firefox/WebKit 177/177 passed |
| `pnpm test:a11y` | 45/45 passed |
| `pnpm test:performance` | waterfall p95 67.3ms；categorical p95 66.6ms；budget 150ms |
| previous Playwright release | Chromium 148、Firefox 150.0.2、WebKit 26.4；177/177 passed |
| WebKit previous major | WebKit 18.4；59/59 passed |
| strict artifact validator | feature/task strict 与 root validator passed |
| `git diff --check` | passed |

## TDD And Regression Detail

- `stable-release.test.ts` 在实现前 3/3 失败，在稳定 metadata/docs/scripts 完成后 3/3 通过。
- 最终 isolated source 运行 50 个 unit 文件和 436 个测试，不读取工作树预生成 `dist`。
- 首次完整 E2E 为 176/177，定位为一个命令一致性用例重复等待下载 UI；独立 export suite 已覆盖下载
  行为。改读公开 ViewSpec 文件后 focused 1/1 与完整 177/177 通过。
- `pnpm-lock.yaml` 与 baseline 字节一致；root manifest 只增加 release scripts；editor manifest 只修改版本。

## Artifact And Package Checks

- `tarball-manifest.json` 只包含 13 个 allowlist 文件。
- tarball 的 publint、ATTW、ESM、CJS 和 TypeScript consumer 均通过。
- 当前源码 release audit 扫描 126 个 release-facing 文件；隔离副本扫描 100 个，均未发现阻断项。
- TypeScript AST architecture audit 未发现越层依赖、非法 G2 import、公共入口泄漏或 runtime cycle。

## Post-Candidate Additive Label Verification

用户批准的对象式标签配置属于 1.0.0 发布前向后兼容扩展。fresh unit 为 52 files / 447 tests，
format、lint、typecheck、build、package、React 18/19、Chromium 20 场景与三浏览器 a11y 45/45
通过。200-item waterfall / categorical p95 分别为 84ms / 111.6ms，继续低于 150ms 预算。未执行
publish、tag、GitHub Release 或部署。
