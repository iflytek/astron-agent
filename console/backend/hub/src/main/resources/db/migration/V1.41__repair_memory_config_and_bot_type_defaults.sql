-- Repair deployments that already executed the early V1.40 migration before
-- delete_time and space_id normalization were added to agent_memory_config.
SET @space_id_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'agent_memory_config'
      AND column_name = 'space_id'
);
SET @sql := IF(
    @space_id_exists = 0,
    'ALTER TABLE `agent_memory_config` ADD COLUMN `space_id` bigint DEFAULT NULL COMMENT ''Space ID'' AFTER `uid`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @is_delete_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'agent_memory_config'
      AND column_name = 'is_delete'
);
SET @sql := IF(
    @is_delete_exists = 0,
    'ALTER TABLE `agent_memory_config` ADD COLUMN `is_delete` tinyint NOT NULL DEFAULT 0 COMMENT ''Deletion status: 0 not deleted, 1 deleted'' AFTER `min_score`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @delete_time_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'agent_memory_config'
      AND column_name = 'delete_time'
);
SET @sql := IF(
    @delete_time_exists = 0,
    'ALTER TABLE `agent_memory_config` ADD COLUMN `delete_time` bigint NOT NULL DEFAULT 0 COMMENT ''Deletion timestamp, 0 means active'' AFTER `is_delete`',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_unique_indexes := (
    SELECT GROUP_CONCAT(CONCAT('DROP INDEX `', `index_name`, '`') SEPARATOR ', ')
    FROM (
        SELECT DISTINCT `index_name`
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'agent_memory_config'
          AND non_unique = 0
          AND index_name <> 'PRIMARY'
    ) unique_indexes
);
SET @sql := IF(
    @drop_unique_indexes IS NOT NULL,
    CONCAT('ALTER TABLE `agent_memory_config` ', @drop_unique_indexes),
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `agent_memory_config`
SET `space_id` = 0
WHERE `space_id` IS NULL;

ALTER TABLE `agent_memory_config`
    MODIFY COLUMN `space_id` bigint NOT NULL DEFAULT 0 COMMENT 'Space ID, 0 means no space';

UPDATE `agent_memory_config`
SET `is_delete` = 0
WHERE `is_delete` IS NULL;

UPDATE `agent_memory_config` config
JOIN (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY `bot_id`, `uid`, `space_id`, `provider`
               ORDER BY `update_time` DESC, `id` DESC
           ) AS row_num
    FROM `agent_memory_config`
    WHERE `is_delete` = 0
) duplicate_config ON duplicate_config.id = config.id
SET config.`is_delete` = 1,
    config.`delete_time` = CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED) + config.`id`
WHERE duplicate_config.row_num > 1;

UPDATE `agent_memory_config`
SET `delete_time` = CAST(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS UNSIGNED) + `id`
WHERE `is_delete` <> 0
  AND `delete_time` = 0;

UPDATE `agent_memory_config`
SET `delete_time` = 0
WHERE `is_delete` = 0;

ALTER TABLE `agent_memory_config`
    ADD UNIQUE KEY `uk_agent_memory_config_scope` (`bot_id`, `uid`, `space_id`, `provider`, `delete_time`);

-- Existing agents created without a selected category were persisted as bot_type=0,
-- which makes published agents invisible in category-driven market views.
SET @default_bot_type := COALESCE((
    SELECT `type_key`
    FROM `bot_type_list`
    WHERE `show_index` = 1
      AND `is_act` = 1
      AND `type_key` > 0
    ORDER BY `order_num` ASC
    LIMIT 1
), 10);

UPDATE `chat_bot_base`
SET `bot_type` = @default_bot_type
WHERE `is_delete` = 0
  AND (`bot_type` IS NULL OR `bot_type` <= 0);

UPDATE `chat_bot_market`
SET `bot_type` = @default_bot_type
WHERE `is_delete` = 0
  AND (`bot_type` IS NULL OR `bot_type` <= 0);
