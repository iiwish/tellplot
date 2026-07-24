# G002-R3 公共配置 API v1 Plan

## Metadata

- Feature ID: `009-public-configuration-api`
- Goal ID: `G002-R3`
- Version: 0.1.0
- Status: Confirmed
- Last updated: 2026-07-23
- Approval: 用户已批准依据公共配置审查结论连续完成 G002-R3

## Delivery Strategy

1. 用 package/type/component RED tests 锁定 `ChartEditor`、`ChartConfig`、运行时 validator 和旧公共名称移除。
2. 新增轻量 public config layer，把语义配置映射到现有 `FinancialChartEditor` 内部 surface。
3. 保持 domain、chart projection、command、G2 runtime 和 export ownership 不变。
4. 将 playground 状态收敛为 `ChartConfig + ViewSpec`，默认编辑 config，独立高级 tab 编辑 view。
5. 更新 package README、getting started、API、configuration、migration 和 compile-checked examples。
6. 运行发布候选完整门禁，完成 spec、bug/code-quality 与 QA review。

## Public API

Runtime exports:

- `ChartEditor`
- `validateChartConfig`
- `createEditorSession`
- `createInitialViewSpec`
- `executeCommand`
- `parseViewSpec`
- `redoSession`
- `serializeViewSpec`
- `undoSession`
- `validateSourceData`
- `validateViewSpec`

`ChartEditor` 只接受新的配置优先 React contract。内部历史组件不是 package runtime export。

## Compatibility Strategy

- 底层 `SourceData`、`ViewSpec`、command wire shape 和 schema generation 不变。
- `createInitialViewSpec` 保留给高级 session、恢复和非 React 使用。
- `FinancialChartEditor` 仅保留内部实现身份；package beta 尚未发布，不维持两个公共组件名称。
- G004 必须等待 G002-R3 目标级验收后重新进入本地发布硬化。

## Test Strategy

- RED：public runtime exports、type consumer、config validator、ChartEditor 渲染和 playground parser。
- GREEN：最小 public facade、严格 config validator、内部 appearance/layout mapping。
- REFACTOR：playground 双文件状态和文档使用同一公共类型，不复制领域校验。
- FINAL：format、lint、typecheck、unit、coverage、build、package、React matrix、current/previous browser、
  a11y、performance、artifact validator 和 diff check。

## Risk Controls

- wrapper 不拥有第二套图表 runtime，只适配现有内部组件。
- config type 与 runtime validator 使用同一字段白名单和数值边界。
- config 变化只在现有 view 兼容时保留状态，否则显式创建新初始 view。
- 演示页不执行 JavaScript；只解析本地 JSON。
- 不修改 G2 spec、projection、drag geometry、export 或命令不变量。
