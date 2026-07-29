# TellPlot 开源官网设计合同

## Metadata

- Goal: `G002-R2`
- Version: 0.8.0
- Status: Confirmed
- Last updated: 2026-07-23

## Product Brief

- Pitch: 面向 React 开发者的轻量可编辑基础图表库官网，用真实图表证明安装、配置和结构编辑能力。
- Audience: 首要用户是评估或接入 `@tellplot/editor` 的开发者；次要用户是查看交互效果的业务设计者。
- Platform: 响应式 Web；桌面优先展示完整工作台，移动端保留清晰浏览和按需编辑路径。
- Core workflows: 理解产品、切换图表家族、浏览示例、打开实时工作台、阅读接入文档。
- Required states: 当前导航、移动菜单、图表切换、示例 hover/focus、复制反馈、非法配置和窄屏工作台。

## Direction

- Surface: 品牌展示、真实图表舞台、技术文档与互动工作台的复合型网站。
- Intensity: Ambitious。
- Primary pattern: Cinematic Product Stage。
- Golden pattern: Cinematic Product Stage，以真实图表而不是图片或 3D 物体作为 hero object。
- Secondary tension: Modular Workbench，以同一尺寸体系的轻量卡片承载图表、安装、数据流和代码。
- Design thesis: 首页只完成两件事：用真实图表证明产品，用最小配置帮助开发者开始接入。数据流、安装和
  配置代码属于同一个接入章节，不再拆成独立能力说明或重复操作入口。
- Hero spectacle: 首屏使用大面积留白、粗细有别的编辑排版和全宽真实 G2 图表舞台；默认瀑布图展示展开的
  “增长驱动”分组，并允许直接拖拽排序和框选创建分组；图表家族选择即时切换同一个 TellPlot 组件。
- Signature move: `waterfall / column / bar` 模式轨道驱动同一个真实 TellPlot 组件切换，而不是播放静态截图。

## Reference Digestion

- ECharts intent: 高留白首页、明确产品名称与一句话定位、两项主操作、鲜明但克制的品牌色。
- G2 intent: 稳定顶栏、可扩展左侧分类、密集而规整的真实图表网格、示例优先的信息架构。
- Inherit: 三秒可读的产品定位、清晰导航、轻量卡片、蓝色交互强调、示例浏览效率和充足图形面积。
- Do not copy: 两个项目的 logo、品牌图形、具体颜色组合、插画、文案和完整导航结构。
- Domain replacement: 使用 TellPlot 的真实可编辑图表、SourceData/ViewSpec 分离、财务语义色和在线工作台。
- Upgrade: 首页与全部示例直接渲染 TellPlot 组件，示例卡片可筛选并进入双向编辑，而不是静态缩略图。

## Style Contract

- Palette:
  - canvas `#F5F7FA`
  - paper `#FFFFFF`
  - ink `#101828`
  - muted `#667085`
  - primary `#1267E5`
  - primary hover `#0B54C0`
  - jade `#138A72`
  - coral chart `#D85850`
  - amber `#D08A18`
  - developer surface `#F5F7FA`
  - showcase start `#2F7CF6`
  - showcase positive `#12B76A`
  - showcase negative `#F04464`
  - showcase subtotal `#2F7CF6`
  - showcase group `#14B8A6`
  - showcase end `#2F7CF6`
- Typography: Inter/Noto Sans SC/system；display 64/70 desktop、44/52 mobile；body 15/26；metadata mono
  11-12/18；letter-spacing 始终为 0。
- Grid: 页面最大宽度 1280px；12 列；桌面水平边距 32px，移动端 18px；8px 基础间距。
- Radius: 控件 6px，内容卡片 7-8px，标签 4px，禁止大胶囊和嵌套卡片。
- Visual anchors: 清晰蓝色焦点、真实图表色、白色图表卡片、数据流卡片和代码卡片。
- Component language: 轻量顶栏、单一首屏引导、图表模式轨道、卡片化真实图表、紧凑数据流卡片和代码工作面；
  示例、文档和工作台外壳共享同一浅灰画布、白色卡片、柔和阴影与蓝色交互强调。
- Motion: 首屏内容 y 位移进入 420ms `cubic-bezier(.16,1,.3,1)`；卡片 hover 最多
  translateY(-2px)；导航与按钮 160-200ms；G2 继续负责图形过渡；reduced motion 关闭非必要位移。
- Assets: 不使用远程图片。主视觉和示例资产均为真实 `ChartEditor` + 本地 fixture；失效时显示
  组件自身可访问错误状态。

