# T119 验证结果

## Metadata

- Date: 2026-07-23
- Runtime: Node 22 / pnpm workspace
- Result: Passed

## Focused TDD

| Gate | Result |
| --- | --- |
| website content and routing unit tests | 8/8 passed |
| showcase Chromium/Firefox/WebKit E2E | 15/15 passed |
| live editor Chromium E2E | 4/4 passed |
| focused Chromium accessibility | 15/15 passed |

RED receipts are recorded in `summary.md`; expected failures were observed before implementation.

## Full Release-Candidate Gates

| Command / Gate | Result |
| --- | --- |
| `pnpm format:check` | passed |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm test:unit` | 47 files；426/426 passed |
| `pnpm test:coverage` | 426/426；statements 85.82%；branches 80.61%；functions 88.43%；lines 85.97% |
| constrained domain/chart/G2 coverage | all >=95% |
| `pnpm build` | passed；only the accepted G2 chunk-size warning remains |
| `pnpm test:package` | `@tellplot/editor@0.1.0-beta.1` package contract passed |
| `pnpm test:react-matrix` | React 18.3.1 and 19.2.7 passed with painted pixels and clean unmount |
| `pnpm test:e2e` | 两次完整矩阵均 176/177；同一既有 WebKit `page.goto('/playground')` 30s 超时；隔离复跑 1/1 passed |
| `pnpm test:a11y` | Chromium/Firefox/WebKit 45/45 passed |
| `pnpm test:performance` | waterfall p95 74.8ms；categorical p95 80.5ms；both <150ms |
| previous Playwright browser matrix | 174/174 passed |
| WebKit 18.4 previous-major matrix | 58/58 passed |
| strict artifact validator | passed |
| `git diff --check` | passed |

## Visual Matrix

| Surface | Viewport | Result |
| --- | --- | --- |
| home | 1440x900 | passed；real G2 chart visible；next section visible |
| home | 390x844 | passed；no overlap/overflow；next section visible |
| examples | 1440x900 | passed；search、category sidebar and three equal real previews visible |
| examples | 390x844 | passed；filters、three real previews and links visible |
| docs | 390x844 | passed；single-column scan and code blocks fit |
| playground | 390x844 | passed；chart and on-demand editor panels remain reachable |

## Notes

- No remote asset, font, data, analytics or service request was introduced.
- No dependency manifest, lockfile, core package, public API or schema change belongs to T119.
- Vite build continues to report the existing G2 bundle-size warning; it is not a T119 regression.
- The repeated full-matrix failure occurs before the affected page loads and passes in isolation; it remains a
  documented low-risk WebKit load-time flake rather than a product-behavior failure.
