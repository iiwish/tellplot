# TellPlot 1.0.0 发布报告

## Metadata

- Version: 1.0.0
- Status: Released
- Released: 2026-08-01
- Registry cleanup: 2026-08-02
- Repository: `iiwish/tellplot`
- Package: `tellplot@1.0.0`
- GitHub Release: `https://github.com/iiwish/tellplot/releases/tag/v1.0.0`

## Public Contract

TellPlot 通过一个无 scope 的 `tellplot` 包交付框架无关 core、imperative editor、React/Vue adapters 和
完整样式。公开入口为：

- `tellplot`：core 领域 API 与 `createEditor`。
- `tellplot/core`：显式 core-only 入口。
- `tellplot/react`：React 18/19 `ChartEditor`。
- `tellplot/vue`：Vue 3 `ChartEditor`。
- `tellplot/styles.css`：完整编辑器样式。

内部 `@tellplot/core`、`@tellplot/editor`、`@tellplot/react` 和 `@tellplot/vue` 保持 private workspace
layers，不形成独立公开版本。G2/G SVG 是 direct dependencies，React/Vue 是 optional peers；imperative
consumer 不要求安装 UI framework。

单包分发减少安装、版本协调和 npm organization 管理成本，同时保留内部 layers 的依赖方向、独立测试和
唯一 editor runtime ownership；本次发布不改变图表 schema、命令语义或 G2 渲染边界。

## Immutable Source

| Item | Value |
| --- | --- |
| Release commit | `a3e07c9ac9b20183092729cde234322db98f9835` |
| Annotated tag | `v1.0.0` |
| Remote tag object | `d86cc8dff46f64c7e487153121b3f503e76ba5dc` |
| Tag protection ruleset | `20169540`，active，禁止 update/deletion |
| Workflow run | `30701441776` |
| Environment deployment | `5705046643`，`npm-production` |

`main`、annotated tag peeled commit、workflow head 和 provenance git dependency 在发布时均解析到同一
release commit。受控标签重建使用旧 tag object
`e695354321c70c40e59c99af99dc062dc7b786ce` 作为 exact force-with-lease；保护恢复后，删除探针被 GitHub
ruleset 拒绝。

## Artifact

唯一发布 artifact 为 `.ai-platform/evidence/T131/artifacts/tellplot-1.0.0.tgz`：

| Property | Value |
| --- | --- |
| Size | 485325 bytes |
| SHA-1 | `662d0280de22a634c80471e6d16cca2a312cd829` |
| SHA-256 | `e476d4f631a0583aa1a8126691e85f510f502d671c1943fe80499640e5c7d10e` |
| npm integrity | `sha512-+GHSo5QRkYyKTmFpn5Qbq6h4BrVizS31g0nn+QjL+5kOA8RBdC9w6nua2rENjx8mUocEtfr1yQkdEgHdlRFbqw==` |

本地 artifact manifest、workflow 固定 hash、npm staged download、公开 registry 和 GitHub Release asset
使用同一 tarball。构建在 Node 22.20.0 下规范化 package manifest key order 与 gzip stream，连续重建保持
相同 size 和 SHA-256。

## npm Controls

- Trusted Publisher：GitHub Actions，repository `iiwish/tellplot`，workflow `publish-npm.yml`，environment
  `npm-production`。
- Trust permission：只允许 `npm stage publish`，禁止直接 `npm publish`。
- Package access：要求 2FA 并禁止 bypass 2FA token。
- Bootstrap：`tellplot@0.0.0-bootstrap.0` 保留在 `bootstrap` dist-tag。
- Stable：`latest` 指向 `tellplot@1.0.0`。
- Stage queue：公开批准后为空。
- Scoped packages：`@tellplot/core`、`@tellplot/editor`、`@tellplot/react` 与 `@tellplot/vue` 无可安装版本。

workflow 从 exact `v1.0.0` tag 执行完整 release gate，verify job 在 23m6s 内通过，stage job 在 environment
审批后 26s 内完成。npm stage `187969a4-f39a-40e0-b602-8bccb975f9b2` 的 actor 为 GitHub Actions trusted
automation；下载复核通过后由维护者完成 WebAuthn 2FA approval。

## Provenance

公开 `dist.attestations` 包含 npm publish attestation 与 SLSA provenance v1。解码后的 SLSA statement 固定：

- subject `pkg:npm/tellplot@1.0.0`。
- repository `https://github.com/iiwish/tellplot`。
- workflow `.github/workflows/publish-npm.yml`。
- ref `refs/tags/v1.0.0`。
- git commit `a3e07c9ac9b20183092729cde234322db98f9835`。
- invocation `https://github.com/iiwish/tellplot/actions/runs/30701441776/attempts/1`。
- builder `https://github.com/actions/runner/github-hosted`。

## Acceptance

以下阻断门禁全部通过：

- 55 unit files、454 tests；coverage statements 88.44%、branches 80.65%、functions 89.40%、lines 88.52%。
- 当前 Chromium/Firefox/WebKit 186/186、上一发布浏览器 186/186、WebKit 18.4 62/62。
- accessibility 45/45；performance waterfall p95 90.3ms、categorical p95 101.2ms，均低于 150ms budget。
- supply chain、production advisory、architecture、package contract、376-file isolated-source rehearsal 和
  reproducible artifact。
- 官方 Registry fresh consumers：imperative no-framework、React 18.3.1、React 19.2.7、Vue 3.5.27 的
  strict peer install、ESM/CJS import 与 Vite production build；无框架 consumer 未安装 React/Vue。

四个 scoped bootstrap package 已全部 unpublished，删除顺序为 `@tellplot/react`、`@tellplot/vue`、
`@tellplot/editor`、`@tellplot/core`。Registry API 与 fresh npm cache 均返回 404，`@tellplot` organization
只保留 namespace，`npm access list packages tellplot` 返回空对象。四个 scoped `1.0.0` stage 已拒绝，
没有进入公开稳定结果。

## Evidence

- 发布摘要：`.ai-platform/evidence/T131/summary.md`。
- 完整验证矩阵：`.ai-platform/evidence/T131/test-results.md`。
- spec、code quality、QA 与 release artifact review：`.ai-platform/evidence/T131/review.md`。
- 权威 artifact manifest：`.ai-platform/evidence/T131/tarball-manifest.json`。
- 可复核 task patch：`.ai-platform/evidence/T131/diff.patch`。

## Residual Risk

没有已知发布阻塞。G2 runtime 体积继续由 500 kB chunk/build gate 和 consumer matrix 监控；永久 command ID
去重集合在超长常驻 editor 实例中会随已处理命令数量线性增长，属于当前已接受的运行时边界。

T131 无未解决 Critical、High 或 Medium finding，G007 状态为 `Accepted`。
