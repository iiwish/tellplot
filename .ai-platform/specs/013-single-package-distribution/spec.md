# G007 单包分发与公开发布 Spec

## Metadata

- Feature ID: `013-single-package-distribution`
- Goal ID: `G007`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-01
- Approval: 用户明确批准保留框架无关内部架构，并将 npm 分发收敛为一个无 scope 的 `tellplot` 包

## Objective

TellPlot 以一个可直接安装的公共 npm 包提供 imperative DOM、React 和 Vue 能力，同时保留已经验收的
core、editor、React adapter 与 Vue adapter 内部分层。公共分发与 G2/ECharts 一类库保持相同的单包心智，
内部 ownership、测试隔离和框架边界不因发布形态而退化。

## Requirements

### DIST-FR-001 单一公共包

npm 只发布无 scope 的 `tellplot`。`packages/core`、`packages/editor`、`packages/react` 和 `packages/vue`
均为 `private` workspace layer，不得独立进入 artifact、staging 或公开版本。

### DIST-FR-002 稳定子路径

公共入口固定为：

- `tellplot`：core 领域 API 与 `createEditor`。
- `tellplot/core`：显式 core-only 入口。
- `tellplot/react`：React 18/19 `ChartEditor`。
- `tellplot/vue`：Vue 3 `ChartEditor`。
- `tellplot/styles.css`：完整编辑器样式。

各 JavaScript 入口必须提供 ESM、CJS 与 TypeScript declarations。根入口不得在加载时要求 React 或 Vue。

### DIST-FR-003 依赖合同

`tellplot` 直接依赖精确审核的 `@antv/g2@5.4.8` 与 `@antv/g-svg@2.1.1`。React 和 Vue 是 optional peer
dependencies；imperative consumer 不安装框架也可通过 strict peer install、build、运行和卸载验证。

### DIST-FR-004 单包消费迁移

playground、文档、quickstart、framework matrix、package contract、artifact、preflight 和 GitHub workflow
全部消费或验证 `tellplot` 及其子路径。安装文档只要求 `pnpm add tellplot`。

### DIST-FR-005 单包发布控制

公开候选只包含一个 `tellplot-1.0.0.tgz`。工作流继续使用 exact annotated tag、protected environment、
stage-only Trusted Publisher、provenance、固定 SHA-256、人类复核与 2FA approval，不直接执行 `npm publish`。
既有四个 scoped bootstrap package 和未批准 stage 不得进入稳定发布结果。

## Non-Functional Requirements

- DIST-NFR-001：不改变 SourceData、ViewSpec、命令、图表行为、G2 ownership 或 schema。
- DIST-NFR-002：不把 React/Vue 打入根入口的运行时依赖图；框架 adapters 不拥有第二套状态或编辑器。
- DIST-NFR-003：package import、类型、strict peer、browser、a11y、performance、supply-chain 与 isolated-source
  rehearsal 继续作为阻断门禁。
- DIST-NFR-004：不保留未公开四包布局的兼容入口或迁移 shim。

## Success Criteria

- DIST-SC-001：registry-facing contract 只包含 `tellplot@1.0.0`。
- DIST-SC-002：根、core、React、Vue 和 CSS 子路径的 tarball consumer 验证全部通过。
- DIST-SC-003：无框架 consumer 不安装 React/Vue 仍可安装、构建和运行。
- DIST-SC-004：完整 release gate、artifact reproducibility 与 fresh-source rehearsal 通过。
- DIST-SC-005：旧 staged candidates 被拒绝；公开 npm、tag、GitHub Release 与 fresh install 状态可追溯。
- DIST-SC-006：无 unresolved Critical、High 或 Medium finding。

## Non-Goals

- 合并内部源码目录或削弱 architecture import boundary。
- 为旧 scoped package 提供兼容 re-export。
- 新图表、schema、配置、交互或视觉功能。
- 注册 npm organization 或把 `@tellplot` scope 作为公共安装前提。
