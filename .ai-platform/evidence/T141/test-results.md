# T141 Final Test Results

## Runtime And Scope

- Runtime: actual Node `22.20.0`, matching `.nvmrc`.
- Candidate: local `tellplot@2.0.0`, schema `3.0.0`; no publish, tag, release, remote Git or production action.
- Final product patch: `22` paths, `102082` bytes, SHA-256
  `26a3b8c048572b46aecfab0e2db089b1e02e1c0bc226f7e90a6b31a2b1596530`.

## Final Quality Matrix

| Gate | Final result |
| --- | --- |
| `pnpm format:check` | Passed; all matched files use Prettier style |
| `pnpm lint` | Passed with zero warnings |
| `pnpm typecheck` | Passed for core, editor, React, Vue, public package and playground |
| `pnpm test:coverage` | Passed: `72/72` files, `612/612` tests; statements `90.29%`, branches `84.38%`, functions `91.13%`, lines `90.40%` |
| `pnpm build` | Passed for all workspace projects and production playground |
| `pnpm test:package` | Passed: publint, ATTW, ESM/CJS, types and pack contract for public `tellplot@2.0.0` |
| `pnpm test:framework-matrix` | Passed: adapter unit tests plus imperative DOM, React 18, React 19 and Vue 3 isolated consumers; v1/v2 and v3 comparison journeys green |
| `pnpm test:e2e` | Passed: `321/321` current Chromium, Firefox and WebKit tests |
| `pnpm test:a11y` | Passed: `48/48` Chromium, Firefox and WebKit tests |
| `pnpm test:performance` | Passed: `4/4`; comparison keyboard p95 `61.60ms`, direct pointer p95 `50.20ms`, both under `150ms` |
| `pnpm test:browser-previous` | Passed: `321/321` on Playwright 1.60 previous-release engines and `107/107` on WebKit 18.4 |
| `pnpm security:lock` | Passed: 14 reviewed packages / 17 artifacts |
| `pnpm security:dependencies` | Passed: 48 installed manifests checked |
| `pnpm audit:prod` | Passed: no known production vulnerability |
| `pnpm release:architecture` | Passed: 62 source files, 237 import edges, zero runtime cycle |
| Candidate audit | Passed; exact version/task/runtime and public surface accepted |
| Candidate artifact, run 1 | Passed: `tellplot-2.0.0.tgz`, `597508` bytes, SHA-256 `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca` |
| Candidate artifact, run 2 | Passed with the identical artifact SHA-256 |
| Candidate isolated-source rehearsal | Passed from `453` source files with frozen install, build, package and audit |
| Delivery artifact validator | Passed for feature `015-multi-series-categorical-comparison` |
| `git diff --check` | Passed |

## T141 Contract Evidence

- Performance evidence contains exactly `30` keyboard and `30` direct-pointer commit-to-painted-frame samples. All
  expected revisions and order ordinals match the painted receipts. Preview scheduling recorded `48` RAF requests,
  `47` cancellations, one callback and React root commit delta `0`.
- The fresh 50x4 evidence run passed `4/4` viewport/locale tests and exactly `12` idle/hover/active-drag cells. Every
  cell has real Canvas pixels, `200` public SVG intervals, automatic value-label count `0`, no protected layout/text
  intersection, and complete Outline/Tooltip/Inspector/category-edit paths.
- Candidate rehearsal excludes only `apps/video/out/` and `apps/video/public/captures/` as approved. The focused
  candidate-tool suite is included in the T140 owner replay and the full coverage suite.

## Owner Replays

| Owner | Final focused result |
| --- | --- |
| T135 | `10/10` files, `47/47` tests |
| T137 | `4/4` files, `41/41` tests |
| T138 | `5/5` files, `73/73` tests |
| T139 | `4/4` files, `66/66` tests |
| T140 | `18/18` files, `80/80` tests under controlled single-worker execution |

T135's previously recorded private editor manifest assertion (`1.0.0` expected versus intentional private `0.0.0`)
remains an unchanged predecessor baseline exception. It does not affect the passing public package or candidate gates.

## Resolved Gate Findings

- Early performance execution on a saturated host exceeded the budget; a cooled exact replay passed, and the final
  evidence-producing exact run passed with `61.60ms` / `50.20ms` comparison p95.
- Early four-worker coverage attempts hit existing 15-second subprocess timeouts. A controlled full run passed, and the
  final exact `pnpm test:coverage` replay also passed all `612` tests without changing timeouts or assertions.
- The first complete current/previous browser runs exposed a T138 Tooltip ownership regression in the existing waterfall
  hover journey. The minimal owner fix limits comparison-only Tooltip dismissal to comparison charts. T138 owner tests,
  the isolated three-engine regression, current `321/321`, previous release `321/321` and WebKit 18.4 `107/107` all pass.

No failed assertion was skipped, renamed out of discovery, weakened, given a larger timeout or replaced by mock evidence.
