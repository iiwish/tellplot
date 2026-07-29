# G002 Requirements Checklist

## Metadata

- Version: 0.4.0
- Status: Completed
- Source spec: `../spec.md` 0.4.0 Confirmed
- Last updated: 2026-07-23

## Product And Scope

- [x] 是否把 G002 限定为现有图表的 beta 产品化，而不是新增图表？[Scope]
- [x] 是否明确 G2 继续拥有渲染、场景边界和动画？[Architecture]
- [x] 是否排除 registry、第二渲染引擎、新依赖和视觉改版？[Boundary]
- [x] 是否明确 npm publish 和远程 Git 不在授权范围？[Governance]
- [x] 是否定义用户只验收目标整体，不逐项验收内部任务？[Delivery]

## API And Package

- [x] 是否列出精确 runtime exports 与 internal boundary？[API]
- [x] 是否定义 beta version、tarball allowlist 和 peer compatibility？[Package]
- [x] 是否定义 schema、受控/非受控、error 和 migration 文档？[Documentation]
- [x] 是否用 compile-checked consumer 防止示例漂移？[Quality]
- [x] 是否披露 `ai` command source 的 beta 前收窄？[Compatibility]
- [x] 是否让演示页代码只使用真实 beta 公共 API 和安全配置？[Integration]
- [x] 是否定义 dialog、tabs、复制反馈、焦点返回和移动端可用性？[Accessibility]
- [x] 是否保持 `panels` 的 outline/inspector/toolbar 独立显隐能力？[API]
- [x] 是否让未配置用户保持当前默认布局，并只以可选 `layout` 启用右侧标签栏？[Compatibility]
- [x] 是否避免通过 playground CSS 依赖编辑器内部 DOM 排序？[Architecture]
- [x] 左侧文档是否精确覆盖当前 source、view、appearance、panels 和 layout？[Consistency]
- [x] 合法左侧修改是否更新图形，右侧命令是否只回写 `ViewSpec`？[Bidirectional]
- [x] 非法草稿是否保留且不改变最后一次合法图形状态？[Safety]
- [x] 是否明确禁止 eval、任意 JS/TS 执行、远程编译和新增编辑器依赖？[Security]
- [x] 是否保留独立接入示例并采用亮色代码主题？[Developer Experience]

## Validation

- [x] 是否保留 unit/coverage、package、React、browser、a11y、performance 和 export gates？[Regression]
- [x] 是否要求 strict types、无 escape type 和无内部 G2 export？[Safety]
- [x] 是否要求 goal-level diff、test results、review 和 residual risk？[Evidence]
- [x] 是否覆盖默认、右侧标签栏、单面板、无面板与窄屏退化？[Layout]
- [x] 是否覆盖解析单测、左到右、右到左、非法输入、键盘应用与移动端？[Live Editor]

## Findings

- Critical: 0
- High: 0
- Medium: 0
- Low: 0
