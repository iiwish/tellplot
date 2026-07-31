# T127 Test Results

## Passed

- `pnpm --filter @tellplot/react typecheck`
- `pnpm --filter @tellplot/vue typecheck`
- `pnpm --filter @tellplot/react build`
- `pnpm --filter @tellplot/vue build`
- `pnpm test:framework-matrix`
  - React: 2 tests passed
  - Vue: 1 test passed
- React/Vue `publint` and `attw --pack`: no problems found
- `node scripts/release/check-architecture.mjs`
  - four package source roots, 46 source files, 186 import edges, 0 runtime cycles

## TDD Record

- RED: both adapter suites failed because packages and Vue peer were absent.
- GREEN: lifecycle wrappers implemented directly over `EditorInstance`.
- REFACTOR: architecture gate validates both adapter graphs and rejects cross-framework dependencies.
