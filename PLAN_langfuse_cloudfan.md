# Astron-Agent × Langfuse 集成方案（Option A 原生埋点）

> 云帆侦察产出 · 2026-08-09
> 目标 issue: iflytek/astron-agent #1575

## 一、插桩点定位（已确认）

所有 LLM 调用收敛在 **`core/agent/domain/models/base.py`**：

| 位置 | 说明 |
|------|------|
| `BaseLLMModel.create_completion()` | **统一 LLM 调用入口**（L21），所有模型走这里 |
| `BaseLLMModel.stream()` | 流式出口（L89），已带 OTel span 参数 |
| `base_builder.py` `build_model()` | LLM client 构建处（`AsyncOpenAI` 实例化，L335） |

调用链：`cot_runner / engine nodes → model.stream() → create_completion() → AsyncOpenAI`

项目已有 OTel span 体系（`common.otlp.trace.span.Span`），但没有 Langfuse。

## 二、集成方案（Option A 增强版：分层包装 + 统一入口兜底）

### 核心设计：三个 provider 全覆盖 + 双保险

**层 1 — builder 分层包装（覆盖 3 provider）**

| provider | 包装方式 | 代码位置 |
|----------|----------|----------|
| openai（默认） | `langfuse.openai.AsyncOpenAI` | `base_builder.py` L335 |
| anthropic | `langfuse.anthropic.AsyncAnthropic`（Langfuse SDK 原生支持） | `base_builder.py` L319 |
| google | `langfuse.observe()` 装饰器包 `stream()`（SDK 无 google 专用包装时降级） | `models/base.py` GoogleLLMModel |

**层 2 — 统一入口兜底（防未来新 provider 漏掉）**
`BaseLLMModel.create_completion()`（L21）是所有调用汇聚点，加 `@observe` 装饰器或手动 span 兜底——以后加新 provider 也不会漏 trace。

**层 3 — OTel 桥接（零改动备用路径）**
agent 服务已内置标准 OTel SDK（`trace.get_tracer` + OTLP 导出），Langfuse 自托管支持 OTel 摄取。`OTLP_ENDPOINT` 指向 Langfuse + 注入鉴权 header 即可零代码出 trace。**但注意：** astron-agent 的自定义 span 字段是否符合 Langfuse gen_ai 语义约定未验证，若面板上渲染不出 LLM 详情/成本，则此路径仅作补充证据，主证据走层 1+2。

### 环境变量（可开关，无则优雅降级）

```
LANGFUSE_PUBLIC_KEY=xxx      # 必须
LANGFUSE_SECRET_KEY=xxx      # 必须
LANGFUSE_HOST=http://localhost:3000
LANGFUSE_ENABLED=true        # 总开关，false 时走原生 AsyncOpenAI
```

### 降级策略（验收关注点之一）

- 未配置 `LANGFUSE_*` → 走原生 `AsyncOpenAI`，行为与现在完全一致
- 配置了但 Langfuse 服务不可达 → 捕获异常 + 日志告警，不影响主链路

### 改动文件清单（预估 5-6 个）

| 文件 | 改动 |
|------|------|
| `core/agent/pyproject.toml` | 加可选依赖 `langfuse>=2.x` |
| `core/agent/service/builder/base_builder.py` | 按 provider 分层包装（openai/anthropic/google） |
| `core/agent/domain/models/base.py` | 统一入口 `@observe` 兜底 + google 降级包装 + token 用量上报 |
| `core/agent/config.env` | 加 `LANGFUSE_*` 环境变量说明 |
| `docs/zh/` 或 README | 集成说明 + 环境变量表 + 降级行为 |
| （可选）`core/agent/tests/` | 降级测试：无 LANGFUSE 环境行为不变

## 三、验证步骤（验收硬指标）

1. `docker compose` 起 Langfuse 自托管（`docker/langfuse` 或官方 compose）
2. 本地起 astron-agent core/agent 服务，配好 `LANGFUSE_*`
3. 跑一个 demo workflow（用 `examples/` 现成的）
4. Langfuse 面板截图：能看到嵌套 trace（workflow → node → LLM span）
5. 关闭 `LANGFUSE_ENABLED` 复跑 → 确认无 Langfuse 也正常（降级验证）

## 四、待确认

1. 账号：用 BOSS 的 GitHub 账号 fork + 提交（收钱账号）
2. 依赖：Langfuse 作为**可选 extra**（`pip install astron-agent[langfuse]`）还是必选？
   - 建议可选：不引入额外强制依赖，默认行为不变
3. PR 里 AI 辅助披露：会写明用了 deepseek-v4-flash 辅助 + 人工改动清单
