---
module: model-management
generated: 2026-03-04
---

# Model Management 模块文档

## 1. 模块概述

Model Management（模型管理）模块提供 LLM 模型的统一管理能力。用户可以接入自定义模型（通过 API）、本地部署模型、以及使用平台提供的官方模型。模块支持模型的创建、编辑、启用/禁用、删除等操作，并提供模型分类管理和权限控制。模型可以被 Bot、Workflow、知识库等模块调用，为 AI 应用提供底层推理能力。

## 2. 后端 API 清单

### 2.1 ModelController

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/model | ModelController | @SpacePreAuth | 添加/编辑模型 |
| GET | /api/model/delete | ModelController | @SpacePreAuth | 删除模型 |
| POST | /api/model/list | ModelController | @SpacePreAuth | 获取模型列表 |
| GET | /api/model/detail | ModelController | 无 | 获取模型详情 |
| GET | /api/model/rsa/public-key | ModelController | 无 | 获取 RSA 公钥（用于加密 API Key） |
| GET | /api/model/check-model-base | ModelController | 无 | 检查模型归属 |
| GET | /api/model/category-tree | ModelController | 无 | 获取模型分类树 |
| GET | /api/model/{option} | ModelController | @SpacePreAuth | 启用/禁用模型（option: enable/disable） |
| GET | /api/model/off-model | ModelController | 无 | 模型下线 |
| POST | /api/model/local-model | ModelController | @SpacePreAuth | 添加/编辑本地模型 |
| GET | /api/model/local-model/list | ModelController | @SpacePreAuth | 获取本地模型文件目录列表 |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| model | Model | 模型主表 |
| model_category | ModelCategory | 模型分类表 |
| model_custom_category | ModelCustomCategory | 自定义模型分类表 |
| model_common | ModelCommon | 通用模型配置表 |
| base_model_map | BaseModelMap | 基础模型映射表 |
| bot_model_bind | BotModelBind | Bot 与模型绑定表 |
| bot_model_config | BotModelConfig | Bot 模型配置表 |
| model_list_config | ModelListConfig | 模型列表配置表 |
| model_optimize_task | ModelOptimizeTask | 模型优化任务表 |

### 关键字段

