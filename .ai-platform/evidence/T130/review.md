# T130 本地公开发布准备终审

## Verdict

`READY_FOR_USER_REVIEW`。T130 的本地实现、完整 `release:check` 与三类独立复核均已完成，
`RELEASE-SC-001` 至 `RELEASE-SC-006` 满足，未解决 Critical / High / Medium finding 为
`0 / 0 / 0`。按 execution packet 的 review contract，任务在用户显式验收前保持 `Needs_Review`；
G005 保持 `Blocked`，项目状态保持 `Not_Released`。

## Success Criteria

| Criterion | Result |
| --- | --- |
| RELEASE-SC-001 | focused browser/process/performance regression 与完整 `release:check` 通过 |
| RELEASE-SC-002 | 官方 npm Registry、production-only、info threshold 返回 0 vulnerability |
| RELEASE-SC-003 | dirty source、lightweight/stale tag、remote drift 与 hostile Git rewrite 失败关闭 |
| RELEASE-SC-004 | workflow contract 覆盖 environment approval、最小 OIDC、不可变 tarball、stage-only 与包顺序 |
| RELEASE-SC-005 | roadmap、tasks、AGENTS 和 release report 一致：G006 Accepted、T130 Needs_Review、G005 Blocked |
| RELEASE-SC-006 | 独立终审无 unresolved Critical、High 或 Medium finding |

## Review Coverage

- Spec / authorization：实现只触及 T130 allowed files；未改变公共 API、schema、runtime dependency、
  图表行为或产品范围，未执行任何远程动作。
- Browser / lifecycle：authoritative quickstart、2-worker matrix、按失败保留诊断、POSIX process group、
  Windows task tree、signal re-emission 与真实 runner cleanup 均有回归。
- Performance：每个样本先等待 canvas 稳定，再以 exact key、revision、root prefix 和像素变化共同归因；
  专门负向用例证明未完成前序动画不会触发下一命令采样。
- Security / supply chain：全部 AntV artifact、installed manifest、官方 production advisory、
  package tarball、publint/ATTW 和 source rehearsal 通过。
- Public source / workflow：canonical remote 查询不受本地 Git rewrite 影响；verify job 无 OIDC，
  protected stage job 只以 `--ignore-scripts` 安装精确 npm CLI，不安装项目 dependencies、不 build 或
  运行仓库脚本，只消费固定 tarball 并执行 `npm stage publish`。
- OSS docs：本地候选、公开发布、staging、2FA approval 与外部托管边界清晰，没有把 dirty candidate
  描述成 npm、GitHub 或生产版本。

## Closed Findings

- production audit 的 `low` threshold 会遗漏 `info` advisory：已改为 `info` 并由官方 Registry 0
  vulnerability 与合同测试验证。
- browser/framework runner 只终止 leader 或依赖 POSIX signal：已统一有界进程树清理并增加
  Ubuntu/Windows CI matrix、动态孙进程 fixture 与真实 runner smoke。
- 性能 probe 可能在未来动画配置变化后把前序帧计入当前命令：已增加稳定预等待、目标状态归因和
  unfinished-animation regression。
- Actions runtime 与自动 cache 边界不够显式：所有 action 固定 Node 24 release commit，
  `setup-node` 明确 `package-manager-cache: false`。
- release report 的进行态与 T130 evidence 缺失：已用最终 aggregate 结果更新 canonical report 并生成
  本 evidence bundle。

## Residual External Conditions

- 当前不是 clean commit，也没有 fresh-clone GitHub-hosted CI 证据。
- `windows-2025` lifecycle job 尚未在远端托管 runner 实际执行。
- npm package bootstrap、stage-only trust、2FA approval、staged queue、public install/provenance 尚未完成。
- stale `v1.0.0`、公开仓库、GitHub Release、生产网站与 DNS 仍需独立授权。

这些条件阻断 G005 公开发布，但不构成 T130 本地准备目标的未解决 finding。
