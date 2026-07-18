# T103 Test Results

## RED

| Command | Exit | Expected signal |
| --- | ---: | --- |
| T103 targeted unit command before implementation | 1 | 30 tests failed；`createEditorSession`、executor、history 与 invariants 尚不存在 |
| review regression before fix | 1 | stale + tampered session 返回 `INVARIANT_VIOLATION /rootOrder`，复现错误优先级偏差 |

## GREEN And Fresh Validation

| Command | Exit | Result |
| --- | ---: | --- |
| T103 targeted unit command | 0 | 8 files、140 tests passed |
| `pnpm test:coverage` | 0 | 140 tests passed；domain statements 97.64%、branches 95.11%、functions 100%、lines 97.59% |
| `pnpm typecheck` | 0 | editor 与 playground strict TypeScript 通过 |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm format:check` | 0 | 全部 matched files 通过 |
| `pnpm build` | 0 | editor ESM/CJS/d.ts/d.cts 与 playground production build 成功 |
| `pnpm test:package` | 0 | publint、ATTW、ESM/CJS runtime 与 type consumer 全部通过 |
| `git diff --check` | 0 | 无 whitespace error |
| independent T103 review | 0 | 修复 1 个 Medium 后，无 Critical、High 或 Medium finding |
| T103 delivery artifact validator | 0 | packet、task、evidence 与 feature artifacts 通过 lightweight validation |

## Coverage Boundary

`packages/editor/src/domain/**`：

- Statements: 97.64% (872/893)
- Branches: 95.11% (623/655)
- Functions: 100% (104/104)
- Lines: 97.59% (853/874)

## Property Sequence

- Seeds: 1-32。
- Steps per seed: 160。
- Each seed replayed twice。
- Operations: move、create/ungroup、collapse/expand、pin/unpin、annotation、undo、redo，以及预期拒绝的跨 segment move。
- Assertions per step: failure identity、source identity、ViewSpec validation、source coverage、revision monotonicity、event/error privacy；second replay deep-equals first session history state。

## Privacy And Runtime Boundaries

- accessor command/options 不执行 getter。
- hostile Proxy 不传播调用方异常文本。
- sparse、symbol、unknown field、array attached property、invalid nested target/payload 均结构化拒绝。
- `constructor`、`toString`、`__proto__` ID 使用 own-property semantics，不读取 Object prototype。
- history entry 不包含 SourceData 或 command payload；event/error 不包含财务或 annotation 内容。

## Not Run

- Browser E2E、axe、performance：T103 是纯领域 session/command/history，无 DOM。
- Waterfall arithmetic：subtotal/end 与 compensated accumulation 属于 T104。
