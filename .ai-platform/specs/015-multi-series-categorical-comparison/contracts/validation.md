# G003 Validation Contract

## Metadata

- Version: 0.1.0
- Status: Confirmed
- Feature ID: `015-multi-series-categorical-comparison`
- Last updated: 2026-08-12
- Approval: 用户于 2026-08-12 明确批准本 breaking validation contract

## Error Union Delta

`ValidationErrorCode` 精确不变。`ValidationIssueReason` 在全部 existing members 后增加：

```typescript
export type ValidationIssueReason =
  | 'EXPECTED_OBJECT'
  | 'INVALID_TYPE'
  | 'NON_PLAIN_DATA'
  | 'UNKNOWN_FIELD'
  | 'UNREADABLE_INPUT'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'EMPTY_ID'
  | 'EMPTY_LABEL'
  | 'DUPLICATE_SOURCE_ITEM_ID'
  | 'NON_FINITE_AMOUNT'
  | 'UNSAFE_AMOUNT'
  | 'INVALID_SOURCE_ITEM_KIND'
  | 'INVALID_DATA_KIND'
  | 'INVALID_METADATA_VALUE'
  | 'INVALID_ANCHOR'
  | 'DATASET_ID_MISMATCH'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'INCOMPATIBLE_CHART_TYPE'
  | 'INVALID_CHART_TYPE'
  | 'INVALID_REVISION'
  | 'INVALID_HISTORY_LIMIT'
  | 'UNKNOWN_SOURCE_REFERENCE'
  | 'MISSING_SOURCE_REFERENCE'
  | 'DUPLICATE_VIEW_NODE'
  | 'LOCKED_ANCHOR_REFERENCE'
  | 'ANCHOR_SEGMENT_ORDER'
  | 'GROUP_ID_MISMATCH'
  | 'RESERVED_GROUP_ID'
  | 'GROUP_SOURCE_ID_CONFLICT'
  | 'GROUP_TOO_SMALL'
  | 'DUPLICATE_GROUP_CHILD'
  | 'INVALID_GROUP_CHILD'
  | 'GROUP_CROSSES_ANCHOR'
  | 'DUPLICATE_GROUP_MEMBERSHIP'
  | 'CYCLIC_GROUP_REFERENCE'
  | 'ORPHAN_GROUP'
  | 'DUPLICATE_REFERENCE'
  | 'UNKNOWN_GROUP_REFERENCE'
  | 'INVALID_PIN_REFERENCE'
  | 'INVALID_ANNOTATION'
  | 'ANNOTATION_TOO_LONG'
  | 'UNKNOWN_NODE_REFERENCE'
  | 'INVALID_EMPHASIS'
  | 'INVALID_SERIES_COUNT'
  | 'DUPLICATE_SERIES_ID'
  | 'DUPLICATE_SERIES_LABEL'
  | 'UNKNOWN_SERIES_REFERENCE'
  | 'DUPLICATE_SERIES_VALUE'
  | 'MISSING_SERIES_VALUE'
  | 'SERIES_VALUE_ORDER_MISMATCH'
  | 'DUPLICATE_SERIES_COLOR'
  | 'INCOMPATIBLE_PROJECTOR_GENERATION';
```

固定 English messages：

| Reason                              | Message                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `INVALID_SERIES_COUNT`              | `Series count must be between two and four.`             |
| `DUPLICATE_SERIES_ID`               | `Series identifiers must be unique.`                     |
| `DUPLICATE_SERIES_LABEL`            | `Series labels must be unique after normalization.`      |
| `UNKNOWN_SERIES_REFERENCE`          | `Reference does not match a declared series.`            |
| `DUPLICATE_SERIES_VALUE`            | `Category values must contain each series exactly once.` |
| `MISSING_SERIES_VALUE`              | `Category values must cover every declared series.`      |
| `SERIES_VALUE_ORDER_MISMATCH`       | `Category values must follow declared series order.`     |
| `DUPLICATE_SERIES_COLOR`            | `Series color may be configured only once.`              |
| `INCOMPATIBLE_PROJECTOR_GENERATION` | `Projector does not support this schema generation.`     |

## Validation Processing

- 所有 v3 objects 必须是 plain object 或 null-prototype plain object，字段必须是 own、enumerable data
  properties。
- arrays 必须 dense，不接受附加 field、symbol key、accessor、hole 或 Proxy inspection failure。
- unknown field、unreadable input、metadata、amount、sourceRef 与 primitive rules 复用既有 closed validator。
- issues 按 source/config 的稳定 traversal order 累积，不抛出预期输入异常。
- `details`、message、普通日志和 evidence 不得包含原始 ID、label、amount、sourceRef、metadata value 或
  custom color；只允许 field/index/count/operation 等非业务值。
- source series registry 无法可靠建立时仍校验 value 的局部 structure/type，但跳过 reference、coverage、
  order 等 relational issues，避免 cascade。

## Source Paths And Reasons

### Source Root And Series

