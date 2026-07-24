# TellPlot 入门与集成

## 环境要求

- Node.js 22.13 或更高版本用于构建与测试。
- React 18.3 或 React 19。
- 现代浏览器环境；图表渲染依赖 DOM、Canvas 和 G2。

## 安装

```bash
pnpm add @tellplot/editor @antv/g2 react react-dom
```

应用入口需要引入一次 TellPlot 样式：

```ts
import '@tellplot/editor/styles.css';
```

## 渲染第一个图表

公共配置只有四个主要层次：`type`、`data`、`appearance` 和 `editor`。最小图表只需要前两个。

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

分类数据支持 `bar` 和 `column`，图表类型直接由 `config.type` 声明。每个 item `id` 在同一数据集中必须
唯一，`amount` 必须是有限安全数值。

## 瀑布图

```tsx
const config = {
  type: 'waterfall',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'waterfall',
    datasetId: 'profit-bridge',
    currency: 'CNY',
    items: [
      { id: 'opening', label: '期初利润', amount: 1_000, kind: 'start' },
      { id: 'growth', label: '收入增长', amount: 240, kind: 'contribution' },
      { id: 'cost', label: '成本增加', amount: -90, kind: 'contribution' },
      { id: 'ending', label: '期末利润', amount: 1_150, kind: 'end' },
    ],
  },
  appearance: {
    title: '经营利润桥',
    labels: {
      value: { display: 'auto', placement: 'outside', offset: 6 },
    },
    tooltip: true,
  },
} as const satisfies ChartConfig;

export function ProfitBridge() {
  return <ChartEditor config={config} />;
}
```

## 配置与视图

`ChartConfig` 表达宿主意图和不可变来源数据；`ViewSpec` 保存顺序、分组、折叠、固定、注释和强调。
不传 `view` 时，组件按 `config.type` 创建并维护初始视图。

受控模式使用 `view` 和 `onViewChange`：

```tsx
import { useState } from 'react';
import { ChartEditor, createInitialViewSpec, type ViewSpec } from '@tellplot/editor';

const created = createInitialViewSpec(config.data, { chartType: config.type });
if (!created.ok) throw new Error('Unable to create view');
const initialView: ViewSpec = created.value;

export function ControlledChart() {
  const [view, setView] = useState(initialView);
  return <ChartEditor config={config} view={view} onViewChange={setView} />;
}
```

同一实例不要同时传入 `view` 和 `defaultView`。受控 view 的 dataset、schema 和 chart type 必须与 config
兼容。

## 分组交互

框选同一展开分组内的连续柱会创建子分组。框选同时覆盖分组内外的柱时，TellPlot 会把命中的内部柱提升
为完整分组边界，再与外部连续节点创建上层分组；确认对话框会显示实际生效的节点与来源范围。原始
`config.data` 始终不变，结构结果只写入 `ViewSpec`。

## 保存与恢复

```ts
import { parseViewSpec, serializeViewSpec } from '@tellplot/editor';

const json = serializeViewSpec(editorRef.current!.getView());
localStorage.setItem('tellplot:view', json);

const restored = parseViewSpec(localStorage.getItem('tellplot:view') ?? '', config.data);
if (restored.ok && restored.value.chartType === config.type) {
  setView(restored.value);
}
```

配置与视图应分别保存。TellPlot 不进行启发式 schema migration。

## 导出

```tsx
import { useRef } from 'react';
import { ChartEditor, type ChartEditorHandle } from '@tellplot/editor';

const editorRef = useRef<ChartEditorHandle>(null);

async function exportPng() {
  const result = await editorRef.current?.exportImage({ format: 'png', pixelRatio: 2 });
  if (!result) return;

  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.suggestedFilename;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

导出与屏幕渲染共享内部 G2 spec。宿主负责下载、上传或保存返回的 `Blob`。

## 下一步

- [公共 API](api.md)
- [配置边界](configuration.md)
- [错误处理](errors.md)
- [迁移与兼容](migration.md)
