# 001 数据模型

## Metadata

- Version: 0.3.0
- Status: Confirmed
- Schema version: `1.0.0`

## Design Rules

- Source entities 与 view entities 使用稳定、不可混淆的 branded string IDs；wire value 仍是普通 JSON string，不要求宿主调用 ID constructor。
- 金额在 JS number 安全范围内使用有限 number；组件不自行决定货币精度或汇率。
- 所有持久化对象是 JSON-compatible plain data，不包含 class、Map、Set、function、DOM 或 G2 instance。
- SourceData、SourceItem、ViewSpec 与 ViewGroup 使用 closed schema；未知字段、symbol key、accessor property、稀疏数组和数组附加属性均拒绝。metadata、annotations、emphasis 与 groups 的 record key 按各自 schema 开放，但 value 仍必须是 enumerable data property。
- array order 只在 schema 明确表示顺序时有语义。

## SourceData

```typescript
type SourceItemKind = 'start' | 'contribution' | 'subtotal' | 'end';

interface SourceItem {
  readonly id: SourceItemId;
  readonly label: string;
  readonly amount: number;
  readonly kind: SourceItemKind;
  readonly sourceRef?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

interface SourceData {
  readonly schemaVersion: '1.0.0';
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly items: readonly SourceItem[];
}
```

Validation:

- `datasetId` 和 item ID 非空且唯一。
- label 可以重复但去除首尾空白后不能为空。
- amount 必须为 finite number。
- 恰好一个 start 和一个 end；start 必须在源顺序首位，end 必须末位。
- subtotal 作为锁定锚点，不参与自由分组。

## ViewSpec

```typescript
interface ViewSpec {
  readonly schemaVersion: '1.0.0';
  readonly datasetId: DatasetId;
  readonly chartType: 'waterfall';
  readonly revision: number;
  readonly rootOrder: readonly ViewNodeId[];
  readonly groups: Readonly<Record<GroupId, ViewGroup>>;
  readonly collapsedGroupIds: readonly GroupId[];
  readonly pinnedItemIds: readonly SourceItemId[];
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
}

interface ViewGroup {
  readonly id: GroupId;
  readonly label: string;
  readonly childIds: readonly ViewNodeId[];
}

type Annotation = string;
type Emphasis = 'highlight' | 'muted';
```

Rules:

- `rootOrder` 与全部 group children 共同组成规范化有序森林；每个 contribution 与 group 恰好在一个父容器中出现一次。
- start、end、subtotal 不进入 group children。
- group 至少包含两个直接 child node，children 顺序稳定且不重复。
- group child 可以是 contribution 或 group；禁止自身引用、循环、孤儿 group、多个父级和跨 subtotal segment。
- group 的来源集合、父级、层级和金额全部从后代 contribution 派生，不持久化缓存。
- collapsed、annotation、emphasis 引用必须存在。
- pinned source 仍保留在 root/group 结构中，只限制命令。
- revision 每次成功写命令递增一次；undo/redo 也产生新 revision，但恢复历史中的内容状态。

## EditorCommand

```typescript
interface CommandMeta {
  readonly id: string;
  readonly source: 'direct' | 'outline' | 'keyboard' | 'host';
  readonly baseRevision: number;
}

type EditorCommand =
  | MoveItemCommand
  | CreateGroupCommand
  | UngroupCommand
  | CollapseGroupCommand
  | ExpandGroupCommand
  | PinItemCommand
  | UnpinItemCommand
  | SetAnnotationCommand;
```

`undo` 与 `redo` 是 session action，不作为可重放业务命令写入 `CommandLog`；其结果仍产生带来源的 history event。

## Command Result

```typescript
type CommandResult =
  | {
      readonly ok: true;
      readonly session: EditorSession;
      readonly viewSpec: ViewSpec;
      readonly event: CommandEvent;
    }
  | {
      readonly ok: false;
      readonly session: EditorSession;
      readonly error: CommandError;
    };
```

Error codes:

- `INVALID_SOURCE_DATA`
- `INVALID_VIEW_SPEC`
- `INVALID_SESSION_OPTIONS`
- `INVALID_COMMAND`
- `DUPLICATE_COMMAND_ID`
- `REVISION_CONFLICT`
- `REVISION_OVERFLOW`
- `ITEM_NOT_FOUND`
- `GROUP_NOT_FOUND`
- `NODE_NOT_FOUND`
- `ITEM_LOCKED`
- `INVALID_DROP_TARGET`
- `NON_CONTIGUOUS_GROUP_SELECTION`
- `GROUP_TOO_SMALL`
- `GROUP_ID_CONFLICT`
- `HISTORY_EMPTY`
- `INVARIANT_VIOLATION`
- `UNSUPPORTED_SCHEMA_VERSION`
- `SOURCE_CONFLICT`

预期输入错误使用 `ValidationIssue`，包含 `code`、`reason`、`message`、JSON Pointer `path` 和不含敏感数据的 `details`。命令执行错误使用 `CommandError`，并额外包含 `commandId`。

