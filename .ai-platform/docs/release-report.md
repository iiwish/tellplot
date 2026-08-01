# TellPlot 交付状态报告

## Metadata

- Version: 1.0.0
- Status: Not_Released
- Last updated: 2026-07-31
- Working branch: `main`

## Current State

TellPlot 是基于 G2 的框架无关可编辑基础图表库，当前内建瀑布图、分类条形图和分类柱状图。
G001、G002 系列、G004 与 G006 均已验收；G006 / T125-T129 于 2026-07-30 完成目标级验收。
当前 1.0.0 四包候选尚未发布到 npm 或 GitHub，也尚未满足公开发布条件。G005 因独立远程授权、发布
身份、四个 npm package root bootstrap、stage-only Trusted Publisher、2FA approval 与生产托管条件保持
`Blocked`。T130 已完成本地修复、完整门禁和独立复核，状态为 `Needs_Review`，等待用户验收；这不构成
任何远程发布授权。

## Package Architecture

- `@tellplot/core`：拥有 SourceData、ViewSpec、配置验证、投影、确定性命令、交互策略和 `EditorStore`；
  不依赖 DOM、G2、React 或 Vue。
- `@tellplot/editor`：通过 `createEditor(container, options)` 提供完整 imperative DOM/G2 工作台，
  包含图表直接操作、结构大纲、Inspector、Toolbar、分组、批注、历史、持久化、SVG/PNG 导出和 a11y。
- `@tellplot/react`：React 18.3/19.x 薄适配，只管理宿主节点、props/ref 映射与 lifecycle。
- `@tellplot/vue`：Vue 3.5+ 薄适配，提供 props、emits、`v-model:view` 与 expose，不持有第二套状态。

G2 仍独占图形渲染、场景边界、事件与动画。三种宿主进入同一套 command/store/runtime，不含历史
React-only API 兼容层、Dashboard、第二渲染引擎或通用 plugin registry。

## Delivered Scope

- T125：框架无关 core、领域不变量和统一 `EditorStore`。
- T126：完整 imperative DOM/G2 编辑器、资源释放和全交互面迁移。
- T127：React 18/19 与 Vue 3 适配包及隔离 tarball consumer。
- T128：playground、公共文档、imperative/React/Vue quickstart 与四包发布脚本。
- T129：完整浏览器、a11y、性能、tarball、架构审计和隔离源码复演证据。

## Accepted G006 Baseline

以下结果属于 2026-07-30 已验收的 G006 / T129 候选基线，不代表当前未提交工作树已经通过新的公开发布
门禁：

- Node 22.20.0 下的 G006 `pnpm release:check` 验收记录通过。
- supply chain：14 个 AntV package / 17 个精确 artifact 的 version、tarball URL、SHA-512 integrity
  allowlist 通过；安装后 48 个 manifest 一致，所有第三方 GitHub Actions 固定完整 commit SHA。
- architecture：49 个源文件、193 条 runtime import edge、0 cycle；四个公共入口分层通过。
- release audit：4 packages、25 public files、19 Markdown files、419 audited files。
- unit/coverage：53 files / 439 tests；statements 88.35%、branches 80.64%、functions 89.30%、lines
  88.44%，全部配置的 coverage threshold 通过。
- current Chromium/Firefox/WebKit：186/186；accessibility：45/45。
- previous Playwright browser release：186/186；WebKit 18.4：62/62。
- framework matrix：无 React/Vue 依赖的 imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27
  通过四包 tarball 完成受控 keyboard move/undo；克隆 SourceData、克隆受控候选和 Vue reactive Proxy
  均保留 accepted session 与 undo history，ViewSpec、CommandEvent、SVG 语义完全一致，真实 G2 canvas、
  update 与 clean unmount 通过。consumer fresh install 使用 strict peer mode，并固定 Vite/Rolldown WASM
  fallback 的同代 transitive，peer warning 视为门禁失败。
- 非法、`null`、dataset 冲突或精确 chart type 冲突 ViewSpec 进入稳定 invalid state，返回非空 issue 并
  调用拒绝回调，不泄漏原生 `TypeError`。
- 200-item performance：waterfall p95 70.8ms，categorical p95 71.2ms，均低于 150ms；同目标 React
  root commit delta 为 0。性能项目不录制 trace/video/screenshot，并在 authoritative scene ready 后采样。
