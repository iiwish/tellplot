# TellPlot 安全图表配置任务

## T110

- Status: Accepted
- Priority: P0
- Dependencies: T108 Accepted；TellPlot 独立仓库已建立
- Blocks: 分类图验证切片与稳定公共配置文档
- Story / Requirement: FR-013、CD-006、TDR-012
- Parallel: false
- Conflicts with: 新图表类型、ViewSpec schema 修改、原始 G2Spec 透传、旧仓库操作
- Goal: 建立长期文档入口和有限、可测试、屏幕/导出一致的 `FinancialChartAppearance` 公共配置。
- Allowed files: `docs/**`、`README.md`、`AGENTS.md`、`.ai-platform/**`、`packages/editor/src/config/**`、`packages/editor/src/components/**`、`packages/editor/src/export/**`、`packages/editor/src/react/**`、`packages/editor/src/index.ts`、`packages/editor/tests/**`、`e2e/**`
- Test targets: 配置解析、G2 spec、组件 rerender、导出一致性、公共类型、package、E2E、a11y、performance
- Deliverables: 长期文档、配置类型与解析器、公共 prop、屏幕/导出映射、T110 evidence
- Acceptance criteria: 默认行为不变；安全配置可控制批准字段；无原始 G2Spec 逃生口；全量质量门禁通过。
- Definition of Done: RED/GREEN 证据、全量验证、spec/code/QA review、evidence 和用户验收全部完成。
- Validation commands: `pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:e2e`；`pnpm test:a11y`；`pnpm test:performance`；artifact validator；`git diff --check`
- TDD plan: 先锁定公共类型、无效输入回退、G2 映射和 screen/export parity 的失败测试，再实现最小配置层。
- Packet path: `packets/T110.yaml`
- Evidence required: RED 结果、测试结果、公共 API diff、G2 边界 review、残余风险和最终 diff。
