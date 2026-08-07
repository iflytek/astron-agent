# AstronAgent 项目完整部署指南

本指南将帮助您按照正确的顺序启动 AstronAgent 项目的所有组件，包括身份认证、RPA、知识库和核心服务。

## 📋 项目架构概述

AstronAgent 项目包含以下四个主要组件：

1. **Casdoor** - 身份认证和单点登录服务(必要部署组件,提供单点登录功能)
2. **RagFlow** - 知识库和文档检索服务(非必要部署组件,根据需要部署)
3. **AstronAgent** - 核心业务服务集群(必要部署组件)
4. **RPA** - 企业级机器人流程自动化服务(后端自动化部署)

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

### 第一步：启动 RagFlow 知识库服务（可选,根据需要部署）

RagFlow 是一个开源的RAG（检索增强生成）引擎，使用深度文档理解技术提供准确的问答服务。

启动 RagFlow 服务请运行我们的 [docker-compose.yml](/docker/ragflow/docker-compose.yml) 文件或 [docker-compose-macos.yml](/docker/ragflow/docker-compose-macos.yml) 。在运行安装命令之前，请确保您的机器上安装了 Docker 和 Docker Compose。

```bash
# 进入 RagFlow 目录
cd docker/ragflow

# 给所有 sh 文件添加可执行权限
chmod +x *.sh

# 启动 RagFlow 服务（包含所有依赖）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f ragflow
```

**访问地址：**
- RagFlow Web界面：http://localhost:18080

**模型配置步骤：**  
1. 点击头像进入 **Model Providers（模型提供商）** 页面，选择 **Add Model（添加模型）**，填写对应的 **API 地址** 和 **API Key**，分别添加 **Chat 模型** 和 **Embedding 模型**。  
2. 在同一页面右上角点击 **Set Default Models（设置默认模型）**，将第一步中添加的 **Chat 模型** 和 **Embedding 模型** 设为默认。


**重要配置说明：**
- 默认使用 Elasticsearch，如需使用 opensearch、infinity，请修改 .env 中的 DOC_ENGINE 配置
- 支持GPU加速，使用 `docker-compose-gpu.yml` 启动

### 第二步：配置 AstronAgent 环境变量

在启动 AstronAgent 服务之前，需要配置相关的连接信息。

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 复制环境变量配置
cp .env.example .env
```

`.env` 文件只用于配置服务启动、访问地址、认证、数据库、Redis、对象存储等基础设施参数。RAGFlow、讯飞开放平台、AI Ability Chat、虚拟人能力、星火知识库等业务能力账号不再写入 `.env`，请在 AstronAgent 启动后登录控制台，通过 **平台账号管理** 页面配置。

#### 2.1 配置服务主机地址

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 编辑环境变量配置
vim .env
```

配置 AstronAgent 服务的主机地址：

```env
HOST_BASE_ADDRESS=http://localhost
```

**说明：**
- 如果您使用域名访问，请将 `localhost` 替换为您的域名
- 确保 nginx 和 minio 的端口已正确开放

#### 2.2 准备业务能力账号信息（启动后在页面配置）

以下配置不需要写入 `.env` 文件。启动 AstronAgent 后，登录控制台，在左侧菜单进入 **平台账号管理**，按卡片填写即可；保存后全局生效，不需要重启容器。如果某个功能依赖对应能力但尚未配置，系统会提示前往平台账号管理配置，不会阻塞系统启动。

**讯飞开放平台**（内置星火模型、实时语音转写、图片生成等能力会使用）：

获取文档详见：https://www.xfyun.cn/doc/platform/quickguide.html

