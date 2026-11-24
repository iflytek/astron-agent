# 03 独立 Agent 与统一执行技术设计

依据：[需求](requirements.md)、[父需求](../requirements.md)、[目标架构](../architecture.md)。只迁移提示词 Agent 的管理与独立执行；不恢复工作流节点、运行生命周期、发布渠道、审批、市场。代码建立在已验证的 02 提交上，Loop、CONFIG、阶段技能由原项目目录执行。

## 调用链与影响

React Agent 管理/聊天/调试 → 同源 Nginx → Django agents → 原业务 MySQL 表、会话执行记录 → core/agent `/agent/v1/custom/chat/completions` → 既有 DeepAgentsRunner → 官方模型集成及 Link/MCP/Skill/知识插件。Console 只解析和授权资源、持久化结果，不调用第二套模型工具循环。纯模型接口不用于绕过 Agent 引擎。

- 定义：接管 `chat_bot_base` 的原 ID、UID、space_id、模型和资源配置，保留结构化提示词、人格、收藏、知识关联。旧 `version` 是产品类型字段，不能当作发布快照编号；工作流类型不进入提示词 Agent 编辑接口。
- 会话：保留原聊天、调试及文件记录，增加运行状态与增量事件存储。聊天/调试入口和用户/空间明确隔离；客户端不能上传 assistant 历史伪造执行结果。工作流历史不在此域读写。
- 资源：复用 02 的数据库权限、模型、工具、MCP、Skill 文件、知识和 MinIO 接口。模型和沙箱凭据仅存在于可信服务请求，不进入版本快照或前端。知识检索和工具执行留在 core/agent。旧工作流工具配置保留；尚未迁移的工作流业务不借 Java 代理恢复。
- 既有知识关联：`bot_dataset_maas.dataset_index` 按原调用链解析为 `repo.id`，不将 `dataset_id` 误当知识库 ID；`bot_repo_rel` 属于另一套 `spark_bot` 身份，不跨表猜测关联。个人 `bot_dataset` 指向 `dataset_info`，其 Spark 索引无已验证的统一内核契约：保留为 `legacyDatasetIds`，运行/发布明确返回未迁移。用户重新选择 `repoIds` 后，`AgentState` 的明确选择覆盖本次执行引用，旧关联表不改写。知识检索仅发送当前授权知识库中启用文档的远端 UUID；无启用文档拒绝执行，禁止空过滤扩大检索范围。
- 长期记忆：Console 接管 `agent_memory_config`，经 Mem0 官方 SDK/API 读写。core/memory/database 无变更；Mem0 不是该数据库服务。
- 共享影响：不改 core/common、Kafka、账号 UID、成员角色或全局凭据。取消状态和心跳存放在本域 MySQL 执行记录，不新增 Redis 依赖或清空缓存。MinIO 继续原桶，新增聊天文件使用独立对象前缀，保留已有键。HTTP/会话/CSRF规则延续01/02。已有内部鉴权头与密钥文件保留。

## 定义与版本契约

`/agents` 提供有作用域的列表、创建；`/agents/{id}` 提供读取、修改、软删除；收藏按当前用户保存。人格、模型、MCP、Skill、插件、知识引用属于草稿定义，保存时校验引用归属，运行时再次解析当前授权，不能相信浏览器给出的 URL、密钥或 owner UID。

旧工具的公开引用与运行解析共用有权限约束的版本选择，普通编辑不回写未修改的工具或 Skill 引用。MCP 编辑明确区分未编辑和替换：省略 `mcpServerIds` 保留旧直接地址；显式提交 ID 列表（含空列表）替换当前执行绑定，旧地址字段继续保留，且不再参与该草稿后续运行。前端提供清除旧绑定操作，不显示带凭据的地址。

每个快照有独立版本 ID、稳定 Agent ID、schema version、配置内容及创建者/时间，创建后不可修改。快照包含资源引用和确定的提示词/人格，不含服务凭据、预签名 URL、会话或记忆内容。发布指针与草稿分离，通过事务切换已有快照；03 仅提供版本创建、读取、切换和内部解析契约，不建设05发布渠道。

04 的内部解析契约接收可信服务身份、调用用户、空间、Agent ID 和可选版本 ID；首次解析读取已发布指针，显式版本读取该不可变快照，并返回 `agentId / versionId / definition`。未发布返回明确错误。用户和空间仍需有效，指定其他 Agent 的版本拒绝。04 将自行持久化 resolved version；03 不实现工作流运行、重试或恢复。

