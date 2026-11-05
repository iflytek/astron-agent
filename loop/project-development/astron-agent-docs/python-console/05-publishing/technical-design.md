# 05 发布渠道与完整产品交付技术设计

依据：[需求](requirements.md)、[父需求](../requirements.md)、[目标架构](../architecture.md)、[03契约](../03-agents/technical-design.md)、[04契约](../04-workflows/technical-design.md)。本范围包括05和整体迁移收尾；沿用原CONFIG，在bugfix/superteam继续，不创建分支或工作树，不合并main。

## 调用链与影响

管理：React → 同源Nginx → Django publishing → 既有业务表及03/04不可变版本。应用创建与密钥认证继续调用core/tenant，保留既有appId、key、secret和UID。独立执行继续由core/agent负责，工作流调度继续由core/workflow负责。

公开工作流：应用Bearer身份 → 网关 → Django publishing应用授权与运行建档 → 04 prepare_run/stream_run → core/workflow → core/agent；恢复重新认证同一应用、定位原运行并调用04恢复。不能沿用直接转Core的路径而漏掉console_context、Agent版本冻结、调用预算和根取消。Console内部授权接口仍只对可信服务开放。

市场、分享与微信执行需要区分资源授权主体和最终会话主体。发布者授权使用快照中列出的资源，不向接收者授予源空间成员身份或通用资源读写权。服务端保存发布授权、资源主体和真实调用主体，运行时重验发布/应用状态及发布者资源权限；下游配置解析只接受该快照的引用。历史、用户输入和长期偏好使用真实调用主体，绝不改成发布者UID。浏览器不能选择owner UID、授权主体、内部上下文或任意版本。

影响03资源解析、会话入口与04运行上下文时，只增加受限发布执行授权，原管理接口继续使用空间权限；同一执行内核、取消和预算规则不分叉。应用公开传入的user标识是该应用内的终端用户标识，不直接映射Console UID；仅可信的Console登录/渠道绑定能映射原UID。外部用户不得访问Console用户记忆。

共享影响：Core服务调用`core/common`已有JSON Schema校验与Snowflake工具；本轮为该库补齐原代码已导入的`jsonschema`和`snowflake-id`运行依赖及锁文件，并将其纳入GitHub CI矩阵。依赖范围与现有Core服务所用版本兼容，校验实现、ID算法和服务间接口不变。不改Kafka，不清Redis，新增缓存使用独立前缀；保留MinIO桶/对象键、RSA密钥及Mem0密文。发布快照不含凭据、签名URL、会话或记忆。服务端现存应用凭据继续保留，只在明确的应用密钥管理界面向有权拥有者提供；不得进入市场投影、审批JSON、追踪或日志。

`core/workflow`运行事件及模型、`core/memory/database`数据操作及元数据模型调用共享`get_id()`。官方Snowflake生成器在单毫秒序号耗尽或时钟回退时返回`None`；包装层在原互斥锁内按1ms重试，以单调时钟限制最多1秒，超时明确失败，避免向调用者返回无效主键。沿用原epoch、worker ID和位布局，不重新生成已有ID；测试覆盖恢复、持续回退和高吞吐。

## 业务清单与数据接管

| 业务 | 接口/实现边界 | 持久数据 |
|---|---|---|
| 发布管理 | `/publish/bots`、详情、prepare、发布/下架、status、版本 | `chat_bot_base`、`user_lang_chain_info`、03 AgentVersion、04 WorkflowVersion及新增渠道发布指针 |
| 应用/API | `/publish-api/create-user-app`、app-list、create-bot-api、get-bot-api-info；公开执行及恢复 | `app_mst`、`chat_bot_api`、tenant原应用与密钥 |
| 审批 | `/publish/approvals`、详情、approve/reject/cancel | `publish_approval`及完整快照引用 |
| 市场 | `/home-page/agent-square/*`、已发布详情、收藏、市场聊天 | `chat_bot_market`、`bot_type_list`、原收藏及新运行记录 |
| 分享 | `/share/get-share-key`、add-shared-agent、分享访问与撤销 | `agent_share_record`、保留`share_chat`/`share_qa` |
| 工作流发布 | `/workflow/web/info`及仍在使用的publish/take-off/同步入口、版本渠道结果、公开IO目录 | 原workflow/version、`flow_release_channel`、`flow_release_aiui_info` |
| 分析 | summary/timeseries/trace | 原`bot_conversation_stats`与03/04真实运行，不伪造成功量 |
| 微信 | 授权准备、绑定、回调、解除、消息执行 | 原微信授权/绑定记录与加密凭据 |
| 媒体 | voice、rtasr、speaker/train、talkAgent及工作流语音配置 | 原发音人、训练任务、虚拟人配置与历史 |
| RPA | 保留02已有API Key资源和执行接口；联合登录不在本轮范围 | 本项目已有RPA资源归属与API Key；外部数据不改 |

