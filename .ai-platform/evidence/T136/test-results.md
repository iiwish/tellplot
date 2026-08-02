# T136 Test Results

- RED：capture contract 测试先因缺失 `src/captureContract` 失败。
- GREEN：production build 与 Playwright 录制成功；6 段素材、6 组终态 assertions 和 manifest 全部生成。
- `tests/capture.test.ts`：通过，素材顺序、文件存在、裁切起点与动作时长均与 composition 常量一致。
- `render:smoke`：前 120 帧真实 WebM 解码、H.264/AAC 编码通过。
- `render:main`：1908 帧完整主片通过。
- 9 个横屏关键帧覆盖 hook、框选、撤销/重做、系统架构、ViewSpec、图表家族和结尾；人工检查无黑帧、
  遮挡、越界或敏感账号信息。
