# G006 框架无关编辑器架构 Spec

## Metadata

- Feature ID: `011-framework-neutral-editor`
- Goal ID: `G006`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-07-29
- Approval: 用户于 2026-07-29 明确批准框架无关长期架构、breaking package/API 调整与完整编辑器连续迁移

## Goal

TellPlot 以框架无关 core 和 imperative DOM/G2 editor runtime 为唯一产品实现，React 与 Vue 只提供薄宿主适配。
完整工具栏、图表直接操作、结构大纲、Inspector、历史、持久化、导出、键盘和无障碍体验在不同宿主中共享
同一实现。现有候选没有公开发布，本目标不保留旧 React package API 或旧包布局兼容层。

## User Outcomes

- 原生 DOM 开发者使用 `createEditor(container, options)` 创建、更新和销毁完整编辑器。
- React 开发者使用 `@tellplot/react` 的 `ChartEditor`，不接触 imperative 生命周期。
- Vue 3 开发者使用 `@tellplot/vue` 的 `ChartEditor` 与 `v-model:view`，不安装 React。
- 三种宿主共享相同数据合同、命令、编辑行为、导出结果、错误语义和可访问性。
- 维护者只维护一套领域状态、G2 runtime、直接操作和 DOM 编辑器实现。

## User Stories

### FRAMEWORK-US-001 Imperative DOM 接入

开发者可以向普通 `HTMLElement` 挂载完整编辑器，更新 config/view、订阅事件并确定销毁所有资源。

### FRAMEWORK-US-002 React 接入

React 18/19 宿主可以通过声明式 props、受控/非受控 view 与 ref 调用完整编辑器能力。

### FRAMEWORK-US-003 Vue 接入

Vue 3 宿主可以通过 props、`v-model:view`、emits 与 exposed instance 调用完整编辑器能力。

### FRAMEWORK-US-004 行为一致性

用户在 imperative、React 与 Vue 宿主中获得相同的排序、分组、折叠、固定、注释、撤销、重做和导出结果。

## Requirements

### FRAMEWORK-FR-001 包与依赖方向

workspace 包含 `@tellplot/core`、`@tellplot/editor`、`@tellplot/react` 和 `@tellplot/vue`。依赖只允许
`core -> none`、`editor -> core/G2`、`react|vue -> editor/core`。core/editor 不得导入 React、React DOM、
Vue 或框架专属 drag-and-drop runtime。

### FRAMEWORK-FR-002 Framework-neutral core

`@tellplot/core` 导出 `ChartConfig`、SourceData/ViewSpec、验证、session、命令、历史、投影、持久化和安全语义
配置。导入 core 不访问 `window`、`document` 或创建 G2/DOM 资源。

### FRAMEWORK-FR-003 Imperative editor API

`@tellplot/editor` 导出 `createEditor(container, options)`。返回实例至少提供 `update`、`dispatch`、`undo`、
`redo`、`focus`、`getView`、`exportImage` 和幂等 `destroy`。创建失败、非法 config/view、宿主 callback 失败和
销毁后调用具有稳定、不泄漏业务数据的结果。

### FRAMEWORK-FR-004 完整编辑器迁移

imperative runtime 拥有当前完整编辑器：waterfall/bar/column、标题与图表、直接点击/拖拽/框选、before/
after/inside 跨层移动、分组/解组/折叠/展开、固定、结构大纲鼠标与键盘排序、Inspector 注释、宿主提供的
强调状态渲染与导出、Toolbar、撤销/重做、响应式 panel、SVG/PNG 导出、可访问摘要和反馈状态。

### FRAMEWORK-FR-005 单一确定性状态

imperative、React 与 Vue 的用户动作全部进入共享 `EditorSession` 和类型化命令。适配器不复制 session、历史、
projection、selection 或交互提交逻辑。原始数据与 ViewSpec 不变量保持不变。

### FRAMEWORK-FR-006 更新与生命周期

`update` 可以替换 config、controlled view 与 callbacks；兼容 view 保留，数据/type 不兼容时确定创建初始 view。
多次 update 不重建宿主容器或泄漏 G2、DOM、media query、pointer、keyboard 监听；`destroy` 可重复调用。

### FRAMEWORK-FR-007 React 适配

