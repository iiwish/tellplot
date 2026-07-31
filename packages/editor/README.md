# @tellplot/editor

TellPlot 的框架无关 imperative DOM/G2 编辑器。完整 toolbar、outline、chart、inspector、交互、历史、
无障碍摘要和 SVG/PNG 导出都由本包实现。

```bash
pnpm add @tellplot/core @tellplot/editor @antv/g2@5.4.8
```

```ts
import { createEditor, type ChartConfig } from '@tellplot/editor';
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
    ],
  },
} as const satisfies ChartConfig;

const host = document.querySelector<HTMLElement>('#chart');
if (!host) throw new Error('Missing chart host');

const editor = createEditor(host, {
  config,
  onViewChange(view) {
    save(view);
  },
});

export function unmountChart(): void {
  editor.destroy();
}
```

不传 `view` 时实例直接提交编辑；传入 `view` 后，`onViewChange` 只提供候选视图，宿主必须通过
`editor.update({ config, view: nextView, onViewChange })` 接受它。`view` 与 `defaultView` 互斥。

React 使用 `@tellplot/react`，Vue 3 使用 `@tellplot/vue`。领域校验、命令和持久化直接使用
`@tellplot/core`。完整生命周期、错误码和导出合同见
[公共 API](https://github.com/iiwish/tellplot/blob/main/docs/api.md)与
[错误处理](https://github.com/iiwish/tellplot/blob/main/docs/errors.md)。

公共入口不暴露 G2 instance、spec、scene context 或 DOM controller。License: MIT。
