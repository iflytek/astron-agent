CREATE TABLE `exported_workflow_template`
(
    `id`                 bigint                                                        NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `title`              varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Template name',
    `subtitle`           varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Template description',
    `cover_url`          varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Template cover URL',
    `group_id`           bigint                                                         DEFAULT NULL COMMENT 'Template category group',
    `source_workflow_id` bigint                                                        NOT NULL COMMENT 'Source workflow ID',
    `snapshot_yaml`      mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci   NOT NULL COMMENT 'Workflow snapshot YAML',
    `creator_uid`        varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Template creator UID',
    `space_id`           bigint                                                         DEFAULT NULL COMMENT 'Space ID',
    `is_delete`          tinyint                                                        NOT NULL DEFAULT '0' COMMENT 'Soft delete flag',
    `create_time`        datetime                                                       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`        datetime                                                       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY `idx_exported_workflow_template_space_group` (`space_id`, `group_id`, `is_delete`),
    KEY `idx_exported_workflow_template_creator` (`creator_uid`, `space_id`, `is_delete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User exported workflow templates';
