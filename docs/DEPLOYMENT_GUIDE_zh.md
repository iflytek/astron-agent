# astronAgent 项目完整部署指南

本指南将帮助您按照正确的顺序启动 astronAgent 项目的所有组件，包括身份认证、知识库和核心服务。

## 📋 项目架构概述

astronAgent 项目包含以下三个主要组件：

1. **Casdoor** - 身份认证和单点登录服务(必要部署组件,提供单点登录功能)
2. **RagFlow** - 知识库和文档检索服务(非必要部署组件,根据需要部署)
3. **astronAgent** - 核心业务服务集群(必要部署组件)

## 🚀 部署步骤

### 前置要求

**Agent系统配置要求**
- CPU >= 2 Core
- RAM >= 4 GiB
- Disk >= 50 GB

**RAGFlow配置要求**
- CPU >= 4 Core
- RAM >= 16 GB
- Disk >= 50 GB

### 第一步：启动 Casdoor 身份认证服务

Casdoor 是一个开源的身份和访问管理平台，提供OAuth 2.0、OIDC、SAML等多种认证协议支持。

启动 Casdoor 服务请运行我们的 [docker-compose-with-auth.yaml](/docker/astronAgent/docker-compose-with-auth.yaml) 文件。在运行安装命令之前，请确保您的机器上安装了 Docker 和 Docker Compose。

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 启动 Casdoor 服务
docker compose -f docker-compose-auth.yml up -d
```

**服务信息：**
- 访问地址：http://localhost:8000
- 容器名称：casdoor
- 默认配置：生产模式 (GIN_MODE=release)

### 第二步：启动 RagFlow 知识库服务（可选）

RagFlow 是一个开源的RAG（检索增强生成）引擎，使用深度文档理解技术提供准确的问答服务。

启动 RagFlow 服务请运行我们的 [docker-compose.yml](/docker/ragflow/docker-compose.yml) 文件或 [docker-compose-macos.yml](/docker/ragflow/docker-compose-macos.yml) 。在运行安装命令之前，请确保您的机器上安装了 Docker 和 Docker Compose。

```bash
# 进入 RagFlow 目录
cd docker/ragflow

# 给所有 sh 文件添加可执行权限
chmod +x *.sh

# 启动 RagFlow 服务（包含所有依赖）
docker compose up -d
```

**访问地址：**
- RagFlow Web界面：http://localhost:18080

**模型配置步骤：**  
1. 点击头像进入 **Model Providers（模型提供商）** 页面，选择 **Add Model（添加模型）**，填写对应的 **API 地址** 和 **API Key**，分别添加 **Chat 模型** 和 **Embedding 模型**。  
2. 在同一页面右上角点击 **Set Default Models（设置默认模型）**，将第一步中添加的 **Chat 模型** 和 **Embedding 模型** 设为默认。


**重要配置说明：**
- 默认使用 Elasticsearch，如需使用 opensearch、infinity，请修改 .env 中的 DOC_ENGINE 配置
- 支持GPU加速，使用 `docker-compose-gpu.yml` 启动

### 第三步：集成配置 Casdoor、RagFlow 服务（根据需要配置相关信息）

在启动 astronAgent 服务之前，配置相关的连接信息以集成 Casdoor 和 RagFlow。

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 复制环境变量配置
cp .env.example .env
```

#### 3.1 配置知识库服务连接（可选）

