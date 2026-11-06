# astronAgent Complete Deployment Guide

> Python Console uses Django ASGI for accounts, spaces, resources, Agent and workflow management, and publishing. Upgrades preserve business records, UIDs, resource ownership, and persistent credentials. Agent and workflow execution remain in core/agent and core/workflow.

This guide will help you start all components of the astronAgent project in the correct order, including authentication, knowledge base, and core services.

## 📋 Project Architecture Overview

The astronAgent project consists of the following three main components:

1. **Python Console** - Internal accounts, space authorization, resources, Agent/workflow configuration, and publishing; runs as `console-hub` in the main Compose stack, with no separate authentication service
2. **RagFlow** - Knowledge base and document retrieval service (optional component, deploy as needed)
3. **astronAgent** - Core business service cluster (required component)

## 🚀 Deployment Steps

### Prerequisites

**Agent System Requirements**
- CPU >= 2 Core
- RAM >= 4 GiB
- Disk >= 50 GB

**RAGFlow Requirements**
- CPU >= 4 Core
- RAM >= 16 GB
- Disk >= 50 GB

### Step 1: Prepare Docker and preserve existing data

Install Docker and Docker Compose. The default stack needs no `.env` file or environment edits. For upgrades, preserve business tables, data volumes, and existing credentials; see the [Python Console operating instructions](../console/backend/README.md) for account import and password reset.

### Step 2: Start RagFlow Knowledge Base Service (Optional)

RagFlow is an open-source RAG (Retrieval-Augmented Generation) engine that provides accurate question-answering services using deep document understanding technology.

To start the RagFlow service, run our [docker-compose.yml](/docker/ragflow/docker-compose.yml) file or [docker-compose-macos.yml](/docker/ragflow/docker-compose-macos.yml). Before running the installation commands, please ensure that Docker and Docker Compose are installed on your machine.

```bash
# Navigate to RagFlow directory
cd docker/ragflow

# Add executable permissions to all sh files
chmod +x *.sh

# Start RagFlow service (including all dependencies)
docker compose up -d --build
```

**Access Address:**
- RagFlow Web Interface: http://localhost:18080

**Model Configuration Steps:**
1. Click on your avatar to enter the **Model Providers** page, select **Add Model**, fill in the corresponding **API address** and **API Key**, and add both **Chat model** and **Embedding model** respectively.
2. In the upper right corner of the same page, click **Set Default Models** to set the **Chat model** and **Embedding model** added in the first step as defaults.


**Important Configuration Notes:**
- Elasticsearch is used by default. To use opensearch or infinity, modify the DOC_ENGINE configuration in .env
- GPU acceleration is supported, start with `docker-compose-gpu.yml`

### Step 3: Review optional access and integration settings

The default stack includes account authentication, database, Redis, and storage settings. Start it directly in `docker/astronAgent`; do not copy or edit `.env` for normal startup. Port 80 serves `http://localhost/` and `http://<server-ip>/`, including IPv4 and bracketed IPv6 addresses. Changing the optional `EXPOSE_NGINX_PORT` requires no matching origin setting.

Console generates its signing key once in the `console_signing_secrets` volume and reuses it on restarts. An existing `CONSOLE_SECRET_KEY` is imported on the first upgrade; a conflict with the persisted key fails instead of silently rotating credentials. Preserve this volume with the deployment data.

For a custom domain, optionally set `CONSOLE_ALLOWED_HOSTS`. API examples use the validated current request origin by default; image links use relative paths. `CONSOLE_PUBLIC_ORIGIN` is an optional fixed origin, required for WeChat OAuth callbacks. Password-reset commands normally print a relative `/reset-password#...` link to append to the current console address; use `--origin` to request a complete link without changing environment variables.

Django retains same-origin CSRF checks with an empty `CONSOLE_CSRF_TRUSTED_ORIGINS` by default. `CONSOLE_COOKIE_SECURE=auto` follows HTTP/HTTPS. For an additional HTTPS reverse proxy, configure only the direct trusted proxy in `CONSOLE_TRUSTED_PROXIES` and ensure it sets/overwrites the forwarded protocol header. Custom domains and HTTPS are optional deployment choices; see the [configuration reference](CONFIGURATION.md).

Expose the application gateway to users. Bundled MinIO maintenance ports remain bound to host loopback; separate external storage access needs its own protected endpoint. RAGFlow and RPA are optional independent deployments. Business accounts for RAGFlow, iFLYTEK Open Platform, AI Ability Chat, Virtual Man, and Spark Knowledge Base are configured in **Platform Account Management** after startup.

New users register at `/register`; no default administrator password is provisioned. Existing users retain their UID and receive operator-issued password-reset links.

### Step 4: Start astronAgent Core Services (Required Deployment Step)

#### 4.1 Start astronAgent Services

To start astronAgent services, run our [docker-compose.yaml](/docker/astronAgent/docker-compose.yaml) file. Before running the installation commands, please ensure that Docker and Docker Compose are installed on your machine.

```bash
# Navigate to astronAgent directory
cd docker/astronAgent

# Start all services
docker compose up -d --build
```

After startup, open `http://localhost/` or `http://<server-ip>/` and register an account. No host, origin, or cookie environment edits are needed for this default HTTP entry point.

#### 4.2 Configure Platform Account Management (Optional, configure business capabilities as needed)

