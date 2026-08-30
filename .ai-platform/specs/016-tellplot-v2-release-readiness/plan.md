# G003-R1 TellPlot 2.0 发布准备 Technical Plan

## Metadata

- Feature ID: `016-tellplot-v2-release-readiness`
- Goal ID: `G003-R1`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-28
- Approval: 用户于 2026-08-28 明确批准 TDR-026、本 plan 与 T142-T145 Work Graph

## Delivery Strategy

1. T142 先以 RED contract tests 固定 2.0 current-release descriptor、脚本与 workflow 的单一事实来源，并把
   HEAD 发布语义从历史 1.0/T131 精确切换到 2.0，而不修改 T131 evidence 或已发布 tag。
2. T143 在外部临时 index/archive 中组合本地可见 `origin/main` 双语 README lineage 与 G003 reviewed tree，
   关闭文本冲突，连续重建最终 `tellplot-2.0.0.tgz`，冻结 manifest 与 SHA-256。
3. T144 从该隔离 source fresh 运行完整 release/quality matrix，验证 dirty/错误 tag/hash/registry 等负向路径，
   不查询或改变未经授权的远程外部状态。
4. T145 汇总三层 review、artifact/source/quality receipts 与 release authorization dossier，把 G003-R1 推到
   `Needs_Review`；Git handoff 和 public release 留给后续独立授权。

## Current Release Descriptor

T142 引入 repository-owned structured descriptor，作为 HEAD 当前 release 的唯一机器事实源。descriptor 至少包含：

- package: `tellplot`
- version: `2.0.0`
- tag: `v2.0.0`
- evidence task/artifact root: T143 最终 artifact evidence
- official registry: `https://registry.npmjs.org`
- workflow: `.github/workflows/publish-npm.yml`
- Node: `22.20.0`
- pnpm: `11.1.3`
- staged-publishing npm CLI: 现有 workflow 已固定并由 focused contract tests 证明的 exact version
- artifact filename、size、SHA-256 与 file manifest receipt

T142 可用 T141 已验证 candidate hash
`44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca` 作为初始精确 baseline；T143 必须
从最终隔离 source 重建并原子刷新 descriptor、workflow hash 与 evidence。如果最终 hash 相同，仍记录 fresh receipt，
不能把 T141 manifest 直接复制成 T143 结论。

## Historical Lineage Boundary

- `.ai-platform/evidence/T131/**`、`v1.0.0` tag 内容、1.0 registry/provenance 与
  `.ai-platform/docs/release-report.md` 保持不可变历史记录。
- TDR-025 在 G003 内要求 legacy published-lineage scripts/workflow 不变；TDR-026 仅在 G003-R1 获批后允许
  HEAD current-release implementation 转向 2.0，不 retroactively 改写 T141 evidence 声明。
- 当前 HEAD 无需继续通过 1.0 exact release assertions；历史 reproducibility 由 `v1.0.0` tag 与 T131 receipts
  保证。测试必须同时证明 T131 files 未修改、HEAD current contract 精确为 2.0。

## Source Integration Model

```text
observed local origin/main (4d754cc...)
  + reviewed G003 cumulative product patch/evidence manifests
  + approved G003-R1 release-only patch
  -> isolated integrated source
  -> frozen install + build + tests + package
  -> T143 exact artifact + descriptor/workflow hash
```

- 不调用 `git fetch`、`pull`、`merge`、`rebase`、`add`、`commit`、`push` 或 tag 命令改变共享/远端状态。
- 使用临时 archive/index 验证 patch 应用、文件 receipts 与 shared index hash unchanged。
- `README.md` 必须语义整合远端双语导航与 G003 2.0 内容；不得选择一侧覆盖另一侧。`README.en.md` 保持
  remote lineage 内容，除非 2.0 public docs contract 要求同步的精确版本/API 更新。
- 未来 Git handoff 获批后先 fetch 并比较远端；若 `origin/main` 变化，T143/T144 freeze 失效并重跑。

