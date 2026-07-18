# T101 Evidence Summary

## Metadata

- Task: T101 - 建立 workspace 与质量工具链
- Attempt: T101-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-15
- Execution: Codex direct execution with independent read-only sub-agent review

## Scope Result

完成 pnpm workspace、单一 `@g2touch/editor` 产品包、薄 `@g2touch/playground`、严格 TypeScript、flat ESLint、Prettier、Vitest projects、Playwright config、tsup 双格式构建与 package consumer checks。未实现领域、图表、命令或交互行为。

## TDD Evidence

RED:

- 先创建 package public-entry smoke tests。
- 运行 `pnpm test:unit`，按计划以 `ERR_PNPM_NO_PKG_MANIFEST` 失败，证明 workspace/package contract 尚不存在。

GREEN:

- 创建 workspace 与 package/application configs。
- `pnpm test:unit` 通过 1 个 package public-entry test。
- editor 构建 `index.js`、`index.cjs`、`index.d.ts` 与 `index.d.cts`。
- playground production build 通过。
- publint、Are The Types Wrong、ESM import、CJS require 与 TypeScript consumer 全部通过。

## Engineering Decisions During Execution

- 使用 Vitest 4 `test.projects`，不采用已弃用的 `vitest.workspace.ts`。
- pnpm 11 使用 `allowBuilds`，仅批准 esbuild lifecycle script；新增未审核 build script 默认阻断。
- 移除 peer range 不支持 ESLint 10 的 `eslint-plugin-jsx-a11y`；可访问性由 component semantics 与 Playwright + axe 阻断。
- ESM import 和 CJS require 分别映射 `.d.ts` 与 `.d.cts`，避免 package 类型格式错配。
- runtime 依赖按首次使用任务加入；后续 task graph 已授权相应 manifest/lockfile ownership。

## Review

Spec compliance:

- 只有 T101 allowed files、governance artifacts 和 evidence files 发生变化。
- 仓库只有一个产品包和一个薄 playground。
- 没有领域或图表运行时实现。

Engineering quality:

- 独立只读评审提出的 Vitest、declaration、pnpm、peer dependency、CSS side effect、future dependency ownership 与 coverage threshold 问题均已处理。
- Fresh validation 无 blocking finding。

QA acceptance:

- frozen install、unit、typecheck、build 和 package consumer checks 全部通过。
- T101 不包含用户交互，未运行浏览器 E2E；真实 G2 E2E 从 T105 开始。

## Residual Risk

- React peer contract 包含 18.3 与 19；当前 T101 只有空 runtime entry。T108 已增加 React 18.3/19.2 安装、渲染与卸载 consumer matrix，公共组件实现后必须验证。
- tsup 8.5.1 declaration worker 触发 TypeScript 6 内部 `baseUrl` 弃用诊断；仓库自身不使用 `baseUrl`，暂以 `ignoreDeprecations: "6.0"` 兼容。替换 builder 时必须移除并 fresh build。

## Remote Actions

未执行 commit、push、PR、merge 或 publish。

## Acceptance

- 用户于 2026-07-15 明确接受 T101，并授权 T102-T104 由 Codex 独立 review 与验收。
