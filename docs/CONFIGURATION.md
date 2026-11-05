# Environment Variables Configuration Guide

This document provides detailed descriptions of the environment variables required by the system, including middleware, service ports, authentication, access addresses, and more. Business capability accounts such as iFLYTEK Open Platform, AI Ability Chat, Virtual Man, and Knowledge Base Platform have moved to the console **Platform Account Management** page and are no longer written to `.env`.

For cryptographic defaults, external compatibility paths, and TLS limitations,
see [Cryptographic mechanisms and deployment limits](CRYPTOGRAPHY.md).

## Quick Start

### Required Manual Configuration Fields

Before deploying with Docker Compose, the following environment variables **must be manually configured**. For detailed configuration steps and instructions, please refer to the [Deployment Guide](https://github.com/iflytek/astron-agent/blob/main/docs/DEPLOYMENT_GUIDE.md).

**Key Configuration Items Overview**:

- **Python Console accounts**: see [configuration and migration](../console/backend/README.md).

- **Host Address Configuration**:
  - `HOST_BASE_ADDRESS` - Set to your server address or domain name

- **Deployment-internal authentication (no manual configuration)**:
  - Docker Compose generates and persists `WORKFLOW_INTERNAL_API_KEY`,
    `TENANT_KEY`, and `TENANT_SECRET` on first startup when their `.env` values
    are empty. Helm generates and reuses the corresponding Secrets on live
    installs and upgrades. Strong explicit overrides remain available, but are
    not required for the normal startup path.

- **Sandbox Internal Authentication**:
  - Docker Compose generates and persists the artifact-upload and runtime tokens
    when their `.env` values are empty. Helm does the same when both `token` and
    `existingSecret` are empty; offline GitOps rendering should use pre-created
    independent Secrets so their values remain stable between renders.

**Business capability accounts configured after startup in Platform Account Management** (not written to `.env`):

- **iFLYTEK Open Platform**: `PLATFORM_APP_ID`, `PLATFORM_API_KEY`, `PLATFORM_API_SECRET`, `SPARK_API_PASSWORD`, `SPARK_RTASR_API_KEY`
- **AI Ability Chat**: `AI_ABILITY_CHAT_BASE_URL`, `AI_ABILITY_CHAT_MODEL`, `AI_ABILITY_CHAT_API_KEY`
- **Virtual Man capability**: `SPARK_VIRTUAL_MAN_APP_ID`, `SPARK_VIRTUAL_MAN_API_KEY`, `SPARK_VIRTUAL_MAN_API_SECRET`
- **Knowledge Base Platform**: RAGFlow fields `RAGFLOW_BASE_URL`, `RAGFLOW_API_TOKEN`, `RAGFLOW_TIMEOUT`, `RAGFLOW_DEFAULT_GROUP`, and Spark Knowledge Base field `XINGHUO_DATASET_ID`

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
>   - MinIO related: `OSS_ENDPOINT`, `OSS_DOWNLOAD_HOST`, `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, etc.
>
> **MinIO defaults**:
> - To preserve one-command Docker Compose startup, the bundled MinIO uses `minioadmin`/`minioadmin123` by default and OSS clients derive their credentials from the same values. No manual credential entry is required. Replacing bundled MinIO with external object storage requires an explicit Compose override that replaces the bundled MinIO and its configuration check, then configures the external endpoint, access key, and secret key together.
> - The bundled MinIO API and administrative console bind only to `127.0.0.1` on the host. Application containers use the configured API port over the private Compose network; `minio.localhost` gives local browsers and containers one identical signed hostname. Remote access must be an explicit decision through a separately protected TLS proxy; do not publish MinIO directly to an untrusted network.
> - The Helm chart does not render MinIO credentials. Pre-create `minio.auth.existingSecret`; the bundled API and console Services default to separate `ClusterIP` Services. `NodePort`/`LoadBalancer` exposure is opt-in, and exposing the API never implicitly exposes the console.

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
| MYSQL_URL | Use Default | string | Legacy JDBC-form URL accepted by core account-config readers; Console uses MYSQL_HOST/PORT and CONSOLE_MYSQL_DB | jdbc:mysql://mysql:3306/astron_console |
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
| MINIO_ROOT_USER | Use Default | string | Bundled MinIO administrator username; override when exposing MinIO externally | minioadmin |
| MINIO_ROOT_PASSWORD | Use Default | string | Bundled MinIO administrator password; override when exposing MinIO externally | minioadmin123 |
| EXPOSE_MINIO_PORT | Use Default | int | Host loopback-only MinIO API maintenance port (`127.0.0.1` binding is fixed by Compose) | 18998 |
| EXPOSE_MINIO_CONSOLE_PORT | Use Default | int | Host loopback-only MinIO console maintenance port (`127.0.0.1` binding is fixed by Compose) | 18999 |
| OSS_TYPE | Use Default | string | Object storage type (s3/oss/obs, etc.) | s3 |
| OSS_ENDPOINT | Use Default | url | Object storage service endpoint address | http://minio:${EXPOSE_MINIO_PORT} |
| OSS_ACCESS_KEY_ID | Use Default | string | Object-storage access key ID; bundled MinIO derives it from the administrator username | ${MINIO_ROOT_USER:-minioadmin} |
| OSS_ACCESS_KEY_SECRET | Use Default | string | Object-storage access key secret; bundled MinIO derives it from the administrator password | ${MINIO_ROOT_PASSWORD:-minioadmin123} |
| OSS_BUCKET_NAME | Use Default | string | Object storage bucket name | workflow |
| OSS_TTL | Use Default | int | Object storage URL validity period (seconds) | 157788000 |
| OSS_DOWNLOAD_HOST | Use Default | url | Endpoint embedded in download URLs; `minio.localhost` resolves to host loopback for local browsers and to MinIO's private-network alias for containers, preserving the signed Host | http://minio.localhost:${EXPOSE_MINIO_PORT} |

### Helm MinIO Security Settings

| Value | Configuration Type | Description | Default / Example |
|-------|--------------------|-------------|-------------------|
| `minio.auth.existingSecret` | Required | Pre-created Secret shared by MinIO and all in-chart S3 consumers; the chart never renders its credential values | `astron-agent-minio-credentials` |
| `minio.auth.rootUserKey` | Required | Secret key containing the MinIO/S3 access key | `root-user` |
| `minio.auth.rootPasswordKey` | Required | Secret key containing the MinIO/S3 secret key | `root-password` |
| `minio.auth.existingSecretChecksum` | Optional | Non-secret rotation marker; update it to roll all consumers after rotating the Secret in place | (empty) |
| `minio.service.type` | Use Default | Bundled MinIO API Service type; external exposure is explicit opt-in | `ClusterIP` |
| `minio.consoleService.type` | Use Default | Separate MinIO console Service type; it is never exposed merely because the API is exposed | `ClusterIP` |
| `minio.publicEndpoint` | Conditional | Exact client-facing origin (scheme, host, optional port; no path/query/fragment) for presigned/download URLs; also injected into Core Agent as `SKILL_RESOURCE_TRUSTED_ORIGIN`; configuring it does not create an Ingress or expose a Service | (empty; internal endpoint) |
| `minio.external.endpoint` | Conditional | Internal S3-compatible endpoint required when `minio.enabled=false` and an enabled service uses object storage | `https://s3.internal.example.com` |
| `minio.external.publicEndpoint` | Optional | Client-facing endpoint for an external S3-compatible service | `https://objects.example.com` |

---

## 2. Observability Configuration (OTLP and Langfuse)

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
| LANGFUSE_ENABLED | Use Default | bool | Enable the independent Langfuse OTLP/HTTP trace exporter | false |
| LANGFUSE_PUBLIC_KEY | Required when enabled | string | Langfuse project public key | (empty) |
| LANGFUSE_SECRET_KEY | Required when enabled | string | Langfuse project secret key; inject it through a secret manager in production | (empty) |
| ASTRON_TRACE_CONTEXT_SECRET | Recommended when enabled | string | Independent Astron-only secret shared by Agent and Workflow to authenticate internal trace propagation | (empty) |
| LANGFUSE_HOST | Use Default | url | Langfuse base URL; Astron derives the v4 OTLP traces endpoint | https://cloud.langfuse.com |
| LANGFUSE_CAPTURE_INPUT_OUTPUT | Use Default | bool | Export prompt/input and response/output content; disabled for privacy by default | false |
| LANGFUSE_MAX_ATTRIBUTE_LENGTH | Use Default | int | Maximum exported string attribute length | 8192 |
| LANGFUSE_ENVIRONMENT | Use Default | string | Environment label attached to Langfuse traces | default |
| LANGFUSE_RELEASE | Optional | string | Release or deployment label attached to Langfuse traces | (empty) |

See the [Langfuse observability guide](/guide/observability) for privacy behavior, deployment, verification, and evaluator setup.

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

## 4. Python Console accounts

See [Python Console configuration](../console/backend/README.md) for the required persistent secret, public origin, allowed hosts, secure cookies, database and Redis settings. Registration uses username/password. Existing users retain their UID and require an operator-issued password reset.

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
| APP_AUTH_API_KEY | Derived | secret | Application authentication API Key, loaded from the generated tenant bootstrap credential | generated and persisted |
| APP_AUTH_SECRET | Derived | secret | Application authentication Secret, loaded from the generated tenant bootstrap credential | generated and persisted |
| SKILL_RESOURCE_TRUSTED_ORIGIN | Derived | url origin | Only remote origin from which Core Agent may fetch Skill resources; Compose derives it from `OSS_REMOTE_ENDPOINT`, Helm from `minio.publicEndpoint`/the effective MinIO public endpoint; no other URL origin is trusted | http://minio.localhost:${EXPOSE_MINIO_PORT} |
| SKILL_RESOURCE_TRUSTED_BUCKET | Derived | string | Only bucket accepted for remote Skill resources; Compose/Helm derive it from `OSS_BUCKET_CONSOLE`/`consoleHub.env.ossBucketConsole`, and Core Agent additionally restricts keys to `skill-files/` with complete SigV4 parameters | console-oss |

---

## 10. Knowledge Module Configuration

> **Knowledge Base Selection Note**: The system supports two knowledge base methods. Choose one when creating a knowledge base:
> - **RAGFlow**: Use RAGFlow knowledge base service
> - **Spark Knowledge Base**: Use iFLYTEK Spark Knowledge Base service
>
> Knowledge platform accounts are no longer configured through `.env`. Fill in the corresponding fields under **Platform Account Management - Knowledge Base Platform** in the console. After saving, the configuration takes effect globally without restarting containers. Whichever method you choose, the corresponding configuration items are required; configuration items for the unchosen method can be left empty.

| Field | Platform | Configuration Type | Description | Example Value |
|-------|----------|--------------------|-------------|---------------|
| RAGFLOW_BASE_URL | RAGFlow | Conditional | RAGFlow service base address (required when using RAGFlow) | http://localhost:18080 |
| RAGFLOW_API_TOKEN | RAGFlow | Conditional | RAGFlow API access token (required when using RAGFlow) | your-ragflow-token |
| RAGFLOW_TIMEOUT | RAGFlow | Conditional | RAGFlow request timeout (seconds) (required when using RAGFlow) | 60 |
| RAGFLOW_DEFAULT_GROUP | RAGFlow | Conditional | RAGFlow default group name (required when using RAGFlow) | Astron Knowledge Base |
| XINGHUO_DATASET_ID | Spark Knowledge Base | Conditional | Spark Knowledge Base dataset ID (required when using Spark Knowledge Base) | (empty) |

---

## 11. Workflow Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| WORKFLOW_MYSQL_DB | Required | string | MySQL database name used by Workflow module | workflow |
| WORKFLOW_KAFKA_TOPIC | Required | string | Kafka topic name used by Workflow | spark-agent-builder |
| RUNTIME_ENV | Required | string | Runtime environment (dev/test/prod) | dev |
| CODE_EXEC_TYPE | Use Default | string | Isolated code executor. The built-in LangChain/Pyodide sandbox is enabled by default and needs no external credentials. E2B is optional and takes priority when enabled for a workflow; iFly and iFly-v2 remain optional remote executors. `disabled` explicitly disables code nodes and `local` is rejected. | langchain |
| CODE_EXEC_TIMEOUT_SEC | Use Default | int | Maximum built-in sandbox execution time in seconds (bounded to 1-600) | 10 |
| CODE_EXEC_MEMORY_LIMIT_MB | Use Default | int | Maximum built-in Pyodide V8 heap in megabytes (bounded to 128-2048) | 256 |
| WORKFLOW_INTERNAL_API_KEY | Auto-generated | secret | Authenticates trusted internal calls to privileged Workflow APIs. Compose and Helm generate and persist it; an optional explicit override must contain 32-128 safe characters. | generated and persisted |

The default `langchain` executor runs Python in the official Pyodide WebAssembly
sandbox through a pinned Deno runtime. It has no environment, host-file,
network, subprocess, or FFI permissions. E2B is optional; enabling it for a
workflow makes that workflow use E2B first. Running user-provided code inside
the core-workflow process (`local`) is not supported.

Upgrade note: an untouched config generated by older releases (`CODE_EXEC_TYPE=disabled`
without `CODE_EXEC_MEMORY_LIMIT_MB`) is migrated to the built-in sandbox at startup, so
no manual configuration change is required. To explicitly disable Code nodes, set
`CODE_EXEC_TYPE=disabled` in the container process environment.

---

## 12. Console Module Configuration

| Variable Name | Configuration Type | Type | Description | Example Value |
|---------------|-------------------|------|-------------|---------------|
| HOST_BASE_ADDRESS | User Required | url | Host base address | http://localhost |
| CONSOLE_DOMAIN | Required | url | Console domain address (defaults from HOST_BASE_ADDRESS and EXPOSE_NGINX_PORT) | ${HOST_BASE_ADDRESS}:${EXPOSE_NGINX_PORT} |
| OSS_REMOTE_ENDPOINT | Required | url origin | Exact origin embedded in Console presigned URLs and trusted by Core Agent; the local default is reachable with the same signed Host from both the Docker host and Compose containers; remote clients require a separately protected TLS endpoint | http://minio.localhost:${EXPOSE_MINIO_PORT} |
| OSS_BUCKET_CONSOLE | Required | string | Object storage bucket name used by Console | console-oss |
| OSS_PRESIGN_EXPIRY_SECONDS_CONSOLE | Required | int | Console presigned URL expiration time (seconds) | 600 |
| REDIS_DATABASE_CONSOLE | Required | int | Redis database index used by Console | 1 |
| WECHAT_COMPONENT_APPID | Optional | string | WeChat third-party platform AppID | your-wechat-component-appid |
| WECHAT_COMPONENT_SECRET | Optional | string | WeChat third-party platform Secret | your-wechat-secret |
| WECHAT_TOKEN | Optional | string | WeChat message verification Token | your-wechat-token |
| WECHAT_ENCODING_AES_KEY | Optional | string | WeChat message encryption key | your-wechat-encoding-aes-key |
| WORKFLOW_CHAT_URL | Required | url | Workflow chat API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/chat/completions |
| WORKFLOW_DEBUG_URL | Required | url | Workflow debug API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/debug/chat/completions |
| WORKFLOW_RESUME_URL | Required | url | Workflow resume API address (port defaults from CORE_WORKFLOW_PORT) | http://core-workflow:${CORE_WORKFLOW_PORT:-7880}/workflow/v1/resume |
| TENANT_ID | Required | string | Tenant ID | 680ab54f |
| TENANT_KEY | Auto-generated | secret | Tenant API Key generated and persisted by Compose or Helm; leave empty for normal startup | generated and persisted |
| TENANT_SECRET | Auto-generated | secret | Tenant Secret generated and persisted by Compose or Helm; leave empty for normal startup | generated and persisted |
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
| MAAS_APP_ID | Required | string | MaaS platform application ID (defaults from TENANT_ID) | ${TENANT_ID} |
| MAAS_API_KEY | Required | string | MaaS platform API Key (defaults from TENANT_KEY) | ${TENANT_KEY} |
| MAAS_API_SECRET | Required | string | MaaS platform API Secret (defaults from TENANT_SECRET) | ${TENANT_SECRET} |
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
