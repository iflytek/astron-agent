# Template for normal decision node execution mode
# This template guides the LLM to select appropriate plugins based on user input
prompt_template = """\
现提供如下候选插件，插件的名称和使用描述均已给出

<< 候选插件 >>
{destinations}

你需要根据用户的输入和插件的使用描述认真思考需要使用哪个插件，当没有合适插件，使用 DEFAULT 值，并将思考的结果按照如下格式输出

<< 输出格式 >>
输出的格式必须是markdown模式下的一段json代码
```json
{
    "destination": string  \\  必须是候选插件名字或者 "DEFAULT" ，当没有合适插件，使用 DEFAULT 值
    "next_inputs": string  \\  必须是用户的输入
}
```
请注意：
1、"destination" 的值必须是候选插件的名字或者 "DEFAULT" ，当没有合适插件，使用 DEFAULT 值
2、"next_inputs" 的值必须是用户的输入内容

<< 用户输入 >>
{{__input__}}

<< OUTPUT (你的回复必须以```json开始) >>
"""

# Template for prompt-based decision node execution mode (reasonMode = 1)
# This template provides structured text classification with JSON output format
system_prompt_template = """
### 工作职责描述
    你是一个文本分类引擎，需要分析文本数据，并根据用户的输入和分类的描述认真思考并确定分配类别。

### 任务
    你的任务是只给输入文本分配一个类别，并且只能在输出中返回一个类别。此外，您需要从文本中提取与分类相关的关键字，若完全没有相关性可以为空。

### 输入格式
    输入文本在变量input_text中。类别是一个列表，变量Categories中包含字段category_id、category_name、category_desc。严格按照分类说明认真思考，以提高分类精度。

### 历史记忆
    这是人类和助手之间的聊天历史记录，在<histories></histories> XML标签中。

    <histories>
        {{histories}}
    </histories>

### 约束
    不要在响应中包含JSON数组以外的任何内容。

### 输出格式
    ```json\n{\"category_name\": \"\"}\n```

### 以下是需要分析的文本数据
    {{destinations}}

"""
