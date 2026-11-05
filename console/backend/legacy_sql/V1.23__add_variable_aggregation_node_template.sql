-- Migration to add variable aggregation node template to the database
-- Update Chinese version
UPDATE config_info
SET value = JSON_ARRAY_APPEND(
    value,
    '$',
    JSON_OBJECT(
        'idType', 'variable-aggregation',
        'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-aggregation-icon.png',
        'name', '变量聚合器',
        'markdown', '## 用途\n根据优先级和类型兼容性，从多个输入中聚合变量值，提供备用值以确保输出可靠性\n## 示例\n### 输入\n| 参数名 | 参数值 |\n|----------------|----------------------|\n| 候选变量1（引用）| 大模型-output |\n| 候选变量2（引用） | 知识库-output |\n| 候选变量3（引用）| 代码-result |\n\n### 输出\n| 变量名 | 变量值 |\n|------------|--------|\n| output（String）| 从候选变量中返回第一个有效值 |\n\n![占位图片](https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/template/node-variable-aggregation.png)'
    )
)
WHERE category = 'TEMPLATE' AND code = 'node';

-- Update English version
UPDATE config_info_en
SET value = JSON_ARRAY_APPEND(
    value,
    '$',
    JSON_OBJECT(
        'idType', 'variable-aggregation',
        'icon', 'https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-aggregation-icon.png',
        'name', 'Variable Aggregator',
        'markdown', '## Purpose\nAggregates variable values from multiple inputs based on priority and type compatibility, providing fallback values to ensure output reliability.\n\n## Example\n### Input\n| Parameter Name | Parameter Value |\n|----------------|-----------------|\n| Candidate 1 (reference) | LLM-output |\n| Candidate 2 (reference) | Knowledge Base-output |\n| Candidate 3 (reference) | Code-result |\n\n### Output\n| Variable Name | Variable Value |\n|---------------|----------------|\n| output (String) | Returns the first valid value from candidate variables |\n\n![Placeholder Image](https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/template/node-variable-aggregation.png)'
    )
)
WHERE category = 'TEMPLATE' AND code = 'node';