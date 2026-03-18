---
module: workflow
generated: 2026-03-04
---

# Workflow 模块文档

## 1. 模块概述

Workflow（工作流）模块是 Astron Console 的核心功能之一，提供可视化的工作流编排能力。用户可以通过拖拽节点的方式构建 AI 工作流，支持多种节点类型（LLM、知识库、Agent、代码执行等），并支持工作流的调试、发布、版本管理和多渠道发布（微信、星火桌面、API、MCP）。

## 2. 后端 API 清单

### 2.1 WorkflowController

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /workflow/list | WorkflowController | @SpacePreAuth | 获取工作流列表（分页） |
| GET | /workflow | WorkflowController | @SpacePreAuth | 获取工作流详情 |
| POST | /workflow | WorkflowController | @SpacePreAuth | 创建工作流 |
| PUT | /workflow | WorkflowController | @SpacePreAuth | 更新工作流信息 |
| DELETE | /workflow | WorkflowController | 无 | 删除工作流（逻辑删除） |
| GET | /workflow/clone | WorkflowController | 无 | 克隆工作流 |
| POST | /workflow/internal-clone | WorkflowController | 无 | 内部克隆（需密码） |
| POST | /workflow/build | WorkflowController | @SpacePreAuth | 构建工作流 |
| POST | /workflow/node/debug/{nodeId} | WorkflowController | 无 | 调试单个节点 |
| POST | /workflow/dialog | WorkflowController | 无 | 保存对话记录 |
| GET | /workflow/dialog/list | WorkflowController | 无 | 获取对话记录列表 |
| GET | /workflow/dialog/clear | WorkflowController | 无 | 清空对话记录 |
| GET | /workflow/can-publish | WorkflowController | 无 | 检查是否可发布 |
| GET | /workflow/can-publish-set | WorkflowController | 无 | 设置为可发布 |
| GET | /workflow/can-publish-set-not | WorkflowController | 无 | 设置为不可发布 |
| POST | /workflow/code/run | WorkflowController | 无 | 运行代码节点 |
| GET | /workflow/square | WorkflowController | 无 | 获取工作流广场列表 |
| POST | /workflow/public-copy | WorkflowController | 无 | 复制公开工作流 |
| GET | /workflow/auto-add-eval-set-data | WorkflowController | 无 | 自动添加评测集数据 |
| GET | /workflow/node-template | WorkflowController | 无 | 获取节点模板 |
| GET | /workflow/is-simple-io | WorkflowController | 无 | 判断是否为简单 IO 工作流 |
| GET | /workflow/trainable-nodes | WorkflowController | 无 | 获取可训练节点 |
| GET | /workflow/eval-page-first-time | WorkflowController | 无 | 评测页首次访问标记 |
| POST | /workflow/chat | WorkflowController | 无 | SSE 聊天接口 |
| POST | /workflow/resume | WorkflowController | 无 | SSE 恢复聊天 |
| POST | /workflow/upload-file | WorkflowController | 无 | 上传文件 |
| GET | /workflow/get-inputs-yype | WorkflowController | 无 | 获取输入类型 |
| GET | /workflow/get-inputs-info | WorkflowController | 无 | 获取输入信息 |
| POST | /workflow/get-model-info | WorkflowController | 无 | 获取模型信息 |
| POST | /workflow/get-node-error-info | WorkflowController | 无 | 获取节点错误信息 |
| POST | /workflow/get-user-feedback-error-info | WorkflowController | 无 | 获取用户反馈错误信息 |
| GET | /workflow/get-mcp-server-list | WorkflowController | 无 | 获取 MCP 服务器列表 |
| GET | /workflow/get-mcp-server-list-locally | WorkflowController | 无 | 获取本地 MCP 服务器列表 |
| GET | /workflow/get-agent-strategy | WorkflowController | 无 | 获取 Agent 策略 |
| GET | /workflow/get-knowledge-pro-strategy | WorkflowController | 无 | 获取知识库 Pro 策略 |
| POST | /workflow/debug-server-tool | WorkflowController | 无 | 调试 MCP 工具 |
| GET | /workflow/get-server-tool-detail | WorkflowController | 无 | 获取 MCP 工具详情 |
| GET | /workflow/get-server-tool-detail-locally | WorkflowController | 无 | 获取本地 MCP 工具详情 |
| GET | /workflow/get-env-key | WorkflowController | 无 | 获取环境变量 Key |
| POST | /workflow/push-env-key | WorkflowController | 无 | 推送环境变量 Key |
| GET | /workflow/replace-appId | WorkflowController | 无 | 替换 AppId |
| GET | /workflow/has-qa-node | WorkflowController | 无 | 检查是否有 QA 节点 |
| POST | /workflow/add-comparisons | WorkflowController | 无 | 添加 Prompt 对比 |
| POST | /workflow/delete-comparisons | WorkflowController | 无 | 删除 Prompt 对比 |
| GET | /workflow/get-list-by-LLM | WorkflowController | 无 | 按状态获取工作流列表 |
| GET | /workflow/get-workflow-prompt-status | WorkflowController | 无 | 获取工作流 Prompt 对比状态 |
| GET | /workflow/export/{id} | WorkflowController | 无 | 导出工作流为 YAML |
| POST | /workflow/import | WorkflowController | 无 | 从 YAML 导入工作流 |
| POST | /workflow/save-comparisons | WorkflowController | 无 | 保存 Prompt 对比 |
| GET | /workflow/list-comparisons | WorkflowController | 无 | 获取 Prompt 对比列表 |
| POST | /workflow/feedback | WorkflowController | 无 | 提交反馈 |
| GET | /workflow/feedback-list | WorkflowController | 无 | 获取反馈列表 |
| GET | /workflow/get-flow-advanced-config | WorkflowController | 无 | 获取工作流高级配置 |
| GET | /workflow/agent-node/prompt-template | WorkflowController | 无 | 获取 Agent 节点 Prompt 模板列表 |
| GET | /workflow/copy-flow | WorkflowController | 无 | 复制工作流协议 |
| GET | /workflow/get-max-version | WorkflowController | 无 | 获取最大版本号 |
| GET | /workflow/get-talk-agent-config | WorkflowController | 无 | 获取语音 Agent 配置 |

