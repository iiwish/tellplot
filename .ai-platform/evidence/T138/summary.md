# T138 Summary

## Result

T138 使用一段真实浏览器会话完成 TellPlot 开源介绍视频的产品叙事。0 至 50.4 秒保持同一个编辑器、同一张
瀑布图和连续命令历史，依次完成拖拽、框选分组、展开/折叠、撤销/重做、SVG 导出和 ViewSpec 查看。
页面 `pointermove`、`pointerdown`、`pointerup` 和 `pointercancel` 事件驱动黑白高对比指针与 160ms 蓝色按压
反馈，Remotion 不生成或猜测鼠标路径。

验片发现原产品只显示文字拖拽标签，柱形本身没有跟随指针。editor runtime 读取 G2 scene mark bounds，按
当前图表语义 palette 生成同尺寸柱形预览，并以按下点到当前 pointer 的真实 delta 逐事件更新 `transform`。
拖拽开始、移动、落点与释放因果均可见，不引入弹簧或第二套图形运行时。

产品段的说明只由旁白和字幕承担，额外 editorial 标题、规则线、角标和章节页数量为 0。50.4 秒只切换到
一次真实官网瀑布图静帧，以可见的图表家族标签证明支持范围，不播放柱状图/条形图轮播；56.86 秒进入最终
邀请页。全片只有两个主视觉切点，横竖屏均使用固定取景，不在同一段内左右追踪。

框选组合使用四个明确阶段：选区从第一根柱移动到第二根柱、完整选区停留、空白分组对话框出现、以
140ms/字输入“增长驱动”并在完整名称可读后提交。竖屏长镜头固定为 `31% 51%`，选区、完整对话框和
创建后的聚合柱均在画面内。

## Sync Contract

- `story-take` 保留 0.653 秒 action pre-roll，并写入 schema 2 capture manifest。
- 拖拽、框选、展开/折叠、撤销/重做、导出和 ViewSpec 全部在同一次录制中按 typed story action 执行。
- 拖拽、框选、原型、撤销、ViewSpec 与图表家族六个主 cue 直接引用字幕时间点。
- 拖拽于 3.52 秒开始、4.9 秒释放；框选于 9.22 秒开始、10.35 秒释放；10.72 秒开始输入名称，11.9 秒提交。
- 字幕使用 WAV 实际语音区间，旁白增益保持 0.88。

## Deliverables

- `apps/video/out/tellplot-launch-16x9.mp4`：1920×1080，H.264 + AAC。
- `apps/video/out/tellplot-launch-9x16.mp4`：1080×1920，H.264 + AAC。
- `apps/video/out/tellplot-launch-poster.png`：1200×630，真实产品画面。
- `apps/video/public/subtitles/tellplot-launch.zh-CN.srt`：简体中文字幕。
- `apps/video/out/media-audit.json`：媒体规格、SHA-256、音频和关键帧审计。

最终媒体与录屏素材保存在本地 gitignored 目录；可重复录制、剪辑、测试和 evidence 保留在仓库源码中。
