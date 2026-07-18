# T104 Evidence Summary

## Metadata

- Task: T104 - 实现瀑布投影
- Attempt: T104-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-15
- Execution: Codex direct TDD execution with delegated RED tests and independent read-only review

## Scope Result

实现 package-internal `projectWaterfall(sourceData, viewSpec)`，把 canonical SourceData/ViewSpec 确定性投影为 renderer-ready waterfall data。投影覆盖 start、正/负/零 contribution、subtotal、end、expanded/collapsed group、pinned lock、source traceability 与稳定 output order，不引入 React、G2、DOM、格式化或第二套累计逻辑。

## Locked Semantics

- 先复用 `validateViewSpec` 完成 source/view 结构校验，失败原样返回且不产生部分 projection。
- start/subtotal/end 使用绝对锚点 datum；subtotal 校验成功后以声明金额重置累计。
- contribution 和 group 主累计使用 Neumaier compensated summation；collapsed group 使用独立 compensated aggregate 并按同一 child 顺序喂入主累计。
- 锚点误差只接受最多 8 ULP；不使用货币舍入、epsilon 或业务容差。
- 当前累计或 collapsed group aggregate 非有限或超出 `Number.MAX_SAFE_INTEGER` 时返回 value-free `UNSAFE_AMOUNT`。
- 零 contribution 归为 positive；anchor 始终 locked，pinned contribution 与包含 pinned child 的 collapsed group locked。
- group 与 direct contribution 使用 own-property lookup，`constructor`、`toString`、`__proto__` 等 ID 不会被 Object prototype 误判。

## TDD Evidence

RED:

- 四个 waterfall test files 先于实现落盘，初次运行 exit 1，均因 `src/waterfall/projectWaterfall` 尚不存在而失败；既有 140 tests 保持通过。
- GREEN 后独立自审发现 prototype-like contribution ID 会被 inherited group property 误判，新增回归并以 own-property descriptor 修复。

GREEN:

- 32 个 waterfall tests 覆盖基础投影、负基线、零值、多个/连续 subtotal、0.1 + 0.2、large cancellation、正负 8/9 ULP、unsafe current/group、group 展开/折叠 parity、锁定、determinism、immutability 与 hostile input。
- Fresh 全量 172 tests 通过；waterfall statements 99.04%、branches 100%、functions 100%、lines 99.03%。
- ESM/CJS/declarations、publint、ATTW、runtime/type consumers、strict TypeScript、lint、format 与 build 全部通过。

## Changed Files

- `packages/editor/src/waterfall/projectWaterfall.ts`
- `packages/editor/src/waterfall/waterfallTypes.ts`
- `packages/editor/tests/waterfall/{projectWaterfall,anchors,groups,determinism}.test.ts`
- T104 packet、projection/API/data/plan contract、task/analysis/release state 与 T104 evidence

## Scope Confirmation

- `projectWaterfall` 保持 package internal，T103 公共 runtime surface 未变化。
- 未实现 React、G2、DOM、交互、持久化、格式化或导出。
- 未新增 dependency，未执行 commit、push、PR、merge、publish 或其他远端写操作。

## Residual Risk

- ULP 测试覆盖正负普通数值与精确 8/9 ULP 边界，尚未单独覆盖跨零、subnormal 与接近 `Number.MAX_SAFE_INTEGER` 的位序边界；实现使用完整 signed IEEE-754 ordered-bit mapping，独立 review 判定该缺口为 Low。
- T104 不包含货币格式化；显示精度由后续单一 formatter/组件合同决定，不参与财务锚点判断。

## Independent Review Verdict

- 无 Critical、High 或 Medium finding，建议 Accepted。
- Neumaier、8 ULP、safe range、subtotal reset、segment/group、collapsed/expanded parity、锁定、隐私与 prototype-like ID 语义符合锁定合同。
- 用户已授权 Codex 对 T102-T104 独立 review 并验收，T104 据此进入 Accepted。
