# TellPlot 安全图表配置 Spec

## Metadata

- Feature ID: `003-chart-configuration-foundation`
- Status: Confirmed
- Last updated: 2026-07-19
- Approval: 用户于 2026-07-19 明确同意安全语义配置层、长期文档与产品路线图方向并要求继续实现

## Goal

为 `FinancialChartEditor` 提供有限、类型化、运行时安全的 `chartAppearance` 配置，使宿主能够调整常见图表呈现，同时保持财务领域状态、G2 编码、拖拽命中、导出和无障碍语义一致。

## Requirements

- 公共 API 使用 `FinancialChartAppearance`，不得接受 `G2Spec`、G2 chart instance 或任意 spec transform。
- 支持标题、财务语义色、X/Y 轴、数值标签模式、Tooltip、动画和数字格式。
- 默认配置必须保持当前已验收的视觉和交互行为。
- 配置同时作用于屏幕 G2 spec、SVG/PNG 导出和无障碍摘要；Tooltip 只属于交互屏幕。
- `prefers-reduced-motion` 和显式 `reducedMotion` 优先于动画配置。
- 运行时无效值必须回退或收敛到有限范围，不允许引发领域状态变化。
- `chartAppearance` 不写入 `ViewSpec`，不改变 SourceData、命令或财务不变量。
- 长期文档必须区分产品 SSOT、路线图、架构、配置边界和交付 evidence。

## Non-Goals

- 任意 G2 配置透传。
- 新图表类型、主题编辑器或 UI 配置面板。
- 修改拖拽、分组、折叠、持久化 schema 或财务计算。
- 引入新的运行时依赖。