- isolated-source rehearsal：336 个源文件，frozen install、供应链门禁、architecture、audit、typecheck、439 unit、
  build、四包 package 和受控四宿主 framework matrix 全部通过。
- `defaultView` 只参与初始化；数据集切换不会重新套用旧默认视图。selection reconciliation 会持久化并
  只发布一次失效通知，受控命令产生的新 selection 则在宿主接受候选后发布。
- 语义等价的 editor update 跳过 DOM/G2 重绘并保留活动 pointer interaction；真实状态变化会取消
  stale interaction。config 的对象属性顺序不参与语义判断；ViewSpec 的 `rootOrder` 与分组子项保持
  有序语义，`collapsedGroupIds` / `pinnedItemIds` 按成员集合比较。常规受控回传保留已打开面板，数据、
  图表类型或 invalid/ready 上下文切换会关闭 overlay，外部 ViewSpec 变化会放弃未提交的框选分组。
- React callback/class/style-only 重渲染不触发 runtime update；Strict Mode effect replay 的初始化配置拒绝
  按逻辑挂载只上报一次。容器 `ResizeObserver` 负责非 window resize 的 G2 `forceFit`，并在 destroy 时断开。
- 导出参数在字段读取前完成安全结构与类型验证；`null`、错误字段类型和 accessor 返回稳定
  `TellPlotExportError`。imperative quickstart 通过显式卸载函数释放 editor，不会在创建后立即销毁。
- tooltip 只写入 text node；SVG export 移除 executable/remote/source metadata；SourceData/ViewSpec/options
  拒绝 sparse array、hostile descriptor/prototype、symbol/named property 与未知键。
- preview G2 render 失败会中止交互并恢复 authoritative scene；失败或陈旧 preview 不可提交命令。
- React/Vue `styles.css` subpath 具备 NodeNext 可消费的类型入口；关闭、分组、取消、展开/折叠与
  backdrop 文案由 zh-CN/en-US catalog 统一提供。
- React/Vue host 在自动高度 flex/grid 中由编辑器内容撑开，在定高容器中继续填满可用高度。
- 四个 1.0.0 tarball 均通过 ESM、CJS、types、publint、ATTW、文件 allowlist、size 与 SHA-256 同源校验。
- strict artifact validator、format、lint、typecheck、build、release audit 和 `git diff --check` 通过。

详细结果位于 `.ai-platform/evidence/T125/` 至 `.ai-platform/evidence/T129/`。

## Current Pre-Release Verification

- quickstart 使用 authoritative scene geometry 和新鲜 feedback transition 校验锁定项；当前
  Chromium/Firefox/WebKit focused regression 与 186-test current browser matrix 通过。常规 E2E 不为每个
  成功 context 持续录制 trace/video，失败截图继续保留。
- browser/framework runner 在 POSIX 终止整个进程组，在 Windows 使用有界 `taskkill /T` 与 `/F`
  fallback；动态 fixture 和两个真实 runner 的受控 SIGTERM smoke 证明孙进程与临时目录均被清理。
- `pnpm audit:prod` 显式使用 `https://registry.npmjs.org/` 和 `--audit-level=info` 查询 production
  advisory，覆盖全部 severity；当前结果为 0 个 vulnerabilities。默认镜像配置不参与权威审计。
- `release:preflight` 分离 dirty-capable local candidate 与 public source：当前 dirty worktree 按预期被拒绝；
  临时 bare remote、clean `main`、upstream、annotated tag 与真实 `ls-remote` collector fixture 通过。
- `release:trust-readiness` 同时检查四个 package root、精确 1.0.0 可用性和人工确认。四个 root 当前均为
  E404，因此以 bootstrap-required 失败关闭，不会进入 staging。
- `publish-npm.yml` 只提供 stage-only 路径。无 OIDC 的 verify job 执行完整质量门禁和 tarball 重建；
  environment-protected OIDC job 使用 `--ignore-scripts` 安装精确 npm CLI，不安装项目 dependencies、
  不 build 或运行仓库脚本；随后只复核 exact SHA、remote main/tag、Registry 状态和四个固定 SHA-256，
  再按 `core -> editor -> react -> vue` 执行 `npm stage publish`。工作流不执行 `npm publish`。
