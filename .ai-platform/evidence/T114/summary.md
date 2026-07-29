# T114 方向感知分类轴交互 Evidence

## Status

- Task: `T114`
- Packet: `.ai-platform/specs/004-categorical-chart-validation/packets/T114.yaml`
- Attempt: `T114-A001`
- Executor: Codex direct execution
- Worktree: `codex/t112-categorical-data-contract`
- Status: `Accepted`
- Direct reason: 用户明确要求 T113 clean review 后继续 T114；review 无 actionable finding，条件授权成立。

## Outcome

T114 已建立一个内部 X/Y category-axis geometry kernel，并让现有 waterfall/column X adapters 委托给该
kernel。新 primitives 只读取 G2 pointer coordinate 与 scene `getBounds()`，处理 scalar axis projection、
4px threshold input、frozen bounds revision、translated edge collision、minimum pointer target 和结构化失败。
T114 没有修改 React component、categorical projection/spec、export、CSS、公共入口或 dependency。

## Changed Files

- `packages/editor/src/interactions/categoryAxis.ts`
- `packages/editor/src/interactions/chartPointer.ts`
- `packages/editor/tests/components/categoryAxis.test.ts`
- `packages/editor/tests/components/chartPointer.test.ts`

`moveTargets.ts` 无需修改：现有 `PointerMoveIntent` 与 semantic target resolution 已经 axis-neutral。
`WaterfallCanvas.tsx`、`group-actions.test.ts` 和 categorical files 全部保持只读。

## Axis Parity

| Concern | X / waterfall-column | Y / bar |
| --- | --- | --- |
| Pointer coordinate | `point.x` | `point.y` |
| Bounds | `minX/centerX/maxX` projection | `minY/centerY/maxY` projection |
| Forward order | left-to-right | top-to-bottom |
| Equivalent gesture | same `nodeId` + `before/after` | same `nodeId` + `before/after` |
| Value-axis movement | ignored | ignored |
| Collision | translated source edge crosses sibling edge | identical scalar algorithm |

## Behavioral Evidence

- X/Y scene bounds 只来自完整 G2 rectangle，invalid/non-finite/reversed bounds 被确定性拒绝或跳过。
- `boundsRevision !== currentRevision` 返回 `STALE_BOUNDS`；category movement 小于 4px 返回
  `BELOW_THRESHOLD`；missing source、invalid source bounds 与 no target 使用独立稳定 reason。
- Forward/reverse drag、furthest crossed sibling、return-to-origin、invalid candidate skip 和仅 eligible candidate
  set 均有测试。
- Minimum pointer target 继续做真实二维距离判断，但 before/after edge 只取所选 category axis。
- Hostile G2 event、缺失 datum、抛错 `getBounds()`、invalid context 与 missing scene node 均不抛异常。
- `readChartElementPointer`、`resolveChartHorizontalDropTarget` 与 `readChartTargetX` 保持现有返回 shape 和 deep-equal tests。

## Review

### Spec Compliance

通过，无 blocking finding。实现覆盖 CAT-FR-006/CAT-FR-007 的 T114 primitive 边界，未提前接入 T115
component workflow；没有 fixed bar width/row height 或 value-axis collision。

### Engineering

通过，无 blocking finding。geometry、G2 boundary adapter 与 semantic command resolution 分层明确；locked/
same-parent eligibility 仍由 chart policy 与 caller frozen set 提供，没有复制领域规则或新建 gesture state machine。
严格搜索未发现 `any`、`@ts-ignore`、`@ts-expect-error` 或日志。

### QA Acceptance

通过，无 blocking finding。scoped RED/GREEN、full unit/coverage、typecheck、build、lint、format、artifact validator
和 diff check 均通过；existing group actions 与 horizontal tests 未改期待值。

## Residual Risks

- T114 交付 primitives，不修改 `WaterfallCanvas`；bar Y gesture composition、Pointer capture、RAF、preview 与
  command commit 由 T115 接入并在真实浏览器验收。
- Frozen revision 与 eligible same-parent/locked candidate set 已成为显式输入，但实际 session wiring 属于 T115。
- 当前 parity 使用 renderer-shaped fixtures；真实 G2 transpose 后的 Y bounds、200-item performance 与动画中断由
  T115/T116 验收。
- Playground build 保留既有大 chunk warning；构建成功，T114 未增加 runtime dependency。

## Acceptance Gate

用户于 2026-07-19 要求独立 review T114，并明确授权在无问题时设计后续长目标。fresh review 无任何
actionable finding，条件验收成立；T114 标记为 `Accepted`，解锁 T115 packet 与单任务执行。