### 2.2 VersionController

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /workflow/version/list | VersionController | 无 | 按 flowId 查询版本列表（分页） |
| GET | /workflow/version/list-botId | VersionController | 无 | 按 botId 查询版本列表（分页） |
| POST | /workflow/version | VersionController | 无 | 创建新版本 |
| POST | /workflow/version/restore | VersionController | 无 | 恢复版本 |
| POST | /workflow/version/update-channel-result | VersionController | 无 | 更新渠道发布结果 |
| POST | /workflow/version/get-version-name | VersionController | 无 | 获取版本名称 |
| GET | /workflow/version/get-max-version | VersionController | 无 | 获取最大版本号 |
| POST | /workflow/version/get-version-sys-data | VersionController | 无 | 获取版本系统数据 |
| POST | /workflow/version/have-version-sys-data | VersionController | 无 | 检查是否有版本系统数据 |
| GET | /workflow/version/publish-result | VersionController | 无 | 查询发布结果 |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| workflow | Workflow | 工作流主表 |
| workflow_version | WorkflowVersion | 工作流版本表 |
| workflow_dialog | WorkflowDialog | 工作流对话记录表 |
| workflow_config | WorkflowConfig | 工作流配置表（语音 Agent） |
| workflow_feedback | WorkflowFeedback | 工作流反馈表 |
| workflow_comparison | WorkflowComparison | 工作流 Prompt 对比表 |
| workflow_node_history | WorkflowNodeHistory | 工作流节点历史表 |

### 关键字段

