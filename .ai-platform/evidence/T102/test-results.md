# T102 Test Results

## RED

| Command | Exit | Expected signal |
| --- | ---: | --- |
| T102 narrow unit command before implementation | 1 | `createInitialViewSpec`、`validateSourceData`、`validateViewSpec` 尚不存在；64 tests failed |
| sparse-input review regression before fix | 1 | 6 tests failed；复现 sparse source 在 view validation 中抛 `TypeError` |
| accessor/closed-schema review regression before fix | 1 | 4 tests failed；复现 getter/Proxy 异常传播与 unknown field 被接受 |

## GREEN And Fresh Validation

| Command | Exit | Result |
| --- | ---: | --- |
| T102 narrow unit command | 0 | 4 files、97 tests passed |
| `pnpm test:coverage` | 0 | 97 tests passed；domain statements 98.63%、branches 97.47%、functions 100%、lines 98.60% |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm typecheck` | 0 | editor 与 playground strict TypeScript 通过 |
| `pnpm format:check` | 0 | 全部 matched files 通过 |
| `pnpm build` | 0 | editor ESM/CJS/d.ts/d.cts 与 playground production build 成功 |
| `pnpm test:package` | 0 | publint、ATTW、ESM/CJS runtime 与 type consumer 全部通过 |
| domain dependency scan | 0 | 无 React、React DOM 或 G2 import |
| 10,000-input JSON/sparse runtime probe | 0 | source/view validators 全部返回且无异常逸出 |
| `git diff --check` | 0 | 无 whitespace error |
| T102 delivery artifact validator | 0 | packet、task、evidence 与 feature artifacts 全部通过 |

## Coverage Boundary

`packages/editor/src/domain/**`：

- Statements: 98.63% (362/367)
- Branches: 97.47% (232/238)
- Functions: 100% (30/30)
- Lines: 98.60% (354/359)

未执行分支集中在 descriptor/reflection 的重复 defensive guard；所有公开 schema、accessor、sparse、unknown-field 与 hostile-input 路径均有直接测试。

## Not Run

- Browser E2E、axe、performance：T102 仅包含纯领域模型，无 DOM 或用户交互。
- Waterfall arithmetic：属于 T104，不在 validator 内建立第二套累计算法。