- Node 22.20.0 下的 T130 `pnpm release:check` 完整通过：14 package / 17 artifact / 48 installed
  manifest 供应链门禁，49 source / 193 import edge / 0 cycle，434-file release audit，54 files / 446
  unit，四包 package 与 framework matrix，performance 3/3（waterfall p95 129.5ms、categorical p95
  136.3ms，预算 150ms），current browser 186/186，a11y 45/45，previous browser 186/186，WebKit 18.4
  62/62，以及 351-file isolated-source rehearsal 全部通过。
- T130 evidence 位于 `.ai-platform/evidence/T130/`，独立复核无未解决 Critical、High 或 Medium finding。
  T130 保持 `Needs_Review`，完整本地结果不能替代 G005 的 clean commit、托管 CI 与远程人工闸门。
- G006 的已验收证据继续有效，但不能替代从干净 commit 对最终发布内容执行的 fresh-clone CI 与完整
  release gate。

## First-Publish Gate

以下步骤属于 G005 远程发布操作，必须取得独立明确授权；T130 不执行这些命令：

1. 确认 `@tellplot` scope ownership、维护者 2FA、公开仓库，以及 `npm-production` environment 的
   required reviewers 与 prevent self-review；在第 3 步完成前保持该 environment 禁止部署。审计既有 tag、
   GitHub Release 与 npm version。当前远端 `v1.0.0` tag object 为
   `56a998894668ce0f265f9ef676d88bb79ee06ad6`，peeled commit 为
   `daecc7b2a7aa898bd7bffc05fe15b0a9bcd7b038`；最终候选仍在未提交工作树中，因此该 tag 不是最终发布 tag。
   必须确认它从未对应公开 GitHub Release 或 npm 1.0.0。若已经公开使用，停止 1.0.0 流程并选择新版本，
   不改写已公开历史。
2. 把最终候选提交到 clean `main`，从该 commit 完成 fresh-clone CI、官方 registry audit 和完整 release
   gate；取得独立远程 Git 授权后再推送 `main`，在发布评审记录中固定唯一 final commit SHA。
3. 在独立 tag-update 授权下，以带 expected-old-object lease 的方式把 stale `v1.0.0` 重建为指向 final
   commit 的 annotated tag。任何旧 tag object、remote main 或 lease 漂移都必须失败关闭：

```bash
set -euo pipefail

canonical_remote='https://github.com/iiwish/tellplot.git'
if git config --show-origin --get-regexp '^url\..*\.(push)?insteadof$'; then
  printf 'refusing tag update while a Git URL rewrite is active\n' >&2
  exit 1
fi
: "${TELLPLOT_FINAL_COMMIT_SHA:?set the SHA fixed in the approved release record}"
[[ "$TELLPLOT_FINAL_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]
final_commit="$TELLPLOT_FINAL_COMMIT_SHA"
test "$(git rev-parse --verify HEAD)" = "$final_commit"
remote_main="$(
  git ls-remote --exit-code --refs "$canonical_remote" refs/heads/main | awk '{print $1}'
)"
old_tag_object="$(
  git ls-remote --exit-code --tags "$canonical_remote" refs/tags/v1.0.0 | awk '{print $1}'
)"
test "$remote_main" = "$final_commit"
test "$old_tag_object" = '56a998894668ce0f265f9ef676d88bb79ee06ad6'

# 以下两条写操作仍需独立明确授权。
git tag --force --annotate v1.0.0 "$final_commit" --message 'TellPlot v1.0.0'
git push \
  --force-with-lease="refs/tags/v1.0.0:$old_tag_object" \
  "$canonical_remote" refs/tags/v1.0.0

remote_tag_object="$(
  git ls-remote --exit-code --tags "$canonical_remote" refs/tags/v1.0.0 | awk '{print $1}'
)"
remote_tag_commit="$(
  git ls-remote --exit-code --tags "$canonical_remote" 'refs/tags/v1.0.0^{}' | awk '{print $1}'
)"
test -n "$remote_tag_object"
test "$remote_tag_object" != "$remote_tag_commit"
test "$remote_tag_commit" = "$final_commit"
```

   远端 main 与 annotated tag 的 peeled commit 同为 final SHA 后，才启用 `v1.0.0` tag protection；不得先
   保护 stale tag 再尝试替换。随后把 `npm-production` environment 的 deployment branches/tags policy
   设为只允许该受保护的 exact `v1.0.0` tag，禁止 branch 和其他 tag，并用未允许 ref 的受控负向检查确认
   environment 在 OIDC job 前阻断。npm trust 只绑定 workflow file 与 environment，因此该机器级 ref 限制
   不得由 workflow 内部 shell 自检替代。