#### Workflow（工作流主表）
```java
@Data
public class Workflow {
    @TableId(type = IdType.AUTO)
    Long id;                    // 主键
    String appId;               // 应用 ID
    String flowId;              // 工作流唯一标识
    String name;                // 工作流名称
    String description;         // 描述
    String uid;                 // 创建用户 ID
    Boolean deleted;            // 逻辑删除标记
    Boolean isPublic;           // 是否公开
    Date createTime;            // 创建时间
    Date updateTime;            // 更新时间
    String data;                // 工作流协议数据（JSON）
    String publishedData;       // 已发布的协议数据
    String avatarIcon;          // 头像图标
    String avatarColor;         // 头像颜色
    Integer status;             // 状态
    Boolean canPublish;         // 是否可发布
    Boolean appUpdatable;       // 应用是否可更新
    Integer order;              // 排序
    String edgeType;            // 边类型（curve/straight）
    Integer source;             // 来源
    Boolean editing;            // 是否正在编辑
    Boolean evalPageFirstTime;  // 评测页首次访问
    String advancedConfig;      // 高级配置（JSON）
    String ext;                 // 扩展字段
    Integer category;           // 分类
    Long spaceId;               // 空间 ID
    Integer type;               // 类型
}
```

#### WorkflowVersion（工作流版本表）
```java
@Data
public class WorkflowVersion {
    @TableId(type = IdType.AUTO)
    Long id;                    // 主键
    String botId;               // Bot ID
    String name;                // 版本名称
    String versionNum;          // 版本号
    String data;                // 工作流协议数据
    String flowId;              // 工作流 ID
    Long deleted;               // 逻辑删除标记
    Date createdTime;           // 创建时间
    Date updatedTime;           // 更新时间
    Long isVersion;             // 是否为版本
    String sysData;             // 核心系统协议数据
    String description;         // 描述
    Long publishChannel;        // 发布渠道（1:微信 2:星火桌面 3:API 4:MCP）
    String publishResult;       // 发布结果
    String advancedConfig;      // 高级配置
}
```

