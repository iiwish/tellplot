# G002-R1 Requirements Checklist

## Metadata

- Version: 0.1.0
- Status: Completed
- Source spec: `../spec.md` 0.1.0 Confirmed
- Last updated: 2026-07-20

## Interaction

- [x] 是否区分普通选择上下文和创建分组校验？[UX]
- [x] 是否定义 group 的 before/after/inside 命中区域？[Clarity]
- [x] 是否覆盖 chart、outline 和 keyboard 的等价路径？[Accessibility]
- [x] 是否定义 expanded 与 collapsed group 的落点行为？[Edge Case]
- [x] 是否保留 locked、cycle、segment 和 readOnly 失败边界？[Safety]

## Domain

- [x] 是否明确两成员来源 group 的原子解散语义？[Invariant]
- [x] 是否定义 nested replacement、group-only state cleanup 和 destination index？[Completeness]
- [x] 是否要求一次 undo/redo 恢复完整用户操作？[History]
- [x] 是否拒绝持久化单成员 group？[Boundary]

## Rendering And API

- [x] 是否定义展开区域的范围、嵌套、折叠和 label 行为？[Visual]
- [x] 是否明确 G2 range/scale/scene ownership 和禁止 DOM 几何估算？[Architecture]
- [x] 是否定义最小安全公共配置、默认值和输入边界？[API]
- [x] 是否要求 screen/SVG/PNG 一致且背景不拦截交互？[Export]

## Validation

- [x] 是否覆盖三个图表、outline、domain、history、public types 和真实浏览器？[Coverage]
- [x] 是否保留 a11y、reduced motion、performance、package 和 previous browser gates？[Regression]
- [x] 是否明确 dependency/schema/remote/publish stop conditions？[Governance]

## Findings

- Critical: 0
- High: 0
- Medium: 0
- Low: 0