4. 使用单独评审的非 1.0.0 artifact 和非 `latest` dist-tag bootstrap
   `@tellplot/core`、`@tellplot/editor`、`@tellplot/react`、`@tellplot/vue` 四个 package root。首次
   bootstrap 机制不复用 `publish-npm.yml`。
5. 使用 npm 11.18.0 的已认证维护者会话，为四包配置同一个 stage-only Trusted Publisher；只授予
   `--allow-stage-publish`，不授予 `--allow-publish`：

```bash
set -euo pipefail

npm install --global npm@11.18.0 \
  --ignore-scripts \
  --registry=https://registry.npmjs.org/
for package in @tellplot/core @tellplot/editor @tellplot/react @tellplot/vue; do
  npm trust github "$package" \
    --file publish-npm.yml \
    --repository iiwish/tellplot \
    --environment npm-production \
    --allow-stage-publish \
    --yes \
    --registry=https://registry.npmjs.org/
  sleep 2
  npm trust list "$package" \
    --json \
    --registry=https://registry.npmjs.org/
done
```

   任一写入或读取失败都必须立即停止，不得启用 disallow-tokens 或触发 workflow。维护者逐包执行
   `npm trust list --json`，核对 configuration ID、repository、workflow、environment 和 permissions；修正
   错误配置，或在独立 trust-change 授权下 `npm trust revoke` 后重建。四包全部确认只允许
   stage publish 后才进入下一步。
6. 确认四个 stage-only Trusted Publisher 均已生效后，再在四个 package 的 access settings 启用
   package-level `Require two-factor authentication and disallow tokens`；不得在 trust 配置就绪前禁用
   bootstrap 所需的传统发布路径。必须逐包重新读取 access settings 并保存四个成功结果；任一设置或核验
   失败都停在本步骤，不得继续。
7. 触发前使用已认证维护者会话逐包检查 staged queue，确认四包均没有 pending 1.0.0 stage。`npm stage
   list` 只接收一个可选 package spec，不能把四个 package 作为同一次调用的 positional arguments：

```bash
set -euo pipefail

queue_evidence="$(mktemp -d)"
for package in @tellplot/core @tellplot/editor @tellplot/react @tellplot/vue; do
  npm stage list "$package" \
    --json \
    --registry=https://registry.npmjs.org/ |
    tee "$queue_evidence/stage-list-${package##*/}.json"
done
printf 'archive staged-queue evidence from %s\n' "$queue_evidence"
```

   将四个 JSON 结果附到发布评审记录，并逐包确认不存在 pending 1.0.0。任何 auth/network/query failure 都
   禁止 dispatch；公共 version endpoint 的 404 不能证明 staged queue 为空。
8. 从 exact annotated `v1.0.0` tag 触发工作流：

