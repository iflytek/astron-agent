---
module: bot-management
generated: 2026-03-04
---

# Bot Management 模块文档

## 1. 模块概述

Bot Management（助手管理）模块是 Astron Agent Console 的核心模块之一，提供 AI 助手的全生命周期管理能力。用户可以创建、配置、发布、收藏和管理各类 AI 助手。模块支持多种助手类型（自定义、生活、职场、营销、写作、知识等），提供 AI 辅助生成（头像、开场白、输入示例、一句话生成）、人格配置、语音设置、数据集集成等功能。助手可以发布到助手市场、API、微信、MCP 等多个渠道。

## 2. 后端 API 清单

### 2.1 BotCreateController (`/bot`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/bot/create | BotCreateController | @SpacePreAuth + @RateLimit(1req/1s) | 创建工作流助手 |
| POST | /api/bot/update | BotCreateController | @SpacePreAuth + @RateLimit(1req/1s) | 更新工作流助手 |
| POST | /api/bot/type-list | BotCreateController | 无 | 获取助手类型列表 |
| POST | /api/bot/ai-avatar-gen | BotCreateController | @RateLimit(50req/day) | AI 生成助手头像 |
| POST | /api/bot/ai-sentence-gen | BotCreateController | @RateLimit(1req/1s) | 一句话生成助手 |
| POST | /api/bot/generate-input-example | BotCreateController | @RateLimit(1req/1s) | AI 生成输入示例 |
| POST | /api/bot/ai-prologue-gen | BotCreateController | @RateLimit(1req/1s) | AI 生成开场白 |
| GET | /api/bot/bot-model | BotCreateController | 无 | 获取 Bot 模型列表（默认+自定义） |
| GET | /api/bot/template | BotCreateController | 无 | 获取机器人模板（支持国际化） |

### 2.2 BotController (`/workflow`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/workflow/base-save | BotController | 无 | 保存/更新工作流助手基础信息 |
| POST | /api/workflow/publish | BotController | 无 | 发布助手到 MAAS |
| POST | /api/workflow/take-off-bot | BotController | @SpacePreAuth | 申请下架助手 |
| POST | /api/workflow/updateSynchronize | BotController | 无 | 星辰画布更新同步（外部回调） |
| POST | /api/workflow/copy-bot | BotController | @SpacePreAuth | 复制助手到指定空间 |

### 2.3 BotFavoriteController (`/bot/favorite`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/bot/favorite/list | BotFavoriteController | 无 | 获取收藏列表（分页） |
| POST | /api/bot/favorite/create | BotFavoriteController | 无 | 收藏助手 |
| POST | /api/bot/favorite/delete | BotFavoriteController | 无 | 取消收藏 |

### 2.4 TalkAgentController (`/talkAgent`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/talkAgent/getSceneList | TalkAgentController | 无 | 获取对话场景列表 |
| POST | /api/talkAgent/create | TalkAgentController | 无 | 创建对话助手 |
| POST | /api/talkAgent/upgradeWorkflow | TalkAgentController | 无 | 升级工作流版本 |
| POST | /api/talkAgent/saveHistory | TalkAgentController | 无 | 保存对话历史 |
| GET | /api/talkAgent/signature | TalkAgentController | 无 | 获取签名 |

### 2.5 PersonalityController (`/personality`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/personality/aiGenerate | PersonalityController | 无 | AI 生成人格描述 |
| POST | /api/personality/aiPolishing | PersonalityController | 无 | AI 润色人格描述 |
| GET | /api/personality/getCategory | PersonalityController | 无 | 获取人格分类列表 |
| GET | /api/personality/getRole | PersonalityController | 无 | 获取人格角色列表（分页） |

### 2.6 SpeakerTrainController (`/speaker/train`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/speaker/train/create | SpeakerTrainController | @SpacePreAuth + @RateLimit | 创建声音训练 |
| GET | /api/speaker/train/get-text | SpeakerTrainController | 无 | 获取训练文本 |
| GET | /api/speaker/train/train-speaker | SpeakerTrainController | @SpacePreAuth | 获取训练声音列表 |
| POST | /api/speaker/train/update-speaker | SpeakerTrainController | @SpacePreAuth | 更新训练声音 |
| POST | /api/speaker/train/delete-speaker | SpeakerTrainController | @SpacePreAuth | 删除训练声音 |

### 2.7 VoiceApiController (`/voice`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /api/voice/tts-sign | VoiceApiController | @RateLimit | 获取 TTS 签名 |
| GET | /api/voice/get-pronunciation-person | VoiceApiController | 无 | 获取发音人配置 |

