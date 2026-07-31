# G006 框架无关编辑器架构 Plan

## Metadata

- Feature ID: `011-framework-neutral-editor`
- Goal ID: `G006`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-07-29
- Approval: 用户已批准上述框架无关架构与完整编辑器连续迁移

## Delivery Strategy

1. 用 package/import/store contract RED tests 固定四包依赖方向、imperative lifecycle 和无浏览器副作用导入。
2. 将 domain、config、charts、interactions 和纯 session/controller 移入 `@tellplot/core`。
3. 在 `@tellplot/editor` 建立稳定 DOM shell、G2 surface、outline/inspector/toolbar 与统一事件委派。
4. 把画布和结构大纲 Pointer/Keyboard 状态抽为 framework-neutral controllers，所有提交进入 core commands。
5. 用 React/Vue 薄组件适配同一 editor instance，playground 只消费 `@tellplot/react`。
6. 更新 architecture/release/tarball gates，运行完整矩阵并形成 G006 目标 evidence。

## Package Architecture

```text
@tellplot/core
  config + domain + charts + interactions + session store

@tellplot/editor
  DOM workbench + G2 runtime + export + createEditor

@tellplot/react             @tellplot/vue
  lifecycle adapter          lifecycle adapter
          \                  /
           @tellplot/editor
```

`@tellplot/editor` 使用浏览器 DOM API 和事件委派维护完整 UI，不使用 React/Vue、框架专属 DnD 或第二状态库。
G2 继续独占 marks、scene bounds、renderer 和图形动画。

## Public API Shape

- `@tellplot/core`: config/domain/command/session/validation/persistence types and functions。
- `@tellplot/editor`: `createEditor`、`EditorInstance`、`EditorOptions`、`EditorUpdate`、export types 与 styles。
- `@tellplot/react`: `ChartEditor`、`ChartEditorProps`、`ChartEditorHandle`。
- `@tellplot/vue`: `ChartEditor`、Vue props/emits/exposed handle types。

完整合同位于 `contracts/imperative-editor.md`。

## State And Event Model

- runtime 内部持有唯一 `EditorSession`、selection 和 interaction preview。
- `options.view` 表示 controlled view；`defaultView` 表示非受控初值，两者互斥。
- command 先在共享 session 中校验；非受控模式提交并渲染，受控模式发出候选 view/event，宿主 update 后成为可见状态。
- `update` 原子替换 config/view/callbacks；不兼容 config/view 进入稳定 invalid state，不猜测迁移。
- adapter callbacks 捕获宿主异常并只记录 callback identity。

## DOM And Interaction Strategy

- root/shell/G2 mount 节点稳定创建，不在状态更新时替换。
- Toolbar/outline/inspector/overlay 使用事件委派和 keyed nodeId 更新。
- 画布命中只使用 G2 event target、scene bounds、比例尺和既有 interaction helpers。
- Outline 使用 Pointer Events + element bounds 与既有 move target policy；键盘提供等价移动、分组和折叠路径。
- 所有 document/window/media-query listener 和 G2 runtime 由 disposer registry 统一释放。

## Constitution Check

- P-002/P-003/P-005：core 命令和不变量保持唯一，满足。
- P-006：G2 继续拥有图形和命中信息，不创建第二渲染引擎，满足。
- P-007/P-008：完整大纲、键盘、直接操作和 reduced motion 保留，满足。
- P-009/P-011：imperative/React/Vue 是已批准真实消费者，抽象有三个宿主证明，满足。
- P-010：TDD、真实浏览器、a11y、performance 和 tarball evidence 为阻断门禁，满足。

## Dependency Decision

- 新增 Vue 3 作为 `@tellplot/vue` peer/dev dependency，用于已批准的一等 Vue 适配与测试。
- React/React DOM 移至 `@tellplot/react` peer/dev dependency。
- 删除 `@dnd-kit/*` 和 `lucide-react` runtime dependencies；使用 DOM Pointer Events、CSS 和已有图标语义。
- 不引入 Lit、Preact、状态库、DnD 库或动画库。

## Risk Controls

- 先完成 core import graph 与 store contract，禁止 DOM/framework 逆向依赖。
- 每个迁移切片保留 RED/GREEN receipt，行为测试优先于组件实现形式。
- 大型 Canvas 先抽交互 controller 再迁移 DOM shell，避免同时改 projection/command。
- 适配层以同一 runtime contract fixtures 验证，禁止各自修补领域行为。
- G005 在 G006 验收前保持 Blocked；本目标不执行远程动作。

## Validation Strategy

- Focused: core contracts、editor lifecycle、DOM UI、React/Vue adapters、package imports。
- Broad: format、lint、typecheck、coverage、build、package、imperative/React/Vue matrix、E2E、a11y、performance。
- Release: architecture/audit/artifact/rehearse、artifact validator、`git diff --check`。
