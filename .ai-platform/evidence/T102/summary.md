# T102 Evidence Summary

## Metadata

- Task: T102 - 实现 SourceData、ViewSpec 与验证器
- Attempt: T102-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-15
- Execution: Codex direct TDD execution with independent read-only review

## Scope Result

实现无 React/G2 依赖的 readonly plain-data 类型、弱品牌 ID、累积式 `ValidationResult<T>`、source/view validators 和 initial view factory。公共运行时入口只增加 `createInitialViewSpec`、`validateSourceData` 与 `validateViewSpec`。

## TDD Evidence

RED:

- 先写 `model.test.ts`、`validation.test.ts`、`immutability.test.ts` 和新的 package public API expectations。
- 窄测试按预期 exit 1：领域函数尚未导出，64 tests failed，证明测试先于实现生效。

GREEN:

- 实现 source schema、anchor、metadata 和 privacy-safe issue validation。
- 实现 ViewSpec root/group/reference/subtotal segment/annotation/emphasis validation。
- 实现 closed schema、descriptor-safe record/array 读取与 hostile reflection 边界，不执行调用方 getter。
- 实现不修改输入、成功保留 identity 的 initial view factory 和 validators。
- domain coverage 达到 99% 以上，超过四项 95% 门槛。

## Validation Matrix

- Source: plain object、schema、dataset/item ID、label、finite/safe amount、kind、sourceRef、metadata、唯一 start/end 与锚点位置。
- View: schema、dataset、chart type、revision、root coverage、未知/重复/锁定引用、subtotal 分段顺序。
- Group: key/id、保留字、source ID 冲突、label、child count/type/uniqueness、source kind、跨组与跨 anchor。
- State references: collapsed、pinned、annotation、emphasis 的 type、uniqueness 与 existence。
- Annotation: trim 后非空、最多 500 Unicode code points。
- Privacy/immutability: error 不包含 amount、label、sourceRef；无 console 输出；valid/invalid frozen input 均不被修改。
- Plain data: sparse array、unknown field、symbol key、accessor property、array 附加属性与 hostile Proxy 均返回结构化 issue，不执行或传播调用方异常。

## Changed Files

- `packages/editor/src/domain/{ids,model,errors,validation,createInitialViewSpec}.ts`
- `packages/editor/src/index.ts`
- `packages/editor/tests/domain/{model,validation,immutability}.test.ts`
- `packages/editor/tests/fixtures/financialSourceData.ts`
- `packages/editor/tests/package/**` public API consumers
- T102 packet、canonical data/API contracts、task/analysis/release state 与 T101 acceptance evidence

## Scope Confirmation

- 未实现 command、history、projection、React、G2、DOM、persistence 或 interaction。
- 未新增 runtime dependency。
- domain source 未 import React、React DOM 或 G2。
- 未执行 commit、push、PR、merge 或 publish。

## Residual Risk

- ViewSpec validation 只验证 end/subtotal 结构与分段引用，不计算财务累计；金额及 end anchor 算术在 T104 单一 projection 中验证。
- ID 在 wire format 保持 JSON string；TypeScript 使用允许普通 string 输入的弱品牌，已类型测试 SourceItemId 与 GroupId 不相等。
- T103 必须复用这些 validators 作为 command commit 前后的原子不变量 gate，不得复制结构规则。

## Review Findings Resolved

- High: sparse arrays 被 `forEach` 跳过并可能在 source indexing 抛异常。新增 6 个 RED 回归，改为 own-slot descriptor iteration 后关闭。
- High: accessor property 可执行 getter 并传播敏感异常。新增 source/view accessor 与 hostile Proxy RED，改为 descriptor-safe closed schema 和 privacy-safe catch 后关闭。
- Medium: unknown/symbol/function/Map/Set 可随成功 identity 保留。closed schema 现在拒绝 unknown/symbol fields，open records 仍只接受 enumerable data properties。

## Independent Review Verdict

- 无 Critical、High 或 Medium finding。
- Fresh 97 tests、coverage、typecheck、lint、format、build、package、runtime probe 与 dependency scan 全部通过。
- 用户已授权 Codex 对 T102-T104 执行 review 并验收，T102 据此进入 Accepted。
