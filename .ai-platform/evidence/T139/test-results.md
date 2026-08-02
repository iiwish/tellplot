# T139 Test Results

## Focused Validation

- `pnpm --filter @tellplot/video test`：6 files / 17 tests passed；新增目标柱包围框几何和分组录屏呈现合同测试。
- `pnpm --filter @tellplot/video typecheck`：passed。
- `pnpm --filter @tellplot/video capture`：7 个 production captures 全部通过终态断言；manifest schema 4。
- `remotion ffprobe public/captures/story-take.webm`：3840x2160 VP8，完整铺满画面。
- `pnpm --filter @tellplot/video render:main`：1908 frames，H.264 CRF 16，render passed。
- `pnpm --filter @tellplot/video render:cover`：3840x2160 PNG，render passed。
- `pnpm --filter @tellplot/video render:review`：24 张 3840x2160 关键帧，全部 passed。
- 4K watermark、紧凑框选、居中完整弹窗、完整名称 1 秒停留、创建结果、深色结尾与 4K cover：人工
  视觉审查通过；封面
  单画面中的分组高亮、拖拽插入线、被拖动项目和鼠标指针均清晰，无结构大纲或数据面板。

## Final Media And Repository Gates

- `pnpm --filter @tellplot/video media:audit`：passed。
  - 主片：3840x2160，63.658667 秒，H.264 + AAC，48 kHz stereo，13,520,128 bytes。
  - 主片 SHA-256：`1f5c6df731d3d40475cf50db7220f7e5551036b34323544023beb2b669294783`。
  - 封面：3840x2160，663,526 bytes，SHA-256
    `1aeef60a133ff9a1fa20ef61ca1c007fda9f9928d0c97e5c7d8d3746ad9803be`。
  - SRT SHA-256：`c090d3c1b2c54e27570561c4703dba8339f035dda39855b223e15f6f6c48f658`。
  - 24 张横版关键帧，无异常空帧；输出目录无 portrait、vertical 或 9x16 终片。
- `pnpm format:check`：passed。
- `pnpm lint`：passed，0 warnings。
- `pnpm typecheck`：7 个 workspace projects passed。
- `pnpm test:unit`：56 files / 461 tests passed。
- `pnpm build`：7 个 workspace projects passed。
- `pnpm release:audit`：passed；唯一公共包为 `tellplot@1.0.0`。
- tracked text secret pattern scan：passed，无 private key、GitHub/npm token 或 OpenAI key pattern。
- T139 与 feature strict artifact validator：passed。
- `git diff --check`：passed。