```typescript
type ValidationResult<T> =
  | { readonly ok: true; readonly value: T; readonly errors: readonly [] }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };
```

validator 累积稳定顺序的 issue，不为预期输入错误抛异常；无法安全反射的 hostile input 返回不含原异常文本的 `UNREADABLE_INPUT`。成功结果保留调用方输入 identity，不克隆、冻结或规范化 source/view。

## EditorSession

```typescript
interface EditorSession {
  readonly sourceData: SourceData;
  readonly sourceFingerprint: string;
  readonly viewSpec: ViewSpec;
  readonly undoStack: readonly HistoryEntry[];
  readonly redoStack: readonly HistoryEntry[];
  readonly historyLimit: number;
  readonly processedActionIds: readonly string[];
}
```

History entry 保存 before/after ViewSpec snapshot、command type/source/id、affected node IDs。默认最多 100 条；超限从最旧条目淘汰。sourceData 不重复存入每个 entry。historyLimit 必须是非负 safe integer，0 表示编辑仍提交但不保留 undo history。

accepted state-changing command、accepted no-op、undo 与 redo 的 ID 都进入 `processedActionIds`。重复 ID 明确拒绝；rejected attempt 不记录 ID。no-op 只更新 processed IDs，保持 ViewSpec 与两个 history stack identity。source fingerprint 使用稳定 canonical source 表示的 64-bit FNV-1a 十六进制摘要，前缀为 `fnv1a64:`；该 fingerprint 用于一致性识别，不作为安全哈希。

## WaterfallProjection

```typescript
interface WaterfallDatum {
  readonly nodeId: ViewNodeId;
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly amount: number;
  readonly kind: 'start' | 'positive' | 'negative' | 'subtotal' | 'end' | 'group';
  readonly sourceIds: readonly SourceItemId[];
  readonly locked: boolean;
  readonly order: number;
}

type WaterfallProjection = readonly WaterfallDatum[];
type WaterfallProjectionResult = ValidationResult<WaterfallProjection>;
```

Projection algorithm:

1. 先验证 SourceData 与 ViewSpec；结构错误原样返回 ValidationResult failure，不生成部分 projection。
2. 输出 start anchor，`start=0`、`end=amount`、`sourceIds=[anchorId]`、`locked=true`，累计基线设为 start amount。
3. 按 subtotal segment 与 `rootOrder` 消费 contribution。普通项输出单个 datum；collapsed group 输出一个 group datum；expanded group 不输出 group datum并按 `childIds` 连续输出 children。
4. contribution 的 `start` 是进入前累计、`end` 是进入后累计、`amount` 是 source amount；amount `< 0` 为 negative，否则包括零值在内为 positive。pinned contribution 的 `locked=true`。
5. collapsed group 的 amount 是 children compensated sum，sourceIds 是独立 child ID 副本；任一 child pinned 时 group datum `locked=true`。collapsed 与 expanded 路径向主 accumulator 喂入完全相同的 child 顺序。
6. subtotal 使用 source amount 作为绝对声明值并校验当前累计；成功后以声明值重置累计基线。连续 subtotal 与空 segment 合法。
7. end 使用 source amount 作为绝对声明值并校验最终累计；anchor datum 均使用 `start=0`、`end=amount`、`sourceIds=[anchorId]`、`locked=true`。
8. `order` 等于最终 projection 数组的零基索引。同一有效输入重复调用产生 deep-equal、JSON-compatible plain data，输出 array/sourceIds 不与输入容器共享。

Numeric rules:

- 主累计与 group 聚合使用 Neumaier compensated summation。
- subtotal/end mismatch 仅允许最多 8 ULP 的 IEEE-754 表示误差；不使用货币精度、百分比或任意业务容差。
- anchor mismatch 返回 `INVALID_SOURCE_DATA / INVALID_ANCHOR`，path 指向 `/items/{sourceIndex}/amount`，details 固定为 `{ anchor: 'subtotal' | 'end', sourceIndex }`。
- 聚合或当前累计变为非有限数或绝对值超过 `Number.MAX_SAFE_INTEGER` 时返回 `INVALID_SOURCE_DATA / UNSAFE_AMOUNT`，details 固定为 `{ operation: 'accumulate' | 'groupAggregate', sourceIndex }`，不返回部分 projection。
- projection error 不使用 CommandError，因为不存在 command ID。

## State Transitions

```text
createSession -> Ready | InvalidData
Ready + valid command -> Ready(revision + 1, undo + 1, redo cleared)
Ready + rejected command -> Ready(unchanged)
Ready + undo -> Ready(revision + 1, redo + 1)
Ready + redo -> Ready(revision + 1, undo + 1)
Ready + source update -> Reconciled | SourceConflict
Ready + export -> Exporting -> Ready | ExportError
```

## Persistence Compatibility

- major version mismatch: reject。
- same major、newer minor: parse known fields and preserve no unrecognized executable behavior。
- dataset ID mismatch: reject as `SOURCE_CONFLICT`。
- missing source IDs: return conflict list and do not partially apply。
- new source IDs: return additive conflict; host chooses reset or explicit reconciliation。
