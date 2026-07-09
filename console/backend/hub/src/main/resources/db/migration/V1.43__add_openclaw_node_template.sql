-- Add OpenClaw / ChatClaw workflow node templates.

INSERT INTO config_info (
    category, code, name, value, is_valid, remarks, create_time, update_time, order_no
)
SELECT category, '1,2', '工具',
       JSON_OBJECT(
           'idType', 'openclaw',
           'nodeType', '工具',
           'aliasName', 'OpenClaw',
           'description', '通过拖拽式画布配置 OpenClaw / ChatClaw Skill，支持应用构建和可视化微调参数。',
           'data', JSON_OBJECT(
               'nodeMeta', JSON_OBJECT('nodeType', '工具节点', 'aliasName', 'OpenClaw'),
               'nodeParam', JSON_OBJECT(
                   'mcpServerId', '',
                   'mcpServerUrl', '',
                   'toolName', 'run_skill',
                   'skillName', 'chatclaw-builder',
                   'executionMode', 'chatclaw',
                   'preCondition', '',
                   'postCondition', '',
                   'tuningParams', JSON_OBJECT(
                       'temperature', 0.2,
                       'max_steps', 8
                   )
               ),
               'inputs', JSON_ARRAY(
                   JSON_OBJECT(
                       'id', '',
                       'name', 'instruction',
                       'required', true,
                       'schema', JSON_OBJECT(
                           'type', 'string',
                           'default', '用户对 ChatClaw 应用的构建或微调需求',
                           'value', JSON_OBJECT('type', 'ref', 'content', JSON_OBJECT())
                       )
                   ),
                   JSON_OBJECT(
                       'id', '',
                       'name', 'context',
                       'required', false,
                       'schema', JSON_OBJECT(
                           'type', 'object',
                           'default', '应用上下文、领域知识或已有配置',
                           'value', JSON_OBJECT('type', 'ref', 'content', JSON_OBJECT())
                       )
                   )
               ),
               'outputs', JSON_ARRAY(JSON_OBJECT(
                   'id', '',
                   'name', 'result',
                   'schema', JSON_OBJECT(
                       'type', 'object',
                       'default', 'OpenClaw Skill 执行结果',
                       'properties', JSON_ARRAY(
                           JSON_OBJECT('id', '', 'name', 'application', 'type', 'object', 'default', 'ChatClaw 应用配置', 'required', false, 'nameErrMsg', ''),
                           JSON_OBJECT('id', '', 'name', 'workflow', 'type', 'object', 'default', '生成或微调后的工作流配置', 'required', false, 'nameErrMsg', ''),
                           JSON_OBJECT('id', '', 'name', 'message', 'type', 'string', 'default', '执行摘要', 'required', false, 'nameErrMsg', '')
                       )
                   ),
                   'required', false,
                   'nameErrMsg', ''
               )),
               'references', JSON_ARRAY(),
               'allowInputReference', true,
               'allowOutputReference', true,
               'icon', 'https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/mcp-new.png'
           )
       ),
       1, 'OpenClaw', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 12
FROM (
    SELECT 'WORKFLOW_NODE_TEMPLATE' AS category
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_PRE'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER_PRE'
) categories;

