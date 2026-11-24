# 目录体验架构

沿用 [Python Console 架构](../python-console/architecture.md)。本次依赖方向为浏览器 React 目录 → Console Django 业务接口 → Console 数据库；不涉及 Core 执行链。

## 职责与调用链

- `layouts/index.tsx` 管理工作区外壳，删除冗余路径栏。`agents/catalog.module.scss` 及资源/模型/发布各自作用域样式管理紧凑标题与工具栏，不覆盖 Ant Design 内部布局。
- Agent 目录 → `services/agents` → `agents.definitions`：暴露和保存既有 `Agent.bot_type`，分类列表沿用 `/home-page/agent-square/get-bot-type-list`。
- 工作流目录/编辑器 → 工作流接口 → `workflows` 视图及模型：沿用 `category`，新增用户级收藏关系。不得用全局 `Workflow.top` 代替个人收藏；所有读写继续走现有资源作用域授权。
- 发布管理 → `/publish/bots?includeWorkflows=true` → `publishing.views`：对象数据传递真实 `avatar`，包括未绑定发布代理的工作流分支。前端统一图片回退。
- 市场 → `/home-page/agent-square/get-bot-page-by-type` → 发布投影；使用 `/published/:botId` 打开，星形收藏继续使用既有发布对象收藏接口。市场复用构建目录卡片样式。工作流发布冻结真实分类，历史快照缺少可信分类来源时显示未分类，不重写不可变版本。
- 市场工具栏复用 `agents/categories` 的分类组件和加载/重试机制，查询将名称、`type` 与 `favorite` 交给既有市场接口。Console 在活动市场发布集合上按快照分类和当前用户 `AgentFavorite` 求交集后计数、分页；匿名仅收藏返回空集，不读取其他用户收藏。分类表、发布快照、收藏写入和权限契约均不改变，无迁移，不涉及 Core 或共享基础设施。
- 模型目录/详情 → 模型数据：用确切官方端点主机解析个人模型品牌，第三方端点固定使用上传的 SVG；旧平台官方模型保留自身官方头像/品牌映射。兼容协议、个人模型存储表和模型名称均不能独自决定品牌。

## 影响评估

外壳路径栏删除影响采用 BasicLayout 的页面，但作用域仍在侧栏可见，编辑器独立头部保持业务上下文。目录共享样式修改需同时验收 Agent、工作流和市场。新增收藏表需要 Django 迁移；用户 ID 与工作流 ID 唯一约束保证幂等，权限继续由现有查询边界决定。不修改 Kafka、Redis、MinIO、认证或执行服务。


### 网关图片路由

头像上传返回 `/console-api/image/content/.../<filename>`，浏览器读取头像的完整依赖方向为前端图片请求 → Compose Nginx 网关 → Console Django 图片接口 → 既有对象存储读取。带 `.png`、`.svg` 等扩展名的 API 路径必须留在后端 API 路由中，不能被前端静态资源正则捕获。

通用 `/console-api/` 前缀使用 `^~`，仅阻止其匹配请求继续进入静态扩展名正则。已核对同一 server 中全部 locations：`=` 精确路径仍首先命中，`/console-api/agents/`、`/console-api/published/`、`/console-api/workflow/` 等更长 `^~` 前缀继续保留 SSE 设置，内部服务 deny 前缀仍因最长前缀优先而拒绝公开访问。公开 Agent/工作流精确 API 的 auth_request 及其他 `/agent/v1/`、`/workflow/v1/` 拒绝边界不变。

通用 API 的 proxy_pass 去除 `/console-api/` 前缀、Host 与转发头、同源 session/CSRF 行为和超时保持原配置；API 文件响应不继承前端的公共一年缓存，非 API 静态路径继续使用既有缓存。此变更不修改 MinIO 配置、图片鉴权、认证中间件或共享 SDK。回归必须通过真实 Nginx 发送带扩展名的 API、静态、专用 SSE、精确集合及内部 deny 请求，验证上游路径、转发头、缓存与拒绝边界。

### 同源图片内容与对象存储边界

`image_upload` 继续向既有 Console bucket 的 `images/<owner>/<upload_id>/<name>` 写入 PNG/JPEG，返回持久化的同源 `/console-api/image/content/...` 地址。图片 GET 先使用原有 session 用户及用户/空间归属检查，再由 Console 的 `knowledge.storage.read` 通过官方 MinIO SDK 和内部 `OSS_ENDPOINT` 读取原 key，直接返回 `HttpResponse` 图片字节；浏览器无需连接 `OSS_REMOTE_ENDPOINT` 或接收存储签名 URL。

影响限于图片内容接口。`storage.read` 已负责关闭与释放 SDK 连接，本次复用而不改写共享存储模块；文档、Skill、产物及其他通用下载仍沿用既有签名下载逻辑，MinIO 主机、凭据、bucket/key、策略和认证中间件均不变。个人图片与空间图片继续分别验证所有者和当前空间成员关系，未授权请求在读取对象前拒绝。

头像上传现有限制为 10MB，选择已有 SDK 内存读取加二进制响应，避免新增 SDK、同步流式响应适配或中转缓存。代价是 Console 每次请求承担一次至多上传上限大小的对象读取及内存占用；保持 `Cache-Control: private, no-store`，每次读取重新鉴权，空间成员移除后不能靠缓存继续访问。响应使用 PNG/JPEG MIME 与 `nosniff`，不输出对象存储端点、签名查询或凭据；存储错误沿用现有安全错误映射。
