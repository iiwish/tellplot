# G003-R2A Requirements Checklist

## Metadata

- Goal ID: `G003-R2A`
- Source: `plan.md`、TDR-026、T145 release authorization dossier
- Status: Completed
- Last updated: 2026-08-28

## Approval And Scope

- [x] 用户是否明确授权只读 fetch、remote reconciliation、clean-source 集成和本地 commit candidate？
- [x] 是否明确排除 push、PR、merge、tag、publish、workflow dispatch 与 production action？
- [x] 是否把远端漂移、patch/hash漂移和 trust boundary 变化定义为立即停止条件？

## Source And Git Safety

- [x] 是否拒绝把当前 dirty worktree直接作为 commit source？
- [x] 是否使用 fresh `origin/main` 的独立 worktree/branch，并保留 shared index hash receipt？
- [x] 是否固定 T143 patch、source manifest、artifact、descriptor 与 workflow hashes？
- [x] 是否要求 staged diff 检查 secrets、环境文件、本机路径、generated reports 和 scope drift？

## Traceability

- [x] T146-T148 是否串行映射 remote、integration 与 commit candidate 三个授权动作？
- [x] 每个 task 是否具有 dependencies、allowed files、validation、evidence 和 stop conditions？
- [x] 是否明确本地 commit不自动授权远端 Git handoff下一段或 public release？

## Findings

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

## Gate

用户已于 2026-08-28 对精确 G003-R2A scope 给出明确执行授权；checklist 无阻断 finding。
