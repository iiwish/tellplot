# T144 Test Results

## Quality Gates

| Gate | Fresh result |
| --- | --- |
| `pnpm format:check` / `pnpm lint` / `pnpm typecheck` | Passed |
| `pnpm test:coverage` | Passed: 72 files / 613 tests; 90.29 / 84.38 / 91.13 / 90.40 percent |
| `pnpm build` | Passed: all internal layers, public package and playground |
| `pnpm test:package` | Passed: publint, ATTW, ESM/CJS, NodeNext types and pack contract |
| `pnpm test:framework-matrix` | Passed: imperative DOM, React 18, React 19 and Vue 3 |
| `pnpm test:e2e` | Passed: current Chromium/Firefox/WebKit 321/321 on port 4175 |
| `pnpm test:a11y` | Passed: 48/48 across current Chromium/Firefox/WebKit |
| `pnpm test:performance` | Passed: 4/4; all p95 below 150ms; root commit delta 0 |
| `pnpm test:browser-previous` | Passed: Playwright 1.60 321/321; WebKit 18.4 107/107 |
| `pnpm security:lock` / `pnpm security:dependencies` | Passed: 14 packages / 17 artifacts; 48 installed manifests |
| `pnpm audit:prod` | Passed: no known production vulnerability |
| `pnpm release:architecture` | Passed: 62 files, 237 edges, 0 runtime cycles |
| `pnpm release:audit` | Passed: tellplot@2.0.0, 27 public files, 21 markdown files |
| `pnpm release:artifact` | Passed: exact T143 artifact receipt |
| `pnpm release:check` | Passed: complete stable orchestration under Node 22.20.0 |
| `pnpm release:rehearse` | Passed as fresh nested exact gate: 12 isolated gates, 464 source files, 613 unit tests |
| Focused current-release/preflight fixtures | Passed: 3 files / 31 tests after cooldown |
| `git diff --check` | Passed |

## Preserved Environmental Failures

| First attempt | Classification | Exact replay |
| --- | --- | --- |
| E2E stopped before tests because port 4174 was occupied | Host port conflict | Port 4175, 321/321 |
| Previous browser matrix reached 319/321 before two Firefox 30s a11y timeouts | Sustained host saturation | 60s cooldown, 321/321 + 107/107 |
| Focused suite had one architecture fixture exceed its 15s test timeout | Sustained host saturation | 60s cooldown, unchanged suite 31/31 |

No test, assertion, timeout, worker count, coverage threshold or performance budget was weakened.

## Artifact Receipts

- Artifact SHA-256: `44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`.
- Source manifest SHA-256: `fc167c6800dd5474293fedf293e3448f29aeb0d865ed3e03a179d179a4e1958a`.
- T143 source patch SHA-256: `19fd38c377c45dcc0af6a3df6848bad684d079e1332b2fc296ad307f5805459d`.
- Descriptor SHA-256: `729bf4a1e67d8249d1146ebf5e961f0376f059ff8aa14750127c99c565570182`.
- Workflow SHA-256: `d85da954fee1e5696ddfd6bd678f68ead50f2d4d815ecda45ca9e9d2ea53ac63`.

## External Gates

Remote freshness、registry availability、Trusted Publisher、GitHub environment 与 live trust readiness 均为
`Not_Run_Not_Authorized`。Hermetic negative/positive cases详见 `preflight-fixtures.json`。
