# 001 技术研究记录

## Metadata

- Version: 0.1.0
- Status: Confirmed
- Registry checked: npmjs registry on 2026-07-15
- Local runtime: Node 24.15.0、pnpm 11.1.3

## Compatibility Baseline

开发环境最低版本选择 Node 22.13.0。Vite 8 需要 Node 20.19+ 或 22.12+，ESLint 10 需要 Node 20.19、22.13 或 24+，因此 22.13 是共同安全下界。CI 使用 Node 22 和 Node 24 两档，日常锁定 pnpm 11。

pnpm 11 的项目 settings 写入 `pnpm-workspace.yaml`；旧的 `onlyBuiltDependencies` 已由 `allowBuilds` 取代。当前仅允许 esbuild 执行依赖 build script，其他新增 lifecycle script 默认阻断安装。

## Selected Packages

| Package | Version checked | License | Role | Boundary |
| --- | ---: | --- | --- | --- |
| `@antv/g2` | 5.4.8 | MIT | chart render/event/animation | peer dependency |
| `react` / `react-dom` | 19.2.7 | MIT | component runtime | peer dependency |
| `@dnd-kit/core` | 6.3.1 | MIT | outline sensors/collision | editor dependency |
| `@dnd-kit/sortable` | 10.0.0 | MIT | outline sortable strategy | editor dependency |
| `lucide-react` | 1.24.0 | ISC | UI icons | editor dependency |
| `motion` | 12.42.2 | MIT | not selected for Phase 1A | no install |
| `typescript` | 6.0.3 | Apache-2.0 | compile/types | dev dependency |
| `vite` | 8.1.4 | MIT | playground build/dev | dev dependency |
| `tsup` | 8.5.1 | MIT | editor ESM/CJS/dts build | dev dependency |
| `vitest` | 4.1.10 | MIT | unit/component tests | dev dependency |
| `@playwright/test` | 1.61.1 | Apache-2.0 | browser tests | dev dependency |
| `@axe-core/playwright` | 4.12.1 | MPL-2.0 | accessibility checks | dev dependency |
| `eslint` | 10.7.0 | MIT | static analysis | dev dependency |
| `typescript-eslint` | 8.64.0 | MIT | TS ESLint integration | dev dependency |
| `prettier` | 3.9.5 | MIT | formatting | dev dependency |
| `publint` | 0.3.21 | MIT | package contract check | dev dependency |
| `@arethetypeswrong/cli` | 0.18.5 | MIT | package type-resolution check | dev dependency |

`eslint-plugin-jsx-a11y@6.10.2` 的 peer range 不支持 ESLint 10，因此不安装。静态 JSX 规则不能替代真实语义测试；本项目使用组件可访问性测试与 Playwright + axe 作为阻断门槛。

## TypeScript Selection

Registry latest TypeScript is 7.0.2, but `typescript-eslint@8.64.0` declares TypeScript `<6.1.0`。因此选择 TypeScript 6.0.3，而不是为了版本号使用未经当前 lint toolchain 支持的 TypeScript 7。

tsup 8.5.1 的 declaration worker 仍触发 TypeScript 6 对内部 `baseUrl` 的弃用诊断。仓库自身不使用 `baseUrl`，但在共享 compiler options 中设置 `ignoreDeprecations: "6.0"` 以允许当前 tsup declaration pipeline 工作；升级或替换 package builder 时必须删除该兼容项并验证 clean build。

Vitest 4 使用 root `vitest.config.ts` 的 `test.projects`。独立 `vitest.workspace.ts` 在 Vitest 3.2 起已弃用，不进入新脚手架。

## Animation Decision

G2 已负责图形 enter/update/exit 和数据更新过渡。拖拽本体需要 pointer-following，而不是插值。结构大纲的简单位移由 dnd-kit transform 和 CSS transition 完成。Motion 的布局连续性能力有价值，但当前没有一个必须由它解决的已实现 DOM 问题，因此不安装。

Revisit trigger:

- 出现跨容器 layout continuity，CSS 需要维护复杂测量状态。
- drawer、diff preview 或多级 outline 动画存在真实卡顿或中断缺陷。
- 引入后可删除更多自研动画代码，并通过 reduced-motion 和 bundle 检查。

## Drag Dependency Decision

图表 drag 和 outline drag 分开：

- G2 chart drag 依赖图形 datum、坐标比例尺和财务锁定规则，使用 Pointer Events + G2 adapter。
- DOM outline drag 使用 dnd-kit stable core/sortable，获得 pointer、keyboard sensor、collision 和 overlay 基础能力。
- `@dnd-kit/react@0.5.0` 尚处于 0.x，不用于本切片。

## Package Boundary Decision

不提前拆分 `@tellplot/core`。只有瀑布图和分类图都证明命令与 projection 边界稳定后，才考虑把纯领域能力作为单独包发布。当前 `packages/editor/src/domain` 通过禁止 React/G2 import 的 lint rule 保持逻辑边界。

公共包同时提供 ESM 与 CJS runtime。package exports 为 import 映射 ESM `.d.ts`，为 require 映射 CJS `.d.cts`，并使用 packed artifact 的 Are The Types Wrong 检查阻断 declaration/module format 错配。

依赖按首次使用任务加入，避免脚手架携带未使用 runtime。T105 可更新 manifests/lockfile 以加入 React 测试与 icon 依赖，T106 可加入 dnd-kit 与 axe，T107 可加入导出验证所需依赖；各任务仍需重新检查版本、license、peer range 和 build scripts。

## Risks

- G2 SVG export path 需要真实浏览器原型确认；失败时使用同 projection 离屏 SVG chart，而不是手写第二套 SVG renderer。
- G2 scene graph/event datum 在版本升级时可能变化；所有访问封装在单 adapter 并有浏览器合同测试。
- dnd-kit 多级 tree sorting 需要自定义 projection；本切片只支持已定义的 group 层级，不建设任意深度 tree editor。
- React controlled mode 在高频宿主更新下可能产生 revision conflict；命令携带 base revision，并通过 rejection callback 暴露。