采用既有Django非破坏接管模式：已有表保留主键、未知列和数据；新增表及缺失字段使用非事务MySQL DDL迁移，不运行Flyway初始化或DROP。旧发布记录必须通过已有版本/发布存档还原，不得把当前草稿当成历史发布内容。不能无损解析的旧记录保留并明确报告，禁止悄悄重写或标记迁移成功。旧待审批记录缺完整内容时需要重新提交，不能审核后发布当前草稿。

升级入口在`migrate`和`import_legacy_users`后执行幂等`adopt_legacy_publications --allow-unresolved`，按MARKET/API各自最后成功发布版本恢复渠道，不能跨渠道取最近版本。可还原记录立即恢复；无法还原的记录保留原数据、持久化发布问题并输出醒目警告，继续提供其他功能。部署后必须单独执行不带该选项的`python manage.py adopt_legacy_publications`作为严格验收闸门，并核对旧市场/API数量、版本与问题清单；存在未解决记录时命令非零，不得宣布迁移完成。

应用名称/说明与审批理由/意见统一限制为128/512/512字符，tenant外部创建前完成输入校验，本地写入异常保留操作UNKNOWN与远端应用ID，禁止自动重复创建。其余已接管可写字符串列使用Django schema editor只扩不缩，保留原默认值、NULL属性、排序规则、注释、未知列和既有数据；已在复制真实表结构的独立MySQL临时库验证重复执行和数据保留。

旧Flyway权限/分类/发音人/模板/配置种子先对照Python迁移补齐，已存在值不覆盖，之后删除SQL执行依赖。残留控制器逐项核对，包括LLM、Prompt、ConfigInfo、TextNodeConfig、Version、OpenApi、Bot、WorkflowChat、ChatWorkflow和定时任务；已有等价实现应切换前端调用，不能保留Java代理。

## 发布原子性与审批

发布请求先验证类型、应用/空间/资源权限并生成完整不可变候选快照。审批提交冻结该候选，审核不能重新读取草稿。个人空间、共享空间owner/admin按原规则直接发布；普通成员的MARKET/API发布进入审批、不能直接下架；owner/admin审核，申请人可以撤销自己的pending。

工作流候选与审批确认均复用04完整Core DSL校验接口；网络预检在数据库事务外执行，最后在锁内重验权限、资源、审批状态与冻结候选后切换指针。旧渠道接管同样必须通过转换后Core校验，历史发布成功记录仅证明内容来源。接管批次网络等待上限为单次10秒；首次校验服务不可用后其余工作流记录明确记为未核验，严格命令失败并可在服务恢复后重跑，不逐条重复等待。

候选与活动发布指针分离。事务内锁定资源/渠道和审批行，约束同一请求唯一终态；最后同时更新渠道状态与03/04发布指针。失败或撤销不切活动指针，进行中运行继续使用已解析版本。再次发布后，新运行读取新指针。原`PUT /agents/{id}/published-version`必须进入统一发布权限服务，不能绕过05审批。

外部应用/渠道调用不能假装受数据库事务回滚保护。先登记操作及幂等键、执行外部准备，再重新校验候选与权限，最终切换活动指针；失败保留旧发布并记录可重试状态。对方没有幂等查询时，超时标记结果待核验，不自动重试有副作用操作。日志只记录操作ID、资源ID、渠道、阶段与错误类型。

## 应用身份、公开执行与共享

tenant是应用状态和密钥的权威源，复用`/v2/app`、`/v2/app/details`和`/v2/app/key/verify`。既有Bearer `apiKey:apiSecret`继续有效；无效/禁用应用以及未绑定发布资源均拒绝。浏览器Cookie、应用身份、内部服务密钥严格分开；公开端点只能因使用应用或渠道认证而豁免CSRF，不能放松普通管理端点。

公开运行记录保存appId和渠道授权ID，恢复/停止必须同时匹配原应用和运行。请求flowId/botId只定位已发布绑定，不能选择草稿、任意内部版本或其他应用运行。SSE继续使用既有业务事件，并提供可核验的运行标识；真实错误、断流、取消和暂停终态沿用03/04。单次运行和重试保持原快照，明确新运行才选择新版本。

应用使用`POST /workflow/v1/resume`恢复暂停工作流，使用`POST /workflow/v1/stop`取消该应用的公开运行；两者均重新校验tenant凭据，并要求非空`runId`或原`event_id`，不得由浏览器登录态代替应用身份。停止复用根取消以覆盖子运行；已结束运行返回实际终态，运行中的Agent等待引擎确认取消。

市场只暴露已发布的安全投影；收藏和加入分享不授予编辑权。保留原分享键，新键使用安全随机值且可撤销；下架、删除、撤销或失效授权后新调用拒绝，恢复也重验授权。共享会话只归调用用户，不能读取发布者历史；长期偏好仍遵循真实UID/空间/稳定Agent ID，不按版本切分。

`PublicRunGrant`记录真实调用者、调用空间、应用、分享、渠道和冻结候选；04根上下文保留发布者的资源授权主体，下游执行UID取真实调用者。管理历史排除公开根运行，公开历史、控制与文件下载按调用者及调用空间校验。文件输入另存`PublicFileGrant`，工作流产物沿根上下文归属调用者。Console用户只有独立具备源Agent访问权时才能使用自己的长期记忆；仅取得市场或分享使用权的用户及应用外部身份不读写发布者记忆。