### 2.8 PromptController (`/prompt`) - Toolkit 模块

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/prompt/enhance | PromptController | 无 | 增强 Prompt（SSE 流式） |
| POST | /api/prompt/next-question-advice | PromptController | 无 | 下一个问题建议 |
| POST | /api/prompt/ai-generate | PromptController | 无 | AI 生成内容（SSE 流式） |
| POST | /api/prompt/ai-code | PromptController | 无 | AI 代码操作（SSE 流式） |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| chat_bot_base | ChatBotBase | 用户创建的助手主表 |
| chat_bot_list | ChatBotList | 用户添加的助手表 |
| chat_bot_market | ChatBotMarket | 助手市场表 |
| bot_favorite | BotFavorite | 收藏表 |
| bot_template | BotTemplate | Bot 模板表 |
| bot_dataset | BotDataset | Bot 关联数据集表 |
| chat_bot_prompt_struct | ChatBotPromptStruct | Prompt 结构化配置表 |
| chat_bot_tag | ChatBotTag | Bot 标签表 |
| bot_type_list | BotTypeList | Bot 类型列表表 |

### 关键字段

#### ChatBotBase（用户创建的助手主表）
```java
@Data
public class ChatBotBase {
    @TableId(type = IdType.AUTO)
    private Integer id;                 // 主键
    private String uid;                 // 用户 ID
    private String botName;             // 助手名称
    private Integer botType;            // 助手类型：1-自定义，2-生活，3-职场，4-营销，5-写作，6-知识
    private String avatar;              // 头像
    private String pcBackground;        // PC 聊天背景
    private String appBackground;       // 移动端背景
    private Integer backgroundColor;    // 背景色方案：0-浅色，1-深色
    private String prompt;              // 指令
    private String prologue;            // 开场白
    private String botDesc;             // 描述
    @TableLogic
    private Integer isDelete;           // 删除状态：0-未删除，1-已删除
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
    private Integer supportContext;     // 多轮对话：0-不支持，1-支持
    private String botTemplate;         // 输入模板
    private Integer promptType;         // 指令类型：0-常规，1-结构化
    private String inputExample;        // 输入示例
    private Integer botwebStatus;       // 独立应用状态：0-禁用，1-启用
    private Integer version;            // 助手版本
    private Integer supportDocument;    // 文档支持：0-不支持，1-严格依据，2-可扩展
    private Integer supportSystem;      // 系统指令支持
    private Integer promptSystem;       // 系统指令状态
    private Integer supportUpload;      // 文档上传支持
    private String botNameEn;           // 英文名称
    private String botDescEn;           // 英文描述
    private Integer clientType;         // 客户端类型
    private String vcnCn;               // 中文语音
    private String vcnEn;               // 英文语音
    private Integer vcnSpeed;           // 语速
    private Integer isSentence;         // 一句话生成：0-否，1-是
    private String openedTool;          // 已启用工具（逗号分隔）
    private String clientHide;          // 隐藏客户端
    private Integer virtualBotType;     // 虚拟人格类型
    private Long virtualAgentId;        // 虚拟助手 ID
    private Integer style;              // 风格类型：0-原图，1-商务精英，2-休闲时刻
    private String background;          // 背景设置
    private String virtualCharacter;    // 角色设置
    private String model;               // 选用模型
    private String maasBotId;           // MAAS Bot ID
    private String prologueEn;          // 英文开场白
    private String inputExampleEn;      // 英文推荐问题
    private Long spaceId;               // 空间 ID
    private Long modelId;               // 模型 ID
}
```

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
    private String pcBackground;        // PC 背景
    private String appBackground;       // 移动端背景
    private Integer backgroundColor;    // 背景色方案
    private String prompt;              // 指令
    private String prologue;            // 开场白
    private Integer showOthers;         // 是否向他人展示 prompt：0-否，1-是
    private String botDesc;             // 描述
    private Integer botStatus;          // 状态：0-下架，1-审核中，2-已通过，3-已拒绝，4-修改审核中
    private String blockReason;         // 拒绝原因
    private Integer hotNum;             // 热度
    @TableLogic
    private Integer isDelete;           // 是否删除
    private Integer showIndex;          // 首页推荐：0-否，1-是
    private Integer sortHot;            // 热门排序位置
    private Integer sortLatest;         // 最新排序位置
    private LocalDateTime auditTime;    // 审核时间
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
    private Integer supportContext;     // 多轮对话支持
    private Integer version;            // 大模型版本
    private Integer showWeight;         // 推荐权重
    private Integer score;              // 审核评分
    private String clientHide;          // 隐藏客户端
    private String model;               // 模型类型
    private String openedTool;          // 使用的工具
    private Long modelId;               // 模型 ID
    private String publishChannels;     // 发布渠道：MARKET,API,WECHAT,MCP
    private Integer supportDocument;    // 知识库支持
}
```

#### BotFavorite（收藏表）
```java
@Data
public class BotFavorite {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String uid;                 // 用户 ID
    private Integer botId;              // Bot ID
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
}
```

#### BotDataset（Bot 关联数据集表）
```java
@Data
public class BotDataset {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private Long botId;                 // Bot ID
    private Long datasetId;             // 数据集 ID
    private String datasetIndex;        // 知识库数据集 ID
    private Integer isAct;              // 激活状态：0-未激活，1-激活，2-市场更新后审核中
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
    private String uid;                 // 用户 ID
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| BotCreateController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/bot/BotCreateController.java | Bot 创建和 AI 辅助生成 |
| BotController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/bot/BotController.java | Bot 基础操作（保存、发布、复制、下架） |
| BotFavoriteController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/bot/BotFavoriteController.java | 收藏管理 |
| TalkAgentController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/bot/TalkAgentController.java | 对话助手管理 |
| PersonalityController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/bot/PersonalityController.java | 人格配置 |
| SpeakerTrainController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/bot/SpeakerTrainController.java | 声音训练 |
| VoiceApiController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/bot/VoiceApiController.java | 语音服务 |
| BotService | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/bot/BotService.java | Bot 核心业务逻辑 |
| BotAIService | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/bot/BotAIService.java | AI 辅助生成服务 |
| BotTransactionalService | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/bot/BotTransactionalService.java | 事务性操作（复制 Bot） |

### 关键业务逻辑

#### Bot 创建流程
1. 用户填写基本信息（名称、描述、类型、头像）
2. 配置 Prompt（常规或结构化）
3. 设置开场白和输入示例（可使用 AI 生成）
4. 关联数据集（自有数据集 + MAAS 数据集）
5. 配置人格设置（可选）
6. 配置语音设置（可选）
7. 保存到 `chat_bot_base` 表
8. 同步到 MAAS 工作流引擎

#### Bot 发布流程
1. 调用 `/workflow/publish` 发布到 MAAS
2. 创建 API 接口（如果选择 API 渠道）
3. 更新 Bot 状态到 `chat_bot_market` 表
4. 设置发布渠道（MARKET、API、WECHAT、MCP）
5. 等待审核（如果发布到市场）

#### 收藏功能
1. 用户点击收藏按钮
2. 调用 `/bot/favorite/create` 创建收藏记录
3. 插入 `bot_favorite` 表
4. 前端更新 `isFavorite` 状态

#### AI 辅助生成
1. **头像生成**：用户输入描述 → 调用 `/bot/ai-avatar-gen` → 返回图片 URL
2. **一句话生成**：用户输入一句话 → 调用 `/bot/ai-sentence-gen` → 返回完整 Bot 配置
3. **开场白生成**：基于 Bot 信息 → 调用 `/bot/ai-prologue-gen` → 返回开场白
4. **输入示例生成**：基于 Bot 信息 → 调用 `/bot/generate-input-example` → 返回示例列表

#### 版本管理
1. 支持工作流版本（`version` 字段）
2. 用户可以从旧版本升级到新版本（`/talkAgent/upgradeWorkflow`）
3. 版本切换时保留历史配置

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 智能体管理 | /space/agent-page | console/frontend/src/pages/space-page/agent-page/index.tsx | 个人空间智能体管理页面 |
| Bot API 管理 | /management/bot-api | console/frontend/src/pages/bot-api/api.tsx | Bot API 管理页面 |
| Bot 应用列表 | /management/bot-api/app-list | console/frontend/src/pages/bot-api/app-list.tsx | Bot 应用列表页面 |

### 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| BotCenter | console/frontend/src/components/bot-center/ | Bot 中心组件 |
| EditBot | console/frontend/src/components/bot-center/edit-bot/ | 编辑 Bot 组件 |
| CreateBot | console/frontend/src/pages/space-page/agent-page/components/create-bot/ | 创建 Bot 组件 |
| DeleteBot | console/frontend/src/pages/space-page/agent-page/components/delete-bot/ | 删除 Bot 组件 |

## 6. 前端状态管理

| Store | 路径 | 管理的状态 |
|-------|------|-----------|
| useBotInfoStore | console/frontend/src/store/bot-info-store.ts | Bot 信息状态（botInfo、setBotInfo） |

## 7. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| getAgentList | console/frontend/src/services/agent.ts | 获取智能体列表 |
| copyBot | console/frontend/src/services/agent.ts | POST /api/workflow/copy-bot |
| deleteAgent | console/frontend/src/services/agent.ts | 删除智能体 |
| avatarImageGenerate | console/frontend/src/services/agent.ts | POST /api/bot/ai-avatar-gen |
| getAgentType | console/frontend/src/services/agent-square.ts | POST /api/bot/type-list |
| collectBot | console/frontend/src/services/agent-square.ts | POST /api/bot/favorite/create |
| cancelFavorite | console/frontend/src/services/agent-square.ts | POST /api/bot/favorite/delete |
| getFavoriteList | console/frontend/src/services/agent-square.ts | POST /api/bot/favorite/list |
| getBotMarketList | console/frontend/src/services/agent-square.ts | 获取助手市场列表 |
| getBotInfoByBotId | console/frontend/src/services/agent-square.ts | 根据 botId 获取详情 |
| getTalkAgentConfig | console/frontend/src/services/agent-square.ts | POST /api/talkAgent/getSceneList |

## 8. 模块间依赖

### 依赖的模块
- **commons**：依赖公共服务（认证、多租户、缓存、权限校验）
- **model-management**：Bot 需要选择模型作为对话引擎
- **knowledge**：Bot 可以关联知识库数据集
- **workflow**：Bot 基于工作流引擎运行

### 被依赖的模块
- **chat**：聊天模块需要调用 Bot 进行对话
- **publish**：发布模块需要发布 Bot 到各个渠道
- **space-management**：空间管理模块需要管理 Bot 的权限

## 9. 技术特性

### 9.1 AI 辅助生成
- **头像生成**：基于文本描述生成 Bot 头像（限流：50 次/天）
- **一句话生成**：输入一句话自动生成完整 Bot 配置（限流：1 次/秒）
- **开场白生成**：基于 Bot 信息自动生成开场白（限流：1 次/秒）
- **输入示例生成**：基于 Bot 信息自动生成推荐问题（限流：1 次/秒）
- **Prompt 增强**：使用 AI 优化 Prompt（SSE 流式输出）

### 9.2 多渠道发布
- **助手市场**：发布到平台助手市场，需要审核
- **API**：生成 API 接口，供第三方调用
- **微信**：发布到微信公众号或小程序
- **MCP**：发布到 MCP 协议

### 9.3 人格配置
- 支持 AI 生成人格描述
- 支持 AI 润色人格描述
- 支持选择预置人格角色
- 支持自定义人格分类

### 9.4 语音设置
- 支持中英文语音配置
- 支持自定义声音训练
- 支持语速调节
- 支持 TTS 签名获取

### 9.5 数据集集成
- 支持自有数据集（用户上传的知识库）
- 支持 MAAS 专业数据集（平台提供的数据集）
- 支持严格模式和扩展模式（`supportDocument`：1-严格依据，2-可扩展）
- 通过 `bot_dataset` 表维护关联关系

### 9.6 版本管理
- 支持工作流版本（`version` 字段）
- 支持从旧版本升级到新版本
- 版本切换时保留历史配置

### 9.7 国际化支持
- Bot 模板支持中英文（`language` 字段）
- Bot 信息支持双语（`botName`/`botNameEn`、`botDesc`/`botDescEn`）
- 前端通过 `i18next` 管理语言切换

### 9.8 权限控制
- 使用 `@SpacePreAuth` 注解实现空间级权限隔离
- 支持多空间管理
- 请求头自动携带 `space-id` 和 `enterprise-id`

### 9.9 限流保护
- 使用 `@RateLimit` 注解防止 API 滥用
- 不同接口有不同的限流策略（如头像生成 50 次/天，一句话生成 1 次/秒）

### 9.10 缓存优化
- Bot 模板使用 Redis 缓存（10 天过期）
- 减少数据库查询，提升性能

### 9.11 软删除
- 使用 `@TableLogic` 实现逻辑删除
- 删除的 Bot 不会物理删除，可以恢复

### 9.12 事务管理
- 关键操作使用 `@Transactional` 保证数据一致性
- 复制 Bot 时使用事务确保数据完整性

## 10. 注意事项

1. **限流策略**：AI 辅助生成接口有严格的限流策略，需要合理使用
2. **权限校验**：所有 Bot 操作都需要进行空间权限校验
3. **逻辑删除**：Bot 使用逻辑删除（`isDelete` 字段），不是物理删除
4. **版本管理**：升级工作流版本时需要保留历史配置
5. **数据集关联**：Bot 关联数据集时需要检查数据集是否存在
6. **发布审核**：发布到助手市场需要等待审核
7. **多渠道发布**：不同渠道有不同的发布要求
8. **国际化**：Bot 信息需要支持中英文双语
9. **空间隔离**：Bot 需要按空间隔离，不能跨空间访问
10. **MAAS 同步**：Bot 配置变更后需要同步到 MAAS 工作流引擎
