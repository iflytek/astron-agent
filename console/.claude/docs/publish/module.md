# Publish 模块文档

## 1. 模块概述

Publish（发布管理）模块负责管理 Bot 的发布、下架、多渠道发布、发布统计、版本管理等功能。该模块支持将 Bot 发布到多个渠道（助手市场、API、微信、飞书、MCP），并提供详细的使用统计和追踪日志。

### 核心功能
- **Bot 列表管理**：查询、筛选、分页展示 Bot 列表
- **多渠道发布**：支持发布到助手市场、API、微信、飞书、MCP
- **发布状态管理**：发布、下架 Bot
- **使用统计**：总览统计、时间序列统计
- **版本管理**：工作流 Bot 的版本历史管理
- **追踪日志**：Bot 调用日志的查询和分析
- **API 管理**：创建和管理 Bot API 应用

### 发布渠道
1. **MARKET**：助手市场（需要审核）
2. **API**：API 接口（生成 API Key）
3. **WECHAT**：微信公众号/小程序
4. **FEISHU**：飞书应用
5. **MCP**：MCP 协议

## 2. 后端 API

### 2.1 BotPublishController (`/publish`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /api/publish/bots | BotPublishController | @RateLimit | 获取 Bot 列表（分页、筛选） |
| GET | /api/publish/bots/{botId} | BotPublishController | @RateLimit | 获取 Bot 详情 |
| GET | /api/publish/bots/{botId}/prepare | BotPublishController | @RateLimit | 获取发布准备数据 |
| POST | /api/publish/bots/{botId} | BotPublishController | @RateLimit | 统一发布接口（发布/下架） |
| GET | /api/publish/bots/{botId}/summary | BotPublishController | @RateLimit | 获取 Bot 总览统计 |
| GET | /api/publish/bots/{botId}/timeseries | BotPublishController | @RateLimit | 获取 Bot 时间序列统计 |
| GET | /api/publish/bots/{botId}/versions | BotPublishController | @RateLimit | 获取 Bot 版本历史 |
| GET | /api/publish/bots/{botId}/trace | BotPublishController | @RateLimit | 获取 Bot 追踪日志 |

### 2.2 PublishApiController (`/publish-api`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/publish-api/create-user-app | PublishApiController | @RateLimit | 创建用户应用 |
| GET | /api/publish-api/app-list | PublishApiController | @RateLimit | 获取应用列表 |
| POST | /api/publish-api/create-bot-api | PublishApiController | @RateLimit | 创建 Bot API |
| GET | /api/publish-api/get-bot-api-info | PublishApiController | @RateLimit | 获取 Bot API 信息 |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| chat_bot_market | ChatBotMarket | 助手市场表（发布信息） |
| bot_publish_channel | BotPublishChannel | Bot 发布渠道表 |
| bot_usage_stats | BotUsageStats | Bot 使用统计表 |
| bot_trace_log | BotTraceLog | Bot 追踪日志表 |
| bot_api_app | BotApiApp | Bot API 应用表 |

### 关键字段

