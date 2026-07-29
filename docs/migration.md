# TellPlot 1.0 迁移与兼容

## 版本策略

`@tellplot/editor@1.0.0` 是首个稳定版本。1.x 遵循 Semantic Versioning；breaking public API、schema
或错误码变化只进入新的 major。升级仍应阅读 changelog、重新编译并运行关键交互与导出测试。

npm publish、Git tag 和正式 release 是独立交付闸门，版本字段本身不表示已经公开发布。

## 公共入口

- runtime 和类型：`@tellplot/editor`
- 样式：`@tellplot/editor/styles.css`

不要导入 `dist/`、`src/` 或内部 chart/rendering 路径。G2 `Chart`、`G2Spec`、projection 和 runtime handle
不属于兼容承诺。

## 1.0 前 React API 映射

1.0 使用声明式 `ChartEditor` 和 `ChartConfig`。未发布开发分支中的旧名称不提供并行 runtime 入口，
接入代码按下表迁移：

| 1.0 前名称或属性                               | 1.0                              |
| ---------------------------------------------- | -------------------------------- |
| `FinancialChartEditor`                         | `ChartEditor`                    |
| `sourceData`                                   | `config.data`                    |
| `chartAppearance`                              | `config.appearance`              |
| `panels`、`layout`、`readOnly`、`historyLimit` | `config.editor`                  |
| `locale`、`height`                             | `config.locale`、`config.height` |
| `viewSpec`、`defaultViewSpec`                  | `view`、`defaultView`            |
| `onViewSpecChange`                             | `onViewChange`                   |
| `getViewSpec()`                                | `getView()`                      |
| `appearance.palette`                           | `appearance.colors`              |
| `appearance.axes.x/y`                          | `appearance.axes.category/value` |
| `appearance.valueLabels`                       | `appearance.labels.value`        |
| `appearance.groupRegion.label`                 | `appearance.labels.group`        |
| `appearance.groupRegion.fillOpacity`           | `appearance.groupRegion.opacity` |

`ChartConfig.type` 选择 `waterfall | bar | column`，并在 TypeScript 和
`validateChartConfig` 中约束对应的 `data` 家族。`ViewSpec` 只承载排序、分组、折叠、固定、注释和强调；
普通接入不需要手工创建它。

## Schema 兼容

| Source                            | View               | 支持                         |
| --------------------------------- | ------------------ | ---------------------------- |
| legacy waterfall `1.0.0`          | waterfall `1.0.0`  | 是，保持原 generation 序列化 |
| current waterfall `2.0.0`         | waterfall `2.0.0`  | 是                           |
| current categorical `2.0.0`       | bar/column `2.0.0` | 是                           |
| waterfall source                  | bar/column view    | 否                           |
| categorical source                | waterfall view     | 否                           |
| 不同 dataset 或 schema generation | 任意               | 否                           |

TellPlot 不执行隐式 schema migration。升级持久化内容时应保留原始 source，调用 `parseViewSpec` 或
`validateViewSpec`，并对失败结果采用显式迁移或重新创建视图。

## CommandSource

1.0 公共 union 为 `direct | outline | keyboard | host`。未发布开发版本中的 `ai` literal 不进入稳定合同；
宿主系统、自动化流程或其他外部调用统一使用 `source: 'host'`。命令的其余 envelope 与 payload shape 不变。

## 升级检查

1. 安装目标 1.x 版本并保持 peer dependencies 满足范围。
2. 只从公共入口导入，并引入 styles subpath。
3. 用 TypeScript strict 重新编译应用。
4. 通过 `validateChartConfig` 校验宿主配置，并验证持久化 view 与当前 data 的 dataset、schema 和 chart type 兼容。
5. 验证受控状态更新、undo/redo、关键拖拽、SVG/PNG 和无障碍流程。
6. 确认宿主命令使用唯一 ID、当前 `baseRevision` 和 `source: 'host'`。
