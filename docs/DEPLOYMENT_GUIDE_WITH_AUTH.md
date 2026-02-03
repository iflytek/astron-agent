# AstronAgent Complete Deployment Guide

This guide will help you start all components of the AstronAgent project in the correct order, including authentication, knowledge base, and core services.

## 📋 Project Architecture Overview

The AstronAgent project consists of the following three main components:

1. **Casdoor** - Identity authentication and single sign-on service (required component, provides SSO functionality)
2. **RagFlow** - Knowledge base and document retrieval service (optional component, deploy as needed)
3. **AstronAgent** - Core business service cluster (required component)

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

To start the RagFlow service, run our [docker-compose.yml](/docker/ragflow/docker-compose.yml) file or [docker-compose-macos.yml](/docker/ragflow/docker-compose-macos.yml). Before running the installation commands, please ensure that Docker and Docker Compose are installed on your machine.

```bash
# Navigate to RagFlow directory
cd docker/ragflow

# Add executable permissions to all sh files
chmod +x *.sh

# Start RagFlow service (including all dependencies)
docker compose up -d

# Check service status
docker compose ps

# View service logs
docker compose logs -f ragflow
```

**Access Address:**
- RagFlow Web Interface: http://localhost:18080

**Model Configuration Steps:**
1. Click on your avatar to enter the **Model Providers** page, select **Add Model**, fill in the corresponding **API address** and **API Key**, and add both **Chat model** and **Embedding model** respectively.
2. In the upper right corner of the same page, click **Set Default Models** to set the **Chat model** and **Embedding model** added in the first step as defaults.


**Important Configuration Notes:**
- Elasticsearch is used by default. To use opensearch or infinity, modify the DOC_ENGINE configuration in .env
- GPU acceleration is supported, start with `docker-compose-gpu.yml`

### Step 2: Configure AstronAgent Environment Variables

Before starting AstronAgent services, you need to configure the relevant connection information.

```bash
# Navigate to astronAgent directory
cd docker/astronAgent

# Copy environment variable configuration
cp .env.example .env
```

#### 2.1 Configure Knowledge Base Service Connection (Optional,If RagFlow is deployed)

Edit the docker/astronAgent/.env file to configure RagFlow connection information:

```bash
# Navigate to astronAgent directory
cd docker/astronAgent

# Edit environment variable configuration
vim .env
```

**Key Configuration Items:**

```env
# RAGFlow Configuration
RAGFLOW_BASE_URL=http://localhost:18080
RAGFLOW_API_TOKEN=ragflow-your-api-token-here
RAGFLOW_TIMEOUT=60
RAGFLOW_DEFAULT_GROUP=星辰知识库
```

**Obtaining RagFlow API Token:**
1. Visit RagFlow Web Interface: http://localhost:18080
2. Log in and click on your avatar to enter user settings
3. Click API to generate an API KEY
4. Update the generated API KEY to RAGFLOW_API_TOKEN in the .env file

#### 2.2 Configure iFLYTEK Open Platform APP_ID, API_KEY, and Related Information

For documentation, see: https://www.xfyun.cn/doc/platform/quickguide.html