创建应用完成后可能需要购买或领取相应能力的API授权服务量
- 星火大模型API: https://xinghuo.xfyun.cn/sparkapi
  (对于大模型API会有额外的SPARK_API_PASSWORD需要在页面上获取，页面地址为https://console.xfyun.cn/services/bm4)
- 实时语音转写API: https://console.xfyun.cn/services/rta
- 图片生成API: https://www.xfyun.cn/services/wtop

需要准备并在页面中填写：
- `PLATFORM_APP_ID`
- `PLATFORM_API_KEY`
- `PLATFORM_API_SECRET`
- `SPARK_API_PASSWORD`
- `SPARK_RTASR_API_KEY`

**AI Ability Chat**（Agent 内部默认模型接口，OpenAI 协议）：
- `AI_ABILITY_CHAT_BASE_URL`
- `AI_ABILITY_CHAT_MODEL`
- `AI_ABILITY_CHAT_API_KEY`

**虚拟人能力**：
- `SPARK_VIRTUAL_MAN_APP_ID`
- `SPARK_VIRTUAL_MAN_API_KEY`
- `SPARK_VIRTUAL_MAN_API_SECRET`

**知识库平台**：
- RAGFlow：`RAGFLOW_BASE_URL`、`RAGFLOW_API_TOKEN`、`RAGFLOW_TIMEOUT`、`RAGFLOW_DEFAULT_GROUP`
- 星火知识库：`XINGHUO_DATASET_ID`

创建知识库时会选择使用 **RAGFlow** 或 **星火知识库**，只需要配置实际使用的平台。

**获取 RagFlow API Token：**
1. 访问 RagFlow Web界面：http://localhost:18080
2. 登录并点击头像进入用户设置
3. 点击API生成 API KEY
4. 在 **平台账号管理 - 知识库平台** 中填写到 `RAGFLOW_API_TOKEN`

**获取星火知识库数据集ID：**

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

获取到数据集ID后，请在 **平台账号管理 - 知识库平台** 中填写到 `XINGHUO_DATASET_ID`。

### 第三步：启动 AstronAgent 核心服务（包含 Casdoor 认证服务, RPA后端服务）

启动 AstronAgent 服务请运行我们的 [docker-compose-with-auth-rpa.yaml](/docker/astronAgent/docker-compose-with-auth-rpa.yaml) 文件。**该文件已通过 `include` 机制集成了 Casdoor和RPA后端 服务**，会自动启动 Casdoor，RPA。

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 启动所有服务（包含 Casdoor, RPA）
docker compose -f docker-compose-with-auth-rpa.yaml up -d
```

**说明：**
- Casdoor默认的登录账户名：`admin`，密码：`123`

### 第四步：配置平台账号管理（可选，按需配置业务能力）

AstronAgent 启动后，访问控制台并登录，在左侧菜单进入 **平台账号管理**。平台账号管理与 **应用管理**、**资源管理** 等菜单同级，包含以下四个配置卡片：

1. **讯飞开放平台**：填写 `PLATFORM_APP_ID`、`PLATFORM_API_KEY`、`PLATFORM_API_SECRET`、`SPARK_API_PASSWORD`、`SPARK_RTASR_API_KEY`
2. **AI Ability Chat**：填写 `AI_ABILITY_CHAT_BASE_URL`、`AI_ABILITY_CHAT_MODEL`、`AI_ABILITY_CHAT_API_KEY`
3. **虚拟人能力**：填写 `SPARK_VIRTUAL_MAN_APP_ID`、`SPARK_VIRTUAL_MAN_API_KEY`、`SPARK_VIRTUAL_MAN_API_SECRET`
4. **知识库平台**：分别填写 RAGFlow 的 `RAGFLOW_BASE_URL`、`RAGFLOW_API_TOKEN`、`RAGFLOW_TIMEOUT`、`RAGFLOW_DEFAULT_GROUP`，以及星火知识库的 `XINGHUO_DATASET_ID`

保存配置后会立即全局生效，系统会自动刷新缓存，不需要重启 AstronAgent 容器。

### 第五步：修改 Casdoor 认证（可选）

您可以根据需要在 Casdoor 中创建新的应用和组织，并将配置信息更新到 `.env` 文件中（已存在默认组织和应用）。

#### 5.1 配置 Casdoor 应用

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

**在 .env 文件中添加或更新以下配置项：**
```env
# Casdoor配置
CONSOLE_CASDOOR_URL=http://localhost:8000
CONSOLE_CASDOOR_ID=your-casdoor-client-id
CONSOLE_CASDOOR_APP=your-casdoor-app-name
CONSOLE_CASDOOR_ORG=your-casdoor-org-name
```

7. 重启 AstronAgent 服务以应用新配置：
```bash
docker compose restart console-frontend console-hub
```

## 📊 服务访问地址

启动完成后，您可以通过以下地址访问各项服务：

### 认证服务
- **Casdoor 管理界面**：http://localhost:8000

### 知识库服务
- **RagFlow Web界面**：http://localhost:18080

### AstronAgent 核心服务
- **控制台前端(nginx代理)**：http://localhost/

### RPA 核心服务
- **RPA后端服务入口(nginx代理)**：http://localhost:32742

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

**注意**：首次部署项目建议在测试环境中验证所有功能后再部署到生产环境。
