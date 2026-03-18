# 环境变量配置说明

本文档详细说明了系统所需的所有环境变量配置项，包括中间件、服务端口、认证、业务模块等配置。

## 快速开始

### 必须手动配置的关键字段

在使用 Docker Compose 部署之前，以下环境变量**必须手动配置**。详细的配置步骤和说明请参考 [部署指南](https://github.com/iflytek/astron-agent/blob/main/docs/DEPLOYMENT_GUIDE_zh.md)。

**关键配置项概览**：

- **讯飞开放平台凭证**（需要申请）:
  - `PLATFORM_APP_ID`、`PLATFORM_API_KEY`、`PLATFORM_API_SECRET`
  - `SPARK_API_PASSWORD`、`SPARK_RTASR_API_KEY`

- **Casdoor 认证配置**（需要部署 Casdoor 服务）:
  - `CONSOLE_CASDOOR_URL`、`CONSOLE_CASDOOR_ID`
  - `CONSOLE_CASDOOR_APP`、`CONSOLE_CASDOOR_ORG`

- **RAGFlow 知识库配置**（如使用 RAGFlow 作为知识库）:
  - `RAGFLOW_BASE_URL`、`RAGFLOW_API_TOKEN`、`RAGFLOW_DEFAULT_GROUP`

- **主机地址配置**:
  - `HOST_BASE_ADDRESS` - 设置为您的服务器地址或域名

### 配置项说明

文档中的配置项按以下方式标注：

- **用户必填**: 必须手动配置的字段（无默认值或需要申请外部服务）
- **使用默认**: 推荐使用 Docker Compose 提供的默认配置（如果使用外部中间件则需修改）
- **必填**: 必须存在但已提供默认值的配置（通常无需修改）
- **可选**: 非必需配置，可按需启用
- **条件必填**: 在特定场景下才需要配置的字段

---

## 1. 中间件配置模块

> **独立部署说明**:
> - 如果使用 Docker Compose 一键部署，以下配置中使用容器名（如 `postgres`、`mysql`、`redis`、`kafka`、`minio`）作为主机地址即可
> - 如果中间件服务**单独部署**（不在同一 Docker 网络中），需要将以下配置中的容器名修改为实际的 IP 地址或域名，并同步修改对应的连接信息（如用户名、密码、端口等）：
>   - PostgreSQL 相关：`POSTGRES_HOST`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_PORT` 等
>   - MySQL 相关：`MYSQL_HOST`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_URL` 等
>   - Redis 相关：`REDIS_ADDR`、`REDIS_HOST`、`REDIS_PASSWORD`、`REDIS_PORT` 等
>   - Kafka 相关：`KAFKA_SERVERS` 及认证信息（如需要）
>   - MinIO 相关：`OSS_ENDPOINT`、`OSS_DOWNLOAD_HOST`、`OSS_ACCESS_KEY_ID`、`OSS_SECRET_KEY` 等

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| POSTGRES_USER | 使用默认 | string | PostgreSQL 数据库用户名 | spark |
| POSTGRES_PASSWORD | 使用默认 | string | PostgreSQL 数据库密码 | spark123 |
| POSTGRES_HOST | 使用默认 | string | PostgreSQL 数据库主机地址 | postgres |
| POSTGRES_PORT | 使用默认 | int | PostgreSQL 数据库端口号 | 5432 |
| MYSQL_ROOT_PASSWORD | 使用默认 | string | MySQL 数据库 root 用户密码 | root123 |
| MYSQL_USER | 使用默认 | string | MySQL 数据库用户名 | root |
| MYSQL_PASSWORD | 使用默认 | string | MySQL 数据库密码(默认从 MYSQL_ROOT_PASSWORD 获取) | root123 |
| MYSQL_HOST | 使用默认 | string | MySQL 数据库主机地址 | mysql |
| MYSQL_PORT | 使用默认 | int | MySQL 数据库端口号 | 3306 |
| MYSQL_URL | 使用默认 | string | MySQL 数据库 JDBC 连接 URL | jdbc:mysql://mysql:3306/astron_console |
| REDIS_PASSWORD | 可选 | string | Redis 密码(为空表示无密码) | (留空) |
| REDIS_DATABASE | 使用默认 | int | Redis 数据库索引(0-15) | 0 |
| REDIS_IS_CLUSTER | 使用默认 | bool | Redis 是否为集群模式 | false |
| REDIS_CLUSTER_ADDR | 可选 | string | Redis 集群地址(集群模式时使用) | redis1:6379,redis2:6379 |
| REDIS_EXPIRE | 使用默认 | int | Redis 缓存过期时间(秒) | 3600 |
| REDIS_ADDR | 使用默认 | string | Redis 连接地址(单机模式) | redis:6379 |
| REDIS_HOST | 使用默认 | string | Redis 主机地址 | redis |
| REDIS_PORT | 使用默认 | int | Redis 端口号 | 6379 |
| ELASTICSEARCH_SECURITY_ENABLED | 使用默认 | bool | Elasticsearch 是否启用安全认证 | false |
| ES_JAVA_OPTS | 使用默认 | string | Elasticsearch JVM 参数配置 | -Xms512m -Xmx512m |
| EXPOSE_KAFKA_PORT | 使用默认 | int | Kafka 对外暴露的端口号 | 9092 |
| KAFKA_REPLICATION_FACTOR | 使用默认 | int | Kafka 副本因子 | 1 |
| KAFKA_CLUSTER_ID | 使用默认 | string | Kafka 集群 ID | MkU3OEVBNTcwNTJENDM2Qk |
| KAFKA_TIMEOUT | 使用默认 | int | Kafka 连接超时时间(秒) | 60 |
| KAFKA_SERVERS | 使用默认 | string | Kafka 服务器地址列表 | kafka:29092 |
| MINIO_ROOT_USER | 使用默认 | string | MinIO 管理员用户名 | minioadmin |
| MINIO_ROOT_PASSWORD | 使用默认 | string | MinIO 管理员密码 | minioadmin123 |
| EXPOSE_MINIO_PORT | 使用默认 | int | MinIO API 对外暴露的端口号 | 18998 |
| EXPOSE_MINIO_CONSOLE_PORT | 使用默认 | int | MinIO 控制台对外暴露的端口号 | 18999 |
| OSS_TYPE | 使用默认 | string | 对象存储类型(s3/oss/obs 等) | s3 |
| OSS_ENDPOINT | 使用默认 | url | 对象存储服务端点地址 | http://minio:9000 |
| OSS_ACCESS_KEY_ID | 使用默认 | string | 对象存储访问密钥 ID | ${MINIO_ROOT_USER:-minioadmin} |
| OSS_ACCESS_KEY_SECRET | 使用默认 | string | 对象存储访问密钥 Secret | ${MINIO_ROOT_PASSWORD:-minioadmin123} |
| OSS_BUCKET_NAME | 使用默认 | string | 对象存储桶名称 | workflow |
| OSS_TTL | 使用默认 | int | 对象存储 URL 有效期(秒) | 157788000 |
| OSS_DOWNLOAD_HOST | 使用默认 | url | 对象存储下载访问地址 | http://minio:9000 |

---

## 2. 监控配置模块 (OTLP)

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| OTLP_ENABLE | 必填 | int | 是否启用 OTLP 监控(0=禁用, 1=启用) | 0 |
| OTLP_ENDPOINT | 必填 | string | OTLP 服务端点地址 | 127.0.0.1:4317 |
| OTLP_METRIC_TIMEOUT | 必填 | int | OTLP 指标上报超时时间(毫秒) | 3000 |
| OTLP_METRIC_EXPORT_INTERVAL_MILLIS | 必填 | int | OTLP 指标导出间隔(毫秒) | 3000 |
| OTLP_METRIC_EXPORT_TIMEOUT_MILLIS | 必填 | int | OTLP 指标导出超时(毫秒) | 3000 |
| OTLP_TRACE_TIMEOUT | 必填 | int | OTLP 追踪超时时间(毫秒) | 3000 |
| OTLP_TRACE_MAX_QUEUE_SIZE | 必填 | int | OTLP 追踪队列最大大小 | 2048 |
| OTLP_TRACE_SCHEDULE_DELAY_MILLIS | 必填 | int | OTLP 追踪调度延迟(毫秒) | 3000 |
| OTLP_TRACE_MAX_EXPORT_BATCH_SIZE | 必填 | int | OTLP 追踪批量导出最大数量 | 2048 |
| OTLP_TRACE_EXPORT_TIMEOUT_MILLIS | 必填 | int | OTLP 追踪导出超时(毫秒) | 3000 |

---

## 3. 基础服务端口配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| EXPOSE_NGINX_PORT | 必填 | int | Nginx 对外暴露的端口号 | 80 |
| CORE_TENANT_PORT | 必填 | int | Tenant 核心服务端口号 | 5052 |
| CORE_DATABASE_PORT | 必填 | int | Database 核心服务端口号 | 7990 |
| CORE_RPA_PORT | 必填 | int | RPA 核心服务端口号 | 17198 |
| CORE_LINK_PORT | 必填 | int | Link 核心服务端口号 | 18888 |
| CORE_AITOOLS_PORT | 必填 | int | AITools 核心服务端口号 | 18668 |
| CORE_AGENT_PORT | 必填 | int | Agent 核心服务端口号 | 17870 |
| CORE_KNOWLEDGE_PORT | 必填 | int | Knowledge 核心服务端口号 | 20010 |
| CORE_WORKFLOW_PORT | 必填 | int | Workflow 核心服务端口号 | 7880 |

---

## 4. 认证配置模块 (Casdoor)

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| CONSOLE_CASDOOR_URL | 用户必填 | url | Casdoor 认证服务器地址 | http://your-casdoor-server:8000 |
| CONSOLE_CASDOOR_ID | 用户必填 | string | Casdoor OAuth2 客户端 ID | astron-agent-client |
| CONSOLE_CASDOOR_APP | 用户必填 | string | Casdoor 应用名称 | astron-agent-app |
| CONSOLE_CASDOOR_ORG | 用户必填 | string | Casdoor 组织名称 | built-in |

---

## 5. Tenant 模块配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| DATABASE_DB_TYPE | 必填 | string | 数据库类型 | mysql |
| DATABASE_USERNAME | 必填 | string | 数据库用户名(默认从 MYSQL_USER 获取) | ${MYSQL_USER:-root} |
| DATABASE_PASSWORD | 必填 | string | 数据库密码(默认从 MYSQL_PASSWORD 获取) | ${MYSQL_PASSWORD:-root123} |
| DATABASE_URL | 必填 | string | 数据库连接 URL | (mysql:3306)/tenant |
| DATABASE_MAX_OPEN_CONNS | 必填 | int | 数据库最大连接数 | 5 |
| DATABASE_MAX_IDLE_CONNS | 必填 | int | 数据库最大空闲连接数 | 5 |
| LOG_PATH | 必填 | string | 日志文件路径 | log.txt |

---

## 6. Database 模块配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| DATABASE_POSTGRES_DATABASE | 必填 | string | PostgreSQL 数据库名称 | sparkdb_manager |

---

## 7. RPA 模块配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| RPA_URL | 必填 | url | RPA 服务基础地址 | https://newapi.iflyrpa.com |
| XIAOWU_RPA_TASK_CREATE_URL | 必填 | url | 小悟 RPA 任务创建接口地址(默认从 RPA_URL 拼接) | ${RPA_URL}/api/rpa-openapi/workflows/execute-async |
| XIAOWU_RPA_TASK_QUERY_URL | 必填 | url | 小悟 RPA 任务查询接口地址(默认从 RPA_URL 拼接) | ${RPA_URL}/api/rpa-openapi/executions |

---

## 8. Link 模块配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| LINK_MYSQL_DB | 必填 | string | Link 模块使用的 MySQL 数据库名称 | spark-link |

---

## 9. Agent 模块配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| SERVICE_HOST | 必填 | string | 服务监听主机地址 | 0.0.0.0 |
| SERVICE_WORKERS | 必填 | int | 服务工作进程数 | 1 |
| SERVICE_RELOAD | 必填 | bool | 是否启用服务热重载 | false |
| SERVICE_WS_PING_INTERVAL | 必填 | bool/int | WebSocket 心跳间隔 | false |
| SERVICE_WS_PING_TIMEOUT | 必填 | bool/int | WebSocket 心跳超时 | false |
| AGENT_MYSQL_DB | 必填 | string | Agent 模块使用的 MySQL 数据库名称 | agent |
| UPLOAD_NODE_TRACE | 必填 | bool | 是否上传节点追踪数据 | true |
| UPLOAD_METRICS | 必填 | bool | 是否上传指标数据 | true |
| AGENT_KAFKA_TOPIC | 必填 | string | Agent 使用的 Kafka 主题名称 | spark-agent-builder |
| GET_LINK_URL | 必填 | url | 获取工具链接的接口地址 | http://core-link:18888/api/v1/tools |
| VERSIONS_LINK_URL | 必填 | url | 获取工具版本的接口地址 | http://core-link:18888/api/v1/tools/versions |
| RUN_LINK_URL | 必填 | url | 运行工具的接口地址 | http://core-link:18888/api/v1/tools/http_run |
| GET_WORKFLOWS_URL | 必填 | url | 获取工作流的接口地址(默认从 CORE_WORKFLOW_PORT 获取端口) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/sparkflow/v1/protocol/get |
| WORKFLOW_SSE_BASE_URL | 必填 | url | 工作流 SSE(服务器推送事件)基础地址(默认从 CORE_WORKFLOW_PORT 获取端口) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1 |
| CHUNK_QUERY_URL | 必填 | url | 知识库分块查询接口地址(默认从 CORE_KNOWLEDGE_PORT 获取端口) | http://core-knowledge:${CORE_KNOWLEDGE_PORT:-20010}/knowledge/v1/chunk/query |
| LIST_MCP_PLUGIN_URL | 必填 | url | 列出 MCP 插件的接口地址 | http://core-link:18888/api/v1/mcp/tool_list |
| RUN_MCP_PLUGIN_URL | 必填 | url | 运行 MCP 插件的接口地址 | http://core-link:18888/api/v1/mcp/call_tool |
| APP_AUTH_HOST | 必填 | string | 应用认证服务主机地址(默认从 CORE_TENANT_PORT 获取端口) | core-tenant:${CORE_TENANT_PORT:-5052} |
| APP_AUTH_PROT | 必填 | string | 应用认证服务协议(http/https) | http |
| APP_AUTH_API_KEY | 必填 | string | 应用认证 API Key | 7b709739e8da44536127a333c7603a83 |
| APP_AUTH_SECRET | 必填 | string | 应用认证 Secret | NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy |

---

## 10. Knowledge 模块配置

> **知识库选择说明**: 系统支持两种知识库方式，根据实际需求选择其中一种进行配置：
> - **RAGFlow**: 使用 RAGFlow 知识库服务（需要配置 RAGFLOW_* 相关变量）
> - **星火知识库**: 使用讯飞星火知识库服务（需要配置 XINGHUO_DATASET_ID）
>
> 选择哪一种方式，对应的配置项就是必填的；未选择的方式可以留空。

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| RAGFLOW_BASE_URL | 条件必填 | url | RAGFlow 服务基础地址（使用 RAGFlow 时必填） | http://localhost:10080 |
| RAGFLOW_API_TOKEN | 条件必填 | string | RAGFlow API 访问令牌（使用 RAGFlow 时必填） | your-ragflow-token |
| RAGFLOW_TIMEOUT | 条件必填 | int | RAGFlow 请求超时时间(秒)（使用 RAGFlow 时必填） | 60 |
| RAGFLOW_DEFAULT_GROUP | 条件必填 | string | RAGFlow 默认分组名称（使用 RAGFlow 时必填） | Astron Knowledge Base |
| XINGHUO_DATASET_ID | 条件必填 | string | 星火知识库数据集 ID（使用星火知识库时必填） | (留空) |

---

## 11. Workflow 模块配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| WORKFLOW_MYSQL_DB | 必填 | string | Workflow 模块使用的 MySQL 数据库名称 | workflow |
| WORKFLOW_KAFKA_TOPIC | 必填 | string | Workflow 使用的 Kafka 主题名称 | spark-agent-builder |
| RUNTIME_ENV | 必填 | string | 运行环境(dev/test/prod) | dev |

---

## 12. Console 模块配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| HOST_BASE_ADDRESS | 用户必填 | url | 主机基础地址 | http://localhost |
| CONSOLE_DOMAIN | 必填 | url | Console 控制台域名地址(默认从 HOST_BASE_ADDRESS 和 EXPOSE_NGINX_PORT 组合) | ${HOST_BASE_ADDRESS}:${EXPOSE_NGINX_PORT} |
| OSS_REMOTE_ENDPOINT | 必填 | url | 对象存储远程端点地址(默认从 HOST_BASE_ADDRESS 和 EXPOSE_MINIO_PORT 组合) | ${HOST_BASE_ADDRESS}:${EXPOSE_MINIO_PORT} |
| OSS_BUCKET_CONSOLE | 必填 | string | Console 使用的对象存储桶名称 | console-oss |
| OSS_PRESIGN_EXPIRY_SECONDS_CONSOLE | 必填 | int | Console 预签名 URL 过期时间(秒) | 600 |
| REDIS_DATABASE_CONSOLE | 必填 | int | Console 使用的 Redis 数据库索引 | 1 |
| OAUTH2_ISSUER_URI | 必填 | url | OAuth2 颁发者 URI(默认从 CONSOLE_CASDOOR_URL 获取) | ${CONSOLE_CASDOOR_URL:-http://auth-server:8000} |
| OAUTH2_JWK_SET_URI | 必填 | url | OAuth2 JWK 密钥集 URI(默认从 CONSOLE_CASDOOR_URL 获取) | ${CONSOLE_CASDOOR_URL:-http://auth-server:8000}/.well-known/jwks |
| OAUTH2_AUDIENCE | 必填 | string | OAuth2 受众标识(默认从 CONSOLE_CASDOOR_ID 获取) | ${CONSOLE_CASDOOR_ID:-your-oauth2-client-id} |
| PLATFORM_APP_ID | 用户必填 | string | 讯飞开放平台应用 ID | your-app-id |
| PLATFORM_API_KEY | 用户必填 | string | 讯飞开放平台 API Key | your-api-key |
| PLATFORM_API_SECRET | 用户必填 | string | 讯飞开放平台 API Secret | your-api-secret |
| AI_ABILITY_CHAT_BASE_URL | 可选 | url | 文本模型服务地址(OpenAI 兼容接口)(默认从 PLATFORM_API_KEY 获取)           | ${PLATFORM_API_KEY} |
| AI_ABILITY_CHAT_MODEL | 可选 | string | 文本模型名称                                             |${AI_ABILITY_CHAT_MODEL}|
| AI_ABILITY_CHAT_API_KEY | 可选 | string |文本模型 API Key                                          | ${AI_ABILITY_CHAT_API_KEY} |
| SPARK_RTASR_API_KEY | 用户必填 | string | 星火实时语音转写 API Key | your-rtasr-api-key |
| SPARK_API_PASSWORD | 用户必填 | string | 星火大模型 API 密码 | your-api-password |
| SPARK_APP_ID | 必填 | string | 星火服务应用 ID(默认从 PLATFORM_APP_ID 获取) | ${PLATFORM_APP_ID} |
| SPARK_API_KEY | 必填 | string | 星火服务 API Key(默认从 PLATFORM_API_KEY 获取) | ${PLATFORM_API_KEY} |
| SPARK_API_SECRET | 必填 | string | 星火服务 API Secret(默认从 PLATFORM_API_SECRET 获取) | ${PLATFORM_API_SECRET} |
| SPARK_RTASR_APPID | 必填 | string | 星火实时语音转写应用 ID(默认从 PLATFORM_APP_ID 获取) | ${PLATFORM_APP_ID} |
| SPARK_RTASR_KEY | 必填 | string | 星火实时语音转写 Key(默认从 SPARK_RTASR_API_KEY 获取) | ${SPARK_RTASR_API_KEY} |
| SPARK_IMAGE_APP_ID | 必填 | string | 星火图像生成应用 ID(默认从 PLATFORM_APP_ID 获取) | ${PLATFORM_APP_ID} |
| SPARK_IMAGE_API_KEY | 必填 | string | 星火图像生成 API Key(默认从 PLATFORM_API_KEY 获取) | ${PLATFORM_API_KEY} |
| SPARK_IMAGE_API_SECRET | 必填 | string | 星火图像生成 API Secret(默认从 PLATFORM_API_SECRET 获取) | ${PLATFORM_API_SECRET} |
| WECHAT_COMPONENT_APPID | 可选 | string | 微信第三方平台 AppID | your-wechat-component-appid |
| WECHAT_COMPONENT_SECRET | 可选 | string | 微信第三方平台 Secret | your-wechat-secret |
| WECHAT_TOKEN | 可选 | string | 微信消息校验 Token | your-wechat-token |
| WECHAT_ENCODING_AES_KEY | 可选 | string | 微信消息加密密钥 | your-wechat-encoding-aes-key |
| WORKFLOW_CHAT_URL | 必填 | url | 工作流对话接口地址(默认从 CORE_WORKFLOW_PORT 获取端口) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/chat/completions |
| WORKFLOW_DEBUG_URL | 必填 | url | 工作流调试接口地址(默认从 CORE_WORKFLOW_PORT 获取端口) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/debug/chat/completions |
| WORKFLOW_RESUME_URL | 必填 | url | 工作流恢复接口地址(默认从 CORE_WORKFLOW_PORT 获取端口) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/resume |
| TENANT_ID | 必填 | string | 租户 ID | 680ab54f |
| TENANT_KEY | 必填 | string | 租户 API Key | 7b709739e8da44536127a333c7603a83 |
| TENANT_SECRET | 必填 | string | 租户 Secret | NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy |
| COMMON_APPID | 必填 | string | 通用应用 ID(默认从 TENANT_ID 获取) | ${TENANT_ID} |
| COMMON_APIKEY | 必填 | string | 通用 API Key(默认从 TENANT_KEY 获取) | ${TENANT_KEY} |
| COMMON_API_SECRET | 必填 | string | 通用 API Secret(默认从 TENANT_SECRET 获取) | ${TENANT_SECRET} |
| ADMIN_UID | 必填 | string | 管理员用户 ID | 9999 |
| APP_URL | 必填 | url | 应用服务接口地址(默认从 CORE_TENANT_PORT 获取端口) | http://core-tenant:${CORE_TENANT_PORT:-5052}/v2/app |
| KNOWLEDGE_URL | 必填 | url | 知识库服务接口地址(默认从 CORE_KNOWLEDGE_PORT 获取端口) | http://core-knowledge:${CORE_KNOWLEDGE_PORT:-20010}/knowledge |
| TOOL_URL | 必填 | url | 工具服务接口地址 | http://core-link:18888 |
| WORKFLOW_URL | 必填 | url | 工作流服务接口地址(默认从 CORE_WORKFLOW_PORT 获取端口) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880} |
| SPARK_DB_URL | 必填 | url | Spark 数据库服务接口地址(默认从 CORE_DATABASE_PORT 获取端口) | http://core-database:${CORE_DATABASE_PORT:-7990} |
| LOCAL_MODEL_URL | 必填 | url | 本地模型服务地址 | http://127.0.0.1:33778 |

---

## 13. MaaS 平台配置模块

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| MAAS_APP_ID | 必填 | string | MaaS 平台应用 ID(默认从 PLATFORM_APP_ID 获取) | ${PLATFORM_APP_ID} |
| MAAS_API_KEY | 必填 | string | MaaS 平台 API Key(默认从 PLATFORM_API_KEY 获取) | ${PLATFORM_API_KEY} |
| MAAS_API_SECRET | 必填 | string | MaaS 平台 API Secret(默认从 PLATFORM_API_SECRET 获取) | ${PLATFORM_API_SECRET} |
| MAAS_CONSUMER_ID | 必填 | string | MaaS 消费者 ID(默认从 TENANT_ID 获取) | ${TENANT_ID} |
| MAAS_CONSUMER_KEY | 必填 | string | MaaS 消费者 Key(默认从 TENANT_KEY 获取) | ${TENANT_KEY} |
| MAAS_CONSUMER_SECRET | 必填 | string | MaaS 消费者 Secret(默认从 TENANT_SECRET 获取) | ${TENANT_SECRET} |
| MAAS_WORKFLOW_VERSION | 必填 | url | MaaS 工作流版本接口地址 | http://127.0.0.1:8080/workflow/version |
| MAAS_SYNCHRONIZE_WORK_FLOW | 必填 | url | MaaS 同步工作流接口地址 | http://127.0.0.1:8080/workflow |
| MAAS_PUBLISH | 必填 | url | MaaS 发布接口地址 | http://127.0.0.1:8080/workflow/publish |
| MAAS_CLONE_WORK_FLOW | 必填 | url | MaaS 克隆工作流接口地址 | http://127.0.0.1:8080/workflow/internal-clone |
| MAAS_GET_INPUTS | 必填 | url | MaaS 获取输入信息接口地址 | http://127.0.0.1:8080/workflow/get-inputs-info |
| MAAS_CAN_PUBLISH_URL | 必填 | url | MaaS 检查是否可发布接口地址 | http://127.0.0.1:8080/workflow/can-publish |
| MAAS_PUBLISH_API | 必填 | url | MaaS 发布 API 接口地址(默认从 CORE_WORKFLOW_PORT 获取端口) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/publish |
| MAAS_AUTH_API | 必填 | url | MaaS 认证 API 接口地址(默认从 CORE_WORKFLOW_PORT 获取端口) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/auth |
| MAAS_MCP_REGISTER | 必填 | url | MaaS MCP 注册接口地址 | http://127.0.0.1:8080/workflow/release |
| MAAS_WORKFLOW_CONFIG | 必填 | url | MaaS 工作流配置接口地址 | http://127.0.0.1:8080/workflow/get-flow-advanced-config |
| BOT_API_CBM_BASE_URL | 必填 | url | Bot API CBM 基础地址(支持 ws/wss,注意 env.example 中写作 ws(s)://) | wss://spark-openapi.cn-huabei-1.xf-yun.com |
| BOT_API_MAAS_BASE_URL | 必填 | url | Bot API MaaS 基础地址(注意 env.example 中写作 http(s)://) | https://xingchen-api.xf-yun.com |
| TENANT_CREATE_APP | 必填 | url | 租户创建应用接口地址(默认从 CORE_TENANT_PORT 获取端口) | http://core-tenant:${CORE_TENANT_PORT:-5052}/v2/app |
| TENANT_GET_APP_DETAIL | 必填 | url | 租户获取应用详情接口地址(默认从 CORE_TENANT_PORT 获取端口) | http://core-tenant:${CORE_TENANT_PORT:-5052}/v2/app/details |

---

## 14. 第三方服务配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| DEEPSEEK_URL | 必填 | url | DeepSeek API 接口地址 | https://api.deepseek.com/chat/completions |
| DEEPSEEK_API_KEY | 可选 | string | DeepSeek API Key | sk-xxx |

---

## 15. 其他系统配置

| 变量名 | 配置类型 | 类型 | 用途说明 | 示例值 |
|--------|----------|------|----------|--------|
| SERVICE_LOCATION | 必填 | string | 服务可用区(dx/hf/gz) | hf |
| HEALTH_CHECK_INTERVAL | 必填 | string | 健康检查间隔时间 | 30s |
| HEALTH_CHECK_TIMEOUT | 必填 | string | 健康检查超时时间 | 10s |
| HEALTH_CHECK_RETRIES | 必填 | int | 健康检查重试次数 | 60 |
| NETWORK_SUBNET | 必填 | string | Docker 网络子网配置 | 172.20.0.0/16 |

---

## 相关文档

- [部署指南](./DEPLOYMENT_GUIDE_zh.md) - 详细的部署步骤说明
- [快速启动](../README.md) - 快速启动指南

## 贡献

如发现配置项说明有误或需要补充，欢迎提交 Issue 或 Pull Request。
