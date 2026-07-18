# 001 瀑布图编辑器基础切片规格

## Metadata

- Version: 0.2.0
- Status: Confirmed
- Product contract: `.ai-platform/docs/product-design.md`
- Constitution: `.ai-platform/memory/constitution.md`
- Last updated: 2026-07-16
- Approval: 用户于 2026-07-16 明确批准递归模型、图表框选与 T106-CR001

## Goal

交付一个可嵌入 React 业务系统的财务瀑布图编辑器组件，以及一个用于真实浏览器验收的薄参考编辑器。用户可以在不修改原始财务金额的前提下完成排序、分组、折叠、撤销、恢复和演示文稿友好导出。

## Scope

本 feature 是 Phase 1A 的第一个端到端切片，只覆盖瀑布图。分类条形图和柱状图在本切片验收后复用同一领域模型进行验证。

## User Stories

### WF-US-001 查看可信瀑布图

财务分析人员把带稳定 ID、名称、金额和类型的数据交给组件后，可以看到起点、贡献项、小计与终点关系正确的瀑布图，并能追溯每个可见项的来源。

Acceptance:

- 非有限金额、重复 ID、非法起终点结构会被拒绝并给出结构化错误。
- 渲染不会修改调用方传入的数据对象。
- 同一输入和 `ViewSpec` 产生确定性一致结果。

### WF-US-002 调整叙事顺序

财务分析人员可以从图表或结构大纲拖动未锁定贡献项，也可以通过键盘命令调整顺序，使汇报逻辑更清晰。

Acceptance:

- 拖动时有明确落点、取消和非法位置反馈。
- 起点、终点、小计和被固定项目不能被非法移动。
- 顺序变化后金额、来源集合和最终总额保持一致。

### WF-US-003 管理分析层级

财务分析人员可以选择同父级连续贡献项或分组创建递归分组、解散指定分组、折叠和展开，以控制汇报层级。

Acceptance:

- 分组值等于来源贡献项之和。
- 折叠只改变可见结构，不删除来源项。
- 展开后顺序、金额、来源和后代折叠状态完全恢复。
- 内组可以与同级项目或分组继续创建外组，禁止循环、跨父级和跨 subtotal segment 分组。

### WF-US-004 恢复与保存编辑

财务分析人员可以撤销、重做、导出和重新载入 `ViewSpec`，避免重复整理图表。

Acceptance:

- 每条成功命令都能撤销并重做。
- 失败命令不进入历史。
- `ViewSpec` 可序列化，加载时进行版本和来源兼容性校验。

### WF-US-005 嵌入业务系统

业务开发人员可以通过稳定 React API 提供数据、初始视图和宿主回调，并获得当前视图、命令结果与导出结果。

Acceptance:

- 组件不依赖参考编辑器的路由、数据或全局状态。
- React、React DOM 和 G2 作为 peer dependency，不被重复打包。
- 宿主可受控使用和无状态使用组件。

## Functional Requirements

### WF-FR-001 输入数据验证

组件必须在创建 session 前验证 schema、唯一 ID、金额有限性、项目类型和起终点约束，并返回带错误码与对象路径的错误。

### WF-FR-002 不可变 SourceData

命令执行器不得修改或深拷贝后冒充新源数据。领域层只读取 `SourceData`，所有编辑写入 `ViewSpec`。

### WF-FR-003 确定性 ViewSpec

`ViewSpec` 必须包含 schema version、chart type、根顺序、规范化递归分组树、折叠集合、固定集合、注释与视觉强调；序列化不得包含派生父级索引、G2 或 DOM 实例。每个 contribution 和 group 必须在树中恰好出现一次，且分组图无循环、孤儿和跨 subtotal segment 引用。

### WF-FR-004 类型化命令

必须支持 `moveItem`、`moveGroup`、`createGroup`、`ungroup`、`collapseGroup`、`expandGroup`、`pinItem`、`unpinItem`、`setAnnotation`、`undo` 和 `redo`。命令必须带 ID、来源与基准 revision。`createGroup` 必须把创建与初始折叠作为一个原子历史动作。

### WF-FR-005 原子执行与不变量

命令必须按 validate、apply、validate-result、commit 顺序原子执行。任一校验失败时 session 和历史保持不变。

### WF-FR-006 瀑布投影

领域投影必须递归计算每个可见节点的 start、end、amount、kind、完整叶子 source IDs、父级路径、层级和显示顺序。任意层级折叠组作为一个聚合贡献项参与后续累计；被外层隐藏的后代折叠状态不得被重置。

### WF-FR-007 图表直接拖拽

G2 图表必须区分点击选择、柱子拖动和空白区域框选。柱子按下后只进入 `pending-bar`，水平位移达到 4px 才进入拖拽；阈值内的水平抖动和任意垂直位移仍按点击选择处理。排序碰撞只比较拖动柱与同父级可见柱的真实水平边界，Y 轴位置和柱高不参与；拖动柱的平移后边缘越过相邻柱边界时必须实时预排受影响柱子。起点、终点、小计和固定项保留点击选择，但拖动尝试必须拒绝且不得进入拖拽会话。框选必须显示选区并只接受同父级连续节点。Escape、窗口失焦、非法目标和不足两个节点均不得提交命令。