```bash
set -euo pipefail

: "${TELLPLOT_FINAL_COMMIT_SHA:?set the SHA fixed in the approved release record}"
[[ "$TELLPLOT_FINAL_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]
export GH_HOST=github.com
canonical_remote='https://github.com/iiwish/tellplot.git'
dispatch_check_root="$(mktemp -d)"
remote_git() {
  GIT_CONFIG_GLOBAL=/dev/null \
    GIT_CONFIG_NOSYSTEM=1 \
    GIT_TERMINAL_PROMPT=0 \
    git -C "$dispatch_check_root" "$@"
}
read -r remote_main remote_main_ref < <(
  remote_git ls-remote --exit-code --refs "$canonical_remote" refs/heads/main
)
test "$remote_main_ref" = 'refs/heads/main'
test "$remote_main" = "$TELLPLOT_FINAL_COMMIT_SHA"
remote_tag_object=''
remote_tag_commit=''
while read -r commit ref; do
  case "$ref" in
    'refs/tags/v1.0.0') remote_tag_object="$commit" ;;
    'refs/tags/v1.0.0^{}') remote_tag_commit="$commit" ;;
  esac
done < <(
  remote_git ls-remote --exit-code --tags "$canonical_remote" \
    refs/tags/v1.0.0 'refs/tags/v1.0.0^{}'
)
[[ "$remote_tag_object" =~ ^[0-9a-f]{40}$ ]]
[[ "$remote_tag_commit" =~ ^[0-9a-f]{40}$ ]]
test "$remote_tag_object" != "$remote_tag_commit"
test "$remote_tag_commit" = "$TELLPLOT_FINAL_COMMIT_SHA"
run_url="$(
  gh workflow run publish-npm.yml \
    --repo iiwish/tellplot \
    --ref v1.0.0 \
    -f confirmation='stage 1.0.0 stage-only-trusted-publishers-verified' |
    awk '/^https:\/\/github\.com\/iiwish\/tellplot\/actions\/runs\/[0-9]+$/ { print; exit }'
)"
[[ "$run_url" =~ ^https://github\.com/iiwish/tellplot/actions/runs/[0-9]+$ ]]
printf 'record workflow run %s\n' "$run_url"
run_id="${run_url##*/}"
run_head="$(
  gh run view "$run_id" \
    --repo iiwish/tellplot \
    --json headSha \
    --jq '.headSha'
)"
test "$run_head" = "$TELLPLOT_FINAL_COMMIT_SHA"
gh run watch "$run_id" --repo iiwish/tellplot --exit-status
```

   `gh run watch` 会在 stage job 的 `npm-production` environment gate 等待。独立 reviewer 必须先核对
   exact run URL/head SHA、verify job 全绿、tag/environment policy 和四包 readiness，再批准 environment；
   发起者不得自批。只跟踪并归档上面捕获的 exact run ID/URL；不得用当前目录 remote、`GH_REPO` 或
   “最新一次 run”替代 `--repo iiwish/tellplot` 与该 run ID。
9. 工作流成功只表示四个 1.0.0 artifact 已进入 npm staging，尚未公开。维护者把四个 stage ID 写入受审
   变量，再从独立目录逐个查看和下载：

```bash
set -euo pipefail

: "${TELLPLOT_CORE_STAGE_ID:?}"
: "${TELLPLOT_EDITOR_STAGE_ID:?}"
: "${TELLPLOT_REACT_STAGE_ID:?}"
: "${TELLPLOT_VUE_STAGE_ID:?}"
stage_labels=(core editor react vue)
stage_ids=(
  "$TELLPLOT_CORE_STAGE_ID"
  "$TELLPLOT_EDITOR_STAGE_ID"
  "$TELLPLOT_REACT_STAGE_ID"
  "$TELLPLOT_VUE_STAGE_ID"
)
review_root="$(mktemp -d)"
for index in "${!stage_ids[@]}"; do
  label="${stage_labels[$index]}"
  stage_id="${stage_ids[$index]}"
  mkdir "$review_root/$label"
  npm stage view "$stage_id" \
    --json \
    --registry=https://registry.npmjs.org/ |
    tee "$review_root/$label/stage.json"
  (
    cd "$review_root/$label"
    npm stage download "$stage_id" \
      --registry=https://registry.npmjs.org/
  )
done
printf 'archive staged-artifact evidence from %s\n' "$review_root"
```

   对每个 stage 核对 package/version/tag、provenance，并对下载文件执行 `sha256sum`；macOS 使用
   `shasum -a 256`。结果必须同时匹配
   `.ai-platform/evidence/T129/tarball-manifest.json` 和下表。四包检查矩阵全部通过并签字前，不得批准
   任何单包：

| Package | Candidate SHA-256 |
| --- | --- |
| `@tellplot/core@1.0.0` | `4cfa4d35bc3b2806daeb041e24c06916cf497b489c4f41f6c427474eb2de7e7b` |
| `@tellplot/editor@1.0.0` | `3f37a90d566d956d8d0a2d30978b17a0f2b5dd4dd2d2ea26626ac50130bb06a2` |
| `@tellplot/react@1.0.0` | `c8d84a0a825883167e056f82f1918adcf80c858b022c7d65651fdcaa18395242` |
| `@tellplot/vue@1.0.0` | `a149c504084ea1af7d003e8c3a3374e30660a29afb8159ee68d3d158c5aa8811` |

   任一 metadata、tarball、hash 或 provenance 不一致都必须停止；在尚无 approval 的前提下，按第 10 步
   reject 本次全部 stage。不得批准“未受影响”的单包，也不得原地替换 staged artifact。
