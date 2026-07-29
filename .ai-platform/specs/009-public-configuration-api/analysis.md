# G002-R3 一致性分析

## Metadata

- Feature ID: `009-public-configuration-api`
- Goal ID: `G002-R3`
- Version: 0.1.0
- Status: Completed
- Last updated: 2026-07-23

## Traceability

| Requirement | Workstream | Evidence |
| --- | --- | --- |
| CONFIG-FR-001、002、008 | T122-A001/A002 | public export、type consumer、component tests |
| CONFIG-FR-003、004、005 | T122-A001/A002 | validator、mapping、invalid-state tests |
| CONFIG-FR-006 | T122-A002 | controlled/uncontrolled and compatibility tests |
| CONFIG-FR-007 | T122-A003 | parser unit、live-code E2E、screenshots |
| CONFIG-FR-009 | T122-A003 | README、API、configuration、migration |
| CONFIG-NFR-001 至 006 | T122-A004 | dependency diff、full gates、review |

## Consistency Findings

1. `ChartConfig` 是现有 source/view 模型之上的 public facade，不创建第二套领域状态。
2. `ChartEditor` 可以只映射到内部组件；chart projection、G2 runtime 和 export 不需要修改。
3. `type` 与 `ViewSpec.chartType` 会同时存在，但 ownership 不冲突：config 表达宿主图表意图，view 持久化
   当前叙事状态；validator 必须要求二者一致。
4. playground 需要 config/view 两个公共文件视图，不能继续展示私有 wrapper。
5. 旧公共名称移除属于用户已明确批准的 beta 前 breaking change。

## Gate Result

`PASS`。没有 Critical/High artifact finding；T122 可以执行，G004 保持阻塞。
