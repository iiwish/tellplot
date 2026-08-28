# T141 Execution Summary

## Status

- Current attempt: `T141-A003`
- Current state: `Needs_Review`
- T141 与 G003 目标级状态均为 `Needs_Review`；T135-T141 不自动进入用户 `Accepted`。

## T141-A001 Baseline Stop

- Result: `Stopped_Pre_Edit`
- Trigger: the six T135-T140 task-local patches are not a complete cumulative replay chain from the exact HEAD.
- Product/source/test changes: none.
- Predecessor evidence changes: none.
- Finding: four T135 additions and `docs/getting-started.md` were absent from the patch union, while
  `packages/core/src/config/chartConfig.ts` did not preserve the final reviewed bytes.
- Recovery: orchestrator-only evidence-method amendment. T141-A002 freezes the current reviewed product tree by exact
  path/type/mode/size/SHA-256 manifest and a cumulative patch replayed forward and backward from the exact base commit.
- Boundary: the amendment does not change product, architecture, public contracts, ownership, dependencies, thresholds,
  work graph or release authorization. Original predecessor evidence remains immutable.

## T141-A002

- Result: `Baseline_Frozen`
- Base commit: `cd90ddf3d27bb323c994b5ba01735a4972c46f48`
- Product baseline: `108` paths (`70` tracked modifications and `38` untracked additions), each frozen by path,
  type, Git mode, byte size and SHA-256.
- Amendment coverage: all five paths omitted from the original patch union and the final reviewed byte state of
  `packages/core/src/config/chartConfig.ts` are present in the frozen manifest and cumulative patch.
- Cumulative patch: `685625` bytes, SHA-256
  `026f1f3d61afc753557ec14696c04341ce5a1cfb276c1bd50e8e654d74562a18`, containing exactly the `108` product
  paths and excluding governance, predecessor evidence, immutable lineage, T141 output and generated artifacts.
- Replay: generated with an external temporary Git index; the shared index hash remained unchanged. Forward apply to
  an isolated archive of the exact base commit passed, all `108` receipts matched, and reverse apply recovered the
  exact archived base file tree.
- Companion freezes: `24` governance files, `22` immutable predecessor evidence files and `15` immutable lineage
  inputs were recorded in their dedicated manifests.
- Boundary: no product or test file changed, no RED/GREEN implementation began, and T141/G003 statuses remain
  unchanged pending independent baseline review.

## Focused T141 Execution Before A003

- Performance GREEN: one deterministic 200-category x 2-series fixture, exactly `30` keyboard and `30` direct samples,
  both p95 values below `150ms`, painted revision/order receipts matched and direct preview React root commit delta was `0`.
- Responsive GREEN: the 50-category x 4-series matrix completed all `12` viewport/locale/state cells with real Canvas,
  mounted public SVG geometry, no visible-text intersection, `200` intervals, automatic value-label count `0`, and preserved
  Outline, Tooltip, Inspector and category/group edit paths.
- T137 owner variance: real SVG geometry exposed a one-pixel cross-axis label contact. The canonical RED and minimal
  `labelSpacing: 6` fix passed the exact T137 owner suite (`41/41`) and the responsive matrix.

## T141-A003 Approval And Recovery

- Mandatory `pnpm format:check` failed on ten reviewed G003 files spanning T135, T138 and T139, plus two untracked local
  generated video JSON files that are excluded by `.git/info/exclude` but not `.prettierignore`.
- Independent QA also found that candidate rehearsal recursively copies those two generated directories into the isolated
  source, weakening clean-source reproducibility and privacy.
- The user explicitly approved the exact T141-A003 format hygiene and candidate rehearsal amendment on 2026-08-27.
- The approved recovery is limited to exact Prettier normalization of the ten recorded paths, two exact `.prettierignore`
  entries, and the T140 candidate rehearsal source-copy exclusion plus its focused regression test.
- Full gates resume only after format equivalence, owner suites and candidate-tool RED/GREEN pass.

## T141 Owner Variance: T137 Axis Label Spacing

