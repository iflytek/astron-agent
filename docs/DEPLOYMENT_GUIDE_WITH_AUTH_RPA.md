# AstronAgent Project Complete Deployment Guide

This guide will help you start all components of the AstronAgent project in the correct order, including authentication, RPA, knowledge base, and core services.

## 📋 Project Architecture Overview

The AstronAgent project consists of the following four main components:

1. **Casdoor** - Identity authentication and single sign-on service (required deployment component, provides SSO functionality)
2. **RagFlow** - Knowledge base and document retrieval service (optional deployment component, deploy as needed)
3. **AstronAgent** - Core business service cluster (required deployment component)
4. **RPA** - Enterprise-grade Robotic Process Automation service (backend automatic deployment)

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

### Step 1: Start RagFlow Knowledge Base Service (Optional, deploy as needed)

RagFlow is an open-source RAG (Retrieval-Augmented Generation) engine that provides accurate question-answering services using deep document understanding technology.

To start the RagFlow service, run our [docker-compose.yml](/docker/ragflow/docker-compose.yml) file or [docker-compose-macos.yml](/docker/ragflow/docker-compose-macos.yml). Before running the installation command, please ensure Docker and Docker Compose are installed on your machine.

```bash
# Navigate to the RagFlow directory
cd docker/ragflow

# Add executable permissions to all sh files
chmod +x *.sh

# Start RagFlow service (includes all dependencies)
docker compose up -d

# Check service status
docker compose ps

# View service logs
docker compose logs -f ragflow
```

**Access URLs:**
- RagFlow Web Interface: http://localhost:18080

**Model Configuration Steps:**
1. Click on your avatar to enter the **Model Providers** page, select **Add Model**, fill in the corresponding **API address** and **API Key**, and add both **Chat model** and **Embedding model**.
2. In the upper right corner of the same page, click **Set Default Models** and set the **Chat model** and **Embedding model** added in step 1 as default.


**Important Configuration Notes:**
- Elasticsearch is used by default. To use opensearch or infinity, modify the DOC_ENGINE configuration in .env
- GPU acceleration is supported, use `docker-compose-gpu.yml` to start

### Step 2: Configure AstronAgent Environment Variables

Before starting AstronAgent services, you need to configure the relevant connection information.

```bash
# Navigate to astronAgent directory
cd docker/astronAgent

# Copy environment variable configuration
cp .env.example .env
```

The `.env` file is only used for startup, access addresses, authentication, database, Redis, object storage, and other infrastructure settings. Business capability accounts such as RAGFlow, iFLYTEK Open Platform, AI Ability Chat, Virtual Man, and Spark Knowledge Base are no longer configured in `.env`. Configure them in **Platform Account Management** after AstronAgent starts.

#### 2.1 Configure Service Host Address

```bash
# Navigate to astronAgent directory
cd docker/astronAgent

# Edit environment variable configuration
vim .env
```

Configure the AstronAgent service host address:

```env
HOST_BASE_ADDRESS=http://localhost
```

**Notes:**
- If you use a domain name for access, replace `localhost` with your domain name
- Ensure nginx and minio ports are properly exposed

#### 2.2 Prepare Business Capability Account Information (configure in the UI after startup)

The following settings do not need to be written to `.env`. After AstronAgent starts, log in to the console and open **Platform Account Management** from the left menu. Fill in the corresponding cards; after saving, the configuration takes effect globally without restarting containers. If a feature depends on a capability that has not been configured, the system will prompt the user to configure it in Platform Account Management and will not block system startup.

**iFLYTEK Open Platform** (used by built-in Spark model, real-time speech recognition, image generation, and related capabilities):

For documentation, see: https://www.xfyun.cn/doc/platform/quickguide.html

