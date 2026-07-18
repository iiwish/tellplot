# T108 Evidence Summary

## Metadata

- Task: T108 - 完成集成、包质量与视觉验收
- Attempt: T108-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-18
- User acceptance: Accepted explicitly on 2026-07-18
- Remote actions: 未执行 commit、push、PR、merge、publish 或部署

## Upstream Acceptance Receipt

T107 已由用户在 2026-07-16 明确接受。canonical receipt 位于
`.ai-platform/specs/001-waterfall-editor-foundation/packets/T107.yaml` 的
`execution_receipt.user_acceptance` 与 `handoff.acceptance_receipt`，对应完整证据目录为
`.ai-platform/evidence/T107/`。该 receipt 只证明 T108 的上游门禁已解锁，不代表 T108 已被接受。

## Scope Result

T108 为已验收的瀑布图基础切片提供可复现 CI、真实公共包消费、React 18.3/19.2
隔离宿主、current/previous Playwright 浏览器矩阵、可访问性、200 项性能和三档响应式视觉证据。
验证设施消费 `@g2touch/editor` tarball、公共 CSS 与公共组件，不从临时 consumer 导入 `src`
内部实现。

T108 仅修复由回归或独立 review 复现的集成缺口。DEF001-DEF011 覆盖焦点恢复、canonical
quickstart、annotation 编辑与跨介质呈现、literal prior-major 浏览器证据、移动端命中与模态边界、
导出/受控状态一致性、真实 Canvas 性能测量、性能隔离和 dense-canvas 动画预算。SourceData、财务金额、
领域命令语义、公共 API 与运行时依赖边界保持不变。

## Requirement Evidence Map

| Requirement | Direct evidence |
| --- | --- |
| WF-SC-001 | `e2e/quickstart.spec.ts` 在 production preview 完成排序、递归分组、折叠、撤销/重做、JSON 保存/刷新恢复和 SVG/PNG 导出；current 三引擎矩阵各运行一次。 |
| WF-SC-002 | `packages/editor/tests/domain/property-sequences.test.ts`、`invariants.test.ts` 与 `immutability.test.ts` 直接检查来源不丢失/不重复、金额守恒、失败命令 session 不变；domain coverage 97.81/95.04/100/97.76。 |
| WF-SC-003 | `e2e/waterfall-editor.spec.ts` 的 chart/outline/keyboard parity 用三个入口导出规范化 ViewSpec bytes 并断言字节级一致。 |
| WF-SC-004 | `e2e/rendering.spec.ts` 与四张原始 PNG 直接检查 1440x900、1024x768、390x844 的真实非空 Canvas、主操作可达、无横向溢出；最终独立视觉复审无 Critical、High、Medium 或 Low finding。 |
| WF-SC-005 | `pnpm test:unit`、`test:coverage`、`build`、`test:package`、React matrix、current/previous E2E、axe、performance、截图、final patch/validator 与独立 reviews 构成完整公共包 release gate。 |
| WF-NFR-001 | 314/314 unit/component 通过；domain 为 97.81/95.04/100/97.76，waterfall 为 97.52/95.83/100/97.50，四项均超过 95%。 |
| WF-NFR-002 | `e2e/performance.spec.ts` 在 200 visible fixture 上测 30 次无 live-preview 的真实 Canvas 更新；raw nearest-rank p95 为 77.20000004768372ms，same-target root commit delta 为 0，performance project 禁止 retry。 |
| WF-NFR-003 | `pnpm test:a11y` 为 21/21；`e2e/accessibility.spec.ts` 覆盖键盘路径、焦点回归、摘要/live region、移动 sheet 与三引擎 axe serious/critical 为 0。 |
| WF-NFR-004 | `e2e/waterfall-editor.spec.ts` 验证普通 80/160ms transition 与 reduced-motion 关闭；dense-canvas 只在既有 >80 项阈值关闭 mark animation，普通图表保留 160ms。 |
| WF-NFR-005 | `pnpm build` 生成 ESM/CJS/CSS/declarations；`pnpm test:package` 的 publint、ATTW、ESM、CJS 和 types consumer 全部通过，React/ReactDOM/G2 保持 peer external。 |
| WF-NFR-006 | current PW1.61.1 runtime 为 Chromium 149.0.7827.55/r1228、Firefox 151.0/r1532、WebKit 26.5/r2311，共 108/108；previous PW1.60.0 为 Chromium 148.0.7778.96/r1223、Firefox 150.0.2/r1522、WebKit 26.4/r2287，PW1.52.0 为 WebKit 18.4/r2158，共 144/144；全部有实际 runtime probe。 |
| WF-NFR-007 | 两条 zero-match 静态 gate 证明 editor/playground 不含 `fetch`/XHR/WebSocket/EventSource/sendBeacon 或 AI provider 标识；package/quickstart/export tests 另验证 SVG 无 source metadata/外部资源，结构化错误不泄漏金额、标签或来源引用。 |

