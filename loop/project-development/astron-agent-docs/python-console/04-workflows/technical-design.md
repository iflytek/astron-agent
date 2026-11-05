# 04 工作流与 Agent 引用技术设计

依据：[需求](requirements.md)、[父需求](../requirements.md)、[目标架构](../architecture.md)、[03版本契约](../03-agents/technical-design.md)。本次仅04，沿用原Loop、CONFIG和发布流程，在bugfix/superteam开发；05发布渠道、审批和市场不在范围内。

## 调用链与影响

React现有画布、调试器、历史、自动化页面 → 同源Nginx → Django workflows → Console MySQL管理数据与运行记录 → core/workflow现有WorkflowEngine/EventRegistry → AgentNode → core/agent DeepAgentsRunner。AgentNode在每次执行前通过受信内部接口向Console取授权的运行配置；Agent工作流工具通过Console受信入口创建子运行，再进入同一core/workflow调度。Console不实现图调度、节点重试或第二套Agent循环。

沿用02空间权限、模型/工具/知识/Skill解析与产物管理，沿用03不可变Agent快照及Mem0命名空间。变更涉及Console工作流域、前端、core/workflow运行上下文和取消、core/agent工作流工具。Redis仅扩展既有EventRegistry的事件级取消标记，不清库、不改其他服务键。MinIO沿用02私有产物桶及对象键，不迁移或删除历史文件。内部密钥、原UID、RSA记忆凭据、租户应用身份保持不变。不改core/common与Kafka协议。共享的Agent资源解析仅增加已授权工作流工具，回归独立聊天及03能力。

## 数据与管理

Django非破坏接管既有workflow、workflow_version、workflow_dialog、workflow_automation_task/run及所需模板/节点配置表，保留原主键、flow_id、UID、空间、图、版本、历史和未知列。使用现有迁移接管模式，涉及MySQL DDL的迁移设atomic=False；不执行旧Flyway初始化或DROP。02的WorkflowScope/WorkflowIdentity保持只读投影，完整模型由workflows拥有。

新增运行记录保存权威用户/空间、图快照、解析后的Agent版本映射、根运行/父运行、调用链、状态、Core事件ID、实际增量事件及输出、心跳、取消状态和错误。运行快照只含引用，不持久化运行凭据或签名下载URL。旧workflow_dialog继续按原归属读取，不能由浏览器上传assistant内容制造可信执行历史。

管理接口配合现有前端：创建/编辑/软删除/复制、图校验与构建、不可变版本及恢复草稿、导入导出、模板和节点配置。业务图到Core DSL转换在Console集中完成，保留变量引用、条件、循环、重试与输入输出语义；最终结构校验交给Core官方Pydantic模型和现有引擎。导入不会携带外部凭据或自动获得资源权限；缺失依赖明确列出并阻止执行。导出配置去除凭据，不把已保存旧原文作为公开导出。

画布资源选择通过工作流目录投影复用02/03授权查询：模型只返回非密钥字段，MCP只返回稳定记录ID和工具定义，运行时再解析地址。工具目录仅展示已同步版本，将标准OpenAPI投影为画布输入输出并保留x-from/x-open等执行扩展；工具调试调用02授权REST接口，创建编辑复用02资源管理页，不恢复旧工具CRUD。版本查询保持同一授权范围；公共分页上限不改，工作流选择器独立支持既有999条请求并排除当前图。`prompt_template`、`text_node_config`非破坏接管，删除对应Java映射；模板大整数ID使用字符串传输以保留精度。未打开的弹窗不提前请求其资源，04画布初始化不依赖05虚拟人/发布接口。普通文本输入输出不得携带空的fileType，文件参数才保留fileType与allowedFileType。

执行历史以workflow/UID/space/version过滤，草稿与历史版本分开，单节点调试不混入整流对话；切换版本立即清空浏览器旧列表，拒收迟到的旧版本请求结果。旧workflow_dialog仅在草稿视图保留。复制旧工作流时跳过可空元数据字段，保留原图绑定。

历史回答只投影一次实际输出，不同时填充两个渲染字段。Core普通流与恢复流共用终帧规则：正文已分片发送时，终帧不再重复聚合正文；仅终帧携带正文时仍保留。前端将省略的finish_reason视为未终止，分别处理节点结束与整流结束。

单节点调试只冻结选中节点和该节点实际依赖，不受画布其他未配置节点影响。Code IDE将本次代码与JSON输入放入临时节点快照，不写回草稿；临时输出定义为空以允许试验新返回字段，展示Core实际raw_output，不eval字符串。调试记录的token_cost参与追踪和统计。

工作流版本和本域模板可用不等于05渠道发布。保存版本不能修改旧快照或触发渠道发布。删除仅软删除；恢复版本创建/更新草稿，不覆盖原版本。

## 固定Agent版本与执行身份

引用节点用nodeParam.agentId保存稳定Agent ID。首次运行递归扫描冻结图，调用03 resolve_version(scope,agent_id)选择已发布版本，并一次性保存nodeId→agentId/versionId映射；不能等执行到节点才解析。未发布、已删除、越权或资源无效即明确失败，不回退草稿。

Core的可信console_context只携带run_id/root_id，不能由公网输入、导入图或用户ext冒充。AgentNode每次尝试POST `/workflow/internal/agent-runtime`，携带runId、nodeId和本节点输入；Console读取运行记录，再调用03显式版本解析、资源解析、prompt构造和memory.search，返回统一CustomCompletionInputs配置。节点重试不变更映射；恢复复用同一run/event/图；用户显式重试创建关联尝试并复制原映射和图，仍重新校验现有权限。独立的新运行才重新读取发布指针。