After creating your application, you may need to purchase or claim API authorization service quotas for the corresponding capabilities:
- Spark LLM API: https://xinghuo.xfyun.cn/sparkapi
  (For the LLM API, you'll need an additional SPARK_API_PASSWORD available on the page : https://console.xfyun.cn/services/bm4)
- Real-time Speech Recognition API: https://console.xfyun.cn/services/rta
- Image Generation API: https://www.xfyun.cn/services/wtop

Prepare and fill in the following fields in the UI:
- `PLATFORM_APP_ID`
- `PLATFORM_API_KEY`
- `PLATFORM_API_SECRET`
- `SPARK_API_PASSWORD`
- `SPARK_RTASR_API_KEY`

**AI Ability Chat** (default Agent model interface, OpenAI protocol):
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

### Step 3: Start AstronAgent Core Services (includes Casdoor authentication service, RPA backend service)

To start the AstronAgent service, run our [docker-compose-with-auth-rpa.yaml](/docker/astronAgent/docker-compose-with-auth-rpa.yaml) file. **This file has integrated Casdoor and RPA backend services through the `include` mechanism**, and will automatically start Casdoor and RPA.

```bash
# Navigate to the astronAgent directory
cd docker/astronAgent

# Start all services (includes Casdoor, RPA)
docker compose -f docker-compose-with-auth-rpa.yaml up -d
```

**Notes:**
- Casdoor default login username: `admin`, password: `123`

### Step 4: Configure Platform Account Management (Optional, configure business capabilities as needed)

After AstronAgent starts, access the console and log in. Open **Platform Account Management** from the left menu. Platform Account Management is at the same menu level as **Application Management** and **Resource Management**, and contains the following four configuration cards:

1. **iFLYTEK Open Platform**: fill in `PLATFORM_APP_ID`, `PLATFORM_API_KEY`, `PLATFORM_API_SECRET`, `SPARK_API_PASSWORD`, `SPARK_RTASR_API_KEY`
2. **AI Ability Chat**: fill in `AI_ABILITY_CHAT_BASE_URL`, `AI_ABILITY_CHAT_MODEL`, `AI_ABILITY_CHAT_API_KEY`
3. **Virtual Man capability**: fill in `SPARK_VIRTUAL_MAN_APP_ID`, `SPARK_VIRTUAL_MAN_API_KEY`, `SPARK_VIRTUAL_MAN_API_SECRET`
4. **Knowledge Base Platform**: fill in RAGFlow fields `RAGFLOW_BASE_URL`, `RAGFLOW_API_TOKEN`, `RAGFLOW_TIMEOUT`, `RAGFLOW_DEFAULT_GROUP`, and Spark Knowledge Base field `XINGHUO_DATASET_ID`

After saving, the configuration takes effect globally immediately. The system automatically refreshes the cache, and AstronAgent containers do not need to be restarted.

### Step 5: Modify Casdoor Authentication (Optional)

You can create new applications and organizations in Casdoor as needed and update the configuration information in the `.env` file (default organization and application already exist).

#### 5.1 Configure Casdoor Application

**Get Casdoor Configuration Information:**
1. Visit the Casdoor admin console: [http://localhost:8000](http://localhost:8000)
2. Log in with the default admin account: `admin / 123`
3. **Create Organization**
   Go to the [http://localhost:8000/organizations](http://localhost:8000/organizations) page, click "Add", fill in the organization name, save and exit.
4. **Create Application and Bind Organization**
   Go to the [http://localhost:8000/applications](http://localhost:8000/applications) page, click "Add".

   Fill in the following information when creating the application:
   - **Name**: Custom application name, e.g., `agent`
   - **Redirect URL**: Set to the project's callback address. If Nginx exposes port `80`, use `http://your-local-ip/callback`; if it's another port (e.g., `888`), use `http://your-local-ip:888/callback`
   - **Organization**: Select the organization name just created
5. After saving the application, record the following information and match it with the project configuration items:

| Casdoor Information | Example Value | Corresponding `.env` Configuration |
|---------------------|---------------|-------------------------------------|
| Casdoor service URL | `http://localhost:8000` | `CONSOLE_CASDOOR_URL=http://localhost:8000` |
| Client ID | `your-casdoor-client-id` | `CONSOLE_CASDOOR_ID=your-casdoor-client-id` |
| Application Name | `your-casdoor-app-name` | `CONSOLE_CASDOOR_APP=your-casdoor-app-name` |
| Organization Name | `your-casdoor-org-name` | `CONSOLE_CASDOOR_ORG=your-casdoor-org-name` |

6. Fill in the above configuration information in the project's environment variable file:
```bash
# Navigate to the astronAgent directory
cd docker/astronAgent

# Edit environment variable configuration
vim .env
```

**Add or update the following configuration items in the .env file:**
```env
# Casdoor configuration
CONSOLE_CASDOOR_URL=http://localhost:8000
CONSOLE_CASDOOR_ID=your-casdoor-client-id
CONSOLE_CASDOOR_APP=your-casdoor-app-name
CONSOLE_CASDOOR_ORG=your-casdoor-org-name
```

7. Restart the AstronAgent service to apply the new configuration:
```bash
docker compose restart console-frontend console-hub
```

## 📊 Service Access URLs

After startup is complete, you can access the services at the following addresses:

### Authentication Service
- **Casdoor Admin Interface**: http://localhost:8000

### Knowledge Base Service
- **RagFlow Web Interface**: http://localhost:18080

### AstronAgent Core Services
- **Console Frontend (nginx proxy)**: http://localhost/

### RPA Core Services
- **RPA Backend Service Entry (nginx proxy)**: http://localhost:32742

## 📚 Additional Resources

- [AstronAgent Official Documentation](https://www.xfyun.cn/doc/spark/Agent01-%E5%B9%B3%E5%8F%B0%E4%BB%8B%E7%BB%8D.html)
- [Casdoor Official Documentation](https://casdoor.org/docs/overview)
- [RagFlow Official Documentation](https://ragflow.io/docs)
- [Docker Compose Official Documentation](https://docs.docker.com/compose/)

## 🤝 Technical Support

If you encounter issues, please:

1. Check the relevant service log files
2. Review the official documentation and troubleshooting guide
3. Submit an issue on the project's GitHub repository
4. Contact the technical support team

---

**Note**: For first-time deployment, it is recommended to validate all functionalities in a test environment before deploying to production.