#### Model（模型主表）
```java
@Data
public class Model {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String name;                // 模型名称
    private String desc;                // 描述
    private Integer source;             // 来源
    private String uid;                 // 用户 ID
    private Integer type;               // 类型：1-自定义模型，2-本地模型
    private Long subType;               // 子类型
    private String content;             // 内容（JSON 配置）
    private Boolean isDeleted;          // 是否删除（逻辑删除）
    private Date createTime;            // 创建时间
    private Date updateTime;            // 更新时间
    private String imageUrl;            // 图片 URL
    private String docUrl;              // 文档 URL
    private String remark;              // 备注
    private Integer sort;               // 排序
    private String channel;             // 渠道
    private String apiKey;              // API Key（加密存储）
    private String tag;                 // 标签
    private String domain;              // 域名
    private String url;                 // 接口 URL
    private String color;               // 颜色
    private String config;              // 配置（JSON）
    private Long spaceId;               // 空间 ID
    private Boolean enable;             // 是否启用
    private Integer status;             // 发布状态：1-已发布运行中，2-待发布，3-失败，4-初始化中，5-不存在，6-终止中
    private Integer acceleratorCount;   // 加速器数量
    private Integer replicaCount;       // 副本数量
    private String modelPath;           // 模型路径（本地模型）
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| ModelController | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/controller/model/ModelController.java | 模型管理控制器，处理模型的 CRUD、启用/禁用等 |
| ModelService | console/backend/toolkit/src/main/java/com/iflytek/astron/console/toolkit/service/model/ModelService.java | 模型管理核心业务逻辑 |

### 关键业务逻辑

#### 自定义模型创建流程
1. 用户填写模型基本信息（名称、描述、图标）
2. 选择模型分类（从分类树中选择）
3. 配置模型接口（URL、API Key、请求格式等）
4. API Key 使用 RSA 公钥加密后传输
5. 系统验证模型接口可用性
6. 保存模型配置到 `model` 表

#### 本地模型部署流程
1. 用户上传模型文件到服务器
2. 通过 `/api/model/local-model/list` 获取可用模型文件列表
3. 选择模型文件并配置部署参数（副本数、加速器数量等）
4. 系统创建模型部署任务
5. 模型状态变更：初始化中 → 已发布运行中
6. 模型可用后可以被 Bot 和 Workflow 调用

#### 模型调用流程
1. Bot 或 Workflow 选择可用模型
2. 系统根据模型配置构建请求
3. 调用模型接口（自定义模型）或本地推理服务（本地模型）
4. 返回模型推理结果

#### 模型权限控制
1. 官方模型：所有用户可见
2. 自定义模型：仅创建者和空间成员可见
3. 本地模型：仅空间成员可见
4. 模型启用/禁用：仅创建者和管理员可操作

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 模型列表 | /models | console/frontend/src/pages/models/index.tsx | 模型列表页面 |
| 模型创建/编辑 | /models/create | console/frontend/src/pages/models/create/index.tsx | 模型创建和编辑页面 |
| 本地模型管理 | /models/local | console/frontend/src/pages/models/local/index.tsx | 本地模型管理页面 |

## 6. 前端状态管理

| Store | 路径 | 管理的状态 |
|-------|------|-----------|
| useModelStore | console/frontend/src/store/model.ts | 模型相关状态（当前模型、模型列表等） |

## 7. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| modelCreate | console/frontend/src/services/model.ts | POST /api/model |
| modelRsaPublicKey | console/frontend/src/services/model.ts | GET /api/model/rsa/public-key |
| getModelList | console/frontend/src/services/model.ts | POST /api/model/list |
| getModelDetail | console/frontend/src/services/model.ts | GET /api/model/detail |
| deleteModelAPI | console/frontend/src/services/model.ts | GET /api/model/delete |
| getCategoryTree | console/frontend/src/services/model.ts | GET /api/model/category-tree |
| enabledModelAPI | console/frontend/src/services/model.ts | GET /api/model/{option} |
| getLocalModelList | console/frontend/src/services/model.ts | GET /api/model/local-model/list |
| createOrUpdateLocalModel | console/frontend/src/services/model.ts | POST /api/model/local-model |

## 8. 模块间依赖

### 依赖的模块
- **commons**：依赖公共服务（权限校验、加密解密等）

### 被依赖的模块
- **bot-management**：Bot 需要选择模型作为对话引擎（通过 `bot_model_bind` 表）
- **workflow**：Workflow 的 LLM 节点需要选择模型
- **knowledge**：知识库需要选择向量化模型
- **chat**：聊天过程中调用模型进行推理

## 9. 技术特性

### 9.1 多模型支持
- 官方模型：平台提供的预置模型
- 自定义模型：用户通过 API 接入的第三方模型
- 本地模型：用户部署在本地的模型

### 9.2 安全性
- API Key 使用 RSA 加密传输
- API Key 在数据库中加密存储
- 支持模型权限控制

### 9.3 模型分类
- 支持多级分类树
- 支持自定义分类
- 支持按分类筛选模型

### 9.4 模型状态管理
- 已发布运行中：模型可用
- 待发布：模型配置完成，等待发布
- 失败：模型部署失败
- 初始化中：模型正在部署
- 不存在：模型文件不存在
- 终止中：模型正在下线

### 9.5 本地模型部署
- 支持多副本部署
- 支持 GPU 加速器配置
- 支持模型文件管理

## 10. 注意事项

1. **API Key 安全**：API Key 必须使用 RSA 公钥加密后传输，不能明文传输
2. **模型验证**：创建自定义模型时需要验证接口可用性
3. **权限控制**：模型的启用/禁用操作需要权限校验
4. **逻辑删除**：模型使用逻辑删除（`isDeleted` 字段），不是物理删除
5. **本地模型路径**：本地模型需要指定正确的模型文件路径
6. **模型状态**：本地模型的状态需要实时监控，确保模型可用
7. **空间隔离**：自定义模型和本地模型需要按空间隔离