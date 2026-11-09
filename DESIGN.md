---
name: Astron Agent Console
description: Vector 双层工作空间与 Ion 银白电蓝视觉系统
colors:
  primary: "#315ff4"
  primary-hover: "#244ed6"
  ink: "#18243d"
  muted: "#607089"
  line: "#dfe6f1"
  canvas: "#f1f5fc"
  rail: "#edf2fb"
  context: "#f6f8fd"
  surface: "#ffffff"
  nav-active: "#e7eeff"
  card-hover: "#8aa5f5"
  description: "#526580"
  chip-bg: "#f2f5fb"
  chip-text: "#52688c"
  card-action: "#3159d9"
  footer-line: "#e8edf5"
  filter-bg: "#eef3fb"
  button-ink: "rgba(0, 0, 0, 0.8)"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: "36px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    lineHeight: "20px"
rounded:
  chip: "5px"
  nav-item: "6px"
  control: "7px"
  module: "8px"
  avatar: "10px"
  card: "14px"
spacing:
  icon-gap: "5px"
  label-gap: "6px"
  compact: "8px"
  action-gap: "10px"
  control: "12px"
  identity: "14px"
  body: "16px"
  mobile-gutter: "18px"
  section: "20px"
  grid: "22px"
  card-inline: "24px"
  page: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    textColor: "{colors.button-ink}"
    rounded: "{rounded.control}"
    height: "40px"
  button-card-action:
    textColor: "{colors.card-action}"
    height: "30px"
    padding: "0 4px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "38px"
    width: "300px"
  nav-item:
    textColor: "{colors.ink}"
    rounded: "{rounded.nav-item}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.primary}"
    rounded: "{rounded.nav-item}"
  resource-chip:
    backgroundColor: "{colors.chip-bg}"
    textColor: "{colors.chip-text}"
    rounded: "{rounded.chip}"
    padding: "3px 8px"
  resource-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "22px 24px 0"
  catalog-tab-active:
    textColor: "{colors.primary}"
    height: "44px"
---

# Design System: Astron Agent Console

## Overview

**Creative North Star: "Vector × Ion 工作空间"**

以用户选定的 Vector 双层导航和 Ion 银白电蓝配色为基准：用银蓝色导航标明当前位置，用白色工作面承载任务，用电蓝强调创建、选中与进入编辑等动作。深蓝文字、轻边界与留白保持企业开发工具的清晰和克制。

当前已实现的参考范围是控制台外壳、Agent 和工作流目录。现有 Astron Agent 名称与标识保持不变；后续页面继承这些视觉原语，具体编辑器布局仍按任务决定。此文件描述已实现规则，源代码仍是实现事实的核对入口。

**Key Characteristics:**
- 银蓝导航、白色工作面、电蓝交互强调。
- 空间上下文清楚，主要动作和次要操作分层。
- 大卡片用名称、用途、资源和底部动作组成稳定阅读顺序。
- 窄屏保留任务信息，导航切换为抽屉。

## Colors

银白和淡银蓝承载空间层级，电蓝建立交互秩序，深蓝灰文字维持长时间操作的可读性。规范色值由上方 frontmatter 唯一持有。

### Primary

- **电蓝**（primary）：创建按钮、当前导航、当前页签、输入光标和可见焦点。
- **深电蓝**（primary-hover）：主要按钮悬停。
- **卡片动作蓝**（card-action）：目录卡片底部的编辑、对话及发布入口。
- **浅蓝状态**（nav-active、card-hover）：分别承载当前导航背景与卡片悬停边框。

### Neutral

- **深蓝墨色**（ink）：标题、正文和主要导航文字。
- **蓝灰辅助色**（muted）：说明、计数、时间、次级标签及搜索占位文字。
- **银蓝分隔线**（line、footer-line）：导航、页签、卡片及卡片底部的细边界。
- **银白底层**（canvas、rail、context）：外壳、全局模块栏和上下文侧栏。
- **纯白工作面**（surface）：目录页面、卡片和顶部路径栏。
- **既有按钮文字**（button-ink）：默认按钮的实际文字色；保留现有实现事实。
- **用途与资源**（description、chip-bg、chip-text、filter-bg）：用途说明、资源徽标和分段筛选底层。

### Named Rules

**The Light Workspace Rule.** 控制台工作面和侧栏保持浅色；深蓝用于文字，不作为大面积背景。

**The State Has Meaning Rule.** 电蓝标识交互和选中状态；资源徽标使用低对比银蓝底，避免与主要动作竞争。

## Typography

**Body Font:** 系统无衬线字体，优先使用设备系统字体，中文回退至 PingFang SC 和 Microsoft YaHei。完整栈见 typography；不引入展示型字体。

**Character:** 文字承担检索、识别与操作，不使用宣传式排版。层级主要由字号、字重与上下文建立，辅助信息使用蓝灰色。

### Hierarchy

- **Headline**：页面标题（28px / 36px，650，字距 -0.025em）；移动端字号收至 26px。
- **Title**：卡片标题（20px / 28px，600，字距 -0.02em）；移动端 Agent 标题收至 18px。桌面单行省略，移动端允许换行；工作流标题沿用当前单行规则。
- **Body**：界面正文（14px / 1.5）；卡片用途说明采用较松行距（23px），最多两行。
- **Label**：类型标签（12px / 20px）；资源徽标行距为 19px，时间与计数使用等宽数字。
- 路径和计数采用 13px；品牌字标采用 18px、700，不扩展为通用页面标题。

按钮仍受既有全局 Helvetica 字体栈覆盖；这是历史样式差异，不作为新组件的字体规范。无独立 display 角色。

