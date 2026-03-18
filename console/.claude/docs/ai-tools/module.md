---
module: ai-tools
generated: 2026-03-04
---

# AI Tools 模块文档

## 1. 模块概述

AI Tools（AI 工具箱）模块提供自定义 AI 工具的创建、管理和调试功能。用户可以通过配置 HTTP 接口、定义输入输出 Schema 的方式创建自定义工具，这些工具可以被 Bot 和 Workflow 中的 Agent 节点调用。模块还支持工具广场（Tool Square），用户可以发布和分享自己的工具，也可以收藏和使用他人的工具。此外，模块还支持 MCP（Model Context Protocol）服务器工具的集成。

## 2. 后端 API 清单

### 2.1 ToolBoxController

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /tool/create-tool | ToolBoxController | @SpacePreAuth | 创建工具 |
| POST | /tool/temporary-tool | ToolBoxController | @SpacePreAuth | 暂存工具（草稿） |
| PUT | /tool/update-tool | ToolBoxController | @SpacePreAuth | 编辑工具 |
| GET | /tool/list-tools | ToolBoxController | @SpacePreAuth | 获取工具列表（分页） |
| GET | /tool/detail | ToolBoxController | @SpacePreAuth | 获取工具详情 |
| GET | /tool/get-tool-default-icon | ToolBoxController | @SpacePreAuth | 获取工具默认图标 |
| DELETE | /tool/delete-tool | ToolBoxController | @SpacePreAuth | 删除工具 |
| POST | /tool/debug-tool | ToolBoxController | @SpacePreAuth | 调试工具 |
| POST | /tool/list-tool-square | ToolBoxController | @SpacePreAuth | 查询工具广场列表 |
| GET | /tool/favorite | ToolBoxController | @SpacePreAuth | 收藏/取消收藏工具 |
| GET | /tool/get-tool-version | ToolBoxController | @SpacePreAuth | 获取工具版本历史 |
| GET | /tool/get-tool-latestVersion | ToolBoxController | @SpacePreAuth | 获取工具最新版本 |
| GET | /tool/add-tool-operateHistory | ToolBoxController | 无 | 添加工具操作历史 |
| POST | /tool/feedback | ToolBoxController | 无 | 用户反馈 |
| GET | /tool/publish-square | ToolBoxController | 无 | 发布工具到广场 |
| GET | /tool/export | ToolBoxController | 无 | 导出工具 |
| POST | /tool/import | ToolBoxController | 无 | 导入工具 |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| tool_box | ToolBox | 工具主表 |
| tool_box_feedback | ToolBoxFeedback | 工具反馈表 |
| user_favorite_tool | UserFavoriteTool | 用户收藏工具表 |
| tool_box_operate_history | ToolBoxOperateHistory | 工具操作历史表 |
| bot_tool_rel | BotToolRel | Bot 与工具关联表 |
| flow_tool_rel | FlowToolRel | Workflow 与工具关联表 |
| mcp_tool_config | McpToolConfig | MCP 工具配置表 |

### 关键字段

