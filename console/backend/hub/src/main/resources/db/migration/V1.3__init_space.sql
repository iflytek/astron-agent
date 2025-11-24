-- Migration script for init_space

DROP TABLE IF EXISTS `agent_space`;
CREATE TABLE `agent_space`
(
    `id`            bigint      NOT NULL AUTO_INCREMENT,
    `name`          varchar(50) NOT NULL COMMENT 'Space name',
    `description`   varchar(2000) DEFAULT NULL COMMENT 'Description',
    `avatar_url`    varchar(1024) DEFAULT NULL COMMENT 'Avatar URL',
    `uid`           varchar(128)  DEFAULT NULL COMMENT 'Creator ID',
    `enterprise_id` bigint        DEFAULT NULL COMMENT 'Team ID',
    `type`          tinyint       DEFAULT NULL COMMENT 'Type: 1 free version, 2 professional version, 3 team version, 4 enterprise version',
    `create_time`   datetime      DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`   datetime      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `deleted`       tinyint       DEFAULT '0' COMMENT 'Is deleted: 0 no, 1 yes',
    PRIMARY KEY (`id`),
    KEY             `uid_key` (`uid`),
    KEY             `enterprise_id_key` (`enterprise_id`) USING BTREE,
    KEY             `space_name` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Workspace';

DROP TABLE IF EXISTS `agent_space_permission`;
CREATE TABLE `agent_space_permission`
(
    `id`                bigint  NOT NULL AUTO_INCREMENT,
    `module`            varchar(50)  DEFAULT NULL COMMENT 'Permission module',
    `point`             varchar(50)  DEFAULT NULL COMMENT 'Permission point',
    `description`       varchar(255) DEFAULT NULL COMMENT 'Description',
    `permission_key`    varchar(128)  DEFAULT NULL COMMENT 'Permission unique identifier',
    `owner`             tinyint NOT NULL COMMENT 'Owner (has permission): 1 yes, 0 no',
    `admin`             tinyint NOT NULL COMMENT 'Administrator (has permission): 1 yes, 0 no',
    `member`            tinyint NOT NULL COMMENT 'Member (has permission): 1 yes, 0 no',
    `available_expired` tinyint NOT NULL COMMENT 'Available when expired: 1 yes, 0 no',
    `create_time`       datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`       datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `key_uni_key` (`permission_key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Workspace role permission configuration';

DROP TABLE IF EXISTS `agent_space_user`;
CREATE TABLE `agent_space_user`
(
    `id`              bigint       NOT NULL AUTO_INCREMENT,
    `space_id`        bigint       NOT NULL COMMENT 'Space ID',
    `uid`             varchar(128) NOT NULL COMMENT 'User ID',
    `nickname`        varchar(64) DEFAULT NULL COMMENT 'User nickname',
    `role`            tinyint      NOT NULL COMMENT 'Role: 1 owner, 2 administrator, 3 member',
    `last_visit_time` datetime    DEFAULT NULL COMMENT 'Last visit time',
    `create_time`     datetime    DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`     datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `space_id_uid_uni_key` (`space_id`,`uid`) USING BTREE,
    KEY               `space_user_uid_key` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Workspace users';

