# @tellplot/core

TellPlot 的框架无关领域与状态包，包含配置/数据/视图校验、投影、命令、历史、持久化、交互策略和
`EditorStore`。模块不访问 DOM、G2、React 或 Vue，可在 Node 和 SSR 中使用。

```bash
pnpm add @tellplot/core
```

```ts
import {
  createInitialViewSpec,
  validateChartConfig,
  type ChartConfig,
} from '@tellplot/core';

const config = {
  type: 'column',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'revenue-by-region',
    items: [
      { id: 'east', label: 'East', amount: 128 },
      { id: 'west', label: 'West', amount: 96 },
    ],
  },
} as const satisfies ChartConfig;

const checked = validateChartConfig(config);
if (!checked.ok) throw new Error(checked.errors[0]?.code);

const initial = createInitialViewSpec(checked.value.data, { chartType: checked.value.type });
if (!initial.ok) throw new Error(initial.errors[0]?.code);
```

`SourceData` 保存宿主事实，编辑命令只产生新的 `ViewSpec`。使用 `createEditorStore`、命令和持久化 API 的
完整合同见[公共 API](https://github.com/iiwish/tellplot/blob/main/docs/api.md)；需要可见编辑器时选择
`@tellplot/editor`、`@tellplot/react` 或 `@tellplot/vue`。

License: MIT。
