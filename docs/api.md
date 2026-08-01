# TellPlot 公共 API

```bash
pnpm add tellplot
```

根入口、core、React 和 Vue 使用同一个版本与 tarball；只允许从下列声明的 subpath 导入。

## `tellplot/core`

core 入口不访问 DOM、G2 或 UI framework，导出：

- `validateChartConfig`、`validateSourceData`、`validateViewSpec`。
- `createInitialViewSpec`、`parseViewSpec`、`serializeViewSpec`、`viewSpecsEqual`。
- `createEditorSession`、`executeCommand`、`undoSession`、`redoSession`。
- `createEditorStore`。
- `ChartConfig`、`SourceData`、`ViewSpec`、commands、errors、projection 与交互策略类型。

### Core runtime reference

| 分组           | Runtime exports                                                                                                                                                                                                                                        | 合同                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 校验结果       | `validationIssue`、`validationSuccess`、`validationFailure`                                                                                                                                                                                            | 构造不包含业务值的 `ValidationResult`                        |
| 配置/数据/视图 | `validateChartConfig`、`validateSourceData`、`validateViewSpec`、`viewMatchesChartConfig`                                                                                                                                                              | 校验 unknown 输入和 config/view compatibility                |
| 初始与持久化   | `createInitialViewSpec`、`parseViewSpec`、`serializeViewSpec`、`viewSpecsEqual`、`cloneViewSpec`                                                                                                                                                       | 创建、解析、确定性序列化和语义判等                           |
| 命令解析       | `parseEditorCommand`、`parseSessionActionMeta`、`commandError`                                                                                                                                                                                         | 解析封闭命令 wire shape 和历史动作 envelope                  |
| Session        | `createEditorSession`、`executeCommand`、`undoSession`、`redoSession`、`appendHistory`                                                                                                                                                                 | 不可变执行、revision、去重和有界历史                         |
| Store          | `createEditorStore`                                                                                                                                                                                                                                    | controlled/uncontrolled session、selection、callbacks 和订阅 |
| View tree      | `locateViewNode`、`containerChildren`、`ownGroup`、`groupContainsGroup`、`groupDepth`、`collectLeafSourceIds`                                                                                                                                          | 只读遍历递归分组树                                           |
| 不变量         | `validateEditorInvariants`                                                                                                                                                                                                                             | 校验 source/view 顺序、锚点、分组和引用完整性                |
| Projection     | `projectWaterfall`、`projectCategorical`                                                                                                                                                                                                               | 生成 renderer-neutral、确定性的可见 datum 序列               |
| 配置解析       | `sourceDataKind`、`createNarrativeChartPolicy`、`resolveFinancialChartAppearance`、`toFinancialChartAppearance`                                                                                                                                        | 选择图表策略并解析安全显示语义                               |
| 配置常量       | `DEFAULT_FINANCIAL_CHART_PALETTE`、`DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT`                                                                                                                                                                             | 只读默认 palette 与 number format                            |
| 移动策略       | `buildMoveItemCommand`、`buildMoveNodeCommand`、`resolvePointerDropPlacement`、`resolvePointerMoveTarget`、`resolveKeyboardMoveTarget`                                                                                                                 | 将 DOM/framework 输入归一为确定性命令目标                    |
| 分组策略       | `evaluateGroupSelection`                                                                                                                                                                                                                               | 把连续选择归一为 same-level、nested 或 lifted 分组           |
| 图表命中       | `categoryCoordinate`、`projectChartCategoryBounds`、`projectChartCategorySourceGroupBounds`、`isChartCategoryTargetWithinGroup`、`resolveChartCategoryDropTarget`、`resolveChartCategoryMinimumTargetHit`、`resolveChartCategorySourceGroupExitTarget` | 使用 renderer-owned bounds 解析 category-axis 交互           |

公共类型按相同边界分组：

- 数据/视图：`SourceData`、waterfall/categorical variants、`ViewSpec`、`ViewGroup`、branded ID、annotation 和 emphasis。
- 校验/错误：`ValidationResult`、`ValidationIssue`、`ValidationErrorCode`、`CommandResult`、`CommandError` 及 reason/code unions。
- 命令/状态：`EditorCommand` discriminated union、各 command/payload、`EditorSession`、history、`EditorStore` 与 snapshot/options。
- 配置：`ChartConfig` discriminated union、appearance/editor options 及 resolved financial appearance。
- 投影/交互：waterfall/categorical datum/projection、category bounds/hit/drop、selection、pointer/keyboard move types。

以上 named exports 都属于 1.x 公共表面；各字段的精确 readonly、union 和泛型签名以包内 `.d.ts` 为准。

## `tellplot`

根入口包含 `tellplot/core` 的全部公共能力，并额外提供 framework-neutral imperative editor：

```ts
const editor = createEditor(container, options);
```

`EditorOptions`：

| 字段                | 说明                                 |
| ------------------- | ------------------------------------ |
| `config`            | 必填 `ChartConfig`                   |
| `view`              | 受控 `ViewSpec`                      |
| `defaultView`       | 非受控初始 `ViewSpec`                |
| `onViewChange`      | 成功命令产生的候选视图与事件         |
| `onCommand`         | 成功命令事件                         |
| `onCommandRejected` | 稳定 `CommandError`                  |
| `onConfigRejected`  | 配置或 view 冲突                     |
| `onSelectionChange` | `SelectionState` 或 `null`           |
| `onRenderError`     | `ChartRenderIssue` 或恢复时的 `null` |

`EditorInstance`：

