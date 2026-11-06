# astronAgent 项目完整部署指南

> Console 使用 Python Django ASGI，覆盖账号、空间、资源、Agent、工作流与发布管理。升级保留原数据库、UID、资源归属和持久凭据；运行端统一使用 core/agent 与 core/workflow。

本指南将帮助您按照正确的顺序启动 astronAgent 项目的所有组件，包括身份认证、知识库和核心服务。

## 📋 项目架构概述

astronAgent 项目包含以下三个主要组件：

1. **Python Console** - 内部账号、空间权限、资源、Agent/工作流配置与发布管理；作为主 Compose 的 `console-hub` 服务启动，无需单独认证服务
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

### 第一步：准备 Docker 并保留已有数据

安装 Docker 和 Docker Compose。默认启动无需 `.env` 文件，也无需修改环境变量。升级时保留业务表、数据卷与既有凭据；旧账号导入与重设密码见 [Python Console 运维说明](../../console/backend/README.md)。

### 第二步：启动 RagFlow 知识库服务（可选）

RagFlow 是一个开源的RAG（检索增强生成）引擎，使用深度文档理解技术提供准确的问答服务。

启动 RagFlow 服务请运行我们的 [docker-compose.yml](/docker/ragflow/docker-compose.yml) 文件或 [docker-compose-macos.yml](/docker/ragflow/docker-compose-macos.yml) 。在运行安装命令之前，请确保您的机器上安装了 Docker 和 Docker Compose。

```bash
# 进入 RagFlow 目录
cd docker/ragflow

# 给所有 sh 文件添加可执行权限
chmod +x *.sh

# 启动 RagFlow 服务（包含所有依赖）
docker compose up -d --build
```

**访问地址：**
- RagFlow Web界面：http://localhost:18080

**模型配置步骤：**  
1. 点击头像进入 **Model Providers（模型提供商）** 页面，选择 **Add Model（添加模型）**，填写对应的 **API 地址** 和 **API Key**，分别添加 **Chat 模型** 和 **Embedding 模型**。  
2. 在同一页面右上角点击 **Set Default Models（设置默认模型）**，将第一步中添加的 **Chat 模型** 和 **Embedding 模型** 设为默认。


**重要配置说明：**
- 默认使用 Elasticsearch，如需使用 opensearch、infinity，请修改 .env 中的 DOC_ENGINE 配置
- 支持GPU加速，使用 `docker-compose-gpu.yml` 启动

### 第三步：了解可选的访问与集成配置

默认栈已提供账号认证、数据库、Redis 和存储配置。在 `docker/astronAgent` 直接启动即可，无需复制或编辑 `.env`。默认通过 80 端口访问 `http://localhost/` 或 `http://<服务器IP>/`，支持 IPv4 和带方括号的 IPv6 地址。可选修改 `EXPOSE_NGINX_PORT`，无需同步设置 origin。

Console 签名密钥在首次启动时自动生成到 `console_signing_secrets` 卷，重启复用；首次升级导入已有 `CONSOLE_SECRET_KEY`，与持久文件冲突时明确失败，不静默轮换。保留该卷及业务数据卷。

自定义域名可按需设置 `CONSOLE_ALLOWED_HOSTS`。API 调用示例默认采用经过主机校验的当前请求 origin，图片链接使用相对路径。`CONSOLE_PUBLIC_ORIGIN` 是可选的固定公开地址，公众号 OAuth 回调仍需固定 HTTPS origin。密码重设命令默认输出相对 `/reset-password#...` 链接，追加到当前控制台地址即可；也可在执行时加 `--origin` 输出完整链接，无需修改环境变量。

`CONSOLE_CSRF_TRUSTED_ORIGINS` 默认留空，继续使用 Django 同源 CSRF 校验。`CONSOLE_COOKIE_SECURE=auto` 根据 HTTP/HTTPS 设置 Cookie。增加 HTTPS 反向代理时，通过 `CONSOLE_TRUSTED_PROXIES` 仅信任直接代理，并由该代理设置或覆盖转发协议头。自定义域名与 HTTPS 按需配置，详见[配置文档](CONFIGURATION.md)。

对用户公开应用网关。内置 MinIO 维护端口保持宿主机回环绑定，外部存储访问需独立受保护的端点。RAGFlow 和 RPA 按需独立部署；RAGFlow、讯飞开放平台、AI Ability Chat、虚拟人和星火知识库业务账号在启动后的 **平台账号管理** 页面配置。

新用户访问 `/register` 注册，没有默认管理员密码。已有用户保留 UID，由管理员核实身份后发放重设密码链接。

### 第四步：启动 astronAgent 核心服务（必要部署步骤）

#### 4.1 启动 astronAgent 服务

启动 astronAgent 服务请运行我们的 [docker-compose.yaml](/docker/astronAgent/docker-compose.yaml) 文件。在运行安装命令之前，请确保您的机器上安装了 Docker 和 Docker Compose。

```bash
# 进入 astronAgent 目录
cd docker/astronAgent

# 启动所有服务
docker compose up -d --build
```

启动后访问 `http://localhost/` 或 `http://<服务器IP>/` 并注册账号。默认 HTTP 入口无需填写主机、origin 或 Cookie 环境变量。

#### 4.2 配置平台账号管理（可选，按需配置业务能力）

astronAgent 启动后，访问控制台并登录，在左侧菜单进入 **平台账号管理**。平台账号管理与 **应用管理**、**资源管理** 等菜单同级，包含以下四个配置卡片。保存配置后会立即全局生效，系统会自动刷新缓存，不需要重启容器。如果某个功能依赖对应能力但尚未配置，系统会提示前往平台账号管理配置，不会阻塞系统启动。

**讯飞开放平台**（内置星火模型、实时语音转写、图片生成等能力会使用）：

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

需要准备并在 **平台账号管理 - 讯飞开放平台** 中填写：
- `PLATFORM_APP_ID`
- `PLATFORM_API_KEY`
- `PLATFORM_API_SECRET`
- `SPARK_API_PASSWORD`
- `SPARK_RTASR_API_KEY`

**AI Ability Chat**（用于平台 AI 生成相关能力，兼容 OpenAI 协议，如提示词优化、一句话创建智能体等）：
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

## 📊 服务访问地址

启动完成后，您可以通过以下地址访问各项服务：

### 知识库服务
- **RagFlow Web界面**：http://localhost:18080

### AstronAgent 核心服务
- **控制台前端(nginx代理)**：http://localhost/

## 📚 更多资源

- [AstronAgent 官方文档](https://www.xfyun.cn/doc/spark/Agent01-%E5%B9%B3%E5%8F%B0%E4%BB%8B%E7%BB%8D.html)
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
