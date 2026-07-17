CREATE TABLE IF NOT EXISTS `skill_sandbox_config` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `uid` VARCHAR(128) NOT NULL COMMENT 'Owner user id',
    `space_id` BIGINT DEFAULT NULL COMMENT 'Current space id, null means personal space',
    `provider` VARCHAR(32) NOT NULL DEFAULT 'e2b' COMMENT 'Sandbox provider',
    `enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether sandbox execution is enabled',
    `api_key` VARCHAR(1024) DEFAULT NULL COMMENT 'Provider API key',
    `timeout_seconds` INT NOT NULL DEFAULT 60 COMMENT 'Command timeout in seconds',
    `allow_internet_access` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether sandbox internet access is allowed',
    `last_test_status` VARCHAR(32) DEFAULT NULL COMMENT 'Last connection test status',
    `last_test_message` VARCHAR(1024) DEFAULT NULL COMMENT 'Last connection test message',
    `last_test_time` DATETIME DEFAULT NULL COMMENT 'Last connection test time',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Logical deletion flag',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY `idx_skill_sandbox_scope` (`space_id`, `uid`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Skill script sandbox configuration';

CREATE TABLE IF NOT EXISTS `workflow_artifact` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `uid` VARCHAR(128) NOT NULL COMMENT 'Owner user id',
    `space_id` BIGINT DEFAULT NULL COMMENT 'Current space id, null means personal space',
    `workflow_id` BIGINT NOT NULL COMMENT 'Workflow id',
    `run_id` VARCHAR(128) DEFAULT NULL COMMENT 'Workflow run or debug session id',
    `node_id` VARCHAR(128) DEFAULT NULL COMMENT 'Source node id',
    `skill_id` VARCHAR(128) DEFAULT NULL COMMENT 'Source skill id',
    `file_name` VARCHAR(255) NOT NULL COMMENT 'Artifact file name',
    `object_key` VARCHAR(512) NOT NULL COMMENT 'OSS object key',
    `content_type` VARCHAR(128) DEFAULT NULL COMMENT 'Content type',
    `file_size` BIGINT NOT NULL DEFAULT 0 COMMENT 'File size in bytes',
    `source` VARCHAR(64) NOT NULL DEFAULT 'skill_sandbox' COMMENT 'Artifact source',
    `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Logical deletion flag',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY `idx_workflow_artifact_workflow` (`workflow_id`, `space_id`, `uid`, `deleted`),
    KEY `idx_workflow_artifact_run` (`run_id`, `node_id`, `deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Workflow runtime artifact files';
