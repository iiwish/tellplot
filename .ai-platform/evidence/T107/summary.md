# T107 Evidence Summary

## Metadata

- Task: T107 - 实现持久化、导出与可访问性闭环
- Attempt: T107-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-16
- Execution: Codex direct TDD implementation；独立 validation 与 compatibility review

## Scope Result

实现提供确定性 `serializeViewSpec` / `parseViewSpec`、有限 `FinancialChartEditorHandle`、无隐式下载的 PNG/SVG export、当前可见投影的有序文本摘要，以及参考编辑器的 JSON 导入、JSON/SVG/PNG 导出工作流。T106-CR001 验收后的兼容刷新证明递归树、嵌套折叠、强调态和活动拖拽预览均保持同一 ViewSpec、projection 与 G2 chart spec 语义。

T107 未修改 SourceData、财务金额、领域命令、不变量或历史语义；未引入网络、localStorage、autosave、迁移、AI、backend、PowerPoint、第二图表库、动画库或手写 SVG waterfall renderer。

## Locked Behavior

- ViewSpec JSON 确定排序并保留递归 groups、collapse、pin、annotation、emphasis 与 revision；不包含 SourceData、`sourceRef` 或原始财务 payload。
- `parseViewSpec` 复用 validator；malformed JSON、schema/source conflict 返回稳定 code/path，不静默 migration 或 reconciliation。
- Canvas、PNG 与离屏 SVG 复用同一个 G2 chart spec。`highlight` 为 100% opacity + `#18211D` 3px stroke，`muted` 为 28% opacity。
- PNG 复制当前真实 G2 Canvas；SVG 使用 `@antv/g-svg` 离屏渲染同一 canonical projection，并在 success/failure 销毁 chart 与 host。
- chart 或 outline 存在 live reorder preview 时，`exportImage` 在 PNG/SVG 分支之前返回 `EXPORT_UNAVAILABLE /export`，避免两种格式捕获不同顺序。
- SVG sanitizer 移除 executable/embed/external URL/data attribute；嵌套折叠只输出当前可见 aggregate，不泄漏隐藏 label、node ID、source metadata 或 ledger reference。
- Public handle 只暴露 `focus`、`exportImage`、`getViewSpec`；不暴露 G2、projection、controller 或 dispatch。
- `AccessibleChartSummary` 只描述递归 visible projection；inner collapsed、outer collapsed 与 fully expanded 的数量、顺序和隐藏后代边界均有回归。

## TDD Evidence

RED:

- 原 T107 persistence/public surface 初始 2 files、6 failures；export modules、public handle 与真实 file workflow 均先失败后实现。
- compatibility review 发现 `emphasis` 只被持久化但未进入 chart spec；focused chart-spec test 因缺少 datum style accessor 失败。
- 活动预排 export regression 首轮解析为 PNG，证明 PNG/SVG 可能分叉；测试随后改为读取运行时真实 chart-stage 属性再次稳定 RED，排除了假绿。
- visual QA 发现 export menu viewport clipping；真实 SVG emphasis 首个断言也揭示 renderer 使用 `rgba(...)` 而不是假设的 hex serialization。

GREEN:

- 全量 unit/component 29 files、295/295；coverage thresholds 通过。
- selected real Chromium 13/13：export 6/6、accessibility/axe 7/7；emphasis focused stability 3/3。
- 真实 SVG 含 highlight `stroke="rgba(24,33,29,1)"` + `stroke-width="3"` 和 muted `fill-opacity="0.28"`；nested JSON/SVG 保持递归树并只输出 visible projection。
- PNG 为真实双密度图像且 painted pixels >500；object URL revoke 与 SVG offscreen cleanup 均由浏览器观测。
- typecheck、ESLint、Prettier、build、publint、ATTW、ESM/CJS runtime、types consumer 与 `git diff --check` 全绿。

REFACTOR:

- option validation、PNG/SVG adapters、shared chart spec、component orchestration 与 playground download ownership 保持分离。
- emphasis 只进入 shared chart spec；active gesture guard 只读取真实 chart-stage state，不复制 interaction reducer。
- 递归 summary、persistence 与 export 继续消费既有 projection/tree helpers，不创建第二套遍历逻辑。

## Fresh Validation

| Gate | Result |
| --- | --- |
| Unit/component | 29 files、295/295 |
| Coverage | S 90.30%、B 84.14%、F 92.32%、L 90.40% |
| Selected Chromium | 13/13；export 6/6、accessibility 7/7 |
| Emphasis stability | isolated repeat 3/3 |
| Tooling | type/lint/format/build/package/diff 全绿 |
| Independent review | 无未解决 Critical、High 或 Medium finding |

## Visual QA

原 T107 file/export surface 没有因 compatibility refresh 改变布局；desktop/mobile 菜单、焦点、live status 与 viewport captures 继续有效。强调态真实 SVG 属性、递归 visible projection 与活动手势门禁由动态测试承担，不用静态截图冒充行为证据。

Required captures:

- `screenshots/desktop-export-menu.png`
- `screenshots/svg-export-result.png`
- `screenshots/mobile-file-controls.png`

## Review Verdict

- Spec: WF-US-004/005、WF-FR-011/012/013 与 WF-NFR-003/007 有 direct unit/component/Chromium evidence；递归 amendment 兼容闭环完整。
- Engineering: strict types、deterministic JSON、shared projection/spec、emphasis parity、gesture consistency、cleanup 与 package surface 通过；无 unresolved Medium finding。
- Visual/QA: nested visible order、真实 SVG styles、PNG pixels、axe、desktop/mobile controls 与 live states 通过。

## Residual Risk

- Firefox/WebKit、React 18.3/19.2 host matrix、CI 与完整 release candidate validation 属于 T108。
- Playground production build 提示 G2 lazy chunk 1,035.97 kB；editor 保持 G2 peer external，最终 bundle decision 属于 T108。
- Coverage 首次运行中 seeded property sequence 达到 5s timeout，同一未修改命令重跑 295/295；T108 应继续观察测试时延稳定性。
- ViewSpec 只严格支持 schema `1.x`，不提供 migration/reconciliation；这是已批准边界。

## Handoff

- T107 已进入 `Accepted`。
- T108 已解锁，可按已确认的 T101-T108 任务图开始执行。
- 未执行 commit、push、PR、merge、publish 或其他远端写操作。

## Acceptance Receipt

- Decision: `Accepted`
- Accepted by: User
- Accepted on: 2026-07-16
- Downstream gate: T108 已解锁，可按已确认的 T101-T108 任务图开始执行。
