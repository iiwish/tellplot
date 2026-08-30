# T144 Execution Summary

## Status

- Task: T144 - 完成 Fresh Full Release Rehearsal
- Attempt: T144-A001（含保留的环境失败与 exact fresh replay）
- Executor: Codex direct execution；未创建子任务
- Result: Needs_Review

## Full Matrix

- Exact Node `22.20.0`、pnpm `11.1.3`、npm `11.18.0` 下，format、lint、type、coverage、build、package、
  framework、current/previous browser、a11y、performance、security、architecture、release audit/artifact/check/
  rehearsal 全部通过。
- `release:check` 的 fresh 编排完整通过，包含 current browser 321/321、a11y 48/48、previous Playwright
  321/321、previous-major WebKit 107/107，以及 12-gate isolated-source rehearsal。
- Coverage 为 statements 90.29%、branches 84.38%、functions 91.13%、lines 90.40%；comparison performance
  两组各 30 samples，orchestrated p95 分别为 79.1ms 与 52.7ms，均低于 150ms，root commit delta 为 0。

## Artifact Integrity

- Frozen artifact 仍为 `tellplot-2.0.0.tgz`，597,508 bytes、41 files。
- SHA-256 仍为 `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`。
- Individual artifact verify、full `release:check` 与 nested fresh rehearsal 的 refresh/verify 均得到相同
  filename、size、files 与 hash；descriptor、T143 manifest 与 workflow receipt 未漂移。

## Environmental Replays

- 4174 端口被无关本地进程占用导致首次 E2E 在测试前失败；改用 repository-supported
  `TELLPLOT_E2E_PORT=4175` 后 exact suite 321/321。
- 长时间浏览器负载后 previous Firefox 首轮有两个 30 秒交互超时；冷却 60 秒、不修改 timeout、worker、
  assertion 或 threshold 后 exact replay 为 321/321 + 107/107。
- 同一资源饱和窗口内 focused architecture fixture 首轮超过 15 秒；冷却后同一 3-file suite 31/31。
  三次首轮环境失败均保留，不作为产品 green 伪装。

## Boundary

- Public preflight 与 registry availability 仅运行 hermetic fixtures；没有查询 live remote、registry、
  Trusted Publisher 或 GitHub environment。
- 未执行 fetch/pull/stage/commit/push/PR/tag/workflow dispatch/npm stage/publish/GitHub Release/production action。
- 没有 source、dependency、lockfile、workflow、threshold、timeout 或 assertion 变更；T144 是 evidence-only。