10. 任一 package 在四包全部进入 staging 前失败时，禁止直接重跑。已产生的 stage 保持非公开；维护者
   使用带 `--registry=https://registry.npmjs.org/` 的 `npm stage list`/`view` 列出并查看本次 stage ID，
   再以 `npm stage reject "$stage_id" --registry=https://registry.npmjs.org/` 完成 2FA 清理。确认四包
   staged queue 为空且 1.0.0 仍未公开后再触发工作流；任何 Registry 未显式固定的命令都不得用于该流程。
11. 第 9 步四包预验全部通过后，才按 `core -> editor -> react -> vue` 逐个执行
   `npm stage approve`，并在每次 approval 后立即核对对应 Registry version：

```bash
set -euo pipefail

: "${TELLPLOT_CORE_STAGE_ID:?}"
: "${TELLPLOT_EDITOR_STAGE_ID:?}"
: "${TELLPLOT_REACT_STAGE_ID:?}"
: "${TELLPLOT_VUE_STAGE_ID:?}"
packages=(@tellplot/core @tellplot/editor @tellplot/react @tellplot/vue)
stage_ids=(
  "$TELLPLOT_CORE_STAGE_ID"
  "$TELLPLOT_EDITOR_STAGE_ID"
  "$TELLPLOT_REACT_STAGE_ID"
  "$TELLPLOT_VUE_STAGE_ID"
)
for index in "${!stage_ids[@]}"; do
  npm stage approve "${stage_ids[$index]}" \
    --registry=https://registry.npmjs.org/
  npm view "${packages[$index]}@1.0.0" version dist.integrity \
    --json \
    --registry=https://registry.npmjs.org/
done
```

   approval 不是原子事务：若任一后续 approval 失败，立即停止 GitHub Release、网站部署和发布公告；不得
   重跑 staging，不得 reject 或回滚已经公开的版本。先用显式官方 Registry 的 `npm stage list`/`view` 和
   `npm view` 判定每个 package 是 public、pending 还是 unknown；保留尚未批准的 stage ID，诊断 2FA/Registry
   故障后只重试 pending stage 的 approval。若 pending stage 已被拒绝、损坏或无法继续批准，进入 release
   incident，记录已公开 package/version，并在新的独立授权下制定统一后续 patch 版本等补救方案；不得声称
   已原子回滚。
12. 四包 approval 完成后，核对四个 `@1.0.0`、`latest`、provenance 和 Registry integrity，并从全新目录
   使用显式 `--registry=https://registry.npmjs.org/` 执行 public fresh-install smoke。上述检查通过前不得
   将 TellPlot 标记为 `Released`。

权威 npm 行为以
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) 和
[Staged Publishing](https://docs.npmjs.com/staged-publishing/) 为准。

## Known Limitations

- 1.0.0 四包候选只存在本地未提交工作树，不是 npm 或 GitHub 上的公开版本。
- 远端现有 annotated `v1.0.0` 指向旧 main commit
  `daecc7b2a7aa898bd7bffc05fe15b0a9bcd7b038`，必须在独立授权下以 expected-old-object lease 安全替换并
  复核后再启用 tag protection。
- 四个 `@tellplot/*` package root 尚未 bootstrap；npm 不允许为不存在的 package 配置 Trusted Publisher，
  也不允许对全新 package 使用 staged publishing。
- stage-only workflow 不直接公开版本；staged artifact review、2FA approval、公开安装与 provenance 页面验证
  都属于 G005 远程执行。
- G2 运行时保持按需加载；playground 和 framework consumers 的生产构建由 500 kB chunk 门禁约束。
- 当前未验证生产域名、SPA fallback、公开链接、npm 发布身份或实际公开安装。
- G005 clean commit/CI 演练必须重新执行官方 registry advisory 检查和全部浏览器门禁。
- 永久 command ID 去重集合在超长常驻实例中线性增长；strict Trusted Types 宿主仍需持续兼容验证。

## Next Gate

G006 已验收。G005 继续保持 `Blocked`，等待独立远程授权、scope/package root bootstrap、stage-only
Trusted Publisher、2FA approval、发布身份与生产托管条件；远程 Git、仓库公开、生产网站、DNS、Git tag、
GitHub Release、npm stage 与 npm publish 均未获授权。进入公开发布操作前，必须从干净 commit 重新通过
fresh-clone CI、官方 registry audit 与完整 release gate，并按 `First-Publish Gate` 完成人工复核。
