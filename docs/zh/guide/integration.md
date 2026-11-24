# 在现有项目中集成 Astron Agent

Astron Agent 可以通过已发布的工作流 API，为其他应用提供工作流执行能力。你的项目继续负责自己的界面和业务逻辑，Astron Agent 则在 HTTP/SSE 边界后提供工作流、模型、知识库、工具和 RPA 编排。

> 这里描述的是**服务集成**，不是进程内依赖。当前面向消费者的稳定边界是 Astron Agent 网关暴露的公开工作流 API；仓库内部的 Python 模块属于实现细节，并未作为稳定 SDK 包发布。

## 适用场景

以下情况适合使用工作流 API：

- 为已有 Web、移动端、后端或自动化项目补充 AI 工作流能力；
- 将模型和工具编排集中在 Astron Agent 中，避免每个业务项目重复实现；
- 向用户界面流式返回中间结果；
- 让多个服务复用同一条已发布工作流，同时按应用隔离凭据。

如果只是评估或运行完整平台，请先阅读[快速开始](./quick-start.md)或[部署说明](./deploy.md)。

## 集成边界

```text
你的应用
    │  POST /workflow/v1/chat/completions
    │  Authorization: Bearer <application-key>:<application-secret>
    ▼
Astron Agent 网关（Nginx）
    │  校验应用身份，将原凭据转发至 Django Console
    ▼
已发布工作流
    └─ 模型 · 知识库 · 工具/MCP · RPA
```

请调用发布后显示的网关地址。不要直接调用 `core-workflow:7880`、`/internal/gateway/auth/**` 或其他容器内部端点：这些路由属于内部实现，直连会绕过受支持的网关边界。

## 1. 将工作流发布为 API

1. 在 Astron Agent 控制台创建并调试工作流。
2. 在工作流编辑器中点击**发布**。
3. 选择**发布为 API**并进入配置。
4. 新建或选择应用，完成发布流程。
5. 保存生成的信息：
   - **服务地址（Service URL）**
   - **Flow ID**
   - **API Key**
   - **API Secret**

请将 API Secret 保存在服务端密钥管理系统中，不要写入浏览器代码、移动端安装包、源码仓库、截图或客户端可见日志。

## 2. 调用已发布版本

工作流使用 `POST /workflow/v1/chat/completions`。使用控制台生成的 Service URL 和应用凭据：

```bash
export ASTRON_BASE_URL="https://astron.example.com"
export ASTRON_API_KEY="replace-me"
export ASTRON_API_SECRET="replace-me"

curl --no-buffer \
  --request POST "$ASTRON_BASE_URL/workflow/v1/chat/completions" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data '{
    "flow_id": "<FLOW_ID>",
    "uid": "user-123",
    "sessionId": "conversation-456",
    "stream": true,
    "parameters": {"query": "总结这条客户工单"}
  }'
```

| 字段 | 含义 |
| --- | --- |
| `flow_id` | 已绑定到当前应用的工作流标识。 |
| `parameters` | 开始节点输入；将 `query` 替换为已发布工作流的实际输入。 |
| `uid` | 业务用户标识，非空字符串、最长 512 字符；省略时使用 `default`。也接受 `user`。 |
| `sessionId` | 可选的会话关联标识，最长 96 字符。 |
| `stream` | 布尔值，默认 `true`；`false` 等待执行结果。 |

调用固定使用当前应用绑定的不可变发布版本；运行开始后，后续发布不会改变该运行。客户端不能用 `version` 切换任意草稿，也不能上传 `history` 冒充服务端会话。

独立 Agent 使用 `POST /agent/v1/chat/completions`，鉴权相同，正文示例：

```json
{
  "bot_id": "<BOT_ID>",
  "user": "user-123",
  "sessionId": "conversation-456",
  "stream": true,
  "messages": [{"role": "user", "content": "你好"}]
}
```

每次只传一条用户消息。同一应用、用户与 `sessionId` 延续服务端会话；运行仍在生成时不能在同一会话发起另一个运行。

## 3. 处理执行事件

流式响应是 SSE，客户端必须同时处理 `event:` 和 `data:`，并忽略以 `:` 开头的心跳注释。不要把所有数据帧都当作文本增量。

- 工作流首先发送 `event: run`，其中 `data.runId` 是控制操作使用的运行标识；执行中的内容帧可包含 `choices[0].delta.content`。
- 工作流最后发送 `event: run-end`，以其中的 `status` 区分 `completed`、`paused`、`failed`、`cancelled`、`interrupted`。`finish_reason: interrupt` 提示暂停，但应保留运行标识并核对最终状态。
- Agent 首先发送 `event: run`，其中 `data.id` 是控制使用的运行标识；内容增量使用 `choices[0].delta.content`。结束帧中的 `code` 和 `finish_reason` 表示结果，随后为 `data: [DONE]`；不要将 `[DONE]` 解析为 JSON。
- HTTP 建连成功不代表执行成功。收到错误码、失败终态或缺少终态的断流时，应保留已收到内容并报告失败或中断。