## 统一执行、事件与停止

聊天和调试使用同一 Console 执行服务，构造既有 `CustomCompletionInputs`（授权模型、prompt/personality、plugin、messages、max_loop_count、调用元数据），附 `X-Workflow-Internal-Key` 和应用身份。定义 ID、用户、空间、会话和运行 ID 来自服务端权威记录。调试使用当前草稿，独立聊天可显式使用快照；选定配置在一次执行中固定。

插件执行沿用 `Console 授权工具版本 → core/agent LinkPluginFactory / LinkPluginRunner → core/plugin/link`。标准 OpenAPI 的 path、query、header 和 JSON body 参数不要求私有扩展才能供模型填写，保留必填和类型等约束；显式配置的固定值与隐藏凭据只在可信执行侧组装，不进入模型参数。路径参数交给 Link 已有的 `message.path`，由下游统一完成占位符替换、URL编码和安全校验。不能支持的配置明确拒绝，不能静默丢字段或生成零参数工具。这段共享适配影响所有调用 core/agent 的入口，须回归现有工具配置；Link 继续拥有 HTTP 执行与安全边界。

正文存在性与请求头序列化贯穿 Agent→Link→官方 aiohttp 客户端：未提供正文保持 `None`，显式空对象保持 `{}`，可选正文中的完整固定配置值仍须发送。未提供模型正文输入时，如果默认组装结果仅缺少根级或嵌套必填字段，可选正文保持省略；普通默认值不能创建不完整正文。显式提供部分正文仍须满足全部必填字段，默认值的类型或其他约束错误也不因省略而隐藏。请求头先校验原始 schema 类型，再序列化为 HTTP 标量文本。Link 的执行和调试入口都保留这一区分，避免给无正文的 GET 添加 JSON。共享影响限于正确传输这些基础值，非空正文、鉴权、SSRF、路径安全校验和工作流生命周期保持原契约。

资源工具调试同样保留正文存在性：前端默认输入不添加 `body`，Django 仅在用户提供对象正文时转发该字段，明确的 `{}` 与非空对象都保持原值；仍先授权持久工具定义，再解析鉴权和调用 Link，不给原无正文 GET 补 JSON 对象。

参数校验复用已有 `jsonschema` 官方验证器。模型参数投影只负责内部 Link 协议和固定凭据分离：支持内联标量 path/query/header 与嵌套 JSON 对象正文；引用、组合 schema、cookie、非默认参数序列化、非 JSON 正文和根数组当前明确返回工具配置错误，不自行实现另一套 OpenAPI 执行器。

Nginx 为 `/console-api/agents/` 提供独立的长连接代理，关闭缓冲和缓存；集合接口 `/console-api/agents` 精确代理到 `/agents`，保留 GET/POST、正文及查询参数，避免 Nginx 隐式尾斜杠重定向。Helm 同样保留集合与子路径边界。服务等待模型或工具期间每10秒发送 SSE 注释保活，不生成伪文本或历史事件。Agent 内部解析与产物上传接口只允许服务内网访问，Compose与Helm公网路由明确拒绝。

前端消费真实事件：运行标识、文本/推理增量、工具调用与结果、知识引用、错误、终态。core/agent 的非零 code、非零工具结果和缺失终止信号不能变成成功；工具/检索故障保留具体阶段与脱敏错误。可恢复工具失败可继续由同一个 Agent 内核解释，但界面仍展示失败结果。模型或服务断开终止该次运行。

知识引用依据 Core 实际的 `delta.tool_calls[type=knowledge].function.response.metadata_list` 契约解析，保存来源与 `chunk_context` 原片段，并在实时界面和历史中显示来源标题及正文摘录。对应检索内容由既有 builder 注入 DeepAgentsRunner 的参考上下文。畸形引用响应明确报错；不使用没有实际生产者的顶层字段，不伪造文档链接或额外下载原文。

