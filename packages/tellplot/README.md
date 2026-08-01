# tellplot

TellPlot 是基于 AntV G2 的框架无关可编辑图表库。一个包提供 imperative DOM、React、Vue 和无 DOM
数据/命令能力，完整编辑器只实现一次。

```bash
pnpm add tellplot
```

```ts
import { createEditor } from 'tellplot';
import 'tellplot/styles.css';

const host = document.querySelector<HTMLElement>('#chart');
if (!host) throw new Error('Missing chart host');

const editor = createEditor(host, {
  config: {
    type: 'column',
    data: {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: 'revenue',
      items: [{ id: 'north', label: 'North', amount: 128 }],
    },
  },
});
// Call editor.destroy() when the host unmounts.
```

React 使用 `tellplot/react`，Vue 3 使用 `tellplot/vue`；无 DOM 校验、命令和持久化可以从
`tellplot/core` 导入。

- [入门与三种集成](https://github.com/iiwish/tellplot/blob/main/docs/getting-started.md)
- [公共 API](https://github.com/iiwish/tellplot/blob/main/docs/api.md)
- [配置边界](https://github.com/iiwish/tellplot/blob/main/docs/configuration.md)
- [版本与兼容政策](https://github.com/iiwish/tellplot/blob/main/docs/versioning.md)
