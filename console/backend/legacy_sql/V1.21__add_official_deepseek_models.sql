INSERT INTO model_common (
    name,
    `desc`,
    intro,
    user_name,
    user_avatar,
    service_id,
    server_id,
    domain,
    lic_channel,
    llm_source,
    url,
    model_type,
    `type`,
    `source`,
    is_think,
    multi_mode,
    is_delete,
    create_by,
    update_by,
    uid,
    disclaimer,
    config,
    shelf_status,
    create_time,
    update_time
)
SELECT
    'DeepSeek-V3',
    'DeepSeek 官方通用模型，适用于日常问答、内容创作和工作流文本生成场景。',
    'DeepSeek 官方文本模型',
    'DeepSeek',
    'https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png',
    'deepseek-chat',
    'deepseek-chat',
    'deepseek-chat',
    '',
    'deepseek',
    'https://api.deepseek.com/v1/chat/completions',
    0,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    NULL,
    '',
    '[]',
    0,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM model_common WHERE service_id = 'deepseek-chat' AND is_delete = 0
);

INSERT INTO model_common (
    name,
    `desc`,
    intro,
    user_name,
    user_avatar,
    service_id,
    server_id,
    domain,
    lic_channel,
    llm_source,
    url,
    model_type,
    `type`,
    `source`,
    is_think,
    multi_mode,
    is_delete,
    create_by,
    update_by,
    uid,
    disclaimer,
    config,
    shelf_status,
    create_time,
    update_time
)
SELECT
    'DeepSeek-R1',
    'DeepSeek 官方推理模型，适用于复杂分析、逻辑推理和需要思考过程的工作流节点。',
    'DeepSeek 官方推理模型',
    'DeepSeek',
    'https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png',
    'deepseek-reasoner',
    'deepseek-reasoner',
    'deepseek-reasoner',
    '',
    'deepseek',
    'https://api.deepseek.com/v1/chat/completions',
    0,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    NULL,
    '',
    '[]',
    0,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM model_common WHERE service_id = 'deepseek-reasoner' AND is_delete = 0
);

INSERT INTO model_category_rel (model_id, category_id, create_time, update_time)
SELECT mc.id, c.id, NOW(), NOW()
FROM model_common mc
JOIN model_category c
  ON c.`key` = 'modelProvider'
 AND c.name = '深度求索'
WHERE mc.service_id IN ('deepseek-chat', 'deepseek-reasoner')
  AND NOT EXISTS (
    SELECT 1
    FROM model_category_rel rel
    WHERE rel.model_id = mc.id
      AND rel.category_id = c.id
  );

INSERT INTO model_category_rel (model_id, category_id, create_time, update_time)
SELECT mc.id, c.id, NOW(), NOW()
FROM model_common mc
JOIN model_category c
  ON c.`key` = 'modelCategory'
 AND c.name = '文本生成'
WHERE mc.service_id IN ('deepseek-chat', 'deepseek-reasoner')
  AND NOT EXISTS (
    SELECT 1
    FROM model_category_rel rel
    WHERE rel.model_id = mc.id
      AND rel.category_id = c.id
  );

INSERT INTO model_category_rel (model_id, category_id, create_time, update_time)
SELECT mc.id, c.id, NOW(), NOW()
FROM model_common mc
JOIN model_category c
  ON c.`key` = 'languageSupport'
 AND c.name = '多语言'
WHERE mc.service_id IN ('deepseek-chat', 'deepseek-reasoner')
  AND NOT EXISTS (
    SELECT 1
    FROM model_category_rel rel
    WHERE rel.model_id = mc.id
      AND rel.category_id = c.id
  );

INSERT INTO model_category_rel (model_id, category_id, create_time, update_time)
SELECT mc.id, c.id, NOW(), NOW()
FROM model_common mc
JOIN model_category c
  ON c.`key` = 'contextLengthTag'
 AND c.name = '64k'
WHERE mc.service_id IN ('deepseek-chat', 'deepseek-reasoner')
  AND NOT EXISTS (
    SELECT 1
    FROM model_category_rel rel
    WHERE rel.model_id = mc.id
      AND rel.category_id = c.id
  );

INSERT INTO model_category_rel (model_id, category_id, create_time, update_time)
SELECT mc.id, c.id, NOW(), NOW()
FROM model_common mc
JOIN model_category c
  ON c.`key` = 'modelScenario'
 AND (
    (mc.service_id = 'deepseek-chat' AND c.name = '内容创作')
    OR (mc.service_id = 'deepseek-reasoner' AND c.name = '逻辑推理')
 )
WHERE mc.service_id IN ('deepseek-chat', 'deepseek-reasoner')
  AND NOT EXISTS (
    SELECT 1
    FROM model_category_rel rel
    WHERE rel.model_id = mc.id
      AND rel.category_id = c.id
  );
