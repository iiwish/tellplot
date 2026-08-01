# TellPlot 交付状态报告

## Metadata

- Version: 1.0.0
- Status: Not_Released
- Last updated: 2026-08-01
- Working branch: `main`
- Active goal: G007 / T131

## Current State

TellPlot 是基于 G2 的框架无关可编辑基础图表库，内建瀑布图、分类条形图和分类柱状图。G006 已验收
core、imperative editor、React adapter 与 Vue adapter 的内部 ownership。G007 只把公共分发收敛为一个
无 scope 的 `tellplot` 包，不改变图表、schema、命令、交互或 G2 runtime。

当前工作树包含 `tellplot@1.0.0` 本地候选，尚未作为该包名的 1.0.0 发布。公开入口为：

- `tellplot`：core 领域 API 与 `createEditor`。
- `tellplot/core`：显式 core-only 入口。
- `tellplot/react`：React 18/19 `ChartEditor`。
- `tellplot/vue`：Vue 3 `ChartEditor`。
- `tellplot/styles.css`：完整编辑器样式。

内部 `@tellplot/core`、`@tellplot/editor`、`@tellplot/react` 和 `@tellplot/vue` 都是 private workspace
layers，不独立生成发布 artifact。G2/G SVG 是公共包 direct dependencies，React/Vue 是 optional peers；
imperative consumer 不需要安装框架。

## Release Candidate

唯一权威 artifact manifest 是 `.ai-platform/evidence/T131/tarball-manifest.json`。当前候选为：

| Package | Artifact | SHA-256 |
| --- | --- | --- |
| `tellplot@1.0.0` | `tellplot-1.0.0.tgz` | `e476d4f631a0583aa1a8126691e85f510f502d671c1943fe80499640e5c7d10e` |

该 hash 在任何 package 内容变化后必须通过 `pnpm release:artifact:refresh` 重新生成，并同步到
`.github/workflows/publish-npm.yml`。本表、本地 manifest、workflow 和 staged download 四处必须完全一致。

## Quality Gates

T131 完成前必须从 Node 22.20.0、clean source 执行以下阻断门禁：

- supply-chain lock、installed manifest 与官方 npm production advisory audit。
- format、lint、strict typecheck、coverage、build、architecture cycle 和 public surface audit。
- 单包 ESM/CJS/types/CSS、publint、ATTW、pack allowlist 和可复现 SHA-256。
- imperative no-framework、React 18、React 19 与 Vue 3 strict peer consumer matrix。
- 当前/上一浏览器、WebKit 18.4、a11y、200-item performance 和 isolated-source rehearsal。
- public source preflight、tag/main/workflow contract、Registry availability 和 release artifact check。

T129/T130 的已验收结果是回归基线，不代替对最终单包候选执行的新门禁。T131 最新结果记录在
`.ai-platform/evidence/T131/test-results.md` 和 `review.md`。

## Remote Baseline

- GitHub 仓库：`iiwish/tellplot`，公开可见。
- `main` 与 annotated `v1.0.0` 当前 peeled commit：
  `f3a32282cc6d61d1ad23a5801b8ddc0eb944c747`。
- 当前 remote tag object：`e695354321c70c40e59c99af99dc062dc7b786ce`。
- `npm-production` environment 与 exact tag protection 已建立；最终候选提交后仍需受控重建 tag 并复核规则。
- 旧 scoped bootstrap package 只有 `0.0.0-bootstrap.0`；四个 scoped 1.0.0 stage 从未批准，不属于发布结果。
- `tellplot` package root、stage-only Trusted Publisher 与 package-level 2FA 必须在正式 staging 前核验。

## First-Publish Gate

以下顺序失败关闭。远程写操作只在既有用户授权范围内执行；任何身份、2FA、Registry 或 ref 状态不确定时
立即停止。

### 1. 清理旧 scoped staging

先逐包读取 staged queue，核对下列旧 stage ID 后拒绝，不得批准：

