# TellPlot 数据合同

TellPlot 使用 schema generation 区分持久化 wire。`1.0.0` 表示 legacy waterfall，`2.0.0` 表示带
`dataKind` 的 waterfall 或单序列 categorical，`3.0.0` 表示 2 至 4 个序列的 categorical comparison。
source 是宿主持有的不可变事实；编辑动作只生成新的 `ViewSpec`。

## 多序列 source

```ts id=comparison-source mode=standalone
import type { CategoricalComparisonSourceData } from 'tellplot';

export const source = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'actual-versus-budget',
  currency: 'CNY',
  series: [
    { id: 'actual', label: '实际' },
    { id: 'budget', label: '预算' },
  ],
  items: [
    {
      id: 'enterprise',
      label: '企业业务',
      values: [
        { seriesId: 'actual', amount: 1680 },
        { seriesId: 'budget', amount: 1540 },
      ],
    },
  ],
} as const satisfies CategoricalComparisonSourceData;
```

`series` 的 source order 是 marks、legend、shared Tooltip、数值标签、Inspector、摘要和导出的唯一顺序。
每个 item 必须为每个 series 提供恰好一个 value，且 `values` 顺序与 registry 一致。series 数量只能为
2、3 或 4；categories 可以为空。ID 在各自 registry 内唯一，金额必须是有限安全数。

## 多序列 view

```ts id=comparison-view mode=standalone
import type { CategoricalComparisonViewSpec } from 'tellplot';

export const view = {
  schemaVersion: '3.0.0',
  datasetId: 'actual-versus-budget',
  chartType: 'column',
  revision: 0,
  rootOrder: ['enterprise'],
  groups: {},
  collapsedGroupIds: [],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
} as const satisfies CategoricalComparisonViewSpec;
```

`ViewSpec` 只改变 category narrative：顺序、递归分组、折叠、固定、注释和强调。series 不是 view node，
不能单独排序、分组、固定或注释。collapsed group 按每个 series 分别聚合；任何不安全聚合都会让整个投影
原子失败。

## 兼容边界

source 与 view 必须具有相同 schema、dataset 和 chart family。schema `3.0.0` 只接受 `bar` 或 `column` 的
schema `3.0.0` view。`parseViewSpec` 不跨 generation 迁移，v1/v2 wire 和 runtime 保持原样。需要从 scalar
数据构造 comparison 时，由宿主明确提供 series 语义并选择[迁移路径](migration.md)。
