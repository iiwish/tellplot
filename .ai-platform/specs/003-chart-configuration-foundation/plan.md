# TellPlot 安全图表配置 Plan

## Metadata

- Status: Confirmed
- Last updated: 2026-07-19

## Design

1. 在独立配置模块定义公共类型、默认值和纯运行时解析器。
2. `FinancialChartEditorProps.chartAppearance` 将原始配置传给内部 G2 adapter 与导出路径。
3. `createWaterfallChartSpec` 解析同一配置并生成屏幕/导出共享的 `G2Spec`。
4. 数字格式函数和无障碍摘要接受已解析的有限数字格式。
5. G2 `data`、编码、稳定 key、band geometry 和事件继续由内部 spec 独占。

## TDD

1. RED：公共类型、配置解析、G2 spec 映射、组件 rerender 和导出配置测试失败。
2. GREEN：实现最小类型、解析器和端到端配置传递。
3. REFACTOR：统一默认值与屏幕/导出 spec，保持现有无配置调用结果不变。

## Validation

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:coverage`
- `pnpm build`
- `pnpm test:package`
- `pnpm test:e2e`
- `pnpm test:a11y`
- `pnpm test:performance`
- artifact validator
- `git diff --check`
