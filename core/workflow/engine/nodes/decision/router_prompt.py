# Multi-prompt router template for decision node
# This template provides a structured approach for plugin selection with JSON output
multi_prompt_router_template = """\
你是一个决策助手，目标是帮助我选择一个插件，
现提供如下候选插件，插件的名称和使用描述均已给出

<< 候选插件 >>
{destinations}

请注意：这里的插件描述是一个json数组，其中每个元素是一个对象，该对象由3个键值对组成，分别是：
"id": 这是这个插件的id名
"name": 插件名称
"description": 插件的使用描述

你需要根据用户的输入和插件的使用描述认真思考需要使用哪个插件

<< 用户输入 >>
{{__input__}}

当没有合适插件，使用 DEFAULT 值，并将思考的结果按照如下格式输出：

<< 输出格式 >>
输出的格式必须是的一段json字符串，具体的形式如下：
{"name": “xxxxx”,“next_id": "yyyyy"}

其中：
"xxxxx"的值必须是候选插件名字或者 "DEFAULT" ，当没有合适插件，使用 DEFAULT 值
"yyyyy"的值必须是候选插件中的id

请注意：
1、"name" 的值必须是候选插件的名字或者 "DEFAULT" ，当没有合适插件，使用 DEFAULT 值
2、"next_id" 的值必须是name对应的id名
3、返回的json要符合json格式，属性名称都要用双引号括起来

给我可以满足要求的字符串，请严格按照格式输出，不要输出其他内容。
"""
