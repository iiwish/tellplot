# T137 实施证据摘要

## 结论

T137 已完成实现与 packet validation。分类比较使用单一 interactive G2 interval、显式 category/series/color/value domain、source-ordered read-only legend、shared sorted Tooltip、transparent point helper labels、comparison group regions 与 structural runtime generation。v3 comparison 经私有 `generation: 'comparison'` 路由；v1/v2 scalar 路径使用显式 `generation: 'scalar'` 并保持既有行为。

独立首轮 review 为 Critical 0 / High 0 / Medium 3：comparison auto label density、placement 映射与 Canvas pairing 需要修复。T137-A003 已按 review finding 完成 RED/GREEN 与全量 validation；两次独立终审均为 Critical 0 / High 0 / Medium 0，T137 已进入 `Needs_Review`。`Needs_Review` 不代表用户 `Accepted`。

## Task-local baseline

- RED 前保存 `/tmp/t137-preedit-status.txt`、`/tmp/t137-preedit-tracked.diff` 与 `/tmp/t137-preedit-untracked.tar`。
- baseline 中 T137 允许的 editor/runtime/test/E2E 文件均无既存重叠；T135/T136 runtime、tests、governance 与 evidence 作为只读串行前置保留。
- `diff.patch` 由 baseline 时为 clean 的 T137 tracked paths 的 `git diff`，加上 T137 新文件相对 `/dev/null` 的 diff 组成；不包含 T135/T136 或其他治理变更。
- 唯一实施发现 variance 是在 `packages/editor/tests/runtime/chart-surface.test.ts` 为六个既有 scalar fixture 增加 `generation: 'scalar'`。该 correction 只恢复 required discriminant 的编译，不改变断言或行为，并已同步进 packet allowed-files qualifier。

## 实现范围

- 新增私有 comparison appearance/spec/label adapter：默认 2-4 series palette、安全 per-series override、category-major/series-minor flatten、collision-safe element/helper keys 与精确 G2 scale/dodge contract。
- 使用 transparent G2 point helpers 承载 per-series value labels、max-absolute annotation endpoint 与 all-zero no-series baseline annotation；transform 固定为 flip-to-interior 后 `exceedAdjust(bounds:'main')`，结构读取失败时隐藏 label。
- expanded comparison group region 覆盖 every visible member x every series plus zero；group label 使用首个可见 member 的 full-cluster center 且无 series channel。
- shared Tooltip 对安全编码后的 series name 按 source ordinal 排序；legend 明确禁用 filter/highlight，helper marks 明确禁用 axis/legend/tooltip/animation/pointer。
- comparison `auto` value labels 以 visible mark count `sum(datum.values.length)` 计算密度：`<= 40` 显示，`> 40` 隐藏；compact viewport 仍隐藏。value `inside`/`auto` 锚向 zero、`outside` 远离 zero，annotation 始终远离 zero；group label 的 inside/outside/auto 与 scalar group placement 语义一致。
- runtime 以 `structuralIdentity` 和私有 generation token 管理 registry ID/order/count 改变：取消 queued flush、断开 observer、销毁旧 chart，并拒绝 stale constructor/render/forceFit continuation 回写。
- chart surface 为 comparison 建立私有 spec routing/fresh runtime，并在 T138 authoritative receipt 之前让 comparison direct interaction fail closed。
- architecture 只为 `comparisonSpec.ts` 增加 raw-G2 allowlist；label helper 使用私有 structural type，G2 transform type 仅位于 `rendering/g2`。

## 真实 Canvas characterization

- 固定矩阵：`bar|column x 2|4 series x mixed-sign|all-zero`，共 8 cells。
- 每格验证 visible paint、source-ordered legend marker、每个 node x series 的 value-label 主背景；mixed-sign 将每个 cluster 内的主 label/interval component 按 category-axis 有重数排序后一对一配对，在 6 CSS px 内，并逐 cluster 验证 interval color 严格遵循 source series order。
- 另验证 empty category set 仍显示 4-series source-ordered legend；positive-only 与 negative-only domain 内 all-zero labels 可见且受 Canvas bounds 包含。
- live registry reverse 验证旧 Canvas 被销毁、新 Canvas 建立、legend 可见顺序反转、shared Tooltip items 按当前 source order 呈现。
- A001 首轮 characterization 把黑色数字笔画切出的 `#FF00FF` 背景小连通岛误识别为完整 label，产生 10 px 假阴性。经治理分类后以 A002 恢复，只对真实 Canvas label component 加 `area >= 20` 且 bbox 宽高下限；仍保留 6 CSS px 阈值、真实像素与每格至少 `node x series` 个主背景要求。
- A002 单格 receipt 的四个主背景 bbox 为 `[557,344,583,360]`、`[670,376,696,393]`、`[952,738,986,755]`、`[839,765,872,781]`，到最近 interval category-axis center 的距离为 `0.5/0.5/0.5/0` CSS px。完整 Chromium characterization 为 4/4 passed。

## T137-A003 review fix

- RED：comparison canonical spec 12 tests 中 3 tests 失败，分别证明 value auto/inside 仍在 endpoint 外侧、group inside placement 仍为 outside、visible-mark density helper 缺失。
- GREEN：2-series `20 x 2` 显示、`21 x 2` 隐藏；4-series `10 x 4` 显示、`11 x 4` 隐藏。bar/column 的 value inside/auto/outside、annotation forced-outside 与 group inside/outside/auto 均有精确 structural assertion。
- equal-absolute endpoint fixture 使用 `12/-12`，断言 source-first `actual` 被选择。
- Canvas assertion 不再使用 nearest-any：每个 mixed cluster 的 interval/label 长度精确等于 series count，color 顺序等于 source palette，排序后逐项中心距离 `<= 6` CSS px。
- A003 validation：focused 4 files / 34 tests、editor 28 files / 191 tests、Chromium 4/4 与其余 packet commands 全绿。

## Orchestrator Review Integration

- Spec-compliance review：通过；placement、visible-mark density、matching-series Canvas pairing 与 equal-absolute source-first tie findings 全部关闭。
- Bug/code-quality 与 QA acceptance review：通过；独立复跑 canonical comparison tests 为 12/12，未发现新的 runtime lifecycle、empty registry、group extent、安全 Tooltip、v1/v2 regression 或测试假阳性问题。
- Final findings：Critical 0 / High 0 / Medium 0。
- Task status：`Needs_Review`；这是内部 governed-task review 状态，不代表用户 `Accepted`。T138 的串行依赖已满足。

## 明确未实施

- 未实现 T138 authoritative scene receipt、comparison geometry、drop/ghost/marquee 或 direct manipulation。
- 未实现 T139 最终 Inspector、summary、focus、a11y 或 host parity。
- 未实现 T140 real SVG/PNG comparison export、public playground example、docs、migration/package 2.0 工作。
- 未增加 dependency、未改 manifest/lockfile/package version/public entry、未导入 transitive `@antv/g`。
- 未执行 stage、commit、push、PR、tag、publish、release 或 production promotion。

## Residual risk

Canvas characterization 固定当前 G2 5.4.8、Chromium rasterization 与 6 CSS px tolerance。T140 仍需用真实 SVG `getBBox()` 与 PNG/SVG export matrix 固定 export parity；T138 仍需在当前 structural generation 上建立 authoritative receipt，不能从本任务推断 geometry。