## TDD Trail

| Defect | RED | GREEN | REFACTOR |
| --- | --- | --- | --- |
| DEF001 | WebKit pointer opener 关闭后焦点落到 `body`。 | focused component 与 WebKit 回归证明 outline/inspector opener 恢复焦点。 | 聚焦逻辑收敛到 toolbar opener，不改 panel API。 |
| DEF002 | confirmed quickstart 使用退役 fixture、跨 subtotal move 和参考 UI 不可达 pin 操作。 | canonical 3,200 -> 3,440 fixture、同分段排序、递归分组和 locked-anchor 路径通过 production preview。 | walkthrough 只使用公共参考编辑器可达操作。 |
| DEF003 | Inspector 缺少 annotation textbox/save；missing-field component regression 稳定 RED。 | `setAnnotation` 复用既有 command schema，保存、受控回调与恢复通过。 | 编辑状态不再通过 remount 清空，输入控件保持焦点。 |
| DEF004 | Playwright 1.60 WebKit 26.4 与 current 26.5 同属 26 major，无法单独证明 prior major。 | 独立 Playwright 1.52.0 / WebKit 18.4 fixture 加入；previous 144/144。 | 两个 frozen fixture 分进程运行并 probe 真实版本，根 lockfile 不变。 |
| DEF005 | annotation 只存在 Inspector/JSON，screen、PNG、SVG focused tests 先 RED。 | 共享 G2 spec 在三种介质显示当前 visible-node 的两行摘要，JSON 保留完整原文。 | screen/PNG/SVG 共用 spec，不创建第二 renderer。 |
| DEF006 | 独立视觉 review 复现 mobile 金额缺失、窄柱命中不足 32px、轴对比度、drawer 模态边界和 summary annotation 五项 Medium；focused component/spec/Chromium tests RED。 | 修复已落地：移动金额反馈、renderer-owned bounds 扩展命中、可读轴色、viewport modal、annotation summary；final visual/QA review 无 finding。 | 命中仍由 G2 scene bounds 决定，锁定/read-only/marquee 语义不变。 |
| DEF007 | title/label export parity、stale PNG、annotation focus、stale selection、revision-only performance 和 preview process cleanup 均有 focused RED。 | 共享 title/label policy、canonical offscreen PNG、selection reconciliation、输入焦点保持、painted-canvas gate 与 POSIX process-group cleanup 通过。 | 导出消费最新 projection/ViewSpec；公共 API 与 controller command boundary 不变。 |
| DEF008 | drag release 可能在 canonical commit 前已由 live preview 绘成相同画面；full-canvas checksum 还会污染帧节奏。 | 改为 30 次交替键盘 reorder，按受影响柱区域检测真实像素，并只评估确认的 nearest-rank p95。 | 保留 pointer-feedback/zero-React-commit 独立探针，删除无效 revision/全画布代理。 |
| DEF009 | performance 与 36 个 Chromium 非性能场景同进程时复现 p95 397.5ms，而独立项目为 74.1ms。 | `test:e2e` 只运行三引擎非性能项目，CI 独立先运行 `test:performance`；两道 gate 均保留。 | 性能 fixture、30 samples 与 150ms 阈值均未降低。 |
| DEF010 | 精确隔离命令在 host load 下仍复现 p95 348.6ms；dense spec unit 先因 animation 仍启用而 RED。 | >80 项既有 dense-canvas 阈值关闭 mark animation；raw JSON p95 77.20000004768372ms。 | 普通图表继续使用 160ms animation，reduced-motion 和 200-item/30-sample/150ms 合约不变。 |
| DEF011 | CI 全局 `retries: 2` 会让 performance 首轮超标后重试；配置契约测试先收到 project `retries: undefined` 而 RED。 | `chromium-performance` 显式 `retries: 0`；focused test 与 exact performance 通过。 | 普通功能 E2E 保留 CI retry，性能门禁不允许假绿。 |

