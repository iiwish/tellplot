# 编辑命令合同

## Metadata

- Version: 0.3.0
- Status: Confirmed
- Schema family: `tellplot.command.v1`

## Common Envelope

```typescript
interface CommandEnvelope<TType extends string, TPayload> {
  readonly schemaVersion: '1.0.0';
  readonly id: string;
  readonly type: TType;
  readonly source: 'direct' | 'outline' | 'keyboard' | 'host';
  readonly baseRevision: number;
  readonly payload: TPayload;
}
```

Command ID 在一个 session 日志中必须唯一。重复 ID 返回已记录结果或明确拒绝，不能执行两次。

本合同覆盖瀑布图切片的 contribution/group 移动、递归分组、折叠、固定和注释命令。`setSort` 属于分类图切片；`undo` 与 `redo` 是 session action，不属于可重放的 `EditorCommand`。

运行时 command 使用 closed schema：envelope、payload 与嵌套 target 拒绝未知字段、symbol key、accessor property 和非普通对象。无法安全反射的输入返回不含原始异常文本的 `INVALID_COMMAND`。

## Move Item

```typescript
type MoveItemCommand = CommandEnvelope<
  'moveItem',
  {
    readonly itemId: SourceItemId;
    readonly target: {
      readonly containerId: 'root' | GroupId;
      readonly index: number;
    };
  }
>;
```

- 只允许 contribution。
- 固定项目不可移动。
- 不可跨越 start、end 或 subtotal anchor 的分段边界。
- 目标 index 按移除 item 后的容器计算。

## Move Group

```typescript
type MoveGroupCommand = CommandEnvelope<
  'moveGroup',
  {
    readonly groupId: GroupId;
    readonly target: {
      readonly containerId: 'root' | GroupId;
      readonly index: number;
    };
  }
>;
```

- group 作为完整子树移动，children 顺序、折叠状态、annotation 与 emphasis 保持不变。
- group 不得移动到自身或任一后代 group 内。
- 含 pinned descendant 的 group 不可移动。
- 不可跨 subtotal segment。

## Create Group

```typescript
type CreateGroupCommand = CommandEnvelope<
  'createGroup',
  {
    readonly groupId: GroupId;
    readonly label: string;
    readonly nodeIds: readonly ViewNodeId[];
    readonly initiallyCollapsed: boolean;
  }
>;
```

- node 必须是同一父容器中连续排列的 direct children，可以是 contribution 或完整 group。
- 至少两个未固定 node；group 含任一 pinned descendant 时视为固定。
- group ID 不得与 source 或现有 group ID 冲突。
- `nodeIds` 是选择集合；children 按父容器当前顺序保存。
- label 去除首尾空白后必须非空，保存时保留调用方原文本。
- `initiallyCollapsed` 与 group 创建在同一次 validate/apply/validate-result/commit 中执行，只产生一个 undo entry。

## Ungroup

```typescript
type UngroupCommand = CommandEnvelope<
  'ungroup',
  { readonly groupId: GroupId }
>;
```

group 的直接 children 在 group 所在父容器位置按内部顺序恢复；其中的 descendant groups 保持完整。group 自身的 annotation、emphasis 和 collapsed reference 被删除，不复制到 children。包含 pinned descendant 的 group 必须先 unpin 才能 ungroup。

## Collapse And Expand

```typescript
type CollapseGroupCommand = CommandEnvelope<
  'collapseGroup',
  { readonly groupId: GroupId }
>;

type ExpandGroupCommand = CommandEnvelope<
  'expandGroup',
  { readonly groupId: GroupId }
>;
```

重复 collapse/expand 返回成功 no-op event，不增加 undo entry，但保持 idempotent command record。

## Pin And Unpin

```typescript
type PinItemCommand = CommandEnvelope<
  'pinItem',
  { readonly itemId: SourceItemId }
>;

type UnpinItemCommand = CommandEnvelope<
  'unpinItem',
  { readonly itemId: SourceItemId }
>;
```

start、end 和 subtotal 始终系统固定，不通过 pin 命令切换。pin 只适用于 contribution。

