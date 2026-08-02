# T137 Test Results

- RED：deliverables 测试在竖屏 MP4 和封面生成前按预期失败 2 项。
- GREEN：4 个 video test files、9 个 tests 全部通过，包括 timeline、WAV、capture 和最终媒体合同。
- 媒体探测：横竖屏均为 H.264/AAC、48 kHz stereo、63.658667 秒，尺寸分别为 1920×1080 与
  1080×1920。
- 音频源：62.969042 秒、24 kHz mono；首个有效采样约 0.587 秒，字幕首句 0.58 秒进入；composition
  增益为 0.88，避免源文件单个触顶采样在 AAC 转码时产生削波风险。
- 关键帧：9 个横屏、6 个竖屏，自动空图阈值通过并完成人工视觉 review。
- 封面：1200×630，通过尺寸检查和人工 review。
- 全仓门禁：`pnpm lint`、递归 typecheck、56 files / 460 unit tests、完整 build、Prettier、media audit、
  strict artifact validator、release audit 与 `git diff --check` 通过。