## Layout

外壳使用可滚动工作面和固定导航分区。全局模块栏宽 76px，上下文栏宽 196px，合计 272px；折叠后只保留模块栏。顶部路径栏高 64px。上下文栏内团队与空间选择器在页面链接之前，维持作用域可见。

目录内容最大宽度为 1600px，桌面内边距为 28px。标题与创建动作在上，随后是 44px 页签行、搜索与筛选工具行、卡片网格。网格使用两列等分宽度，间距 22px；视口宽度 ≤1100px 切换为单列，即窄桌面与平板也会单列。该列数是目录模式，不约束其他任务页面。

视口宽度 ≤760px 时，桌面双层侧栏由 56px 顶栏及左侧抽屉替代；抽屉宽 292px，内部保持原有导航顺序。路径栏收至 46px，内容内边距为纵向 22px、横向 18px，搜索可伸展，操作可换行。工作流页主要创建动作独占一行，其余标题动作双列排列。

间距以可读分组为准：紧凑控制用 5–10px，身份与正文分组用 14–16px，页面与卡片分区用 20–28px；不硬凑单一倍数网格。视口高度 ≤740px 时模块行与品牌区压缩，导航仍可滚动。

## Elevation & Depth

外壳与目录使用浅色层次和细边界建立深度；目录卡片和按钮不依赖投影。悬停和焦点强化边界，内容位置稳定。弹窗和抽屉沿用现有组件体系，不把其浮层表现移植到日常卡片。

### Named Rules

**The Stable Surface Rule.** 卡片悬停或内部获得焦点时改变边框颜色，不移动、放大或增加投影。

卡片边框过渡为 0.18s ease-out；减少动态效果时取消。外壳内其他已有动画和过渡在同一用户偏好下归零。通用键盘焦点为电蓝 2px 轮廓、外偏移 3px；导航项使用内偏移 -3px。

## Shapes

采用轻柔而清楚的圆角层级：资源徽标 5px、上下文导航 6px、按钮和输入控件 7px、模块选项 8px、资源头像 10px、大卡片 14px。账户头像是圆形。边界通常为 1px 实线；页签选中线为 2px。图标使用现有 Ant Design 线性图标，保留品牌与资源图片，不用文字字符充当图标。

## Components

### Buttons

主按钮以电蓝填充和白字表达创建动作；默认按钮以描边和文字表达市场、导入与管理入口。控制圆角取 control；现有全局按钮高度实际为 40px，覆盖主题 controlHeight 的 38px。悬停主按钮转深电蓝，默认按钮边界和文字转电蓝。禁用主按钮降低透明度。卡片底部动作高 30px，使用更轻的文本或链接样式；不强行填充成主按钮。

### Inputs / Fields

搜索使用现有输入组件，纯白底、细边界、control 圆角，主题控制高度 38px，桌面宽 300px。搜索和清除保留原生组件交互；占位文字使用 muted 并保持完全不透明。移动布局允许搜索占满可用宽度，焦点遵循外壳轮廓与组件自身状态。

### Chips

资源徽标以 chip-bg 和 chip-text 标识已配置资源，内边距为 3px 8px，5px 圆角，12px 字号和 19px 行距。图标与文字相隔 5px。徽标是信息，不伪装成按钮；长内容可换行，不挤出卡片。

### Cards / Containers

大卡片具有 14px 圆角、白底和细边界，最小高度 266px，桌面内边距为 22px 24px 0，移动端为 20px 16px 0。名称与 44px 资源头像先出现，随后是两行用途、可换行的资源徽标和底部动作。底部分隔线、时间与操作维持统一对齐。悬停和内部焦点仅改变边框。更多操作和收藏使用真实可操作控件，避免把整个容器伪装为按钮。

### Navigation

模块栏使用 12px 图标文字和约 21px 图标，当前模块以白底电蓝文字突出。上下文项最小高 42px，内边距 10px 12px，当前项以 nav-active 底色和电蓝加粗文字突出。目录页签使用文字加底部选中线；上下文与页签都保留清楚的当前页面语义。移动端从菜单按钮打开相同内容的抽屉，切换路由后关闭。

### Filters and feedback

分段筛选具有 filter-bg 底层、control 圆角和细边框；选中项用白底电蓝文字，状态由 aria-pressed 表达。加载、无内容、搜索无结果、请求错误分开表达；错误提供重试，不伪装成空目录。分页与卡片网格分组，移动端居中。

## Do's and Don'ts

### Do:

- **Do** 使用已定义的电蓝与银白层级区分动作、导航和内容。
- **Do** 在桌面目录使用两列大卡片，在现有窄屏断点切换单列。
- **Do** 保留名称、用途、真实资源与底部动作的阅读顺序。
- **Do** 为键盘操作提供可见焦点，并遵循减少动态效果设置。
- **Do** 分别呈现加载、空内容、搜索无结果和请求失败，并提供下一步操作。

### Don't:

- **Don't** 引入深色侧栏或深色工作面。
- **Don't** 给目录卡片添加悬停位移、放大或装饰性投影。
- **Don't** 用装饰徽标、虚构统计或空状态替代真实配置和请求失败。
- **Don't** 把双列目录构图强制推广到所有编辑器和资源表单。

<!-- Source scope: console/frontend/src/styles/console.scss; console/frontend/src/main.tsx; console/frontend/src/components/resource-navigation/index.module.scss and index.tsx; console/frontend/src/pages/agents/catalog.module.scss and list.tsx; console/frontend/src/pages/workflow/list.tsx. Legacy purple helper styles and the Helvetica button override in styles/antd.scss are not canonized. -->
