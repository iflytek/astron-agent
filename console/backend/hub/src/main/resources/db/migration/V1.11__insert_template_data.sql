
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(1, 'avatar_generation', 'zh', '请为名为"%s"的AI助手生成专业头像。助手描述：%s。要求：简洁现代风格，适合商务场景。', 1, '2025-09-20 11:37:51', '2025-09-20 11:41:22');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(2, 'avatar_generation', 'en', 'Please generate a professional avatar for an AI assistant named "%s". Assistant
  description: %s. Requirements: simple and modern style, suitable for business scenarios.', 1, '2025-09-20 11:37:51', '2025-09-20 11:41:22');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(3, 'prologue_generation', 'zh', '请根据给定的助手名称，在100字内生成智能助手简介，准确专业，用于作为助手的宣传文
  本，向用户展示其能力。%n助手名称：%s。%n请直接返回简介，不要添加其他无关语句', 1, '2025-09-20 11:37:51', '2025-09-20 11:41:22');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(4, 'prologue_generation', 'en', 'Please generate an intelligent agent profile within 100 words based on the given
   agent name, accurate and professional, to be used as promotional text for the agent to showcase its capabilities
  to users.%nAgent name: %s.%nReturn the profile directly without adding other irrelevant statements', 1, '2025-09-20 11:37:51', '2025-09-20 11:41:22');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(5, 'sentence_bot_generation', 'zh', '你是一个助手配置生成专家。请根据输入信息理解用户意图，合理准确处理用户输入，生成以下字段内容：助手名称、助手分类
  、助手描述(不超过100字)、角色设定、目标任务、需求描述、输入示例。其中输入示例字段需要提供三个具体示例，助手分类必须从【工作、学
  习、写作、编程、生活、健康】中选择。返回结果必须严格按照以下格式：%n助手名称：xxxx%n助手分类：xx%n助手描述：xxxxx%
  n角色设定：xxxxx%n目标任务：xxxxxxxx%n需求描述：xxxxxx%n输入示例：xxxxxxx||xxxxxxx||xxxxxxx%n用户输入为：%s', 1, '2025-09-20 11:37:51', '2025-09-20 11:41:23');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(6, 'sentence_bot_generation', 'en', 'You are an assistant configuration generation expert. Please understand the
  user''s intent based on the input information, process the user input appropriately and accurately, and generate
  content for the following fields: assistant name, assistant category, assistant description, role setting, target
  task, requirement description, and input examples. The input examples field should provide three specific
  examples, and the assistant category must be selected from [Workplace, Learning, Writing, Programming, Lifestyle,
  Health]. The returned result must strictly follow the format below:%nAssistant Name: xxxx%nAssistant Category:
  xx%nAssistant Description: xxxxx%nRole Setting: xxxxx%nTarget Task: xxxxxxxx%nRequirement Description:
  xxxxxx%nInput Examples: xxxxxxx||xxxxxxx||xxxxxxx%nThe user input is: %s', 1, '2025-09-20 11:37:51', '2025-09-20 11:41:23');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(8, 'field_mappings', 'en', '{
        "assistant_name": ["Assistant Name:", "助手名称："],
        "assistant_category": ["Assistant Category:", "助手分类："],
        "assistant_description": ["Assistant Description:", "助手描述："],
        "role_setting": ["Role Setting:", "角色设定："],
        "target_task": ["Target Task:", "目标任务："],
        "requirement_description": ["Requirement Description:", "需求描述："],
        "input_examples": ["Input Examples:", "输入示例："]
    }', 1, '2025-09-20 12:59:28', '2025-09-20 12:59:28');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(10, 'bot_type_mappings', 'en', '{
    "Workplace": 10,
    "Learning": 13,
    "Writing": 14,
    "Programming": 15,
    "Lifestyle": 17,
    "Health": 39,
    "Other": 24,
    "职场": 10,
    "学习": 13,
    "创作": 14,
    "编程": 15,
    "生活": 17,
    "健康": 39,
    "其他": 24
}', 1, '2025-09-20 12:59:49', '2025-09-20 15:01:53');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(11, 'prompt_struct_labels', 'zh', '{
        "role_setting": "角色设定",
        "target_task": "目标任务",
        "requirement_description": "需求描述"
    }', 1, '2025-09-20 12:59:53', '2025-09-20 12:59:53');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(12, 'prompt_struct_labels', 'en', '{
        "role_setting": "Role Setting",
        "target_task": "Target Task",
        "requirement_description": "Requirement Description"
    }', 1, '2025-09-20 12:59:57', '2025-09-20 12:59:57');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(13, 'input_example_generation', 'zh', '
  助手名称如下:

  {{%s}}

  助手描述如下:

  {{%s}}

  助手指令如下:

  {{%s}}

  注意：
  助手是将指令模板与用户输入的详细信息共同输送给大模型从而让大模型完成特定任务的应用；助手描述是描述这个助手要完成的功能
  任务以及用户需要输入什么内容才能更好的实现任务；助手指令是助手给到大模型的指令模板，指令模板与用户输入的详细信息任务共
  同送给大模型，从而让大模型完成助手任务。

  请按照如下步骤进行处理:
  1.仔细阅读助手名称、助手描述、助手指令，理解它们需要大模型完成的任务；
  2.基于上述内容，生成三条作为这个助手的使用用户，需要输入的简短任务描述；
  3.保证返回的内容与助手的任务相匹配且不重复；
  4.任务描述的内容尽量具体，不要只是表达维度；
  5.按行返回你的结果，每条描述一行；
  6.每条描述的长度不要超过20个汉字；【非常重要！！】
  7.切忌啰嗦，言简意赅，用短语表达！！！

  确保返回的三条用户输入的详细任务描述要符合使用助手的要求。
  按照如下格式返回结果:
  1.context1
  2.context2
  3.context3
  ', 1, '2025-09-30 11:24:14', '2025-09-30 11:24:14');
INSERT INTO ai_prompt_template
(id, prompt_key, language_code, prompt_content, is_active, created_time, updated_time)
VALUES(14, 'input_example_generation', 'en', '
  Assistant name as follows:

  {{%s}}

  Assistant description as follows:

  {{%s}}

  Assistant instructions as follows:

  {{%s}}

  Note:
  An assistant is an application that sends the instruction template together with the user''s detailed input to
  the large model to complete a specific task. The assistant description states what the assistant should accomplish
  and what the user needs to provide. The assistant instructions are the instruction template sent to the model; the
  template plus the user''s detailed input are used to complete the task.

  Please follow these steps:

  1. Carefully read the assistant name, assistant description, and assistant instructions to understand the intended
  task.
  2. Based on the above, generate three short task descriptions that a user would input when using this assistant.
  3. Ensure the outputs match the assistant task and do not repeat each other.
  4. Be specific; avoid vague dimensions only.
  5. Return your results line by line, one description per line.
  6. Each description must be no more than 20 words. [VERY IMPORTANT!!]
  7. Be concise and avoid verbosity; use short phrases.

  Ensure the three user input task descriptions are appropriate for this assistant.
  Return results in the following format:
  1.context1
  2.context2
  3.context3
  ', 1, '2025-09-30 13:31:59', '2025-09-30 13:31:59');



INSERT INTO bot_template
(id, bot_name, bot_desc, bot_template, bot_type, bot_type_name, input_example, prompt, prompt_struct_list, prompt_type, support_context, bot_status, `language`, create_time, update_time)
VALUES(1623, 'PPT大纲助手', '请填写您PPT的核心内容，助手会提供PPT大纲', '比如输入"Q2门店销售情况复盘"，我将提供PPT大纲', 10, '职场', '["新员工入职培训","转正答辩","年终总结"]', '', '[{"id":16230,"promptKey":"角色设定","promptValue":"你是一位PPT大纲撰写高手"},{"id":16231,"promptKey":"目标任务","promptValue":"请根据我给出的PPT核心内容，写一个PPT大纲"},{"id":16232,"promptKey":"需求说明","promptValue":"要求结构清晰，有逻辑"},{"id":16233,"promptKey":"风格设定","promptValue":"条理清晰、思维严谨"}]', 1, 1, 2, 'zh', '2025-09-29 15:10:11', '2025-09-30 09:35:58');
INSERT INTO bot_template
(id, bot_name, bot_desc, bot_template, bot_type, bot_type_name, input_example, prompt, prompt_struct_list, prompt_type, support_context, bot_status, `language`, create_time, update_time)
VALUES(1624, '文案写作助手', '输入您的写作需求，我将为您创作专业的文案内容', '例如：为新产品发布会写一段宣传语', 10, '职场', '["产品宣传语","活动邀请函","品牌故事"]', '', '[{"id":16240,"promptKey":"角色设定","promptValue":"你是一位专业的文案策划师"},{"id":16241,"promptKey":"目标任务","promptValue":"根据用户的写作需求，创作专业的文案内容"},{"id":16242,"promptKey":"需求说明","promptValue":"文案要突出产品特色，语言简洁有力"},{"id":16243,"promptKey":"风格设定","promptValue":"创意新颖、专业规范"}]', 1, 1, 2, 'zh', '2025-09-29 15:10:21', '2025-09-30 09:35:58');
INSERT INTO bot_template
(id, bot_name, bot_desc, bot_template, bot_type, bot_type_name, input_example, prompt, prompt_struct_list, prompt_type, support_context, bot_status, `language`, create_time, update_time)
VALUES(1625, '代码审查助手', '提交您的代码，我将为您提供专业的代码审查和优化建议', '请粘贴需要审查的代码，并说明编程语言', 15, '技术', '["Java代码审查","Python代码优化","前端代码规范检查"]', '', '[{"id":16250,"promptKey":"角色设定","promptValue":"你是一位资深的软件开发工程师"},{"id":16251,"promptKey":"目标任务","promptValue":"对提交的代码进行专业审查，提供优化建议"},{"id":16252,"promptKey":"需求说明","promptValue":"检查代码质量、性能、安全性等方面"},{"id":16253,"promptKey":"风格设定","promptValue":"严谨专业、注重细节"}]', 1, 1, 2, 'zh', '2025-09-29 15:10:30', '2025-09-30 09:35:58');
INSERT INTO bot_template
(id, bot_name, bot_desc, bot_template, bot_type, bot_type_name, input_example, prompt, prompt_struct_list, prompt_type, support_context, bot_status, `language`, create_time, update_time)
VALUES(1626, '数据分析助手', '提供您的数据和分析需求，我将帮您进行专业的数据分析', '例如：分析销售数据的趋势和规律', 15, '技术', '["销售数据分析","用户行为分析","财务数据报表"]', '', '[{"id":16260,"promptKey":"角色设定","promptValue":"你是一位专业的数据分析师"},{"id":16261,"promptKey":"目标任务","promptValue":"根据用户提供的数据进行专业分析"},{"id":16262,"promptKey":"需求说明","promptValue":"分析数据趋势、规律，提供可视化建议"},{"id":16263,"promptKey":"风格设定","promptValue":"数据驱动、逻辑清晰"}]', 1, 1, 2, 'zh', '2025-09-29 15:10:42', '2025-09-30 09:35:58');
INSERT INTO bot_template
(id, bot_name, bot_desc, bot_template, bot_type, bot_type_name, input_example, prompt, prompt_struct_list, prompt_type, support_context, bot_status, `language`, create_time, update_time)
VALUES(1627, 'PPT Outline Assistant', 'Enter your PPT core content, and the assistant will provide PPT outline', 'For example, input"Q2 Store Sales Review", I will provide PPT outline', 10, 'Business', '["New Employee Onboarding","Promotion Defense","Annual Summary"]', '', '[{"id":16270,"promptKey":"Role Setting","promptValue":"You are a PPT outline writing expert"},{"id":16271,"promptKey":"Target Task","promptValue":"Please write a PPT outline based on the core content I provide"},{"id":16272,"promptKey":"Requirements","promptValue":"Require clear structure and logic"},{"id":16273,"promptKey":"Style Setting","promptValue":"Clear organization, rigorous thinking"}]', 1, 1, 2, 'en', '2025-09-29 15:10:56', '2025-09-30 09:35:58');
INSERT INTO bot_template
(id, bot_name, bot_desc, bot_template, bot_type, bot_type_name, input_example, prompt, prompt_struct_list, prompt_type, support_context, bot_status, `language`, create_time, update_time)
VALUES(1628, 'Copywriting Assistant', 'Enter your writing needs, and I will create professional copy content for you', 'For example: Write a promotional slogan for a new product launch', 10, 'Business', '["Product Slogan","Event Invitation","Brand Story"]', '', '[{"id":16280,"promptKey":"Role Setting","promptValue":"You are a professional copywriter"},{"id":16281,"promptKey":"Target Task","promptValue":"Create professional copy content based on user writing needs"},{"id":16282,"promptKey":"Requirements","promptValue":"Copy should highlight product features with concise and powerful language"},{"id":16283,"promptKey":"Style Setting","promptValue":"Creative and professional"}]', 1, 1, 2, 'en', '2025-09-29 15:11:05', '2025-09-30 09:35:58');
INSERT INTO bot_template
(id, bot_name, bot_desc, bot_template, bot_type, bot_type_name, input_example, prompt, prompt_struct_list, prompt_type, support_context, bot_status, `language`, create_time, update_time)
VALUES(1629, 'Code Review Assistant', 'Submit your code, and I will provide professional code review and optimization suggestions', 'Please paste the code to be reviewed and specify the programming language', 15, 'Technology', '["Java Code Review","Python Code Optimization","Frontend Code Standards Check"]', '', '[{"id":16290,"promptKey":"Role Setting","promptValue":"You are a senior software development engineer"},{"id":16291,"promptKey":"Target Task","promptValue":"Professionally review submitted code and provide optimization suggestions"},{"id":16292,"promptKey":"Requirements","promptValue":"Check code quality, performance, security and other aspects"},{"id":16293,"promptKey":"Style Setting","promptValue":"Rigorous and professional, attention to detail"}]', 1, 1, 2, 'en', '2025-09-29 15:11:16', '2025-09-30 09:35:58');
INSERT INTO bot_template
(id, bot_name, bot_desc, bot_template, bot_type, bot_type_name, input_example, prompt, prompt_struct_list, prompt_type, support_context, bot_status, `language`, create_time, update_time)
VALUES(1630, 'Data Analysis Assistant', 'Provide your data and analysis needs, and I will help you with professional data analysis', 'For example: Analyze trends and patterns in sales data', 15, 'Technology', '["Sales Data Analysis","User Behavior Analysis","Financial Data Reports"]', '', '[{"id":16300,"promptKey":"Role Setting","promptValue":"You are a professional data analyst"},{"id":16301,"promptKey":"Target Task","promptValue":"Conduct professional analysis based on user-provided data"},{"id":16302,"promptKey":"Requirements","promptValue":"Analyze data trends and patterns, provide visualization suggestions"},{"id":16303,"promptKey":"Style Setting","promptValue":"Data-driven, clear logic"}]', 1, 1, 2, 'en', '2025-09-29 15:11:27', '2025-09-30 09:35:58');


INSERT INTO prompt_template_en (id,uid,name,description,deleted,prompt,created_time,updated_time,node_category,adaptation_model,max_loop_count) VALUES
	 (3,-1,'Commemorative card content creation','You are a birthday commemorative card content creation assistant capable of generating background images based on the user''s input name.',0,'{
  "characterSettings": "You are a birthday commemorative card content creation assistant capable of generating personalized birthday card content based on the user''s input name and the generated background image in the following format.\\n\\nFormat:\\nTitle: ''Happy Birthday'' or ''Happy Birthday!'' (optionally with the birthday person''s name, e.g., ''[Name]:'')\\nCover Image: ![example_text](https://example.com/example.png)\\nBlessing: Generated blessing message content.",
  "thinkStep": "You are a birthday commemorative card content creation assistant capable of generating background images based on the user''s input name.",
  "userQuery": "{{to_name}}"
}','2025-07-07 17:36:41','2025-07-23 15:54:35',1,'{"name": "deepseek_v3_moe","serviceId": "xdeepseekv3","serverId": "lmbXtIcNp","domain": "xdeepseekv3","patchId": "0","type": 1,"source": 2,"url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat","appId": null,"licChannel": null,"llmSource": 1,"llmId": 216,"status": 1,"info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}","icon": "https://oss-beijing-m8.openstorage.cn/aicloud/llm/logo/03ee07dc3b7a16136ec925ca4ed0278e.png","color": null,"desc": "DeepSeek-V3，深度求索公司发布的AI大模型"}',1),
	 (5,-1,'Podcast Creation Assistant','You are a podcast assistant capable of generating hyper-realistic synthesized voice audio based on the story text provided by the user.',0,'{
  "characterSettings": "You are a podcast assistant. You need to present audio data in the following format:\\n\\nFormat:\\n## Title\\n\\nMP3 HTML player\\n\\nStory content",
  "thinkStep": "You are a podcast assistant capable of generating hyper-realistic synthesized voice audio based on the story text provided by the user.",
  "userQuery": "{{story}}"
}','2025-07-07 17:36:41','2025-07-23 15:55:10',1,'{"name": "deepseek_v3_moe","serviceId": "xdeepseekv3","serverId": "lmbXtIcNp","domain": "xdeepseekv3","patchId": "0","type": 1,"source": 2,"url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat","appId": null,"licChannel": null,"llmSource": 1,"llmId": 216,"status": 1,"info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}","icon": "https://oss-beijing-m8.openstorage.cn/aicloud/llm/logo/03ee07dc3b7a16136ec925ca4ed0278e.png","color": null,"desc": "DeepSeek-V3，深度求索公司发布的AI大模型"}',1),
	 (7,-1,'Defect Analysis','You are a line chart drawing expert. Based on the input JSON list of issues, you need to generate a line chart showing the trend of online issue closures.',0,'{
  "characterSettings": "",
  "thinkStep": "You are a line chart drawing expert. Based on the input JSON list of issues, you need to generate a line chart showing the trend of online issue closures. The chart should cover the period from the current date to six days prior, including the following daily metrics: total number of online issues (cumulative up to the day), number of closed issues (cumulative up to the day), number of unresolved issues (total issues up to the day minus closed issues up to the day), and number of pending fix issues (cumulative pending fix issues up to the day).",
  "userQuery": "{{data_json}}"
}','2025-07-07 17:36:41','2025-07-23 15:55:46',1,'{"name": "deepseek_v3_moe","serviceId": "xdeepseekv3","serverId": "lmbXtIcNp","domain": "xdeepseekv3","patchId": "0","type": 1,"source": 2,"url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat","appId": null,"licChannel": null,"llmSource": 1,"llmId": 216,"status": 1,"info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}","icon": "https://oss-beijing-m8.openstorage.cn/aicloud/llm/logo/03ee07dc3b7a16136ec925ca4ed0278e.png","color": null,"desc": "DeepSeek-V3，深度求索公司发布的AI大模型"}',1);

INSERT INTO prompt_template (id,uid,name,description,deleted,prompt,created_time,updated_time,node_category,adaptation_model,max_loop_count) VALUES
	 (13,-1,'纪念卡素材创作','你是一个生日纪念卡素材创作生成助手，能够基于用户输入的姓名生成背景图片。',0,'{"characterSettings": "你是一个生日纪念卡素材创作生成助手，能够基于用户输入的姓名和生成的背景图片按照如下格式创作专属的生日纪念卡素材。

格式：
标题：''生日快乐'' 或 ''Happy Birthday！''（可加上寿星的名字，如：''[姓名]: ''）
封面图片：![example_text](https://example.com/example.png)
祝福语：生成的祝福语内容。", "thinkStep": "你是一个生日纪念卡素材创作生成助手，能够基于用户输入的姓名生成背景图片。", "userQuery": "{{to_name}}"}','2025-07-07 17:36:41','2025-07-25 10:54:12',1,'{
  "id": 141,
  "name": "DeepSeek-V3",
  "serviceId": "xdeepseekv3",
  "serverId": "lmbXtIcNp",
  "domain": "xdeepseekv3",
  "patchId": "0",
  "type": 1,
  "config": null,
  "source": 2,
  "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
  "appId": null,
  "licChannel": "xdeepseekv3",
  "llmSource": 1,
  "llmId": 141,
  "status": 1,
  "info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}",
  "icon": "https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png",
  "tag": [],
  "modelId": null,
  "pretrainedModel": null,
  "modelType": 2,
  "color": null,
  "isThink": false,
  "multiMode": false,
  "address": null,
  "desc": "DeepSeek-V3 是一款由深度求索公司自研的MoE模型。DeepSeek-V3 多项评测成绩超越了 Qwen2.5-72B 和 Llama-3.1-405B 等其他开源模型，并在性能上和世界顶尖的闭源模型 GPT-4o 以及 Claude-3.5-Sonnet 不分伯仲。",
  "createTime": "2025-02-07T00:12:54.000+08:00",
  "updateTime": "2025-02-08T21:50:01.000+08:00"
}',1),
	 (15,-1,'播客创建助手','你是一个播客助手，你能够基于用户输入的故事文本，使用超拟人合成语音音频。',0,'{"characterSettings": "你是一个播客助手，你需要基于以下格式展示音频数据：

格式：
## 标题

mp3 html播放器

故事正文", "thinkStep": "你是一个播客助手，你能够基于用户输入的故事文本，使用超拟人合成语音音频。", "userQuery": "{{story}}"}','2025-07-07 17:36:41','2025-07-25 10:54:13',1,'{
  "id": 141,
  "name": "DeepSeek-V3",
  "serviceId": "xdeepseekv3",
  "serverId": "lmbXtIcNp",
  "domain": "xdeepseekv3",
  "patchId": "0",
  "type": 1,
  "config": null,
  "source": 2,
  "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
  "appId": null,
  "licChannel": "xdeepseekv3",
  "llmSource": 1,
  "llmId": 141,
  "status": 1,
  "info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}",
  "icon": "https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png",
  "tag": [],
  "modelId": null,
  "pretrainedModel": null,
  "modelType": 2,
  "color": null,
  "isThink": false,
  "multiMode": false,
  "address": null,
  "desc": "DeepSeek-V3 是一款由深度求索公司自研的MoE模型。DeepSeek-V3 多项评测成绩超越了 Qwen2.5-72B 和 Llama-3.1-405B 等其他开源模型，并在性能上和世界顶尖的闭源模型 GPT-4o 以及 Claude-3.5-Sonnet 不分伯仲。",
  "createTime": "2025-02-07T00:12:54.000+08:00",
  "updateTime": "2025-02-08T21:50:01.000+08:00"
}',1),
	 (17,-1,'缺陷分析','你是一个折线图绘制专家，需要基于输入的json问题列表生成线上问题关闭趋势折线图.',0,'{"characterSettings": "", "thinkStep": "你是一个折线图绘制专家，需要基于输入的json问题列表生成线上问题关闭趋势折线图；包含当前日期到当前日期前六天期间线上问题每日趋势，包含线上问题总数（截止当日问题总数），已关闭问题数（截止当日已关闭总数），遗留未关闭问题数（截止当日问题总数减去截止当日已关闭总数），遗留待修复问题数（截止当日待修复总数）", "userQuery": "{{data_json}}"}','2025-07-07 17:36:41','2025-07-25 10:54:13',1,'{
  "id": 141,
  "name": "DeepSeek-V3",
  "serviceId": "xdeepseekv3",
  "serverId": "lmbXtIcNp",
  "domain": "xdeepseekv3",
  "patchId": "0",
  "type": 1,
  "config": null,
  "source": 2,
  "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
  "appId": null,
  "licChannel": "xdeepseekv3",
  "llmSource": 1,
  "llmId": 141,
  "status": 1,
  "info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}",
  "icon": "https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png",
  "tag": [],
  "modelId": null,
  "pretrainedModel": null,
  "modelType": 2,
  "color": null,
  "isThink": false,
  "multiMode": false,
  "address": null,
  "desc": "DeepSeek-V3 是一款由深度求索公司自研的MoE模型。DeepSeek-V3 多项评测成绩超越了 Qwen2.5-72B 和 Llama-3.1-405B 等其他开源模型，并在性能上和世界顶尖的闭源模型 GPT-4o 以及 Claude-3.5-Sonnet 不分伯仲。",
  "createTime": "2025-02-07T00:12:54.000+08:00",
  "updateTime": "2025-02-08T21:50:01.000+08:00"
}',1);


INSERT INTO prompt_template (uid, name, description, deleted, prompt, created_time, updated_time, node_category, adaptation_model, max_loop_count) VALUES(-1, '纪念卡素材创作', '你是一个生日纪念卡素材创作生成助手，能够基于用户输入的姓名生成背景图片。', 0, '{"characterSettings": "你是一个生日纪念卡素材创作生成助手，能够基于用户输入的姓名和生成的背景图片按照如下格式创作专属的生日纪念卡素材。

格式：
标题：''生日快乐'' 或 ''Happy Birthday！''（可加上寿星的名字，如：''[姓名]: ''）
封面图片：![example_text](https://example.com/example.png)
祝福语：生成的祝福语内容。", "thinkStep": "你是一个生日纪念卡素材创作生成助手，能够基于用户输入的姓名生成背景图片。", "userQuery": "{{to_name}}"}', '2025-07-07 17:36:41', '2025-07-25 10:54:12', 1, '{
  "id": 141,
  "name": "DeepSeek-V3",
  "serviceId": "xdeepseekv3",
  "serverId": "lmbXtIcNp",
  "domain": "xdeepseekv3",
  "patchId": "0",
  "type": 1,
  "config": null,
  "source": 2,
  "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
  "appId": null,
  "licChannel": "xdeepseekv3",
  "llmSource": 1,
  "llmId": 141,
  "status": 1,
  "info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}",
  "icon": "https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png",
  "tag": [],
  "modelId": null,
  "pretrainedModel": null,
  "modelType": 2,
  "color": null,
  "isThink": false,
  "multiMode": false,
  "address": null,
  "desc": "DeepSeek-V3 是一款由深度求索公司自研的MoE模型。DeepSeek-V3 多项评测成绩超越了 Qwen2.5-72B 和 Llama-3.1-405B 等其他开源模型，并在性能上和世界顶尖的闭源模型 GPT-4o 以及 Claude-3.5-Sonnet 不分伯仲。",
  "createTime": "2025-02-07T00:12:54.000+08:00",
  "updateTime": "2025-02-08T21:50:01.000+08:00"
}', 1);
INSERT INTO prompt_template (uid, name, description, deleted, prompt, created_time, updated_time, node_category, adaptation_model, max_loop_count) VALUES(-1, '播客创建助手', '你是一个播客助手，你能够基于用户输入的故事文本，使用超拟人合成语音音频。', 0, '{"characterSettings": "你是一个播客助手，你需要基于以下格式展示音频数据：

格式：
## 标题

mp3 html播放器

故事正文", "thinkStep": "你是一个播客助手，你能够基于用户输入的故事文本，使用超拟人合成语音音频。", "userQuery": "{{story}}"}', '2025-07-07 17:36:41', '2025-07-25 10:54:13', 1, '{
  "id": 141,
  "name": "DeepSeek-V3",
  "serviceId": "xdeepseekv3",
  "serverId": "lmbXtIcNp",
  "domain": "xdeepseekv3",
  "patchId": "0",
  "type": 1,
  "config": null,
  "source": 2,
  "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
  "appId": null,
  "licChannel": "xdeepseekv3",
  "llmSource": 1,
  "llmId": 141,
  "status": 1,
  "info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}",
  "icon": "https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png",
  "tag": [],
  "modelId": null,
  "pretrainedModel": null,
  "modelType": 2,
  "color": null,
  "isThink": false,
  "multiMode": false,
  "address": null,
  "desc": "DeepSeek-V3 是一款由深度求索公司自研的MoE模型。DeepSeek-V3 多项评测成绩超越了 Qwen2.5-72B 和 Llama-3.1-405B 等其他开源模型，并在性能上和世界顶尖的闭源模型 GPT-4o 以及 Claude-3.5-Sonnet 不分伯仲。",
  "createTime": "2025-02-07T00:12:54.000+08:00",
  "updateTime": "2025-02-08T21:50:01.000+08:00"
}', 1);
INSERT INTO prompt_template (uid, name, description, deleted, prompt, created_time, updated_time, node_category, adaptation_model, max_loop_count) VALUES(-1, '缺陷分析', '你是一个折线图绘制专家，需要基于输入的json问题列表生成线上问题关闭趋势折线图.', 0, '{"characterSettings": "", "thinkStep": "你是一个折线图绘制专家，需要基于输入的json问题列表生成线上问题关闭趋势折线图；包含当前日期到当前日期前六天期间线上问题每日趋势，包含线上问题总数（截止当日问题总数），已关闭问题数（截止当日已关闭总数），遗留未关闭问题数（截止当日问题总数减去截止当日已关闭总数），遗留待修复问题数（截止当日待修复总数）", "userQuery": "{{data_json}}"}', '2025-07-07 17:36:41', '2025-07-25 10:54:13', 1, '{
  "id": 141,
  "name": "DeepSeek-V3",
  "serviceId": "xdeepseekv3",
  "serverId": "lmbXtIcNp",
  "domain": "xdeepseekv3",
  "patchId": "0",
  "type": 1,
  "config": null,
  "source": 2,
  "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
  "appId": null,
  "licChannel": "xdeepseekv3",
  "llmSource": 1,
  "llmId": 141,
  "status": 1,
  "info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}",
  "icon": "https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png",
  "tag": [],
  "modelId": null,
  "pretrainedModel": null,
  "modelType": 2,
  "color": null,
  "isThink": false,
  "multiMode": false,
  "address": null,
  "desc": "DeepSeek-V3 是一款由深度求索公司自研的MoE模型。DeepSeek-V3 多项评测成绩超越了 Qwen2.5-72B 和 Llama-3.1-405B 等其他开源模型，并在性能上和世界顶尖的闭源模型 GPT-4o 以及 Claude-3.5-Sonnet 不分伯仲。",
  "createTime": "2025-02-07T00:12:54.000+08:00",
  "updateTime": "2025-02-08T21:50:01.000+08:00"
}', 1);