旧API/飞书策略的TODO成功响应、MCP未实现入口、固定active状态和空trace不是可迁移能力。删除不可用产品入口与死调用，实际API改接tenant及统一执行；仍可到达的密钥管理与上传组件改接真实已有能力，不虚构额度或渠道成功。

## 微信、媒体与RPA依赖

微信必须使用官方协议/SDK核验签名、解密消息、校验appid和授权状态；回调绑定冻结发布版本。保留旧component/authorizer凭据与刷新关系；事件去重，撤权后关闭绑定。禁止保留公开测试设置verify ticket的入口。真实微信回调需要已配置的开放平台应用、回调域名和授权公众号。

生产设置从`WECHAT_COMPONENT_APPID`、`WECHAT_COMPONENT_SECRET`、`WECHAT_TOKEN`、`WECHAT_ENCODING_AES_KEY`及对应`_FILE`加载。旧凭据采用受信JSON导入，不反序列化Java对象；凭据导入不代表绑定迁移成功。无法还原微信发布快照的原绑定保留并写入`LegacyPublicationIssue`，严格接管命令仍报告未解决。管理员可用`restore_wechat_binding --binding-id … --candidate-id … --confirm-publication`明确选择完整候选版本，核验远端公众号身份并重新检查权限后恢复；禁止借市场或草稿内容伪造历史微信版本。

语音签名、实时转写、说话人训练和虚拟人调用沿用原平台配置与官方API；前端只获取完成该次调用需要的限时授权，不获得服务密钥。训练/生成任务保存真实远端任务ID与状态，失败不能落为成功；旧训练数据、音频对象和虚拟人记录保留。

画布详情与保存统一使用`flowConfig`读写原`workflow_config`，版本保存同时冻结媒体配置，恢复与历史版本调试读取对应版本；渠道候选保存相同媒体快照，后续修改草稿不改变已发布配置。

RPA是独立项目，本轮无需实现联合登录。删除Astron Agent内的Casdoor依赖、联合登录配置和失效指引，保留02已有API Key机器人资源与执行链；不改外部RPA源码、镜像、部署、账号与权限存储。外部RPA继续使用Casdoor不影响Astron Agent独立迁移验收，不能将清理本项目配置描述为外部身份迁移完成。

本轮按用户明确要求不执行微信开放平台真实环境验收。微信签名、加密、权限、幂等、撤权及失败处理仍做本地测试；真实公众号/开放平台联调不作为本轮通过条件，也不声称已验证。后续使用仍需在服务器既有凭据位置配置有效的component参数及回调域名。

## 清理、部署与验收

完成替代后删除Console全部Java源码/测试、四个pom、Java质量配置和Maven/JDK构建链；同步清理Makefile、hooks、CodeQL和JaCoCo失效测试。改写模块说明、开发/部署命令和陈旧产品指引。保留数据卷、数据库和有效的旧数据兼容测试；Elasticsearch等非Console组件的JVM配置不属于清理目标。

本地执行Console全量Django测试、迁移一致性与ruff；Core Agent/Workflow受影响全量检查；前端type-check/lint/test/build；Compose安全契约与Helm测试。重点覆盖已有表重复接管/未知列保留、审批并发与失败、发布版本固定、应用失效与越权、分享撤销、两种执行身份隔离、公开恢复与取消、渠道重放和错误。

完整CI使用最终提交的Git隔离检出，按仓库`makefiles/localci.toml`运行全部11个应用的`make ci`，不得被本机覆盖缩小范围。`build-push.yml`成功不能替代完整CI；`ci.yml`包含`bugfix/superteam`和`core/common`。各应用质量、测试和构建失败必须向顶层传播并中止后续任务，不能被循环或成功提示覆盖；Tenant从模块根包构建，并核对实际二进制产出。

发布沿用origin到office同名分支PR/镜像流程。服务器`/data/astron-agent`原有部署改动必须保留；旧脚本deploy会无条件覆盖两个部署文件，不能直接执行，先核对并准备保留服务器差异的合入结果。测试/生产阶段共享同一次部署，不重复发布，不reset运行目录。核对镜像revision和重启持久性，最终同步本地、origin、office。

真实验收覆盖空MySQL安装和已有数据库升级；登录/空间/资源/Agent聊天、工具知识记忆/工作流Agent引用、暂停恢复、停止/审批、API、市场分享/媒体渠道及本项目RPA API Key执行回归；微信真实环境验收按用户要求不适用。旧UID、资源归属、配置、记忆密文与应用凭据迁移前后保持一致。缺少外部身份契约或真实凭据的项目明确未通过，不能用mock替代或宣告整体完成。阶段结果只返回对话，不创建报告/交接文件。

官方依据：已通过Context7核验Django5.2事务与行锁；`on_commit`回调失败不会回滚已提交事务，不能用于声称外部渠道和本地发布天然原子。新增外部API/SDK实现前继续查官方文档。
