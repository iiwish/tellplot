# T108 Canonical Quickstart E2E 回执

## Metadata

- Date: 2026-07-17
- Runtime: Vite production preview；current Chromium、Firefox、WebKit
- Spec: `e2e/quickstart.spec.ts`
- Task status: Accepted
- User acceptance: Accepted explicitly on 2026-07-18

## Upstream Gate

用户在 2026-07-16 明确接受 T107。receipt 记录在
`.ai-platform/specs/001-waterfall-editor-foundation/packets/T107.yaml`，对应证据目录为
`.ai-platform/evidence/T107/`。T107 acceptance 只解锁本 walkthrough，不代表 T108 acceptance。

## Canonical Execution

`e2e/quickstart.spec.ts` 由 production-preview harness 在 current 三引擎 non-performance matrix 中各执行
一次。完整 `pnpm test:e2e` receipt 为 108/108，即 Chromium、Firefox、WebKit 各 36；performance
另由隔离的 `pnpm test:performance` 1/1 承担。

该 walkthrough 使用当前真实财务 fixture：期初 `3,200`，期末 `3,440`。排序限定在同一可编排分段；
start、经营利润分析小计与 end 是 locked anchors，不启动拖动 session。

## Walkthrough Receipt

| Step | Public workflow | Direct assertion |
| --- | --- | --- |
| Ready | 打开参考编辑器 production build。 | 三栏 workbench ready，真实 G2 Canvas 非空，期初/期末为 3,200/3,440。 |
| 图表排序 | 按柱宽边缘将“所得税影响”移到“汇率影响”之前，只按 x 轴判定。 | 图表与大纲顺序同步，期末保持 3,440。 |
| 撤销/重做 | 使用公共 toolbar undo/redo。 | 两次状态往返保持完整规范化顺序、金额和 revision 历史一致。 |
| 空白框选 | 在图表空白区域 marquee 连续选择三项成本并命名“成本压力”。 | 创建初始折叠组，3 项来源聚合为 `-950`，明细隐藏。 |
| 递归分组 | 展开内组并与相邻同级项创建“经营成本桥”。 | 层级、后代顺序、外组折叠值和内组 collapse 状态往返保持。 |
| Locked anchors | 尝试拖动 start、经营利润分析小计与 end。 | `ITEM_LOCKED`，interaction 保持 idle，revision/history/tree 不变。 |
| Annotation | 在 Inspector 保存 `成本口径已复核`。 | textarea 不 remount 且保持焦点；Canvas 出现 visible-node 摘要。 |
| SVG/PNG | 通过公共 export menu 导出。 | SVG 含标题、当前可见顺序、组标签和 annotation，且无 executable/source metadata；PNG 为最新 canonical projection 的非空图像。 |
| JSON save/restore | 导出 ViewSpec JSON、刷新页面、导入同一文件。 | 恢复当前顺序、递归组、collapse、annotation 与 revision，不改 SourceData。 |
| Keyboard parity | 对同一贡献项执行键盘 move，再用键盘触发 undo。 | chart、outline、keyboard 导出的规范化 ViewSpec bytes 一致；焦点与期末 3,440 保持。 |

## Export And Annotation Detail

- JSON 保存完整 annotation 原文与递归 ViewSpec，不包含 SourceData 金额 payload。
- screen、PNG 与 SVG 使用同一 G2 chart spec，只对当前 visible node 显示最多两行省略摘要。
- SVG/PNG 包含 chart title；SVG label policy 与 screen 一致。
- PNG 由最新 canonical projection/ViewSpec 的离屏 G2 render 生成，不读取可能 stale 的 live Canvas。
- export 在 live reorder preview 中返回结构化 `EXPORT_UNAVAILABLE /export`，不隐式下载、不发起网络请求。

## Responsive Receipt

| Viewport | Artifact | SHA-256 | Inspection |
| --- | --- | --- | --- |
| 1440x900 | `screenshots/desktop-final.png` | `36f5de5ad652fb8c8b3e636bb4f86e9c3cbbd72c9299419dd3f46e06406414cd` | 三栏同屏，真实图表与 toolbar 可达。 |
| 1024x768 | `screenshots/compact-final.png` | `18f891aa7a6b09aa7b6a450639bad21b4eb6817ca24512d98bf39242949e3f07` | drawer/scrim 覆盖 viewport 与宿主 filebar，无横向溢出。 |
| 390x844 | `screenshots/mobile-final.png` | `e0829d8d0b0199401265f91193460c032c010b2f56778e906dfcf19780a5df6c` | 金额标签保留且无重叠，32px 最小 mark target 可命中。 |
| 1440x900 | `screenshots/annotation-workflow.png` | `536ca734e892b57327a16443774591d477a5aa53268b76cbffb6629f7c7e2f5b` | 递归组、Inspector 原文与柱内 annotation 摘要同时可见。 |

DEF006 的视觉修复已经落地，以上为修复后的原始截图；independent visual/QA final re-review 的结论为
Critical 0、High 0、Medium 0、Low 0。

## Supporting Gates

- Unit/component: 30 files、314/314。
- Coverage aggregate: 90.53/84.36/93.55/90.61。
- Domain: 97.81/95.04/100/97.76；waterfall: 97.52/95.83/100/97.50。
- Accessibility: 三引擎 21/21，axe serious/critical 为 0。
- React consumers: 18.3.1 与 19.2.7 均 painted 88,744 pixels 并 clean unmount。
- Performance: 200 visible、30 samples、raw p95 77.20000004768372ms、same-target root commit
  delta 0；exact script console receipt p95 75.20000004768372ms，performance project zero retry。
- Previous compatibility: Playwright 1.60.0 三引擎 108/108，加 Playwright 1.52.0 WebKit
  18.4 为 36/36，总计 144/144。

## Handoff

该 quickstart 已提供 canonical flow 的直接动态证据；T108 的 final diff、artifact validator、全部独立
review 与用户验收已通过。任务为 `Accepted`；本回执不声明 `Released`，远程 CI 与发布动作仍需单独
授权。