编辑 docker/astronAgent/.env 文件，配置 RagFlow 连接信息：

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 编辑环境变量配置
vim .env
```

**关键配置项：**

```env
# RAGFlow配置
RAGFLOW_BASE_URL=http://localhost:18080
RAGFLOW_API_TOKEN=ragflow-your-api-token-here
RAGFLOW_TIMEOUT=60
RAGFLOW_DEFAULT_GROUP=星辰知识库
```

**获取 RagFlow API Token：**
1. 访问 RagFlow Web界面：http://localhost:18080
2. 登录并点击头像进入用户设置
3. 点击API生成 API KEY
4. 将生成的 API KEY 更新到.env文件中的RAGFLOW_API_TOKEN

#### 3.2 配置 Casdoor 认证集成（必须配置）

编辑 docker/astronAgent/.env 文件，配置 Casdoor 连接信息：

**关键配置项：**

```env
# Casdoor配置
CONSOLE_CASDOOR_URL=http://your-casdoor-server:8000
CONSOLE_CASDOOR_ID=your-casdoor-client-id
CONSOLE_CASDOOR_APP=your-casdoor-app-name
CONSOLE_CASDOOR_ORG=your-casdoor-org-name
```

**获取 Casdoor 配置信息：**
1. 访问 Casdoor 管理控制台： [http://localhost:8000](http://localhost:8000)
2. 使用默认管理员账号登录：`admin / 123`
3. **创建组织**
   进入 [http://localhost:8000/organizations](http://localhost:8000/organizations) 页面，点击"添加"，填写组织名称后保存并退出。
4. **创建应用并绑定组织**
   进入 [http://localhost:8000/applications](http://localhost:8000/applications) 页面，点击"添加"。

   创建应用时填写以下信息：
   - **Name**：自定义应用名称，例如 `agent`
   - **Redirect URL**：设置为项目的回调地址。如果 Nginx 暴露的端口号是 `80`，使用 `http://your-local-ip/callback`；如果是其他端口（例如 `888`），使用 `http://your-local-ip:888/callback`
   - **Organization**：选择刚创建的组织名称
5. 保存应用后，记录以下信息并与项目配置项一一对应：

| Casdoor 信息项 | 示例值 | `.env` 中对应配置项 |
|----------------|--------|----------------------|
| Casdoor 服务地址（URL） | `http://localhost:8000` | `CONSOLE_CASDOOR_URL=http://localhost:8000` |
| 客户端 ID（Client ID） | `your-casdoor-client-id` | `CONSOLE_CASDOOR_ID=your-casdoor-client-id` |
| 应用名称（Name） | `your-casdoor-app-name` | `CONSOLE_CASDOOR_APP=your-casdoor-app-name` |
| 组织名称（Organization） | `your-casdoor-org-name` | `CONSOLE_CASDOOR_ORG=your-casdoor-org-name` |

6. 将以上配置信息填写到项目的环境变量文件中：
```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 编辑环境变量配置
vim .env
```

### 第四步：启动 astronAgent 核心服务（必要部署步骤）

#### 4.1 配置 讯飞开放平台 相关APP_ID API_KEY等信息

获取文档详见：https://www.xfyun.cn/doc/platform/quickguide.html

