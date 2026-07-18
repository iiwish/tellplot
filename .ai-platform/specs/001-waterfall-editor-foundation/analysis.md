# 001 跨 artifact 一致性分析

## Metadata

- Version: 0.3.0
- Status: Clear_For_Execution
- Analyzed: 2026-07-18

## Verdict

产品合同、章程、TDR、feature spec、设计合同、递归数据模型、命令合同与任务图保持一致。T101-T108 与 T106-CR001 已验收；fresh validation、final evidence 与独立 review 全部通过，feature execution 完成。

## Requirement Coverage

| Requirement group | Primary tasks | Validation |
| --- | --- | --- |
| WF-FR-001 至 003 | T102 | domain validation、immutability、coverage |
| WF-FR-004、005、009、013 | T103 | command/history/property tests |
| WF-FR-006 | T104 | projection/anchor/group/determinism tests |
| WF-FR-010、014 | T105 | component modes、real G2 render、visual QA |
| WF-FR-003 至 009 | T106、T106-CR001 | recursive domain/property + component + real browser marquee/drag/keyboard/performance |
| WF-FR-011、012 | T107 | round-trip、export、pixel、axe |
| WF-NFR-001 至 007 | T101、T102 至 T108 | coverage、build、package、e2e、axe、performance、review |

所有 functional requirement 至少有一个 primary task，没有 orphan task 或未映射实现任务。

## Constitution Analysis

- P-001：瀑布图来自已验证真实工作流，符合。
- P-002：SourceData 与 ViewSpec 分离，符合。
- P-003：chart、outline、keyboard 和 host 使用统一 command executor，符合。
- P-004：本 feature 无 AI provider，命令 schema 为后续候选命令保留受控入口，符合。
- P-005：命令原子执行与不变量 coverage 是 P0，符合。
- P-006：G2 与 CSS/dnd-kit 各自拥有渲染树，不建设 AnimationEngine，符合。
- P-007：直接操作和精确大纲并存，符合。
- P-008：pointer ref、短 transition、cancel 与 reduced motion 有明确验证，符合。
- P-009：只有一个 editor package，不提前拆 core，符合。
- P-010：TDD、真实浏览器、包与视觉 evidence 完整，符合。

## Terminology Analysis

- `SourceData`、`ViewSpec`、`EditorSession`、`EditorCommand`、`WaterfallProjection` 在 artifacts 中语义一致。
- “条形图/柱状图”没有进入本 feature 实现范围，只作为下一切片。
- Motion 指 npm animation library；motion 小写只表示一般运动规则，文档语义可区分。

## Dependency Analysis

- TypeScript 6.0.3 满足 typescript-eslint `<6.1.0` peer range。
- Vite 8、ESLint 10 与 Node 22.13+ 下界兼容。
- React、React DOM 和 G2 作为 peer，不重复打包。
- Motion 未安装，不存在未使用依赖。
- `@dnd-kit/react` 0.x 未采用，使用稳定 core/sortable。
- T106 按已批准版本引入 `@dnd-kit/core` 6.3.1、`@dnd-kit/sortable` 10.0.0 与测试侧 `@axe-core/playwright` 4.12.1；不引入 Motion。

## Findings

### Medium M-001 G2 SVG export path 需要原型证据

T107 必须先用真实浏览器验证 G2 当前 export path。若无法满足一致性，采用同 projection 的离屏 SVG G2 chart。不得静默切换到手写 SVG renderer，因为这会产生第二套视觉逻辑。

Disposition: T107 使用相同 projection 与 chart spec 的离屏 G2 SVG renderer 完成真实浏览器验证，清理与安全断言通过；不得使用手写第二 renderer 的约束保持满足。

### Resolved R-004 递归分组合同

`ViewSpec` 使用规范化递归有序森林，group children 引用 `ViewNodeId`。validator、command、projection、outline、persistence 和 property tests 共同承担循环、多父、孤儿、覆盖唯一性与跨 segment 门禁。图表只执行同父级直接操作，跨层级精确移动归 outline 所有。

Disposition: T106-CR001 负责清除单层假设并刷新 T107 兼容性 evidence；不引入新动画依赖或第二渲染引擎。

### Resolved R-001 T106 原 allowed scope 缺少必要集成文件

T106 必须通过公共 root 把既有 controller dispatch 传给 chart、outline 和 inspector；200-item 性能门禁也需要确定性 playground fixture。原列表只列叶组件和测试文件，无法在不使用全局状态或重复 session 的前提下完成已批准行为。

Disposition: 任务图与 packet 将范围校正为 `components/**`、`tests/components/**`、`tests/setup.ts` 和 `apps/playground/src/fixtures.ts`。该校正不改变公共 API、领域语义或产品范围，并明确禁止 controller/domain/public surface 扩张。

### Resolved R-002 G2 semantic pointer evidence

本地锁定的 G2 5.4.8 `interaction/event` 在 `element:pointerdown` 提供原始 datum 与源柱 scene bounds；chart context 提供同父级可见柱的 scene bounds。适配器在 pointer down 时固化水平边界快照，后续通过 element/plot pointer 的 X 坐标平移源柱左右边缘并计算碰撞，不依赖目标柱二维命中，Y 坐标和柱高不参与排序。

Disposition: packet 把 G2 datum、水平 scene bounds、4px pending threshold 与 pointer capture cleanup 设为强制边界，并要求真实 Chromium chart drag 证明。

### Resolved R-003 T105 chart replacement lifecycle 不满足 T106 更新性能

T105 为隔离 lifecycle 风险，按 projection replacement 销毁并重建 Chart；该行为已经有组件测试。T106 的 160ms G2 update animation 与 150ms commit-to-visible 门禁要求 mounted Chart 在命令提交后原位更新，不能重复 import/create。

Disposition: T106 packet 明确先把旧测试改成 RED，再实现单实例 latest-wins render queue、event cleanup 和 unmount destroy exactly once。该演进属于 T106 已批准的 `WaterfallCanvas` ownership，不改变领域或公共 API。

### Resolved R-005 Annotation image parity

确认的 Inspector annotation 必须同时满足 JSON 精确 round-trip 与当前图像可见性。T108 通过 focused chart-spec、SVG 和真实 canvas 回归，把当前可见节点的 annotation 摘要接入共享 G2 spec；screen/PNG/SVG 使用相同投影与布局，JSON 保留完整原文，图像只显示最多两行省略摘要。

Disposition: T108-DEF005 将 `WaterfallCanvas`、`waterfallChartSpec` 与 `svgExport` 纳入窄修复范围；没有第二 renderer、公开 API 或 SourceData 变化。

### Resolved R-006 Literal prior-major browser evidence

Current Playwright 1.61.1 覆盖 Chromium 149、Firefox 151、WebKit 26.5。Playwright 1.60.0 的 WebKit 26.4 只是上一发布列车而非上一主版本，因此独立 Playwright 1.52.0 / WebKit 18.4 fixture 补齐 literal prior-major 证据；四个 compatibility runtime probe 与 144/144 E2E 均通过。

Disposition: 两套 frozen fixture 不进入 workspace，不改变 root dependency/lockfile；runner 在 `.nvmrc` Node 22.20.0 外 fail fast，CI 使用相同 Node 主版本。

## Gate Decision

- Product contract: Confirmed。
- Constitution: Confirmed。
- Feature spec/plan/TDR/tasks: Confirmed。
- Checklist: Completed。
- Execute: T101-T108 与 T106-CR001 Accepted；feature execution complete。
