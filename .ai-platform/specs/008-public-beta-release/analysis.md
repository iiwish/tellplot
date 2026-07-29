# G004 首个公开 Beta 发布一致性分析

## Metadata

- Feature ID: `008-public-beta-release`
- Version: 0.1.0
- Status: Superseded
- Last updated: 2026-07-23

## Requirement Coverage

| Requirement | Task | Evidence |
| --- | --- | --- |
| REL-FR-001 至 REL-FR-003 | T120 | architecture report、clean-clone full matrix |
| REL-FR-004 至 REL-FR-007 | T120 准备；T121 执行 | public surface、scope/auth、tarball/dist-tag |
| REL-FR-008 | T121 | public registry consumer、tag/release/site smoke |
| REL-NFR-001 至 REL-NFR-004 | T120、T121 | scope audit、secret audit、traceability、compatibility |

## Architecture Findings

- Critical: 0
- High: 0
- Medium: 0
- Low: 3

1. `WaterfallCanvas`、`CategoricalCanvas` 和 `FinancialChartEditor` 较大，两个 Canvas 存在真实交互编排
   重复；当前测试与 family adapter 边界完整，发布前重构会扩大回归面。
2. `charts/**` 和 export 通过 `components/formatAmount.ts` 使用纯格式化函数，目录 ownership 不理想但不形成
   runtime cycle；T120 防止新的低层到 components 依赖。
3. 现有 architecture test 锁定关键 G2 边界，但没有完整验证所有目录依赖方向和 runtime cycles；T120 补强。

这些 finding 不改变当前行为、公共 API 或包消费；G002 系列目标级验收包含 G002-R3 公共配置 API。

## Ordering And Gates

- T120 依赖 G002、G002-R1、G002-R2 与 G002-R3 全部通过目标级验收。
- T121 必须等待 T120 review 和独立远程授权，不能与 T120 并行。
- T120 packet 完整；T121 在外部权限与授权满足后生成。
- 未发现 placeholder、requirement gap、dependency contradiction 或 constitution violation。

## Verdict

`SUPERSEDED`。T120/T121 不执行；当前稳定版目标位于
`.ai-platform/specs/010-stable-v1-release/`。
