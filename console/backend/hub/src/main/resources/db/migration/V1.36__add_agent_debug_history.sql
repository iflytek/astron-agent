CREATE TABLE IF NOT EXISTS `agent_debug_session` (
  `id` varchar(64) NOT NULL COMMENT 'Session ID',
  `bot_id` int NOT NULL COMMENT 'Bot ID',
  `uid` varchar(128) NOT NULL COMMENT 'User ID',
  `space_id` bigint DEFAULT NULL COMMENT 'Space ID',
  `title` varchar(255) DEFAULT NULL COMMENT 'Session title',
  `message_count` int NOT NULL DEFAULT 0 COMMENT 'Message count',
  `is_delete` tinyint NOT NULL DEFAULT 0 COMMENT 'Deletion status: 0 not deleted, 1 deleted',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
  PRIMARY KEY (`id`),
  KEY `idx_agent_debug_session_bot_uid` (`bot_id`, `uid`, `is_delete`, `update_time`),
  KEY `idx_agent_debug_session_space` (`space_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Agent debug sessions';

CREATE TABLE IF NOT EXISTS `agent_debug_message` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `session_id` varchar(64) NOT NULL COMMENT 'Session ID',
  `message_index` int NOT NULL COMMENT 'Message order in session',
  `message_json` longtext NOT NULL COMMENT 'Serialized message JSON',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_agent_debug_message_order` (`session_id`, `message_index`),
  KEY `idx_agent_debug_message_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Agent debug messages';
