---
module: knowledge
generated: 2026-03-04
---

# Knowledge 模块文档

## 1. 模块概述

Knowledge（知识库）模块提供企业级知识管理能力，支持文档上传、解析、切片、向量化和检索。模块采用三层架构：Repo（知识库）→ File（文件）→ Knowledge（知识点/切片）。用户可以创建知识库，上传各种格式的文档（PDF、Word、Excel、TXT、HTML 等），系统自动解析并切片为知识点，通过向量化后支持语义检索。知识库可以被 Bot 和 Workflow 调用，为 AI 对话提供领域知识支持。

## 2. 后端 API 清单

### 2.1 RepoController（知识库管理）

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /repo/create-repo | RepoController | @SpacePreAuth | 创建知识库 |
| POST | /repo/update-repo | RepoController | @SpacePreAuth | 更新知识库 |
| PUT | /repo/update-repo-status | RepoController | 无 | 更新知识库状态 |
| GET | /repo/list-repos | RepoController | @SpacePreAuth | 获取知识库列表（分页） |
| GET | /repo/list | RepoController | @SpacePreAuth | 获取简化知识库列表 |
| GET | /repo/detail | RepoController | @SpacePreAuth | 获取知识库详情 |
| DELETE | /repo/delete-repo | RepoController | @SpacePreAuth | 删除知识库 |
| GET | /repo/set-top | RepoController | 无 | 置顶知识库 |
| GET | /repo/hit-test | RepoController | 无 | 知识库命中测试 |
| GET | /repo/list-hit-test-history-by-page | RepoController | 无 | 获取命中测试历史（分页） |
| GET | /repo/file-list | RepoController | 无 | 获取知识库文件列表 |
| GET | /repo/get-repo-use-status | RepoController | 无 | 获取知识库使用状态 |

### 2.2 FileController（文件管理）

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /file/query-file-list | FileController | @SpacePreAuth | 查询文件列表（分页） |
| POST | /file/create-folder | FileController | @SpacePreAuth | 创建文件夹 |
| POST | /file/update-folder | FileController | @SpacePreAuth | 更新文件夹 |
| POST | /file/update-file | FileController | @SpacePreAuth | 更新文件 |
| PUT | /file/enable-file | FileController | @SpacePreAuth | 启用/禁用文件 |
| DELETE | /file/delete-file | FileController | @SpacePreAuth | 删除文件 |
| DELETE | /file/delete-folder | FileController | @SpacePreAuth | 删除文件夹 |
| GET | /file/list-file-directory-tree | FileController | 无 | 获取文件目录树 |
| POST | /file/file-summary | FileController | 无 | 获取文件摘要 |
| GET | /file/get-file-info-by-source-id | FileController | 无 | 根据 sourceId 获取文件信息 |
| POST | /file/create-html-file | FileController | 无 | 创建 HTML 文件 |
| POST | /file/slice | FileController | 无 | 文件切片 |
| POST | /file/list-knowledge-by-page | FileController | 无 | 获取知识点列表（分页） |
| POST | /file/list-preview-knowledge-by-page | FileController | 无 | 获取预览知识点列表（分页） |
| POST | /file/embedding | FileController | 无 | 文件向量化 |
| POST | /file/file-indexing-status | FileController | 无 | 获取文件索引状态 |
| POST | /file/download-knowledge-by-violation | FileController | 无 | 下载违规知识点 |
| POST | /file/embedding-back | FileController | 无 | 向量化回退 |
| POST | /file/retry | FileController | 无 | 重试失败任务 |

### 2.3 KnowledgeController（知识点管理）

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /knowledge/create-knowledge | KnowledgeController | @SpacePreAuth | 创建知识点 |
| POST | /knowledge/update-knowledge | KnowledgeController | @SpacePreAuth | 更新知识点 |
| PUT | /knowledge/enable-knowledge | KnowledgeController | @SpacePreAuth | 启用/禁用知识点 |
| DELETE | /knowledge/delete-knowledge | KnowledgeController | @SpacePreAuth | 删除知识点 |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| repo | Repo | 知识库主表 |
| knowledge | MysqlKnowledge / Knowledge | 知识点表（MySQL + MongoDB） |
| preview_knowledge | PreviewKnowledge | 预览知识点表 |
| extract_knowledge_task | ExtractKnowledgeTask | 知识抽取任务表 |
| hit_test_history | HitTestHistory | 命中测试历史表 |
| bot_repo_rel | BotRepoRel | Bot 与知识库关联表 |
| flow_repo_rel | FlowRepoRel | Workflow 与知识库关联表 |
| bot_repo_subscript | BotRepoSubscript | Bot 知识库订阅表 |

### 关键字段

