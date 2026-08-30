# G003-R1 TellPlot 2.0 发布准备 Spec

## Metadata

- Feature ID: `016-tellplot-v2-release-readiness`
- Goal ID: `G003-R1`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-28
- Approval: 用户在审阅 G003 目标级 evidence 与下一阶段建议后，于 2026-08-28 明确要求创建目标并完成
  TellPlot 2.0 发布准备阶段；远程 Git、tag、npm publish、GitHub Release 与生产变更仍保留独立闸门

## Objective

把已经通过 G003 完整质量矩阵的本地 `tellplot@2.0.0` candidate 转换为可从最终 clean source 确定重建、
可由受保护工作流安全接管、并具备完整人工发布授权材料的 2.0 发布准备结果。当前目标只完成本地发布链路、
候选复演和目标级 review，不执行任何远程或公开发布动作。

## Prerequisites

- G003 与 T135-T141 已由用户于 2026-08-28 从 `Needs_Review` 明确验收为 `Accepted`。
- TDR-026、Technical Plan 与 T142-T145 Work Graph 必须由用户明确批准后才能执行。
- 当前本地 `main` 为 `cd90ddf3d27bb323c994b5ba01735a4972c46f48`，本地观察到的 `origin/main` 为
  `4d754cc9d635d097370b674633c972fb0ac199a1`，后者新增双语 README lineage；这不是远端 freshness 证明。

## User Stories

### US-REL2-001 可复现的 2.0 发布候选

维护者可以从隔离的 clean source 重建唯一 `tellplot-2.0.0.tgz`，并以固定 manifest、size 和 SHA-256
确认它与待发布内容一致。

### US-REL2-002 失败关闭的发布链路

维护者可以通过 2.0 专用发布合同、preflight 和受保护 workflow 阻止错误 tag、错误 commit、错误 artifact、
已占用版本、非官方 registry、错误 Trusted Publisher 或缺少人工批准的发布。

### US-REL2-003 可审查的发布授权包

发布审批者可以在任何远程动作前看到准确的 source、artifact、测试、风险、工作流、人工步骤与停止条件，
并分别批准或拒绝 Git handoff 和 npm/GitHub release。

## Functional Requirements

### REL2-FR-001 G003 验收依赖

G003 与 T135-T141 的状态必须保持 evidence 驱动。未经用户明确验收，不得把它们或 G003-R1 自动标记为
`Accepted`，也不得以创建发布目标替代 G003 acceptance。

### REL2-FR-002 2.0 当前发布合同

HEAD 上的当前发布工具必须以一个确定的 2.0 release descriptor 统一声明 package `tellplot`、version
`2.0.0`、annotated tag `v2.0.0`、evidence task、artifact path、workflow ref、official registry、Node/npm/pnpm
toolchain 与固定 SHA-256。脚本、测试和 workflow 不得各自维护互相漂移的版本事实。

`v1.0.0` tag、`.ai-platform/evidence/T131/**`、公开 1.0 tarball/hash/provenance/release report 保持历史不可变；
HEAD 的 current-release 工具可以在 TDR-026 获批后从已发布 1.0 lineage 切换到 2.0，但不得回写或伪造 T131。

### REL2-FR-003 受保护的 2.0 workflow

本地 workflow definition 必须固定 exact `v2.0.0` tag、peeled commit、`main` commit、workflow ref、唯一
tarball 与 SHA-256。无 OIDC 的 verify job 负责 source/full-gate/artifact 验证；带 OIDC 的 stage job 只使用
固定 npm CLI、`npm stage publish --ignore-scripts --tag=latest --provenance`、`npm-production` environment 和
最小 permissions，不安装项目依赖、不 build、不运行仓库脚本，也不直接执行 `npm publish`。

### REL2-FR-004 隔离 source 与 lineage rehearsal

当前 dirty worktree 不能作为公开发布来源。发布准备必须使用外部临时 Git index 或 archive，从明确记录的
base 构造隔离 source，整合 G003 reviewed patch 与本地可见的双语 README lineage，执行 frozen install、build、
package、release audit、artifact 与 rehearsal，并证明不改写 shared index、branch、tag 或 remote。

若本地 `origin/main` 在未来获准 fetch 后发生变化，最终发布前必须重新整合并重跑；当前目标不得把本地
tracking ref 描述为实时远端状态。

### REL2-FR-005 Final artifact freeze

最终本地 release artifact 必须连续重建至少两次，filename、size、file manifest 和 SHA-256 完全一致。
release descriptor、workflow hash receipt 与 evidence manifest 必须引用同一 artifact。任何 source、packlist、
toolchain 或 workflow contract 变化都会使该 freeze 失效并要求重建。

### REL2-FR-006 完整本地质量矩阵

2.0 current-release 工具变更后必须重新运行 format、lint、strict type、coverage、build、package、framework、
current/previous browser、a11y、performance、dependency/security、architecture、release audit、artifact 和
isolated-source rehearsal。不得复用 T141 的通过结论替代本阶段 fresh verification。

