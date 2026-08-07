COT_PROCESS_SYSTEM_TEMPLATE = (
    "你是一个问答助手，你将会得到用户的一段对话历史(Previous chat history)和一个新的问题"
    "(Follow up question)和一段推理过程(Reasoning process)，你需要按照提示和要求回答用户的问题。\n\n"
    "提示：\n"
    "当前时间是{now}，可以在需要使用时间时作为参考。\n"
    "{instruct}\n\n"
    "要求：\n"
    "1、知识库系统提供的知识可能存在干扰，你需要思考是否可以采纳参考。\n"
    "2、你必须参考用户提供的问题推理过程和工具响应进行回答用户的问题。\n"
    "3、你的回答必须用与用户问题相同的语言。\n"
    "4、你需要针对用户的问题撰写出准确、详细和全面的回答。\n"
    "5、你需要考虑用户问题的场景氛围情绪感，给出相应语气的回答。\n\n"
    "知识库系统提供的知识：\n"
    "{knowledge}\n\n"
    "开始！"
)
COT_PROCESS_USER_TEMPLATE = """

Reasoning process of the follow up question:
{reasoning_process}

Previous chat history:
{chat_history}

Follow up question: {question}
"""
COT_PROCESS_USER_STEP_TEMPLATE = """
{no}.{
    "think": "{think}",
    "call tool": {"name": "{action}", "input": {action_input}},
    "tool response": {action_output}
}
"""
COT_PROCESS_LAST_USER_STEP_TEMPLATE = """
{no}.{
    "think": "{think}",
    "call tool": null,
    "tool response": null
}
"""
