# 001 瀑布图编辑器基础切片实现计划

## Metadata

- Version: 0.2.0
- Status: Confirmed
- Spec: `.ai-platform/specs/001-waterfall-editor-foundation/spec.md`
- TDR: `.ai-platform/docs/technology-decision-record.md`
- Last updated: 2026-07-16

## Architecture Summary

项目采用 pnpm workspace，但只建设一个产品包 `@tellplot/editor`。领域模型、命令执行、瀑布投影、React 组件和 G2 adapter 在同一包内保持明确内部边界。`apps/playground` 只从公共入口消费组件，用于端到端与视觉验收。

```text
Host application
  -> FinancialChartEditor props
  -> React session adapter
  -> pure command executor
  -> SourceData + ViewSpec + CommandHistory
  -> waterfall projection
  -> Outline DOM + G2 Canvas
  -> host callbacks / export result
```

## Repository Structure

```text
apps/
  playground/
    src/
    index.html
    package.json
packages/
  editor/
    src/
      domain/
        model.ts
        validation.ts
        commands.ts
        executeCommand.ts
        history.ts
        persistence.ts
      waterfall/
        projectWaterfall.ts
        waterfallTypes.ts
      components/
        FinancialChartEditor.tsx
        OutlinePanel.tsx
        WaterfallCanvas.tsx
        InspectorPanel.tsx
        EditorToolbar.tsx
      styles/
        tokens.css
        editor.css
      index.ts
    tests/
      domain/
      waterfall/
      components/
    package.json
    tsconfig.json
    tsup.config.ts
e2e/
  fixtures/
  waterfall-editor.spec.ts
  accessibility.spec.ts
  export.spec.ts
.github/workflows/ci.yml
eslint.config.js
package.json
pnpm-workspace.yaml
tsconfig.base.json
vitest.config.ts
playwright.config.ts
```

目录表达所有权，不提前创建 `packages/core`、插件目录或通用 chart registry。分类图切片验收后再判断是否拆包。

## Domain Boundary

- `SourceData` 是只读输入；开发环境对 mutation 做冻结检测，生产逻辑不依赖深冻结。
- `ViewSpec` 是唯一可持久化编辑状态；使用规范化递归有序森林保存根顺序和 group entities，父级索引与叶子来源运行时派生。
- `EditorSession` 组合 source fingerprint、current ViewSpec、revision、undo stack 和 redo stack，不进入公共持久化格式。
- `executeCommand` 是唯一 mutation 入口，返回 discriminated union，不抛出可预期业务错误。
- `projectWaterfall` 是包内纯函数，负责把 source + view 转成 chart projection；公共 package runtime 不直接导出该函数。
- G2 直接消费 projection；outline 组合 `ViewSpec` 与 projection，保留 expanded group header 与层级信息。
- G2 chart instance、DOM ref、pointer session 和导出 canvas 都属于 adapter 临时状态。

## Projection Numerics

- contribution 按当前 `ViewSpec` 顺序进入 Neumaier compensated accumulator，避免重排触发普通浮点加法漂移。
- collapsed group 与 expanded children 使用同一 child 顺序和同一累加路径；group 自身金额使用独立 Neumaier accumulator。
- subtotal 与 end 是绝对累计锚点。比较使用最多 8 ULP 的 IEEE-754 误差边界，不使用货币小数位或业务容差。
- subtotal 校验成功后以声明值重置 accumulator；累计或聚合超出 finite safe-number range 时返回结构化错误，不生成部分 projection。

## React Boundary

- `FinancialChartEditor` 是公共 root component。
- 非受控模式内部使用 reducer；受控模式把成功命令结果提交给 `onViewSpecChange`，下一次 props 同步前展示基于受控值的确定状态。
- 回调只返回结构化 metadata；默认不记录金额和标签。
- 错误边界仅捕获不可预期渲染错误；数据和命令错误走显式 result state。
- 组件样式使用 `tp-` 前缀和 CSS variables，避免污染宿主全局样式。

## G2 Adapter

- `WaterfallCanvas` 负责 chart create/update/destroy，React render 不创建 chart。
- 数据变化通过稳定 projection 更新；动画由 G2 update animation 负责。
- pointer gesture 在 ref 中保存 pending、drag 与 marquee 高频状态；实时 preview 不进入 React session，只在 drop 或对话框确认时 dispatch 一个命令。
- hit target 使用 G2 event datum、scale mapping 或 scene graph bounds，不通过柱宽猜测对象身份。
- chart destroy、pointer capture、window blur 和 Escape listener 都必须清理。

## Outline Interaction

- dnd-kit sensors 只负责 DOM outline 排序和 overlay。
- keyboard path 提供 move before、move after、move into group、move out of group，最终转换为同一类型化命令。
- 分组只允许同父级连续、未固定的 contribution 或 group；非法跨层、循环和跨 subtotal segment 选择在执行前说明原因。
- outline 递归渲染任意深度，图表负责同父级操作，精确跨层级移动由 outline 完成。
- 动画使用 dnd-kit transform + CSS transition，不引入 Motion。