## Workflow Model

```text
manual workflow_dispatch on exact v2.0.0 tag
  -> verify job (no OIDC)
     -> exact tag/main/workflow/source checks
     -> frozen install + full local gates
     -> rebuild + verify exact T143 tarball/hash
  -> npm-production approval
  -> stage job (OIDC only)
     -> sparse checkout immutable artifact
     -> verify remote main/tag + registry vacancy + SHA-256
     -> npm stage publish --tag=latest --provenance
  -> human artifact review + WebAuthn/2FA approval (future authorization)
```

Stage job 继续禁止 pnpm、项目 install/build、repository scripts 与 direct `npm publish`。workflow definition 可以
在本目标本地修改和测试，但不得被触发。

## Validation Strategy

### Focused Contract Gates

- exact release descriptor schema and path validation
- 2.0 version/tag/evidence/artifact/workflow/hash consistency
- historical T131 evidence immutability receipts
- workflow permissions/job ordering/stage-only/provenance/minimal OIDC assertions
- public preflight fixtures: dirty, wrong branch/tag, lightweight tag, stale main/tag, hostile Git rewrite, wrong hash
- official registry URL and occupied/unavailable version fail-closed fixtures without live registry access

### Full Local Matrix

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:coverage`
- `pnpm build`
- `pnpm test:package`
- `pnpm test:framework-matrix`
- `pnpm test:e2e`
- `pnpm test:a11y`
- `pnpm test:performance`
- `pnpm test:browser-previous`
- `pnpm security:lock`
- `pnpm security:dependencies`
- `pnpm audit:prod`
- `pnpm release:architecture`
- 2.0 `release:audit`、`release:artifact`、`release:check` 与 `release:rehearse`
- delivery artifact validator、patch replay、`git diff --check`

## Constitution Check

- P-002/P-003/P-005：不改变数据、命令或图表行为；满足。
- P-006：不改变 G2 ownership；满足。
- P-010：以 fresh full matrix、exact artifact 与 independent review 为结论来源；满足。
- Dependency Policy：无 dependency/lockfile/private version 变化；满足。
- Goal-Level Delivery：G003 acceptance、planning、Git handoff 与 publish/release 保持独立明确闸门；满足。
- Git And Review Policy：本目标不 stage/commit/push/tag/publish；满足。

## Risks And Mitigations

- Current release scripts 从 1.0 转向 2.0 造成历史误读：T131/tag/release report 不变，descriptor 与测试明确
  区分 historical release 和 HEAD current release。
- 本地 `origin/main` 过期：evidence 明确称 observed tracking ref；未来获准 fetch 后比较并按变化重跑。
- README integration 改变 artifact：root README 不直接进入 tarball，但所有 source/packlist changes 仍触发 T143 rebuild。
- workflow hash 写死后 source 漂移：descriptor、workflow 和 manifest 原子更新；preflight 比较 exact SHA。
- npm/GitHub external state 未验证：T145 dossier 标记 `Not_Run_Not_Authorized`，不得报告 release-ready external state。
- full matrix 时间长或环境饱和：保留 exact thresholds；环境失败可在冷却后 fresh replay，不修改 timeout/断言。

## Evidence Layout

- `.ai-platform/evidence/T142/`: contract/pipeline TDD、diff、focused review
- `.ai-platform/evidence/T143/`: integrated-source manifest、patch replay、artifact、descriptor/hash receipts
- `.ai-platform/evidence/T144/`: full matrix、isolated rehearsal、negative preflight receipts
- `.ai-platform/evidence/T145/`: three-lens review、goal summary、release authorization dossier

## Release Boundary

本 plan 完成只证明本地 `tellplot@2.0.0` release readiness。以下动作继续未授权：fetch/pull、stage、commit、
push、PR/merge、annotated tag、tag push、workflow dispatch、npm stage/public approval、GitHub Release、dist-tag、
production promotion 与任何 account configuration。
