# T125 Test Results

## RED

- `pnpm vitest run packages/core/tests`
- Result: failed as expected；`packages/core/src/index` 不存在。

## GREEN / REFACTOR

- `pnpm vitest run packages/core/tests`: passed，25 files / 241 tests。
- `pnpm --filter @tellplot/core typecheck`: passed。
- `pnpm --filter @tellplot/core build`: passed，ESM/CJS/type declarations generated。
- `pnpm --filter @tellplot/editor typecheck`: passed。
- `pnpm --filter @tellplot/editor build`: passed。
- `pnpm release:architecture`: passed，72 source files、246 import edges、0 runtime cycles。
- `pnpm vitest run packages/editor/tests/package/public-api.test.ts packages/editor/tests/package/stable-release.test.ts`:
  passed，5 tests。
- `git diff --check`: passed。

## Notes

一次 broad unit run 在 core export 临时过宽时按预期发现旧 editor allowlist drift；editor entry 收窄为原候选
surface 后 focused stable tests green。该临时失败未通过放宽断言解决。