#### ToolBox（工具主表）
```java
@Data
public class ToolBox implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String toolId;              // 核心系统工具标识
    private String name;                // 工具名称
    private String description;         // 工具描述
    private String icon;                // 头像图标
    private String userId;              // 用户 ID
    private Long spaceId;               // 空间 ID
    private String appId;               // AppId
    private String endPoint;            // 请求端点
    private String method;              // 请求方法（GET/POST/PUT/DELETE）
    private String webSchema;           // Web 协议
    private String schema;              // 协议（JSON Schema）
    private Integer visibility;         // 可见性：0-仅自己可见，1-部分用户可见
    private Boolean deleted;            // 是否删除：1-已删除，0-未删除
    private Timestamp createTime;       // 创建时间
    private Timestamp updateTime;       // 修改时间
    private Boolean isPublic;           // 是否公开
    private Integer favoriteCount;      // 收藏数
    private Integer usageCount;         // 使用次数
    private String toolTag;             // 工具标签
    private String operationId;         // 操作 ID
    private Integer creationMethod;     // 创建方式
    private Integer authType;           // 认证类型
    private String authInfo;            // 认证信息
    private Integer top;                // 是否置顶
    private Integer source;             // 来源
    private String displaySource;       // 显示来源
    private String avatarColor;         // 头像颜色
    private Integer status;             // 状态：0-草稿，1-正式
    private String version;             // 版本
    private String temporaryData;       // 暂存数据
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| ToolBoxController | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/tool/ToolBoxController.java | 工具箱控制器，处理工具的 CRUD、调试、广场等 |
| ToolBoxService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/tool/ToolBoxService.java | 工具箱核心业务逻辑 |
| BotToolRelService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/bot/BotToolRelService.java | Bot 与工具关联服务 |

### 关键业务逻辑

#### 工具创建流程
1. 用户填写工具基本信息（名称、描述、图标）
2. 配置 HTTP 接口（端点、方法、认证方式）
3. 定义输入输出 Schema（JSON Schema 格式）
4. 保存为草稿（`/tool/temporary-tool`）或直接创建（`/tool/create-tool`）
5. 工具状态：0-草稿，1-正式

#### 工具调试流程
1. 前端通过 `/tool/debug-tool` 发起调试请求
2. `ToolBoxService.debugToolV2()` 解析工具配置
3. 根据配置的 HTTP 接口发起实际请求
4. 返回调试结果（支持 300 秒超时）

#### 工具广场流程
1. 用户通过 `/tool/publish-square` 发布工具到广场
2. 其他用户通过 `/tool/list-tool-square` 浏览广场工具
3. 用户可以收藏工具（`/tool/favorite`）
4. 收藏后的工具可以在 Bot 和 Workflow 中使用

#### 工具版本管理
1. 每次更新工具时创建新版本
2. 支持查询版本历史（`/tool/get-tool-version`）
3. 支持获取最新版本（`/tool/get-tool-latestVersion`）

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 工具列表 | /tools | console/frontend/src/pages/tools/index.tsx | 工具列表页面 |
| 工具创建/编辑 | /tools/create | console/frontend/src/pages/tools/create/index.tsx | 工具创建和编辑页面 |
| 工具广场 | /tool-square | console/frontend/src/pages/tool-square/index.tsx | 工具广场页面 |

## 6. 前端状态管理

| Store | 路径 | 管理的状态 |
|-------|------|-----------|
| useToolStore | console/frontend/src/store/tool.ts | 工具相关状态（当前工具、工具列表等） |

## 7. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| createTool | console/frontend/src/services/plugin.ts | POST /tool/create-tool |
| temporaryTool | console/frontend/src/services/plugin.ts | POST /tool/temporary-tool |
| updateTool | console/frontend/src/services/plugin.ts | PUT /tool/update-tool |
| deleteTool | console/frontend/src/services/plugin.ts | DELETE /tool/delete-tool |
| getToolDetail | console/frontend/src/services/plugin.ts | GET /tool/detail |
| debugTool | console/frontend/src/services/plugin.ts | POST /tool/debug-tool |
| listTools | console/frontend/src/services/plugin.ts | GET /tool/list-tools |
| getToolDefaultIcon | console/frontend/src/services/plugin.ts | GET /tool/get-tool-default-icon |
| listToolSquare | console/frontend/src/services/plugin.ts | POST /tool/list-tool-square |
| getMcpServerList | console/frontend/src/services/plugin.ts | GET /workflow/get-mcp-server-list-locally |
| getServerToolDetailAPI | console/frontend/src/services/plugin.ts | GET /workflow/get-server-tool-detail-locally |
| debugServerToolAPI | console/frontend/src/services/plugin.ts | POST /workflow/debug-server-tool |
| getToolVersionList | console/frontend/src/services/plugin.ts | GET /tool/get-tool-version |
| getToolLatestVersion | console/frontend/src/services/plugin.ts | GET /tool/get-tool-latest-version |
| toolFeedback | console/frontend/src/services/plugin.ts | POST /tool/feedback |
| installPlugin | console/frontend/src/services/plugin.ts | POST /iflygpt/plugin/user/install |
| exportPlugin | console/frontend/src/services/plugin.ts | GET /tool/export |
| importPlugin | console/frontend/src/services/plugin.ts | POST /tool/import |
| mcpServerList | console/frontend/src/services/plugin.ts | GET /workflow/getMcpServerList |
| enableToolFavorite | console/frontend/src/services/tool.ts | GET /tool/favorite |

## 8. 模块间依赖

### 依赖的模块
- **workflow**：工具可以被 Workflow 的 Agent 节点调用（通过 `flow_tool_rel` 表关联）
- **bot-management**：工具可以被 Bot 调用（通过 `bot_tool_rel` 表关联）
- **commons**：依赖公共服务（文件上传、权限校验等）

### 被依赖的模块
- **workflow**：Workflow 的 Agent 节点需要调用工具
- **bot-management**：Bot 的对话流程中可能调用工具
- **chat**：聊天过程中 Agent 可能调用工具

## 9. 技术特性

### 9.1 JSON Schema 支持
- 工具的输入输出使用 JSON Schema 定义
- 支持复杂的数据结构和验证规则

### 9.2 HTTP 接口封装
- 支持 GET、POST、PUT、DELETE 等 HTTP 方法
- 支持多种认证方式（API Key、OAuth 等）
- 支持自定义请求头和请求体

### 9.3 MCP 协议支持
- 支持 MCP（Model Context Protocol）服务器工具
- 可以集成外部 MCP 服务器提供的工具

### 9.4 工具广场
- 用户可以发布工具到广场
- 支持工具收藏和使用统计
- 支持工具搜索和筛选

### 9.5 版本管理
- 每次更新工具时创建新版本
- 支持版本历史查询
- 支持版本回滚

### 9.6 导入导出
- 支持工具的导入导出
- 支持跨空间迁移

## 10. 注意事项

1. **工具调试超时**：调试接口支持 300 秒超时，需要注意长时间运行的工具
2. **权限控制**：大部分 API 使用 `@SpacePreAuth` 进行空间级权限校验
3. **逻辑删除**：工具使用逻辑删除（`deleted` 字段），不是物理删除
4. **工具状态**：工具有草稿和正式两种状态，只有正式状态的工具才能被 Bot 和 Workflow 使用
5. **Schema 验证**：工具的输入输出 Schema 需要符合 JSON Schema 规范