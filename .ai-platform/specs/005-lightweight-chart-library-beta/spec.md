# G002 轻量图表库 Beta Spec

## Metadata

- Feature ID: `005-lightweight-chart-library-beta`
- Goal ID: `G002`
- Version: 0.5.0
- Status: Confirmed
- Last updated: 2026-07-23
- Approval: 用户于 2026-07-20 明确批准 G002；于 2026-07-22 明确批准演示页常驻代码与可选面板布局；于
  2026-07-23 明确要求演示代码与图形双向实时对应并采用亮色主题

## Goal

把已经验收的 waterfall、bar 和 column 能力整理成开发者可以直接安装、理解、集成和验证的
`@tellplot/editor` beta 包。G002 不增加图表类型或运行时框架，只收敛公共合同、开发者文档、发布包内容、
版本规则和 release-candidate evidence。

## User Outcomes

- React 开发者可以从 package README 在一个最小应用中完成安装、样式引入和首图渲染。
- 开发者可以使用声明式 `ChartConfig`，区分受控和非受控模式，并正确保存、恢复和导出图表。
- 开发者可以查到公共 runtime exports、主要类型、错误模型、schema 兼容和配置边界。
- 发布包只包含运行所需 dist、声明、样式、README、LICENSE 和 package metadata。
- beta 包在 React 18/19、ESM/CJS、当前/上一发布浏览器中通过真实消费验证。
- 开发者可以从演示页直接查看并复制与真实公共 API 一致的安装、引入和安全配置示例。
- 开发者可以在演示页分别编辑可校验的公共 `ChartConfig` 与 `ViewSpec`，并实时查看效果。

## Requirements

### BETA-FR-001 公共 API 合同

记录并测试唯一 runtime entry、稳定类型、styles subpath、peer dependency 和内部边界。G002 不导出 G2
instance、`G2Spec`、projection、scene adapter 或 runtime handle。

### BETA-FR-002 开发者入门

提供安装、最小渲染、waterfall、bar/column、受控/非受控、保存/恢复、导出和 `ChartConfig` 示例。示例必须通过
TypeScript package consumer 编译。

### BETA-FR-003 错误与兼容

文档覆盖 `ValidationResult`、`CommandError`、`TellPlotExportError`、legacy/current schema、source/view
compatibility 和常见接入错误，不暴露数据值或 G2 内部异常。

### BETA-FR-004 Beta 版本

`@tellplot/editor` 使用 `0.1.0-beta.1`。根 workspace 与私有 playground 不参与发布版本。npm publish 和
正式 Git release 不在本目标授权范围。

### BETA-FR-005 包内容

发布 tarball 包含 ESM、CJS、`.d.ts`、`.d.cts`、styles、source maps、package README、LICENSE 和
package.json；不包含源码、测试、playground、evidence 或内部文档。

### BETA-FR-006 迁移规则

定义 beta SemVer、schema 兼容、公共入口和升级检查。产品定位中不存在的 `ai` command source 在 beta
前从公共 wire union 删除；`host` 是外部调用来源。其余 runtime exports 和 command wire shape 保持。

### BETA-FR-007 目标级交付

G002 内部工作流连续执行，不逐项请求用户验收；最终统一提供 API、文档、tarball、测试和 residual risk
evidence，并停在 `Needs_Review`。

### BETA-FR-008 演示页集成入口

参考编辑器工具栏提供“使用”入口，以可访问对话面板展示安装命令、React 最小引入和
`ChartConfig` 配置。代码必须来自当前 beta 公共 API，不暴露 G2 instance 或内部 runtime；复制操作具有
明确反馈，面板支持键盘关闭和移动端视口。

### BETA-FR-009 开发者演示布局

桌面演示页默认同时显示左侧使用代码、中间图表和右侧结构大纲/检查器标签栏；窄屏退化为按需对话面板。
`ChartEditor` 通过 `config.editor` 控制结构大纲位置、检查器呈现模式，以及 outline、inspector 和 toolbar
的独立显隐。未配置时保持组件默认布局。

### BETA-FR-010 双向公共配置与视图编辑

演示页左侧默认显示亮色实时编辑器，并提供独立 `tellplot.config.json` 和 `tellplot.view.json`。
合法 `ChartConfig` 修改经过严格校验后更新右侧图表；右侧直接操作、结构大纲、键盘和检查器命令产生的
`ViewSpec` 变化反向更新视图文件。非法草稿保留并显示稳定错误路径，右侧保持最后一次合法状态。

## Non-Functional Requirements

- BETA-NFR-001：无新增 runtime/dev dependency。
- BETA-NFR-002：TypeScript strict；禁止 `any`、`@ts-ignore`、`@ts-expect-error`。
- BETA-NFR-003：现有 unit/coverage、package、React、browser、a11y、performance 和 export gates 不得弱化。
- BETA-NFR-004：文档示例与真实公共类型保持同步。
- BETA-NFR-005：包内容与 public exports 由确定性 contract tests 锁定。
- BETA-NFR-006：核心包不发起网络请求，普通日志不包含金额、标签或来源明细。
- BETA-NFR-007：编辑器布局是 `ChartConfig` 的可选公共语义，不导出内部 panel component 或 CSS selector 合同。
- BETA-NFR-008：实时编辑器只解析本地 JSON 并复用公共数据校验；不得使用 `eval`、`new Function`、任意
  JavaScript/TypeScript 执行、远程编译、iframe runtime 或新增编辑器依赖。

## Non-Goals

- 新图表类型、运行中图表切换或多序列图表。
- 未经配置改变核心编辑器默认视觉，或改变图表交互行为。
- G2 分包、替换 G2、第二渲染引擎或通用插件系统。
- 新状态库、动画库、文档站框架或 release automation dependency。
- npm publish、GitHub Release、push、PR、merge 或旧仓库处置。
- 通用代码 IDE、任意 JavaScript/TypeScript 执行环境、生产组件内置代码编辑器或新的公共文档 schema。

## Success Criteria

- BETA-SC-001：package README 的最小示例通过独立类型消费和真实 React matrix。
- BETA-SC-002：public runtime exports 精确匹配批准列表，declarations 不泄漏内部 G2/runtime 类型。
- BETA-SC-003：`pnpm pack --dry-run --json` 内容满足 BETA-FR-005，版本为 `0.1.0-beta.1`。
- BETA-SC-004：publint、attw、ESM/CJS/types consumers 全部通过。
- BETA-SC-005：完整 release-candidate gates 通过，无 unresolved Critical/High/Medium finding。
- BETA-SC-006：演示页使用入口在桌面和移动视口可用，示例通过类型检查，dialog、tabs、复制反馈和焦点返回
  通过真实浏览器与可访问性验证。
- BETA-SC-007：桌面端代码、图表和右侧 panel rail 同时可见；`config.editor` 的默认、右侧标签栏、单面板
  和无面板组合通过组件、类型、浏览器与无障碍测试。
- BETA-SC-008：左侧合法配置实时更新图形，右侧结构编辑回写独立 `ViewSpec`，非法草稿不改变图形；编辑器
  采用亮色主题，并通过解析单测、双向浏览器测试、移动视口与可访问性检查。

## Approval Gate

用户已批准 G002 的目标范围与目标级执行方式。内部任务不设置用户验收点；breaking scope、依赖、远程
Git 和 publish 仍需独立明确授权。
