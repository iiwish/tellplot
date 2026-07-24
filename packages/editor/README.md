# @tellplot/editor

基于 AntV G2 的轻量可编辑 React 图表组件。当前支持瀑布图、分类条形图和分类柱状图，并提供排序、递归
分组、跨层拖拽、撤销重做、视图持久化、SVG/PNG 导出与无障碍摘要。

## 安装

```bash
pnpm add @tellplot/editor @antv/g2 react react-dom
```

React 18.3 与 React 19 均受支持。应用入口需要引入一次样式：

```ts
import '@tellplot/editor/styles.css';
```

## 最小示例

```tsx
import { ChartEditor, type ChartConfig } from '@tellplot/editor';
import '@tellplot/editor/styles.css';

const config = {
  type: 'column',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'revenue-by-region',
    items: [
      { id: 'east', label: 'East', amount: 128 },
      { id: 'west', label: 'West', amount: 96 },
      { id: 'north', label: 'North', amount: 74 },
    ],
  },
  locale: 'en-US',
} as const satisfies ChartConfig;

export function RevenueChart() {
  return <ChartEditor config={config} />;
}
```

把 `type` 改为 `bar` 即可得到条形图，不需要手工创建 `ViewSpec`。瀑布图使用 `type: 'waterfall'` 和
waterfall source。编辑动作只更新独立 `ViewSpec`，不会改写 `config.data`。

## 公共边界

- 声明式入口：`ChartEditor` + `ChartConfig`
- 图表：`waterfall`、`bar`、`column`
- React 状态：source-only、非受控 `defaultView`、受控 `view`
- 校验：`validateChartConfig`、`validateSourceData`、`validateViewSpec`
- 输出：序列化 `ViewSpec`、SVG、PNG
- 内部实现：G2 spec、Chart instance、projection 与 rendering runtime 不属于公共 API

`1.0.0` 是首个稳定版本。本地仓库已经生成并验证稳定候选；npm publish 与正式 release 需要独立授权。

## 文档

- [入门与集成](https://github.com/iiwish/tellplot/blob/main/docs/getting-started.md)
- [公共 API](https://github.com/iiwish/tellplot/blob/main/docs/api.md)
- [配置边界](https://github.com/iiwish/tellplot/blob/main/docs/configuration.md)
- [错误处理](https://github.com/iiwish/tellplot/blob/main/docs/errors.md)
- [迁移与兼容](https://github.com/iiwish/tellplot/blob/main/docs/migration.md)
- [版本与兼容政策](https://github.com/iiwish/tellplot/blob/main/docs/versioning.md)

## License

MIT
