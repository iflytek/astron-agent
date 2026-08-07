-- Migration script for init_workflow

DROP TABLE IF EXISTS `flow_db_rel`;
CREATE TABLE `flow_db_rel`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `flow_id`     varchar(100) NOT NULL,
    `db_id`       varchar(100) NOT NULL,
    `tb_id`       bigint DEFAULT NULL,
    `create_time` datetime     NOT NULL,
    `update_time` datetime     NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `flow_protocol_temp`;
CREATE TABLE `flow_protocol_temp`
(
    `flow_id`      varchar(255) NOT NULL,
    `created_time` datetime     NOT NULL,
    `biz_protocol` mediumtext   NOT NULL,
    `sys_protocol` mediumtext
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `flow_release_aiui_info`;
CREATE TABLE `flow_release_aiui_info`
(
    `id`   int unsigned NOT NULL AUTO_INCREMENT,
    `data` text NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `flow_release_channel`;
CREATE TABLE `flow_release_channel`
(
    `flow_id`     varchar(255) NOT NULL,
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime              DEFAULT CURRENT_TIMESTAMP,
    `channel`     varchar(255) NOT NULL,
    `info_id`     bigint                DEFAULT NULL,
    `status`      tinyint               DEFAULT '0' COMMENT '0=not published, 1=published',
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `flow_repo_rel`;
CREATE TABLE `flow_repo_rel`
(
    `flow_id`     varchar(255) NOT NULL,
    `repo_id`     varchar(255) NOT NULL,
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `flow_tool_rel`;
CREATE TABLE `flow_tool_rel`
(
    `flow_id`     varchar(255) NOT NULL,
    `tool_id`     varchar(255) NOT NULL,
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `version`     varchar(100)          DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `workflow`;
CREATE TABLE `workflow`
(
    `id`                   bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `uid`                  varchar(128) NOT NULL COMMENT 'User ID',
    `app_id`               varchar(255) NOT NULL,
    `flow_id`              varchar(255)          DEFAULT NULL,
    `name`                 varchar(255) NOT NULL,
    `description`          varchar(512) NOT NULL,
    `deleted`              bit(1)       NOT NULL DEFAULT b'0',
    `is_public`            bit(1)       NOT NULL DEFAULT b'0',
    `create_time`          datetime     NOT NULL,
    `update_time`          datetime              DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    `published_data`       mediumtext,
    `data`                 mediumtext,
    `avatar_icon`          varchar(1000)         DEFAULT NULL,
    `avatar_color`         varchar(255)          DEFAULT NULL,
    `status`               tinyint      NOT NULL DEFAULT '-1' COMMENT '0=not published, 1=published',
    `can_publish`          bit(1)                DEFAULT b'0',
    `app_updatable`        bit(1)                DEFAULT b'0',
    `top`                  bit(1)                DEFAULT b'0',
    `edge_type`            varchar(255)          DEFAULT NULL,
    `order`                int                   DEFAULT '0',
    `eval_set_id`          bigint                DEFAULT NULL,
    `source`               tinyint               DEFAULT '1',
    `bak`                  mediumtext,
    `editing`              bit(1)                DEFAULT b'1',
    `eval_page_first_time` text,
    `advanced_config`      text COMMENT 'Advanced configuration',
    `ext`                  text,
    `category`             int                   DEFAULT NULL COMMENT 'Category',
    `space_id`             bigint                DEFAULT NULL COMMENT 'Space ID',
    PRIMARY KEY (`id`) USING BTREE,
    KEY                    `flow_id` (`flow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `workflow_comparison`;
CREATE TABLE `workflow_comparison`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `flow_id`     varchar(100) NOT NULL COMMENT 'flowId',
    `type`        tinyint      NOT NULL DEFAULT '0' COMMENT 'Protocol type',
    `data`        mediumtext   NOT NULL COMMENT 'Workflow protocol',
    `create_time` datetime     NOT NULL COMMENT 'Creation time',
    `update_time` datetime     NOT NULL COMMENT 'Update time',
    `prompt_id`   varchar(100) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Workflow control group protocol';

DROP TABLE IF EXISTS `workflow_dialog`;
CREATE TABLE `workflow_dialog`
(
    `id`            bigint  NOT NULL AUTO_INCREMENT,
    `uid`           varchar(128)     DEFAULT NULL,
    `workflow_id`   bigint           DEFAULT NULL,
    `question`      text,
    `answer`        longtext,
    `data`          mediumtext,
    `create_time`   datetime         DEFAULT NULL,
    `deleted`       bit(1)           DEFAULT b'0',
    `sid`           varchar(255)     DEFAULT NULL,
    `type`          tinyint NOT NULL DEFAULT '1' COMMENT '1：debug 2：formal',
    `question_item` text,
    `answer_item`   longtext,
    `chat_id`       varchar(100)     DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    KEY             `workflow_id` (`workflow_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `workflow_dialog_bak`;
CREATE TABLE `workflow_dialog_bak`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) DEFAULT NULL,
    `workflow_id` bigint       DEFAULT NULL,
    `question`    text,
    `answer`      text,
    `data`        mediumtext,
    `create_time` datetime     DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    KEY           `workflow_id` (`workflow_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `workflow_feedback`;
CREATE TABLE `workflow_feedback`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) NOT NULL COMMENT 'User ID',
    `user_name`   varchar(100) NOT NULL COMMENT 'User name',
    `bot_id`      varchar(100) NOT NULL,
    `flow_id`     varchar(100) NOT NULL,
    `sid`         varchar(100) NOT NULL,
    `start_time`  datetime      DEFAULT NULL,
    `end_time`    datetime      DEFAULT NULL,
    `cost_time`   int           DEFAULT NULL COMMENT 'Cost time',
    `token`       int           DEFAULT NULL COMMENT 'Token consumption count',
    `status`      varchar(100)  DEFAULT NULL COMMENT 'Status',
    `error_code`  varchar(100)  DEFAULT NULL,
    `pic_url`     text COMMENT 'Feedback image URL',
    `description` varchar(1024) DEFAULT NULL COMMENT 'Description',
    `create_time` datetime      DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Workflow user feedback';

DROP TABLE IF EXISTS `workflow_node_history`;
CREATE TABLE `workflow_node_history`
(
    `id`           bigint       NOT NULL AUTO_INCREMENT,
    `node_id`      varchar(255) NOT NULL,
    `chat_id`      varchar(255) DEFAULT NULL,
    `raw_question` text,
    `raw_answer`   text,
    `create_time`  datetime     NOT NULL,
    `flow_id`      varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY            `node_id` (`node_id`),
    KEY            `chat_id` (`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `workflow_template_group`;
CREATE TABLE `workflow_template_group`
(
    `id`            int         NOT NULL AUTO_INCREMENT COMMENT 'Non-business primary key',
    `create_user`   varchar(32) NOT NULL COMMENT 'Publisher domain account',
    `group_name`    varchar(20) NOT NULL COMMENT 'Group name',
    `sort_index`    int         NOT NULL COMMENT 'Sort order',
    `is_delete`     tinyint     NOT NULL DEFAULT '0' COMMENT 'Whether logical deletion: 0 no logical deletion, 1 logical deletion',
    `create_time`   datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`   datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `group_name_en` varchar(128)         DEFAULT NULL COMMENT 'Group English name',
    PRIMARY KEY (`id`),
    KEY             `idx_group_name` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Xingchen workflow template grouping (comprehensive management control)';

DROP TABLE IF EXISTS `workflow_version`;
CREATE TABLE `workflow_version`
(
    `id`               bigint       NOT NULL AUTO_INCREMENT,
    `name`             varchar(100)          DEFAULT NULL COMMENT 'Version name',
    `version_num`      varchar(100) NOT NULL COMMENT 'Version number',
    `data`             mediumtext COMMENT 'Workflow protocol',
    `flow_id`          varchar(19)  NOT NULL,
    `is_deleted`       int          NOT NULL DEFAULT '0' COMMENT 'Delete status: 0=not deleted, 1=deleted',
    `deleted`          int          NOT NULL DEFAULT '1' COMMENT '2: deleted',
    `created_time`     datetime              DEFAULT CURRENT_TIMESTAMP COMMENT 'Publish time',
    `updated_time`     datetime              DEFAULT CURRENT_TIMESTAMP,
    `is_current`       int          NOT NULL DEFAULT '1' COMMENT 'Whether current version: 0=no, 1=yes',
    `is_version`       int          NOT NULL DEFAULT '1' COMMENT '2: not current version, 1: current version',
    `sys_data`         mediumtext COMMENT 'Core system protocol',
    `description`      varchar(100)          DEFAULT NULL COMMENT 'Version description',
    `publish_channels` varchar(255)          DEFAULT NULL COMMENT 'Publishing channels, consistent with chat_bot_market: MARKET,API,WECHAT,MCP (comma separated)',
    `publish_channel`  int                   DEFAULT NULL COMMENT 'Publishing channel: 1: WeChat official account, 2: Spark desk, 3: API, 4: MCP',
    `publish_result`   text COMMENT 'Publish result',
    `bot_id`           varchar(100)          DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `workflow_config` (
                                   `id` bigint(20) NOT NULL AUTO_INCREMENT,
                                   `name` varchar(100) DEFAULT NULL COMMENT '版本名称，冗余字段',
                                   `version_num` varchar(100) NOT NULL DEFAULT '-1' COMMENT '版本号',
                                   `flow_id` varchar(19) NOT NULL COMMENT 'flowId',
                                   `bot_id` int(11) DEFAULT NULL,
                                   `config` mediumtext COMMENT '语音智能体配置',
                                   `created_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                                   `updated_time` datetime DEFAULT CURRENT_TIMESTAMP,
                                   `deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除：1-删除，0-未删除',
                                   PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5805 DEFAULT CHARSET=utf8mb4;

