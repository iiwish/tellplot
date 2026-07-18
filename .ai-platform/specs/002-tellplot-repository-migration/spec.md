# TellPlot 品牌与仓库迁移 Spec

## Metadata

- Feature ID: `002-tellplot-repository-migration`
- Status: Confirmed
- Last updated: 2026-07-18
- Approval: 用户于 2026-07-18 明确批准迁移顺序并要求执行

## Goal

将已经验收的瀑布图发布候选迁入独立 TellPlot 仓库，统一产品、包、DOM、CSS、运行时和工程配置中的品牌命名空间，并用本地与远程证据证明迁移没有改变产品行为。

## Requirements

- 新仓库使用独立 Git 根历史与 `main` 默认分支。
- 当前工作树中的 SSOT、源码、测试和 evidence 必须完整迁移。
- 公共包使用 `@tellplot/editor`，参考应用使用 `@tellplot/playground`。
- 当前源码与规范使用 `TellPlot`、`tellplot`、`@tellplot`、`[data-tellplot]`、`.tp-` 和 `TELLPLOT_*`。
- `.ai-platform/evidence/**` 中的既有 patch 保持不可变，作为历史验收记录。
- 迁移必须通过原有全量质量门禁和 GitHub-hosted CI。
- `iiwish/g2touch` 在本任务中不得被改名、归档、删除或写入。

## Non-Goals

- 不修改财务领域模型、交互行为或视觉设计。
- 不执行 npm publish、正式版本发布或网站部署。
- 不处理旧 GitHub 仓库的最终归档或删除。
