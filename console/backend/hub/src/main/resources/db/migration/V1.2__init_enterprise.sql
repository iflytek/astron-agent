-- Migration script for init_enterprise

DROP TABLE IF EXISTS `agent_enterprise`;
CREATE TABLE `agent_enterprise`
(
    `id`           bigint        NOT NULL AUTO_INCREMENT,
    `uid`          varchar(128)  DEFAULT NULL COMMENT 'Creator ID',
    `name`         varchar(50)   DEFAULT NULL COMMENT 'Team name',
    `logo_url`     varchar(1024) DEFAULT NULL COMMENT 'logoURL',
    `avatar_url`   varchar(1024) NOT NULL COMMENT 'Avatar URL',
    `org_id`       bigint        DEFAULT NULL COMMENT 'Organization ID',
    `service_type` tinyint       DEFAULT NULL COMMENT 'Service type: 1 team, 2 enterprise',
    `create_time`  datetime      DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `expire_time`  datetime      DEFAULT NULL COMMENT 'Expiration time',
    `update_time`  datetime      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `deleted`      tinyint       DEFAULT '0' COMMENT 'Is deleted: 0 no, 1 yes',
    PRIMARY KEY (`id`),
    KEY            `enterprise_name_key` (`name`) USING BTREE,
    KEY            `enterprise_uid_key` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Enterprise team';

DROP TABLE IF EXISTS `agent_enterprise_permission`;
CREATE TABLE `agent_enterprise_permission`
(
    `id`                bigint  NOT NULL AUTO_INCREMENT,
    `module`            varchar(50)  DEFAULT NULL COMMENT 'Permission module',
    `description`       varchar(255) DEFAULT NULL COMMENT 'Description',
    `permission_key`    varchar(128)  DEFAULT NULL COMMENT 'Permission unique identifier',
    `officer`           tinyint NOT NULL COMMENT 'Super administrator (has permission): 1 yes, 0 no',
    `governor`          tinyint NOT NULL COMMENT 'Administrator (has permission): 1 yes, 0 no',
    `staff`             tinyint NOT NULL COMMENT 'Member (has permission): 1 yes, 0 no',
    `available_expired` tinyint NOT NULL COMMENT 'Available when expired: 1 yes, 0 no',
    `create_time`       datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`       datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY                 `key_uni_key` (`permission_key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Enterprise team role permission configuration';

DROP TABLE IF EXISTS `agent_enterprise_user`;
CREATE TABLE `agent_enterprise_user`
(
    `id`            bigint NOT NULL AUTO_INCREMENT,
    `enterprise_id` bigint       DEFAULT NULL COMMENT 'Team ID',
    `uid`           varchar(128) DEFAULT NULL COMMENT 'User ID',
    `nickname`      varchar(64)  DEFAULT NULL COMMENT 'User nickname',
    `role`          tinyint      DEFAULT NULL COMMENT 'Role: 1 super administrator, 2 administrator, 3 member',
    `create_time`   datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`   datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `enterprise_id_uid_uni_key` (`enterprise_id`,`uid`) USING BTREE,
    KEY             `enterprise_user_uid_key` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Enterprise team users';

