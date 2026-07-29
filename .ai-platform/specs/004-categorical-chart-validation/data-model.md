# 004 分类图数据模型

## Metadata

- Version: 0.2.0
- Status: Confirmed
- Feature ID: `004-categorical-chart-validation`
- Last updated: 2026-07-20
- Compatibility target: legacy schema `1.0.0` 与新增 schema `2.0.0`
- Approval: 用户于 2026-07-19 明确批准 schema v2、legacy compatibility 和 categorical data contract

## Design Decisions

- `SourceData` 使用显式 `dataKind` 区分 waterfall 与 categorical，不从 item 数量、anchor 是否存在或
  `ViewSpec.chartType` 猜测数据语义。
- 现有 `1.0.0` waterfall wire shape 继续作为合法 legacy variant；验证器不得静默加字段、迁移或克隆。
- 新 chart family 使用 `2.0.0` closed schema。major bump 反映新增 discriminator、分类 item shape 和
  `ViewSpec.chartType` 联合的持久化语义变化。
- `ViewSpec` 的递归树字段在 chart family 之间保持一致；各 family 只拥有 validation、projection、
  compatibility 和 interaction-axis policy。
- bar 与 column 是 categorical family 的两种 layout，不是两个数据模型。
- 本切片不提供自动 legacy migration writer；legacy waterfall 可以原样读取、编辑和序列化。

## Public Type Model

```typescript
type LegacySchemaVersion = '1.0.0';
type CurrentSchemaVersion = '2.0.0';
type SchemaVersion = LegacySchemaVersion | CurrentSchemaVersion;

type ChartType = 'waterfall' | 'bar' | 'column';
type SourceDataKind = 'waterfall' | 'categorical';
type MetadataValue = string | number | boolean | null;

interface SourceItemBase {
  readonly id: SourceItemId;
  readonly label: string;
  readonly amount: number;
  readonly sourceRef?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

type WaterfallSourceItemKind = 'start' | 'contribution' | 'subtotal' | 'end';

interface WaterfallSourceItem extends SourceItemBase {
  readonly kind: WaterfallSourceItemKind;
}

interface CategoricalSourceItem extends SourceItemBase {}

// Backward-compatible public names keep their waterfall meaning.
type SourceItemKind = WaterfallSourceItemKind;
type SourceItem = WaterfallSourceItem;

interface LegacyWaterfallSourceData {
  readonly schemaVersion: '1.0.0';
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly items: readonly WaterfallSourceItem[];
}

interface WaterfallSourceData {
  readonly schemaVersion: '2.0.0';
  readonly dataKind: 'waterfall';
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly items: readonly WaterfallSourceItem[];
}

interface CategoricalSourceData {
  readonly schemaVersion: '2.0.0';
  readonly dataKind: 'categorical';
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly items: readonly CategoricalSourceItem[];
}

type SourceData = LegacyWaterfallSourceData | WaterfallSourceData | CategoricalSourceData;
```

`SourceItem` 与 `SourceItemKind` 保持现有 waterfall 含义，已有 import 不需要改名。categorical host 使用新的
`CategoricalSourceItem`。该类型不包含 `kind: 'category'`；`dataKind: 'categorical'` 已经提供可靠
discriminator，避免在每个 item 重复相同信息，也避免普通分类被错误解释为 waterfall contribution。

## Source Validation

所有 source variant 继续遵守：

- plain JSON-compatible object 与 dense arrays。
- closed schema；未知字段、symbol key、accessor property 和数组附加属性被拒绝。
- dataset ID 与 item ID 去除首尾空白后非空，item ID 在数据集内唯一。
- label 去除首尾空白后非空；label 可以重复。
- amount 必须为 finite number，且绝对值不超过 `Number.MAX_SAFE_INTEGER`。
- metadata value 只允许 `string | number | boolean | null`，其中 number 必须有限。
- validation issue 不包含 amount、label、sourceRef 或 metadata value。

Waterfall variant 继续额外要求：

- 恰好一个 start 与一个 end。
- start 位于首位，end 位于末位。
- subtotal 是锁定锚点并定义 contribution segment。
- anchor 和累计金额一致性继续由 waterfall projection 校验。

Categorical variant 额外要求：

- `items` 可以为空。
- 每个 item 都是可进入叙事树的普通分类，不存在 start、end 或 subtotal anchor。
- source array order 是默认分类顺序。

## ViewSpec Variants

```typescript
interface NarrativeViewFields {
  readonly datasetId: DatasetId;
  readonly revision: number;
  readonly rootOrder: readonly ViewNodeId[];
  readonly groups: Readonly<Record<GroupId, ViewGroup>>;
  readonly collapsedGroupIds: readonly GroupId[];
  readonly pinnedItemIds: readonly SourceItemId[];
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
}

interface LegacyWaterfallViewSpec extends NarrativeViewFields {
  readonly schemaVersion: '1.0.0';
  readonly chartType: 'waterfall';
}

interface CurrentViewSpec extends NarrativeViewFields {
  readonly schemaVersion: '2.0.0';
  readonly chartType: ChartType;
}

type ViewSpec = LegacyWaterfallViewSpec | CurrentViewSpec;
```

Compatibility matrix:

| Source variant | Valid ViewSpec | Result |
| --- | --- | --- |
| legacy `1.0.0` waterfall | legacy `1.0.0` waterfall | 保持现有行为与 wire value |
| legacy `1.0.0` waterfall | current `2.0.0` waterfall | 拒绝，避免隐式 schema migration |
| current `2.0.0` waterfall | current `2.0.0` waterfall | 有效 |
| current `2.0.0` categorical | current `2.0.0` bar | 有效 |
| current `2.0.0` categorical | current `2.0.0` column | 有效 |
| waterfall source | bar 或 column | `SOURCE_CONFLICT / INCOMPATIBLE_CHART_TYPE` |
| categorical source | waterfall | `SOURCE_CONFLICT / INCOMPATIBLE_CHART_TYPE` |