#### Repo（知识库主表）
```java
@Data
public class Repo implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String name;                // 知识库名称
    private String userId;              // 用户 ID
    private String appId;               // AppId
    private String outerRepoId;         // 外部知识库 ID
    private String coreRepoId;          // 核心知识库 ID
    private String description;         // 描述
    private String icon;                // 头像图标
    private String color;               // 颜色
    private Integer status;             // 状态：1-已创建，2-已发布，3-已下线，4-已删除
    private String embeddedModel;       // 向量化模型
    private Integer indexType;          // 索引类型：0-高质量，1-低质量
    private Integer visibility;         // 可见性：0-仅自己可见，1-部分用户可见
    private Integer source;             // 来源：0-Web 创建，1-API 创建
    private Boolean enableAudit;        // 是否启用内容审核：0-禁用，1-启用（默认）
    private Boolean deleted;            // 是否删除：1-已删除，0-未删除
    private Date createTime;            // 创建时间
    private Date updateTime;            // 修改时间
    private Boolean isTop;              // 是否置顶
    private String tag;                 // 知识库类型（CBG-RAG / AIUI-RAG2）
    private Long spaceId;               // 空间 ID
}
```

#### Knowledge（知识点表）
```java
@Data
public class Knowledge {
    @Id
    private String id;                  // 主键
    private String fileId;              // 文件 ID
    private Long seqId;                 // 自增序列 ID（保持插入顺序）
    private JSONObject content;         // 知识点内容（JSON）
    private Long charCount;             // 字符数
    private Integer enabled;            // 启用状态：1-启用，0-禁用
    private Integer source;             // 来源：0-文件解析默认，1-手动添加
    private Long testHitCount;          // 测试命中次数
    private Long dialogHitCount;        // 对话命中次数
    private String coreRepoName;        // 核心知识库名称
    private LocalDateTime createdAt;    // 创建时间
    private LocalDateTime updatedAt;    // 更新时间
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| RepoController | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/knowledge/RepoController.java | 知识库控制器，处理知识库的 CRUD、命中测试等 |
| FileController | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/knowledge/FileController.java | 文件控制器，处理文件的上传、切片、向量化等 |
| KnowledgeController | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/knowledge/KnowledgeController.java | 知识点控制器，处理知识点的 CRUD |
| RepoService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/repo/RepoService.java | 知识库核心业务逻辑 |
| KnowledgeService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/repo/KnowledgeService.java | 知识点核心业务逻辑 |
| ExtractKnowledgeTaskService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/task/ExtractKnowledgeTaskService.java | 知识抽取任务服务 |

### 关键业务逻辑

#### 知识库创建流程
1. 用户填写知识库基本信息（名称、描述、图标）
2. 选择向量化模型和索引类型
3. 选择是否启用内容审核
4. 系统创建知识库记录（`Repo` 表）
5. 调用核心服务创建向量库（`coreRepoId`）

#### 文件上传与处理流程
1. 用户上传文件到知识库
2. 系统解析文件内容（支持 PDF、Word、Excel、TXT、HTML 等）
3. 文件切片（`/file/slice`）：将文档切分为多个知识点
4. 内容审核（如果启用）：检查违规内容
5. 向量化（`/file/embedding`）：将知识点转换为向量
6. 索引到向量库：支持语义检索

#### 知识点检索流程
1. Bot 或 Workflow 发起检索请求
2. 系统将查询文本向量化
3. 在向量库中进行相似度搜索
4. 返回 Top-K 相关知识点
5. 记录命中次数（`testHitCount` / `dialogHitCount`）

#### 命中测试流程
1. 用户通过 `/repo/hit-test` 发起测试
2. 系统将测试问题向量化
3. 在知识库中检索相关知识点
4. 返回命中结果和相似度分数
5. 保存测试历史（`HitTestHistory` 表）

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 知识库列表 | /knowledge | console/frontend/src/pages/knowledge/index.tsx | 知识库列表页面 |
| 知识库详情 | /knowledge/:id | console/frontend/src/pages/knowledge/detail/index.tsx | 知识库详情页面（文件管理） |
| 知识点管理 | /knowledge/:id/chunks | console/frontend/src/pages/knowledge/chunks/index.tsx | 知识点管理页面 |

## 6. 前端状态管理

| Store | 路径 | 管理的状态 |
|-------|------|-----------|
| useKnowledgeStore | console/frontend/src/store/knowledge.ts | 知识库相关状态（当前知识库、文件列表等） |

## 7. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| createKnowledgeAPI | console/frontend/src/services/knowledge.ts | POST /repo/create-repo |
| deleteKnowledgeAPI | console/frontend/src/services/knowledge.ts | DELETE /repo/delete-repo |
| updateRepoAPI | console/frontend/src/services/knowledge.ts | POST /repo/update-repo |
| listRepos | console/frontend/src/services/knowledge.ts | GET /repo/list-repos |
| configListRepos | console/frontend/src/services/knowledge.ts | GET /repo/list |
| hitTest | console/frontend/src/services/knowledge.ts | GET /repo/hit-test |
| hitHistoryByPage | console/frontend/src/services/knowledge.ts | GET /repo/list-hit-test-history-by-page |
| knowledgeSetTop | console/frontend/src/services/knowledge.ts | GET /repo/set-top |
| getKnowledgeDetail | console/frontend/src/services/knowledge.ts | GET /repo/detail |
| queryFileList | console/frontend/src/services/knowledge.ts | GET /file/query-file-list |
| createFolderAPI | console/frontend/src/services/knowledge.ts | POST /file/create-folder |
| updateFolderAPI | console/frontend/src/services/knowledge.ts | POST /file/update-folder |
| updateFileAPI | console/frontend/src/services/knowledge.ts | POST /file/update-file |
| enableFlieAPI | console/frontend/src/services/knowledge.ts | PUT /file/enable-file |
| deleteFileAPI | console/frontend/src/services/knowledge.ts | DELETE /file/delete-file |
| deleteFolderAPI | console/frontend/src/services/knowledge.ts | DELETE /file/delete-folder |
| listFileDirectoryTree | console/frontend/src/services/knowledge.ts | GET /file/list-file-directory-tree |
| getFileSummary | console/frontend/src/services/knowledge.ts | POST /file/file-summary |
| createKnowledge | console/frontend/src/services/knowledge.ts | POST /knowledge/create-knowledge |
| updateKnowledgeAPI | console/frontend/src/services/knowledge.ts | POST /knowledge/update-knowledge |
| enableKnowledgeAPI | console/frontend/src/services/knowledge.ts | PUT /knowledge/enable-knowledge |
| getFileInfoV2BySourceId | console/frontend/src/services/knowledge.ts | GET /file/get-file-info-by-source-id |
| getFileList | console/frontend/src/services/knowledge.ts | GET /repo/file-list |
| createHtmlFile | console/frontend/src/services/knowledge.ts | POST /file/create-html-file |
| sliceFilesAPI | console/frontend/src/services/knowledge.ts | POST /file/slice |
| listKnowledgeByPage | console/frontend/src/services/knowledge.ts | POST /file/list-knowledge-by-page |
| listPreviewKnowledgeByPage | console/frontend/src/services/knowledge.ts | POST /file/list-preview-knowledge-by-page |
| embeddingFiles | console/frontend/src/services/knowledge.ts | POST /file/embedding |
| getStatusAPI | console/frontend/src/services/knowledge.ts | POST /file/file-indexing-status |
| getConfigs | console/frontend/src/services/knowledge.ts | GET /config-info/get-list-by-category |
| downloadKnowledgeByViolation | console/frontend/src/services/knowledge.ts | POST /file/download-knowledge-by-violation |
| deleteChunkAPI | console/frontend/src/services/knowledge.ts | DELETE /knowledge/delete-knowledge |
| embeddingBack | console/frontend/src/services/knowledge.ts | POST /file/embedding-back |
| retry | console/frontend/src/services/knowledge.ts | POST /file/retry |
| getRepoUseStatus | console/frontend/src/services/knowledge.ts | GET /repo/get-repo-use-status |

## 8. 模块间依赖

### 依赖的模块
- **model-management**：获取可用的向量化模型列表
- **commons**：依赖公共服务（文件上传、权限校验、内容审核等）

### 被依赖的模块
- **bot-management**：Bot 可以关联知识库作为知识来源（通过 `bot_repo_rel` 表）
- **workflow**：Workflow 的知识库节点需要调用知识库服务（通过 `flow_repo_rel` 表）
- **chat**：聊天过程中可能检索知识库

## 9. 技术特性

### 9.1 双存储架构
- MySQL：存储知识点元数据（`MysqlKnowledge`）
- MongoDB：存储知识点完整内容（`Knowledge`）
- 支持高效的元数据查询和大文本存储

### 9.2 向量化与检索
- 支持多种向量化模型
- 支持高质量和低质量两种索引类型
- 支持语义检索和关键词检索

### 9.3 文件解析
- 支持多种文档格式：PDF、Word、Excel、TXT、HTML、Markdown 等
- 支持自动切片和手动切片
- 支持文件夹管理

### 9.4 内容审核
- 支持启用/禁用内容审核
- 自动检测违规内容
- 支持下载违规知识点

### 9.5 命中测试
- 支持实时命中测试
- 记录测试历史
- 支持命中次数统计

### 9.6 知识点管理
- 支持手动创建知识点
- 支持编辑和删除知识点
- 支持启用/禁用知识点
- 支持知识点标签

## 10. 注意事项

1. **双存储一致性**：MySQL 和 MongoDB 需要保持数据一致性
2. **向量化异步处理**：文件向量化是异步任务，需要轮询状态
3. **文件大小限制**：需要注意文件上传大小限制
4. **切片策略**：不同文档类型需要不同的切片策略
5. **权限控制**：大部分 API 使用 `@SpacePreAuth` 进行空间级权限校验
6. **逻辑删除**：知识库使用逻辑删除（`deleted` 字段），不是物理删除
7. **知识库类型**：支持 CBG-RAG 和 AIUI-RAG2 两种类型（通过 `tag` 字段区分）