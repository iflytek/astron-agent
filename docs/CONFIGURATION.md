# Environment Variables Configuration Guide

This document provides detailed descriptions of all environment variables required by the system, including middleware, service ports, authentication, business modules, and more.

## Quick Start

### Required Manual Configuration Fields

Before deploying with Docker Compose, the following environment variables **must be manually configured**. For detailed configuration steps and instructions, please refer to the [Deployment Guide](https://github.com/iflytek/astron-agent/blob/main/docs/DEPLOYMENT_GUIDE.md).

**Key Configuration Items Overview**:

- **iFlytek Open Platform Credentials** (requires application):
  - `PLATFORM_APP_ID`, `PLATFORM_API_KEY`, `PLATFORM_API_SECRET`
  - `SPARK_API_PASSWORD`, `SPARK_RTASR_API_KEY`

- **Casdoor Authentication Configuration** (requires Casdoor service deployment):
  - `CONSOLE_CASDOOR_URL`, `CONSOLE_CASDOOR_ID`
  - `CONSOLE_CASDOOR_APP`, `CONSOLE_CASDOOR_ORG`

- **RAGFlow Knowledge Base Configuration** (if using RAGFlow as knowledge base):
  - `RAGFLOW_BASE_URL`, `RAGFLOW_API_TOKEN`, `RAGFLOW_DEFAULT_GROUP`

- **Host Address Configuration**:
  - `HOST_BASE_ADDRESS` - Set to your server address or domain name

### Configuration Item Descriptions

Configuration items in this document are marked as follows:

- **User Required**: Fields that must be manually configured (no default value or require external service application)
- **Use Default**: Recommended to use the default configuration provided by Docker Compose (modify if using external middleware)
- **Required**: Must exist but default value is provided (usually no modification needed)
- **Optional**: Non-essential configuration, can be enabled as needed
- **Conditional**: Fields that need to be configured only in specific scenarios

---

## 1. Middleware Configuration Module

> **Independent Deployment Note**:
> - If using Docker Compose one-click deployment, the following configurations can use container names (such as `postgres`, `mysql`, `redis`, `kafka`, `minio`) as host addresses
> - If middleware services are **deployed separately** (not in the same Docker network), you need to replace the container names in the following configurations with actual IP addresses or domain names, and synchronize the corresponding connection information (such as username, password, port, etc.):
>   - PostgreSQL related: `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, etc.
>   - MySQL related: `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_URL`, etc.
>   - Redis related: `REDIS_ADDR`, `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT`, etc.
>   - Kafka related: `KAFKA_SERVERS` and authentication information (if needed)
>   - MinIO related: `OSS_ENDPOINT`, `OSS_DOWNLOAD_HOST`, `OSS_ACCESS_KEY_ID`, `OSS_SECRET_KEY`, etc.

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| POSTGRES_USER | Use Default | string | PostgreSQL database username | spark |
| POSTGRES_PASSWORD | Use Default | string | PostgreSQL database password | spark123 |
| POSTGRES_HOST | Use Default | string | PostgreSQL database host address | postgres |
| POSTGRES_PORT | Use Default | int | PostgreSQL database port number | 5432 |
| MYSQL_ROOT_PASSWORD | Use Default | string | MySQL database root user password | root123 |
| MYSQL_USER | Use Default | string | MySQL database username | root |
| MYSQL_PASSWORD | Use Default | string | MySQL database password (defaults from MYSQL_ROOT_PASSWORD) | root123 |
| MYSQL_HOST | Use Default | string | MySQL database host address | mysql |
| MYSQL_PORT | Use Default | int | MySQL database port number | 3306 |
| MYSQL_URL | Use Default | string | MySQL database JDBC connection URL | jdbc:mysql://mysql:3306/astron_console |
| REDIS_PASSWORD | Optional | string | Redis password (empty means no password) | (empty) |
| REDIS_DATABASE | Use Default | int | Redis database index (0-15) | 0 |
| REDIS_IS_CLUSTER | Use Default | bool | Whether Redis is in cluster mode | false |
| REDIS_CLUSTER_ADDR | Optional | string | Redis cluster address (used in cluster mode) | redis1:6379,redis2:6379 |
| REDIS_EXPIRE | Use Default | int | Redis cache expiration time (seconds) | 3600 |
| REDIS_ADDR | Use Default | string | Redis connection address (standalone mode) | redis:6379 |
| REDIS_HOST | Use Default | string | Redis host address | redis |
| REDIS_PORT | Use Default | int | Redis port number | 6379 |
| ELASTICSEARCH_SECURITY_ENABLED | Use Default | bool | Whether Elasticsearch has security authentication enabled | false |
| ES_JAVA_OPTS | Use Default | string | Elasticsearch JVM parameter configuration | -Xms512m -Xmx512m |
| EXPOSE_KAFKA_PORT | Use Default | int | Kafka externally exposed port number | 9092 |
| KAFKA_REPLICATION_FACTOR | Use Default | int | Kafka replication factor | 1 |
| KAFKA_CLUSTER_ID | Use Default | string | Kafka cluster ID | MkU3OEVBNTcwNTJENDM2Qk |
| KAFKA_TIMEOUT | Use Default | int | Kafka connection timeout (seconds) | 60 |
| KAFKA_SERVERS | Use Default | string | Kafka server address list | kafka:29092 |
| MINIO_ROOT_USER | Use Default | string | MinIO administrator username | minioadmin |
| MINIO_ROOT_PASSWORD | Use Default | string | MinIO administrator password | minioadmin123 |
| EXPOSE_MINIO_PORT | Use Default | int | MinIO API externally exposed port number | 18998 |
| EXPOSE_MINIO_CONSOLE_PORT | Use Default | int | MinIO console externally exposed port number | 18999 |
| OSS_TYPE | Use Default | string | Object storage type (s3/oss/obs, etc.) | s3 |
| OSS_ENDPOINT | Use Default | url | Object storage service endpoint address | http://minio:9000 |
| OSS_ACCESS_KEY_ID | Use Default | string | Object storage access key ID | ${MINIO_ROOT_USER:-minioadmin} |
| OSS_ACCESS_KEY_SECRET | Use Default | string | Object storage access key Secret | ${MINIO_ROOT_PASSWORD:-minioadmin123} |
| OSS_BUCKET_NAME | Use Default | string | Object storage bucket name | workflow |
| OSS_TTL | Use Default | int | Object storage URL validity period (seconds) | 157788000 |
| OSS_DOWNLOAD_HOST | Use Default | url | Object storage download access address | http://minio:9000 |

---

## 2. Monitoring Configuration Module (OTLP)

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| OTLP_ENABLE | Required | int | Whether to enable OTLP monitoring (0=disabled, 1=enabled) | 0 |
| OTLP_ENDPOINT | Required | string | OTLP service endpoint address | 127.0.0.1:4317 |
| OTLP_METRIC_TIMEOUT | Required | int | OTLP metric reporting timeout (milliseconds) | 3000 |
| OTLP_METRIC_EXPORT_INTERVAL_MILLIS | Required | int | OTLP metric export interval (milliseconds) | 3000 |
| OTLP_METRIC_EXPORT_TIMEOUT_MILLIS | Required | int | OTLP metric export timeout (milliseconds) | 3000 |
| OTLP_TRACE_TIMEOUT | Required | int | OTLP trace timeout (milliseconds) | 3000 |
| OTLP_TRACE_MAX_QUEUE_SIZE | Required | int | OTLP trace queue maximum size | 2048 |
| OTLP_TRACE_SCHEDULE_DELAY_MILLIS | Required | int | OTLP trace schedule delay (milliseconds) | 3000 |
| OTLP_TRACE_MAX_EXPORT_BATCH_SIZE | Required | int | OTLP trace batch export maximum size | 2048 |
| OTLP_TRACE_EXPORT_TIMEOUT_MILLIS | Required | int | OTLP trace export timeout (milliseconds) | 3000 |

---

## 3. Basic Service Port Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| EXPOSE_NGINX_PORT | Required | int | Nginx externally exposed port number | 80 |
| CORE_TENANT_PORT | Required | int | Tenant core service port number | 5052 |
| CORE_DATABASE_PORT | Required | int | Database core service port number | 7990 |
| CORE_RPA_PORT | Required | int | RPA core service port number | 17198 |
| CORE_LINK_PORT | Required | int | Link core service port number | 18888 |
| CORE_AITOOLS_PORT | Required | int | AITools core service port number | 18668 |
| CORE_AGENT_PORT | Required | int | Agent core service port number | 17870 |
| CORE_KNOWLEDGE_PORT | Required | int | Knowledge core service port number | 20010 |
| CORE_WORKFLOW_PORT | Required | int | Workflow core service port number | 7880 |

---

## 4. Authentication Configuration Module (Casdoor)

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| CONSOLE_CASDOOR_URL | User Required | url | Casdoor authentication server address | http://your-casdoor-server:8000 |
| CONSOLE_CASDOOR_ID | User Required | string | Casdoor OAuth2 client ID | astron-agent-client |
| CONSOLE_CASDOOR_APP | User Required | string | Casdoor application name | astron-agent-app |
| CONSOLE_CASDOOR_ORG | User Required | string | Casdoor organization name | built-in |

---

## 5. Tenant Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| DATABASE_DB_TYPE | Required | string | Database type | mysql |
| DATABASE_USERNAME | Required | string | Database username (defaults from MYSQL_USER) | ${MYSQL_USER:-root} |
| DATABASE_PASSWORD | Required | string | Database password (defaults from MYSQL_PASSWORD) | ${MYSQL_PASSWORD:-root123} |
| DATABASE_URL | Required | string | Database connection URL | (mysql:3306)/tenant |
| DATABASE_MAX_OPEN_CONNS | Required | int | Database maximum connections | 5 |
| DATABASE_MAX_IDLE_CONNS | Required | int | Database maximum idle connections | 5 |
| LOG_PATH | Required | string | Log file path | log.txt |

---

## 6. Database Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| DATABASE_POSTGRES_DATABASE | Required | string | PostgreSQL database name | sparkdb_manager |

---

## 7. RPA Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| RPA_URL | Required | url | RPA service base address | https://newapi.iflyrpa.com |
| XIAOWU_RPA_TASK_CREATE_URL | Required | url | Xiaowu RPA task creation API address (defaults from RPA_URL) | ${RPA_URL}/api/rpa-openapi/workflows/execute-async |
| XIAOWU_RPA_TASK_QUERY_URL | Required | url | Xiaowu RPA task query API address (defaults from RPA_URL) | ${RPA_URL}/api/rpa-openapi/executions |

---

## 8. Link Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| LINK_MYSQL_DB | Required | string | MySQL database name used by Link module | spark-link |

---

## 9. Agent Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| SERVICE_HOST | Required | string | Service listening host address | 0.0.0.0 |
| SERVICE_WORKERS | Required | int | Service worker process count | 1 |
| SERVICE_RELOAD | Required | bool | Whether to enable service hot reload | false |
| SERVICE_WS_PING_INTERVAL | Required | bool/int | WebSocket heartbeat interval | false |
| SERVICE_WS_PING_TIMEOUT | Required | bool/int | WebSocket heartbeat timeout | false |
| AGENT_MYSQL_DB | Required | string | MySQL database name used by Agent module | agent |
| UPLOAD_NODE_TRACE | Required | bool | Whether to upload node trace data | true |
| UPLOAD_METRICS | Required | bool | Whether to upload metrics data | true |
| AGENT_KAFKA_TOPIC | Required | string | Kafka topic name used by Agent | spark-agent-builder |
| GET_LINK_URL | Required | url | API address to get tool link | http://core-link:18888/api/v1/tools |
| VERSIONS_LINK_URL | Required | url | API address to get tool version | http://core-link:18888/api/v1/tools/versions |
| RUN_LINK_URL | Required | url | API address to run tool | http://core-link:18888/api/v1/tools/http_run |
| GET_WORKFLOWS_URL | Required | url | API address to get workflow (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/sparkflow/v1/protocol/get |
| WORKFLOW_SSE_BASE_URL | Required | url | Workflow SSE (Server-Sent Events) base address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1 |
| CHUNK_QUERY_URL | Required | url | Knowledge base chunk query API address (port defaults from CORE_KNOWLEDGE_PORT) | http://core-knowledge:${CORE_KNOWLEDGE_PORT:-20010}/knowledge/v1/chunk/query |
| LIST_MCP_PLUGIN_URL | Required | url | API address to list MCP plugins | http://core-link:18888/api/v1/mcp/tool_list |
| RUN_MCP_PLUGIN_URL | Required | url | API address to run MCP plugin | http://core-link:18888/api/v1/mcp/call_tool |
| APP_AUTH_HOST | Required | string | Application authentication service host address (port defaults from CORE_TENANT_PORT) | core-tenant:${CORE_TENANT_PORT:-5052} |
| APP_AUTH_PROT | Required | string | Application authentication service protocol (http/https) | http |
| APP_AUTH_API_KEY | Required | string | Application authentication API Key | 7b709739e8da44536127a333c7603a83 |
| APP_AUTH_SECRET | Required | string | Application authentication Secret | NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy |

---

## 10. Knowledge Module Configuration

> **Knowledge Base Selection Note**: The system supports two knowledge base methods. Choose one based on your needs:
> - **RAGFlow**: Use RAGFlow knowledge base service (requires configuration of RAGFLOW_* related variables)
> - **Spark Knowledge Base**: Use iFlytek Spark knowledge base service (requires configuration of XINGHUO_DATASET_ID)
>
> Whichever method you choose, the corresponding configuration items are required; configuration items for the unchosen method can be left empty.

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| RAGFLOW_BASE_URL | Conditional | url | RAGFlow service base address (required when using RAGFlow) | http://localhost:10080 |
| RAGFLOW_API_TOKEN | Conditional | string | RAGFlow API access token (required when using RAGFlow) | your-ragflow-token |
| RAGFLOW_TIMEOUT | Conditional | int | RAGFlow request timeout (seconds) (required when using RAGFlow) | 60 |
| RAGFLOW_DEFAULT_GROUP | Conditional | string | RAGFlow default group name (required when using RAGFlow) | Astron Knowledge Base |
| XINGHUO_DATASET_ID | Conditional | string | Spark knowledge base dataset ID (required when using Spark knowledge base) | (empty) |

---

## 11. Workflow Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| WORKFLOW_MYSQL_DB | Required | string | MySQL database name used by Workflow module | workflow |
| WORKFLOW_KAFKA_TOPIC | Required | string | Kafka topic name used by Workflow | spark-agent-builder |
| RUNTIME_ENV | Required | string | Runtime environment (dev/test/prod) | dev |

---

## 12. Console Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| HOST_BASE_ADDRESS | User Required | url | Host base address | http://localhost |
| CONSOLE_DOMAIN | Required | url | Console domain address (defaults from HOST_BASE_ADDRESS and EXPOSE_NGINX_PORT) | ${HOST_BASE_ADDRESS}:${EXPOSE_NGINX_PORT} |
| OSS_REMOTE_ENDPOINT | Required | url | Object storage remote endpoint address (defaults from HOST_BASE_ADDRESS and EXPOSE_MINIO_PORT) | ${HOST_BASE_ADDRESS}:${EXPOSE_MINIO_PORT} |
| OSS_BUCKET_CONSOLE | Required | string | Object storage bucket name used by Console | console-oss |
| OSS_PRESIGN_EXPIRY_SECONDS_CONSOLE | Required | int | Console presigned URL expiration time (seconds) | 600 |
| REDIS_DATABASE_CONSOLE | Required | int | Redis database index used by Console | 1 |
| OAUTH2_ISSUER_URI | Required | url | OAuth2 issuer URI (defaults from CONSOLE_CASDOOR_URL) | ${CONSOLE_CASDOOR_URL:-http://auth-server:8000} |
| OAUTH2_JWK_SET_URI | Required | url | OAuth2 JWK key set URI (defaults from CONSOLE_CASDOOR_URL) | ${CONSOLE_CASDOOR_URL:-http://auth-server:8000}/.well-known/jwks |
| OAUTH2_AUDIENCE | Required | string | OAuth2 audience identifier (defaults from CONSOLE_CASDOOR_ID) | ${CONSOLE_CASDOOR_ID:-your-oauth2-client-id} |
| PLATFORM_APP_ID | User Required | string | iFlytek Open Platform application ID | your-app-id |
| PLATFORM_API_KEY | User Required | string | iFlytek Open Platform API Key | your-api-key |
| PLATFORM_API_SECRET | User Required | string | iFlytek Open Platform API Secret | your-api-secret |
| AI_ABILITY_CHAT_BASE_URL | Optional | url | Text model service address (OpenAI-compatible API) (defaults from PLATFORM_API_KEY) | ${PLATFORM_API_KEY} |
| AI_ABILITY_CHAT_MODEL | Optional | string | Text model name | ${AI_ABILITY_CHAT_MODEL} |
| AI_ABILITY_CHAT_API_KEY | Optional | string | Text model API Key | ${AI_ABILITY_CHAT_API_KEY} |
| SPARK_RTASR_API_KEY | User Required | string | Spark real-time speech-to-text API Key | your-rtasr-api-key |
| SPARK_API_PASSWORD | User Required | string | Spark large model API password | your-api-password |
| SPARK_APP_ID | Required | string | Spark service application ID (defaults from PLATFORM_APP_ID) | ${PLATFORM_APP_ID} |
| SPARK_API_KEY | Required | string | Spark service API Key (defaults from PLATFORM_API_KEY) | ${PLATFORM_API_KEY} |
| SPARK_API_SECRET | Required | string | Spark service API Secret (defaults from PLATFORM_API_SECRET) | ${PLATFORM_API_SECRET} |
| SPARK_RTASR_APPID | Required | string | Spark real-time speech-to-text application ID (defaults from PLATFORM_APP_ID) | ${PLATFORM_APP_ID} |
| SPARK_RTASR_KEY | Required | string | Spark real-time speech-to-text Key (defaults from SPARK_RTASR_API_KEY) | ${SPARK_RTASR_API_KEY} |
| SPARK_IMAGE_APP_ID | Required | string | Spark image generation application ID (defaults from PLATFORM_APP_ID) | ${PLATFORM_APP_ID} |
| SPARK_IMAGE_API_KEY | Required | string | Spark image generation API Key (defaults from PLATFORM_API_KEY) | ${PLATFORM_API_KEY} |
| SPARK_IMAGE_API_SECRET | Required | string | Spark image generation API Secret (defaults from PLATFORM_API_SECRET) | ${PLATFORM_API_SECRET} |
| WECHAT_COMPONENT_APPID | Optional | string | WeChat third-party platform AppID | your-wechat-component-appid |
| WECHAT_COMPONENT_SECRET | Optional | string | WeChat third-party platform Secret | your-wechat-secret |
| WECHAT_TOKEN | Optional | string | WeChat message verification Token | your-wechat-token |
| WECHAT_ENCODING_AES_KEY | Optional | string | WeChat message encryption key | your-wechat-encoding-aes-key |
| WORKFLOW_CHAT_URL | Required | url | Workflow chat API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/chat/completions |
| WORKFLOW_DEBUG_URL | Required | url | Workflow debug API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/debug/chat/completions |
| WORKFLOW_RESUME_URL | Required | url | Workflow resume API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/resume |
| TENANT_ID | Required | string | Tenant ID | 680ab54f |
| TENANT_KEY | Required | string | Tenant API Key | 7b709739e8da44536127a333c7603a83 |
| TENANT_SECRET | Required | string | Tenant Secret | NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy |
| COMMON_APPID | Required | string | Common application ID (defaults from TENANT_ID) | ${TENANT_ID} |
| COMMON_APIKEY | Required | string | Common API Key (defaults from TENANT_KEY) | ${TENANT_KEY} |
| COMMON_API_SECRET | Required | string | Common API Secret (defaults from TENANT_SECRET) | ${TENANT_SECRET} |
| ADMIN_UID | Required | string | Administrator user ID | 9999 |
| APP_URL | Required | url | Application service API address (port defaults from CORE_TENANT_PORT) | http://core-tenant:${CORE_TENANT_PORT:-5052}/v2/app |
| KNOWLEDGE_URL | Required | url | Knowledge base service API address (port defaults from CORE_KNOWLEDGE_PORT) | http://core-knowledge:${CORE_KNOWLEDGE_PORT:-20010}/knowledge |
| TOOL_URL | Required | url | Tool service API address | http://core-link:18888 |
| WORKFLOW_URL | Required | url | Workflow service API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880} |
| SPARK_DB_URL | Required | url | Spark database service API address (port defaults from CORE_DATABASE_PORT) | http://core-database:${CORE_DATABASE_PORT:-7990} |
| LOCAL_MODEL_URL | Required | url | Local model service address | http://127.0.0.1:33778 |

---

## 13. MaaS Platform Configuration Module

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| MAAS_APP_ID | Required | string | MaaS platform application ID (defaults from PLATFORM_APP_ID) | ${PLATFORM_APP_ID} |
| MAAS_API_KEY | Required | string | MaaS platform API Key (defaults from PLATFORM_API_KEY) | ${PLATFORM_API_KEY} |
| MAAS_API_SECRET | Required | string | MaaS platform API Secret (defaults from PLATFORM_API_SECRET) | ${PLATFORM_API_SECRET} |
| MAAS_CONSUMER_ID | Required | string | MaaS consumer ID (defaults from TENANT_ID) | ${TENANT_ID} |
| MAAS_CONSUMER_KEY | Required | string | MaaS consumer Key (defaults from TENANT_KEY) | ${TENANT_KEY} |
| MAAS_CONSUMER_SECRET | Required | string | MaaS consumer Secret (defaults from TENANT_SECRET) | ${TENANT_SECRET} |
| MAAS_WORKFLOW_VERSION | Required | url | MaaS workflow version API address | http://127.0.0.1:8080/workflow/version |
| MAAS_SYNCHRONIZE_WORK_FLOW | Required | url | MaaS synchronize workflow API address | http://127.0.0.1:8080/workflow |
| MAAS_PUBLISH | Required | url | MaaS publish API address | http://127.0.0.1:8080/workflow/publish |
| MAAS_CLONE_WORK_FLOW | Required | url | MaaS clone workflow API address | http://127.0.0.1:8080/workflow/internal-clone |
| MAAS_GET_INPUTS | Required | url | MaaS get inputs information API address | http://127.0.0.1:8080/workflow/get-inputs-info |
| MAAS_CAN_PUBLISH_URL | Required | url | MaaS check can publish API address | http://127.0.0.1:8080/workflow/can-publish |
| MAAS_PUBLISH_API | Required | url | MaaS publish API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/publish |
| MAAS_AUTH_API | Required | url | MaaS authentication API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/auth |
| MAAS_MCP_REGISTER | Required | url | MaaS MCP register API address | http://127.0.0.1:8080/workflow/release |
| MAAS_WORKFLOW_CONFIG | Required | url | MaaS workflow configuration API address | http://127.0.0.1:8080/workflow/get-flow-advanced-config |
| BOT_API_CBM_BASE_URL | Required | url | Bot API CBM base address (supports ws/wss, note written as ws(s):// in env.example) | wss://spark-openapi.cn-huabei-1.xf-yun.com |
| BOT_API_MAAS_BASE_URL | Required | url | Bot API MaaS base address (note written as http(s):// in env.example) | https://xingchen-api.xf-yun.com |
| TENANT_CREATE_APP | Required | url | Tenant create application API address (port defaults from CORE_TENANT_PORT) | http://core-tenant:${CORE_TENANT_PORT:-5052}/v2/app |
| TENANT_GET_APP_DETAIL | Required | url | Tenant get application details API address (port defaults from CORE_TENANT_PORT) | http://core-tenant:${CORE_TENANT_PORT:-5052}/v2/app/details |

---

## 14. Third-Party Service Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| DEEPSEEK_URL | Required | url | DeepSeek API endpoint address | https://api.deepseek.com/chat/completions |
| DEEPSEEK_API_KEY | Optional | string | DeepSeek API Key | sk-xxx |

---

## 15. Other System Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| SERVICE_LOCATION | Required | string | Service availability zone (dx/hf/gz) | hf |
| HEALTH_CHECK_INTERVAL | Required | string | Health check interval time | 30s |
| HEALTH_CHECK_TIMEOUT | Required | string | Health check timeout | 10s |
| HEALTH_CHECK_RETRIES | Required | int | Health check retry count | 60 |
| NETWORK_SUBNET | Required | string | Docker network subnet configuration | 172.20.0.0/16 |

---

## Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Detailed deployment steps
- [Quick Start](../README.md) - Quick start guide

## Contributing

If you find any errors in the configuration description or need to add more information, please feel free to submit an Issue or Pull Request.
