---
module: chat
generated: 2026-03-04
---

# Chat 模块文档

## 1. 模块概述

Chat（聊天）模块是 Astron Agent Console 的核心交互模块，提供用户与 AI 助手的实时对话能力。模块支持 SSE 流式输出、多轮对话、对话历史管理、文件上传、工作流集成、虚拟人播报、语音识别等功能。用户可以创建多个对话列表，每个对话列表关联一个 Bot，支持对话分支（全新对话）、停止生成、重新生成、清除历史等操作。

## 2. 后端 API 清单

### 2.1 ChatMessageController (`/chat-message`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/chat-message/chat | ChatMessageController | 需认证 | 基于 chatId 进行聊天对话（SSE 流式） |
| POST | /api/chat-message/re-answer | ChatMessageController | 需认证 | 重新生成对话结果（SSE 流式） |
| POST | /api/chat-message/bot-debug | ChatMessageController | 需认证 | Bot 单步调试聊天接口（SSE 流式） |
| POST | /api/chat-message/stop | ChatMessageController | 需认证 | 中止生成（停止 SSE 流） |
| GET | /api/chat-message/clear | ChatMessageController | 需认证 | 清除聊天历史 |

### 2.2 ChatHistoryController (`/chat-history`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /api/chat-history/all/{chatId} | ChatHistoryController | 需认证 | 根据 chatId 获取聊天历史 |

### 2.3 ChatListController (`/chat-list`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/chat-list/all-chat-list | ChatListController | 需认证 | 获取所有聊天列表 |
| POST | /api/chat-list/v1/create-chat-list | ChatListController | 需认证 | 创建聊天列表 |
| POST | /api/chat-list/v1/del-chat-list | ChatListController | 需认证 | 删除聊天列表 |
| GET | /api/chat-list/v1/get-bot-info | ChatListController | 需认证 | 获取 Bot 信息 |

### 2.4 ChatRestartController (`/chat-restart`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/chat-restart/restart | ChatRestartController | 需认证 | 开启全新对话 |

### 2.5 ChatEnhanceController (`/chat-enhance`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/chat-enhance/save-file | ChatEnhanceController | 需认证 | 保存文件并绑定到聊天 |
| POST | /api/chat-enhance/unbind-file | ChatEnhanceController | 需认证 | 解绑文件与 ChatId |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| chat_req_records | ChatReqRecords | 聊天请求记录表 |
| chat_resp_records | ChatRespRecords | 聊天响应记录表 |
| chat_list | ChatList | 聊天列表表 |
| chat_tree_index | ChatTreeIndex | 聊天树索引表（支持多轮对话分支） |

### 关键字段

#### ChatReqRecords（聊天请求记录表）
```java
@Data
public class ChatReqRecords {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private Long chatId;                // 聊天 ID
    private String uid;                 // 用户 ID
    private String message;             // 问题内容
    private Integer clientType;         // 客户端类型：0-未知，1-PC，2-H5
    private Integer modelId;            // 多模态相关 ID
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
    private Integer dateStamp;          // 日期戳
    private Integer newContext;         // Bot 新上下文：1-是，0-否
}
```

#### ChatRespRecords（聊天响应记录表）
```java
@Data
public class ChatRespRecords {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String uid;                 // 用户 ID
    private Long chatId;                // 聊天 ID
    private Long reqId;                 // 聊天问题 ID（一问一答）
    private String sid;                 // 引擎序列号 SID
    private Integer answerType;         // 回答类型：1-热修复，2-GPT
    private String message;             // 回答消息
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
    private Integer dateStamp;          // 日期戳
}
```

