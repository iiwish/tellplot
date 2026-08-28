# T135 Test Results

## RED

Command:

```text
pnpm exec vitest run packages/core/tests/domain/schema-v3.test.ts packages/core/tests/config/comparison-chart-config.test.ts apps/playground/tests
```

Result: failed as expected (`2` test files failed, `11` tests failed, `6` files passed). Failures showed unsupported
schema `3.0.0`, unknown `series`/`values`/`legend` fields, missing validation reasons and missing initial-view/fingerprint
support. This matched the packet's expected RED reason.

## Focused GREEN

The same command passed after the minimal implementation:

```text
Test Files  9 passed (9)
Tests       40 passed (40)
Duration    15.74s
```

## Development Checks

- `pnpm --filter @tellplot/core typecheck`: passed.
- `node scripts/release/validate-package-surface.mjs`: passed for the five package entries and four public subpaths.
- Initial `pnpm typecheck`: core/editor/react/vue/tellplot passed; playground exposed two intended exhaustive-union
  errors in `ExampleWorkbench.tsx` and `ShowcaseChart.tsx`. Explicit schema 3 rejection/narrowing guards were then
  added, but the root command was not rerun after the retry-budget blocker.

## Core Validation Attempts

Command:

```text
pnpm --filter @tellplot/core test
```

1. First attempt: `3` failures caused by existing fixtures treating `3.0.0` as unsupported. The allowed v1/v2
   compatibility fixtures were advanced to unsupported `4.0.0`; no production contract was weakened.
2. Second attempt: `25` files and `281` tests passed; only
   `packages/core/tests/domain/property-sequences.test.ts` timed out after `26.6s` against its existing `15s` limit.
3. Diagnostic `pnpm exec vitest run packages/core/tests/domain/property-sequences.test.ts`: passed (`1/1`), with the
   test body completing in `10.03s`.
4. Final exact retry: `25` files and `281` tests passed; the same property test timed out after `20.4s` under full-suite
   concurrency.

Classification: execution-environment/concurrent CPU timeout. The retry budget is exhausted. No timeout, test assertion
or production behavior was changed to hide the failure.

## Validation Loop Status

| Command | Result |
| --- | --- |
| Focused Vitest command | Passed |
| `pnpm --filter @tellplot/core test` | Blocked by repeated environment timeout |
| `pnpm --filter @tellplot/core typecheck` | Passed as a development check |
| `pnpm --filter @tellplot/core build` | Not run after blocker |
| `pnpm typecheck` | Must rerun after playground guard |
| `pnpm build` | Not run after blocker |
| `pnpm --filter @tellplot/core test:package` | Not run after blocker |
| `pnpm --filter @tellplot/editor test:package` | Not run after blocker |
| `node scripts/release/validate-package-surface.mjs` | Passed |
| `pnpm test:package` | Not run after blocker |
| `pnpm release:architecture` | Not run after blocker |
| `pnpm lint` | Not run after blocker |
| `git diff --check` | Not run after blocker |

## T135-A002 Recovery Results

The A001 records above are retained unchanged. A002 was an explicitly authorized controlled recovery attempt.

### Core Timeout Recovery

| Command | Result |
| --- | --- |
| `pnpm --filter @tellplot/core test -- --maxWorkers=1 --no-file-parallelism` | Passed: 26 files, 282 tests, 18.97s |
| `pnpm --filter @tellplot/core test` before review fixes | Passed: 26 files, 282 tests, 17.72s |

No timeout, assertion or test count was changed. The low-concurrency result and unchanged exact replay confirm the A001
failure was concurrent machine-load instability.

### Review RED/GREEN

Focused review RED command:

```text
pnpm exec vitest run packages/core/tests/domain/schema-v3.test.ts packages/core/tests/config/comparison-chart-config.test.ts
```

Result: failed exactly because hostile `config.data` returned
`INVALID_CHART_CONFIG / UNREADABLE_INPUT /` instead of preserving the embedded source-owned
`INVALID_SOURCE_DATA / UNREADABLE_INPUT /data`. The projector precedence and legacy signed-zero regression fixtures
were green against the existing implementation. After the minimal safe schema probe fix, the full focused packet
command passed with `9` files and `43` tests.

### Final Validation Matrix

| Command | Result |
| --- | --- |
| Focused packet Vitest command | Passed: 9 files, 43 tests |
| `pnpm --filter @tellplot/core test` | Passed: 26 files, 285 tests |
| `pnpm --filter @tellplot/core typecheck` | Passed |
| `pnpm --filter @tellplot/core build` | Passed; ESM/CJS/DTS |
| `pnpm typecheck` | Passed: all workspace projects |
| `pnpm build` | Passed: all workspace projects and playground |
| `pnpm --filter @tellplot/core test:package` | Passed: publint, ATTW, exact public API |
| `pnpm --filter @tellplot/editor test:package` | Blocked only at unchanged final version assertion: expected `1.0.0`, private manifest is `0.0.0` |
| `pnpm exec tsc -p packages/editor/tests/package/tsconfig.json` | Passed standalone T135 types consumer |
| `node scripts/release/validate-package-surface.mjs` | Passed: five package entries and four public subpaths |
| `pnpm test:package` | Passed: public `tellplot@1.0.0` package contract |
| `pnpm release:architecture` | Passed: 55 source files, 205 import edges, zero runtime cycles |
| `pnpm lint` | Passed with zero warnings |
| `git diff --check` | Passed |

For the editor exact command, publint, ATTW, ESM import, CJS import and package TypeScript consumer all completed before
`packages/editor/tests/package/pack-contract.mjs` rejected the pre-existing private `0.0.0` manifest. Git history shows
the single-package distribution commit intentionally changed internal packages to private `0.0.0` without updating
that stale internal pack assertion. Neither file is in T135's editable boundary for version semantics, and the packet
forbids changing published `1.0` lineage or package versions.

## Orchestrator Review Classification

- Final review result: Critical 0 / High 0 / Medium 0.
- Spec compliance, bug/code-quality and task-scope QA review passed.
- The editor package command's sole failing final version assertion is accepted only as a pre-existing baseline exception:
  it is unrelated to the T135 diff, is outside T135's editable version boundary and follows successful publint, ATTW,
  ESM/CJS import and TypeScript consumer checks.
- The standalone T135 editor types consumer passed, and every other packet validation command passed.
- No validation command or historical A001/A002 result was erased or rewritten. The exception permits `Needs_Review`,
  not `Accepted`, and does not authorize changing the private manifest, stale assertion or published `1.0` lineage.