After astronAgent starts, access the console and log in. Open **Platform Account Management** from the left menu. Platform Account Management is at the same menu level as **Application Management** and **Resource Management**, and contains the following four configuration cards. After saving, the configuration takes effect globally immediately. The system automatically refreshes the cache, and containers do not need to be restarted. If a feature depends on a capability that has not been configured, the system prompts the user to configure it in Platform Account Management and does not block system startup.

**iFLYTEK Open Platform** (used by built-in Spark model, real-time speech recognition, image generation, and related capabilities):

For documentation, see: https://www.xfyun.cn/doc/platform/quickguide.html

After creating your application, you may need to purchase or claim API authorization service quotas for the corresponding capabilities:
- Spark LLM API: https://xinghuo.xfyun.cn/sparkapi
  (For the LLM API, you'll need an additional SPARK_API_PASSWORD available on the page)
  (1、The text generation/optimization feature for instruction-based assistants requires Spark Ultra. It can be enabled at: https://console.xfyun.cn/services/bm4
2、The AI generation and AI code generation capabilities for workflow agents require Spark 3.5 Max and DeepSeek V3.
Spark 3.5 Max: https://console.xfyun.cn/services/bm35
DeepSeek V3: https://maas.xfyun.cn/modelSquare)
- Real-time Speech Recognition API: https://console.xfyun.cn/services/rta
- Image Generation API: https://www.xfyun.cn/services/wtop
- Talk Agent: https://www.xfyun.cn/services/VirtualHumans

Prepare and fill in the following fields under **Platform Account Management - iFLYTEK Open Platform**:
- `PLATFORM_APP_ID`
- `PLATFORM_API_KEY`
- `PLATFORM_API_SECRET`
- `SPARK_API_PASSWORD`
- `SPARK_RTASR_API_KEY`

**AI Ability Chat** (used by platform AI generation capabilities, compatible with OpenAI protocols, such as prompt optimization and one-sentence agent creation):
- `AI_ABILITY_CHAT_BASE_URL`
- `AI_ABILITY_CHAT_MODEL`
- `AI_ABILITY_CHAT_API_KEY`

**Virtual Man capability**:
- `SPARK_VIRTUAL_MAN_APP_ID`
- `SPARK_VIRTUAL_MAN_API_KEY`
- `SPARK_VIRTUAL_MAN_API_SECRET`

**Knowledge Base Platform**:
- RAGFlow: `RAGFLOW_BASE_URL`, `RAGFLOW_API_TOKEN`, `RAGFLOW_TIMEOUT`, `RAGFLOW_DEFAULT_GROUP`
- Spark Knowledge Base: `XINGHUO_DATASET_ID`

When creating a knowledge base, users choose **RAGFlow** or **Spark Knowledge Base**. Only the platform actually used needs to be configured.

**Obtaining RagFlow API Token:**
1. Visit RagFlow Web Interface: http://localhost:18080
2. Log in and click on your avatar to enter user settings
3. Click API to generate an API KEY
4. Fill it in as `RAGFLOW_API_TOKEN` under **Platform Account Management - Knowledge Base Platform**

**Obtaining Spark Knowledge Base Dataset ID:**

Spark RAG cloud service provides two usage methods:

##### Method 1: Obtain from the Web Interface

1. Use the APP_ID and API_SECRET created on the iFLYTEK Open Platform
2. Directly obtain the Spark dataset ID from the web interface, see: [xinghuo_rag_tool.html](/docs/xinghuo_rag_tool.html)

##### Method 2: Using cURL Command Line

If you prefer using command-line tools, you can create a dataset with the following cURL command:

```bash
# Create Spark RAG dataset
curl -X PUT 'https://chatdoc.xfyun.cn/openapi/v1/dataset/create' \
    -H "Accept: application/json" \
    -H "appId: your_app_id" \
    -H "timestamp: $(date +%s)" \
    -H "signature: $(echo -n "$(echo -n "your_app_id$(date +%s)" | md5sum | awk '{print $1}')" | openssl dgst -sha1 -hmac 'your_api_secret' -binary | base64)" \
    -F "name=我的数据集"
```

**Notes:**
- Please replace `your_app_id` with your actual APP ID
- Please replace `your_api_secret` with your actual API Secret

After obtaining the dataset ID, fill it in as `XINGHUO_DATASET_ID` under **Platform Account Management - Knowledge Base Platform**.

## 📊 Service Access Addresses

After startup, you can access the services at the following addresses:

### Knowledge Base Service
- **RagFlow Web Interface**: http://localhost:18080

### AstronAgent Core Services
- **Console Frontend (nginx proxy)**: http://localhost/

## 📚 Additional Resources

- [AstronAgent Official Documentation](https://www.xfyun.cn/doc/spark/Agent01-%E5%B9%B3%E5%8F%B0%E4%BB%8B%E7%BB%8D.html)
- [RagFlow Official Documentation](https://ragflow.io/docs)
- [Docker Compose Official Documentation](https://docs.docker.com/compose/)

## 🤝 Technical Support

If you encounter issues, please:

1. Check the log files of related services
2. Review the official documentation and troubleshooting guides
3. Submit an Issue on the project's GitHub repository
4. Contact the technical support team

---

**Note**: For first-time deployment, it is recommended to verify all functionalities in a test environment before deploying to production.
