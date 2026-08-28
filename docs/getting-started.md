# TellPlot 入门与集成

TellPlot 的领域层和包 import 支持 SSR；实际编辑器只在浏览器中调用 `createEditor` 时访问 DOM 和 G2。
以下命令用于已经创建好的宿主项目，并安装本地 `tellplot@2.0.0` candidate artifact；React 与 Vue 示例默认
项目本身已安装对应 framework。`tellplot` 内部使用经过兼容与安全复核的精确 G2 `5.4.8`。

```bash
pnpm add ./tellplot-2.0.0.tgz
```

`2.0.0` 正式发布到 registry 后，宿主可以改用 `pnpm add tellplot@^2.0.0`。当前说明不表示 2.0 已发布。

## 公共配置

三种接入共用同一个 `ChartConfig`：

```ts
import type { ChartConfig } from 'tellplot';

export const config = {
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
  locale: 'zh-CN',
} as const satisfies ChartConfig;
```

`bar` 使用同一 categorical data，只需把 `type` 改为 `bar`。waterfall 使用带明确锚点语义的 current schema：

```ts
export const waterfallConfig = {
  type: 'waterfall',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'waterfall',
    datasetId: 'profit-bridge',
    items: [
      { id: 'opening', label: 'Opening', amount: 320, kind: 'start' },
      { id: 'growth', label: 'Growth', amount: 80, kind: 'contribution' },
      { id: 'cost', label: 'Cost', amount: -45, kind: 'contribution' },
      { id: 'subtotal', label: 'Operating', amount: 355, kind: 'subtotal' },
      { id: 'closing', label: 'Closing', amount: 355, kind: 'end' },
    ],
  },
} as const satisfies ChartConfig;
```

`start`、`subtotal`、`end` 是不可排序的 waterfall anchor，`contribution` 才进入叙事编辑；所有 item ID 在
同一 dataset 内唯一。

## 原生 DOM

```ts
import { createEditor } from 'tellplot';
import 'tellplot/styles.css';
import { config } from './config';

const host = document.querySelector<HTMLElement>('#chart');
if (!host) throw new Error('Missing chart host');

const editor = createEditor(host, {
  config,
  onViewChange(view) {
    localStorage.setItem('tellplot:view', JSON.stringify(view));
  },
});

// 在组件卸载或页面退出时调用。
export function unmountChart(): void {
  editor.destroy();
}
```

## React

```tsx
import { useState } from 'react';
import { createInitialViewSpec, type ViewSpec } from 'tellplot';
import { ChartEditor } from 'tellplot/react';
import 'tellplot/styles.css';
import { config } from './config';

const created = createInitialViewSpec(config.data, { chartType: config.type });
if (!created.ok) throw new Error('Invalid config data');

export function RevenueChart() {
  const [view, setView] = useState<ViewSpec>(created.value);
  return <ChartEditor config={config} view={view} onViewChange={setView} />;
}
```

## Vue 3

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { createInitialViewSpec } from 'tellplot';
import { ChartEditor } from 'tellplot/vue';
import 'tellplot/styles.css';
import { config } from './config';

const created = createInitialViewSpec(config.data, { chartType: config.type });
if (!created.ok) throw new Error('Invalid config data');
const view = ref(created.value);
</script>

<template>
  <ChartEditor :config="config" v-model:view="view" />
</template>
```

## 受控与非受控

- 不传 `view`：editor 维护并立即提交当前视图，`onViewChange` 收到已经提交的结果。
- `defaultView`：指定兼容的非受控初始视图；它不是持续同步的状态输入。
- 传入 `view`：editor 进入受控模式。React/imperative 使用 `onViewChange`，Vue 推荐 `v-model:view`。
- `view` 与 `defaultView` 互斥。

受控模式不会自行提交候选视图。用户操作、`dispatch`、`undo` 或 `redo` 成功后，界面仍显示宿主传入的
`view`；宿主应把 callback/event 的候选值重新传给 `editor.update`、React props 或 Vue `v-model:view` 才算
接受。外部命令使用当前可见 `view.revision` 作为 `baseRevision`，并为每次动作提供唯一 ID；同一候选被接受
前重复使用 ID 会稳定拒绝。

非法 config/view 会进入可恢复的 invalid 状态并调用 `onConfigRejected`/`config-rejected`，不会猜测迁移。
后续传入有效且兼容的 config/view 即可恢复。

`ChartConfig` 表达不可变来源数据与显示意图；`ViewSpec` 保存顺序、递归分组、折叠、固定、注释和强调。
持久化时使用 `serializeViewSpec` 与 `parseViewSpec`，不要持久化 DOM 或 G2 instance。

## 导出

imperative instance、React ref 和 Vue expose 都提供 `exportImage`：

```ts
const result = await editor.exportImage({ format: 'png', pixelRatio: 2 });
const url = URL.createObjectURL(result.blob);
// 宿主负责下载、上传或保存 Blob，并在完成后 revoke URL。
URL.revokeObjectURL(url);
```

## 生命周期

- imperative 接入在宿主卸载时调用幂等 `destroy()`；React/Vue adapter 自动处理卸载和 Strict Mode cleanup。
- 同一个 `HTMLElement` 同时只能挂载一个 live imperative instance。
- 每次 `update` 都提供完整 `EditorOptions`（包括 `config`）；省略的 callback 会被移除，不会沿用旧 callback。
- `destroy()` 后 `update`/`focus` 为 no-op，`dispatch`/`undo`/`redo` 返回 `null`，`getView` 抛出
  `EDITOR_DESTROYED`，`exportImage` 以 `EXPORT_UNAVAILABLE` 拒绝。

继续阅读 [公共 API](api.md)、[配置边界](configuration.md) 和 [错误处理](errors.md)。