内联Agent节点仍使用同一core/agent入口，经Console授权解析其持久资源引用，不能信任图中浏览器提供的模型密钥、owner UID或任意凭据。与独立Agent相同的字段由共用解析器处理，不在节点中复制工具循环。

Agent节点messages仅包含当前工作流run/node的输入与该调度上下文，不读取AgentSession/AgentRun聊天历史。长期记忆仍使用原UID、bot-稳定Agent ID及空间metadata；只检索同一用户/空间/Agent偏好，不以版本或入口切分。工作流临时变量与工具结果不自动写Mem0；用户显式偏好沿用03接口。

## 生命周期、取消与递归

新增内部 `/workflow/v1/console/run` 接收冻结Core协议和可信运行上下文，调用现有event_stream/WorkflowEngine，不从可变Core草稿重新取图。返回现有LLMGenerate事件，Console只添加运行标识事件并持久化实际输出。非零code、断流缺少终态、节点错误不能记成功。统计与追踪来自真实运行事件和历史，不合成成功结果。Core节点耗时以秒返回，Console追踪接口统一换算为毫秒；run-end事件提供基于持久化起止时间的durationMs，前端换算为秒展示，恢复后的总耗时包含暂停时间。

Core现有暂停是Redis EventRegistry协调的活跃engine_task等待，不是跨进程持久化检查点。继续使用该机制：收到interrupt保存paused/eventId；恢复在Console事务内占用同一运行，重验权限后发送Core resume，禁止重复恢复。进程退出、事件过期或无法恢复明确记interrupted，不重放已完成节点冒充恢复。新尝试由用户明确触发并保留旧尝试。

显式停止及非暂停流断连标记整个根调用树取消，关闭HTTPX/Core Agent上游流。Core增加事件取消端点和事件级Redis标记，engine_task包括暂停期间都监控取消，取消到达节点任务和core/agent工具。resume流断开同样清理。终态采用条件更新，停止不覆盖已完成结果；暂停的正常断流不当作用户取消。心跳和过期检测暴露服务异常。

浏览器显式停止先等待服务端持久化取消，再断开事件流；停止早于首个运行标识时保留意图，收到标识后提交取消。暂停状态同样提供停止操作，不能仅关闭调试面板而遗留活跃执行。取消请求失败时保留连接与重试能力，不伪造取消成功。

每个独立Agent或工作流顶层执行建立可信根上下文；子工作流调用由Console原子登记父子关系并扣减共享调用预算，调用链含Agent和工作流稳定ID，重复祖先或超过深度立即拒绝。上下文由持久记录派生，不信任模型参数中的UID/space/budget。所有子执行共用根取消与截止时间，节点重试也消耗预算；有副作用的失败不自动从头重放图。core/agent工作流工具使用官方HTTP客户端并关闭响应、客户端，保留错误和取消，不吞异常为成功文本。

## 自动化与旧实现清理

复用既有定时任务表、原cron/timezone、固定工作流版本和参数；使用成熟调度/cron库解析，不手写cron算法。调度器通过数据库事务领取到期任务并持久化唯一触发记录，多个worker不重复触发，同任务不重叠。每次触发校验创建者账号、空间和当前执行权限；失效版本明确失败，删除Java中“版本不存在则使用最新版”的回退。手动立即执行和定时执行共用运行服务，新增运行分别解析当时Agent发布指针。

删除本阶段替代的Java工作流管理、执行/SSE、自动化、转换及失效测试；05仍使用的数据实体和发布渠道代码经调用检查后保留，不能保留Java代理执行。02已有产物接口继续复用并核对工作流权限。网关为工作流SSE关闭缓冲、启用保活，并禁止公网访问内部运行/授权接口；Compose/Helm配置保持一致。

## 验证方式

本地：Console全部Django测试、迁移一致性、ruff；Core工作流及Agent受影响测试、类型/格式检查；前端type-check、lint、测试、构建。回归覆盖旧表接管/未知列和数据保留、Agent固定版本（发布切换、重试、暂停恢复）、越权/撤权/删除、历史隔离/记忆共享、循环/预算、断连/停止/暂停取消、重复恢复、自动化重复领取、导出凭据清理及导入依赖。

独立审查通过后按既有发布流程构建并部署一次，核对镜像revision。服务器/data/astron-agent有部署改动，不reset、不覆盖；完整CI在Git隔离检出运行，不修改服务器工作目录。测试与生产部署阶段共享同一已验收部署，不重复发布。

测试环境必须浏览器实际验收画布创建、编辑、节点配置、构建、运行、单节点调试、暂停恢复、停止、版本/导入导出/模板、历史追踪统计、自动化、产物；使用真实模型和现有Mem0验证独立Agent引用、未发布草稿隔离、同run固定版本及新run更新、跨用户/空间拒绝、共享偏好且历史隔离。后端真实请求补充并发、撤权、取消、循环和故障边界。未执行项不能记通过；只在所有适用阶段通过后宣布04完成，最后同步本地/origin/office，不合并main。

官方依据：Context7已核验Django5.2事务、异步ORM边界和StreamingHttpResponse断连取消；具体新增第三方API在实现前继续查询官方文档。阶段结果只返回对话，不创建报告/交接文件。
