# TellPlot 交付状态报告

## Metadata

- Version: 0.3.0
- Status: Not_Released
- Last updated: 2026-07-18
- Branch: `main`

## Current State

瀑布图基础切片的实现、本地 release validation、final evidence 与独立复审已完成。T101-T108 与 T106-CR001 已全部验收，形成可发布候选。T109 已建立独立 TellPlot 私有仓库并通过本地、干净 clone 与 GitHub-hosted CI 验证，当前等待用户验收；npm publish 与正式版本发布不在本次迁移范围。

## Release Scope

首个 release scope 是已批准的瀑布图端到端基础切片 T101-T108。只有领域、投影、React/G2、交互、持久化、导出、可访问性、包质量和真实浏览器证据全部通过后，才形成 release candidate。

## Validation Evidence

- 仓库保留文件范围经过文件清单检查。
- 文档路径与 README 引用目标存在。
- `git diff --check` 无空白错误。
- AI Delivery Governor artifact validator 用于检查核心文档和任务字段。
- T101 package 通过 ESM/CJS import、format-matched declarations、publint 与 Are The Types Wrong 检查。
- T102 domain model/validator 通过 97 tests 与四项 95% coverage 门槛。
- T103 command/session/history 通过 140 tests、四项 95% aggregate coverage、独立 review、ESM/CJS/types/package 检查。
- T104 waterfall projection 通过 32 个目标测试、172 个全量测试、waterfall 四项 99%/100% coverage、独立 review、ESM/CJS/types/package 检查。
- T105 React/G2 工作台通过 22 个组件测试、194 个全量测试、Chromium 三视口 3/3、真实 Canvas 像素、构建、包消费与独立 engineering/test/visual review；无 Critical、High 或 Medium finding。
- T106 交互通过 70 个组件测试、242 个全量测试、21/21 real Chromium、5 个 axe 场景、200 项 30 样本 p95 30.0ms、同目标 root commit delta 0、构建与包消费；行正文拖拽取代 grip-only 命中，最终 review 无 Critical、High 或 Medium finding。
- T106-CR001 通过 292 个 unit/component tests、32/32 production Chromium、7/7 axe、200 项 p95 26.4ms、递归不变量、真实柱宽 X-only 排序、锁定锚点与包质量门禁；用户已验收。
- T107 通过 295 个 unit/component tests、90.30% statements coverage、13/13 selected Chromium、真实双密度 PNG、离屏 G2 SVG、递归 JSON round-trip、真实 SVG highlight/muted 样式、活动手势一致性门禁、axe、ESM/CJS/types package consumers 与独立复审；无未解决 Critical、High 或 Medium finding。
- T108 的 314/314 unit/coverage、current Playwright non-performance 108/108、isolated performance 1/1、previous compatibility 144/144、React 18.3/19.2 真实 tarball consumers（均绘制 88,744 pixels 并 clean unmount）、21/21 axe、200 项 30 样本 raw p95 77.20000004768372ms、package/build/static、canonical annotation/export/import/keyboard quickstart、四张原始截图、final evidence 与独立复审全部通过。
- T109 在 `@tellplot/editor` 身份下通过 321/321 tests、四项 coverage、package consumers、React 18/19、108 current-browser、144 previous-browser、21 axe、产品 profile p95 79.2ms、GitHub-hosted software-Canvas p95 292.4ms、Node 22/24 CI 和干净 clone 验证；旧远端 refs 与仓库状态保持不变。

## Known Limitations

- 当前 GitHub 计划不支持私有仓库的 branch protection/rulesets，API 返回 HTTP 403；仓库保持私有，`main` 暂时无法在服务端强制 required checks。
- Actions 使用 major tags 且 GitHub 提示这些版本仍以已弃用的 Node 20 为目标；完整 commit SHA pinning 与 action major 升级属于后续 supply-chain hardening。

## Release Decision

结论：独立 TellPlot release candidate 已具备并进入 T109 用户验收。npm publish、正式版本发布以及旧仓库处置必须获得单独授权。
