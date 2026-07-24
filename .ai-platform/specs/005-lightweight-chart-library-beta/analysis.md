# G002 Cross-Artifact Analysis

## Metadata

- Version: 0.4.0
- Status: Completed
- Feature ID: `005-lightweight-chart-library-beta`
- Goal ID: `G002`
- Last updated: 2026-07-23

## Result

- Critical: 0
- High: 0
- Medium: 0

## Consistency

- 产品 SSOT、章程、TDR-015 和路线图均将 TellPlot 定义为基于 G2 的轻量基础图表库。
- G002 只产品化已验收的 waterfall、bar 和 column，不扩展图表范围。
- runtime export 列表与 `src/index.ts`、ESM/CJS consumers 和现有 public API test 一致。
- `0.1.0-beta.1` 只更新发布包版本；私有 workspace/app 版本不进入 package contract。
- command source 的 `ai` literal 没有 production consumer，删除后由 parser rejection 与 host command tests 锁定；
  该变化符合用户明确确认的产品边界，并在首次 beta 前完成。
- package tarball、React matrix 和 browser gates 已存在，G002 只补全 README/LICENSE/allowlist 与目标级证据。
- playground 使用面板只引用 package import、`ChartEditor` 和 `ChartConfig`，不新增
  runtime export、schema、dependency 或 G2 公共出口。
- `panels` 已提供 outline、inspector 和 toolbar 的独立显隐合同；新增 `layout` 只负责可选位置与呈现模式，
  默认值保持当前 split layout，因此不是 breaking change。
- 演示页通过公共 `layout` 消费右侧标签栏，不导入 `OutlinePanel`/`InspectorPanel` 或依赖内部 CSS 排序。
- 双向编辑器分别展示 package 已导出的 `ChartConfig` 和 `ViewSpec`，不创建私有公共文档 schema。
- 左到右使用结构化 JSON 解析和现有公共 validators，非法草稿不提交；右到左消费既有
  `onViewChange`，因此直接操作、大纲、键盘和宿主命令继续共享同一确定性命令结果。
- 不采用 Monaco/CodeMirror、远程编译或任意 JS 执行，避免为演示能力增加依赖、安全面和第二运行时。

## Constitution Check

- P-004：只完善轻量图表包，不增加平台能力。
- P-006：G2 ownership 不变。
- P-009：不创建新的 runtime abstraction。
- P-010：完整 release-candidate evidence 保留。
- P-003/P-005：原始 source 与可编辑 view 保持显式分离，右侧图形动作不反向改写金额。

## Execution Readiness

用户已明确批准 G002。目标、范围、allowed files、TDD、validation、evidence 和 stop conditions 完整，
可以连续执行内部任务并在目标完成后停在 `Needs_Review`。