`ViewSpec.rootOrder` 始终是逻辑叙事顺序。column 将第一个逻辑节点放在最左侧；bar 将第一个逻辑节点放在
最上方。G2 adapter 负责必要的 category scale range 方向，不能通过反转持久化数组实现视觉顺序。

## Initial View Creation

```typescript
interface InitialViewSpecOptions {
  readonly chartType?: ChartType;
}

function createInitialViewSpec(
  sourceData: SourceData,
  options?: InitialViewSpecOptions,
): ValidationResult<ViewSpec>;
```

Rules:

- legacy `1.0.0` waterfall 默认并且只允许 `waterfall`，输出 legacy `1.0.0` ViewSpec。
- current `2.0.0` waterfall 默认并且只允许 `waterfall`，输出 current `2.0.0` ViewSpec。
- current `2.0.0` categorical 默认 `column`，可显式选择 `bar`，输出 current `2.0.0` ViewSpec。
- 不兼容的显式 `chartType` 返回 validation failure，不回退到其他类型。
- waterfall 初始 `rootOrder` 是 contribution 的 segment-preserving 顺序。
- categorical 初始 `rootOrder` 是全部 source item ID 的源顺序。

## Shared Narrative Tree Rules

- `rootOrder` 与全部 group `childIds` 构成规范化有序森林。
- 每个可叙事 source item 与每个 group 恰好出现一次。
- group 至少包含两个同父级连续直接 child；child 可以是 item 或 group。
- 禁止自身引用、循环、孤儿 group、多个父级、空组和单 child group。
- collapsed、annotation 和 emphasis 只能引用存在的 node。
- pinned item 继续保留在树中，只限制命令。
- waterfall group 不能跨 subtotal segment；categorical group 没有 segment 限制。
- 任一 pinned descendant 使对应 node 在 move/group policy 中被视为 locked。

## CategoricalProjection

```typescript
interface CategoricalDatum {
  readonly nodeId: ViewNodeId;
  readonly label: string;
  readonly amount: number;
  readonly kind: 'positive' | 'negative' | 'group';
  readonly sourceIds: readonly SourceItemId[];
  readonly locked: boolean;
  readonly order: number;
}

type CategoricalProjection = readonly CategoricalDatum[];
type CategoricalProjectionResult = ValidationResult<CategoricalProjection>;
```

Projection rules:

1. 先验证 source/view compatibility 和全部叙事树不变量；失败不返回部分 projection。
2. 按逻辑深度优先顺序遍历 `rootOrder` 和 expanded group children。
3. 普通 item 的 amount 等于 source amount，`sourceIds` 是只含自身的独立数组。
4. collapsed group 输出一个 datum，amount 是全部后代 item 的 Neumaier compensated sum，sourceIds 按逻辑
   叶子顺序展开。
5. expanded group 不输出额外 datum；后代保持自己的 collapsed 状态。
6. 普通 item amount 小于 0 时 kind 为 `negative`，否则包括零在内为 `positive`；collapsed group 始终为
   `group`。
7. item pinned 时 locked 为 true；collapsed group 包含任一 pinned descendant 时 locked 为 true。
8. `order` 等于输出数组零基索引；同一有效输入重复调用必须 deep-equal。
9. 聚合变成非有限值或绝对值超过 `Number.MAX_SAFE_INTEGER` 时返回
   `INVALID_SOURCE_DATA / UNSAFE_AMOUNT`。

## Commands And Chart Policy

`EditorCommand` wire shape 在本切片保持不变。内部命令执行器通过 chart policy 取得：

```typescript
interface NarrativeChartPolicy {
  readonly sourceKind: SourceDataKind;
  isMovableItem(sourceData: SourceData, itemId: SourceItemId): boolean;
  canShareContainer(sourceData: SourceData, itemIds: readonly SourceItemId[]): boolean;
}
```

该接口是内部最小 policy，不是公共 plugin contract，也不接受宿主 callback。waterfall policy 保留 anchor 和
segment 规则；categorical policy 允许所有未 pinned item 参与同父级排序和分组。

## Persistence

- `serializeViewSpec` 保留输入 schema version，不静默升级 legacy view。
- `parseViewSpec` 先读取 schema discriminator，再调用对应 closed-schema validator。
- legacy source 只能解析 legacy view；current source 只能解析 current view。
- dataset ID、schema family 或 chart type 不兼容时拒绝整个输入。
- 所有 record key 序列化继续使用稳定排序；ordered arrays 保持逻辑顺序。
- source fingerprint 必须包含 schema version 与 current source 的 `dataKind`，避免不同 family 发生碰撞式
  语义复用。fingerprint 仍是确定性一致性标识，不是安全哈希。

## State Transitions

```text
validate source -> LegacyWaterfall | Waterfall | Categorical | InvalidData
source + compatible initial options -> ViewSpec(revision 0)
source + incompatible chart type -> SourceConflict
valid command -> ViewSpec(same schema/type, revision + 1)
undo/redo -> ViewSpec(same schema/type, revision + 1)
valid view + projection -> WaterfallProjection | CategoricalProjection
valid projection + chart type -> G2Spec
```

图表类型不会被现有命令改变。分类 bar/column 切换不属于本切片运行时状态迁移。

## Approval Gate

本数据模型已于 2026-07-19 经用户明确批准并在 T112-T116 实现中保持。当前 schema、
compatibility matrix、persistence 和公共类型均为本文定义的 canonical contract；任何
schema 或范围变化必须重新进入用户审批。