Django 使用 ASGI `StreamingHttpResponse` 的异步生成器；上游连接由 HTTPX 流上下文关闭。浏览器断开、显式停止和超时均取消读取任务并关闭上游，触发 core/agent 原有取消清理。停止 API 按运行归属鉴权，支持不同 ASGI worker 处理。停止 API 写入取消标记，执行 worker 每 250ms 检查；执行期间每 2 秒保存心跳，异常退出超过 45 秒的未完成运行在读取历史或再次运行时标记为 interrupted。显式停止保存为 cancelled；被动断连/离页保存为 interrupted 并保留断连原因，二者均取消上游。core 使用可关联运行ID记录取消，已发完DONE的正常收尾保持成功。停止请求不能抢改已成功终态；终态写入有条件更新，区分 completed/cancelled/failed/interrupted。

会话每次运行持久化用户输入、实际收到的文本、工具结果、引用及状态。原聊天/调试记录以确定性 ID 非破坏导入；旧服务的 answer_type=2 和 sid 不能证明正常完成，未明确停止的旧记录标记为状态未知的 interrupted，原表及原文保留。旧文件保留名称等展示信息，不重新执行失效 URL；需要在新执行中使用时重新上传。断开和取消保存部分响应，不补造回答。重答创建新的执行尝试，使用目标用户问题之前的历史，保留旧尝试，不将被替代答案并入本次上下文。文件记录按用户/空间/Agent授权，实际解析其内容进入请求；不把文件 URL 当作已读内容，不接受任意远程下载地址。

## Mem0 与数据保留

沿用 `user_id=原UID`、`app_id=bot-<稳定ID>`；以服务端 Agent 空间和 metadata.space_id 共同约束命名空间，不含发布版本、聊天/工作流入口。新记忆写明空间（个人为0）；原个人记忆没有空间 metadata 时，只在确认 Agent 属于个人空间后读取。跨空间不能依赖前端声明，删除单条或清空前必须验证每条记忆归属，不能使用未限定空间的批量删除。

保留 `agent_memory_config` 中 Base64 RSA 密文，复用 `config_info/MODEL_SECRET_KEY/private_key` 对应旧密钥，不能重新生成或重加密已有配置。浏览器仅得到 hasApiKey 等状态。默认共享长期偏好，不共享会话历史；工作流中间值、工具原始结果不自动写入偏好。自动记忆只接受真实完成的独立用户对话；工作流契约默认不采集，未来04只可显式提交用户偏好。

迁移通过 Django 历史模型和 introspection 接管已有表；执行 schema_editor DDL 的 RunPython 显式设置 atomic=False，以支持 MySQL 的非事务 DDL。增加必要的新表/字段，保留旧账号、Agent/工作流配置、记忆、收藏、历史和对象存储。不得执行 Flyway DROP 初始脚本。删除本阶段替代的 Java Agent聊天/调试/记忆与 Spring AI 执行、重复工具编排、相关测试/构建依赖；04/05仍拥有的业务源码仅在依赖确证后删除，不以Java可编译为理由保留旧执行引擎。

## 验证

本地：`cd console/backend && uv run python manage.py test --settings=astron_console.settings_test`、迁移一致性检查、ruff；core/agent 原测试加真实 Deep Agents 图的取消/错误契约测试；前端 type-check、相关lint、构建及事件归约测试。迁移测试覆盖已有表接管/重复运行、原数据/未知列保留、快照不可变与发布切换、用户与空间越权、服务身份错误、部分输出与重答历史、停止与终态竞争。

测试环境：先确认原账号/UID、空间权限、已配置模型、内部授权。独立审查通过后按原脚本发布到 bugfix/superteam、等待对应构建、部署一次并核对镜像revision。服务器运行目录有未提交部署改动，只允许既有流程同步已审核部署文件；完整CI源码用Git隔离检出。不得合并main。

验收必须包含浏览器创建/编辑/删除/收藏/人格、真实聊天/调试/文件/重答/停止、工具结果和知识引用、工具/检索失败、服务断开、跨用户/空间拒绝、原记忆访问及版本不割裂记忆。故障注入限本次测试资源或请求，不重启共享服务，不破坏既有资源。RPA与E2B真实连接不列为本阶段必测。离线mock只验证边界，不能替代真实模型、检索及Mem0验收；未执行项不得记通过。

官方依据：Context7核验 Django 5.2 `StreamingHttpResponse` 断连会取消协程，应清理并重新抛出 `CancelledError`；Django ORM事务与 `SeparateDatabaseAndState` 支持非破坏接管。新增第三方调用在实现前继续通过Context7核验实际官方接口。
