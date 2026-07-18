# T107 Test Results

## RED And Review Findings

| Target | Exit | Signal |
| --- | ---: | --- |
| persistence/public surface | 1 | 2 files、6 failures；parse/serialize 与 runtime exports 缺失 |
| export adapters | 1 | 3 suites 因 option/PNG/SVG modules 缺失失败 |
| public handle | 1 | 2 failures；forwarded ref 与 current-view/export methods 缺失 |
| initial JSON/PNG/SVG browser workflows | 1 | disabled action 与 StrictMode mounted guard 暴露真实 workflow 缺口 |
| compatibility emphasis | 1 | shared chart spec 不存在 datum emphasis accessor |
| compatibility live preview export | 1 | 公共 handle 在真实 chart-stage 为 dragging 时仍解析 PNG，PNG/SVG 可能分叉 |
| visual viewport review | review finding | export menu 超出 desktop/mobile viewport |

所有行为 finding 均以 focused regression 关闭；没有放宽财务、隐私、可访问性或导出断言。

## GREEN And Fresh Validation

| Command | Exit | Result |
| --- | ---: | --- |
| chart-spec emphasis focused | 0 | 1 file、1 test passed |
| public handle/recursive summary focused | 0 | 1 file、7 tests passed |
| recursive persistence/domain/projection review run | 0 | 17/17 passed |
| `pnpm test:unit` | 0 | 29 files、295/295 passed |
| `pnpm test:coverage` | 0 | 29 files、295/295；全部 thresholds 通过 |
| selected Chromium export + accessibility | 0 | 13/13；export 6/6、accessibility 7/7 |
| emphasis isolated repeat | 0 | 3/3 passed |
| `pnpm typecheck` | 0 | editor 与 playground strict source typecheck 通过 |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm format:check` | 0 | 全部 matched files 通过 |
| `pnpm build` | 0 | editor ESM/CJS/CSS/declarations 与 playground production build 成功 |
| `pnpm test:package` | 0 | publint、ATTW、ESM/CJS runtime 与 type consumer 通过 |
| `git diff --check` | 0 | 无 whitespace error |

最终 Chromium 命令：

```text
env G2TOUCH_E2E_PORT=4189 pnpm exec playwright test e2e/export.spec.ts e2e/accessibility.spec.ts --project=chromium
13 passed (22.0s)
```

## Coverage

| Boundary | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Aggregate | 90.30% | 84.14% | 92.32% | 90.40% |
| Domain | 97.81% | 95.04% | 100% | 97.76% |
| Components | 84.60% | 77.88% | 86.58% | 85.03% |
| Export | 87.12% | 80.18% | 83.33% | 86.92% |
| Interactions | 81.81% | 72.51% | 100% | 80.90% |
| Waterfall | 97.52% | 95.83% | 100% | 97.50% |

## Persistence And Recursive Matrix

- Deterministic round-trip preserves schemaVersion、datasetId、chartType、revision、rootOrder、recursive groups、collapsedGroupIds、pinnedItemIds、annotations 与 emphasis。
- Three-level fixtures preserve every source exactly once；outer collapse round-trip keeps descendant structure and collapse state。
- Malformed JSON -> `INVALID_VIEW_SPEC / UNREADABLE_INPUT /`。
- Unsupported major -> `UNSUPPORTED_SCHEMA_VERSION /schemaVersion`。
- Dataset mismatch、missing source 与 unknown source 返回稳定 `SOURCE_CONFLICT` path。
- Nested browser export retains outer -> inner -> leaf references in JSON while excluding SourceData amount、label、metadata 与 ledger payload。

## Export And Accessibility Matrix

- PNG magic bytes valid；default pixel ratio 2 produces bitmap >=1.9x logical plot and >500 painted pixels。
- SVG preserves current visible order and labels，removes script、foreignObject、external href/url、data attributes、sourceRef、metadata 与 ledger references。
- Nested outer collapse exports only the outer aggregate；inner group、leaf labels/IDs and product-mix remain absent。
- Imported highlight renders `stroke="rgba(24,33,29,1)"` with width 3；muted renders `fill-opacity="0.28"` in real Chromium SVG。
- Canvas、PNG and SVG share one chart spec；live chart/outline preview is rejected before the PNG/SVG branch with `EXPORT_UNAVAILABLE /export`。
- Recursive accessible summary covers inner collapsed、outer collapsed and fully expanded visible count/order without hidden descendants。
- Axe has zero serious/critical violations for ready、menu、active drag、expanded/collapsed group、rejection、invalid import and 390px mobile controls。
- Export menu keyboard path and explicit-download/object-URL lifecycle pass；SVG offscreen host count returns 0。

## Validation Retries

- Playwright preview ports require sandbox escalation for local listen；final strict port 4189 run used the same approved command and passed 13/13。
- Active-pointer UI cannot open the file menu because dnd-kit suppresses concurrent activation；that invalid harness attempt was removed. Existing real-browser drag tests prove chart-stage state，and the public handle regression proves the common pre-branch guard against that real state。
- First SVG emphasis assertion assumed hex/rgb serialization；renderer output already contained the correct `rgba(24,33,29,1)` stroke and 0.28 opacity. The test was corrected to parse actual `path.element` attributes without changing product behavior。
- One full emphasis run exported immediately while the screen transition was settling and returned the approved structured `EXPORT_FAILED /export/svg` path；the style test now uses reduced motion plus two animation frames, then passed isolated repeat 3/3 and final suite 13/13。
- Coverage first run reached the existing 5s timeout in one seeded property-sequence test；the same unmodified command reran 29 files、295/295 and produced the reported coverage。
- `pnpm test:package` cannot complete ATTW `npm pack` inside the sandbox；the same command passed after approved escalation。

## Build And Package

- publint: `All good!`。
- ATTW: no problems for node10、node16 CJS、node16 ESM、bundler and package.json paths。
- Runtime/type consumers: ESM、CJS and TypeScript declarations pass。
- Vite warning: playground G2 lazy chunk 1,035.97 kB / gzip 307.17 kB exceeds the 500 kB advisory threshold；no build failure。

## Not Run

- Firefox/WebKit、React 18.3/19.2 host matrix、CI、publish and full release candidate validation belong to T108。

## Acceptance Receipt

- Decision: `Accepted`
- Accepted by: User
- Accepted on: 2026-07-16
- Validation basis: 本文记录的测试数字和结果未因验收状态更新而改变。
- Downstream gate: T108 已解锁，可按已确认的 T101-T108 任务图开始执行。