#### WorkflowDialog（对话记录表）
```java
@Data
public class WorkflowDialog {
    @TableId(type = IdType.AUTO)
    Long id;                    // 主键
    String uid;                 // 用户 ID
    Long workflowId;            // 工作流 ID
    String question;            // 问题
    String answer;              // 回答
    String data;                // 数据（JSON）
    Date createTime;            // 创建时间
    Boolean deleted;            // 逻辑删除标记
    String sid;                 // 会话 ID
    Integer type;               // 类型
    String questionItem;        // 问题项
    String answerItem;          // 回答项
    String chatId;              // 聊天 ID
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| WorkflowController | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/workflow/WorkflowController.java | 工作流主控制器，处理工作流的 CRUD、调试、发布、SSE 聊天等 |
| VersionController | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/workflow/VersionController.java | 版本管理控制器，处理版本的创建、恢复、查询等 |
| WorkflowService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/workflow/WorkflowService.java | 工作流核心业务逻辑（4231 行，包含工作流编排、节点执行、SSE 流式输出等） |
| VersionService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/workflow/VersionService.java | 版本管理服务 |
| WorkflowExportService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/workflow/WorkflowExportService.java | 工作流导入导出服务（YAML 格式） |
| TalkAgentService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/workflow/TalkAgentService.java | 语音 Agent 服务 |
| WorkflowSseEventSourceListener | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/sse/WorkflowSseEventSourceListener.java | SSE 事件监听器 |

### 关键业务逻辑

#### 工作流执行流程（SSE 聊天）
1. 前端通过 `/workflow/chat` 发起 SSE 请求
2. `WorkflowService.sseChat()` 解析工作流协议（nodes + edges）
3. 按照节点依赖关系顺序执行各节点
4. 每个节点执行结果通过 SSE 流式推送给前端
5. 支持节点类型：LLM、知识库、Agent、代码执行、条件判断、循环等
6. 支持中断和恢复（`/workflow/resume`）

#### 工作流版本管理
1. 每次发布到渠道时创建新版本（`WorkflowVersion`）
2. 版本包含完整的工作流协议数据（`data` 字段）
3. 支持版本恢复（`/workflow/version/restore`）
4. 支持按渠道查询发布状态

#### 工作流导入导出
1. 导出：将工作流协议数据转换为 YAML 格式（`/workflow/export/{id}`）
2. 导入：解析 YAML 文件并创建新工作流（`/workflow/import`）
3. 支持跨空间导入导出

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 工作流编辑器 | /workflow/:id | console/frontend/src/pages/workflow/index.tsx | 工作流可视化编辑主页面 |
| 工作流分析 | /workflow/workflow-analysis | console/frontend/src/pages/workflow/workflow-analysis/index.tsx | 工作流数据分析页面 |

### 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| FlowContainer | console/frontend/src/pages/workflow/components/flow-container/index.tsx | 工作流画布容器（基于 ReactFlow） |
| FlowHeader | console/frontend/src/pages/workflow/components/flow-header/index.tsx | 工作流头部（标题、保存、发布等） |
| NodeList | console/frontend/src/pages/workflow/components/node-list/index.tsx | 节点列表（可拖拽） |
| BtnGroups | console/frontend/src/pages/workflow/components/btn-groups/index.tsx | 工具按钮组 |
| FlowModal | console/frontend/src/pages/workflow/components/flow-modal/index.tsx | 工作流弹窗 |
| FlowDrawer | console/frontend/src/pages/workflow/components/flow-drawer/index.tsx | 工作流抽屉（节点配置） |

## 6. 前端状态管理

| Store | 路径 | 管理的状态 |
|-------|------|-----------|
| useFlowsManager | console/frontend/src/components/workflow/store/use-flows-manager.ts | 全局工作流管理（当前工作流、模型列表、画布状态等） |
| useFlowStore | console/frontend/src/components/workflow/store/use-flow-store.ts | 单个工作流状态（节点、边、历史记录、缩放等） |

## 7. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| listFlows | console/frontend/src/services/flow.ts | GET /workflow/list |
| createFlowAPI | console/frontend/src/services/flow.ts | POST /workflow |
| deleteFlowAPI | console/frontend/src/services/flow.ts | DELETE /workflow |
| getFlowDetailAPI | console/frontend/src/services/flow.ts | GET /workflow |
| copyFlowAPI | console/frontend/src/services/flow.ts | GET /workflow/clone |
| saveFlowAPI | console/frontend/src/services/flow.ts | PUT /workflow |
| buildFlowAPI | console/frontend/src/services/flow.ts | POST /workflow/build |
| addComparisons | console/frontend/src/services/flow.ts | POST /workflow/add-comparisons |
| saveDialogueAPI | console/frontend/src/services/flow.ts | POST /workflow/dialog |
| getDialogueAPI | console/frontend/src/services/flow.ts | GET /workflow/dialog/list |
| publishFlowAPI | console/frontend/src/services/flow.ts | POST /workflow/publish |
| isCanPublish | console/frontend/src/services/flow.ts | GET /workflow/can-publish |
| canPublishSetNotAPI | console/frontend/src/services/flow.ts | GET /workflow/can-publish-set-not |
| codeRun | console/frontend/src/services/flow.ts | POST /workflow/code/run |
| squareListFlows | console/frontend/src/services/flow.ts | GET /workflow/square |
| copyPublicFlowAPI | console/frontend/src/services/flow.ts | POST /workflow/public-copy |
| flowsNodeTemplate | console/frontend/src/services/flow.ts | GET /workflow/node-template |
| textNodeConfigList | console/frontend/src/services/flow.ts | GET /textNode/config/list |
| textNodeConfigSave | console/frontend/src/services/flow.ts | POST /textNode/config/save |
| textNodeConfigClear | console/frontend/src/services/flow.ts | GET /textNode/config/delete |
| workflowDialogClear | console/frontend/src/services/flow.ts | GET /workflow/dialog/clear |
| workflowReleaseStatusList | console/frontend/src/services/flow.ts | GET /workflow/release/status-list |
| getAiuiAgents | console/frontend/src/services/flow.ts | GET /workflow/release/aiui/agent-all |
| channelPublish | console/frontend/src/services/flow.ts | POST /workflow/release |
| getReleaseBulletin | console/frontend/src/services/flow.ts | GET /workflow/release/bulletin |
| getReleaseChannelInfo | console/frontend/src/services/flow.ts | GET /workflow/release/channel-info |
| getReleaseChannelStatus | console/frontend/src/services/flow.ts | GET /workflow/release/status |
| getAgentStrategyAPI | console/frontend/src/services/flow.ts | GET /workflow/get-agent-strategy |
| getKnowledgeProStrategyAPI | console/frontend/src/services/flow.ts | GET /workflow/get-knowledge-pro-strategy |
| getInputsType | console/frontend/src/services/flow.ts | POST /workflow/bot/get-inputs-type |
| workflowImport | console/frontend/src/services/flow.ts | POST /workflow/import |
| workflowDeleteComparisons | console/frontend/src/services/flow.ts | POST /workflow/delete-comparisons |
| getLatestWorkflow | console/frontend/src/services/flow.ts | GET /workflow/get-max-version |
| commonUploadUserIcon | console/frontend/src/services/flow.ts | POST /common/upload/user-icon |
| workflowExport | console/frontend/src/services/flow.ts | GET /workflow/export/{id} |

## 8. 模块间依赖

### 依赖的模块
- **model-management**：获取可用的 LLM 模型列表（`/llm/auth-list`）
- **knowledge**：知识库节点需要调用知识库服务
- **ai-tools**：Agent 节点需要调用 AI 工具服务
- **bot-management**：工作流可以关联到 Bot（`botId` 字段）
- **eval**：工作流评测功能依赖评测模块（`/eval/set/ver/data/change`）
- **commons**：依赖公共服务（文件上传、权限校验等）

### 被依赖的模块
- **bot-management**：Bot 可以关联工作流作为其对话引擎
- **publish**：发布模块需要获取工作流的发布状态和配置
- **chat**：聊天模块可能调用工作流进行对话

## 9. 技术特性

### 9.1 SSE 流式输出
- 使用 Spring `SseEmitter` 实现服务端推送
- 支持节点执行进度实时推送
- 支持中断和恢复机制

### 9.2 工作流协议
- 基于 JSON 格式存储工作流结构（nodes + edges）
- 支持多种节点类型：LLM、知识库、Agent、代码执行、条件判断、循环、HTTP 请求等
- 支持节点间数据传递和变量引用

### 9.3 多渠道发布
- 支持发布到微信公众号
- 支持发布到星火桌面
- 支持发布为 API 接口
- 支持发布为 MCP 服务器

### 9.4 版本管理
- 每次发布创建新版本
- 支持版本回滚
- 支持版本对比

### 9.5 Prompt 对比
- 支持同一工作流的多个 Prompt 版本对比
- 支持 A/B 测试

### 9.6 导入导出
- 支持 YAML 格式导入导出
- 支持跨空间迁移

## 10. 注意事项

1. **WorkflowService 复杂度高**：该类有 4231 行代码，包含大量业务逻辑，修改时需谨慎
2. **SSE 连接管理**：需要注意 SSE 连接的超时和异常处理
3. **工作流协议兼容性**：修改工作流协议结构时需考虑向后兼容
4. **权限控制**：大部分 API 使用 `@SpacePreAuth` 进行空间级权限校验
5. **逻辑删除**：工作流使用逻辑删除（`deleted` 字段），不是物理删除
