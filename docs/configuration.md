# TellPlot 公共配置

## 配置模型

`ChartConfig` 是 TellPlot 的声明式公共配置。它保持可序列化、可校验，并且不会开放可能破坏图表投影、
拖拽命中、导出一致性或可访问性的 G2 内部字段。

```ts
const config = {
  type: 'waterfall',
  data: sourceData,
  locale: 'zh-CN',
  height: 680,
  appearance: {
    title: '经营利润桥',
    colors: {
      start: '#2F7CF6',
      positive: '#12B76A',
      negative: '#F04464',
      subtotal: '#2F7CF6',
      group: '#14B8A6',
      end: '#2F7CF6',
    },
    axes: { category: true, value: true },
    labels: {
      value: {
        display: 'auto',
        placement: 'outside',
        offset: 6,
        color: '#172B4D',
        fontSize: 12,
        fontWeight: 600,
      },
      group: { display: 'auto', placement: 'outside', offset: 4 },
    },
    tooltip: true,
    animation: { enabled: true, duration: 160 },
    groupRegion: { enabled: true, opacity: 0.06 },
    numberFormat: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      currencyDisplay: 'narrowSymbol',
    },
  },
  editor: {
    panels: { outline: false, inspector: false, toolbar: true },
    outline: { placement: 'right' },
    inspector: { mode: 'tabs' },
  },
} as const satisfies ChartConfig;
```

## 顶层字段

- `type`：`waterfall`、`bar` 或 `column`。
- `data`：与 type 家族兼容的严格 `SourceData`。
- `locale`：`zh-CN` 或 `en-US`。
- `height`：正有限数字或非空 CSS 高度字符串。
- `appearance`：图表呈现语义。
- `editor`：编辑能力和工作台 chrome。

## Appearance

- `title`：可见标题、导出标题和无障碍摘要标题。
- `colors`：正值、负值和分组颜色；waterfall 额外支持 start、subtotal 和 end。
- `axes`：以 `category` / `value` 表达语义轴，不要求用户理解 bar 的物理转置。
- `labels.value`：可使用 `auto`、`always`、`never` 简写，或使用下方对象式配置。
- `labels.group`：可使用 `auto`、`never` 简写，或使用下方对象式配置。
- `tooltip`：是否启用 G2 Tooltip；静态导出不包含交互 Tooltip。
- `animation`：启用状态和 0 至 1000ms 的时长；reduced motion 始终优先。
- `groupRegion`：展开分组背景与 0 至 0.2 的透明度。
- `numberFormat`：0 至 6 位小数和币种显示方式。

颜色只接受 3、4、6 或 8 位十六进制值，确保独立 SVG/PNG 导出得到相同颜色。

颜色使用业务语义键，不要求宿主了解内部 G2 mark。对象式标签配置支持：

| 字段                | 数值标签 | 分组标签 | 范围                                                |
| ------------------- | -------- | -------- | --------------------------------------------------- |
| `display`           | 是       | 是       | 数值标签 `auto/always/never`；分组标签 `auto/never` |
| `placement`         | 是       | 是       | `auto/inside/outside`                               |
| `offset`            | 是       | 是       | `0` 至 `24`                                         |
| `color`             | 是       | 是       | 十六进制颜色                                        |
| `fontSize`          | 是       | 是       | `8` 至 `32` 的整数                                  |
| `fontWeight`        | 是       | 是       | `100` 至 `900` 的整数                               |
| `background`        | 是       | 是       | boolean                                             |
| `backgroundColor`   | 是       | 是       | 十六进制颜色                                        |
| `backgroundOpacity` | 是       | 是       | `0` 至 `1`                                          |

`auto` 位置保留每类图表经过验证的默认放置；`inside` 与 `outside` 按数值方向自动翻转对齐，不要求宿主
区分 bar 的转置坐标。背景默认关闭，开启时使用紧凑内边距和圆角，不改变柱形命中。

数值内容使用 `numberFormat`。任意 formatter、逐数据项 callback、HTML 标签和原始 G2 label/spec
不属于公共配置，因为它们不可安全序列化，并会绕过屏幕/导出一致性与稳定命中合同。数值标签密集度由
TellPlot 的 `auto` 策略管理；碰撞选项暂不开放，避免提供一个对独立前景 text mark 无法可靠生效的
伪配置。

## Editor

- `readOnly`：禁用编辑命令。
- `historyLimit`：非负安全整数。
- `panels`：分别控制 outline、inspector 和 toolbar。
- `outline.placement`：`left` 或 `right`。
- `inspector.mode`：`static` 或 `tabs`。

这些字段只控制编辑器呈现，不进入 `ViewSpec`。

## 运行时校验

TypeScript 推荐使用 `satisfies ChartConfig`。JavaScript、不可信 JSON 或跨边界数据使用：

```ts
const result = validateChartConfig(input);
if (!result.ok) {
  console.error(result.errors[0]?.code, result.errors[0]?.path);
}
```

validator 拒绝未知字段、非法颜色、越界数值、类型错误和图表类型/source family 冲突。`ChartEditor`
也会显示稳定错误状态，并通过 `onConfigRejected` 报告相同 issue。

## 内部所有权

以下能力不属于公共配置：

- G2 `data`、transform、encode、scale、key 和 chart instance。
- 分类轴几何、scene bounds 和 Pointer Events 状态机。
- 任意 `G2Spec` merge、spec transform 或宿主 callback。
- projection、screen/export runtime 和 renderer。

需要新增呈现能力时，先定义稳定 TellPlot 语义，再由内部 adapter 映射到 G2。

React 宿主应把 `ChartConfig` 视为不可变值。更新数据或配置时传入新的 config/data 对象，不要原地修改
现有对象；`ChartEditor` 会保留仍与新 config 兼容的 `ViewSpec`，不兼容时创建新的确定初始视图。