| Invalid condition                  | Code / Reason                                  | Path                | Safe details                              |
| ---------------------------------- | ---------------------------------------------- | ------------------- | ----------------------------------------- |
| v3 root missing/non-array `series` | `INVALID_SOURCE_DATA / INVALID_TYPE`           | `/series`           | none                                      |
| series length outside 2..4         | `INVALID_SOURCE_DATA / INVALID_SERIES_COUNT`   | `/series`           | `{ minimum: 2, maximum: 4, actualCount }` |
| series entry not plain object      | `INVALID_SOURCE_DATA / EXPECTED_OBJECT`        | `/series/{i}`       | none                                      |
| missing/non-string series ID       | `INVALID_SOURCE_DATA / INVALID_TYPE`           | `/series/{i}/id`    | none                                      |
| trim-empty series ID               | `INVALID_SOURCE_DATA / EMPTY_ID`               | `/series/{i}/id`    | none                                      |
| later duplicate series ID          | `INVALID_SOURCE_DATA / DUPLICATE_SERIES_ID`    | `/series/{i}/id`    | `{ index, firstIndex }`                   |
| missing/non-string series label    | `INVALID_SOURCE_DATA / INVALID_TYPE`           | `/series/{i}/label` | none                                      |
| trim-empty series label            | `INVALID_SOURCE_DATA / EMPTY_LABEL`            | `/series/{i}/label` | none                                      |
| later duplicate normalized label   | `INVALID_SOURCE_DATA / DUPLICATE_SERIES_LABEL` | `/series/{i}/label` | `{ index, firstIndex }`                   |

series label duplicate key 精确为 `label.trim().normalize('NFC')`，大小写敏感；error 不包含该 key。
series metadata 复用 `EXPECTED_OBJECT`、`NON_PLAIN_DATA`、`INVALID_METADATA_VALUE` 和已有 JSON Pointer。

### Category And Values

category root/item 的 structural ID/label/sourceRef/metadata issues 延续既有 reason。later duplicate category
ID 继续使用 `DUPLICATE_SOURCE_ITEM_ID /items/{i}/id`。v3 item 传入 scalar amount 使用
`UNKNOWN_FIELD /items/{i}/amount`。

| Invalid condition            | Code / Reason                                       | Path                             | Safe details                                                        |
| ---------------------------- | --------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| missing/non-array values     | `INVALID_SOURCE_DATA / INVALID_TYPE`                | `/items/{i}/values`              | none                                                                |
| value entry not plain object | `INVALID_SOURCE_DATA / EXPECTED_OBJECT`             | `/items/{i}/values/{j}`          | none                                                                |
| missing/non-string seriesId  | `INVALID_SOURCE_DATA / INVALID_TYPE`                | `/items/{i}/values/{j}/seriesId` | none                                                                |
| trim-empty seriesId          | `INVALID_SOURCE_DATA / EMPTY_ID`                    | `/items/{i}/values/{j}/seriesId` | none                                                                |
| unknown seriesId             | `INVALID_SOURCE_DATA / UNKNOWN_SERIES_REFERENCE`    | `/items/{i}/values/{j}/seriesId` | `{ itemIndex, valueIndex }`                                         |
| later duplicate series value | `INVALID_SOURCE_DATA / DUPLICATE_SERIES_VALUE`      | `/items/{i}/values/{j}/seriesId` | `{ itemIndex, valueIndex, firstValueIndex }`                        |
| each missing declared series | `INVALID_SOURCE_DATA / MISSING_SERIES_VALUE`        | `/items/{i}/values`              | `{ itemIndex, seriesIndex }`                                        |
| first order mismatch         | `INVALID_SOURCE_DATA / SERIES_VALUE_ORDER_MISMATCH` | `/items/{i}/values/{j}/seriesId` | `{ itemIndex, valueIndex, expectedSeriesIndex, actualSeriesIndex }` |
| missing/non-number amount    | `INVALID_SOURCE_DATA / INVALID_TYPE`                | `/items/{i}/values/{j}/amount`   | none                                                                |
| non-finite amount            | `INVALID_SOURCE_DATA / NON_FINITE_AMOUNT`           | `/items/{i}/values/{j}/amount`   | none                                                                |
| unsafe amount                | `INVALID_SOURCE_DATA / UNSAFE_AMOUNT`               | `/items/{i}/values/{j}/amount`   | none                                                                |

Order issue 只在 exact unique coverage 成立时发出；duplicate、unknown 或 missing coverage 时不额外发 order
mismatch。unknown/duplicate 可以同时使对应 declared series 发 missing issue，这是完整覆盖事实，不包含敏感值。

value sourceRef/metadata 复用既有 reason/path。dense array hole 使用 `INVALID_TYPE` 指向 first missing index；
array extra property 使用 `UNKNOWN_FIELD` 指向该 property。

### Projection Overflow

collapsed group 某 series compensated accumulator 变为 non-finite 或 unsafe 时：

```text
code: INVALID_SOURCE_DATA
reason: UNSAFE_AMOUNT
path: /items/{sourceIndex}/values/{seriesIndex}/amount
details: { operation: 'groupAggregate', sourceIndex, seriesIndex }
```

