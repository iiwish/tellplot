# T126 Test Results

## Passed

- `pnpm --filter @tellplot/editor typecheck`
- `pnpm vitest run packages/editor/tests/runtime`
  - 2 files, 5 tests passed
- `pnpm vitest run packages/editor/tests/export packages/editor/tests/rendering packages/editor/tests/runtime --maxWorkers=4`
  - 11 files, 62 tests passed after the runtime interaction test correction
- `pnpm --filter @tellplot/editor build`
  - ESM, CJS, CSS and declarations built
- `node scripts/release/check-architecture.mjs`
  - 44 source files, 182 import edges, 0 runtime cycles

## TDD Record

- RED: runtime tests failed because `createEditor` did not exist and editor metadata depended on React.
- GREEN: imperative runtime tests cover mount/update/controlled mode/commands/grouping/annotation/
  history/ownership/destroy.
- REFACTOR: removed React components, React controller, dnd-kit/lucide dependencies and temporary core
  re-export source modules.
