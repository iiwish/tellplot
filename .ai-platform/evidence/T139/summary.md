# T139 Summary

## Outcome

T139 将视频交付收敛为一个 3840x2160 横版主片、简体中文字幕和 3840x2160 封面。production capture
使用 3840x2160 浏览器画布、1920x1080 逻辑布局与 Chromium 2x page scale，录制流完整铺满画面，同时
保持真实拖拽、框选和点击坐标语义。

主片左上角固定显示 `TellPlot.com` 水印；封面使用真实首页瀑布图与单一画面构图，直接呈现分组高亮、
拖拽插入线、被拖动项目和鼠标指针。封面不显示结构大纲或数据面板，只保留 TellPlot 标志、项目定位标题
和官网地址。Remotion composition、交付 manifest、review frame 与 media audit 只处理横版，不生成竖版终片。

最终重录继续保留 T138 的真实拖拽反馈，并把完整分组名称在提交前硬性停留 1 秒。分组框选按目标柱的
真实绘制边界计算，不再延伸到图表底部；选择期间隐藏 Tooltip。4K 录制下的分组弹窗相对编辑器居中且
完整可见，指针平滑进入输入框后再逐字输入。24 张 4K 关键帧覆盖框选、对话框、逐字输入、完整名称、
创建结果、浅色产品画面与深色邀请页。

## Scope

- `apps/video`：4K capture contract、单横版 composition、固定水印、4K 封面、渲染与审计脚本。
- `.ai-platform/specs/015-launch-video`：VIDEO-FR-011、T139 work graph 与 execution packet。
- 公共 API、schema、包布局、官网生产内容与 release 均未改变。

## Status

`Needs_Review`。实现、媒体与质量门禁完成，等待用户验片。
