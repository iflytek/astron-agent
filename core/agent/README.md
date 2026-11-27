# Agent

Agent 服务的智能体执行使用 **Deep Agents 0.7.29**。普通模型推理由独立接口直接调用官方模型集成，不进入智能体内核。旧的 Chat / 文本 CoT / CoT Process 循环、正则协议解析和手写 provider SSE 解析已删除，没有旧引擎回退开关。

独立 Agent 和发布 Agent 由 Console 直接调用 `/agent/v1/custom/chat/completions`。工作流 Agent 节点先向 Console 解析已授权的版本和运行配置，再把它转发至同一接口。后续由 `WorkflowAgentRunnerBuilder` 构建 `DeepAgentsRunner`，调用官方 LangChain provider 和平台插件。外部请求、鉴权、SSE chunk、stop / `[DONE]` 和节点追踪由平台 API 层处理。

## 纯模型推理

`POST /agent/v1/llm/chat/completions` 接收 `model_config`（`provider / domain / api / api_key`）、`messages`、`parameters`、`timeout`、`meta_data`、`uid` 和 `stream: true`。协议选择为 `openai`、`anthropic` 或 `google`；品牌不决定协议。地址使用 HTTP(S)，凭据由调用方从授权模型配置提供，不自动查询 MaaS。请求需要 `X-Workflow-Internal-Key` 和应用身份 `x-consumer-username`。

该接口支持 system 消息、一般历史顺序及官方集成支持的多模态内容块，不添加提示词、工具、历史摘要或最终回答阶段。`parameters` 仅接受相应协议的生成参数；不允许覆盖客户端配置或启用工具。`timeout` 是包含生成在内的总预算，最大 1800 秒；模型 SDK 不自动重试，由 Workflow 控制节点重试。

响应使用 SSE 增量 `content / reasoning_content`，完整读取供应商 usage 尾帧后发送带实际 `finish_reason` 与可用 usage 的终止块，再发送 `[DONE]`。usage 未提供时省略，空流或缺少完成信号的流返回非零错误码。异常信息脱敏，断开或取消会结束模型流并清理客户端。Workflow 节点与这里唯一的 generation 通过可信追踪上下文关联。

纯推理的 Anthropic 分支使用官方 `AsyncAnthropic.messages.stream()` 和 `get_final_message()`，由 SDK 解析流并累计最终 usage。已核查的 LangChain Anthropic 1.5–1.7.7 会忽略起始帧输入 token，末帧只有输出 token 时漏计；因此此路径直接使用官方 SDK，未修改智能体的 LangChain 集成，也不自行解析 HTTP/SSE。普通文本、图片、带签名 thinking 历史按 SDK 内容块传递，工具调用被拒绝；客户端在结束、异常或取消时关闭。

## 智能体模型兼容

模型必须支持原生 tool calling，配置仍使用 `model_config.domain / api / provider / api_key`。未提供 api_key 时继续查询平台 MaaS 凭据。OpenAI 兼容模型使用官方 `ChatOpenAI`，明确关闭 Responses API；Anthropic、Google 使用官方 `ChatAnthropic`、`ChatGoogleGenerativeAI`。不支持原生工具调用的模型会失败，不解析 `Thought/Action` 文本作为替代。

`api` 可以继续使用现有 completions / messages / GenerateContent 完整地址；适配层提取 SDK base URL。Google 保留 v1/v1beta 版本。兼容网关必须支持 `tools`、tool result 消息和流式 usage。OpenAI 兼容 provider 的非标准字段（例如部分厂商的 reasoning_content）仅在官方集成支持时可用；决策阶段文本仍映射到 reasoning_content，最终回答映射到 content。

`max_loop_count >= 1` 限制主 Agent 的决策调用轮数，最多再调用一次无工具模型生成最终答案。reasoning 指令用于决策，answer 指令用于最后回答；提前结束工具决策时也进入最终回答。默认子代理调用被禁用，并在调度前校验模型返回的工具是否开放。框架的上下文压缩由 Deep Agents 管理。

## 工具、隔离和资源

Link / MCP / Workflow 经官方 StructuredTool 调度，沿用平台权限和业务约定。工具参数使用 JSON Schema 校验；中文或受限名称转换为稳定内部别名，SSE 和节点追踪保留平台名称。成功结果保留原格式；失败工具结果携带非零 code，模型和追踪均可识别。

来自不同 HTTP 工具或 MCP 连接的同名操作按资源身份生成稳定别名，实际调用仍使用原始操作名。MCP 输入保留完整 `inputSchema`，Link 发现及调用复用官方 SDK 的 `Tool` 与 `CallToolResult`，保留多种内容块和 `structuredContent`；`isError` 会进入 Agent 与工作流的失败状态。MCP 传输和会话始终由 Link 管理，不在 Agent 中另写协议客户端。

内置目录读取运行中 AI Tools 的真实 OpenAPI，为生成的工具文档添加 `info.x-astron-response-envelope: aitools-v1`。这一显式契约表示响应体的整数 `code=0` 为成功，其他整数为业务失败，缺失或无效 code 为协议错误。Link 在响应 Schema 校验和字段过滤前将失败映射为 `header.code=30400`，保留上游错误码和消息，管理测试、Agent 和工作流沿用现有失败处理。普通 HTTP 工具不解释任意响应体的 `code`；AI Tools 直连响应的 HTTP 状态和响应体保持兼容。安装时须保留完整 OpenAPI 的 `info`；已有安装若缺少标记，应从内置目录重新接入以获得该契约。HTTP 执行按当前 `operationId` 选择响应 Schema，管理调试按请求方法与端点选择，路径公共参数继续继承。

