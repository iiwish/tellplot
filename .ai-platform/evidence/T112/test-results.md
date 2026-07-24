# T112 Test Results

## Status

- Task status: Accepted
- User acceptance: 用户于 2026-07-19 明确回复“T112 验收通过”
- Validation remains the final T112 implementation receipt；acceptance 未修改任何测试或质量门禁。

## TDD Trail

| Stage | Command | Exit | Result |
| --- | --- | ---: | --- |
| RED | `pnpm exec vitest run packages/editor/tests/domain/schema-v2.test.ts packages/editor/tests/domain/chart-policy.test.ts packages/editor/tests/domain/persistence.test.ts packages/editor/tests/package/public-api.test.ts` | 1 | 2 failed / 2 passed files；8 failed / 6 passed tests；缺少 v2/dataKind/policy，符合预期 |
| GREEN | 同一 focused command | 0 | 4 files、17/17 |
| REFACTOR | `pnpm exec vitest run packages/editor/tests/domain packages/editor/tests/package` | 0 | 16 files、179/179 |

## Final Validation

| Gate | Exit | Result |
| --- | ---: | --- |
| `pnpm test:unit` | 0 | 34 files、341/341 |
| `pnpm test:coverage` | 0 | 34 files、341/341；configured thresholds pass |
| `pnpm typecheck` | 0 | editor + playground strict typecheck |
| `pnpm build` | 0 | editor ESM/CJS/CSS/DTS + playground production build |
| `pnpm test:package` | 0 | publint、ATTW、ESM、CJS、types consumer 全绿 |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm format:check` | 0 | all matched files pass |
| `git diff --check` | 0 | 无 whitespace error |
| T112 artifact validator `--strict` | 0 | delivery artifacts passed lightweight validation |

## Coverage

| Boundary | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Aggregate | 91.05% | 85.39% | 94.10% | 91.15% |
| Domain | 98.09% | 95.61% | 100% | 98.05% |
| Waterfall | 97.56% | 96.15% | 100% | 97.54% |

T112 要求的 domain 四项均超过 95%。`projectWaterfall.ts` 的 strict-union defensive branch 由
categorical projector-rejection regression 直接覆盖；waterfall 四项也继续超过 95%。

## Contract Checks

- legacy/current/categorical source validator success 保留输入 identity。
- current source 缺少/非法 `dataKind`、categorical item 带 `kind`、unknown/accessor/symbol/hostile input
  均稳定拒绝且不读取敏感值。
- categorical 默认 `column`，显式 `bar`；不兼容显式类型不回退。
- source/view dataset、schema generation 与 chart family 三层兼容检查独立覆盖。
- current bar/column persistence 保留 schema/chart type，legacy serializer 不升级。
- categorical command move/group/pin、pinned rejection、undo/redo 与 waterfall cross-segment restriction通过。
- runtime public entry 未增加 export；package type consumer 能消费全部批准的新类型。
