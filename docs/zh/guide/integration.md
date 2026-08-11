# 在现有项目中集成 Astron Agent

Astron Agent 可以通过已发布的工作流 API，为其他应用提供工作流执行能力。你的项目继续负责自己的界面和业务逻辑，Astron Agent 则在 HTTP/SSE 边界后提供工作流、模型、知识库、工具和 RPA 编排。

> 这里描述的是**服务集成**，不是进程内依赖。当前面向消费者的稳定边界是 Astron Agent 网关暴露的公开工作流 API；仓库内部的 Python、Java 模块属于实现细节，并未作为稳定 SDK 包发布。

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
    │  校验应用身份并转发 App ID
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

## 2. 调用已发布工作流

公开端点为：

```text
POST <ASTRON_BASE_URL>/workflow/v1/chat/completions
```

如果控制台展示的 Service URL 与上述路径不同，请以控制台生成的完整地址为准。鉴权信息通过一个请求头传入：

```http
Authorization: Bearer <application-key>:<application-secret>
Content-Type: application/json
```

最小请求示例：

```json
{
  "flow_id": "<FLOW_ID>",
  "uid": "user-123",
  "stream": true,
  "parameters": {
    "query": "总结这条客户工单"
  }
}
```

`flow_id` 和 `parameters` 为必填项。`parameters` 内可用的字段来自工作流的开始节点，请将示例中的 `query` 替换为已发布工作流实际定义的输入。

可选请求字段：

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `uid` | string | 业务系统中的终端用户标识，最长 40 个字符。 |
| `stream` | boolean | `true` 返回 SSE 流，`false` 返回单个 JSON；默认 `true`。 |
| `chat_id` | string | 业务系统中的会话标识，最长 128 个字符；继续同一会话时可复用。 |
| `history` | array | 历史消息，格式为 `{ "role": "user" | "assistant", "content": "...", "content_type": "text" }`。 |
| `ext` | object | 随请求传入的扩展元数据。 |
| `version` | string | 环境要求指定发布版本时使用。 |

### cURL

```bash
export ASTRON_BASE_URL="https://astron.example.com"
export ASTRON_API_KEY="replace-me"
export ASTRON_API_SECRET="replace-me"
export ASTRON_FLOW_ID="replace-me"

curl --no-buffer \
  --request POST "$ASTRON_BASE_URL/workflow/v1/chat/completions" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data "{
    \"flow_id\": \"$ASTRON_FLOW_ID\",
    \"uid\": \"user-123\",
    \"chat_id\": \"conversation-456\",
    \"stream\": true,
    \"parameters\": {
      \"query\": \"总结这条客户工单\"
    }
  }"
```

### Python

以下示例只使用 Python 标准库。请在后端服务中运行，不要把密钥放进浏览器端代码。

```python
import json
import os
import urllib.request

base_url = os.environ["ASTRON_BASE_URL"].rstrip("/")
credential = f'{os.environ["ASTRON_API_KEY"]}:{os.environ["ASTRON_API_SECRET"]}'
payload = {
    "flow_id": os.environ["ASTRON_FLOW_ID"],
    "uid": "user-123",
    "chat_id": "conversation-456",
    "stream": True,
    "parameters": {"query": "总结这条客户工单"},
}

request = urllib.request.Request(
    f"{base_url}/workflow/v1/chat/completions",
    data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {credential}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    },
    method="POST",
)

with urllib.request.urlopen(request, timeout=1800) as response:
    for raw_line in response:
        line = raw_line.decode("utf-8").strip()
        if not line.startswith("data:"):
            continue
        event = json.loads(line.removeprefix("data:").strip())
        if event.get("code") != 0:
            raise RuntimeError(event.get("message", "工作流执行失败"))

        choice = (event.get("choices") or [{}])[0]
        delta = choice.get("delta") or {}
        if delta.get("content"):
            print(delta["content"], end="", flush=True)

        finish_reason = choice.get("finish_reason")
        if finish_reason == "stop":
            break
        if finish_reason == "interrupt":
            print("\n工作流已暂停，需要用户回复。")
            break
```

### Node.js 18+

