# T123 / G004 目标级复核

## Verdict

`PASS`。G004 / T123 满足 STABLE-SC-001 至 STABLE-SC-006。发布复核发现的四项 Medium finding
均已关闭，无未解决 Critical、High 或 Medium finding；用户于 2026-07-29 验收，状态为 `Accepted`。

## Spec Compliance

| Success criterion | Result |
| --- | --- |
| STABLE-SC-001 | `@tellplot/editor@1.0.0` tarball、manifest 与 package contract passed |
| STABLE-SC-002 | runtime/type/compat/deprecation/schema 合同已文档化并由测试锁定 |
| STABLE-SC-003 | architecture、public files、links、secret/path 和 tarball 门禁 passed |
| STABLE-SC-004 | isolated frozen install、audit、typecheck、unit、build、package passed |
| STABLE-SC-005 | current/previous browsers、React 18/19、a11y、performance 全部 passed |
| STABLE-SC-006 | 三层复核无 unresolved Critical、High 或 Medium finding |

## Contract And Architecture Review

- 1.0 runtime export 固定为 11 个，声明文件不泄漏 G2 或内部 adapter 类型。
- `ChartEditor + ChartConfig` 与独立 `ViewSpec` 继续是唯一公共普通/高级状态模型。
- AST import graph 证明 48 个源码文件、246 条 runtime edge 中没有 cycle 或新增越层依赖。
- 当前候选没有修改 dependency、lockfile、schema、command、projection、runtime 或 export behavior；
  分组交互 correction 保持在既有 interaction/component ownership 内。临时 ViewSpec 仅供柱形与
  group region 预览投影，canonical 状态、历史和公共回调仍在 pointer up 时一次提交。
- versioning、deprecation、support、security、contribution 和 migration 文档形成一致的 1.x 承诺。

## QA And Release Review

- unit/coverage、package、React、current/previous browser、a11y、performance、生产依赖审计与隔离源码
  复演全部通过。
- M-001：`release:check` 只覆盖部分稳定门禁，可能形成假绿。当前聚合门禁覆盖 coverage、React、
  current/previous browser、a11y、performance 和 rehearsal 等全部阻断项。
- M-002：单 worker WebKit 长队列会在完整矩阵中耗尽进程资源。当前与旧版 Playwright 矩阵使用两个
  worker 隔离负载；current 183/183、previous 183/183、WebKit 18.4 61/61 通过。
- M-003：package 未固定 npm registry，开发机的镜像配置可能把 publish 指向错误端点。当前
  `publishConfig` 固定 public access 和 npm 官方 registry，并由 package contract 锁定。
- M-004：发布审计没有覆盖 `.ai-platform`，历史 evidence 含个人和临时绝对路径。当前审计覆盖该目录，
  clean clone 中 282 个文件通过，仓库内不再保留这些绝对路径。
- P1-001：evidence tarball 与当前 package 输出缺少可执行的同源校验。`release:artifact` 会独立
  build/pack 当前源码并逐项比对存档与 manifest，旧候选上的 size、SHA-256 和内容差异均能阻断发布门禁；
  校验固定使用 `.nvmrc` 的 Node 22.20.0，非发布运行时会在构建前明确拒绝。
- W-003：Playground 与 React consumer 的默认构建会输出 G2 大 chunk warning。当前保持 dynamic
  import，并只在宿主构建层配置有界 `g2-runtime` 分组。
- 最终 tarball provenance 门禁会从当前源码重建 package，并校验 evidence tarball、manifest、
  13 个文件、492728 bytes 与 SHA-256 `9f8f6babe9342ec778f507b9d0e12e313c5ba52faa8b27e02bea094f618ebdfa`。
- Playground 和 React 18/19 consumer 使用 Vite 8 Rolldown 对按需加载的 G2 runtime 做有界分组；
  最大 JS chunk 472.56 kB，并由真实生产构建测试锁定。
- `.copyright-application` 与 `tmp` 同时由 Git、Prettier 和隔离源码复演排除，不进入提交、tarball
  或 rehearsal 副本。

## Residual Low Risks

- L-001：chunk 分组使用 Vite 8 Rolldown 配置；真实生产构建测试会在升级 Vite 后阻断不兼容或超阈值结果。
- L-002：稳定候选只存在于本地分支；G005 必须从用户批准的干净 commit 重跑全部发布门禁。
- L-003：生产网站尚未验证真实域名、SPA fallback 和外部链接；这些属于 G005。
- L-004：npm 官方发布身份、仓库公开、GitHub Release 与生产部署尚未授权或验证。

以上风险不影响本地稳定候选，也不构成远程 Git、visibility、deploy、DNS、tag、GitHub Release
或 npm publish 授权。
