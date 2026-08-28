# T135 Attempt Summary

## Status

- Attempt: `T135-A001`
- Result: `Blocked`
- Blocker: exact core-suite validation repeatedly exceeds the existing 15-second timeout in
  `packages/core/tests/domain/property-sequences.test.ts` under the concurrent full-suite load.
- Retry budget: exhausted; implementation and validation stopped according to `EP-015-T135`.

## Implemented Scope

- Added the 16 approved comparison type exports and the schema `3.0.0` source/view/config unions.
- Added closed comparison source, matrix, metadata, ViewSpec, ChartConfig, appearance and series-color validation.
- Added comparison initial view, persistence/history preservation, category policy/group-selection support and v3
  fingerprint zero-sign canonicalization.
- Added defensive scalar categorical and waterfall projector narrowing without implementing or exporting
  `projectCategoricalComparison`.
- Added exact source-surface validation plus package, editor-consumer, public-package and playground compile guards.

## Changed Files

- `packages/core/src/charts/categorical/comparisonTypes.ts`
- `packages/core/src/charts/categorical/projection.ts`
- `packages/core/src/charts/waterfall/projection.ts`
- `packages/core/src/config/chartConfig.ts`
- `packages/core/src/domain/createInitialViewSpec.ts`
- `packages/core/src/domain/errors.ts`
- `packages/core/src/domain/history.ts`
- `packages/core/src/domain/ids.ts`
- `packages/core/src/domain/model.ts`
- `packages/core/src/domain/session.ts`
- `packages/core/src/domain/validation.ts`
- `packages/core/src/index.ts`
- `packages/core/src/interactions/groupSelection.ts`
- `packages/core/tests/config/comparison-chart-config.test.ts`
- `packages/core/tests/domain/persistence.test.ts`
- `packages/core/tests/domain/schema-v3.test.ts`
- `packages/core/tests/domain/validation.test.ts`
- `packages/core/tests/public-api.mjs`
- `packages/editor/tests/package/types-consumer.ts`
- `packages/tellplot/tests/package/consumer.tsx`
- `apps/playground/src/ExampleWorkbench.tsx`
- `apps/playground/src/ShowcaseChart.tsx`
- `apps/playground/tests/schemaV3Guards.test.ts`
- `scripts/release/package-contracts.json`
- `scripts/release/validate-package-surface.mjs`

## Boundary Confirmation

- No dependency, package manifest or lockfile was changed.
- No G2, DOM, React or Vue import was added to core.
- No comparison runtime projector was implemented or exported.
- No published `1.0` lineage, T131 evidence, workflow, remote Git, tag, publish, release or production setting changed.
- Existing uncommitted G003 governance artifacts were preserved.

## Residual Risks

- T135 cannot enter review until the exact core suite and all remaining packet validation commands pass.
- Root typecheck must be rerun after the newly added playground guards.
- Build, package, architecture and lint gates remain unexecuted in the stopped attempt, except the standalone exact
  source-surface check recorded in `test-results.md`.

## T135-A002 Recovery

- Attempt: `T135-A002`
- Result: `Blocked`
- The separately authorized low-concurrency core-suite retry passed (`26` files, `282` tests), and the unchanged exact
  core command then passed. This confirms the A001 timeout was concurrent machine-load instability; the A001 RED and
  blocked history above remain authoritative for that attempt.
- Review found and fixed two T135-scoped validation gaps: hostile embedded source inspection now preserves
  `INVALID_SOURCE_DATA / UNREADABLE_INPUT /data`, and regression fixtures cover v2/v3 scalar-projector precedence,
  invalid-source-first handling, and concrete v1/v2 signed-zero validation/projector/fingerprint behavior.
- Focused, core, typecheck, build, core package, exact surface, public package, architecture, lint and diff checks pass.
- The exact editor package command remains blocked by a pre-existing contradiction: the private workspace manifest is
  intentionally `@tellplot/editor@0.0.0`, while its unchanged `pack-contract.mjs` requires `1.0.0`. Its publint, ATTW,
  ESM/CJS imports and TypeScript consumer steps passed before that final assertion; the T135 types consumer also passes
  as a standalone `tsc` invocation.

### A002 Boundary Confirmation

- No timeout, assertion, test count, package version, package manifest, dependency or lockfile was changed.
- No G2, DOM, React or Vue import was added to core; no comparison runtime projector was implemented or exported.
- No approved plan, TDR, public contract, migration contract, published `1.0` lineage, T131 evidence, workflow, remote
  Git, tag, publish, release or production setting changed.
- T135 cannot enter `Needs_Review` while the exact editor package validation command remains impossible in the approved
  allowed-file boundary. This is the only known residual blocker after A002.

## Orchestrator Review Integration

- Review date: 2026-08-12.
- Task status: `Needs_Review`; this is an internal governed-task review state, not user `Accepted` status. G003 remains the
  user acceptance unit and does not enter goal-level review until T141 is complete.
- Spec-compliance review: passed.
- Bug/code-quality review: passed.
- QA acceptance review: passed for the T135 schema, validation, public-surface and compatibility scope.
- Final findings: Critical 0 / High 0 / Medium 0.
- Dependency result: T136's dependency on T135 `Needs_Review` plus a passing spec-compliance review is satisfied.

### Pre-existing Editor Package Baseline Exception

The orchestrator classified the remaining `pnpm --filter @tellplot/editor test:package` failure as a narrow,
pre-existing baseline exception rather than a T135 regression. The private workspace manifest is intentionally
`@tellplot/editor@0.0.0`, while the unchanged internal `pack-contract.mjs` still asserts `1.0.0`. Before that final stale
assertion, publint, ATTW, ESM/CJS imports and the package TypeScript consumer passed; the T135 types consumer also passed
through its standalone `tsc` command.

This exception does not waive any T135 behavior, type, privacy, compatibility or package-surface assertion. No manifest,
package version, assertion, timeout, dependency or lockfile was changed to obtain review clearance. A001 and A002 remain
the authoritative attempt history; the orchestrator review only integrates their evidence and permits the task to move
to `Needs_Review` without claiming user acceptance.

## Residual Risk After Review

- The stale private editor package version assertion remains repository baseline debt outside T135's approved version
  boundary. It must not be silently changed by T136 and does not authorize package or release work.
- T135 is not `Accepted`; its implementation remains part of the uncommitted G003 dependency baseline while the serial
  goal proceeds to T136.