```js
const baseUrl = process.env.ASTRON_BASE_URL.replace(/\/$/, "");
const authorization = `Bearer ${process.env.ASTRON_API_KEY}:${process.env.ASTRON_API_SECRET}`;

const response = await fetch(`${baseUrl}/workflow/v1/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: authorization,
    "Content-Type": "application/json",
    Accept: "text/event-stream"
  },
  body: JSON.stringify({
    flow_id: process.env.ASTRON_FLOW_ID,
    uid: "user-123",
    chat_id: "conversation-456",
    stream: true,
    parameters: { query: "总结这条客户工单" }
  })
});

if (!response.ok || !response.body) {
  throw new Error(`Astron 请求失败：${response.status} ${await response.text()}`);
}

const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
let buffer = "";
let finished = false;

while (!finished) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += value;

  const frames = buffer.split("\n\n");
  buffer = frames.pop() ?? "";

  for (const frame of frames) {
    const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
    if (!dataLine) continue;

    const event = JSON.parse(dataLine.slice(5).trim());
    if (event.code !== 0) throw new Error(event.message || "工作流执行失败");

    const choice = event.choices?.[0];
    if (choice?.delta?.content) process.stdout.write(choice.delta.content);
    if (choice?.finish_reason === "interrupt") {
      console.log("\n工作流已暂停，需要用户回复。");
      finished = true;
    }
    if (choice?.finish_reason === "stop") finished = true;
  }
}
```

## 3. 处理响应

### 流式模式

当 `stream: true` 时，响应类型为 `text/event-stream`。每一帧包含一行 `data:`，其值为 JSON。常用字段如下：

```json
{
  "code": 0,
  "message": "Success",
  "id": "request-or-session-id",
  "choices": [
    {
      "delta": {
        "role": "assistant",
        "content": "增量输出",
        "reasoning_content": ""
      },
      "finish_reason": null
    }
  ],
  "workflow_step": {
    "seq": 3,
    "progress": 0.5
  }
}
```

客户端处理规则：

- `choices[0].delta.content` 非空时，将其追加到当前输出；
- 即使 HTTP 连接已经成功建立，只要 `code != 0`，仍应按工作流错误处理；
- `finish_reason: "ping"` 是心跳帧，可以忽略；
- `finish_reason: "stop"` 表示执行结束；
- 仅当工作流包含交互式暂停时，才需要处理 `finish_reason: "interrupt"`；
- 不要将每个中间帧中的 `workflow_step` 全部字段视为稳定业务协议。

### 非流式模式

将 `stream` 设为 `false` 可获得单个 JSON 响应。返回值仍使用相同的顶层结构，应读取 `code`、`message`、`choices` 和 `usage`，不要假设响应正文是纯文本。

## 4. 恢复被中断的工作流

如果某一帧的 `finish_reason` 为 `interrupt`，请保存 `event_data.event_id`。收集用户回复后调用：

```text
POST <ASTRON_BASE_URL>/workflow/v1/resume
```

使用相同的 Authorization 请求头：

```bash
curl --no-buffer \
  --request POST "$ASTRON_BASE_URL/workflow/v1/resume" \
  --header "Authorization: Bearer $ASTRON_API_KEY:$ASTRON_API_SECRET" \
  --header "Content-Type: application/json" \
  --data '{
    "event_id": "<EVENT_ID>",
    "event_type": "resume",
    "content": "用户回复内容"
  }'
```

恢复后的响应模式与被中断的请求一致。Event ID 属于运行时状态，应尽快恢复，并将过期或已经恢复过的事件按错误处理。

## 生产接入检查清单

- **启用 HTTPS。** 默认本地部署监听 HTTP；在可信网络之外暴露 API 前，应在 Nginx 或上层 Ingress 终止 TLS。
- **凭据只放服务端。** 浏览器或移动端需要使用该能力时，先调用你自己的后端，再由后端调用 Astron Agent。
- **按环境和消费者拆分应用。** 对需要独立轮换和撤销权限的环境或调用方，分别创建 Astron 应用和凭据。
- **配置流式超时。** 内置网关允许长连接，但链路中的其他反向代理和客户端也必须关闭缓冲并设置合适的读取超时。
- **使用稳定业务标识。** 从业务系统生成 `uid` 和 `chat_id`，不要在其中放入密钥或敏感个人信息。
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
