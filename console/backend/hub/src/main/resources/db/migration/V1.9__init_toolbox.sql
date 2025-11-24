-- Migration script for init_toolbox

DROP TABLE IF EXISTS `tool_box`;
CREATE TABLE `tool_box`
(
    `id`              bigint  NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `tool_id`         varchar(30)      DEFAULT NULL COMMENT 'Core system tool identifier',
    `name`            varchar(64)      DEFAULT NULL COMMENT 'Tool name',
    `description`     varchar(255)     DEFAULT NULL COMMENT 'Tool description',
    `icon`            varchar(255)     DEFAULT NULL COMMENT 'Avatar icon',
    `user_id`         varchar(256)     DEFAULT NULL COMMENT 'User ID',
    `app_id`          varchar(60)      DEFAULT NULL COMMENT 'appid',
    `end_point`       text COMMENT 'Request address',
    `method`          varchar(255)     DEFAULT NULL COMMENT 'Request method',
    `web_schema`      longtext COMMENT 'Web protocol',
    `schema`          longtext COMMENT 'Protocol',
    `visibility`      int              DEFAULT '0' COMMENT 'Visibility 0: only visible to self, 1: visible to some users',
    `deleted`         tinyint(1) DEFAULT '0' COMMENT 'Whether deleted: 1-deleted, 0-not deleted',
    `create_time`     timestamp NULL DEFAULT NULL COMMENT 'Creation time',
    `update_time`     timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Modification time',
    `is_public`       bit(1)           DEFAULT b'0',
    `favorite_count`  int              DEFAULT '0' COMMENT 'Favorite count',
    `usage_count`     int              DEFAULT '0' COMMENT 'Usage count',
    `tool_tag`        varchar(255)     DEFAULT NULL,
    `operation_id`    varchar(255)     DEFAULT NULL,
    `creation_method` tinyint          DEFAULT '0',
    `auth_type`       tinyint          DEFAULT '0',
    `auth_info`       varchar(1024)    DEFAULT NULL,
    `top`             int              DEFAULT '0',
    `source`          tinyint          DEFAULT '1',
    `display_source`  varchar(16)      DEFAULT '1,2',
    `avatar_color`    varchar(255)     DEFAULT NULL,
    `status`          tinyint NOT NULL DEFAULT '1' COMMENT 'Status 0: draft, 1: formal',
    `version`         varchar(100)     DEFAULT NULL,
    `temporary_data`  mediumtext COMMENT 'Plugin temporary data',
    `space_id`        bigint           DEFAULT NULL COMMENT 'Space ID',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `tool_box_copy`;
CREATE TABLE `tool_box_copy`
(
    `id`              bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `tool_id`         varchar(30)   DEFAULT NULL COMMENT 'Core system tool identifier',
    `name`            varchar(64)   DEFAULT NULL COMMENT 'Tool name',
    `description`     varchar(255)  DEFAULT NULL COMMENT 'Tool description',
    `icon`            varchar(255)  DEFAULT NULL COMMENT 'Avatar icon',
    `user_id`         varchar(20)   DEFAULT NULL COMMENT 'User ID',
    `app_id`          varchar(60)   DEFAULT NULL COMMENT 'appid',
    `end_point`       text COMMENT 'Request address',
    `method`          varchar(255)  DEFAULT NULL COMMENT 'Request method',
    `web_schema`      longtext COMMENT 'Web protocol',
    `schema`          longtext COMMENT 'Protocol',
    `visibility`      int           DEFAULT '0' COMMENT 'Visibility 0: only visible to self, 1: visible to some users',
    `deleted`         tinyint(1) DEFAULT '0' COMMENT 'Whether deleted: 1-deleted, 0-not deleted',
    `create_time`     timestamp NULL DEFAULT NULL COMMENT 'Creation time',
    `update_time`     timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Modification time',
    `is_public`       bit(1)        DEFAULT b'0',
    `favorite_count`  int           DEFAULT '0' COMMENT 'Favorite count',
    `usage_count`     int           DEFAULT '0' COMMENT 'Usage count',
    `tool_tag`        varchar(255)  DEFAULT NULL,
    `operation_id`    varchar(255)  DEFAULT NULL,
    `creation_method` tinyint       DEFAULT '0',
    `auth_type`       tinyint       DEFAULT '0',
    `auth_info`       varchar(1024) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `tool_box_feedback`;
CREATE TABLE `tool_box_feedback`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `user_id`     varchar(100) NOT NULL COMMENT 'User ID',
    `tool_id`     varchar(100)          DEFAULT NULL COMMENT 'Tool ID',
    `name`        varchar(100)          DEFAULT NULL COMMENT 'Tool name',
    `remark`      varchar(1000)         DEFAULT NULL COMMENT 'Feedback content',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tool_box_heat_value`;
CREATE TABLE `tool_box_heat_value`
(
    `id`         int NOT NULL AUTO_INCREMENT,
    `tool_name`  varchar(100) DEFAULT NULL,
    `heat_value` int          DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tool_box_operate_history`;
CREATE TABLE `tool_box_operate_history`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `tool_id`     varchar(100) NOT NULL COMMENT 'Plugin ID',
    `uid`         varchar(100) NOT NULL,
    `type`        tinyint      NOT NULL COMMENT '1:debug  2:workflow',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Plugin debug history';

