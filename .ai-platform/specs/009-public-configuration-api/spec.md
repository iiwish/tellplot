# G002-R3 公共配置 API v1 Spec

## Metadata

- Feature ID: `009-public-configuration-api`
- Goal ID: `G002-R3`
- Version: 0.2.0
- Status: Confirmed
- Last updated: 2026-07-23
- Approval: 用户于 2026-07-23 明确同意依据公共配置审查结论完成 G002-R3 优化，并批准发布前公共 API 调整

## Goal

为 `@tellplot/editor` 建立清晰、声明式、可校验的公共配置入口，使第一次接入者只需要理解图表配置和可选
视图状态，不需要把 playground 私有文档或内部 `ViewSpec` 初始化流程当作普通画图配置。

G002-R3 保留现有 `SourceData`、`ViewSpec`、命令模型和 G2 ownership，不增加图表家族、通用图形语法或
原始 G2 options 透传。

## User Outcomes

- 开发者使用一份 `ChartConfig` 声明 `type`、`data`、`appearance` 和 `editor`。
- `bar`、`column` 与 `waterfall` 是一等配置，不需要为了选择图表类型手工构造 `ViewSpec`。
- 图表配置与可编辑 `ViewSpec` 明确分离；受控和非受控状态仍使用 React 标准模式。
- TypeScript 在编译期阻止图表类型与数据家族不匹配，JavaScript 可以通过 `validateChartConfig` 获得结构化错误。
- 演示页默认编辑真实公共 `ChartConfig`，并以独立高级视图展示和双向编辑 `ViewSpec`。

## Requirements

### CONFIG-FR-001 声明式公共入口

公共 React 入口使用 `ChartEditor`。组件必需属性为 `config: ChartConfig`；可编辑状态使用 `view`、
`defaultView` 和 `onViewChange`，不得把 source、appearance、panels 和 layout 分散为普通接入者必须组合的
顶层属性。

### CONFIG-FR-002 判别式图表配置

`ChartConfig` 以 `type` 判别：

- `waterfall` 只接受 waterfall source。
- `bar` 与 `column` 只接受 categorical source。
- `data` 保持现有 schema、稳定 ID、金额和来源合同。

### CONFIG-FR-003 渐进式外观配置

`appearance` 使用 `colors`、`axes`、`labels`、`tooltip`、`animation`、`groupRegion` 和 `numberFormat`。
坐标轴使用 `category` / `value` 语义；瀑布图颜色可以包含 start/subtotal/end，分类图类型不暴露这些字段。
数值标签与分组标签支持显示策略简写和对象式配置；对象式配置覆盖内外位置、有限偏移、颜色、字号、字重
和可选背景。公共配置只接受可序列化纯数据，不接受 formatter、逐数据项 callback、碰撞回调或原始 G2
label options。

### CONFIG-FR-004 编辑器配置

`editor` 收纳 `readOnly`、`historyLimit`、`panels`、`outline.placement` 和 `inspector.mode`。`locale` 与
`height` 属于完整图表配置。未配置字段保持现有默认行为。

### CONFIG-FR-005 运行时校验

公共 `validateChartConfig(input)` 返回现有 `ValidationResult<ChartConfig>` 形状，拒绝未知字段、类型错误、
越界数字、非法颜色和 source/type 冲突。组件对不可信 JavaScript 配置显示稳定错误状态，并通过
`onConfigRejected` 提供不含业务数据的 issue。

### CONFIG-FR-006 状态与配置边界

`ChartConfig` 是宿主意图，`ViewSpec` 是顺序、分组、折叠、固定、注释和强调状态。改变配置不得直接改写
来源金额；受控 `view` 必须与 config data/type 兼容。

### CONFIG-FR-007 演示页真实性

playground 左栏提供两个文件视图：

- 默认“图表配置”只显示可直接传给 `ChartEditor` 的公共 `ChartConfig` JSON。
- “视图状态”显示公共 `ViewSpec` JSON，并随右侧编辑确定性回写。

两者均严格校验；非法草稿保留且不改变最后一次合法图表。playground 不再把私有 document wrapper 伪装成
用户配置。

### CONFIG-FR-008 公共命名

文档、示例和 package runtime 使用 `ChartEditor`、`ChartConfig`、`ChartAppearance`、`ChartEditorHandle`
等通用命名。内部实现可以保留历史文件名，但不得从 package entry 暴露 `FinancialChart*` 公共名称。

### CONFIG-FR-009 迁移说明

迁移文档记录 beta 前名称和属性映射。包尚未公开发布，因此不提供双 runtime 入口；高级
`createInitialViewSpec`、domain validators、session 和 command API 保持可用。

## Non-Functional Requirements

- CONFIG-NFR-001：不增加 runtime 或 dev dependency。
- CONFIG-NFR-002：TypeScript strict；禁止 `any`、`@ts-ignore`、`@ts-expect-error`。
- CONFIG-NFR-003：配置解析不得使用 `eval`、`new Function` 或远程编译。
- CONFIG-NFR-004：公共声明不得泄漏 G2Spec、Chart instance、projection 或内部 adapter 类型。
- CONFIG-NFR-005：现有数据不变量、导出、React 18/19、浏览器、a11y 和性能门禁不得弱化。
- CONFIG-NFR-006：配置错误不得包含金额、标签或 source 明细。

## Non-Goals

- 新图表家族、多序列、Dashboard、插件 registry 或任意 G2Spec。
- 删除 `SourceData` / `ViewSpec` schema 或把编辑状态写回原始数据。
- 通用 JavaScript IDE、代码执行器或新的编辑器依赖。
- npm publish、远程 Git、GitHub Release 或生产部署。

## Success Criteria

- CONFIG-SC-001：最小 waterfall、bar、column 示例只需一份 `ChartConfig` 和一个 `ChartEditor`。
- CONFIG-SC-002：类型测试拒绝 waterfall/categorical 错配和图表家族无关 appearance 字段。
- CONFIG-SC-003：运行时 validator 覆盖未知字段、非法嵌套值、source/type 冲突和合法配置。
- CONFIG-SC-004：playground 默认代码是公共 config；右侧结构编辑同步到独立 view 文件。
- CONFIG-SC-005：package runtime/type contract、quickstart、ESM/CJS、React 18/19 与 tarball consumer 通过。
- CONFIG-SC-006：完整 unit/coverage/build/package/E2E/a11y/performance/previous-browser gates 通过。
- CONFIG-SC-007：无 unresolved Critical、High 或 Medium public API finding。

## Approval Gate

用户已批准 G002-R3 的产品范围、breaking public API 和连续执行。依赖、新 schema、远程 Git、publish 和
release 仍需独立明确授权。
