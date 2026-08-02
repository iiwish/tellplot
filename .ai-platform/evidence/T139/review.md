# T139 Review

## Findings

未发现 unresolved Critical、High 或 Medium finding。

## Spec Compliance

- 交付 manifest 只包含 `tellplot-launch-4k.mp4`、SRT 和 `tellplot-launch-cover-4k.png`。
- production WebM、主片与封面均探测为 3840x2160，录屏没有局部内容或灰色留白。
- `TellPlot.com` 水印固定在左上角，在产品浅色画面和最终深色邀请页均可读，不遮挡操作与字幕。
- 封面使用真实 TellPlot 首页瀑布图，不显示结构大纲或数据面板；分组高亮、拖拽插入线、被拖动项目和
  鼠标指针共同表达直接编辑，不包含虚构的产品能力。
- 框选矩形只包围两个目标柱的绘制边界，不延伸至图表底部，选择期间无 Tooltip 遮挡。
- 分组弹窗在 4K page scale 下相对编辑器居中且四边完整可见；指针进入输入框后逐字输入，完整
  `增长驱动` 名称在提交前跨 1 秒停留。

## Code Quality

- 4K 物理画布与 1920x1080 逻辑布局通过 typed capture manifest 明确记录。
- Chromium page scale 保留浏览器原生输入坐标；真实拖拽、分组和最终状态断言全部通过。
- 框选几何由 `marqueeAroundMarks` 统一计算并有纯函数测试；录制脚本现场断言弹窗完整可见且水平居中。
- 竖版 composition、渲染脚本、审计分支和输出合同均不在当前交付面。
- 24 张 review still 均为 3840x2160，开头、中段、两次切点、组合节奏和结尾无空白、裁切或遮挡。

## Residual Risk

最终社交平台会再次转码，平台端画质不属于本地交付控制范围；本地 4K master 使用 H.264 CRF 16 保留
高质量上传源。