整个 `projectCategoricalComparison` 失败，不返回 partial projection 或已聚合的其他 series。

## ChartConfig Paths And Reasons

source validation issues 在 `validateChartConfig` 中保持 code/reason/details，并将 source path 前缀为
`/data`。只有 source validation 成功并可建立 series index 后才执行 appearance-to-source reference checks。

### Comparison Appearance

| Invalid condition                       | Code / Reason                                   | Path                                     |
| --------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| `legend` not boolean                    | `INVALID_CHART_CONFIG / INVALID_TYPE`           | `/appearance/legend`                     |
| colors not object                       | `INVALID_CHART_CONFIG / EXPECTED_OBJECT`        | `/appearance/colors`                     |
| series colors not dense array           | `INVALID_CHART_CONFIG / INVALID_TYPE`           | `/appearance/colors/series`              |
| series color entry not object           | `INVALID_CHART_CONFIG / EXPECTED_OBJECT`        | `/appearance/colors/series/{i}`          |
| seriesId missing/non-string             | `INVALID_CHART_CONFIG / INVALID_TYPE`           | `/appearance/colors/series/{i}/seriesId` |
| seriesId trim-empty                     | `INVALID_CHART_CONFIG / EMPTY_ID`               | `/appearance/colors/series/{i}/seriesId` |
| seriesId unknown                        | `SOURCE_CONFLICT / UNKNOWN_SERIES_REFERENCE`    | `/appearance/colors/series/{i}/seriesId` |
| later duplicate override                | `INVALID_CHART_CONFIG / DUPLICATE_SERIES_COLOR` | `/appearance/colors/series/{i}/seriesId` |
| invalid color hex                       | `INVALID_CHART_CONFIG / INVALID_TYPE`           | `/appearance/colors/series/{i}/color`    |
| v3 positive/negative/start/subtotal/end | `INVALID_CHART_CONFIG / UNKNOWN_FIELD`          | `/appearance/colors/{field}`             |
| invalid group color                     | `INVALID_CHART_CONFIG / INVALID_TYPE`           | `/appearance/colors/group`               |

duplicate color safe details 为 `{ index, firstIndex }`。series override entry order 不参与 source order，因而 config
不产生 `SERIES_VALUE_ORDER_MISMATCH`。v2 `appearance.colors.series` 和 `/appearance/legend` 都是
`INVALID_CHART_CONFIG / UNKNOWN_FIELD`。

其他 appearance、editor、locale、height 校验继续使用现有 closed field sets、range 和 paths。comparison
appearance fields 在 structural validation 时即使 source invalid 也继续检查，但 unknown ID checks 跳过。

## View And Compatibility Errors

- schema generation mismatch：`SOURCE_CONFLICT / SCHEMA_VERSION_MISMATCH /schemaVersion`。
- dataset mismatch：`SOURCE_CONFLICT / DATASET_ID_MISMATCH /datasetId`。
- v3 view 的 `waterfall`：`SOURCE_CONFLICT / INCOMPATIBLE_CHART_TYPE /chartType`。
- unknown chart string：`INVALID_VIEW_SPEC / INVALID_CHART_TYPE /chartType`。
- v3 source 配 `config.type: 'waterfall'`：`SOURCE_CONFLICT / INCOMPATIBLE_CHART_TYPE /type`。
- series ID 不进入 narrative tree；tree/root 的 series-only reference 继续走 existing
  `UNKNOWN_SOURCE_REFERENCE`，pin 走 `INVALID_PIN_REFERENCE`，annotation/emphasis 走
  `UNKNOWN_NODE_REFERENCE`。
- projector 按 source validation、source/view validation、projector generation 的顺序失败。invalid source
  原样返回 source issues；v2/v3 source/view 混配返回
  `SOURCE_CONFLICT / SCHEMA_VERSION_MISMATCH /schemaVersion`。只有 source/view 是彼此兼容的有效 pair 时，
  `projectCategorical` 接收有效 v3 pair 或 `projectCategoricalComparison` 接收有效非 v3 pair 才返回
  `SOURCE_CONFLICT / INCOMPATIBLE_PROJECTOR_GENERATION /schemaVersion`。v2/v3 四种 pairing 必须有
  precedence contract tests。

## Identity And Atomicity

- `validateSourceData`、`validateViewSpec`、`validateChartConfig` success 保留输入 identity。
- 任一 validation failure 都不返回 normalized partial value。
- editor initial invalid config 显示 invalid editor state，不初始化 G2。
- v3 comparison live editor invalid update 进入现有 stable invalid editor state并调用一次
  `onConfigRejected`；v1/v2 update 行为精确不变。上一有效状态原子保留只适用于 hostile option inspection/
  callback-type failure 的 existing path，不把 v3 引入解释为全局 update semantics 变更。

## Approval Gate

本文的 reason union、English message 与 JSON Pointer path 属于 `tellplot@2.0.0` public contract，并已于
2026-08-12 获得用户明确批准；TDR-025、technical plan 与 work graph 也已获批。当前 T135 可按 packet
修改 validator，T136-T141 的 runtime 范围仍由串行前置依赖阻塞。