`@tellplot/react` 提供 `ChartEditor`、props 与 ref handle。它只创建稳定容器、调用 editor instance、映射
controlled/uncontrolled view 和 callbacks，并验证 React 18.3/19。

### FRAMEWORK-FR-008 Vue 适配

`@tellplot/vue` 提供 Vue 3 `ChartEditor`。它映射 config、view/defaultView、`update:view`、view/command/
selection/config-rejected events，并 expose `focus`、`getView`、`exportImage`。包不依赖 React/React DOM。

### FRAMEWORK-FR-009 参考应用真实性

playground 通过已发布适配包消费 editor，不从 core/editor 私有路径导入。至少一个真实 Vue consumer fixture
验证安装、渲染、更新、命令事件、导出接口和卸载。

### FRAMEWORK-FR-010 公共边界

公共 API 不暴露 G2Spec、G2 chart instance、内部 projection、DOM renderer handle 或 adapter 私有状态。
现有 SourceData/ViewSpec schema 与命令 wire shape保持不变；未公开的旧 React API 可以删除。

### FRAMEWORK-FR-011 文档与发布合同

README、architecture、getting started、configuration、API、support matrix、package metadata、tarball 与发布门禁
以 framework-neutral editor、React adapter 和 Vue adapter 为当前 canonical 形态。

## Non-Functional Requirements

- FRAMEWORK-NFR-001：TypeScript strict；禁止 `any`、`@ts-ignore`、`@ts-expect-error`。
- FRAMEWORK-NFR-002：core/editor 包产物和依赖树不得包含 React、React DOM、Vue、dnd-kit 或 lucide-react。
- FRAMEWORK-NFR-003：200 个可见节点的直接重排继续满足现有 150ms 可见反馈预算。
- FRAMEWORK-NFR-004：键盘、焦点、ARIA、live region、reduced motion 与触控目标门禁不得弱化。
- FRAMEWORK-NFR-005：导入公共包在 Node/SSR 环境不访问浏览器全局；只有 `createEditor` 需要 DOM。
- FRAMEWORK-NFR-006：核心默认不发起网络请求；错误/日志不包含金额、标签或来源明细。
- FRAMEWORK-NFR-007：ESM、CJS、类型、当前/上一浏览器、React 18/19、Vue 3 和隔离 tarball consumer 全绿。
- FRAMEWORK-NFR-008：不引入第二图表引擎、通用 UI framework、状态框架、动画框架或 plugin registry。

## Edge Cases

- 空数据、非法 config、非法/不兼容 controlled view。
- update 发生在 G2 render、拖拽、框选、弹层或导出期间。
- host callback 抛错、容器被宿主移除、重复 destroy、destroy 后调用。
- React Strict Mode 双 effect、Vue mount/unmount、快速 prop 更新与同页多实例。
- SSR import、CSP 环境、reduced motion、窄移动 viewport 和触控 Pointer Events。

## Non-Goals

- 新图表家族、schema、命令或业务编辑能力。
- raw G2Spec、chart instance、插件系统、AI、Dashboard 或服务端能力。
- 兼容未公开的旧 `@tellplot/editor` React component API。
- 远程 Git、npm publish、tag、GitHub Release、生产部署或 DNS。

## Success Criteria

- FRAMEWORK-SC-001：core/editor tarball 在未安装 React/Vue 时可以 import，imperative fixture 完成完整主流程。
- FRAMEWORK-SC-002：React 18/19 与 Vue 3 fixtures 共享同一行为断言并完成 mount/update/export/destroy。
- FRAMEWORK-SC-003：三种宿主的 ViewSpec、command event 与 SVG 语义对同一场景一致。
- FRAMEWORK-SC-004：core/editor 依赖和产物扫描不含宿主框架 runtime。
- FRAMEWORK-SC-005：现有 unit、E2E、a11y、performance 和浏览器门禁全部通过或由等价新测试取代。
- FRAMEWORK-SC-006：release audit、architecture graph、tarball manifest 和 isolated-source rehearsal 覆盖四包。
- FRAMEWORK-SC-007：无 unresolved Critical、High 或 Medium spec、architecture、bug、QA finding。

## Approval Gate

用户已批准 G006 范围、breaking API、`core/editor/react/vue` 架构、Vue 依赖与目标内连续执行。SourceData/
ViewSpec schema、新图表、其他新依赖、远程 Git、publish 和 release 仍需独立明确授权。
