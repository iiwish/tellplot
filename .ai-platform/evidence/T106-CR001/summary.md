# T106-CR001 Evidence Summary

## Metadata

- Task: T106-CR001 - 递归分组与图表直接编排闭环
- Attempt: T106-CR001-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-16
- Execution: Codex direct TDD execution；spec、engineering 与 visual/QA 分离复审

## Scope Result

`ViewSpec.groups` 使用规范化递归有序森林，图表、结构大纲、键盘、持久化与导出复用同一套确定性 command 和 projection。SourceData、金额与来源 ID 保持只读；未引入第二图表库、动画框架或新的 runtime dependency。

图表排序 amendment 使用 pointer down 时的 G2 scene 水平边界快照。拖动柱子的真实 `minX/maxX` 随 pointer X 平移，越过同父级相邻柱边缘即触发 live preview；Y 坐标与柱高不参与排序。手势在水平位移达到 4px 前保持 pending，密集柱上的轻微抖动仍是点击。回拖到原位会清除目标，pointer up 只在存在合法目标时提交一个命令。

起点、终点、小计、显式 pinned 项及包含 pinned 后代的折叠组均不可拖动；锁定项和只读项仍可点击选择。pointer capture、外部 release、cancel、lost capture、Escape、blur 与 unmount 走统一清理路径，不留下 overlay、交互状态或 history。

## TDD Evidence

RED:

- acceptance tests 首轮稳定暴露 locked click 无 selection、密集柱 `<4px` 抖动提前发布 dragging/overlay，以及 pending release 多发 idle 事件。
- review 继续发现 readOnly click selection、locked press capture/outside release cleanup 与回拖清 target 缺口。
- 原排序依赖目标 element 的二维命中，无法在拖动柱边缘先越界而 pointer 尚未触碰目标柱时预排。

GREEN:

- `resolveChartHorizontalDropTarget` 只接收 X 和真实水平边界，覆盖左右、最远越过、不同柱宽与回原位。
- `pending-bar`、locked/readOnly selection press 与 drag 共用 pointer lifecycle；4px 判定只看水平位移。
- targeted interaction 47/47、全量 unit/component 292/292、fresh coverage、selected Chromium 21/21、axe 7/7、production Chromium projects 32/32 全绿。
- 200 项、30 samples 的 production Chromium p95 为 26.4ms；同目标 100 次 pointermove 的 React root commit delta 为 0，阈值仍为 150ms。

REFACTOR:

- 递归 parent/leaf/coverage traversal 集中到 `viewTree.ts`，移除领域、projection 与 outline 中的单层扫描。
- 图表高频 pointer 状态保留在 refs/单个 animation frame；canonical projection 与 preview projection 分离。
- Playwright 使用 production Vite build + strict-port preview，避免把 React/Vite development instrumentation 当作发布性能信号。

## Invariant And Interaction Matrix

| Scenario | Expected identity | Evidence |
| --- | --- | --- |
| 3-level create/move/collapse/expand | 每个 source 恰好出现一次，金额总计不变 | recursive domain/property/projection tests |
| cycle/orphan/multiple parent/duplicate coverage | 原子拒绝，revision/history 不变 | validation and command tests |
| atomic marquee create/collapse | 1 revision、1 undo entry | component + real Chromium |
| translated real-width reorder | X 边缘越界即预排，Y 完全忽略 | helper/component + real Chromium |
| `<4px` jitter / vertical-only movement | 点击选择，0 move、0 drag preview | component tests |
| locked/readOnly press | 点击可选择，拖动拒绝，capture 完整释放 | component + locked-anchor Chromium |
| live preview/cancel/return | canonical ViewSpec 与 history identity | component/performance/E2E |
| exact nested ungroup | 直接 children 原位恢复，父 group 保留 | unit + in-app browser |
| persistence/export | nested order、collapsed state、visible labels 一致 | unit + selected Chromium export |

## Review Verdict

- Spec review: WF-FR-003 至 009 与 WF-NFR-001 至 004 均有直接测试和浏览器证据；SourceData、统一命令入口、单 renderer 与依赖边界保持。
- Engineering review: 独立复审确认真实柱宽 X-only、4px pending、系统锚点/pinned 锁定及 pointer lifecycle 均落在同一 adapter 门控；review findings 全部修复，无未解决 Critical、High 或 Medium finding。
- Visual/QA review: 分组、嵌套展开/折叠、精确解组与 undo/redo 已验收；本 amendment 的真实 Chromium 与 in-app browser 证明 pointer 位于目标柱垂直范围之外且尚未触碰目标柱时仍可右向预排。in-app browser 复验中，经营利润小计的水平拖动保持 revision 不变并回到 idle；三个系统锚点另有独立 Chromium 回归。

## Validation Result

- Unit/component: 28 files、292 tests；targeted chart pointer/state 47/47。
- Coverage: aggregate 90.20% statements、83.96% branches、92.27% functions、90.30% lines；domain 与 waterfall 继续高于 95% contract。
- Browser: selected Chromium 21/21；axe Chromium 7/7；production full Chromium projects 32/32。
- Performance: 200 visible contributions、30 samples、p95 26.4ms、same-target root commit delta 0。
- Package/tooling: typecheck、ESLint、Prettier、build、publint、ATTW、ESM/CJS runtime、types consumer 与 `git diff --check` 通过。

## Residual Risk

- 真实 Chromium 的 X-only 边缘 crossing 覆盖右向路径；左向、最远越过与显式 pinned contribution 由 helper/component tests 覆盖。实现共用同一水平解析器和 `datum.locked` 门，不构成当前验收阻塞。
- Firefox/WebKit browser binaries 与 React 18.3/19.2 host matrix 属于 T108。
- 性能 probe 当前保守计入 Playwright 调度和 Fiber root 识别成本；production p95 留有充足余量。capture-phase pointerup 起点与 root 缓存可作为后续独立测试精度改进，不改变本期 150ms contract。
- Playground production build 仍提示 G2 lazy chunk 超过 500kB；editor package 保持 G2 peer external，最终 bundle budget 属于 T108。
- artifact validator 的 task-id parser 只接受 `TNNN`，不能识别 amendment ID `T106-CR001`；feature-level validator 是有效门禁。

## Scope Confirmation

- 未执行 commit、push、PR、merge、publish 或其他远端写操作。
- 用户于 2026-07-16 明确接受 T106-CR001。
- T107 兼容证据刷新已解除依赖阻断；T108 继续等待 T107 验收。

## Acceptance Receipt

- Decision: `Accepted`
- Accepted by: User
- Accepted on: 2026-07-16
- Downstream gate: T107 兼容证据刷新已解锁；T107 仍需独立验收，T108 保持 `Draft`。
