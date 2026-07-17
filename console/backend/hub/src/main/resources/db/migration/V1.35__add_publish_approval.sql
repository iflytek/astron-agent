CREATE TABLE IF NOT EXISTS `publish_approval`
(
    `id`                bigint       NOT NULL AUTO_INCREMENT,
    `space_id`          bigint       NOT NULL COMMENT 'Space ID',
    `space_type`        tinyint      DEFAULT NULL COMMENT 'Space type',
    `resource_type`     varchar(32)  NOT NULL COMMENT 'BOT or WORKFLOW',
    `resource_id`       varchar(128) NOT NULL COMMENT 'Resource business ID',
    `resource_name`     varchar(255) DEFAULT NULL COMMENT 'Resource display name',
    `publish_type`      varchar(32)  NOT NULL COMMENT 'MARKET, API, MCP, WECHAT, FEISHU',
    `publish_action`    varchar(32)  NOT NULL COMMENT 'PUBLISH or OFFLINE',
    `target_id`         varchar(128) DEFAULT NULL COMMENT 'Publish target, for example appId or SQUARE',
    `target_hash`       varchar(64)  NOT NULL COMMENT 'Hash of target and key publish parameters',
    `approval_status`   varchar(32)  NOT NULL COMMENT 'PENDING, EXECUTING, APPROVED, REJECTED, CANCELED, EXECUTE_FAILED',
    `requester_uid`     varchar(128) NOT NULL COMMENT 'Requester UID',
    `reviewer_uid`      varchar(128) DEFAULT NULL COMMENT 'Reviewer UID',
    `app_owner_uid`     varchar(128) DEFAULT NULL COMMENT 'API app owner UID',
    `request_reason`    varchar(512) DEFAULT NULL COMMENT 'Requester reason',
    `review_comment`    varchar(512) DEFAULT NULL COMMENT 'Reviewer comment',
    `publish_snapshot`  json         DEFAULT NULL COMMENT 'Frozen publish snapshot',
    `execution_result`  json         DEFAULT NULL COMMENT 'Execution result after approval',
    `active_guard`      varchar(16) GENERATED ALWAYS AS (
        CASE WHEN `approval_status` IN ('PENDING', 'EXECUTING') AND `deleted` = 0 THEN 'ACTIVE' ELSE NULL END
    ) STORED COMMENT 'Generated active status guard for pending/executing approval uniqueness',
    `created_time`      datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `reviewed_time`     datetime     DEFAULT NULL COMMENT 'Review time',
    `executed_time`     datetime     DEFAULT NULL COMMENT 'Execution time',
    `updated_time`      datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `deleted`           tinyint      DEFAULT '0' COMMENT 'Deleted: 0 no, 1 yes',
    PRIMARY KEY (`id`),
    KEY `idx_publish_approval_space_status` (`space_id`, `approval_status`, `created_time`),
    KEY `idx_publish_approval_requester` (`requester_uid`, `created_time`),
    KEY `idx_publish_approval_target` (`space_id`, `resource_type`, `resource_id`, `publish_type`, `publish_action`, `target_hash`, `approval_status`, `deleted`),
    UNIQUE KEY `uk_publish_approval_active_target` (`space_id`, `resource_type`, `resource_id`, `publish_type`, `publish_action`, `target_hash`, `active_guard`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Team publish approval';
