# G003 精确 Public Contract Checklist

## Metadata

- Version: 0.1.0
- Status: Completed
- Sources: `../data-model.md`、`../contracts/public-api.md`、`../contracts/validation.md`、
  `../contracts/editor-api.md`、`../contracts/migration.md`
- Last updated: 2026-08-12
- Scope: `tellplot@2.0.0` / schema `3.0.0` 的精确 public type、wire、validation、host、renderer、
  accessibility、update 与 migration contract

## Public API And Compatibility

- [x] 是否固定 16 个新增 named type exports 与唯一新增 runtime export？[API]
- [x] 是否保持 v1/v2 concrete source/view/config/appearance/projection contracts 精确不变？[Compatibility]
- [x] 是否完整列出 public union expansion 引发的 TypeScript source breaks？[Migration]
- [x] 是否保持 package export map、DOM/React/Vue 字段和 command union 不变？[Boundary]
- [x] 是否禁止 migration helper、G2 spec、scene receipt、palette resolver 和 runtime handle 外泄？[Boundary]

## Schema And Validation

- [x] 是否固定 v3 source/view closed fields、2 至 4 series 与 ordered dense matrix？[Data]
- [x] 是否固定 series/category namespace、label normalization、finite/safe amount 与 metadata rules？[Validation]
- [x] 是否固定 9 个新增 reason、English message、JSON Pointer path、safe details 与 precedence？[Errors]
- [x] 是否规定 source/view/projector generation 四格 pairing 与 atomic failure？[Compatibility]
- [x] 是否闭合 v3 `0`/`-0` 的 validation identity、projection、formatting 与 fingerprint 等价语义？[State]

## Rendering And Editing

- [x] 是否固定 G2 series/dodge/color/key/domain/padding/reverse/legend/Tooltip 映射？[Rendering]
- [x] 是否规定 live series registry structural update 使用 fresh legend component/view identity？[Rendering]
- [x] 是否按 exact hit、axis drop、2D ghost、per-mark marquee 与 all-zero band 区分 geometry？[Interaction]
- [x] 是否定义 authoritative scene receipt、invalidation 和 direct-manipulation fallback？[Correctness]
- [x] 是否把 TDR-017 comparison label/group-region amendment 设为实现前置条件？[Architecture]

## Host, Accessibility And Migration

- [x] 是否覆盖 controlled/uncontrolled/defaultView/mode transition 与完整 presentation update matrix？[Host]
- [x] 是否固定 category/collapsed/expanded/multi-selection Inspector semantics？[UX]
- [x] 是否固定 empty-source series registry、narrative DFS summary、lock/state 文本与 focus fallback？[A11y]
- [x] 是否按 screen/export、projected values 与 narrative state 分开定义 parity？[Testability]
- [x] 是否提供 strict-TypeScript 可执行的 v2 narrowing、v3 construction 与 preserve-narrative guide？[Migration]
- [x] 是否保持 npm publish、tag、push、PR、release 和 production promotion 在独立闸门之外？[Release]

## Findings Summary

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

## Review Evidence

- public API/schema/migration 独立复核：Critical 0 / High 0 / Medium 0；strict TypeScript 代表性声明
  fixture 通过。
- G2 5.4.8/editor 可实施性独立复核：Critical 0 / High 0 / Medium 0；series/legend/Tooltip、scene
  receipt、all-zero geometry、export 和 update 合同闭合。
- UX/a11y/host 独立复核：Critical 0 / High 0 / Medium 0；Inspector、summary、focus、三宿主 update
  matrix 和 surface parity 闭合。
- `git diff --check` 与 G003 Markdown Prettier 通过。
- 该次 breaking contract 审查当时，delivery artifact validator 为 0 errors；缺少 `plan.md`、`tasks.md`、
  `analysis.md` 的 3 个 warning 是进入 planning 前的预期闸门结果。上述 artifacts 随后已生成、获批并通过验证。

## User Review Gate

- Approval: 用户于 2026-08-12 明确批准精确 breaking public contract
- Reviewer notes: technical plan、TDR-025 与 T135-T141 work graph 随后也已于 2026-08-12 获批；当前仅
  T135 按 self-contained packet 进入执行，T136-T141 仍由前置依赖阻塞。