- `update(options): void`：原子更新完整配置、受控视图和 callbacks，不重建 runtime。省略的 callback 会被移除。
- `dispatch(command): CommandResult | null`、`undo(action?): CommandResult | null`、
  `redo(action?): CommandResult | null`。invalid、read-only 或已销毁实例返回 `null`；已执行命令返回结构化结果。
- `focus(): void`、`getView(): ViewSpec`、`exportImage(options): Promise<ExportResult>`。
- `destroy()`：幂等释放 G2、DOM、listeners、media queries、进行中的离屏导出和容器所有权。

同一 `HTMLElement` 同时只能由一个 live instance 占用。模块 import 不访问 DOM。
`destroy()` 期间尚未完成的 `exportImage()` 会以 `EXPORT_UNAVAILABLE` 和 `/export` 拒绝，不会保留离屏
G2 实例或 DOM。

传入 `view` 即为受控模式：成功动作生成 `CommandResult` 并通过 `onViewChange` 提供候选视图，但
`getView()` 与界面继续返回宿主视图，直到宿主用完整 `update({ config, view: candidate, ...callbacks })` 接受。
非受控模式在 callback 前提交结果。`view` 与 `defaultView` 同时出现会产生
`INVALID_CHART_CONFIG`/`/view` issue。

销毁后 `update`/`focus` 为 no-op，`dispatch`/`undo`/`redo` 返回 `null`，`getView` 抛出
`TellPlotEditorError`/`EDITOR_DESTROYED`，`exportImage` 以 `EXPORT_UNAVAILABLE` 拒绝。

## `tellplot/react`

`ChartEditor` props 与 `EditorOptions` 对齐，并支持 `className`、`style`。`ChartEditorHandle` 只代理
`focus`、`getView` 和 `exportImage`。Strict Mode 下每个创建的 instance 都会对应一次销毁。

传入 `view` 与 `onViewChange` 进行受控更新；只传 `defaultView` 或两者都不传时为非受控。卸载后调用旧 ref
handle 的 `getView` 会抛出未挂载错误，`exportImage` 会返回 rejected Promise。

## `tellplot/vue`

`ChartEditor` 支持 `config`、`view`、`defaultView` 和 `v-model:view`。事件包括 `view-change`、
`command`、`command-rejected`、`config-rejected`、`selection-change`、`render-error`；expose 与 React
handle 相同。

Vue 的 `update:view` 驱动 `v-model:view`，`view-change` 同时提供候选 view 与 `CommandEvent`。其他 attributes
（包括 class/style 和原生事件）落在稳定宿主元素上。

图表渲染失败会显示稳定、可重试的编辑器内错误状态，同时通过 React `onRenderError` 或 Vue
`render-error` 通知宿主。通知只包含 `{ code: 'CHART_RENDER_ERROR', path: '/chart' }`；下一次成功渲染
以 `null` 表示恢复。原生异常文本、G2 内部对象和宿主数据不会进入该公共事件。

## 数据与命令

`ChartConfig` 以 `type` 区分 `waterfall | bar | column`。`ViewSpec` 只保存可编辑叙事状态。所有编辑入口
产生封闭 `EditorCommand`，`CommandSource` 为 `direct | outline | keyboard | host`。

推荐 source 使用 `schemaVersion: '2.0.0'`：waterfall 还包含 `dataKind: 'waterfall'` 与
`start | contribution | subtotal | end` item kind；bar/column 共用 `dataKind: 'categorical'` 和无 kind item。
legacy waterfall `1.0.0` 只用于兼容现有持久化内容。

`ViewSpec` 的持久化字段包括 `schemaVersion`、`datasetId`、`chartType`、`revision`、`rootOrder`、`groups`、
`collapsedGroupIds`、`pinnedItemIds`、`annotations` 和 `emphasis`。它必须与 source 的 dataset/schema/family
一起校验；不要手工删除 source reference 或跨 dataset 复用。

`EditorCommand` 包含 `schemaVersion: '1.0.0'`、唯一 `id`、`type`、`source`、`baseRevision` 和严格 payload。
支持 `moveItem`、`moveGroup`、`createGroup`、`ungroup`、`collapseGroup`、`expandGroup`、`pinItem`、
`unpinItem` 与 `setAnnotation`。宿主命令使用 `source: 'host'`。

`viewSpecsEqual` 用于宿主更新判等；`rootOrder` 与分组子项保持有序语义，`collapsedGroupIds` 和
`pinnedItemIds` 按成员集合比较。

配置、数据和视图校验返回 `ValidationResult<T>`。普通输入错误不抛异常；instance 生命周期和导出错误使用
结构化 error name/code。

宿主 callback 异常不会回滚已经验证的命令、逃逸到编辑器事件循环或进入公共错误详情。callback 中需要的
监控和重试由宿主自行处理。

## 导出类型

`ExportOptions`：

| 字段         | 类型             | 说明                               |
| ------------ | ---------------- | ---------------------------------- |
| `format`     | `'svg' \| 'png'` | 必填输出格式                       |
| `pixelRatio` | `number`         | PNG 像素比；必须为受支持的正有限值 |
| `background` | `string`         | 可选背景色                         |
| `filename`   | `string`         | 可选建议文件名                     |

`ExportResult` 返回 `blob`、`mimeType`、`suggestedFilename`、`width` 和 `height`。导出不会自动下载、上传或
创建长期 object URL；这些资源由宿主负责。结构化失败见[错误处理](errors.md)。

## 内部边界

G2 `Chart`/`G2Spec`、scene context、DOM controllers、gesture session、chart-family spec 和 export runtime
不属于公共 API。应用不得导入 `src/`、`dist/` 或未声明 subpath。
