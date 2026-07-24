# T117 / G002 轻量图表库 Beta Evidence Summary

## Outcome

- Status: `Needs_Review`
- Execution attempt: `T117-A001`、review corrections `T117-A002` / `T117-A003` / `T117-A004`
- Package candidate: `@tellplot/editor@0.1.0-beta.1`
- Goal: G002 轻量图表库 Beta
- Remote actions: 未执行 commit、push、PR、merge、npm publish、Git tag 或正式 release

G002 已把验收后的 waterfall、bar 和 column 整理为可安装、可理解、可集成和可验证的 Beta release
candidate。runtime export 仍为十个，G2 Chart/spec/runtime 保持内部所有权；无新图表、依赖或 schema。新增的
`FinancialChartEditorLayout` 是用户已批准的可选公共类型，不暴露内部 panel component 或 CSS 合同。

## Delivered

- 固定 `0.1.0-beta.1` package metadata、ESM/CJS/declarations、typed styles subpath 和 tarball allowlist。
- 新增 package README、package LICENSE、CHANGELOG、入门、API、错误与迁移文档。
- 用 TypeScript strict consumer 编译 package README 的最小 React 示例。
- 将 `CommandSource` 固定为 `direct | outline | keyboard | host`，parser 明确拒绝 `ai` literal。
- 锁定十个 runtime exports，declarations 不包含 G2/runtime 内部类型。
- 完成 package、React 18/19、当前/上一浏览器、a11y、performance 和完整静态回归。
- `panels` 独立控制 outline、inspector 和 toolbar 显隐；`layout` 只控制大纲位置与检查器呈现，组件默认布局不变。
- playground 桌面端默认显示左侧使用代码、中间图表和右侧 outline/inspector ARIA 标签栏；紧凑视口
  保持原生 dialog，安装、React 和配置示例均可复制。
- panel 标签栏支持 ArrowLeft/ArrowRight/Home/End，仅启用一个 panel 时不显示多余 tab，全部隐藏时不保留空列。
- 左侧默认显示亮色 `tellplot.config.json`，确定性包含 `sourceData`、`viewSpec`、`chartAppearance`、
  `panels` 和 `layout`；合法草稿短延迟应用到图形，右侧命令结果反向回写同一份文档。
- 图表文档仅使用 `JSON.parse`、封闭配置校验、`validateSourceData` 和 `validateViewSpec`；无效草稿保留且
  不改变最后一次合法图形。没有 `eval`、`new Function`、iframe runtime、远程编译或编辑器依赖。
- 安装、React 和配置代码保留在独立“接入示例”视图，实时编辑器与静态示例统一为亮色主题。

## Baseline And Scope

- Accepted baseline: `/tmp/tellplot-G002-baseline.jBh5ji/worktree`
- Baseline files: 293
- Manifest SHA-256: `9664ccb6fb57ac8e41622ee7a6ccb81b0458438d44f143cd0b698f843ce01b3c`
- Task-only patch: `diff.patch`，35 files，1088 insertions，43 deletions
- Reverse-apply check: passed against the final working tree before evidence creation

唯一执行偏差是 styles subpath 增加 `types` condition，使 README 中的 CSS side-effect import 可由独立
TypeScript consumer 编译；React tarball manifest assertion 同步更新。导入路径、CSS 内容和 runtime 行为不变。

用户 review correction 使用独立 `review-correction.patch` 记录，基线是应用 T118 task-only patch 后的工作树；
共 3,922 lines、37 files，SHA-256 为
`16c9e7fb4be2abd32909b1023a699dc888fffb11d477d9c2cdb07dd36990d272`。它不改动 package runtime export、schema、
dependency 或 G2 runtime。

## Residual Risk

- Low: final 200-item p95 为 waterfall 89.5ms、categorical 75.9ms，均低于 150ms；预算未弱化。
- Low: playground 仍显示既有 G2 chunk size warning；G002 没有证据支持为此拆分 G2 或引入新框架。
- Low: package 只完成本地 tarball 与独立 consumer 验证，尚未经过 npm registry 安装；publish 是独立闸门。

Critical/High/Medium findings: 0。

## Acceptance Gate

G002 / T117 的实现、review 和门禁均已完成，状态为 `Needs_Review`，与 G002-R1、G002-R2、G002-R3
统一等待用户目标级验收。远程 Git、npm publish、Git tag、GitHub Release 和生产部署未获授权。