- Classification: reproducible blocking predecessor defect found by the T141 responsive full-contract target.
- Command: `mise x node@22.20.0 -- pnpm exec playwright test e2e/comparison-responsive.spec.ts --project=chromium`.
- Failure: the mounted public SVG for the `1280x720` / `zh-CN` / `idle` cell contained two visible category-axis
  text client rectangles intersecting by `14.40625 x 1` CSS pixels. Both elements returned non-zero real
  `SVGGraphicsElement.getBBox()` receipts; the comparison used global `getBoundingClientRect()` coordinates.
- Owning task and path: T137, `packages/editor/src/charts/categorical/comparisonSpec.ts` category-axis G2 guide.
- Expected contract: every 50x4 responsive matrix cell has pairwise non-intersecting visible SVG text while preserving
  the real Canvas/SVG renderer and the category-axis information path.
- Why T141 test-only work is insufficient: the browser receipt observes real public SVG geometry after G2's configured
  category-axis auto-hide pass. A selector, tolerance, fixture, viewport or assertion change cannot remove the rendered
  one-pixel overlap without weakening the approved geometry contract. The conditional owner path therefore follows the
  packet owner-variance protocol before the smallest guide-spacing fix.

## T141 Owner Variance: T138 Tooltip Ownership

- Classification: reproducible cross-browser predecessor regression exposed by current and previous browser matrices.
- Symptom: the existing waterfall opening-bar Tooltip remained hidden after leaving a grouped child on current Firefox
  and previous Chromium/WebKit, while the same journey requires group actions to hide Tooltip only on the grouped child.
- Root cause: T138 comparison interaction added unconditional `runtime.dismissTooltip()` calls to shared scalar and
  comparison hover paths.
- Fix: guard the two hover-time dismissals with `isComparison()`; pointer-down, marquee and geometry invalidation retain
  their existing explicit dismissal behavior.
- Proof: T138 owner replay `5/5` files and `73/73` tests, isolated three-engine regression `3/3`, current E2E `321/321`,
  previous-release `321/321` and WebKit 18.4 `107/107`.

## Final Result

- Performance: final evidence-producing 200x2 run recorded keyboard p95 `61.60ms` and direct-pointer p95 `50.20ms`,
  exactly `30 + 30` samples, painted revision/order parity and preview React root commit delta `0`.
- Responsive: final 50x4 run recorded `12/12` cells, real Canvas, `200` SVG intervals per cell, automatic value-label
  count `0`, zero protected intersections and complete Outline/Tooltip/Inspector/category-edit paths.
- Quality: format, lint, type, exact 72-file/612-test coverage, build, public package, framework matrix, current/previous
  browsers, a11y, performance, security, production audit and architecture gates pass.
- Candidate: audit passes; two artifacts are byte-identical at SHA-256
  `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`; isolated source rehearsal passes with
  `453` source files on actual Node `22.20.0`.
- Replay: T141 `diff.patch` contains exactly `22` product/test/tooling paths, is `102082` bytes with SHA-256
  `26a3b8c048572b46aecfab0e2db089b1e02e1c0bc226f7e90a6b31a2b1596530`, applies to the frozen predecessor tree,
  matches the current product state and reverses to the exact predecessor tree.
- Immutability: predecessor evidence `22/22` and published lineage `15/15` receipts match; lockfile, workflows, T131
  evidence, `.git/info/exclude` and legacy release scripts remain unchanged.
- Governance: the only A002 governance-manifest differences are five declared status-only paths and the exact approved
  T141-A003 packet amendment (`45127` bytes, SHA-256
  `145eca3b0faa5d162c24d13c67df08fff2a06d2d676f2e0ed1479cc8b6629729`); the remaining frozen governance paths match.
- Review: spec compliance, bug/code quality and QA acceptance each report Critical `0`, High `0`, Medium `0`, Low `0`
  unresolved.
- Authorization: final shared index remains unstaged, matching the execution baseline; no commit, push, PR, tag,
  publish, release, remote Git or production action was performed.
