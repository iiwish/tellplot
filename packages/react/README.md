# @tellplot/react

TellPlot 的 React 18/19 薄适配器。

在已有 React 18.3 或 19 项目中安装：

```bash
pnpm add @tellplot/core @tellplot/react @antv/g2@5.4.8
```

```tsx
import { ChartEditor, type ChartConfig } from '@tellplot/react';
import '@tellplot/react/styles.css';

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

export function Chart() {
  return <ChartEditor config={config} />;
}
```

不传 `view` 时组件管理编辑状态；受控接入使用 `view={view}` 与 `onViewChange={setView}`，也可以用
`defaultView` 指定非受控初值。`ChartEditorHandle` 通过 ref 提供 `focus`、`getView` 和 `exportImage`，卸载与
React Strict Mode cleanup 会自动销毁 imperative instance。

`onRenderError` 在图表渲染失败时收到稳定 issue，并在恢复成功后收到 `null`。

组件只映射 `@tellplot/editor` 生命周期；编辑状态、G2 和 UI 不在本包重复实现。完整状态和错误合同见
[入门](https://github.com/iiwish/tellplot/blob/main/docs/getting-started.md)与
[公共 API](https://github.com/iiwish/tellplot/blob/main/docs/api.md)。License: MIT。