## Annotation

```typescript
type SetAnnotationCommand = CommandEnvelope<
  'setAnnotation',
  {
    readonly nodeId: ViewNodeId;
    readonly text: string | null;
  }
>;
```

trim 后空字符串规范化为 null。第一阶段最大长度 500 Unicode code points，不解释 HTML 或 Markdown。

start、end、subtotal 与 contribution、group 都可作为 annotation node。非空文本保存原值，不执行 trim 改写。

## Move And Group Semantics

- `moveItem` 的 target index 按从来源容器移除 item 后的目标容器计算，范围是 `0..destination.length`。
- `moveGroup` 使用相同 post-removal index 语义；移动节点不得进入自身后代。
- root 与任意 group 之间可以移动 contribution/group，但不得跨 subtotal segment。
- 从恰有两个 direct children 的 group 跨 container 移出 node 时，来源 group 原子解散，remaining child 在原父级位置替换 group；group 的 collapsed、annotation 与 emphasis 状态一并删除。
- 图表 pointer adapter 与 outline 都可产生跨层 move；`before`、`after`、`inside` 由 adapter 解析为公共 `{ containerId, index }`，keyboard 与 host 使用相同命令合同。
- 对当前结构没有影响的 move 返回成功 no-op。
- collapse、expand、pin、unpin 和 setAnnotation 重复设置相同规范化状态时返回成功 no-op。

## Result Event

```typescript
interface CommandEvent {
  readonly commandId: string;
  readonly type: EditorCommand['type'] | 'undo' | 'redo';
  readonly source: CommandSource;
  readonly previousRevision: number;
  readonly nextRevision: number;
  readonly affectedNodeIds: readonly ViewNodeId[];
  readonly noOp: boolean;
}
```

事件不包含 amount、label、annotation text 或 sourceRef。宿主如需数据可用 node ID 在自身权限边界内查询。

## Session Actions And Results

```typescript
interface SessionActionMeta {
  readonly id: string;
  readonly source: CommandSource;
  readonly baseRevision: number;
}

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

- `executeCommand`、`undoSession` 与 `redoSession` 都返回新的 session result；失败时返回的 `session` 与输入 session identity 相同。
- accepted state-changing action 与 accepted no-op 都记录 action ID；所有已接受 ID 的重复使用统一以 `DUPLICATE_COMMAND_ID` 拒绝，不回放旧结果。被拒绝的 ID 不占用。
- duplicate 检查先于 base revision 检查。
- state-changing success 使 revision 增加 1、写入 bounded history 并清空 redo branch。
- no-op 保持 ViewSpec、revision、undoStack 与 redoStack identity，只追加 processed ID；no-op 不清空 redo branch。
- undo/redo 恢复 snapshot 内容，但 revision 使用当前 revision + 1。空栈以 `HISTORY_EMPTY` 拒绝。
- revision 已为 `Number.MAX_SAFE_INTEGER` 时，任何 state-changing action 以 `REVISION_OVERFLOW` 拒绝。
- historyLimit 默认 100，必须是非负 safe integer；0 表示允许编辑但不保存 undo history。

## Error Contract

命令错误码至少包括：

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

error path 使用 JSON Pointer。revision conflict details 只含 expected/actual revision；长度、索引和 lock details 只含结构化数字或枚举。错误 message/details 不包含 amount、label、annotation text、sourceRef、metadata value 或调用方异常文本。

## Execution Guarantees

1. 检查 envelope 和 base revision。
2. 检查引用、lock、container 和 command-specific preconditions。
3. 在新的 plain object graph 上应用命令。
4. 验证来源守恒、顺序唯一、group aggregation 和 anchor 边界。
5. 成功时 commit revision；失败时返回结构化 error。

每个 state-changing command 只通过一次 validate-apply-validate-commit pipeline 提交。SourceData reference 在所有成功、no-op、undo 与 redo 结果中保持不变。

AI 在 Phase 1B 只能产生同一 schema 的候选命令，不拥有额外命令类型或绕过 base revision。
