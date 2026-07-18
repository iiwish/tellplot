# T108 Test Results

## Status

- Task status: Accepted
- User acceptance: Accepted explicitly on 2026-07-18
- Evidence date: 2026-07-18
- Closure boundary: 本地 final diff、artifact validator、独立 final reviews 与用户验收均已关闭

## RED / GREEN / REFACTOR Receipt

| Scope | RED signal | GREEN receipt | Refactor boundary |
| --- | --- | --- | --- |
| DEF001 focus | WebKit panel close 后焦点回到 `body`。 | focused component 与 WebKit focus tests 通过。 | 只修 toolbar opener focus。 |
| DEF002 quickstart | 退役 fixture 与 UI 不可达操作使 walkthrough 不可信。 | production-preview canonical flow 使用 3,200 -> 3,440 fixture 通过。 | 只保留公共 UI 操作。 |
| DEF003 annotation editor | annotation textbox/save 缺失，component regression RED。 | Inspector 保存、controlled callback、JSON restore 通过。 | 复用 `setAnnotation`，保存不 remount textarea。 |
| DEF004 browser major | PW 1.60 WebKit 26.4 不是相对 26.5 的 prior major。 | PW 1.52 / WebKit 18.4 加入，previous 144/144。 | 两个 frozen fixture 隔离运行。 |
| DEF005 annotation parity | screen/PNG/SVG 均缺少 annotation。 | shared G2 spec 在三种介质显示 visible annotation，JSON 保留完整文本。 | 无第二 renderer。 |
| DEF006 visual acceptance | mobile label、32px hit、axis contrast、modal boundary、summary annotation 五项 focused RED。 | fixes landed，新 component/spec/browser tests 与四张截图通过；final visual/QA re-review 无 finding。 | scene bounds 与 financial semantics 不变。 |
| DEF007 export/state/gates | title/label divergence、stale PNG、focus remount、stale selection、revision-only timing、preview child leak 复现。 | shared spec/offscreen PNG、selection reconciliation、focus retention、painted-canvas timing、process-group cleanup 通过。 | 保持公共 API 与 command boundary。 |
| DEF008 measurement | drag release 可在 commit 前由 preview 绘成相同像素；full-canvas hash 扰动测量。 | 30 次 keyboard reorder + affected-bar pixel signature，nearest-rank p95 gate。 | pointer feedback delta 独立测量。 |
| DEF009 isolation | combined Chromium workload p95 397.5ms，dedicated process 74.1ms。 | CI/script 分离 nonperf E2E 与 performance，二者都执行。 | fixture、threshold、samples 不变。 |
| DEF010 dense motion | exact isolated run p95 348.6ms；dense spec animation test RED。 | >80 项关闭 mark animation；canonical raw p95 77.20000004768372ms。 | 普通图表保留 160ms，200/30/150ms 合约不变。 |
| DEF011 performance retry | CI 全局 `retries: 2` 会让 performance 首轮超标后重试，配置契约测试先收到 `undefined` 而 RED。 | `chromium-performance` 显式 `retries: 0`；focused config test 与 exact isolated performance 均通过。 | 普通功能 E2E 保留 CI retry，性能 gate 不允许用 retry 掩盖失败。 |

## Canonical Green Matrix

