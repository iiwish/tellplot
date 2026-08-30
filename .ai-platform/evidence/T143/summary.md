# T143 Execution Summary

## Status

- Task: T143 - 整合 Clean Source 并冻结最终 2.0 Artifact
- Attempt: T143-A003（含 T142-A002/A003 owner recovery 后的 fresh freeze）
- Executor: Codex direct execution；未创建子任务
- Result: Needs_Review

## Integrated Source

- 以本地可见 `origin/main` `4d754cc9d635d097370b674633c972fb0ac199a1` 作为 observed lineage，
  freshness claim 仅为 `local_tracking_ref_only`，未运行 fetch/pull 或远程查询。
- 中英文 README 保留 observed origin 的品牌、徽章、官网导航和社区结构，同时精确表达
  `tellplot@2.0.0` candidate、schema `3.0.0`、2 至 4 序列 comparison 与“2.0 未发布”边界。
- RED receipt 因工作树缺少 `README.en.md` 精确失败；GREEN bilingual/schema/candidate assertions 通过。
- Integrated source manifest 共 462 个文件；排除 Git metadata、历史 evidence、dependencies、
  generated outputs、local environment files、`.vercel` 与软著私有材料。

## Final Artifact

- 唯一 artifact: `tellplot-2.0.0.tgz`，597,508 bytes，41 个 package files。
- SHA-256: `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`。
- Exact Node `22.20.0` 下，isolated rehearsal 连续执行 artifact refresh 与 artifact verify，
  filename/size/files/hash 完全一致；shared worktree stored artifact 再次 fresh verify 通过。
- `current-release.json`、T143 manifest 和 `publish-npm.yml` 对 package/version/tag/evidence/filename/
  size/hash 精确一致。Workflow 未触发。

## Recovery And Rehearsal

- T143 freeze preflight 发现 local environment/Vercel metadata 复制缺口，退回 T142-A002 test-first 修复。
- 首次 clean rehearsal 在未 build declarations 前 typecheck 失败，退回 T142-A003 固定
  `build -> typecheck` 门禁顺序；未删除或降级任何 gate。
- Fresh isolated rehearsal 通过 12 个 gates，其中 clean unit suite 为 72 files / 613 tests，
  package 与 imperative DOM / React 18 / React 19 / Vue 3 framework matrix 通过。

## Boundary

- Shared HEAD、index、tags 与 observed `origin/main` ref 在 replay/freeze 前后一致。
- 未执行 fetch/pull/merge/rebase/stage/commit/push/PR/tag/workflow dispatch/npm stage/publish/
  GitHub Release/production action。
- Live registry、Trusted Publisher、GitHub environment 与 remote freshness 仍为
  `Not_Run_Not_Authorized`。