### WF-FR-008 结构大纲

大纲必须递归显示层级、顺序、金额、来源数量、折叠和固定状态，并支持指针排序、键盘排序、选择、同层归组和精确跨层级移动。

### WF-FR-009 历史

session 必须保留受限制的 undo/redo 历史。新命令在 undo 后提交时清空 redo 分支。默认历史上限为 100 条，可由组件属性配置。

### WF-FR-010 受控与非受控模式

组件必须支持 `viewSpec` 加 `onViewSpecChange` 的受控模式，以及 `defaultViewSpec` 的非受控模式。两种模式使用同一命令执行路径。

### WF-FR-011 持久化

必须提供 `serializeViewSpec` 与 `parseViewSpec`。解析必须拒绝不支持的 major schema version，并对缺失来源 ID 返回冲突报告。

### WF-FR-012 导出

必须提供 SVG 与 PNG 导出。导出内容与当前可见顺序、分组、折叠、标签和强调状态一致；导出失败返回结构化错误，不触发隐式下载。

### WF-FR-013 宿主事件

必须提供 `onCommand`、`onCommandRejected`、`onViewSpecChange` 和 `onSelectionChange` 回调。普通日志不得包含金额或原始标签。

### WF-FR-014 参考编辑器

参考编辑器必须使用公共包入口，提供真实财务示例、图表类型固定为 waterfall、视图 JSON 导入导出和 SVG/PNG 操作，不包含独立业务 reducer。

## Non-Functional Requirements

### WF-NFR-001 正确性

领域命令、不变量和瀑布投影 statement/branch/function coverage 均不低于 95%，且所有已列财务边界用例必须通过。

### WF-NFR-002 性能

在桌面 Chrome、200 个可见贡献项的 fixture 下，拖拽指针反馈不经过 React state 每帧重渲染；命令提交到可见更新开始的 p95 不高于 150ms。

### WF-NFR-003 可访问性

所有核心操作必须存在键盘路径；焦点可见；图表有文本摘要；状态通过 live region 播报；Playwright + axe 关键流程无 serious/critical violation。

### WF-NFR-004 运动与响应

普通状态过渡使用 120-180ms，拖拽本体不补间，动画可被新操作打断。`prefers-reduced-motion: reduce` 下非必要过渡关闭。

### WF-NFR-005 包质量

公共包必须生成 ESM、CJS 和 `.d.ts`，通过 publint 和类型消费验证，不把 React、React DOM 或 G2 打进发布 bundle。

### WF-NFR-006 浏览器支持

支持当前与前一主版本的 Chromium、Firefox 和 WebKit。核心 E2E 至少在 Chromium 运行，发布候选在三引擎运行。

### WF-NFR-007 隐私

本 feature 不包含网络请求和 AI provider。错误、遥测接口和默认 console 输出不得包含金额、标签或来源引用。

## Required Product States

- Ready：数据有效且编辑器可操作。
- Empty：数据结构有效但没有贡献项，保留起点与终点并提供明确空状态。
- Invalid data：阻断渲染并展示错误摘要与字段路径。
- Command rejected：保留当前视图，说明固定项、revision 冲突或非法目标原因。
- Exporting：导出操作禁用重复触发，可取消页面级离开但不锁住编辑。
- Reduced motion：布局直接更新，保留落点、焦点和状态反馈。

## Non-Goals

- 分类条形图、柱状图和其他图表类型。
- AI 自然语言输入或外部网络调用。
- 服务端存储、权限、协同编辑和多人冲突合并。
- 可编辑 PowerPoint 对象、PowerPoint Add-in 和 PPTX 生成。
- 拖动柱高修改金额。
- 通用插件系统、通用图表 grammar 或单独 core npm 包。

## Success Criteria

- WF-SC-001：真实财务 fixture 可以完整完成排序、分组、折叠、撤销、保存、恢复和 SVG 导出。
- WF-SC-002：属性化命令序列中来源不丢失不重复、金额总和不漂移、失败命令不改变 session。
- WF-SC-003：图表与大纲执行相同 move 命令后得到字节级一致的规范化 `ViewSpec`。
- WF-SC-004：参考编辑器在 1440x900、1024x768 和 390x844 下无重叠或不可达主操作。
- WF-SC-005：公共包 build、types、publint、unit、component、e2e、axe 与视觉检查全部通过。

## Clarifications

- 2026-07-15：第一阶段交付 React 组件包与薄参考编辑器。
- 2026-07-15：本 feature 只做瀑布图端到端切片，分类图作为下一切片。
- 2026-07-15：Phase 1A 不引入 Motion；是否引入由后续真实 DOM 布局复杂度决定。
- 2026-07-15：SVG/PNG 是第一阶段演示文稿输出边界。