#### ChatList（聊天列表表）
```java
@Data
public class ChatList {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String uid;                 // 用户 ID
    private String title;               // 聊天列表标题
    @TableLogic
    private Integer isDelete;           // 删除状态：0-未删除，1-已删除
    private Integer enable;             // 启用状态：1-可用，0-不可用
    private Integer botId;              // 智能体 ID
    private Integer sticky;             // 置顶状态：0-未置顶，1-已置顶
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 修改时间
    private Integer isModel;            // 多模态：0-否，1-是
    private String enabledPluginIds;    // 当前对话列表启用的插件 ID
    private Integer isBotweb;           // 是否智能体 web 应用：0-否，1-是
    private String fileId;              // 文档问答 ID
    private Integer rootFlag;           // 是否根聊天：1-是，0-否
    private Long personalityId;         // 个性化 ID
    private Long gclId;                 // 群聊主键 ID，0 表示非群聊
}
```

#### ChatTreeIndex（聊天树索引表）
```java
@Data
public class ChatTreeIndex {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private Long rootChatId;            // 根聊天 ID
    private Long childChatId;           // 子聊天 ID
    private String uid;                 // 用户 ID
    private LocalDateTime createTime;   // 创建时间
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| ChatMessageController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/chat/ChatMessageController.java | 聊天消息控制器（SSE 流式输出） |
| ChatHistoryController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/chat/ChatHistoryController.java | 聊天历史管理 |
| ChatListController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/chat/ChatListController.java | 聊天列表管理 |
| ChatRestartController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/chat/ChatRestartController.java | 全新对话管理 |
| ChatEnhanceController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/chat/ChatEnhanceController.java | 文件上传和绑定 |
| BotChatService | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/chat/BotChatService.java | Bot 聊天核心业务逻辑 |
| SseEmitterUtil | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/util/SseEmitterUtil.java | SSE 流式输出工具类 |

### 关键业务逻辑

#### SSE 流式聊天实现

**后端实现**：
```java
@PostMapping(path = "/chat", produces = "text/event-stream;charset=UTF-8")
public SseEmitter chat(@RequestParam Long chatId, @RequestParam String text) {
    String sseId = RandomUtil.randomString(8);
    SseEmitter sseEmitter = SseEmitterUtil.createSseEmitter();

    // 验证参数和权限
    validateChatRequest(chatId, text, sseId, sseEmitter);

    // 构建请求并调用 BotChatService
    ChatBotReqDto chatBotReqDto = buildChatBotRequest(...);
    botChatService.chatMessageBot(chatBotReqDto, sseEmitter, sseId, ...);

    return sseEmitter;
}
```

**SSE 数据格式**：
```json
{
  "type": "start|content|end",
  "sseId": "abc123",
  "choices": [{
    "delta": {
      "content": "流式输出的文本内容",
      "reasoning_content": "思考链内容",
      "tool_calls": [{"deskToolName": "web_search"}]
    }
  }],
  "end": false,
  "id": 12345,
  "reqId": 67890,
  "workflow_step": {"progress": "0.5"}
}
```

#### 停止生成机制

**后端实现**（使用 Redis Pub/Sub 实现跨实例停止）：
```java
@PostMapping("/stop")
public StopStreamResponse stopStream(@RequestParam String streamId) {
    RTopic topic = redissonClient.getTopic(STOP_GENERATE_SUBSCRIBE_PUBLISH_CHANNEL);
    topic.publish(streamId);
    return StopStreamResponse.success(streamId);
}