### REL2-FR-007 双重后续授权

G003-R1 完成后只进入 `Needs_Review`。后续至少需要两个独立明确授权：

1. Git handoff：同步远端、stage、commit、push、PR/merge 或等价 clean-main 集成。
2. Public release：annotated tag、tag push、protected workflow、npm stage、人工 2FA approval、GitHub Release、
   registry/provenance/fresh-install verification。

任何一个授权不得从另一个授权、目标验收、积极语气或历史发布权限中推断。

## Non-Functional Requirements

- REL2-NFR-001：不改变 G003 已批准的 public API、schema `3.0.0`、图表行为、数据不变量或 G2 ownership。
- REL2-NFR-002：不新增 dependency，不修改 lockfile，不改变 private workspace package versions。
- REL2-NFR-003：不输出 token、registry credential、业务数据、本机临时绝对路径或 category/series/value/source
  明细。
- REL2-NFR-004：所有 release/preflight failure 必须非零退出、稳定诊断并在首个 stage/publish 动作前原子停止。
- REL2-NFR-005：Node 必须精确匹配 `.nvmrc` 的 `22.20.0`；pnpm 与 npm CLI 使用仓库或 workflow 固定版本。
- REL2-NFR-006：本地准备不得执行 fetch/pull/stage/commit/push/PR/merge/tag、`npm stage publish`、
  `npm publish`、GitHub Release 或 production promotion。

## Success Criteria

- REL2-SC-001：release descriptor、scripts、tests 与 workflow 对 2.0 exact contract 无漂移。
- REL2-SC-002：从隔离 source 连续生成的两个 `tellplot-2.0.0.tgz` byte-identical，并有完整 manifest/hash receipt。
- REL2-SC-003：full local matrix fresh 通过，无 skipped/relaxed assertion，无 unresolved Critical/High/Medium finding。
- REL2-SC-004：当前 dirty/non-tag/non-main public source 被 preflight 失败关闭；通过路径由隔离 fixture 证明。
- REL2-SC-005：T131 evidence 与已发布 1.0 release report 保持 byte-for-byte 不变。
- REL2-SC-006：release authorization dossier 明确列出 Git 与 public release 两个后续闸门、精确输入、人工步骤、
  rollback/stop conditions 和未验证的实时外部状态。

## Edge And Failure Cases

- npm 已存在 `tellplot@2.0.0`、registry 不可达或 metadata 不一致：未来 public preflight 原子阻断。
- `v2.0.0` 已存在、是 lightweight tag、peeled commit 不匹配或 remote main 漂移：未来 Git/release gate 阻断。
- artifact hash 与 descriptor/workflow/evidence 任一不一致：本地门禁阻断。
- Trusted Publisher、protected environment、2FA 或 provenance 配置未知：不得以本地测试推断 ready。
- stage 已创建但尚未公开：停止后保留 stage ID 和 artifact receipt，由人工决定 approve/reject，不自动重试。
- README lineage、packlist 或 release-only docs 合并产生冲突：显式整合并重跑，不丢弃任一已确认内容。

## Non-Goals

- 实际 fetch/pull、stage、commit、push、PR、merge 或更改远程默认分支。
- 创建、移动、覆盖或推送 `v2.0.0` tag。
- 查询或修改 npm/GitHub account、Trusted Publisher、environment、ruleset、stage 或 dist-tag。
- 执行 `npm stage publish`、`npm publish`、人工 2FA approval、GitHub Release 或生产部署。
- 新图表、产品范围、public API/schema、dependency、性能预算或测试阈值变化。

## Acceptance Criteria

- REL2-AC-001：Prerequisites、REL2-FR-001 至 007、REL2-NFR-001 至 006 均有 task 与 validation coverage。
- REL2-AC-002：T142-T145 形成串行、无文件 ownership 冲突的 work graph 与 self-contained packets。
- REL2-AC-003：planning analysis 为 Critical 0 / High 0，且任何 execution 仍受 plan/work graph approval 阻断。
- REL2-AC-004：目标完成后只报告本地 release readiness，不宣称 npm 版本可用、remote 最新、tag 已创建或公开发布。

## Clarifications

- 2026-08-28：用户在收到“先验收 G003，再创建 G003-R1”的明确下一步后要求创建目标并完成下一阶段；
  G003/T135-T141 完成目标级验收，采用 G003-R1 作为 2.0 本地发布准备目标。
- 2026-08-28：沿用此前明确边界，远程 Git 与实际 publish/release 不属于本目标执行授权。
- 2026-08-28：当前 goal 创建授权确认 requirements scope；TDR-026、Technical Plan 与 Work Graph 仍需单独批准。

## Open Questions

无阻断性产品问题。外部 registry、GitHub、Trusted Publisher 与远端 Git freshness 只在获得对应授权后验证。
