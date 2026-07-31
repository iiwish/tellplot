# T126 Delivery Summary

- Status: Accepted
- Acceptance: 用户于 2026-07-30 随 G006 完成目标级验收
- Goal: framework-neutral imperative DOM/G2 editor
- Public entry: `createEditor(container, options)` and `EditorInstance`
- Runtime: stable DOM workbench, core store, G2 renderer, outline keyboard/pointer interactions,
  grouping, annotations, history, inspector, toolbar, overlays, export and deterministic cleanup
- Boundary: `@tellplot/editor` has no React, Vue, dnd-kit or lucide dependency; old React runtime and
  compatibility source modules were removed
- Compatibility: no unpublished historical API compatibility layer retained, per approved scope

## Review Notes

- Controlled updates retain one runtime and only accept host-provided `view` as visible state.
- `destroy` is idempotent and releases store subscribers, document/window listeners, media queries,
  G2 runtime, DOM and container ownership.
- Framework-specific lifecycle and `v-model` contracts are intentionally deferred to T127.