## Fresh Validation

| Gate | Canonical result |
| --- | --- |
| Static | frozen install、format、lint、strict typecheck 全部 exit 0 |
| Unit | 30 files、314/314 |
| Coverage aggregate | S 90.53%、B 84.36%、F 93.55%、L 90.61% |
| Domain / waterfall | 97.81/95.04/100/97.76；97.52/95.83/100/97.50 |
| Build/package | editor ESM/CJS/CSS/declarations、playground production build、publint、ATTW、ESM/CJS/types consumer 全绿 |
| React matrix | React 18.3.1 与 19.2.7 均 painted 88,744 pixels，均 clean unmount |
| Current non-performance E2E | 108/108：Chromium 36、Firefox 36、WebKit 36 |
| Isolated performance | 1/1；200 visible、30 samples、raw p95 77.20000004768372ms、commit delta 0；exact script console p95 75.20000004768372ms；zero retry |
| Previous browser matrix | 144/144：Playwright 1.60.0 三引擎各 36，Playwright 1.52.0 WebKit 18.4 为 36 |
| Accessibility | 21/21；三引擎 axe serious/critical 为 0 |
| Visual artifacts | 四张原始截图尺寸与 SHA-256 已固定；最终独立 visual/QA review 无 finding |

Canonical performance raw artifact 为 `performance-samples.json`，SHA-256
`c9aa759e653b7a096f3688487b12c2ce64096b366ff3f1a9b93ca6aba94b8f63`。

## Visual Evidence

| Viewport | Artifact | SHA-256 |
| --- | --- | --- |
| 1440x900 | `screenshots/desktop-final.png` | `36f5de5ad652fb8c8b3e636bb4f86e9c3cbbd72c9299419dd3f46e06406414cd` |
| 1024x768 | `screenshots/compact-final.png` | `18f891aa7a6b09aa7b6a450639bad21b4eb6817ca24512d98bf39242949e3f07` |
| 390x844 | `screenshots/mobile-final.png` | `e0829d8d0b0199401265f91193460c032c010b2f56778e906dfcf19780a5df6c` |
| 1440x900 annotation workflow | `screenshots/annotation-workflow.png` | `536ca734e892b57327a16443774591d477a5aa53268b76cbffb6629f7c7e2f5b` |

desktop/compact/mobile 原图显示非空真实 G2 Canvas、稳定 toolbar、无横向溢出；compact scrim 覆盖宿主
filebar，mobile 保留金额标签且无重叠，annotation workflow 同时显示递归组、Inspector 原文与柱内摘要。
DEF006 的五项 Medium 修复已落地；最终独立 visual/QA re-review 重新检查原图、真实命中测试与
accessible summary 回归，结论为 Critical 0、High 0、Medium 0、Low 0。

## Build And Package Receipt

- 当前 editor artifacts：ESM 240,726 bytes（gzip 47,506）、CJS 243,471 bytes（gzip
  47,482）、CSS 19,936 bytes（gzip 3,916）、每份 declarations 12,555 bytes。
- 当前 playground G2 lazy chunk：1,035,977 bytes（gzip 302,900），仍有 Vite 500kB advisory；
  `@g2touch/editor` 将 G2 保持为 peer external。
- publint：`All good!`；ATTW：`No problems found`；ESM import、CJS require、TypeScript
  declarations 与 `./styles.css` export consumer 全部通过。

## Changed-Files Inventory

- CI/config：`.github/workflows/ci.yml`、`package.json`、`playwright.config.ts`、
  `vitest.config.ts`。
- Release E2E：`e2e/accessibility.spec.ts`、`e2e/export.spec.ts`、
  `e2e/interaction-cancel.spec.ts`、`e2e/performance.spec.ts`、`e2e/quickstart.spec.ts`、
  `e2e/rendering.spec.ts`、`e2e/waterfall-editor.spec.ts`。
