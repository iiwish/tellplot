# T140 Execution Summary

## 结论

T140 implementation、candidate validation、packet validation commands与三层终审均已完成；spec-compliance、
bug/code-quality 与 QA-acceptance 最终均为 Critical 0 / High 0 / Medium 0，任务进入 `Needs_Review`，不代表用户
`Accepted`。

## Baseline 与范围

- 执行基于已 review 的 T135-T139 dirty baseline。`diff.patch` 从 A001 task-local baseline 与最终 allowed-path
  tree 机械重建；在隔离副本中 replay 后与最终 48 个 T140-owned files byte-for-byte 一致，不包含 predecessor、
  build output、`node_modules` 或 evidence 自身。
- 用户于 2026-08-27 批准 TDR-025-A01 与完整 T140 amendment；A008/A009 只在批准的 canonical comparison
  spec、export/package/docs/playground/candidate/evidence ownership 内恢复。
- 未修改 dependency、lockfile、private package version、public export map、publish workflow、accepted release
  scripts、T131 evidence、T141、remote Git 或 production state。

## 实现

- Canonical comparison spec 保留 T137 原始 paint order，main interval 是唯一 axis/legend guide owner。所有
  post-interval value-label、annotation 与 group-label point helpers 继续使用 `axis:false` / `legend:false`，并通过
  private namespaced G2 x/y/series scale keys 隔离 guide merge；无透明 guide-owner、第二 renderer、第二 projection
  或业务数据 carrier。
- SVG/PNG 继续通过 generation-discriminated private request 与 fresh offscreen G2 重用同一 comparison
  projection/spec。真实 bar/column、2/4-series、mixed/all-zero、empty 与 live reorder evidence 保持绿色。
- 八格真实 SVG matrix 以 DOM order、series palette 与对应 interval 做 category-axis center匹配；axis/legend text被
  结构性排除。每个 helper 都有非零 local `getBBox()`，中心比较统一使用相对 SVG 的 visible client bbox。
- Public-only actual-vs-budget 与 four-series workbench journeys 都完成 group edit、collapse、annotation、ViewSpec
  JSON export/import、live ViewSpec panel、SVG 与 PNG export。expanded group label在collapse前验证first-member
  category cluster center与真实labelValue endpoint；collapsed annotation精确验证2-series tie的source-first
  actual与4-series stretch endpoint，而不是匹配任意mark。
- ViewSpec import不是no-op receipt：export collapsed+annotation后先expand并改写annotation，再import旧JSON，
  验证collapse/annotation恢复，随后重导JSON与原文件byte-for-byte一致。
- Legal-empty real SVG/PNG 覆盖 legend on/off；启用时保留 source-ordered registry，禁用时不产生 legend text，
  两种情况都保留 title、dimensions、opaque background 与 nonblank output。
- Local public manifest 为 `tellplot@2.0.0`；export map不变，private layers 保持 `0.0.0`，public delta严格为
  16 comparison types 与唯一 runtime projector `projectCategoricalComparison`。
- Candidate artifact/rehearsal 在 build/write 前强制 actual `process.versions.node` 精确匹配 `.nvmrc`，不接受环境
  override；`.ai-platform/evidence` ancestor、evidence root、nested artifacts directory、manifest leaf 与 receipt
  leaf symlink 均统一 fail closed，输出 `Candidate arguments rejected.` 且不泄漏被测绝对路径。Audit 保持
  cross-runtime pure audit；isolated rehearsal只创建空的本地evidence gate root，不复制既有evidence。
- `README.md`、`docs/api.md`、`docs/getting-started.md` 与 `packages/tellplot/README.md` 明确使用本地candidate
  tarball；future registry install仅是正式发布后的条件式说明，不声明2.0已发布。
- Migration preserve narrative reference先验证old source/view与target config，要求dataset/chart/category set兼容，
  构造fresh v3 revision 0并深拷贝arrays/records；可执行runtime fixture覆盖success identity、输入不变与三类
  mismatch原子拒绝。

## RED 与恢复历史

- A001-A004 保留 comparison dispatch、browser journey 与真实 SVG axis 的既有 RED/stop history；A004 interval
  reorder虽恢复 SVG category labels，但破坏 T137 Canvas paint order，因此停止。
- A006 透明 guide-owner 方案使局部测试绿色，但独立 review 认定它违反 helper guide contract；TDR-025-A01 与
  T140 amendment 经用户批准后，A006 不作为最终实现或 evidence 结论。
- A008 canonical spec RED：13 tests 中 2 tests 按预期失败，分别证明仍存在 guide-owner 且 helper scales未设置
  private key。移除 carrier并在 exact-owned `comparisonSpec.ts` 隔离 helper scales后 13/13 GREEN。
- A008 candidate RED：fake `.nvmrc` 与 matching env override使 artifact/rehearse绕过 actual runtime，随后暴露
  临时路径；移除 override并统一 rejection boundary 后 candidate tooling 8/8 GREEN。
- A008 empty-browser 首轮是测试前置条件错误：合法空图进入 `empty` 而非 `ready` screen state。测试改为验证
  public empty state 后 legend on/off real SVG/PNG 2/2 GREEN；未为此修改产品行为。
- A009 real SVG receipt RED：局部 `getBBox()` 坐标直接比较时8个matrix与2个journey共10项按预期失败，偏差证明
  旧receipt不能验证全局anchor；统一visible SVG坐标后8/8 matrix与2/2 journey GREEN，未发现产品错位。
- A009 candidate ancestor RED：symlinked `.ai-platform/evidence` 被旧validator跟随，随后泄漏fake-root ENOENT；
  ancestor lstat/realpath containment后candidate tooling 9/9 GREEN，三个command统一closed/no-path-leak。
- A009 docs RED：旧harness拒绝 `compose-runtime` metadata，加入runtime composition后又以严格TS4111暴露fixture
  index-access问题；修正后4 documents / 10 fences / 1 runtime composition GREEN。
- A009 formal rehearsal RED：新增ancestor检查后，clean-source副本因有意排除evidence而缺少audit gate root；
  rehearsal在隔离临时目录创建空的safe T140 root后完整frozen install/build/package/audit GREEN。没有复制旧evidence。

## Candidate Receipt

- Artifact: `tellplot-2.0.0.tgz`
- Node: `22.20.0`，与 `.nvmrc` 精确一致
- Size: `597340` bytes
- SHA-256: `8b572af88be4dc9a3c2f970afee4ea4e5d297af8307baf6b4f38de3861fb2143`
- Reproducibility: 连续两次 canonical artifact command得到相同 filename、size、SHA-256 与 file manifest。
- Isolated source: 588 source files；frozen install、build、package tests 与 candidate audit passed；临时绝对路径
  已 redacted。
- Task-local `diff.patch`: 48 files，164506 bytes；从HEAD加T135-T139 reviewed patches机械重建baseline，replay后
  与最终T140-owned scope byte-for-byte一致。

## 残余风险

- Candidate 仍是 local-only，未 publish、tag、release 或 production promotion。
- T140 browser acceptance 以 Chromium 为准；更广 browser/performance/responsive matrix 属于 T141。
- T140 尚待用户目标级 acceptance；三层 independent review见`review.md`。
- A009没有未解决的Critical/High/Medium finding，也没有发现需要扩大owner source的真实图表产品缺陷。