```bash
set -euo pipefail

packages=(@tellplot/core @tellplot/editor @tellplot/react @tellplot/vue)
stage_ids=(
  1f94311c-06ee-4149-ad84-e53263dc285c
  9e585db9-3289-4626-9a2c-e2b68a5db020
  1604e85d-2a29-46a9-af73-e0cc9a3007f9
  a1b6cf23-5beb-4403-a0a2-03169214fb58
)
for package in "${packages[@]}"; do
  npm stage list "$package" --json --registry=https://registry.npmjs.org/
done
for stage_id in "${stage_ids[@]}"; do
  npm stage reject "$stage_id" --registry=https://registry.npmjs.org/
done
```

拒绝后再次逐包读取 queue。旧 bootstrap versions 可以保留为历史占位，但应在新包公开后 deprecate 并明确
指向 `tellplot`；不得为 scoped package 发布 1.x。

### 2. Bootstrap 与 Trusted Publisher

使用单独构建、单独复核的 `tellplot@0.0.0-bootstrap.0`，以非 `latest` dist-tag 首次创建 package root。
bootstrap artifact 不得复用 1.0.0 候选，不得进入 GitHub Release。随后为 `tellplot` 配置：

- repository `iiwish/tellplot`；workflow `publish-npm.yml`；environment `npm-production`。
- 只启用 `allow-stage-publish`，禁用直接 `allow-publish`。
- package access 要求 2FA 并 disallow tokens；配置后重新读取并归档结果。

核对命令固定官方 Registry：

```bash
set -euo pipefail

package=tellplot
npm trust list "$package" --json --registry=https://registry.npmjs.org/
npm stage list "$package" --json --registry=https://registry.npmjs.org/
npm view "$package" versions dist-tags --json --registry=https://registry.npmjs.org/
```

package root 不存在、trust 权限不是 stage-only、queue 不为空或 1.0.0 已存在都阻断 workflow。

### 3. 固定最终 main 与 annotated tag

最终变更提交并推送到 clean `main`，托管 CI 全绿后记录唯一 `TELLPLOT_FINAL_COMMIT_SHA`。tag 更新前拒绝
任何 Git URL rewrite，并以 expected-old-object lease 受控替换：

```bash
set -euo pipefail

canonical_remote='https://github.com/iiwish/tellplot.git'
if git config --show-origin --get-regexp '^url\..*\.(push)?insteadof$'; then
  printf 'refusing tag update while a Git URL rewrite is active\n' >&2
  exit 1
fi
: "${TELLPLOT_FINAL_COMMIT_SHA:?}"
[[ "$TELLPLOT_FINAL_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]
test "$(git rev-parse HEAD)" = "$TELLPLOT_FINAL_COMMIT_SHA"
remote_main="$(
  GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
    git ls-remote --exit-code --refs "$canonical_remote" refs/heads/main | awk '{print $1}'
)"
old_tag_object="$(
  GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
    git ls-remote --exit-code --tags "$canonical_remote" refs/tags/v1.0.0 | awk '{print $1}'
)"
test "$remote_main" = "$TELLPLOT_FINAL_COMMIT_SHA"
test "$old_tag_object" = 'e695354321c70c40e59c99af99dc062dc7b786ce'
git tag --force --annotate v1.0.0 "$TELLPLOT_FINAL_COMMIT_SHA" --message 'TellPlot v1.0.0'
git push \
  --force-with-lease="refs/tags/v1.0.0:$old_tag_object" \
  "$canonical_remote" refs/tags/v1.0.0
```

重建后确认 remote main、local tag peeled commit、remote tag peeled commit 和 final SHA 完全相同，再恢复并
负向验证 exact `v1.0.0` tag protection 与 `npm-production` deployment branches/tags policy。

### 4. 从 exact tag 执行 staging workflow