INSERT INTO config_info_en (
    category, code, name, value, is_valid, remarks, create_time, update_time, order_no
)
SELECT category, '1,2', 'Tools',
       JSON_OBJECT(
           'idType', 'openclaw',
           'nodeType', 'Tool',
           'aliasName', 'OpenClaw',
           'description', 'Configure OpenClaw / ChatClaw skills in the drag-and-drop canvas for app building and visual fine-tuning parameters.',
           'data', JSON_OBJECT(
               'nodeMeta', JSON_OBJECT('nodeType', 'Tool Node', 'aliasName', 'OpenClaw'),
               'nodeParam', JSON_OBJECT(
                   'mcpServerId', '',
                   'mcpServerUrl', '',
                   'toolName', 'run_skill',
                   'skillName', 'chatclaw-builder',
                   'executionMode', 'chatclaw',
                   'preCondition', '',
                   'postCondition', '',
                   'tuningParams', JSON_OBJECT(
                       'temperature', 0.2,
                       'max_steps', 8
                   )
               ),
               'inputs', JSON_ARRAY(
                   JSON_OBJECT(
                       'id', '',
                       'name', 'instruction',
                       'required', true,
                       'schema', JSON_OBJECT(
                           'type', 'string',
                           'default', 'User requirement for building or fine-tuning a ChatClaw application',
                           'value', JSON_OBJECT('type', 'ref', 'content', JSON_OBJECT())
                       )
                   ),
                   JSON_OBJECT(
                       'id', '',
                       'name', 'context',
                       'required', false,
                       'schema', JSON_OBJECT(
                           'type', 'object',
                           'default', 'Application context, domain knowledge, or existing configuration',
                           'value', JSON_OBJECT('type', 'ref', 'content', JSON_OBJECT())
                       )
                   )
               ),
               'outputs', JSON_ARRAY(JSON_OBJECT(
                   'id', '',
                   'name', 'result',
                   'schema', JSON_OBJECT(
                       'type', 'object',
                       'default', 'OpenClaw skill execution result',
                       'properties', JSON_ARRAY(
                           JSON_OBJECT('id', '', 'name', 'application', 'type', 'object', 'default', 'ChatClaw application configuration', 'required', false, 'nameErrMsg', ''),
                           JSON_OBJECT('id', '', 'name', 'workflow', 'type', 'object', 'default', 'Generated or fine-tuned workflow configuration', 'required', false, 'nameErrMsg', ''),
                           JSON_OBJECT('id', '', 'name', 'message', 'type', 'string', 'default', 'Execution summary', 'required', false, 'nameErrMsg', '')
                       )
                   ),
                   'required', false,
                   'nameErrMsg', ''
               )),
               'references', JSON_ARRAY(),
               'allowInputReference', true,
               'allowOutputReference', true,
               'icon', 'https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/mcp-new.png'
           )
       ),
       1, 'OpenClaw', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 12
FROM (
    SELECT 'WORKFLOW_NODE_TEMPLATE' AS category
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_PRE'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER_PRE'
) categories;

UPDATE config_info
SET value = JSON_ARRAY_APPEND(
    value,
    '$',
    JSON_OBJECT(
        'idType', 'openclaw',
        'icon', 'https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/mcp-new.png',
        'name', 'OpenClaw',
        'markdown', '## 用途\n通过拖拽式画布配置 OpenClaw / ChatClaw Skill。节点会把画布输入和可视化配置合并为 MCP 工具参数，用于构建 ChatClaw 应用、执行 Skill 或调整微调参数。\n\n## 输入\n- instruction：用户的应用构建或微调需求。\n- context：可选的上下文、领域知识或已有应用配置。\n\n## 配置\n填写 MCP 服务地址或服务 ID、工具名、Skill 名称、执行模式、前置/后置条件和微调参数。\n\n## 输出\nresult：OpenClaw Skill 返回的应用配置、工作流配置或执行摘要。'
    )
)
WHERE category = 'TEMPLATE' AND code = 'node';

UPDATE config_info_en
SET value = JSON_ARRAY_APPEND(
    value,
    '$',
    JSON_OBJECT(
        'idType', 'openclaw',
        'icon', 'https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/mcp-new.png',
        'name', 'OpenClaw',
        'markdown', '## Purpose\nConfigure OpenClaw / ChatClaw skills in the drag-and-drop canvas. The node merges workflow inputs and visual configuration into MCP tool arguments for ChatClaw app building, skill execution, or fine-tuning adjustments.\n\n## Inputs\n- instruction: User requirement for app building or fine-tuning.\n- context: Optional context, domain knowledge, or existing app configuration.\n\n## Configuration\nSet MCP server URL or server ID, tool name, skill name, execution mode, pre/post conditions, and tuning parameters.\n\n## Output\nresult: Application configuration, workflow configuration, or execution summary returned by the OpenClaw skill.'
    )
)
WHERE category = 'TEMPLATE' AND code = 'node';
