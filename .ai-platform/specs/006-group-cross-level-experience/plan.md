# G002-R1 分组与跨层编辑体验 Plan

## Metadata

- Feature ID: `006-group-cross-level-experience`
- Goal ID: `G002-R1`
- Version: 0.1.0
- Status: Confirmed
- Last updated: 2026-07-20
- Approval: 用户已批准 G002-R1 目标级连续执行

## Baseline

- G001 / T101-T116 已验收；G002 / T117 release candidate 保留在当前 dirty worktree。
- G002-R1 外部快照：`/tmp/tellplot-G002-R1-baseline.y3LKch/worktree/`。
- Manifest：`/tmp/tellplot-G002-R1-baseline.y3LKch/manifest.sha256`，314 files，SHA-256
  `367c1074a1c0021c78e9859405d4f49d76e55ba0815da9bc380e922c5cd3564c`。
- 不使用 HEAD 代替 accepted baseline，不 reset、stash、stage 或 commit。

## Delivery Strategy

1. 用组件测试锁定 Inspector 上下文行为，并保持 selection callback wire 不变。
2. 扩展内部 pointer placement，先让 outline 和 resolver 支持 inside，再让 chart 候选跨 container。
3. 修改唯一 command executor，在跨容器移动中原子解散两成员来源 group，并验证 undo/redo 和不变量。
4. 建立共享 `ExpandedGroupRegion` 投影，waterfall、column 和 bar 的 G2 spec 共同消费。
5. 扩展 `FinancialChartAppearance.groupRegion`，屏幕和 export 共享相同 resolved appearance 与 spec。
6. 完成真实浏览器、视觉、a11y、performance、package 和兼容性回归，生成目标级 evidence。

## Interaction Decisions

- `MoveTargetPlacement = before | after | inside` 是内部 adapter 语义，不进入公共 command schema。
- group 中间 50% 为 inside，首尾各 25% 为 before/after；普通 item 保持二分 before/after。
- expanded group 没有独立主 mark，拖到其可见 child 的边缘即可解析到该 group container。
- collapsed group 中心 inside 默认追加到 group 末尾，group 保持 collapsed。
- chart pointer-down 快照包含所有可移动 projection element bounds，不包含背景 range mark。
- 直接移动失败继续由 command executor 提供唯一合法性结论，不复制 segment/cycle/pin 规则到 Canvas。

## Domain Decisions

- 来源 group 有三个及以上 direct children 时正常移除移动节点。
- 来源 group 恰有两个 direct children 且发生跨 container 移动时，用 remaining child 原位替换 group。
- dissolved group 的 collapsed ID、annotation 和 emphasis 删除；child/source 数据不变。
- destination index 继续使用 active-node removal 后语义；group replacement 不改变来源父 container 的长度。
- 同 container move、no-op、循环、锁定和 cross-segment 行为保持现有合同。

## Rendering Decisions

- `projectExpandedGroupRegions(viewSpec, projection)` 只依赖稳定 node/source IDs，供所有三个图表消费。
- Region data 使用 `regionId` 而不是 `nodeId`，同时记录成员柱形的实际数值上下界；背景与标签 mark 均设置
  `pointerEvents: none`，不进入柱形命中集合。
- G2 `range` 使用 `[startNodeId, endNodeId]`、`[valueStart, valueEnd]` 和共享 scale；bar 复用 transpose。
- nested region 外层先渲染，透明度按 depth 有界调整；label 使用 interval 之后的独立 G2 `text` mark，并按
  第一个可见成员的柱顶锚定、通过明确 `zIndex` 保持前景，再按 depth 紧凑错位以避免同起点父子标签
  互相覆盖。group 与数值标签均不绘制卡片式背景，只使用 1.5px 圆角高对比文字光晕。数值标签使用另一
  个 interval 后的独立 G2 `text` mark，锚定各柱真实端点并向柱内偏移 2px；低于 group label 的前景
  `zIndex` 保持文字可读，不增加会分割小柱形的矩形底。
- `palette.group` 是唯一 region 色源，公共 API 不增加独立任意颜色或 G2 callback。

## Constitution Check

- P-002 / P-005：只修改 `ViewSpec`，保持来源、聚合和最少两成员不变量。
- P-003：chart、outline、keyboard、host 继续进入相同 command executor。
- P-004 / P-009：不增加平台、registry 或未来抽象。
- P-006：G2 负责 range、band geometry、scene bounds、renderer 和动画。
- P-007 / P-008：chart 和 outline 均可操作，拖拽逐帧且动画可打断。
- P-010：TDD、真实浏览器、export、a11y、performance 和 package evidence 完整。

## Validation Strategy

- RED：Inspector contextual actions、inside resolver、auto-dissolve、group region/config/spec tests 先失败。
- GREEN：按 selection -> resolver/domain -> chart/outline -> region/spec/export 顺序最小实现。
- REFACTOR：仅抽取两个图表真实共享的 region projection/spec helper，不创建通用 chart plugin。
- Final：format、lint、typecheck、unit/coverage、build、package、React、current/previous browsers、a11y、
  performance、artifact validator 和 diff check。

## Risk Controls

- 背景 range mark 不得抢占 element event、空白 marquee 或 Tooltip。
- 自动解散必须清理 group-only 状态，并由 undo/redo 和 persistence regression 证明原子性。
- chart bounds 不得使用固定柱宽/行高或 DOM 估算。
- 新 optional appearance 字段必须通过 package types consumer，不改变默认数据/schema wire。