- React matrix：`packages/editor/tests/react-matrix/run-react-matrix.mjs`、
  `consumer/index.html`、`consumer/src/host.css`、`consumer/src/main.mjs`。
- Browser matrix：`packages/editor/tests/browser-matrix/run-previous-browsers.mjs`、
  `fixture/package.json`、`fixture/pnpm-lock.yaml`、`webkit-previous-major-fixture/package.json`、
  `webkit-previous-major-fixture/pnpm-lock.yaml`。
- Focused regressions：`packages/editor/tests/components/accessibility.test.tsx`、
  `callbacks.test.tsx`、`chartPointer.test.ts`、`group-actions.test.tsx`、`states.test.tsx`、
  `packages/editor/tests/export/chart-spec.test.ts`、`svg.test.ts`、
  `packages/editor/tests/package/playwright-config.test.ts`。
- Reproduced integration fixes：`packages/editor/src/components/AccessibleChartSummary.tsx`、
  `EditorToolbar.tsx`、`FinancialChartEditor.tsx`、`InspectorPanel.tsx`、`WaterfallCanvas.tsx`、
  `editorMessages.ts`、`packages/editor/src/interactions/chartPointer.ts`、
  `packages/editor/src/react/useEditorController.ts`、`packages/editor/src/export/pngExport.ts`、
  `svgExport.ts`、`waterfallChartSpec.ts`、`packages/editor/src/styles/editor.css`。
- Governance：`.ai-platform/specs/001-waterfall-editor-foundation/packets/T108.yaml`、`tasks.md`、
  `analysis.md`、`quickstart.md`、`.ai-platform/docs/tasks.md`、`release-report.md`。
- Evidence：`.ai-platform/evidence/T108/summary.md`、`test-results.md`、
  `quickstart-receipt.md`、`performance-samples.json`、`diff.patch` 与四张 `screenshots/*.png`。

仓库是包含 T101-T107 已验收 reset 工作的累计 dirty worktree。Changed-files inventory 包含交付时生成的
text/raw/binary evidence；`diff.patch` payload 只覆盖上述 code/config/tests/governance 文件，排除
`.ai-platform/evidence/T108/**`（包括自身、raw JSON 与 binary screenshots），避免递归和二进制噪声。共享
文件的 unstaged diff 可能包含同一 reset worktree 中已验收任务的累计上下文；证据通过 DEF001-DEF011、
patch headers 与此 manifest 明确 T108 ownership，不把全仓库 status 冒充 task-local 闭环。

当前 patch 共 46 个 headers，`6,558 insertions / 401 deletions`，364,639 bytes，SHA-256
`d3cd99ceee1669bb2d08e8102f34cd2bc7428a218c12391ffde9450e295859be`；
`git apply --check --cached .ai-platform/evidence/T108/diff.patch` 对当前 index baseline exit 0。

## Review And Acceptance Gate

- Browser/CI、final engineering 与 final visual/QA review 已通过；DEF006/DEF007/DEF011 修复已经落地。
- Independent spec/evidence final review 已通过；旧的 Medium wording 只记录已修复 finding 的来源，不代表
  当前存在未关闭 finding。
- Final `diff.patch`、index-baseline apply check、`git diff --check` 与 artifact validator 全部通过。
- 用户于 2026-07-18 明确接受 T108；本 evidence 记录该回执，但不代表已执行 release 或 publish。

## Residual Risk

- GitHub-hosted Ubuntu workflow 尚未在远端实际执行；Actions 使用 major tags，而非完整 commit SHA。
- React 临时 consumer 精确固定直接 peer，但不提交 transitive lockfile，承担上游兼容探测职责。
- dense animation regression 覆盖普通 fixture 与 202 项 fixture，但没有单独锁定 80/81 的精确边界。
- current 三引擎在最终快照执行了手动 runtime probe；该 probe 尚未像 previous runner 一样固化进 CI。
- 静态截图不能替代 hover、focus、动画与 WCAG 动态验证；这些由 Playwright/axe/reduced-motion
  gates 承担。
- playground G2 lazy chunk 大于 Vite advisory；editor package 本身仍保持 peer external。

## Handoff

T108 为 `Accepted`。本地 validation、final diff/validator、全部独立 review 与用户验收均已通过；release、
publish、push、PR、merge 与部署仍需单独授权，本 evidence 不声明 `Released`。