```bash
set -euo pipefail

: "${TELLPLOT_FINAL_COMMIT_SHA:?}"
export GH_HOST=github.com
run_url="$(
  gh workflow run publish-npm.yml \
    --repo iiwish/tellplot \
    --ref v1.0.0 \
    -f confirmation='stage 1.0.0 stage-only-trusted-publishers-verified' |
    awk '/^https:\/\/github\.com\/iiwish\/tellplot\/actions\/runs\/[0-9]+$/ { print; exit }'
)"
[[ "$run_url" =~ ^https://github.com/iiwish/tellplot/actions/runs/[0-9]+$ ]]
run_id="${run_url##*/}"
run_head="$(
  gh run view "$run_id" --repo iiwish/tellplot --json headSha --jq '.headSha'
)"
test "$run_head" = "$TELLPLOT_FINAL_COMMIT_SHA"
gh run watch "$run_id" --repo iiwish/tellplot --exit-status
```

environment reviewer 必须核对 exact run URL/head SHA、verify job、tag policy、trust readiness 和候选 hash 后
批准。工作流只执行一次 `npm stage publish`，不执行 `npm publish`。

### 5. 下载并复核 staged artifact

```bash
set -euo pipefail

: "${TELLPLOT_STAGE_ID:?}"
review_root="$(mktemp -d)"
npm stage view "$TELLPLOT_STAGE_ID" --json --registry=https://registry.npmjs.org/ |
  tee "$review_root/stage.json"
(
  cd "$review_root"
  npm stage download "$TELLPLOT_STAGE_ID" --registry=https://registry.npmjs.org/
)
printf 'expected sha256: %s\n' \
  'e476d4f631a0583aa1a8126691e85f510f502d671c1943fe80499640e5c7d10e'
```

核对 package/version/tag、provenance、文件清单和 SHA-256；结果必须匹配
`.ai-platform/evidence/T131/tarball-manifest.json`。任一不一致都使用
`npm stage reject "$stage_id" --registry=https://registry.npmjs.org/` 拒绝，不批准也不原地替换。

### 6. 2FA approval 与公开验证

只有 staged artifact 复核通过才执行 approval：

```bash
set -euo pipefail

packages=(tellplot)
stage_ids=("${TELLPLOT_STAGE_ID:?}")
for index in "${!stage_ids[@]}"; do
  npm stage approve "${stage_ids[$index]}" --registry=https://registry.npmjs.org/
  npm view "${packages[$index]}@1.0.0" version dist.integrity dist.tarball \
    --json --registry=https://registry.npmjs.org/
done
```

approval 完成后验证 `latest=1.0.0`、provenance、Registry integrity，并从全新目录安装 `tellplot@1.0.0`，
分别构建 imperative、React 和 Vue smoke。bootstrap dist-tag 不得保持为 `latest`。

若 approval 状态未知，先用官方 Registry 的 `npm stage list`、`npm stage view` 和 `npm view` 分类为
public、pending 或 unknown。公开版本不可 reject 或覆盖；不得声称 已原子回滚。诊断后只重试 pending
stage 的 approval，unknown 状态继续失败关闭。

### 7. GitHub Release 与收尾

npm fresh install、provenance 和 tag 全部通过后，才创建 GitHub Release `v1.0.0`，更新 T131 evidence 与
状态文档。旧 scoped bootstrap package 逐个 deprecate 为“install tellplot instead”，但不得删除历史版本。

## Known Limitations

- 当前单包候选仍在未提交工作树，现有 `v1.0.0` 不是最终单包 tag。
- 当前 manifest hash 会随 package README、bundle 或 sourcemap 改变，最终提交前必须 refresh。
- staging 不是公开发布；环境审批和 npm 2FA 都可能需要用户在浏览器完成。
- G2 runtime 体积由 500 kB chunk/build 门禁与 consumer matrix 持续观察。
- 永久 command ID 去重集合在超长常驻实例中线性增长；strict Trusted Types 宿主仍需持续兼容验证。

权威 npm 行为以 [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) 和
[Staged Publishing](https://docs.npmjs.com/staged-publishing/) 为准。

## Next Gate

完成 T131 本地全量门禁并刷新唯一 tarball；随后清理旧 scoped stages、bootstrap `tellplot`、配置
stage-only trust，提交/push final main，受控重建 `v1.0.0` 并执行 staged release。公开验证完成前状态保持
`Not_Released`。
