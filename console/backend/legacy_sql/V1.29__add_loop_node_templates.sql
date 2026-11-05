-- Add workflow Loop and Exit Loop node templates.

INSERT INTO config_info (
    category, code, name, value, is_valid, remarks, create_time, update_time, order_no
)
SELECT category, '1,2', '逻辑',
       JSON_OBJECT(
           'idType', 'loop',
           'nodeType', '基础节点',
           'aliasName', '循环',
           'description', '状态循环节点：上一轮输出可作为下一轮输入，按条件、次数或退出循环节点停止',
           'data', JSON_OBJECT(
               'nodeMeta', JSON_OBJECT('nodeType', '基础节点', 'aliasName', '循环'),
               'nodeParam', JSON_OBJECT(
                   'maxLoopCount', 10,
                   'loopVariables', JSON_ARRAY(JSON_OBJECT(
                       'id', '',
                       'name', 'loop_value',
                       'schema', JSON_OBJECT('type', 'string'),
                       'value', JSON_OBJECT('type', 'literal', 'content', '')
                   )),
                   'termination', JSON_OBJECT(
                       'logicalOperator', 'and',
                       'conditions', JSON_ARRAY()
                   )
               ),
               'inputs', JSON_ARRAY(),
               'outputs', JSON_ARRAY(JSON_OBJECT(
                   'id', '',
                   'name', 'loop_value',
                   'schema', JSON_OBJECT('type', 'string')
               )),
               'references', JSON_ARRAY(),
               'allowInputReference', true,
               'allowOutputReference', true,
               'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png'
           )
       ),
       1, '循环', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 12
FROM (
    SELECT 'WORKFLOW_NODE_TEMPLATE' AS category
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_PRE'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER_PRE'
) categories;

INSERT INTO config_info (
    category, code, name, value, is_valid, remarks, create_time, update_time, order_no
)
SELECT category, '1,2', '逻辑',
       JSON_OBJECT(
           'idType', 'loop-exit',
           'nodeType', '基础节点',
           'aliasName', '退出循环',
           'description', '在循环子画布中立即结束当前循环，并返回当前循环变量',
           'data', JSON_OBJECT(
               'nodeMeta', JSON_OBJECT('nodeType', '基础节点', 'aliasName', '退出循环'),
               'nodeParam', JSON_OBJECT(),
               'inputs', JSON_ARRAY(JSON_OBJECT(
                   'id', '',
                   'name', 'loop_value',
                   'schema', JSON_OBJECT(
                       'type', 'string',
                       'value', JSON_OBJECT('type', 'ref', 'content', JSON_OBJECT())
                   )
               )),
               'outputs', JSON_ARRAY(),
               'references', JSON_ARRAY(),
               'allowInputReference', true,
               'allowOutputReference', false,
               'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png'
           )
       ),
       1, '退出循环', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 13
FROM (
    SELECT 'WORKFLOW_NODE_TEMPLATE' AS category
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_PRE'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER_PRE'
) categories;

INSERT INTO config_info_en (
    category, code, name, value, is_valid, remarks, create_time, update_time, order_no
)
SELECT category, '1,2', 'Logic',
       JSON_OBJECT(
           'idType', 'loop',
           'nodeType', 'Basic Node',
           'aliasName', 'Loop',
           'description', 'Stateful loop node: each round can feed outputs into the next round and stops by condition, count, or Exit Loop',
           'data', JSON_OBJECT(
               'nodeMeta', JSON_OBJECT('nodeType', 'Basic Node', 'aliasName', 'Loop'),
               'nodeParam', JSON_OBJECT(
                   'maxLoopCount', 10,
                   'loopVariables', JSON_ARRAY(JSON_OBJECT(
                       'id', '',
                       'name', 'loop_value',
                       'schema', JSON_OBJECT('type', 'string'),
                       'value', JSON_OBJECT('type', 'literal', 'content', '')
                   )),
                   'termination', JSON_OBJECT(
                       'logicalOperator', 'and',
                       'conditions', JSON_ARRAY()
                   )
               ),
               'inputs', JSON_ARRAY(),
               'outputs', JSON_ARRAY(JSON_OBJECT(
                   'id', '',
                   'name', 'loop_value',
                   'schema', JSON_OBJECT('type', 'string')
               )),
               'references', JSON_ARRAY(),
               'allowInputReference', true,
               'allowOutputReference', true,
               'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png'
           )
       ),
       1, 'Loop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 12
FROM (
    SELECT 'WORKFLOW_NODE_TEMPLATE' AS category
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_PRE'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER'
    UNION ALL SELECT 'WORKFLOW_NODE_TEMPLATE_INNER_PRE'
) categories;

INSERT INTO config_info_en (
    category, code, name, value, is_valid, remarks, create_time, update_time, order_no
)
SELECT category, '1,2', 'Logic',
       JSON_OBJECT(
           'idType', 'loop-exit',
           'nodeType', 'Basic Node',
           'aliasName', 'Exit Loop',
           'description', 'Stops the current loop immediately inside a loop sub-canvas and returns current loop variables',
           'data', JSON_OBJECT(
               'nodeMeta', JSON_OBJECT('nodeType', 'Basic Node', 'aliasName', 'Exit Loop'),
               'nodeParam', JSON_OBJECT(),
               'inputs', JSON_ARRAY(JSON_OBJECT(
                   'id', '',
                   'name', 'loop_value',
                   'schema', JSON_OBJECT(
                       'type', 'string',
                       'value', JSON_OBJECT('type', 'ref', 'content', JSON_OBJECT())
                   )
               )),
               'outputs', JSON_ARRAY(),
               'references', JSON_ARRAY(),
               'allowInputReference', true,
               'allowOutputReference', false,
               'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png'
           )
       ),
       1, 'Exit Loop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 13
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
        'idType', 'loop',
        'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png',
        'name', '循环',
        'markdown', '## 用途\n状态循环节点。每轮执行子画布，子画布末尾输出会更新同名循环变量，下一轮继续使用更新后的值。支持终止条件、最大循环次数和退出循环节点。\n\n## 输出\n输出最后一轮循环变量。'
    ),
    '$',
    JSON_OBJECT(
        'idType', 'loop-exit',
        'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png',
        'name', '退出循环',
        'markdown', '## 用途\n只能在循环子画布中使用。执行到该节点时立即结束循环，并返回当前循环变量。'
    )
)
WHERE category = 'TEMPLATE' AND code = 'node';

UPDATE config_info_en
SET value = JSON_ARRAY_APPEND(
    value,
    '$',
    JSON_OBJECT(
        'idType', 'loop',
        'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png',
        'name', 'Loop',
        'markdown', '## Purpose\nA stateful loop node. It runs the child canvas once per round, updates loop variables from same-named child outputs, and uses the updated values in the next round. Supports termination conditions, max loop count, and Exit Loop.\n\n## Output\nReturns the final loop variables.'
    ),
    '$',
    JSON_OBJECT(
        'idType', 'loop-exit',
        'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png',
        'name', 'Exit Loop',
        'markdown', '## Purpose\nCan only be used inside a Loop sub-canvas. When executed, it stops the loop immediately and returns current loop variables.'
    )
)
WHERE category = 'TEMPLATE' AND code = 'node';
