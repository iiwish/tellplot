# T135 Test Results

- RED：`pnpm --filter @tellplot/video test` 首次确认 workspace 不存在；scaffold 后确认缺失 `src/timeline`。
- GREEN：2 个 test files、4 个 tests 通过，覆盖 WAV 实测时长、字幕连续性、注意力闸门和横竖屏尺寸。
- `pnpm --filter @tellplot/video typecheck`：通过。
- `pnpm --filter @tellplot/video render:smoke`：120 帧、1920x1080、H.264/AAC 渲染通过，输出 234.8 kB。
- 横屏与竖屏 frame 60 PNG：渲染并人工检查，无黑帧、裁切或字幕越界。
- `pnpm format:check`：通过。
- strict artifact validator：通过。
- `git diff --check`：通过。
- `pnpm lint`：首次发现并禁止一处 non-null assertion；已修复，最终门禁在 T135 关闭前复跑。