@PostConstruct
public void subscribe() {
    RTopic topic = redissonClient.getTopic(STOP_GENERATE_SUBSCRIBE_PUBLISH_CHANNEL);
    topic.addListener(String.class, (channel, msg) -> {
        SseEmitterUtil.stopStream(msg);
    });
}
```

#### 多轮对话树结构

使用 `ChatTreeIndex` 表实现对话分支：
- `rootChatId`：根对话 ID
- `childChatId`：子对话 ID（每次"全新对话"创建新的 childChatId）

**全新对话流程**：
1. 前端调用 `/chat-restart/restart?chatId={chatId}`
2. 后端创建新的 `ChatTreeIndex` 记录
3. 返回新的 `chatId`
4. 前端使用新 `chatId` 继续对话

#### 文件上传流程

1. **获取 S3 预签名 URL**：`getS3PresignUrl(objectKey, fileType)`
2. **上传文件到 S3**：`uploadFileToS3(url, arrayBuffer, contentType)`
3. **绑定文件到对话**：`uploadFileBindChat({ chatId, fileUrl, fileName, ... })`
4. **解绑文件**：`unBindChatFile({ chatId, fileId })`

#### 工作流集成

**工作流操作类型**：
- `resume`：恢复工作流
- `ignore`：忽略当前节点
- `abort`：中止工作流

**问答节点**：
- 后端返回 `option` 数组和 `content`
- 前端展示选项按钮
- 用户点击后发送选项 ID 继续工作流

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 聊天页面 | /chat/:botId/:version? | console/frontend/src/pages/chat-page/index.tsx | 聊天页面主容器 |

### 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| ChatHeader | console/frontend/src/pages/chat-page/components/chat-header.tsx | 聊天页面头部 |
| ChatSide | console/frontend/src/pages/chat-page/components/chat-side.tsx | 聊天侧边栏 |
| ChatInput | console/frontend/src/pages/chat-page/components/chat-input.tsx | 聊天输入框 |
| MessageList | console/frontend/src/pages/chat-page/components/message-list.tsx | 消息列表 |
| SourceInfoBox | console/frontend/src/pages/chat-page/components/source-info-box.tsx | 溯源信息展示 |
| FileGridDisplay | console/frontend/src/pages/chat-page/components/file-grid-display.tsx | 文件网格展示 |
| WorkflowNodeOptions | console/frontend/src/pages/chat-page/components/workflow-node-options.tsx | 工作流节点选项 |
| DeepThinkProgress | console/frontend/src/pages/chat-page/components/deep-think-progress.tsx | 深度思考进度 |
| RecorderCom | console/frontend/src/pages/chat-page/components/recorder-com.tsx | 录音组件 |
| VmsInteractionCmp | console/frontend/src/components/vms-interaction-cmp | 虚拟人交互组件 |

## 6. 前端状态管理

| Store | 路径 | 管理的状态 |
|-------|------|-----------|
| useChatStore | console/frontend/src/store/chat-store.ts | 聊天状态（messageList、streamingMessage、streamId、isLoading、currentToolName、traceSource、deepThinkText、workflowOperation、workflowOption） |

### 核心状态操作

- `startStreamingMessage()`：开始流式消息（添加空消息到列表）
- `updateStreamingMessage()`：更新流式消息内容
- `finishStreamingMessage()`：完成流式消息（添加 sid 和 reqId）
- `clearStreamingMessage()`：清除流式消息

## 7. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| getBotInfoApi | console/frontend/src/services/chat.ts | GET /api/chat-list/v1/get-bot-info |
| getWorkflowBotInfoApi | console/frontend/src/services/chat.ts | GET /api/workflow/web/info |
| getChatHistory | console/frontend/src/services/chat.ts | GET /api/chat-history/all/{chatId} |
| postChatList | console/frontend/src/services/chat.ts | POST /api/chat-list/all-chat-list |
| postNewChat | console/frontend/src/services/chat.ts | POST /api/chat-restart/restart |
| postStopChat | console/frontend/src/services/chat.ts | POST /api/chat-message/stop |
| clearChatList | console/frontend/src/services/chat.ts | GET /api/chat-message/clear |
| postCreateChat | console/frontend/src/services/chat.ts | POST /api/chat-list/v1/create-chat-list |
| deleteChatList | console/frontend/src/services/chat.ts | POST /api/chat-list/v1/del-chat-list |
| getRtasrToken | console/frontend/src/services/chat.ts | POST /api/rtasr/rtasr-sign |
| getShareAgentKey | console/frontend/src/services/chat.ts | POST /api/share/get-share-key |
| createChatByShareKey | console/frontend/src/services/chat.ts | POST /api/share/add-shared-agent |
| getS3PresignUrl | console/frontend/src/services/chat.ts | GET /api/s3/presign |
| uploadFileToS3 | console/frontend/src/services/chat.ts | PUT (S3 URL) |
| uploadFileBindChat | console/frontend/src/services/chat.ts | POST /api/chat-enhance/save-file |
| unBindChatFile | console/frontend/src/services/chat.ts | POST /api/chat-enhance/unbind-file |
| getTtsSign | console/frontend/src/services/chat.ts | GET /api/voice/tts-sign |
| getVcnList | console/frontend/src/services/chat.ts | GET /api/voice/get-pronunciation-person |

## 8. 模块间依赖

### 依赖的模块
- **commons**：依赖公共服务（认证、多租户、SSE 工具类）
- **bot-management**：Chat 需要调用 Bot 进行对话
- **workflow**：Chat 需要集成工作流引擎
- **knowledge**：Chat 需要调用知识库进行检索

### 被依赖的模块
- 无（Chat 是终端用户交互模块，不被其他模块依赖）

## 9. 技术特性

### 9.1 SSE 流式输出
- 使用 `@microsoft/fetch-event-source` 库实现前端 SSE 客户端
- 后端使用 `SseEmitter` 实现流式输出
- 支持流式更新消息内容（逐字输出）
- 支持流式输出思考链（reasoning_content）
- 支持流式输出工具调用信息

### 9.2 停止生成机制
- 前端使用 `AbortController` 中止请求
- 后端使用 Redis Pub/Sub 实现跨实例停止
- 支持多实例部署下的停止生成

### 9.3 多轮对话树
- 使用 `ChatTreeIndex` 表实现对话分支
- 支持"全新对话"功能（创建新的对话分支）
- 保留历史对话记录

### 9.4 工作流集成
- 支持工作流操作（resume、ignore、abort）
- 支持问答节点（展示选项按钮）
- 支持工作流进度展示（workflow_step.progress）

### 9.5 文件上传
- 使用 S3 预签名 URL 上传文件
- 支持文件绑定到对话
- 支持文件解绑

### 9.6 虚拟人播报
- 支持虚拟人播报（VMS）
- 支持语音通话 + 虚拟人（phoneVms）
- 使用 `VmsInteractionCmp` 组件集成 VMS SDK

### 9.7 语音识别
- 支持实时语音识别（RTASR）
- 获取 RTASR Token 进行语音识别
- 支持录音组件（RecorderCom）

### 9.8 溯源信息
- 支持知识库溯源（traceSource）
- 展示引用的知识库文档
- 支持点击查看原文

### 9.9 深度思考
- 支持深度思考模式（deepThinkText）
- 展示思考链内容（reasoning_content）
- 支持深度思考进度展示

### 9.10 工具调用
- 支持工具调用（tool_calls）
- 展示当前调用的工具名称（currentToolName）
- 支持工具调用结果展示

### 9.11 状态管理
- 使用 Zustand 实现轻量级全局状态管理
- 支持流式消息状态管理
- 支持消息列表状态管理

### 9.12 软删除
- 使用 `@TableLogic` 实现逻辑删除
- 删除的聊天列表不会物理删除，可以恢复

## 10. 注意事项

1. **SSE 连接管理**：SSE 连接需要正确处理超时和错误，避免连接泄漏
2. **停止生成**：停止生成需要同时调用后端接口和中止 AbortController
3. **流式消息状态**：流式消息需要正确管理状态（开始、更新、完成、清除）
4. **对话树结构**：全新对话需要创建新的 ChatTreeIndex 记录
5. **文件上传**：文件上传需要先获取 S3 预签名 URL，再上传到 S3，最后绑定到对话
6. **工作流集成**：工作流操作需要正确传递 workflowOperation 参数
7. **虚拟人播报**：虚拟人播报需要正确集成 VMS SDK
8. **语音识别**：语音识别需要获取 RTASR Token
9. **溯源信息**：溯源信息需要正确解析 traceSource 数据
10. **深度思考**：深度思考需要正确解析 reasoning_content 数据
11. **工具调用**：工具调用需要正确解析 tool_calls 数据
12. **逻辑删除**：聊天列表使用逻辑删除（`isDelete` 字段），不是物理删除
13. **Redis Pub/Sub**：停止生成使用 Redis Pub/Sub，需要确保 Redis 可用
14. **AbortController**：前端需要正确管理 AbortController，避免内存泄漏