# Changelog

TellPlot 使用 Semantic Versioning。1.x 的 breaking public API、schema 或错误码变化只进入新的 major；
弃用遵循 [版本与兼容政策](docs/versioning.md)。

## 1.0.0

首个稳定版本。当前仓库生成本地稳定候选；公开 npm、GitHub Release 与生产网站状态以发布报告为准。

### Added

- 基于 AntV G2 的瀑布图、分类条形图和分类柱状图。
- 框架无关 `@tellplot/core`、imperative `@tellplot/editor`、React 18/19 与 Vue 3 adapters。
- 排序、递归分组、折叠、固定、注释、强调与撤销重做。
- `ViewSpec` 验证、序列化和恢复。
- SVG/PNG 导出、安全图表配置与无障碍摘要。
- ESM、CJS、TypeScript declarations 和独立样式入口。
- `createEditor`、React/Vue `ChartEditor`、判别式 `ChartConfig` 与运行时 `validateChartConfig`。
- 可序列化的数值/分组标签位置、偏移、字体、颜色与背景配置。
- 分离编辑公共图表配置和 `ViewSpec` 的亮色实时工作台。
- 基于容器宽度的 `narrow`、`compact`、`wide` 编辑器布局，不依赖 viewport 宽度。
- 可重试的稳定图表渲染错误状态，以及 imperative/React/Vue 一致的恢复通知。

### Changed

- `CommandSource` 固定为 `direct | outline | keyboard | host`；外部确定性命令使用 `host`。
- 配置统一收纳到 `config.data`、`config.appearance` 与 `config.editor`；可编辑状态使用 `view`、
  `defaultView` 和受控更新事件。
- 编辑器 runtime 与领域状态从 framework 生命周期中分离；framework adapters 只代理 create/update/destroy。

### Stability

- 四包 runtime exports、公共类型、schema、错误码、framework/G2 peer 范围和浏览器合同进入 1.x 兼容承诺。
- npm publish、Git tag、GitHub Release 和生产部署需要独立授权，版本字段不表示已经公开发布。