After creating your application, you may need to purchase or claim API authorization service quotas for the corresponding capabilities:
- Spark LLM API: https://xinghuo.xfyun.cn/sparkapi
  (For the LLM API, you'll need an additional SPARK_API_PASSWORD available on the page)
  (The text AI generation/optimization feature for instructional assistants requires enabling Spark Ultra capability at https://console.xfyun.cn/services/bm4)
- Real-time Speech Recognition API: https://console.xfyun.cn/services/rta
- Image Generation API: https://www.xfyun.cn/services/wtop

Edit the docker/astronAgent/.env file and update the relevant environment variables:
```env
PLATFORM_APP_ID=your-app-id
PLATFORM_API_KEY=your-api-key
PLATFORM_API_SECRET=your-api-secret

SPARK_API_PASSWORD=your-api-password
SPARK_RTASR_API_KEY=your-rtasr-api-key
```

#### 2.3 Configure Spark RAG Cloud Service (Optional)

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

After obtaining the dataset ID, please update it in the docker/astronAgent/.env file:
```env
XINGHUO_DATASET_ID=
```

#### 2.4 Configure Service Host Address

Edit the docker/astronAgent/.env file to configure the AstronAgent service host address:

```env
HOST_BASE_ADDRESS=http://localhost
```

**Note:**
- If you're using a domain name for access, replace `localhost` with your domain name
- Ensure nginx and minio ports are properly exposed

### Step 3: Start AstronAgent Core Services (Including Casdoor Authentication Service)

To start AstronAgent services, run our [docker-compose-with-auth.yaml](/docker/astronAgent/docker-compose-with-auth.yaml) file. **This file has integrated the Casdoor authentication service through the `include` mechanism** and will automatically start Casdoor.

```bash
# Navigate to astronAgent directory
cd docker/astronAgent

# Start all services (including Casdoor)
docker compose -f docker-compose-with-auth.yaml up -d
```

**Note:**
- Default Casdoor login credentials: username: `admin`, password: `123`

### Step 4: Modify Casdoor Authentication (Optional)

You can create new applications and organizations in Casdoor as needed, and update the configuration information in the `.env` file (default organization and application already exist).

#### 4.1 Configure Casdoor Application

**Obtaining Casdoor Configuration Information:**
1. Visit the Casdoor management console: [http://localhost:8000](http://localhost:8000)
2. Log in with the default administrator account: `admin / 123`
3. **Create Organization**
   Go to the [http://localhost:8000/organizations](http://localhost:8000/organizations) page, click "Add", fill in the organization name, save and exit.
4. **Create Application and Bind Organization**
   Go to the [http://localhost:8000/applications](http://localhost:8000/applications) page, click "Add".

   When creating the application, fill in the following information:
   - **Name**: Custom application name, e.g., `agent`
   - **Redirect URL**: Set to the project's callback address. If the Nginx exposed port is `80`, use `http://your-local-ip/callback`; if it's another port (e.g., `888`), use `http://your-local-ip:888/callback`
   - **Organization**: Select the organization name you just created
5. After saving the application, record the following information and map it to the project configuration items:

| Casdoor Information Item | Example Value | Corresponding `.env` Configuration Item |
|--------------------------|---------------|------------------------------------------|
| Casdoor Service Address (URL) | `http://localhost:8000` | `CONSOLE_CASDOOR_URL=http://localhost:8000` |
| Client ID | `your-casdoor-client-id` | `CONSOLE_CASDOOR_ID=your-casdoor-client-id` |
| Application Name (Name) | `your-casdoor-app-name` | `CONSOLE_CASDOOR_APP=your-casdoor-app-name` |
| Organization Name (Organization) | `your-casdoor-org-name` | `CONSOLE_CASDOOR_ORG=your-casdoor-org-name` |

6. Fill in the above configuration information into the project's environment variable file:
```bash
# Navigate to astronAgent directory
cd docker/astronAgent

# Edit environment variable configuration
vim .env
```

**Add or update the following configuration items in the .env file:**
```env
# Casdoor Configuration
CONSOLE_CASDOOR_URL=http://localhost:8000
CONSOLE_CASDOOR_ID=your-casdoor-client-id
CONSOLE_CASDOOR_APP=your-casdoor-app-name
CONSOLE_CASDOOR_ORG=your-casdoor-org-name
```

7. Restart AstronAgent services to apply the new configuration:
```bash
docker compose restart console-frontend console-hub
```

## 📊 Service Access Addresses

After startup, you can access the services at the following addresses:

### Authentication Service
- **Casdoor Admin Interface**: http://localhost:8000

### Knowledge Base Service
- **RagFlow Web Interface**: http://localhost:18080

### AstronAgent Core Services
- **Console Frontend (nginx proxy)**: http://localhost/

## 📚 Additional Resources

- [AstronAgent Official Documentation](https://www.xfyun.cn/doc/spark/Agent01-%E5%B9%B3%E5%8F%B0%E4%BB%8B%E7%BB%8D.html)
- [Casdoor Official Documentation](https://casdoor.org/docs/overview)
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