## Export Strategy

- SVG 从 G2 SVG renderer 或受支持的 chart export path 获取；若 G2 当前 Canvas renderer 无法满足一致性，单独创建离屏 SVG chart，使用同一 projection 和 theme。
- PNG 从稳定像素密度的 Canvas 导出，调用方获得 `Blob`，组件不隐式创建下载链接。
- export result 包含 mime type、suggested filename、width、height 和 blob。
- 导出实现必须用真实浏览器 fixture 验证文本、顺序、颜色和非空像素。

## Toolchain

- Runtime/build: Node 22.13+、pnpm 11、TypeScript 6.0.3、Vite 8.1.4、tsup 8.5.1；Vitest 使用 `projects` root config，不使用已弃用的 workspace config。
- Product: React/React DOM 19.2.7、G2 5.4.8、dnd-kit core 6.3.1、sortable 10.0.0、Lucide React 1.24.0。
- Unit/component: Vitest 4.1.10、Testing Library React 16.3.2、user-event 14.6.1、jsdom 29.1.1。
- Browser: Playwright 1.61.1、axe Playwright 4.12.1。
- Quality: ESLint 10.7.0、typescript-eslint 8.64.0、Prettier 3.9.5、publint 0.3.21、Are The Types Wrong 0.18.5。
- Version evidence: `.ai-platform/specs/001-waterfall-editor-foundation/research.md`。

## Test Strategy

### Unit

- Schema and validation error codes。
- Every command happy path、rejection、revision conflict and locked target path。
- Undo/redo branching and history cap。
- Group aggregation、collapse projection、zero/negative/duplicate-label cases。
- Recursive tree validation、cycle/orphan/multi-parent rejection、nested collapse restoration and exact ungroup splice。
- Determinism、immutability and source conservation property sequences。

### Component

- Controlled/uncontrolled behavior。
- Callback contracts and error states。
- Keyboard ordering、selection、group action availability。
- Focus restoration、live region and reduced-motion classes。

### Browser

- Real G2 render is nonblank and correct at target viewports。
- Chart drag and outline drag produce identical `ViewSpec`。
- Escape、blur and invalid drop cancel without state change。
- SVG/PNG export is nonempty and matches current order。
- axe critical/serious gate and screenshot review。
- Playwright 从生产 Vite 构建启动严格端口服务器；200-item latency 不使用 React/Vite 开发模式作为发布性能信号。

### Package

- ESM and CJS import smoke tests。
- TypeScript consumer compile test。
- publint and Are The Types Wrong。
- Bundle inspection confirms peer dependencies externalized。

## Quality Gates

1. Format、lint、typecheck。
2. Domain and projection tests with 95% thresholds。
3. All unit/component tests。
4. Package build and package lint。
5. Chromium E2E and axe on every change set。
6. Three-browser E2E、screenshots、performance fixture before release candidate。
7. `git diff --check` and artifact validator。

## Implementation Sequence

1. T101 toolchain and package boundaries。
2. T102 data model and validation。
3. T103 command engine and history。
4. T104 waterfall projection。
5. T105 React shell and G2 rendering。
6. T106 direct manipulation、outline、grouping and collapse。
7. T106-CR001 recursive grouping、marquee、live reorder preview and chart group actions。
8. T107 persistence、export and accessibility closure refresh。
9. T108 integration、performance、visual and package QA。

每个任务单独执行 RED-GREEN-REFACTOR 并生成 evidence。不得为赶 UI 进度跳过领域测试。

## Constitution Check

| Principle | Result | Evidence in plan |
| --- | --- | --- |
| P-001 real workflow | Pass | 首个切片复现真实瀑布图工作流 |
| P-002 source/view separation | Pass | 独立 SourceData 与 ViewSpec |
| P-003 single command entry | Pass | chart、outline、keyboard 共用 executeCommand |
| P-004 controlled AI | Pass | 本 feature 无 AI provider，只暴露命令契约 |
| P-005 invariants first | Pass | validate/apply/validate-result/commit 原子路径 |
| P-006 native capabilities | Pass | G2 管图形动画，UI 不接管 Canvas |
| P-007 direct and precise | Pass | chart direct manipulation + outline keyboard path |
| P-008 interruptible performance | Pass | pointer ref、短 transition、reduced motion |
| P-009 validate before abstraction | Pass | 单 editor 包，不提前抽 core/plugin |
| P-010 evidence | Pass | unit/component/e2e/package/visual 分层证据 |

## Rollback And Dependency Exit

- G2 adapter 与领域层隔离，渲染能力失败不会要求改写命令 schema。
- dnd-kit 只用于 outline，可由自定义 sensor adapter 替换，不影响领域命令。
- tsup 只负责 package build，公共源码不引用其 runtime。
- Motion 未引入，因此不存在双动画栈退出成本。
