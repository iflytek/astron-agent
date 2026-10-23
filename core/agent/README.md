# Agent

Agent 服务使用 **Deep Agents 0.7.29** 作为唯一执行内核。旧的 Chat / 文本 CoT / CoT Process 循环、正则协议解析和手写 provider SSE 解析已删除，没有旧引擎回退开关。

调用链：Console → Workflow AgentNode → `/agent/v1/custom/chat/completions` → `WorkflowAgentRunnerBuilder` → `DeepAgentsRunner` → 官方 LangChain provider / 现有平台插件。外部请求、鉴权、SSE chunk、stop / `[DONE]` 和节点追踪仍由平台 API 层处理。

## 模型兼容

模型必须支持原生 tool calling，配置仍使用 `model_config.domain / api / provider / api_key`。未提供 api_key 时继续查询平台 MaaS 凭据。OpenAI 兼容模型使用官方 `ChatOpenAI`，明确关闭 Responses API；Anthropic、Google 使用官方 `ChatAnthropic`、`ChatGoogleGenerativeAI`。不支持原生工具调用的模型会失败，不解析 `Thought/Action` 文本作为替代。

`api` 可以继续使用现有 completions / messages / GenerateContent 完整地址；适配层提取 SDK base URL。Google 保留 v1/v1beta 版本。兼容网关必须支持 `tools`、tool result 消息和流式 usage。OpenAI 兼容 provider 的非标准字段（例如部分厂商的 reasoning_content）仅在官方集成支持时可用；决策阶段文本仍映射到 reasoning_content，最终回答映射到 content。

`max_loop_count >= 1` 限制主 Agent 的决策调用轮数，最多再调用一次无工具模型生成最终答案。reasoning 指令用于决策，answer 指令用于最后回答；提前结束工具决策时也进入最终回答。默认子代理调用被禁用，并在调度前校验模型返回的工具是否开放。框架的上下文压缩由 Deep Agents 管理。

## 工具、隔离和资源

Link / MCP / Workflow / Skill 的业务实现、权限、资源 URL 校验、内部凭据和 E2B 沙箱路径保留，经官方 StructuredTool 调度。工具参数使用 JSON Schema 校验；中文或受限名称转换为稳定内部别名，SSE 和节点追踪保留平台名称。成功结果保留原格式；失败工具结果携带非零 code，模型和追踪均可识别。

文件工具使用请求内 StateBackend；不暴露宿主文件或本地 shell，不配置共享 checkpointer/store。Skill 命令继续调用现有 E2B 沙箱。OpenAI / Google 请求级客户端在正常结束、异常和取消后关闭；Anthropic 传输池由官方集成管理。无需配置 LangSmith SaaS，继续沿用现有 OTel / Langfuse 管道和内容采集开关。

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