OpenAI / Google 请求级客户端在运行结束、异常和取消后关闭。Anthropic 传输池由官方集成管理，追踪继续使用现有 OTel / Langfuse 设置。

### Tavily 网页搜索

在工具管理的内置目录添加 Tavily 网页搜索，打开工具配置，在身份验证中填写 Tavily API Key，发布工具版本后将其加入同一空间的 Agent。Core Agent 通过官方 Tavily SDK 执行所选的工具版本。工具使用 Basic Search，支持新闻主题、时间范围和日期，并返回标题、原文 URL、摘要和可用的发布时间。工作流可通过已配置该工具的 Agent 节点调用。

### Agent 虚拟文件系统

独立、发布和工作流 Agent 使用 Deep Agents 的 `CompositeBackend`。未启用沙箱时，已配置的独立虚拟工作区由 MinIO 持久化，独立 Agent 的同一会话可跨轮次复用，工作流按节点调用隔离。框架的 `/large_tool_results/` 和 `/conversation_history/` 存在运行内状态中。缺少已授权的运行范围或未配置工作区时，普通文件使用运行内状态。

Compose 默认使用 Console 的对象存储配置，可以用 `AGENT_WORKSPACE_S3_ENDPOINT`、`AGENT_WORKSPACE_S3_BUCKET`、`AGENT_WORKSPACE_S3_ACCESS_KEY` 和 `AGENT_WORKSPACE_S3_SECRET_KEY` 覆盖。Helm 使用现有 MinIO Secret 和 Console 存储桶。工作区对象位于 `agent-workspaces/` 前缀，可按部署的保留策略管理。

启用沙箱时，普通文件工具和 `execute` 使用当前沙箱的工作目录。文件工具可直接操作 `/output/report.txt`。E2B 使用 `/home/user/workspace`，文件面板可查看和下载仍在线的 Console 调试及对话实例中的文件。Docker 使用 Console 保存的 Agent 目录，文件保留在持久卷。Skill 文件由独立的只读 `/skills/` 挂载提供。

### Agent 沙箱

Console 按执行所属的个人或空间解析已启用的沙箱，通过内部请求的 `sandbox` 字段传递开关和提供方。Core Agent 按提供方打开实现 Deep Agents `SandboxBackendProtocol` 的后端，框架据此提供通用 `execute`。Agent 即使没有 Skill 或插件，也可以在已选沙箱中运行命令。

提供方在 `engine/sandbox.py` 注册，负责隔离环境的创建、执行与清理。E2B 适配器使用官方 SDK，通过 Console 内部凭据服务取密钥。它复用平台现有的命令输出限制和产物上传流程。Agent 同一次运行中的命令共用沙箱。可浏览的实例正常结束后由 E2B 在实例到期时回收。文件工具的临时状态与 E2B 工作目录各自存储。

### Agent Skill

Console 根据 Agent 配置的 Skill 文件 ID，在每次运行时解析最新包内容。独立、发布和工作流 Agent 使用同一套解析规则。Core Agent 校验 MinIO 下载来源，把授权文件挂载到只读的 `/skills/<name>/`。Deep Agents 的 `SkillsMiddleware` 将名称和描述提供给模型，模型用通用 `read_file` 读取完整正文和附件。缺少标准 frontmatter 的旧 Skill 在运行时生成兼容的元数据。

配置沙箱并选用 Skill 时，授权脚本也会挂载到本次沙箱。模型通过同一个 `execute` 执行，例如 `cd /skills/<name> && python scripts/example.py`。在 E2B 中，Skill 可将应用产物写到 `/home/user/workspace/output/`。多个 Skill 一起使用时，可以用 `output/<name>/` 为产物指定归属。

每个文件最多 5 MiB。一个 Skill 最多包含 100 个附件，附件总大小最多 20 MiB。单次运行选择的包合计最多 100 MiB。

## 运行与验证

在 `core/agent` 执行 `uv sync --locked`。使用仓库现有服务配置和启动流程；Dockerfile 继续从本模块 pyproject.toml / uv.lock 安装。依赖迁移同时更新了本服务的 websockets、protobuf/OTel、E2B SDK，未修改其他服务锁文件或 `core/common`。

在仓库根目录运行：

```sh
PYTHONPATH=core core/agent/.venv/bin/python -m pytest core/agent/tests
PYTHONPATH=core core/agent/.venv/bin/python -m mypy --disallow-untyped-defs --disallow-incomplete-defs --check-untyped-defs --no-implicit-optional --ignore-missing-imports --explicit-package-bases core/agent
```

在 `core/agent` 运行 `uv lock --check`、`.venv/bin/python -m black --check .`、`.venv/bin/python -m isort --check-only --profile black .`、`.venv/bin/python -m flake8 --max-line-length 88 --ignore=E203,W503,E501 --max-complexity 10 .`。

仓库 `make check-python` 和 GitHub CI 的 Agent 类型检查通过 uv 从原锁文件建立临时依赖环境，再由固定版本 mypy 使用其官方 `--python-executable` 选项解析 SDK 类型。临时环境位于仓库之外并在检查结束后删除，避免递归扫描第三方源码；这只影响开发检查，不增加服务部署步骤。

`tests/test_deepagents_harness.py` 使用真实 Deep Agents 图与可控 LangChain 模型，覆盖工具执行、独立回答阶段、预算、协议、错误、取消和隔离。离线结果不代表真实供应商工具能力或生产环境验收；发布前须验证所选模型、工作流调用和 Skill 沙箱。
