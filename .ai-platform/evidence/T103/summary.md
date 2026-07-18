# T103 Evidence Summary

## Metadata

- Task: T103 - 实现命令执行器与历史
- Attempt: T103-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-15
- Execution: Codex direct TDD execution with bounded subtask implementation and independent read-only review

## Scope Result

实现无 React/G2/DOM 依赖的 command union、closed-schema runtime parser、editor session factory、单一 immutable executor、bounded snapshot history、undo/redo、revision、duplicate action ID、privacy-safe event/error 和 commit invariant gate。公共运行时入口新增 `createEditorSession`、`executeCommand`、`undoSession` 与 `redoSession`。

## Locked Semantics

- duplicate accepted action ID 在 revision 前拒绝；rejected ID 可复用。
- state-changing success 只增加一次 revision、写 undo、清 redo；no-op 不增加 revision、不进 undo、不清 redo，但记录 ID。
- undo/redo 恢复 snapshot 内容，revision 使用 current + 1；空栈结构化拒绝。
- historyLimit 默认 100，允许 0 禁用 snapshot；SourceData 不进入 history entry。
- createGroup 只接受 direct-root、连续、同 subtotal segment、未 pinned contribution；当前模型保持单层 group。
- 从二成员 group 移出 item 会被拒绝；含 pinned child 的 group 必须先 unpin 才能 ungroup。
- runtime parser 不执行 getter，拒绝 accessor、symbol、unknown field、sparse/附加属性数组与 hostile Proxy。
- event/error 只含 ID、revision、路径、枚举和结构数字，不含 amount、label、annotation text、sourceRef 或调用方异常文本。

## TDD Evidence

RED:

- 完整 T103 tests 先于实现落盘，初次运行 exit 1：30 tests failed，缺少 session/command/history runtime API 与 invariant module。
- 独立 review 发现 stale revision 与 tampered session 组合的错误优先级不符合合同；新增回归测试后 exit 1，实际返回 `INVARIANT_VIOLATION` 而非 `REVISION_CONFLICT`。

GREEN:

- 实现 8 类 command 及 session action parser、纯函数 command handlers、post-apply invariant gate 和 deep snapshot history。
- 修复 review finding，使 envelope -> duplicate ID -> base revision -> session invariant -> command precondition 顺序稳定。
- 增加 prototype-like ID 回归，`constructor`、`toString` 与 `__proto__` 通过 own-property lookup 正确处理。
- 32 个固定 seed、每 seed 160 步的 deterministic sequence 重放保持 source identity、coverage、revision 单调性和合法 ViewSpec。

## Changed Files

- `packages/editor/src/domain/{commands,session,executeCommand,history,invariants,errors}.ts`
- `packages/editor/src/index.ts`
- `packages/editor/tests/domain/{commands,history,invariants,property-sequences}.test.ts`
- `packages/editor/tests/fixtures/commandSourceData.ts`
- `packages/editor/tests/package/**` public runtime/type consumers
- T103 packet、command/data/API contracts、task/analysis/release state 与 T103 evidence

## Scope Confirmation

- 未实现 waterfall projection、React、G2、DOM、persistence、export 或 interaction。
- 未新增 runtime 或 test dependency。
- 未执行 commit、push、PR、merge、publish 或其他远端写操作。

## Review Finding Resolved

- Medium: executor 在 base revision 前验证 tampered session，违反 command execution order。新增 stale + tampered RED 后，将 revision conflict check 移到 session invariant 前；duplicate ID 仍保持更高优先级。

## Residual Risk

- `processedActionIds` 为 plain-data array，会随长 session 增长并使用线性 duplicate lookup；当前阶段优先满足 JSON-compatible session 与永久 ID 唯一性，后续可在不改变公开语义的前提下增加内部索引或 session compaction。
- 公共 readonly `EditorSession` 在纯 JavaScript 中仍可被主动伪造；executor 会复验 SourceData/ViewSpec，但不完整验证伪造的 history metadata 与 processed IDs。当前公开 factory 路径和所有合法 transition 均受测试保护，session hardening 可在 persistence 边界继续。
- T103 只校验来源覆盖、分段和结构守恒；subtotal/end 金额累计与数值稳定性由 T104 单一 projection 实现。

## Independent Review Verdict

- 修复后无 Critical、High 或 Medium finding。
- Fresh 140 tests、coverage、typecheck、lint、format、build、package、git diff check 全部通过。
- 用户已授权 Codex 对 T102-T104 独立 review 并验收，T103 据此进入 Accepted。