创建应用完成后可能需要购买或领取相应能力的API授权服务量
- 星火大模型API: https://xinghuo.xfyun.cn/sparkapi
  (对于大模型API会有额外的SPARK_API_PASSWORD需要在页面上获取)
  (1、指令型助手对应的文本AI生成/优化功能需要开通Spark Ultra能力，页面地址为https://console.xfyun.cn/services/bm4
   2、工作流智能体对应的AI生成和AI代码生成需要开通Spark3.5 Max和DeepSeekV3能力。
   Spark3.5 Max地址为：https://console.xfyun.cn/services/bm35, 
   DeepSeekV3能力地址为：https://maas.xfyun.cn/modelSquare)
- 实时语音转写API: https://console.xfyun.cn/services/rta
- 图片生成API: https://www.xfyun.cn/services/wtop
- 虚拟人智能体：https://www.xfyun.cn/services/VirtualHumans
- 使用虚拟人智能体时，非localhost（本地主机名）或127.0.0.1，确保是https环境；若为http环境，需配置绕过检查，例如谷歌浏览器上开启下chrome://flags/#unsafely-treat-insecure-origin-as-secure


编辑 docker/astronAgent/.env 文件，更新相关环境变量：
```env
PLATFORM_APP_ID=your-app-id
PLATFORM_API_KEY=your-api-key
PLATFORM_API_SECRET=your-api-secret

SPARK_API_PASSWORD=your-api-password
SPARK_RTASR_API_KEY=your-rtasr-api-key
SPARK_VIRTUAL_MAN_APP_ID=your-virtual-man-app-id
SPARK_VIRTUAL_MAN_API_KEY=your-virtual-man-api-key
SPARK_VIRTUAL_MAN_API_SECRET=your-virtual-man-api-secret

# 用于配置平台 AI 生成相关能力(兼容openai协议), 如提示词优化、一句话创建智能体等。
AI_ABILITY_CHAT_BASE_URL=your-model-url
AI_ABILITY_CHAT_MODEL=your-model-id
AI_ABILITY_CHAT_API_KEY=your-api-key
```

#### 4.2 如果您想使用星火RAG云服务，请按照如下配置（可选）

星火RAG云服务提供两种使用方式：

##### 方式一：在页面中获取

1. 使用讯飞开放平台创建的 APP_ID 和 API_SECRET
2. 直接在页面中获取星火数据集ID，详见：[xinghuo_rag_tool.html](/docs/xinghuo_rag_tool.html)

##### 方式二：使用 cURL 命令行方式

如果您更喜欢使用命令行工具，可以通过以下 cURL 命令创建数据集：

```bash
# 创建星火RAG数据集
curl -X PUT 'https://chatdoc.xfyun.cn/openapi/v1/dataset/create' \
    -H "Accept: application/json" \
    -H "appId: your_app_id" \
    -H "timestamp: $(date +%s)" \
    -H "signature: $(echo -n "$(echo -n "your_app_id$(date +%s)" | md5sum | awk '{print $1}')" | openssl dgst -sha1 -hmac 'your_api_secret' -binary | base64)" \
    -F "name=我的数据集"
```

**注意事项：**
- 请将 `your_app_id` 替换为您的实际 APP ID
- 请将 `your_api_secret` 替换为您的实际 API Secret

获取到数据集ID后，请将数据集ID更新到 docker/astronAgent/.env 文件中：
```env
XINGHUO_DATASET_ID=
```

#### 4.3 启动 astronAgent 服务

启动之前请配置一些必须的环境变量，并确保nginx和minio的端口开放

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 根据需要修改配置
vim .env
```

```env
HOST_BASE_ADDRESS=http://localhost (astronAgent服务主机地址)
```

启动 astronAgent 服务请运行我们的 [docker-compose.yaml](/docker/astronAgent/docker-compose.yaml) 文件。在运行安装命令之前，请确保您的机器上安装了 Docker 和 Docker Compose。

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 启动所有服务
docker compose up -d
```

## 📊 服务访问地址

启动完成后，您可以通过以下地址访问各项服务：

### 认证服务
- **Casdoor 管理界面**：http://localhost:8000

### 知识库服务
- **RagFlow Web界面**：http://localhost:18080

### AstronAgent 核心服务
- **控制台前端(nginx代理)**：http://localhost/

## 📚 更多资源

- [AstronAgent 官方文档](https://www.xfyun.cn/doc/spark/Agent01-%E5%B9%B3%E5%8F%B0%E4%BB%8B%E7%BB%8D.html)
- [Casdoor 官方文档](https://casdoor.org/docs/overview)
- [RagFlow 官方文档](https://ragflow.io/docs)
- [Docker Compose 官方文档](https://docs.docker.com/compose/)

## 🤝 技术支持

如遇到问题，请：

1. 查看相关服务的日志文件
2. 检查官方文档和故障排除指南
3. 在项目 GitHub 仓库提交 Issue
4. 联系技术支持团队

---

**注意**：首次部署建议在测试环境中验证所有功能后再部署到生产环境。
