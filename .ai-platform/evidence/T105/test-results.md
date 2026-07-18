# T105 Test Results

## RED

| Target | Exit | Expected signal |
| --- | ---: | --- |
| controller mode/callback tests before implementation | 1 | controller/component module 缺失 |
| state/lifecycle tests before public component | 1 | 7 tests 因 `FinancialChartEditor` 缺失失败 |
| Chromium rendering before workbench | 1 | 3 tests 因 ready root / chart stage 缺失失败 |
| package consumers before public export | 1 | runtime/type/CSS surface 与批准合同不一致 |

## GREEN And Fresh Validation

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm exec vitest run --project editor-components` | 0 | 3 files、22 tests passed |
| `pnpm test:unit` | 0 | 15 files、194 tests passed |
| `pnpm test:coverage` | 0 | 194 tests passed；全部 coverage thresholds 通过 |
| `pnpm typecheck` | 0 | editor 与 playground strict source typecheck 通过 |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm format:check` | 0 | 全部 matched files 通过 |
| `pnpm build` | 0 | editor ESM/CJS/CSS/d.ts/d.cts 与 playground production build 成功 |
| `pnpm test:package` | 0 | publint、ATTW、ESM/CJS、CSS 和 type consumers 通过 |
| `pnpm exec playwright test e2e/rendering.spec.ts --project=chromium` | 0 | 3/3 real Chromium tests passed |
| `git diff --check` / cached diff check | 0 | 无 whitespace error |
| final independent reviews | 0 | engineering、test、visual 均无 Critical/High/Medium finding |

## Coverage

| Boundary | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Aggregate | 95.83% | 92.16% | 93.03% | 95.74% |
| Domain | 97.87% | 95.26% | 100% | 97.82% |
| Waterfall | 99.04% | 100% | 100% | 99.03% |
| React controller | 93.82% | 86.07% | 100% | 93.67% |

## Real Browser Evidence

| Viewport | Canvas / layout signal | Painted pixels | Overflow |
| --- | --- | ---: | ---: |
| 1440x900 | outline + chart + inspector 同屏、pane bounds 不重叠 | 76,185 | x=0、y=0 |
| 1024x768 | chart 保持可见、inspector drawer 可达 | 55,071 | x=0、y=0 |
| 390x844 | canvas 370x716、outline/inspector sheets 均 390x844 | 23,087 | x=0、y=0 |

所有视口 console warning/error=0、pageerror=0。Mobile Canvas 金额标签按安全策略隐藏，保留的 x 轴标签无重叠，outline 与 text summary 继续提供金额和顺序。

## Component And Lifecycle Boundaries

- Controlled visible ViewSpec 等待 host prop echo；pending 期间命令仍从可见 prop session 执行。
- Uncontrolled default 只在首次使用；accepted command 立即提交，同 batch 连续命令保留完整 revision 链。
- `readOnly` write dispatch 返回 null 且不触发 host callbacks。
- Accepted callback 顺序、rejected-only callback、group selection deep copy 与四类 callback exception containment 均有直接测试。
- Invalid source/config 不创建 G2；G2 rejection 只显示固定 code/path。
- 同一 projection 的首次失败可在依赖变化后重试；只有当前 generation 成功才清除本地 issue 并通知宿主。
- Projection replacement 和 unmount destroy exactly once；stale replacement/unmount rejection 不产生日志或状态更新。
- Mobile media query listener、reduced-motion listener 和 Chart lifecycle 均有 cleanup path。

## Package Boundaries

- Runtime exports 精确匹配批准的 T105 surface。
- `FinancialChartEditorProps`、`FinancialChartEditorPanels` 和 `SelectionState` 可被独立 type consumer 使用。
- `./styles.css` subpath 存在、非空、标记 side effects 并保持 `.gt-editor` scope。
- G2、React、React DOM 保持 peer external；公共 Node ESM/CJS import 不触发 browser-only G2 load。

## Not Run

- Firefox/WebKit、axe、drag performance、export pixel parity 和 React 18/19 matrix：分别属于 T106-T108，不作为 T105 假证据。

## Validation Retry

一次 coverage 运行与 reviewer 验证并发时，既有 T103 seeded property test 超过 5 秒默认 timeout；结束并发后立即 fresh rerun，15 files / 194 tests 与 coverage thresholds 全部通过。该次 timeout 不计作行为通过证据，运行时敏感性保留到 T108 全量稳定性门禁复核。
