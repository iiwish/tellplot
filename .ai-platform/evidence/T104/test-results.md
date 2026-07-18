# T104 Test Results

## RED

| Command | Exit | Expected signal |
| --- | ---: | --- |
| `pnpm test:unit -- packages/editor/tests/waterfall` before implementation | 1 | 4 suites 因 `projectWaterfall` module 缺失失败；既有 140 tests 通过 |

## GREEN And Fresh Validation

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm exec vitest run packages/editor/tests/waterfall` | 0 | 4 files、32 tests passed |
| `pnpm test:unit` | 0 | 12 files、172 tests passed |
| `pnpm test:coverage` | 0 | 172 tests passed；waterfall 99.04% / 100% / 100% / 99.03% |
| `pnpm typecheck` | 0 | editor 与 playground strict TypeScript 通过 |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm format:check` | 0 | 全部 matched files 通过 |
| `pnpm build` | 0 | editor ESM/CJS/d.ts/d.cts 与 playground production build 成功 |
| `pnpm test:package` | 0 | publint、ATTW、ESM/CJS runtime 与 type consumer 全部通过 |
| `git diff --check` | 0 | 无 whitespace error |
| independent T104 review | 0 | 无 Critical、High 或 Medium finding，建议 Accepted |

## Coverage Boundary

`packages/editor/src/waterfall/**`：

- Statements: 99.04%
- Branches: 100%
- Functions: 100%
- Lines: 99.03%

全量 aggregate：statements 97.89%、branches 95.47%、functions 100%、lines 97.85%。

## Numeric And Privacy Boundaries

- 正负锚点均验证精确 8 ULP 接受、9 ULP 拒绝。
- `0.1 + 0.2` subtotal 通过 compensated comparison 并按声明值 reset。
- `9e15 + 0.5 - 9e15` 保留 0.5 cancellation result。
- unsafe main/current 与 collapsed group aggregate 返回固定 path/details，不包含 amount、label 或 sourceRef。
- invalid structural source/view、hostile Proxy 与 accessor view 返回 canonical privacy-safe validation failure。

## Group And Determinism Boundaries

- expanded 按 childIds 输出且不产生 group datum；collapsed 产生单一 group datum。
- collapsed/expanded 使用相同 child feed，最终累计与 end anchor 一致。
- 重复调用 deep-equal、JSON-compatible、plain data 且 output/sourceIds 不别名输入。
- prototype-like contribution IDs 使用 own-property semantics。

## Not Run

- Browser E2E 与视觉截图：T104 是 package-internal 纯投影，无 DOM；由 T105 真实 G2 工作台覆盖。
