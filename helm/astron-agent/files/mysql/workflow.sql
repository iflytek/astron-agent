CREATE DATABASE IF NOT EXISTS workflow;

USE workflow;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for app
-- ----------------------------
DROP TABLE IF EXISTS `app`;
CREATE TABLE `app` (
  `id` bigint(20) NOT NULL,
  `name` varchar(30) DEFAULT NULL,
  `alias_id` varchar(64) DEFAULT NULL COMMENT '应用标识',
  `api_key` varchar(50) NOT NULL,
  `api_secret` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_tenant` tinyint(4) DEFAULT '0' COMMENT '是否为租户app\n0: 否\n1: 是',
  `source` tinyint(4) DEFAULT '0' COMMENT '租户归属，采用二进制位权的十进制表示。如：1: 星辰平台, 2: 开放平台, 4: AIUI',
  `actual_source` tinyint(4) DEFAULT '0' COMMENT '应用实际归属',
  `plat_release_auth` tinyint(4) DEFAULT '0' COMMENT '针对租户账户，提供平台授权权限。值为source或值',
  `status` tinyint(4) DEFAULT '1' COMMENT '应用状态\n0: 禁用\n1: 启用',
  `audit_policy` tinyint(4) DEFAULT '0',
  `create_by` bigint(20) DEFAULT NULL COMMENT '创建人',
  `update_by` bigint(20) DEFAULT NULL COMMENT '更新人',
  `create_at` datetime DEFAULT NULL COMMENT '创建时间',
  `update_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `alias_id` (`alias_id`),
  KEY `idx_appid` (`alias_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='app 信息';

-- ----------------------------
-- Table structure for app_source
-- ----------------------------
DROP TABLE IF EXISTS `app_source`;
CREATE TABLE `app_source` (
  `id` bigint(20) NOT NULL,
  `source` tinyint(4) NOT NULL COMMENT '租户归属，采用二进制位权的十进制表示。如：1: 星辰平台, 2: 开放平台, 4: AIUI',
  `source_id` varchar(32) NOT NULL COMMENT '租户源ID',
  `description` varchar(16) NOT NULL,
  `create_at` datetime NOT NULL,
  `update_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for flow
-- ----------------------------
DROP TABLE IF EXISTS `flow`;
CREATE TABLE `flow` (
  `id` bigint(20) NOT NULL,
  `group_id` bigint(20) DEFAULT '0',
  `name` varchar(128) NOT NULL COMMENT '协议名称',
  `data` mediumtext COMMENT '编排标准协议',
  `release_data` mediumtext COMMENT '发布后的数据',
  `description` varchar(1024) DEFAULT NULL,
  `version` varchar(128) DEFAULT '' COMMENT '协议版本',
  `release_status` tinyint(4) DEFAULT NULL COMMENT '发布状态或值',
  `app_id` varchar(255) DEFAULT NULL COMMENT 'app_id',
  `source` tinyint(4) DEFAULT '0' COMMENT '来源',
  `tag` int(11) DEFAULT NULL COMMENT '标记工作流标签 0：无标签；1：对照组',
  `create_by` bigint(20) NOT NULL DEFAULT '0' COMMENT '创建人',
  `update_by` bigint(20) DEFAULT NULL COMMENT '更新人',
  `create_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_group_id_version` (`group_id`,`version`),
  KEY `idx_flow_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for license
-- ----------------------------
DROP TABLE IF EXISTS `license`;
CREATE TABLE `license` (
  `id` bigint(20) NOT NULL,
  `app_id` bigint(20) NOT NULL,
  `group_id` bigint(20) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '授权状态\n0: 禁用\n1: 启用',
  `create_at` datetime NOT NULL,
  `update_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lic_uk_appid_gid` (`app_id`,`group_id`),
  KEY `idx_app_id_group_id` (`app_id`,`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for workflow_node_history
-- ----------------------------
DROP TABLE IF EXISTS `workflow_node_history`;
CREATE TABLE `workflow_node_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `node_id` varchar(255) NOT NULL,
  `uid` varchar(255) DEFAULT NULL,
  `chat_id` varchar(255) DEFAULT NULL,
  `raw_question` mediumtext,
  `raw_answer` mediumtext,
  `create_time` datetime NOT NULL,
  `flow_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_id` (`chat_id`),
  KEY `node_id` (`node_id`),
  KEY `uid` (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO `workflow`.`app` (`id`, `name`, `alias_id`, `api_key`, `api_secret`, `description`, `is_tenant`, `source`, `actual_source`, `plat_release_auth`, `status`, `audit_policy`, `create_by`, `update_by`, `create_at`, `update_at`)
VALUES (1, '星辰', '680ab54f', '7b709739e8da44536127a333c7603a83', 'NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy', '星辰', 1, 1, 1, 1, 1, 0, 1, 1, '2025-09-20 14:10:48', '2025-09-20 14:10:51');

INSERT INTO `workflow`.`app_source` (`id`, `source`, `source_id`, `description`, `create_at`, `update_at`)
VALUES (1, 1, 'admin', '星辰', '2025-10-11 09:21:11', '2025-10-11 09:21:11');