import json
import os
from typing import Any, Dict, List, Optional

from common.otlp.trace.span import Span

from knowledge.exceptions import ThirdPartyException
from knowledge.llm.openai_llm import OpenAI

REWRITE_QUERY_SYSTEM_PROMPT = """
# 角色：

您是一名专业的查询重构工程师，擅长根据用户提供的上下文信息重写用户最新的查询，使其更清晰、完整且符合用户意图。您应当使用用户输入的语言进行回复。

# 输入与输出格式：
- 输入为用户与模型的对话历史和最新的查询
- 输出应为重构后的查询，以纯文本形式呈现，不要包含任何解释或注释。

# 示例：

## 示例1：

### 输入:

用户交互历史：
[{"role": "user","content": "世界上最大的沙漠在哪里？"},
 {"role": "assistant","content": "世界上最大的沙漠是撒哈拉沙漠。"}]

用户最新查询：
怎么去那里？

### 模型输出：
如何前往撒哈拉沙漠？

## 示例2：

### 输入：

用户交互历史：
[]

用户最新查询：
分析当前网红欺骗公众赚取流量对当今社会的影响。

### 模型输出：
当前网红通过欺骗公众赚取流量。分析这种现象对当今社会的影响。

# 注意：
- 请确保重构后的查询与用户最新的查询相关，且符合用户意图。

开始：
用户交互历史：
{history}

用户最新查询：
{query}

"""


async def rewrite_query(
    query: str, history: List[Dict[str, Any]], span: Optional[Span] = None
) -> str:
    if span is None:
        raise ValueError("span is required")
    with span.start(
        func_name="REWRITE_QUERY", add_source_function_name=True
    ) as span_context:
        try:
            if len(history) == 0:
                return query

            llm = OpenAI(
                model=os.getenv("RQ_MODEL", ""),
                api_key=os.getenv("RQ_API_KEY", ""),
                base_url=os.getenv("RQ_BASE_URL", ""),
            )
            user_history = []
            for h in history:
                if h["role"] == "user":
                    user_history.append(h)

            history_str = json.dumps(user_history, ensure_ascii=False)

            user_prompt = REWRITE_QUERY_SYSTEM_PROMPT.replace(
                "{history}", history_str
            ).replace("{query}", query)
            messages = [{"role": "user", "content": user_prompt}]
            span_context.add_info_events(
                {"MESSAGES": json.dumps(messages, ensure_ascii=False)}
            )

            chat_response = llm.stream_chat(messages=messages, span=span_context)
            new_query = ""

            async for response, finished in chat_response:
                new_query += response.content
            span_context.add_info_events({"NEW_QUERY": new_query})

            return new_query

        except ThirdPartyException as e:
            span_context.record_exception(e)
            raise e
        except Exception as e:
            span_context.record_exception(e)
            raise e
