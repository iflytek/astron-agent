---
version: 1
slug: "console-frontend-src-pages-agents-editor-tsx"
primary_target: "console/frontend/src/pages/agents/editor.tsx"
related_targets: ["console/frontend/src/pages/agents/conversation.tsx","console/frontend/src/pages/workflow/index.tsx","console/frontend/src/pages/workflow/components/flow-header/index.tsx","console/frontend/src/components/workflow/drawer/node-detail/index.tsx","console/frontend/src/components/workflow/drawer/chat-debugger/index.tsx"]
---

## Scope and mode

Operate。Agent 配置、对话历史、流式运行，以及工作流画布外围、节点配置和调试。用户是持续编辑与排错的应用构建者。继承根 DESIGN.md 的浅色 Ion/Vector 系统和 01 导航；API、权限、空间与数据契约保持原样。

## Direction contract

THESIS: 让构建者持续知道自己编辑的对象、尚未保存的内容及运行所处状态；配置与运行反馈按任务分区，避免把全部操作挤进画布浮层。

OWN-WORLD: 沿用既定浅色画布、白色工作面、蓝色主要动作、细分隔线、紧凑状态标签；图标与交互密度服从现有系统。

STORY: 先确认对象与空间，再配置、保存、调试；失败时保留草稿和已收到的输出，并提供刷新、定位或重试。停止请求须等待服务确认。

FIRST VIEWPORT: Agent 身份、空间状态带与任务页签置于表单或会话之上；工作流身份及视图位于第一行，动作带位于第二行，画布与节点库占据余下区域，配置/调试抽屉从其右侧展开。手机使用全屏抽屉。

FORM: 沿用既定工作区结构，精确指定范围的局部延展，无新视觉世界或概念抽选；seed: none (not applicable, inherited system)。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints

Agent 草稿跨页签保留；离开确认覆盖未发送内容与运行反馈。工作流离开先保护运行反馈，再等待既有保存屏障。验证 1440×900、1024×768、390×844 的长文本、错误、未保存、运行、停止与恢复状态。根 DESIGN.md/PRODUCT.md 保持既定系统，无新增位图资产。
