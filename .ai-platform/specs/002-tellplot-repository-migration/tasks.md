# TellPlot 品牌与仓库迁移任务

## T109

- Status: In_Progress
- Priority: P0
- Dependencies: T108 Accepted
- Blocks: 首次远程 CI、仓库保护与公开发布准备
- Story / Requirement: CD-004、TDR-011
- Parallel: false
- Conflicts with: 旧仓库归档/删除、npm publish、产品行为修改
- Goal: 将已验收发布候选迁入独立 TellPlot 仓库并统一公共命名空间。
- Allowed files: TellPlot 新仓库全部文件
- Allowed remote: 新建并配置 `iiwish/tellplot`
- Forbidden remote: `iiwish/g2touch`
- Test targets: 品牌残留、静态质量、单元/coverage、package、React/browser matrix、E2E、a11y、performance、artifact validator、GitHub Actions
- Deliverables: TellPlot 独立仓库、根提交、远程 CI、仓库保护和 T109 evidence
- Acceptance criteria: 当前源码/规范无旧 namespace；全量验证与远程 CI 通过；旧远端引用不变。
- Definition of Done: 品牌残留审计、本地全量验证、干净根提交、远程 CI、仓库保护和旧远端不变证明全部通过。
- Validation commands: `pnpm install --frozen-lockfile`；`pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:react-matrix`；`pnpm test:browser-previous`；`pnpm test:e2e`；`pnpm test:a11y`；`pnpm test:performance`；artifact validator；GitHub Actions
- TDD plan: RED brand audit；GREEN namespace migration；REFACTOR canonical documentation；不修改产品行为。
- Packet path: `packets/T109.yaml`
- Evidence required: inventory、mirror fsck、brand audit、local validation、remote CI、repository rules、old remote immutability proof。
