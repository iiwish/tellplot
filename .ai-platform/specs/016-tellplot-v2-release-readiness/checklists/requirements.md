# G003-R1 Requirements Checklist

## Metadata

- Feature ID: `016-tellplot-v2-release-readiness`
- Goal ID: `G003-R1`
- Source: `spec.md`
- Version: 1.0.0
- Status: Completed
- Last updated: 2026-08-28

## Scope And Approval

- [x] 是否区分 G003 acceptance、G003-R1 planning approval、Git handoff authorization 与 public release authorization？
- [x] 是否明确目标创建不自动把 G003/T135-T141 标记为 `Accepted`？
- [x] 是否明确当前目标不执行任何远程 Git、tag、stage、publish、GitHub Release 或生产动作？
- [x] 是否不存在把积极语气或历史权限解释为 release authorization 的路径？

## Release Contract

- [x] 是否定义 package、version、tag、artifact、evidence、registry、workflow 与 toolchain 的单一事实来源？
- [x] 是否定义 HEAD current-release 工具从 1.0 切换到 2.0 时对 T131 历史证据的不可变边界？
- [x] 是否要求 descriptor、workflow、artifact manifest 与 SHA-256 完全一致？
- [x] 是否定义错误 version/tag/commit/hash/registry/workflow ref 的失败关闭行为？

## Source And Artifact

- [x] 是否拒绝从 dirty worktree 公开发布？
- [x] 是否区分本地 tracking ref 与实时远端 freshness？
- [x] 是否定义双语 README lineage 与 G003 reviewed patch 的隔离整合 rehearsal？
- [x] 是否要求连续两次 byte-identical artifact 以及 filename/size/file manifest/SHA-256 receipt？
- [x] 是否规定 source、packlist、toolchain 或 release contract 变化使 artifact freeze 失效？

## Workflow And Supply Chain

- [x] 是否定义 verify 与 OIDC stage job 的权限和职责分离？
- [x] 是否固定 protected environment、stage-only Trusted Publisher、provenance、人工复核与 2FA？
- [x] 是否禁止 OIDC job 安装项目依赖、build 或运行仓库脚本？
- [x] 是否禁止 workflow 直接执行 `npm publish`？
- [x] 是否定义版本占用、tag 漂移、registry 故障、trust 未知和 partial stage 的停止条件？

## Quality And Privacy

- [x] 是否要求 release-only 变更后 fresh 运行完整质量矩阵，而非复用 T141 结论？
- [x] 是否禁止 skip、放宽断言、改变阈值或用 mock 替代发布证据？
- [x] 是否保持 G003 public API/schema/行为、dependency、lockfile 与 private version 不变？
- [x] 是否禁止 secrets、本机临时路径和业务数据进入 evidence？
- [x] 是否量化 planning 与 final review 的 severity gate？

## Traceability

- [x] 每个 `REL2-FR-*` 是否至少映射一个 task？
- [x] 每个 `REL2-NFR-*` 是否有 validation 或明确的 stop condition？
- [x] 是否定义目标完成状态为 `Needs_Review`，且 public release 由后续独立授权承接？
- [x] 是否不存在 `TBD`、`TODO`、未定义占位 hash 或模糊的“latest remote”声明？

## Findings Summary

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

## Resolution Notes

- 用 G003-R1 收敛本地 2.0 release readiness，避免把目标验收和不可逆公开动作合并成一次模糊授权。
- 历史 1.0 evidence/tag 保持不可变；HEAD current-release semantics 由 TDR-026 明确切换到 2.0。
- artifact freeze 和 workflow hash 在同一任务链内闭合，外部可用性与 trust 只在未来明确授权后验证。

## User Review Gate

- Product/release-readiness scope: Confirmed by user on 2026-08-28.
- G003/T135-T141 goal acceptance: Accepted by user on 2026-08-28.
- TDR-026、Technical Plan 与 T142-T145 Work Graph: Confirmed by user on 2026-08-28.
