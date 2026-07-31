# T127 Delivery Summary

- Status: Accepted
- Acceptance: 用户于 2026-07-30 随 G006 完成目标级验收
- Packages: `@tellplot/react@1.0.0`, `@tellplot/vue@1.0.0`
- React: stable host element, Strict Mode-safe create/destroy, prop-to-`update` mapping and narrow ref
- Vue: stable host element, `v-model:view`, event mapping, prop-to-`update` watch and narrow expose
- Boundary: both adapters call `createEditor`; neither owns editor state, G2, commands or workbench DOM
- Dependency policy: React adapter declares only React; Vue adapter declares only Vue; editor declares neither

## Review Notes

- Callback identity changes update an existing imperative instance rather than remounting.
- Every Strict Mode/Vue unmount path calls `destroy` exactly once per created instance.
- Adapter CSS entrypoints delegate to the canonical editor stylesheet.