## Structure Contract

- `/`: 60px 导航只保留示例、文档和一个工作台入口；品牌信息与单一页内引导；图表模式轨道和卡片化可编辑
  图表舞台；默认瀑布图包含展开分组，拖拽和框选直接进入命令内核；安装、
  `SourceData → Command → ViewSpec → G2` 和最小配置合并为一个卡片式开发者接入区；
  页脚只保留品牌与技术元信息。
- `/examples`: 页面标题、卡片式搜索、卡片式图表分类侧栏与等权真实示例网格；后续按同一内容合同增加。
- `/docs`: 左侧卡片式章节索引、中间分节文档卡片、右侧版本元信息卡片；移动端改为单列且索引可横向滚动。
- `/playground`: 60px 网站导航下保留现有完整工作台，浅灰画布承载代码面板与编辑器两张工作卡片，工作区占
  剩余 `100dvh`；高频编辑区域继续使用必要的分隔和紧凑密度，不营销化拆卡片。
- Mobile: 导航菜单为普通可访问展开区；首屏先品牌和操作、后模式选择与图表；数据流改为纵向；代码水平
  滚动；无依赖 hover 的功能。

## Crafted Interactions

- 图表家族分段控件切换真实 G2 图形和对应说明。
- 图表模式按钮保持固定尺寸，选中轨道、图表和文字说明同步更新，图形过渡继续由 G2 负责。
- 首屏瀑布图默认展开“增长驱动”分组；贡献柱可直接拖拽排序，空白区域可框选连续节点并创建折叠分组。
- 首屏只提供一个跳转到接入章节的页内操作；示例、文档和工作台由全局导航承担。
- 接入区的数据流节点使用四张紧凑卡片表达顺序，不增加第二套 CTA。
- 示例搜索与分类即时过滤真实卡片，并提供清晰空结果。
- 示例项 hover/focus 提升 2px并显示蓝色边框，图表区域保持稳定尺寸，不推动相邻内容。
- 当前导航使用底部轨道和 `aria-current`；移动菜单在导航后展开并可用 Escape 关闭。
- 开发者接入区同时提供真实最小 `ChartConfig`、安装命令和唯一的数据流说明；复制状态通过
  `aria-live` 反馈。
- 官网与工作台使用同一组高饱和、多色相 Showcase 语义色，通过公开 `appearance.colors` 配置，不修改
  核心包的稳定默认色合同。
- 演示瀑布数据形成清晰的“增长抬升、成本回落、小计确认、期末收束”节奏；分类数据使用有层次的收入和投入
  量级，避免随机数和缺少业务关系的静态柱形。
- 首页只展示引用宿主数据的最小 React 接入代码；工作台保留完整可编辑 JSON，但紧凑显示数据项并把图形
  设置放在文件顶部。

## Mandatory Rules

- 第一屏必须出现 TellPlot 名称、真实图表和明确主操作。
- 第一屏瀑布图必须包含可见分组区域，并保持拖拽排序与框选分组可用。
- 首页只在首屏模式轨道列出三个图表家族，不在后续章节重复同一目录。
- `SourceData`、`ViewSpec` 和 G2 的职责只在接入区解释一次，不拆成独立章节或重复卖点卡片。
- 同一操作不得同时出现在导航、首屏、图表栏、接入区和页脚；页脚不复制主导航。
- 所有图表预览都来自真实组件与本地数据，不使用占位缩略图。
- 工作台不能复制领域状态或改变 source/view 不变量。
- 页面在 1440x900 和 390x844 均露出下一内容线索。

## Forbidden Moves

- 渐变背景、装饰光球、bokeh、远程字体、库存图片和纯氛围插画。
- 冷硬的技术档案皮肤、遍布页面的编号和 mono 标签、贯穿页面的规则线或大面积暗色区块。
- 将首页做成文本/媒体两个互不关联的卡片，或让营销文案压过真实图表。
- 通用图表 registry、重型 docs/router/editor/animation 依赖。
- 大圆角、卡片套卡片、滚动劫持和持续背景动画。

## QA

- Desktop: `1440x900` 首页、示例、文档、工作台。
- Mobile: `390x844` 首页导航、图表切换、示例、文档和工作台使用面板。
- Interaction: 内部导航、前进/后退、移动菜单、图表切换、示例入口、复制和实时配置。
- Accessibility: landmarks、heading 顺序、aria-current、菜单、focus-visible、reduced motion、axe。
- Visual review target: rubric average >= 1.7，无核心维度 0。