`stream: false` 返回单个 JSON，包含 `runId`、`sessionId`、`status`、`code` 和 `choices[0].message.content`。仅 `status: completed` 表示成功；暂停、取消和失败不能当作完成。

## 4. 恢复与停止运行

暂停的工作流使用原应用凭据恢复：

```bash
curl --no-buffer \
  --request POST "$ASTRON_BASE_URL/workflow/v1/resume" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data '{"runId":"<RUN_ID>","content":"用户回复内容"}'
```

恢复始终返回 SSE，继续原运行和发布版本，不重放已完成节点。只有 `paused` 的工作流可恢复；Agent、不处于暂停状态或已失去访问权限的运行会拒绝恢复。兼容旧工作流调用方的 `event_id`，新调用方应保存并使用 `runId`。

Agent 和工作流都使用以下接口停止：

```bash
curl \
  --request POST "$ASTRON_BASE_URL/workflow/v1/stop" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data '{"runId":"<RUN_ID>"}'
```

成功响应的 `data` 包含 `id`、`status` 和 `cancelRequested`。`cancelRequested: true` 只表示已请求取消，不应立即把运行显示为已取消；以返回的实际 `status` 和原 SSE 终态为准。关闭浏览器或中止 HTTP 连接不能代替显式停止。

停止和恢复均重新校验应用凭据、运行归属及当前发布权限。它们只能操作同一应用通过公开 API 创建的运行；其他应用或 Console 浏览器会话的运行不能复用。未公开的 `/workflow/v1/**`、`/agent/v1/**` 控制路径不会转发到 core。

## 生产接入检查清单

- **启用 HTTPS。** 默认本地部署监听 HTTP；在可信网络之外暴露 API 前，应在 Nginx 或上层 Ingress 终止 TLS。
- **凭据只放服务端。** 浏览器或移动端需要使用该能力时，先调用你自己的后端，再由后端调用 Astron Agent。
- **按环境和消费者拆分应用。** 对需要独立轮换和撤销权限的环境或调用方，分别创建 Astron 应用和凭据。
- **配置流式超时。** 内置网关允许长连接，但链路中的其他反向代理和客户端也必须关闭缓冲并设置合适的读取超时。
- **使用稳定业务标识。** 从业务系统生成 `uid` 和 `sessionId`，不要在其中放入密钥或敏感个人信息。
- **校验工作流输入。** 将 `parameters` 视为不可信输入；传给工具、数据库或 RPA 动作前先约束类型和范围。
- **安全记录追踪 ID。** 响应中的 `id` 可用于排障；可以记录它以及状态和耗时，但必须脱敏凭据和敏感提示词。
- **管理工作流变更。** 开始节点的输入和结束节点的输出就是消费者协议；发布新版本前应审查字段，并用真实客户端验证。

## 不属于稳定依赖协议的内容

以下内容适合贡献 Astron Agent 本身时使用，但外部应用不应将其视为稳定 API：

- 直接导入 `core/agent`、`core/workflow` 或 `core/common` 中的包；
- 直连容器 DNS 名称或内部服务端口；
- 由客户端自行传入 `X-Consumer-Username`；
- 调用 `/internal/gateway/auth/**` 或未公开的 `/workflow/v1/**` 路由；
- 直接读写 Astron Agent 数据库。

如需扩展仓库内部模块，请阅读[模块说明](../PROJECT_MODULES.md)；如需复用工作流定义，请查看[工作流示例](../examples.md)。

## 故障排查

| 现象 | 检查项 |
| --- | --- |
| 返回 `401` 或提示凭据缺失/格式错误 | 请求头必须严格为 `Authorization: Bearer <application-key>:<application-secret>`，并确认两个值都非空。 |
| 提示 `Failed to get application` | 确认 API Key 和 API Secret 属于发布时选择的同一个应用。 |
| 工作流不存在或无权访问 | 使用已发布 API 显示的 Flow ID，不要误用 App ID 或仅供编辑器使用的 ID。 |
| 参数校验失败 | `parameters` 的字段名和类型必须与开始节点定义一致。 |
| 输出直到最后才一次性返回 | 关闭所有反向代理的响应缓冲，并使用支持 SSE 的 HTTP 客户端。 |
| 长时间没有文本但连接未断 | 长节点运行期间出现心跳帧属于正常现象；调用方仍应设置整体超时。 |
| Docker 内可用但外部不可用 | 调用对外暴露的网关主机和端口，并检查 DNS、防火墙、TLS 与代理路由。 |

更多运维信息请参考 [FAQ](../faq.md)、[配置参考](../CONFIGURATION.md)和[部署说明](./deploy.md)。