| Command / gate | Exit | Result |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | lockfile up to date；pnpm 11.1.3 |
| `pnpm format:check` | 0 | all matched files pass |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm typecheck` | 0 | editor + playground strict typecheck pass |
| `pnpm test:unit` | 0 | 30 files、314/314 |
| `pnpm test:coverage` | 0 | 30 files、314/314；all configured thresholds pass |
| `pnpm build` | 0 | editor ESM/CJS/CSS/DTS + playground production build |
| `pnpm test:package` | 0 | publint、ATTW、ESM、CJS、types、CSS export pass |
| `pnpm test:react-matrix` | 0 | React 18.3.1 与 19.2.7 均从真实 tarball render/unmount，painted 88,744 pixels |
| `pnpm test:e2e` | 0 | non-performance 108/108：Chromium/Firefox/WebKit 各 36 |
| `pnpm test:performance` | 0 | isolated 1/1；console nearest-rank p95 75.20000004768372ms；zero retry |
| JSON reporter isolated performance | 0 | 30 raw samples；p95 77.20000004768372ms；same-target root commit delta 0 |
| Node 22.20 previous-browser runner | 0 | 144/144；四个实际 runtime version probes，无 retry |
| `pnpm test:a11y` | 0 | 21/21；三引擎 serious/critical axe violation 为 0 |
| Network primitive zero-match gate | 0 | editor/playground 无 fetch、XHR、WebSocket、EventSource 或 sendBeacon |
| AI provider zero-match gate | 0 | package manifests、editor 与 playground 无 provider 标识 |

`test:e2e` 与 `test:performance` 是两个独立 release gates。108 个 current non-performance tests 不包含
performance project；isolated performance 的 1 个 test 另行执行，不能把 108 写成遗漏性能，也不能把二者
合并到一个受前序场景负载污染的进程。

## Coverage

| Boundary | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Aggregate | 90.53% | 84.36% | 93.55% | 90.61% |
| Domain | 97.81% | 95.04% | 100% | 97.76% |
| Waterfall | 97.52% | 95.83% | 100% | 97.50% |

WF-NFR-001 要求的 domain 与 waterfall statement/branch/function 均达到 95% 以上；line coverage 也达到
同一水平。314 个测试在 unit 与 coverage 两条 canonical commands 中均通过。

## Current Browser Matrix

| Project | Runtime | Tests | Result |
| --- | --- | ---: | --- |
| Chromium | Playwright 1.61.1；149.0.7827.55；revision 1228 | 36 | passed |
| Firefox | Playwright 1.61.1；151.0；revision 1532 | 36 | passed |
| WebKit | Playwright 1.61.1；26.5；revision 2311 | 36 | passed |
| Non-performance total | current three-engine matrix | 108 | passed |
| Chromium performance | isolated production-preview process | 1 | passed |

矩阵覆盖 ready/rendering、recursive grouping、chart/outline/keyboard byte parity、marquee、locked anchor、
Escape/blur/pointercancel、JSON/SVG/PNG、annotation、reduced motion、focus 与 mobile sheets。

当前引擎通过 root `@playwright/test` 直接 launch 并读取 `browser.version()`：Chromium
149.0.7827.55、Firefox 151.0、WebKit 26.5，exit 0；revision 来自同一精确安装的 Playwright 1.61.1
`browsers.json`。

## Previous Browser Compatibility

| Fixture | Engine | Browser evidence | Tests | Result |
| --- | --- | --- | ---: | --- |
| Playwright 1.60.0 | Chromium | 148.0.7778.96；revision 1223 | 36 | passed |
| Playwright 1.60.0 | Firefox | 150.0.2；revision 1522 | 36 | passed |
| Playwright 1.60.0 | WebKit | 26.4；revision 2287 | 36 | passed |
| Playwright 1.52.0 | WebKit | 18.4；revision 2158 | 36 | passed |
| Total | release train + literal prior major | four probes | 144 | passed without retry |

runner 在 Node 22.20.0 下从两个精确 frozen fixtures 建立临时 host，递归复制完整 non-performance
E2E tree，并在各自 Playwright 子进程中启动浏览器和读取 `browser.version()`。fixture 不进入 workspace，
不修改 root lockfile。最终命令为
`mise exec node@22.20.0 -- pnpm test:browser-previous`，108/108 + 36/36，exit 0。

## React Consumer Matrix

| Host | Exact installed peers | Painted pixels | Runtime result |
| --- | --- | ---: | --- |
| React 18 | React 18.3.1、ReactDOM 18.3.1、G2 5.4.8 | 88,744 | ready、CSS probes、clean public unmount |
| React 19 | React 19.2.7、ReactDOM 19.2.7、G2 5.4.8 | 88,744 | ready、CSS probes、clean public unmount |

每个临时 host 安装真实 `pnpm pack` tarball，以 strict peer dependencies 生产构建并通过公共入口挂载；runner
终止完整 preview process group，未残留子进程。

## Performance

- Fixture: 200 visible contributions。
- Samples: 30。
- Formula: `sorted[ceil(.95*n)-1]`。
- Canonical raw JSON p95: `77.20000004768372ms`，低于 150ms gate。
- Exact `pnpm test:performance` console receipt: `p95 75.20000004768372ms`，1/1 passed。
- Same-target root commit delta: `0`。
- Visible update signal: renderer Canvas 中受影响柱区域的 pixel signature，不是 revision attribute。
- Raw artifact: `performance-samples.json`，SHA-256
  `c9aa759e653b7a096f3688487b12c2ce64096b366ff3f1a9b93ca6aba94b8f63`。

raw JSON 与 console receipt 来自两次独立 GREEN 执行，因 scheduler 和采样抖动数值可以不同；canonical
样本数组及 nearest-rank 计算以 `performance-samples.json` 的 77.20000004768372ms 为准。

## Accessibility

`pnpm test:a11y` 在 Chromium、Firefox、WebKit 各运行 7 个场景，总计 21/21。直接覆盖 ready tree、
keyboard menu/focus return、drag status、recursive disclosure、privacy-safe rejection/import error 与 mobile
sheet；axe serious/critical violation 为 0。

## Privacy And Network Boundary

- `! rg -n "\\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\\b" packages/editor/src apps/playground/src`：无匹配，exit 0。
- `! rg -ni "\\b(openai|anthropic|gemini|bedrock|cohere|mistral)\\b" package.json packages/editor/package.json packages/editor/src apps/playground/src`：无匹配，exit 0。
- `e2e/accessibility.spec.ts` 与 `e2e/export.spec.ts` 直接覆盖 privacy-safe error、SVG executable/external resource/source metadata rejection；SVG namespace literal 不属于网络请求。

## Visual Evidence

| Viewport | Artifact | SHA-256 |
| --- | --- | --- |
| 1440x900 | `screenshots/desktop-final.png` | `36f5de5ad652fb8c8b3e636bb4f86e9c3cbbd72c9299419dd3f46e06406414cd` |
| 1024x768 | `screenshots/compact-final.png` | `18f891aa7a6b09aa7b6a450639bad21b4eb6817ca24512d98bf39242949e3f07` |
| 390x844 | `screenshots/mobile-final.png` | `e0829d8d0b0199401265f91193460c032c010b2f56778e906dfcf19780a5df6c` |
| 1440x900 annotation workflow | `screenshots/annotation-workflow.png` | `536ca734e892b57327a16443774591d477a5aa53268b76cbffb6629f7c7e2f5b` |

DEF006 的五项 Medium 修复已经落地并生成以上新原图。independent visual/QA final re-review 的结论为
Critical 0、High 0、Medium 0、Low 0；32px 命中和 screen-reader summary 的动态证据由真实浏览器与组件测试
提供。

## Build And Package

| Artifact | Bytes | gzip bytes |
| --- | ---: | ---: |
| `packages/editor/dist/index.js` | 240,726 | 47,506 |
| `packages/editor/dist/index.cjs` | 243,471 | 47,482 |
| `packages/editor/dist/styles.css` | 19,936 | 3,916 |
| `packages/editor/dist/index.d.ts` | 12,555 | - |
| `packages/editor/dist/index.d.cts` | 12,555 | - |
| playground G2 lazy chunk | 1,035,977 | 302,900 |

- publint: `All good!`。
- ATTW: `No problems found`。
- ESM import、CJS require、TypeScript declarations、package exports 与 CSS consumer 通过。
- React、ReactDOM、G2 未被打入 editor package；playground lazy chunk 的 Vite 500kB warning 是已知 Low
  residual，不改变 build exit code。

Final engineering review 的 Low residual 为：dense motion test 未单独锁定 80/81 边界；current runtime
version probe 尚未固化进 CI；GitHub Actions 使用 major tags 而非 commit SHA。三项均不弱化当前已执行的
产品、性能或浏览器门禁。

## Final Closure Receipt

- `diff.patch` 已生成：46 files，6,558 insertions / 401 deletions，364,639 bytes，SHA-256
  `d3cd99ceee1669bb2d08e8102f34cd2bc7428a218c12391ffde9450e295859be`；index-baseline apply check exit 0。
- final `git diff --check` 与 T108 artifact validator exit 0。
- independent browser/CI、engineering、visual/QA 与 spec/evidence final reviews 均通过，无未解决 Critical、
  High 或 Medium finding。
- T108 为 `Accepted`；本文件不声明 `Released`，远程 CI 与发布动作仍需单独授权。
