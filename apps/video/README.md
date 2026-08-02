# TellPlot Launch Video

TellPlot 开源介绍视频的 private Remotion 制作工程。工程使用 3840×2160 浏览器画布、1920×1080 逻辑
布局与 Chromium 2x page scale 从 production build 录制真实产品操作，生成 4K 16:9 主片、简体中文
字幕和 4K 封面。

## 制作流程

```bash
pnpm --filter @tellplot/video capture
pnpm --filter @tellplot/video test
pnpm --filter @tellplot/video render:all
pnpm --filter @tellplot/video render:review
pnpm --filter @tellplot/video media:audit
```

`capture` 会先构建官网，再通过 Playwright 录制排序、框选分组、结构大纲撤销/重做、ViewSpec、SVG
导出和图表家族切换。录制素材写入 `public/captures/`，最终媒体和关键审查帧写入 `out/`；两处均不进入
Git。旁白、字幕、时间线和 Remotion 源码进入版本控制。

渲染脚本默认使用 macOS 系统 Chrome：
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。其他环境应把命令中的
`--browser-executable` 改为本机 Chrome 路径。

## 最终交付

- `out/tellplot-launch-4k.mp4`：3840×2160，H.264 + AAC，30 fps
- `out/tellplot-launch-cover-4k.png`：3840×2160
- `public/subtitles/tellplot-launch.zh-CN.srt`：简体中文字幕
- `out/media-audit.json`：尺寸、时长、codec、音频、hash 与关键帧检查结果

`media:audit` 使用 Remotion 随包的 `ffprobe` 验证媒体流，并要求至少 9 个横屏关键帧存在且不是异常空图。
关键帧还需完成人工视觉审查，确认水印、字幕安全区、产品画面裁切、敏感信息和叙事节奏。
