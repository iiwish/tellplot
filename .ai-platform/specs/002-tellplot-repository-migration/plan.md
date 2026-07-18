# TellPlot 品牌与仓库迁移 Plan

## Metadata

- Status: Confirmed
- Last updated: 2026-07-18

## Execution

1. 验证空目标目录，镜像并校验旧远端 Git 历史。
2. 复制当前工作树，排除 `.git` 与生成目录，初始化独立 `main`。
3. 统一品牌、包、DOM、CSS、运行时、文档和工程配置。
4. 运行残留审计、干净安装、本地全量质量门禁和 artifact validator。
5. 创建诚实的根提交与新私有 GitHub 仓库，推送 `main`。
6. 验证 GitHub Actions 并审计 `main` 仓库规则能力；不可用的外部计划限制必须记录，不得以公开私有仓库作为绕过方案。
7. 证明旧远端引用和提交未变化，将旧仓库处理留给下一审批闸门。

## Rollback

- 未推送前删除新目录即可回退，源工作树与旧远端不受影响。
- 已推送后删除新远端即可回退；旧历史镜像位于本地 bare backup。
- 任何验证失败都阻断提交、推送或仓库保护步骤。