#### ChatBotMarket（助手市场表）
```java
@Data
public class ChatBotMarket {
    @TableId(type = IdType.AUTO)
    private Integer id;                 // 主键
    private Integer botId;              // Bot ID
    private String uid;                 // 发布者 UID
    private String botName;             // Bot 名称
    private Integer botType;            // Bot 类型
    private String avatar;              // 头像
    private String prompt;              // 指令
    private String prologue;            // 开场白
    private Integer showOthers;         // 是否向他人展示 prompt：0-否，1-是
    private String botDesc;             // 描述
    private Integer botStatus;          // 状态：0-下架，1-审核中，2-已通过，3-已拒绝，4-修改审核中
    private String blockReason;         // 拒绝原因
    private Integer hotNum;             // 热度
    private Integer showIndex;          // 首页推荐：0-否，1-是
    private Integer sortHot;            // 热门排序位置
    private Integer sortLatest;         // 最新排序位置
    private LocalDateTime auditTime;    // 审核时间
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
    private String publishChannels;     // 发布渠道：MARKET,API,WECHAT,MCP,FEISHU
    private Long modelId;               // 模型 ID
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| BotPublishController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/publish/BotPublishController.java | Bot 发布管理控制器 |
| PublishApiController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/publish/PublishApiController.java | Bot API 管理控制器 |
| BotPublishService | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/publish/BotPublishService.java | Bot 发布核心业务逻辑 |
| PublishApiService | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/publish/PublishApiService.java | Bot API 核心业务逻辑 |
| PublishStrategyFactory | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/strategy/publish/PublishStrategyFactory.java | 发布策略工厂 |
| PublishStrategy | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/strategy/publish/PublishStrategy.java | 发布策略接口 |
| MarketPublishStrategy | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/strategy/publish/MarketPublishStrategy.java | 助手市场发布策略 |
| ApiPublishStrategy | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/strategy/publish/ApiPublishStrategy.java | API 发布策略 |
| WechatPublishStrategy | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/strategy/publish/WechatPublishStrategy.java | 微信发布策略 |
| FeishuPublishStrategy | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/strategy/publish/FeishuPublishStrategy.java | 飞书发布策略 |
| McpPublishStrategy | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/strategy/publish/McpPublishStrategy.java | MCP 发布策略 |

### 关键业务逻辑

#### 统一发布流程（策略模式）
1. 前端调用 `/publish/bots/{botId}` 并传递发布类型（publishType）和动作（action）
2. 后端根据 publishType 获取对应的发布策略（PublishStrategy）
3. 根据 action 调用策略的 `publish()` 或 `offline()` 方法
4. 策略执行具体的发布或下架逻辑
5. 更新 `chat_bot_market` 表的 `publishChannels` 字段
6. 返回发布结果

#### 助手市场发布流程
1. 获取发布准备数据（`/publish/bots/{botId}/prepare?type=market`）
2. 填写发布信息（分类、标签、可见性）
3. 调用 `/publish/bots/{botId}` 发布到市场
4. 创建或更新 `chat_bot_market` 记录
5. 设置状态为"审核中"（`botStatus = 1`）
6. 等待管理员审核
7. 审核通过后状态变为"已通过"（`botStatus = 2`）

#### API 发布流程
1. 创建用户应用（`/publish-api/create-user-app`）
2. 获取应用列表（`/publish-api/app-list`）
3. 创建 Bot API（`/publish-api/create-bot-api`）
4. 生成 API Key 和 API 文档
5. 更新 `publishChannels` 字段添加 "API"
6. 返回 API 信息（API Key、API URL、文档 URL）

#### 微信发布流程
1. 获取发布准备数据（`/publish/bots/{botId}/prepare?type=wechat`）
2. 填写微信配置（appId、redirectUrl、menuConfig）
3. 调用 `/publish/bots/{botId}` 发布到微信
4. 配置微信公众号菜单
5. 更新 `publishChannels` 字段添加 "WECHAT"

#### 飞书发布流程
1. 获取发布准备数据（`/publish/bots/{botId}/prepare?type=feishu`）
2. 填写飞书配置（appId、appSecret）
3. 调用 `/publish/bots/{botId}` 发布到飞书
4. 配置飞书应用
5. 更新 `publishChannels` 字段添加 "FEISHU"

#### MCP 发布流程
1. 获取发布准备数据（`/publish/bots/{botId}/prepare?type=mcp`）
2. 填写 MCP 配置（serverName、description、content、icon、args）
3. 调用 `/publish/bots/{botId}` 发布到 MCP
4. 生成 MCP 配置文件
5. 更新 `publishChannels` 字段添加 "MCP"

#### 使用统计流程
1. **总览统计**：调用 `/publish/bots/{botId}/summary` 获取总对话数、总用户数、总 Token 数
2. **时间序列统计**：调用 `/publish/bots/{botId}/timeseries?days=7` 获取最近 N 天的每日统计数据
3. 统计数据从 `bot_usage_stats` 表查询
4. 支持按日期范围筛选

#### 版本管理流程
1. 调用 `/publish/bots/{botId}/versions` 获取版本历史
2. 查询工作流版本表（`workflow_version`）
3. 返回版本列表（版本号、创建时间、部署状态）
4. 支持分页

#### 追踪日志流程
1. 调用 `/publish/bots/{botId}/trace` 获取追踪日志
2. 支持筛选（时间范围、状态、用户）
3. 查询 `bot_trace_log` 表
4. 返回日志列表（请求 ID、用户 ID、请求时间、响应时间、状态、错误信息）
5. 支持分页

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 发布管理页面 | /publish | console/frontend/src/pages/publish-page/index.tsx | 发布管理主页面 |
| Bot API 管理 | /management/bot-api | console/frontend/src/pages/bot-api/api.tsx | Bot API 管理页面 |
| Bot 应用列表 | /management/bot-api/app-list | console/frontend/src/pages/bot-api/app-list.tsx | Bot 应用列表页面 |

### 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| PublishModal | console/frontend/src/components/publish-modal/ | 发布弹窗组件 |
| PublishChannelSelector | console/frontend/src/components/publish-channel-selector/ | 发布渠道选择组件 |
| BotStatistics | console/frontend/src/components/bot-statistics/ | Bot 统计组件 |
| TraceLogViewer | console/frontend/src/components/trace-log-viewer/ | 追踪日志查看组件 |

## 6. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| getAgentDetail | console/frontend/src/services/release-management.ts | GET /api/publish/bots/{botId} |
| handleAgentStatus | console/frontend/src/services/release-management.ts | POST /api/publish/bots/{botId} |
| getBotList | console/frontend/src/services/release-management.ts | GET /api/publish/bots |
| getBotSummaryStats | console/frontend/src/services/release-management.ts | GET /api/publish/bots/{botId}/summary |
| getBotTimeSeriesStats | console/frontend/src/services/release-management.ts | GET /api/publish/bots/{botId}/timeseries |
| getBotVersions | console/frontend/src/services/release-management.ts | GET /api/publish/bots/{botId}/versions |
| getBotTrace | console/frontend/src/services/release-management.ts | GET /api/publish/bots/{botId}/trace |
| getPrepareData | console/frontend/src/services/release-management.ts | GET /api/publish/bots/{botId}/prepare |
| createUserApp | console/frontend/src/services/release-management.ts | POST /api/publish-api/create-user-app |
| getAppList | console/frontend/src/services/release-management.ts | GET /api/publish-api/app-list |
| createBotApi | console/frontend/src/services/release-management.ts | POST /api/publish-api/create-bot-api |
| getBotApiInfo | console/frontend/src/services/release-management.ts | GET /api/publish-api/get-bot-api-info |

## 7. 模块间依赖

### 依赖的模块
- **commons**：依赖公共服务（认证、权限校验）
- **bot-management**：发布需要 Bot 信息
- **workflow**：工作流 Bot 的版本管理

### 被依赖的模块
- 无（Publish 是终端模块，不被其他模块依赖）

## 8. 技术特性

### 8.1 策略模式
- 使用策略模式实现多渠道发布
- 每个渠道有独立的发布策略（PublishStrategy）
- 通过 PublishStrategyFactory 获取对应的策略
- 易于扩展新的发布渠道

### 8.2 统一发布接口
- 所有渠道使用统一的发布接口（`/publish/bots/{botId}`）
- 通过 `publishType` 参数区分渠道
- 通过 `action` 参数区分发布/下架
- 简化前端调用逻辑

### 8.3 限流保护
- 使用 `@RateLimit` 注解防止 API 滥用
- 不同接口有不同的限流策略（如发布 10 次/分钟，查询 30 次/分钟）

### 8.4 权限校验
- 所有发布操作都需要进行权限校验
- 只能发布自己创建的 Bot
- 使用 `BotPermissionUtil` 进行权限校验

### 8.5 审核机制
- 助手市场发布需要审核
- 审核状态：审核中、已通过、已拒绝、修改审核中
- 审核拒绝时需要提供拒绝原因

### 8.6 多渠道管理
- 一个 Bot 可以同时发布到多个渠道
- 使用 `publishChannels` 字段记录已发布的渠道（逗号分隔）
- 支持单独下架某个渠道

### 8.7 使用统计
- 记录 Bot 的使用统计（对话数、用户数、Token 数）
- 支持总览统计和时间序列统计
- 支持按日期范围筛选

### 8.8 追踪日志
- 记录 Bot 的所有调用日志
- 支持按时间范围、状态、用户筛选
- 用于调试和监控

### 8.9 版本管理
- 工作流 Bot 支持版本管理
- 记录版本历史（版本号、创建时间、部署状态）
- 支持回滚到历史版本

## 9. 注意事项

1. **权限校验**：所有发布操作都需要进行权限校验，只能发布自己创建的 Bot
2. **审核机制**：助手市场发布需要审核，审核通过后才能在市场展示
3. **多渠道管理**：一个 Bot 可以同时发布到多个渠道，需要正确管理 `publishChannels` 字段
4. **限流保护**：发布接口有严格的限流策略，需要合理使用
5. **API Key 安全**：API 发布后生成的 API Key 需要妥善保管，不能泄露
6. **微信配置**：微信发布需要正确配置 appId 和 redirectUrl
7. **飞书配置**：飞书发布需要正确配置 appId 和 appSecret
8. **MCP 配置**：MCP 发布需要正确配置 serverName、description、content、icon、args
9. **使用统计**：使用统计数据可能有延迟，不是实时数据
10. **追踪日志**：追踪日志数据量可能很大，需要合理设置分页和筛选条件
11. **版本管理**：只有工作流 Bot 支持版本管理，普通 Bot 不支持
12. **下架操作**：下架 Bot 后，用户将无法继续使用该 Bot