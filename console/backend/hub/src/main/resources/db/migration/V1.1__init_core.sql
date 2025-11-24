-- Migration script for init_core

DROP TABLE IF EXISTS `agent_apply_record`;
CREATE TABLE `agent_apply_record`
(
    `id`             bigint NOT NULL AUTO_INCREMENT,
    `enterprise_id`  bigint       DEFAULT NULL COMMENT 'Enterprise team ID',
    `space_id`       bigint       DEFAULT NULL COMMENT 'Space ID',
    `apply_uid`      varchar(128) DEFAULT NULL COMMENT 'Applicant UID',
    `apply_nickname` varchar(64)  DEFAULT NULL COMMENT 'Applicant nickname',
    `apply_time`     datetime     DEFAULT NULL COMMENT 'Application time',
    `status`         tinyint      DEFAULT NULL COMMENT 'Application status: 1 pending confirmation, 2 approved, 3 rejected',
    `audit_time`     datetime     DEFAULT NULL COMMENT 'Processing time',
    `audit_uid`      varchar(128) DEFAULT NULL COMMENT 'Processor UID',
    `create_time`    datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`    datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY              `enterprise_id_key` (`enterprise_id`) USING BTREE,
    KEY              `space_id_key` (`space_id`) USING BTREE,
    KEY              `apply_uid_key` (`apply_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Application records for joining space/enterprise';

DROP TABLE IF EXISTS `agent_invite_record`;
CREATE TABLE `agent_invite_record`
(
    `id`               bigint NOT NULL AUTO_INCREMENT,
    `type`             tinyint      DEFAULT NULL COMMENT 'Invitation type: 1 space, 2 team',
    `space_id`         bigint       DEFAULT NULL COMMENT 'Space ID',
    `enterprise_id`    bigint       DEFAULT NULL COMMENT 'Team ID',
    `invitee_uid`      varchar(128) DEFAULT NULL COMMENT 'Invitee UID',
    `role`             tinyint      DEFAULT NULL COMMENT 'Join role: 1 administrator, 2 member',
    `invitee_nickname` varchar(64)  DEFAULT NULL COMMENT 'Invitee nickname',
    `inviter_uid`      varchar(128) DEFAULT NULL COMMENT 'Inviter UID',
    `expire_time`      datetime     DEFAULT NULL COMMENT 'Expiration time',
    `status`           tinyint      DEFAULT NULL COMMENT 'Status: 1 initial, 2 rejected, 3 joined, 4 revoked, 5 expired',
    `create_time`      datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`      datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY                `invitee_id_key` (`invitee_uid`) USING BTREE,
    KEY                `space_id_key` (`space_id`),
    KEY                `enterprise_id_key` (`enterprise_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Invitation records';

DROP TABLE IF EXISTS `agent_share_record`;
CREATE TABLE `agent_share_record`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) NOT NULL COMMENT 'User ID',
    `base_id`     bigint       NOT NULL COMMENT 'Primary key ID of shared entity',
    `share_key`   varchar(64) DEFAULT '' COMMENT 'Unique identifier for sharing',
    `share_type`  tinyint     DEFAULT '0' COMMENT 'Category: 0 share assistant',
    `is_act`      tinyint     DEFAULT '1' COMMENT 'Is effective: 0 invalid, 1 valid',
    `create_time` datetime    DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY           `idx_uid` (`uid`),
    KEY           `idx_base_id` (`base_id`),
    KEY           `idx_share_key` (`share_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Agent sharing record table';

DROP TABLE IF EXISTS `ai_prompt_template`;
CREATE TABLE `ai_prompt_template`
(
    `id`             bigint                                                        NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `prompt_key`     varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Prompt unique identifier',
    `language_code`  varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci  NOT NULL COMMENT 'Language code: zh_CN/en_US',
    `prompt_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Prompt template content',
    `is_active`      tinyint(1) DEFAULT '1' COMMENT 'Is active (0-disabled, 1-enabled)',
    `created_time`   datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Created time',
    `updated_time`   datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_prompt_key_lang` (`prompt_key`,`language_code`),
    KEY              `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AI prompt template table';

DROP TABLE IF EXISTS `application_form`;
CREATE TABLE `application_form`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `nickname`    varchar(255) NOT NULL COMMENT 'User nickname',
    `mobile`      varchar(255) NOT NULL COMMENT 'Mobile number',
    `bot_name`    varchar(255) NOT NULL COMMENT 'Assistant name',
    `bot_id`      bigint       NOT NULL COMMENT 'Assistant ID',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    PRIMARY KEY (`id`),
    KEY           `idx_bot_id` (`bot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `auth_apply_record`;
CREATE TABLE `auth_apply_record`
(
    `id`            int NOT NULL AUTO_INCREMENT,
    `app_id`        varchar(128) DEFAULT NULL,
    `domain`        varchar(255) DEFAULT NULL,
    `content`       text,
    `create_time`   datetime     DEFAULT NULL,
    `uid`           varchar(128) DEFAULT NULL,
    `channel`       varchar(255) DEFAULT NULL,
    `patch_id`      varchar(128) DEFAULT NULL,
    `auto_auth`     bit(1)       DEFAULT NULL,
    `auth_order_id` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `call_log`;
CREATE TABLE `call_log`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `sid`         varchar(255) DEFAULT NULL,
    `req`         text,
    `resp`        text,
    `create_time` datetime     DEFAULT NULL,
    `type`        varchar(255) DEFAULT NULL,
    `url`         varchar(512) DEFAULT NULL,
    `method`      varchar(64)  DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `chat_info`;
CREATE TABLE `chat_info`
(
    `id`              bigint NOT NULL AUTO_INCREMENT,
    `app_id`          varchar(255) DEFAULT NULL,
    `bot_id`          varchar(255) DEFAULT NULL,
    `flow_id`         varchar(255) DEFAULT NULL,
    `sub`             varchar(255) DEFAULT NULL COMMENT 'Type: agent, workflow',
    `caller`          varchar(255) DEFAULT NULL COMMENT 'Caller',
    `log_caller`      varchar(32)  DEFAULT '',
    `uid`             varchar(255) DEFAULT NULL,
    `sid`             varchar(255) DEFAULT NULL,
    `question`        text,
    `answer`          text,
    `status_code`     int          DEFAULT NULL,
    `message`         text COMMENT 'Error message',
    `total_cost_time` int          DEFAULT NULL COMMENT 'Total cost time',
    `first_cost_time` int          DEFAULT NULL COMMENT 'First frame cost time',
    `token`           int          DEFAULT NULL COMMENT 'Token consumption',
    `create_time`     datetime     DEFAULT NULL COMMENT 'Conversation creation time',
    PRIMARY KEY (`id`),
    KEY               `app_id` (`app_id`),
    KEY               `bot_id` (`bot_id`),
    KEY               `sid` (`sid`),
    KEY               `chat_info_index_6` (`flow_id`),
    KEY               `log_caller` (`log_caller`),
    KEY               `status_code` (`status_code`),
    KEY               `chat_info_bot_id_IDX` (`bot_id`,`sub`,`caller`,`create_time`) USING BTREE,
    KEY               `idx_sub_create_time` (`sub`,`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `chat_list`;
CREATE TABLE `chat_list`
(
    `id`                 bigint   NOT NULL AUTO_INCREMENT COMMENT 'Non-business primary key',
    `uid`                varchar(128)      DEFAULT NULL COMMENT 'User ID',
    `title`              varchar(255)      DEFAULT NULL COMMENT 'Chat list topic',
    `is_delete`          tinyint           DEFAULT '0' COMMENT 'Whether deleted: 0 not delete, 1 delete',
    `enable`             tinyint           DEFAULT '1' COMMENT 'Enable status: 1 available, 0 unavailable',
    `bot_id`             int               DEFAULT '0' COMMENT 'Assistant ID',
    `sticky`             tinyint  NOT NULL DEFAULT '0' COMMENT 'Whether pinned: 0 not pinned, 1 pinned',
    `create_time`        datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`        datetime          DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Modification time',
    `is_model`           tinyint  NOT NULL DEFAULT '0' COMMENT 'Whether multimodal: 0 no, 1 yes',
    `enabled_plugin_ids` varchar(255)      DEFAULT '' COMMENT 'Currently enabled plugin IDs for this conversation list',
    `is_botweb`          tinyint  NOT NULL DEFAULT '0' COMMENT 'Whether assistant WEB application: 0 no, 1 yes',
    `file_id`            varchar(64)       DEFAULT NULL COMMENT 'Document Q&A ID',
    `root_flag`          tinyint  NOT NULL DEFAULT '1' COMMENT 'Whether root chat: 1 yes, 0 no',
    `personality_id`     bigint            DEFAULT '0' COMMENT 'Personality chat_personality_base primary key ID',
    `gcl_id`             bigint            DEFAULT '0' COMMENT 'Group chat primary key ID, 0 means not group chat',
    PRIMARY KEY (`id`, `create_time`),
    KEY                  `chat_list_create_time_IDX` (`create_time`),
    KEY                  `idx_bot_id` (`bot_id`),
    KEY                  `idx_uid_bid_ctime` (`uid`,`bot_id`,`create_time`),
    KEY                  `chat_list_file_id_idx` (`file_id`),
    KEY                  `idx_pid_uid` (`personality_id`,`uid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chat list table';

DROP TABLE IF EXISTS `chat_reanwser_records`;
CREATE TABLE `chat_reanwser_records`
(
    `id`          bigint   NOT NULL AUTO_INCREMENT COMMENT 'Non-business primary key',
    `uid`         varchar(128)      DEFAULT NULL COMMENT 'User ID',
    `chat_id`     bigint            DEFAULT NULL COMMENT 'Chat ID',
    `req_id`      bigint            DEFAULT NULL COMMENT 'Req ID before regeneration, for locating historical context position',
    `ask`         varchar(8000)     DEFAULT NULL COMMENT 'Prompt content',
    `answer`      varchar(8000)     DEFAULT NULL COMMENT 'Reply content',
    `ask_time`    datetime          DEFAULT NULL COMMENT 'Question record time',
    `answer_time` datetime          DEFAULT NULL COMMENT 'Answer record time',
    `sid`         varchar(64)       DEFAULT NULL COMMENT 'Reply SID',
    `answer_type` tinyint           DEFAULT NULL COMMENT 'Reply type: 0 system, 1 quick fix (not used by API), 2 large model, 3 abort',
    `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime          DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`, `create_time`),
    KEY           `uid_index` (`uid`),
    KEY           `chat_index` (`chat_id`),
    KEY           `idx_sid` (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chat re-answer record table';

DROP TABLE IF EXISTS `chat_reason_records`;
CREATE TABLE `chat_reason_records`
(
    `id`                    bigint       NOT NULL AUTO_INCREMENT,
    `uid`                   varchar(128) NOT NULL COMMENT 'User ID',
    `chat_id`               bigint       NOT NULL COMMENT 'Chat session ID',
    `req_id`                bigint       NOT NULL COMMENT 'Request ID',
    `content`               longtext     NOT NULL COMMENT 'Reasoning thinking content',
    `thinking_elapsed_secs` bigint                DEFAULT '0' COMMENT 'Thinking elapsed time (seconds)',
    `type`                  varchar(50)           DEFAULT NULL COMMENT 'Reasoning type (e.g.: x1_math)',
    `create_time`           datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`           datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`, `create_time`),
    KEY                     `idx_uid` (`uid`),
    KEY                     `idx_chat_id` (`chat_id`),
    KEY                     `idx_req_id` (`req_id`),
    KEY                     `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chat thinking record table';

DROP TABLE IF EXISTS `chat_req_records`;
CREATE TABLE `chat_req_records`
(
    `id`          bigint   NOT NULL AUTO_INCREMENT,
    `chat_id`     bigint   NOT NULL COMMENT 'Chat ID',
    `uid`         varchar(128)      DEFAULT NULL COMMENT 'User ID',
    `message`     varchar(8000)     DEFAULT NULL COMMENT 'Question content',
    `client_type` tinyint           DEFAULT '0' COMMENT 'Client type when user asks: 0 unknown, 1 PC, 2 H5 mainly for statistics',
    `model_id`    int               DEFAULT NULL COMMENT 'Multimodal related ID',
    `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime          DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `date_stamp`  int               DEFAULT NULL COMMENT 'cmp_core.BigdataServicesMonitorDaily',
    `new_context` tinyint  NOT NULL DEFAULT '1' COMMENT 'Bot new context: 1 yes, 0 no',
    PRIMARY KEY (`id`, `create_time`),
    KEY           `idx_chat_id` (`chat_id`),
    KEY           `idx_create_time` (`create_time`),
    KEY           `idx_date_stamp` (`date_stamp`),
    KEY           `idx_uid_chatId` (`uid`,`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chat request record table';

DROP TABLE IF EXISTS `chat_resp_alltool_data`;
CREATE TABLE `chat_resp_alltool_data`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) DEFAULT NULL COMMENT 'User ID',
    `chat_id`     bigint       DEFAULT NULL COMMENT 'Chat ID',
    `req_id`      bigint       DEFAULT NULL COMMENT 'Request ID',
    `seq_no`      varchar(100) DEFAULT NULL COMMENT 'Sequence number, like p1, p2',
    `tool_data`   text COMMENT 'All tools data to be stored for each frame returned structural data',
    `tool_name`   varchar(100) DEFAULT NULL COMMENT 'All tools type name',
    `create_time` datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY           `chat_resp_alltool_data_uid_IDX` (`uid`) USING BTREE,
    KEY           `chat_resp_alltool_data_chat_id_IDX` (`chat_id`) USING BTREE,
    KEY           `chat_resp_alltool_data_req_id_IDX` (`req_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Large model returns all tools paragraph data, one QA returns multiple alltools paragraph data';

DROP TABLE IF EXISTS `chat_resp_records`;
CREATE TABLE `chat_resp_records`
(
    `id`          bigint   NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128)                                                  DEFAULT NULL COMMENT 'User ID',
    `chat_id`     bigint                                                        DEFAULT NULL COMMENT 'Chat ID',
    `req_id`      bigint                                                        DEFAULT NULL COMMENT 'Chat question ID, one question to one answer',
    `sid`         varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Engine serial number SID',
    `answer_type` tinyint                                                       DEFAULT '2' COMMENT 'Answer type: 1 hotfix, 2 gpt',
    `message`     mediumtext COMMENT 'Answer message',
    `create_time` datetime NOT NULL                                             DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime                                                      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `date_stamp`  int                                                           DEFAULT NULL COMMENT 'cmp_core.BigdataServicesMonitorDaily',
    PRIMARY KEY (`id`, `create_time`),
    KEY           `idx_chat_id` (`chat_id`),
    KEY           `idx_create_time` (`create_time`),
    KEY           `idx_reqId` (`req_id`),
    KEY           `idx_sid` (`sid`),
    KEY           `idx_uid_chatId` (`uid`,`chat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=406 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chat response record table';

DROP TABLE IF EXISTS `chat_token_records`;
CREATE TABLE `chat_token_records`
(
    `id`                bigint NOT NULL AUTO_INCREMENT,
    `sid`               varchar(64) DEFAULT NULL COMMENT 'Session identifier',
    `prompt_tokens`     int         DEFAULT NULL COMMENT 'Prompt token count',
    `question_tokens`   int         DEFAULT NULL COMMENT 'Current question token count',
    `completion_tokens` int         DEFAULT NULL COMMENT 'Response completion token count',
    `total_tokens`      int         DEFAULT NULL COMMENT 'Total token count',
    `create_time`       datetime    DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`       datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY                 `idx_create_time` (`create_time`),
    KEY                 `idx_sid` (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chat token record table';

DROP TABLE IF EXISTS `chat_trace_source`;
CREATE TABLE `chat_trace_source`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) DEFAULT NULL COMMENT 'User ID',
    `chat_id`     bigint       DEFAULT NULL COMMENT 'Chat ID',
    `req_id`      bigint       DEFAULT NULL COMMENT 'Request ID',
    `content`     text COMMENT 'Trace content, JSON array of one frame',
    `type`        varchar(50)  DEFAULT 'search' COMMENT 'Trace type: search for search trace, others for supplementary',
    `create_time` datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY           `chat_trace_source_chat_id_IDX` (`chat_id`) USING BTREE,
    KEY           `chat_trace_source_type_IDX` (`type`) USING BTREE,
    KEY           `chat_trace_source_uid_IDX` (`uid`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chat trace information storage table';

DROP TABLE IF EXISTS `chat_tree_index`;
CREATE TABLE `chat_tree_index`
(
    `id`             bigint   NOT NULL AUTO_INCREMENT,
    `root_chat_id`   bigint   NOT NULL COMMENT 'Root chat ID',
    `parent_chat_id` bigint   NOT NULL COMMENT 'Parent chat ID',
    `child_chat_id`  bigint   NOT NULL COMMENT 'Child chat ID',
    `uid`            varchar(128)      DEFAULT NULL COMMENT 'uid',
    `create_time`    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`, `create_time`),
    KEY              `chat_tree_index_uid_IDX` (`uid`),
    KEY              `chat_tree_index_root_chat_id_IDX` (`root_chat_id`),
    KEY              `idx_child_chat_id` (`child_chat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=957447502 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chat history tree linked list information';

DROP TABLE IF EXISTS `chat_user`;
CREATE TABLE `chat_user`
(
    `id`             bigint       NOT NULL AUTO_INCREMENT COMMENT 'Non-business primary key',
    `uid`            varchar(128) DEFAULT NULL COMMENT 'Empty if user is not logged in or not registered',
    `name`           varchar(255) DEFAULT NULL COMMENT 'User name',
    `avatar`         varchar(512) DEFAULT NULL COMMENT 'Avatar',
    `nickname`       varchar(255) DEFAULT NULL COMMENT 'User nickname',
    `mobile`         varchar(255) NOT NULL COMMENT 'Mobile number, no authenticity check, only duplicate check',
    `is_able`        tinyint      DEFAULT '0' COMMENT 'Activation status: 0 for active, 1 for inactive, 2 for frozen',
    `create_time`    datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`    datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `user_agreement` tinyint      DEFAULT '0' COMMENT 'Whether agreed to user agreement: 0 not agreed, 1 agreed',
    `date_stamp`     int          DEFAULT NULL COMMENT 'cmp_core.BigdataServicesMonitorDaily',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uid_unique_index` (`uid`),
    KEY              `idx_create_time` (`create_time`),
    KEY              `index_mobile` (`mobile`),
    KEY              `idx_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='GPT user authorization information table';

DROP TABLE IF EXISTS `config_info`;
CREATE TABLE `config_info`
(
    `id`          bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key, starting from 10000',
    `category`    varchar(64)   DEFAULT NULL COMMENT 'Configuration category',
    `code`        varchar(128)  DEFAULT NULL COMMENT 'Configuration code, key',
    `name`        varchar(255)  DEFAULT NULL COMMENT 'Configuration name',
    `value`       text COMMENT 'Configuration content, value',
    `is_valid`    tinyint       DEFAULT NULL COMMENT 'Whether effective, 0-invalid, 1-valid',
    `remarks`     varchar(1000) DEFAULT NULL COMMENT 'Remarks, comments',
    `create_time` datetime      DEFAULT '2000-01-01 00:00:00' COMMENT 'Creation time',
    `update_time` datetime      DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1823 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Configuration table';

DROP TABLE IF EXISTS `config_info_en`;
CREATE TABLE `config_info_en`
(
    `id`          bigint  NOT NULL AUTO_INCREMENT COMMENT 'Primary key, starting from 10000',
    `category`    varchar(64)   DEFAULT NULL COMMENT 'Configuration category',
    `code`        varchar(128)  DEFAULT NULL COMMENT 'Configuration code, key',
    `name`        varchar(255)  DEFAULT NULL COMMENT 'Configuration name',
    `value`       text COMMENT 'Configuration content, value',
    `is_valid`    tinyint NOT NULL COMMENT 'Whether effective, 0-invalid, 1-valid',
    `remarks`     varchar(1000) DEFAULT NULL COMMENT 'Remarks, comments',
    `create_time` datetime      DEFAULT '2000-01-01 00:00:00' COMMENT 'Creation time',
    `update_time` datetime      DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1791 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Configuration table - EN';

DROP TABLE IF EXISTS `core_system_error_code`;
CREATE TABLE `core_system_error_code`
(
    `id`         int          NOT NULL AUTO_INCREMENT,
    `error_code` int          NOT NULL,
    `error_msg`  varchar(100) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1841 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `custom_vcn`;
CREATE TABLE `custom_vcn`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `uid`         bigint                                                        DEFAULT NULL,
    `name`        varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci  DEFAULT NULL,
    `status`      tinyint                                                       DEFAULT NULL COMMENT '0: deleted, 1: training, 2: training successful, 3: training failed, 4: training not started',
    `vcn_code`    varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Voice library VCN code',
    `try_vcn_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Voice sample audio URL',
    `task_id`     bigint                                                        DEFAULT NULL COMMENT 'Primary key ID of custom_vcn_task',
    `vcn_task_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Audio task ID',
    `sex`         tinyint                                                       DEFAULT NULL,
    `create_time` datetime                                                      DEFAULT NULL,
    `update_time` datetime                                                      DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    `share`       tinyint                                                       DEFAULT '0' COMMENT 'Whether from sharing: 0 no, 1 yes',
    `agent_id`    bigint                                                        DEFAULT NULL COMMENT 'Primary key ID of speaker personality table',
    PRIMARY KEY (`id`),
    KEY           `idx_agent_id` (`agent_id`),
    KEY           `idx_task_id` (`task_id`),
    KEY           `idx_uid` (`uid`),
    KEY           `idx_vcn_code` (`vcn_code`),
    KEY           `idx_vcn_task_id` (`vcn_task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Store user-trained personalized speakers';

DROP TABLE IF EXISTS `db_info`;
CREATE TABLE `db_info`
(
    `id`           bigint       NOT NULL AUTO_INCREMENT,
    `app_id`       varchar(100) NOT NULL,
    `uid`          varchar(100) NOT NULL COMMENT 'User ID',
    `db_id`        bigint                DEFAULT NULL COMMENT 'Core system database primary key ID',
    `name`         varchar(100) NOT NULL COMMENT 'Database name',
    `description`  varchar(255)          DEFAULT NULL COMMENT 'Description',
    `avatar_icon`  varchar(255)          DEFAULT NULL COMMENT 'Icon',
    `avatar_color` varchar(255)          DEFAULT NULL,
    `deleted`      tinyint      NOT NULL DEFAULT '0',
    `create_time`  datetime     NOT NULL,
    `update_time`  datetime              DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    `space_id`     bigint                DEFAULT NULL COMMENT 'Space ID',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Database information table';

DROP TABLE IF EXISTS `db_table`;
CREATE TABLE `db_table`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `db_id`       bigint       NOT NULL COMMENT 'Database primary key ID',
    `name`        varchar(100) NOT NULL,
    `description` varchar(255)          DEFAULT NULL,
    `deleted`     tinyint      NOT NULL DEFAULT '0',
    `create_time` datetime     NOT NULL,
    `update_time` datetime              DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `db_table_field`;
CREATE TABLE `db_table_field`
(
    `id`            bigint       NOT NULL AUTO_INCREMENT,
    `tb_id`         bigint       NOT NULL COMMENT 'Table primary key ID',
    `name`          varchar(100) NOT NULL,
    `type`          varchar(100) NOT NULL,
    `description`   varchar(100)          DEFAULT NULL,
    `default_value` varchar(100)          DEFAULT NULL,
    `is_required`   tinyint      NOT NULL DEFAULT '0',
    `is_system`     tinyint      NOT NULL DEFAULT '0',
    `create_time`   datetime     NOT NULL,
    `update_time`   datetime     NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Table fields';

DROP TABLE IF EXISTS `exclude_appid_flowId`;
CREATE TABLE `exclude_appid_flowId`
(
    `id`      int NOT NULL AUTO_INCREMENT,
    `app_id`  varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    `flow_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY       `exclude_appid_flowId_app_id_IDX` (`app_id`) USING BTREE,
    KEY       `exclude_appid_flowId_flow_id_IDX` (`flow_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `feedback_info`;
CREATE TABLE `feedback_info`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `app_id`      varchar(255)  DEFAULT NULL,
    `sub`         varchar(255)  DEFAULT NULL,
    `uid`         varchar(128)  DEFAULT NULL,
    `chat_id`     varchar(128)  DEFAULT NULL,
    `sid`         varchar(128)  DEFAULT NULL,
    `bot_id`      varchar(128)  DEFAULT NULL,
    `flow_id`     varchar(128)  DEFAULT NULL,
    `question`    text,
    `answer`      text,
    `action`      varchar(255)  DEFAULT NULL,
    `reason`      varchar(255)  DEFAULT NULL,
    `remark`      varchar(1200) DEFAULT NULL,
    `create_time` datetime      DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    KEY           `app_id` (`app_id`),
    KEY           `uid` (`uid`),
    KEY           `sid` (`sid`),
    KEY           `bot_id` (`bot_id`),
    KEY           `flow_id` (`flow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `fine_tune_task`;
CREATE TABLE `fine_tune_task`
(
    `id`                    bigint   NOT NULL AUTO_INCREMENT,
    `optimize_task_id`      bigint   NOT NULL,
    `dataset_id`            bigint   NOT NULL,
    `model_id`              bigint   NOT NULL,
    `fine_tune_task_id`     bigint   NOT NULL,
    `fine_tune_task_remark` varchar(1024) DEFAULT NULL,
    `create_time`           datetime NOT NULL,
    `update_time`           datetime NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    `base_model_id`         bigint        DEFAULT NULL,
    `server_name`           varchar(255)  DEFAULT NULL,
    `optimize_node`         text,
    `status`                tinyint       DEFAULT '1',
    `server_id`             bigint        DEFAULT NULL,
    `server_status`         tinyint       DEFAULT '0',
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `group_tag`;
CREATE TABLE `group_tag`
(
    `id`          bigint    NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128)       DEFAULT NULL COMMENT 'User ID',
    `name`        varchar(64)        DEFAULT NULL COMMENT 'Tag name',
    `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Tag creation time',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `group_user`;
CREATE TABLE `group_user`
(
    `id`          bigint    NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128)       DEFAULT NULL COMMENT 'User ID',
    `user_id`     varchar(128)       DEFAULT NULL COMMENT 'Tag name',
    `tag_id`      bigint             DEFAULT NULL COMMENT 'Associated tag',
    `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Tag creation time',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `group_visibility`;
CREATE TABLE `group_visibility`
(
    `id`          bigint    NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128)       DEFAULT NULL,
    `type`        int                DEFAULT NULL COMMENT 'Type: 1 knowledge base, 2 tools',
    `user_id`     varchar(128)       DEFAULT NULL,
    `relation_id` varchar(200)       DEFAULT NULL COMMENT 'Used to isolate tags between different entities',
    `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `space_id`    bigint             DEFAULT NULL COMMENT 'Team space ID',
    PRIMARY KEY (`id`),
    KEY           `type_rel_idx` (`type`,`relation_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `hit_test_history`;
CREATE TABLE `hit_test_history`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `user_id`     varchar(128) NOT NULL DEFAULT '-999' COMMENT 'Knowledge base ID',
    `repo_id`     bigint       NOT NULL COMMENT 'Knowledge base ID',
    `query`       text         NOT NULL COMMENT 'Query string',
    `create_time` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `maas_template`;
CREATE TABLE `maas_template`
(
    `id`             bigint   NOT NULL AUTO_INCREMENT,
    `core_abilities` json                                                           DEFAULT NULL,
    `core_scenarios` json                                                           DEFAULT NULL,
    `is_act`         tinyint                                                        DEFAULT NULL,
    `maas_id`        bigint                                                         DEFAULT NULL,
    `subtitle`       varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci  DEFAULT NULL,
    `title`          varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci  DEFAULT NULL,
    `bot_id`         int                                                            DEFAULT NULL,
    `cover_url`      varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    `group_id`       bigint                                                         DEFAULT NULL,
    `order_index`    int                                                            DEFAULT NULL,
    `create_time`    datetime NOT NULL                                              DEFAULT CURRENT_TIMESTAMP,
    `update_time`    datetime NOT NULL                                              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Workflow assistant template configuration';

DROP TABLE IF EXISTS `mcp_data`;
CREATE TABLE `mcp_data`
(
    `id`           bigint                                                        NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `bot_id`       bigint                                                        NOT NULL COMMENT 'Agent ID',
    `uid`          bigint                                                        NOT NULL COMMENT 'User ID',
    `space_id`     bigint                                                                 DEFAULT NULL COMMENT 'Space ID, NULL for personal agents',
    `server_name`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'MCP server name',
    `description`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'MCP server description',
    `content`      longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'MCP server content configuration',
    `icon`         varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci         DEFAULT NULL COMMENT 'MCP server icon URL',
    `server_url`   varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci         DEFAULT NULL COMMENT 'MCP server address',
    `args`         json                                                                   DEFAULT NULL COMMENT 'MCP service parameter configuration, stored in JSON format',
    `version_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci          DEFAULT NULL COMMENT 'Associated agent version name',
    `released`     tinyint                                                       NOT NULL DEFAULT '1' COMMENT 'Release status: 0=not published, 1=published',
    `is_delete`    tinyint                                                       NOT NULL DEFAULT '0' COMMENT 'Whether deleted: 0=not deleted, 1=deleted',
    `create_time`  datetime                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`  datetime                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_bot_id_version` (`bot_id`,`version_name`),
    KEY            `idx_uid` (`uid`),
    KEY            `idx_space_id` (`space_id`),
    KEY            `idx_bot_id` (`bot_id`),
    KEY            `idx_released` (`released`),
    KEY            `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='MCP data table';

DROP TABLE IF EXISTS `mcp_tool_config`;
CREATE TABLE `mcp_tool_config`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `mcp_id`      varchar(255)          DEFAULT NULL COMMENT 'mcp id',
    `server_id`   varchar(255)          DEFAULT NULL COMMENT 'ID returned by link',
    `sort_link`   varchar(1024)         DEFAULT NULL COMMENT 'Short link',
    `uid`         varchar(128) NOT NULL COMMENT 'User ID',
    `type`        varchar(255)          DEFAULT NULL COMMENT 'MCP tool type',
    `content`     text COMMENT 'Details',
    `is_deleted`  bit(1)       NOT NULL DEFAULT b'0' COMMENT 'Whether deleted: 0 not deleted, 1 deleted',
    `create_time` datetime              DEFAULT NULL,
    `update_time` datetime              DEFAULT NULL,
    `parameters`  text COMMENT 'History parameters',
    `customize`   bit(1)                DEFAULT NULL COMMENT 'Whether custom parameters exist',
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `node_info`;
CREATE TABLE `node_info`
(
    `id`                   bigint NOT NULL AUTO_INCREMENT,
    `app_id`               varchar(255) DEFAULT NULL,
    `bot_id`               varchar(255) DEFAULT NULL,
    `flow_id`              varchar(255) DEFAULT NULL,
    `sub`                  varchar(255) DEFAULT NULL,
    `caller`               varchar(255) DEFAULT NULL,
    `sid`                  varchar(255) DEFAULT NULL,
    `node_id`              varchar(255) DEFAULT NULL,
    `node_name`            varchar(255) DEFAULT NULL,
    `node_type`            varchar(255) DEFAULT NULL,
    `running_status`       bit(1)       DEFAULT NULL COMMENT 'Node running status',
    `node_input`           text COMMENT 'Input',
    `node_output`          text COMMENT 'Output',
    `config`               text COMMENT 'Node configuration information',
    `llm_output`           text COMMENT 'Large model output',
    `domain`               varchar(255) DEFAULT NULL,
    `cost_time`            int          DEFAULT NULL COMMENT 'Cost time',
    `first_cost_time`      int          DEFAULT NULL COMMENT 'First frame cost time',
    `node_first_cost_time` float        DEFAULT NULL COMMENT 'Node execution first frame cost time',
    `next_log_ids`         text COMMENT 'Next execution node running ID',
    `token`                int          DEFAULT NULL COMMENT 'Token consumption',
    `create_time`          datetime     DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY                    `app_id` (`app_id`),
    KEY                    `bot_id` (`bot_id`),
    KEY                    `flow_id` (`flow_id`),
    KEY                    `sid` (`sid`),
    KEY                    `node_id` (`node_id`),
    KEY                    `domain` (`domain`),
    KEY                    `create_time` (`create_time`),
    KEY                    `token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications`
(
    `id`            bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment ID',
    `type`          varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci  NOT NULL COMMENT 'Message type (personal, broadcast, system, promotion)',
    `title`         varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Message title',
    `body`          text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Message body',
    `template_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci  DEFAULT NULL COMMENT 'Template code for special rendering on client side',
    `payload`       json                                                          DEFAULT NULL COMMENT 'Message payload, JSON format, carries additional business data',
    `creator_uid`   varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Creator ID, e.g. system administrator',
    `created_at`    datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Creation time',
    `expire_at`     datetime(3) DEFAULT NULL COMMENT 'Expiration time, can be used for automatic cleanup tasks',
    `meta`          json                                                          DEFAULT NULL COMMENT 'Metadata, JSON format, stores other additional information',
    PRIMARY KEY (`id`),
    KEY             `idx_type_created` (`type`,`created_at` DESC),
    KEY             `idx_expire` (`expire_at`),
    KEY             `idx_creator` (`creator_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='General message table';

DROP TABLE IF EXISTS `prompt_template`;
CREATE TABLE `prompt_template`
(
    `id`               bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `uid`              varchar(128) NOT NULL COMMENT 'User ID, empty for official',
    `name`             varchar(255)          DEFAULT NULL COMMENT 'Name',
    `description`      text COMMENT 'Description',
    `deleted`          bit(1)       NOT NULL DEFAULT b'0' COMMENT 'Whether deleted',
    `prompt`           text COMMENT 'Role setting',
    `created_time`     datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_time`     datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `node_category`    int                   DEFAULT NULL COMMENT 'Node category: 1: agent node',
    `adaptation_model` text COMMENT 'Adaptation model, 1: deepseek v3',
    `max_loop_count`   bigint                DEFAULT NULL COMMENT 'Maximum loop count',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `prompt_template_en`;
CREATE TABLE `prompt_template_en`
(
    `id`               bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `uid`              varchar(128) NOT NULL COMMENT 'User ID, empty for official',
    `name`             varchar(255)          DEFAULT NULL COMMENT 'Name',
    `description`      text COMMENT 'Description',
    `deleted`          bit(1)       NOT NULL DEFAULT b'0' COMMENT 'Whether deleted',
    `prompt`           text COMMENT 'Role setting',
    `created_time`     datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_time`     datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `node_category`    int                   DEFAULT NULL COMMENT 'Node category: 1: agent node',
    `adaptation_model` text COMMENT 'Adaptation model, 1: deepseek v3',
    `max_loop_count`   bigint                DEFAULT NULL COMMENT 'Maximum loop count',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `rpa_info`;
CREATE TABLE `rpa_info` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  `category` varchar(64) DEFAULT NULL COMMENT 'RPA category',
  `name` varchar(255) DEFAULT NULL COMMENT 'RPA name',
  `value` text COMMENT 'Configuration content',
  `is_deleted` tinyint DEFAULT '0' COMMENT 'Whether effective, 0-invalid, 1-valid',
  `remarks` varchar(1000) DEFAULT NULL COMMENT 'Notes, remarks',
  `icon` varchar(150) DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
  `path` varchar(100) DEFAULT NULL COMMENT '平台官网地址',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='RPA configuration table';

DROP TABLE IF EXISTS `rpa_user_assistant`;
CREATE TABLE `rpa_user_assistant`
(
    `id`             bigint                                                       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `user_id`        varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Belonging user ID',
    `platform_id`    bigint                                                       NOT NULL COMMENT 'rpa_info.id (Platform definition)',
    `assistant_name` varchar(128)                                                 NOT NULL COMMENT 'Assistant name (unique under same user)',
    `status`         tinyint                                                      NOT NULL DEFAULT '1' COMMENT 'Status: 1-enable, 0-disable',
    `remarks`        varchar(1000)                                                         DEFAULT NULL COMMENT 'Notes, remarks',
    `icon`           varchar(100)                                                          DEFAULT NULL,
    `robot_count`    int                                                                   DEFAULT NULL,
    `space_id`       bigint                                                                DEFAULT NULL,
    `create_time`    datetime                                                     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`    datetime                                                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_assistant_name` (`user_id`,`assistant_name`),
    KEY              `idx_user` (`user_id`),
    KEY              `fk_rpa_platform` (`platform_id`),
    CONSTRAINT `fk_rpa_platform` FOREIGN KEY (`platform_id`) REFERENCES `rpa_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User-level RPA assistant main table';

DROP TABLE IF EXISTS `rpa_user_assistant_field`;
CREATE TABLE `rpa_user_assistant_field`
(
    `id`           bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `assistant_id` bigint       NOT NULL COMMENT 'rpa_user_assistant.id',
    `field_key`    varchar(128) NOT NULL COMMENT 'Field key (consistent with rpa_info.value[].name, such as apiKey)',
    `field_name`   varchar(255)          DEFAULT NULL COMMENT 'Field readable name (such as API KEY), redundant for audit convenience',
    `field_value`  text         NOT NULL COMMENT 'Field plain text value (not encrypted)',
    `create_time`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_assistant_field` (`assistant_id`,`field_key`),
    KEY            `idx_assistant` (`assistant_id`),
    CONSTRAINT `fk_assistant_field` FOREIGN KEY (`assistant_id`) REFERENCES `rpa_user_assistant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User RPA assistant field table (plain text)';

DROP TABLE IF EXISTS `share_chat`;
CREATE TABLE `share_chat`
(
    `id`                 bigint NOT NULL AUTO_INCREMENT COMMENT 'Corresponding to share_key of chat_share_content',
    `uid`                varchar(128)    DEFAULT NULL COMMENT 'Sharing user UID',
    `url_key`            varchar(64)     DEFAULT NULL COMMENT 'Include key parameter in frontend URL to prevent scraping',
    `chat_id`            bigint          DEFAULT NULL COMMENT 'Primary key of shared conversation chat_list',
    `bot_id`             bigint          DEFAULT '0' COMMENT 'Assistant ID in assistant mode, 0 for normal mode',
    `click_times`        int             DEFAULT '0' COMMENT 'Click count',
    `max_click_times`    int             DEFAULT '-1' COMMENT 'Redundant, can limit maximum click count, default -1 means unlimited',
    `url_status`         tinyint         DEFAULT '1' COMMENT 'Whether link is valid: 0 invalid, 1 valid',
    `create_time`        datetime        DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`        datetime        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `enabled_plugin_ids` varchar(255)    DEFAULT '' COMMENT 'Currently enabled plugin IDs for this conversation list',
    `like_times`         int    NOT NULL DEFAULT '0' COMMENT 'Like count',
    `ip_location`        varchar(32)     DEFAULT '' COMMENT 'IP location when sharing',
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_url_key` (`url_key`) USING BTREE,
    KEY                  `idx_bot_id` (`bot_id`),
    KEY                  `idx_enabled_plugin_ids` (`enabled_plugin_ids`),
    KEY                  `idx_create_time` (`create_time`),
    KEY                  `idx_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Conversation sharing information index table';

DROP TABLE IF EXISTS `share_qa`;
CREATE TABLE `share_qa`
(
    `id`            bigint NOT NULL AUTO_INCREMENT,
    `uid`           varchar(128)  DEFAULT NULL COMMENT 'User ID',
    `share_chat_id` bigint        DEFAULT NULL COMMENT 'Corresponding to primary key ID of share_chat',
    `message_q`     varchar(8000) DEFAULT NULL COMMENT 'Question content',
    `message_a`     mediumtext COMMENT 'Answer content',
    `sid`           varchar(128)  DEFAULT NULL COMMENT 'Answer SID',
    `show_status`   tinyint       DEFAULT '1' COMMENT 'Whether valid: 1 valid, 0 invalid',
    `create_time`   datetime      DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`   datetime      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `req_id`        bigint        DEFAULT NULL COMMENT 'User question, chat_req_records primary key ID',
    `req_type`      tinyint       DEFAULT '0' COMMENT 'Multimodal question type',
    `req_url`       text COMMENT 'Multimodal question URL',
    `resp_id`       bigint        DEFAULT '0' COMMENT 'Primary key ID of answer table',
    `resp_type`     varchar(128)  DEFAULT NULL COMMENT 'Multimodal return type',
    `resp_url`      varchar(512)  DEFAULT NULL COMMENT 'Multimodal return URL',
    `chat_key`      varchar(64)   DEFAULT NULL COMMENT 'Identifier for direct conversation on sharing page, same function as chatId',
    PRIMARY KEY (`id`),
    KEY             `uin_uid_share-chat-id` (`uid`,`share_chat_id`),
    KEY             `idx_uid` (`uid`),
    KEY             `idx_resp_type` (`resp_type`),
    KEY             `idx_share_chat_id` (`share_chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Conversation sharing Q&A content table';

DROP TABLE IF EXISTS `system_user`;
CREATE TABLE `system_user`
(
    `id`                bigint NOT NULL COMMENT 'User ID',
    `nickname`          varchar(20)  DEFAULT NULL COMMENT 'Username',
    `login`             varchar(20)  DEFAULT NULL COMMENT 'User login name',
    `email`             varchar(128) DEFAULT NULL COMMENT 'Email',
    `mobile`            varchar(20)  DEFAULT NULL COMMENT 'Mobile number',
    `last_login_time`   datetime     DEFAULT NULL COMMENT 'Last login time',
    `registration_time` datetime     DEFAULT NULL COMMENT 'Registration time',
    `create_time`       datetime     DEFAULT NULL COMMENT 'Creation time',
    `update_by`         bigint       DEFAULT NULL,
    `is_delete`         tinyint(1) DEFAULT '0' COMMENT 'Logical deletion, 0=not deleted, 1=deleted',
    `update_time`       datetime     DEFAULT NULL,
    `source`            tinyint      DEFAULT '1',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tag_info_v2`;
CREATE TABLE `tag_info_v2`
(
    `id`          bigint    NOT NULL AUTO_INCREMENT,
    `name`        varchar(64)        DEFAULT NULL COMMENT 'Tag name',
    `type`        int                DEFAULT NULL COMMENT 'Type 1: knowledge base, 2: folder, 3: file, 4: knowledge block',
    `relation_id` varchar(50)        DEFAULT NULL COMMENT 'Used to isolate tags between different entities',
    `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `uid`         varchar(128)       DEFAULT NULL,
    `repo_id`     bigint             DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY           `type_rel_idx` (`type`,`relation_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `text_node_config`;
CREATE TABLE `text_node_config`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) NOT NULL,
    `separator`   varchar(255)          DEFAULT NULL,
    `comment`     varchar(255)          DEFAULT NULL,
    `deleted`     bit(1)       NOT NULL DEFAULT b'0',
    `create_time` datetime              DEFAULT NULL,
    `update_time` datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `train_set`;
CREATE TABLE `train_set`
(
    `id`               bigint       NOT NULL AUTO_INCREMENT,
    `uid`              varchar(128) NOT NULL,
    `name`             varchar(512) NOT NULL,
    `description`      varchar(1024)         DEFAULT NULL,
    `current_ver`      varchar(255)          DEFAULT NULL COMMENT 'Current version',
    `ver_count`        int                   DEFAULT '0' COMMENT 'Version count',
    `deleted`          bit(1)       NOT NULL DEFAULT b'0',
    `create_time`      datetime              DEFAULT NULL,
    `update_time`      datetime              DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    `application_id`   bigint                DEFAULT NULL,
    `application_type` tinyint               DEFAULT NULL,
    `node_info`        varchar(1024)         DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `train_set_ver`;
CREATE TABLE `train_set_ver`
(
    `id`           bigint       NOT NULL AUTO_INCREMENT,
    `train_set_id` bigint       NOT NULL,
    `ver`          varchar(255) NOT NULL COMMENT 'Version number',
    `filename`     varchar(512)          DEFAULT NULL COMMENT 'File name',
    `storage_addr` varchar(512)          DEFAULT NULL COMMENT 'File address',
    `deleted`      bit(1)       NOT NULL DEFAULT b'0',
    `create_time`  datetime     NOT NULL,
    `update_time`  datetime     NOT NULL,
    `description`  varchar(255)          DEFAULT NULL,
    `node_info`    varchar(1024)         DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `train_set_ver_data`;
CREATE TABLE `train_set_ver_data`
(
    `id`               bigint   NOT NULL AUTO_INCREMENT,
    `train_set_ver_id` bigint   NOT NULL,
    `seq`              int           DEFAULT NULL,
    `question`         varchar(2048) DEFAULT NULL,
    `expected_answer`  varchar(5096) DEFAULT NULL,
    `sid`              varchar(256)  DEFAULT NULL,
    `create_time`      datetime NOT NULL,
    `deleted`          bit(1)        DEFAULT b'0',
    `source`           tinyint       DEFAULT '1' COMMENT '1=file, 2=online data',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `untitled_table`;
CREATE TABLE `untitled_table`
(
    `id`            int unsigned NOT NULL AUTO_INCREMENT,
    `created_tme`   datetime NOT NULL                                             DEFAULT CURRENT_TIMESTAMP,
    `domain`        varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    `baseModelId`   bigint                                                        DEFAULT NULL,
    `baseModelName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_broadcast_read`;
CREATE TABLE `user_broadcast_read`
(
    `id`              bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment ID',
    `receiver_uid`    varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'User ID',
    `notification_id` bigint unsigned NOT NULL COMMENT 'Associated broadcast notification ID (notifications.id)',
    `read_at`         datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Read time',
    PRIMARY KEY (`id`),
    KEY               `idx_receiver_uid` (`receiver_uid`),
    KEY               `idx_notification` (`notification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User broadcast message read status table';

DROP TABLE IF EXISTS `user_favorite_tool`;
CREATE TABLE `user_favorite_tool`
(
    `id`             bigint       NOT NULL AUTO_INCREMENT,
    `user_id`        varchar(128) NOT NULL,
    `tool_id`        bigint       NOT NULL,
    `tool_flag_id`   varchar(30)           DEFAULT NULL,
    `created_time`   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `is_deleted`     tinyint               DEFAULT '0',
    `use_flag`       tinyint               DEFAULT '0' COMMENT 'Usage flag',
    `mcp_tool_id`    varchar(100)          DEFAULT NULL,
    `plugin_tool_id` varchar(100)          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY              `idx_user_favorite_tool_user_id` (`user_id`),
    KEY              `idx_user_favorite_tool_tool_id` (`tool_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_info`;
CREATE TABLE `user_info`
(
    `id`             bigint NOT NULL AUTO_INCREMENT COMMENT 'Non-business primary key',
    `uid`            varchar(128)                                                  DEFAULT NULL COMMENT 'UID',
    `username`       varchar(255)                                                  DEFAULT NULL COMMENT 'Username',
    `avatar`         varchar(512)                                                  DEFAULT NULL COMMENT 'Avatar',
    `nickname`       varchar(255)                                                  DEFAULT NULL COMMENT 'User nickname',
    `mobile`         varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Mobile number',
    `account_status` tinyint                                                       DEFAULT '0' COMMENT 'Activation status: 0 inactive, 1 active, 2 frozen',
    `enterprise_service_type` int                                                  DEFAULT '0' COMMENT 'Enterprise service type: 0 none, 1 team, 2 enterprise',
    `user_agreement` tinyint                                                       DEFAULT '0' COMMENT 'Whether agreed to user agreement: 0 not agreed, 1 agreed',
    `deleted`        tinyint                                                       DEFAULT '0' COMMENT 'Logical deletion flag: 0 not deleted, 1 deleted',
    `create_time`    datetime                                                      DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`    datetime                                                      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uid_unique_index` (`uid`),
    KEY              `idx_create_time` (`create_time`),
    KEY              `index_mobile` (`mobile`),
    KEY              `idx_username` (`username`),
    KEY              `idx_nickname` (`nickname`),
    KEY              `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User information table';

DROP TABLE IF EXISTS `user_lang_chain_info`;
CREATE TABLE `user_lang_chain_info`
(
    `id`                  bigint                                                        NOT NULL AUTO_INCREMENT COMMENT 'Non-business primary key',
    `bot_id`              int                                                           NOT NULL COMMENT 'Agent ID',
    `name`                varchar(255) DEFAULT NULL COMMENT 'LangChain name',
    `desc`                text COMMENT 'Agent description',
    `open`                json         DEFAULT NULL COMMENT 'Open configuration information, including nodes and edges',
    `gcy`                 json         DEFAULT NULL COMMENT 'GCY configuration information, including virtual nodes and edges',
    `uid`                 varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'User ID',
    `flow_id`             varchar(64)  DEFAULT NULL COMMENT 'Process ID',
    `space_id`            bigint       DEFAULT NULL,
    `maas_id`             bigint       DEFAULT NULL COMMENT 'Group ID',
    `bot_name`            varchar(255) DEFAULT NULL COMMENT 'Agent name',
    `extra_inputs`        json         DEFAULT NULL COMMENT 'Extra input items',
    `extra_inputs_config` json         DEFAULT NULL COMMENT 'Multi-file parameters',
    `create_time`         datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`         datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY                   `idx_bot_id` (`bot_id`),
    KEY                   `idx_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Workflow configuration table';

DROP TABLE IF EXISTS `user_lang_chain_log`;
CREATE TABLE `user_lang_chain_log`
(
    `id`          bigint   NOT NULL AUTO_INCREMENT,
    `bot_id`      bigint                                                        DEFAULT NULL,
    `maas_id`     bigint                                                        DEFAULT NULL,
    `flow_id`     varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci  DEFAULT NULL,
    `uid`         varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    `space_id`    bigint                                                        DEFAULT NULL,
    `create_time` datetime NOT NULL                                             DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime NOT NULL                                             DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY           `idx_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_notifications`;
CREATE TABLE `user_notifications`
(
    `id`              bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment ID',
    `notification_id` bigint unsigned NOT NULL COMMENT 'Associated notification ID (notifications.id)',
    `receiver_uid`    varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Receiver user ID',
    `is_read`         tinyint                                                       NOT NULL DEFAULT '0' COMMENT 'Whether read (0=unread, 1=read)',
    `read_at`         datetime(3) DEFAULT NULL COMMENT 'Read time',
    `received_at`     datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Receive time',
    `extra`           json                                                                   DEFAULT NULL COMMENT 'Extra data, JSON format, for storing user-specific additional information',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_user_notification` (`notification_id`,`receiver_uid`),
    KEY               `idx_user_unread` (`receiver_uid`,`is_read`,`received_at` DESC),
    KEY               `idx_notification` (`notification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User personal message association table';

DROP TABLE IF EXISTS `user_thread_pool_config`;
CREATE TABLE `user_thread_pool_config`
(
    `id`   bigint                                                        NOT NULL AUTO_INCREMENT,
    `uid`  varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'User ID',
    `size` int                                                           NOT NULL COMMENT 'Thread pool size',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `vcn_info`;
CREATE TABLE `vcn_info`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `vcn`         varchar(255)  DEFAULT NULL,
    `name`        varchar(255)  DEFAULT NULL,
    `style`       varchar(255)  DEFAULT NULL,
    `emt`         varchar(255)  DEFAULT NULL,
    `image_url`   varchar(1024) DEFAULT NULL,
    `create_time` datetime      DEFAULT NULL,
    `valid`       bit(1)        DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `voice_chat_personality_agent`;
CREATE TABLE `voice_chat_personality_agent`
(
    `id`                      bigint                                                       NOT NULL AUTO_INCREMENT,
    `uid`                     bigint                                                                DEFAULT NULL,
    `player_id`               varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci          DEFAULT '' COMMENT 'Role ID',
    `agent_id`                varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT 'Personality engine ID',
    `vcn_id`                  bigint                                                                DEFAULT NULL COMMENT 'Speaker ID',
    `agent_name`              varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci          DEFAULT '' COMMENT 'Personality name',
    `agent_type`              varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci          DEFAULT '' COMMENT 'Personality type',
    `player_call`             varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci          DEFAULT '' COMMENT 'Personality addressing for user',
    `identity`                varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci         DEFAULT '' COMMENT 'Background',
    `personality_description` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci        DEFAULT '' COMMENT 'Personality description',
    `image_url`               varchar(2250) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci        DEFAULT '' COMMENT 'Avatar address',
    `is_open`                 tinyint                                                               DEFAULT NULL COMMENT 'Whether enabled, 0-no, 1-yes',
    `is_del`                  tinyint                                                               DEFAULT NULL COMMENT 'Whether deleted, 0-no, 1-yes',
    `create_time`             datetime                                                              DEFAULT CURRENT_TIMESTAMP,
    `update_time`             datetime                                                              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `virtual_url`             varchar(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci        DEFAULT NULL COMMENT 'Virtual character avatar',
    PRIMARY KEY (`id`),
    KEY                       `idx_agent_id` (`agent_id`),
    KEY                       `idx_agent_name` (`agent_name`),
    KEY                       `idx_uid` (`uid`),
    KEY                       `idx_vcn_id` (`vcn_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Super-anthropomorphic personality role details table';

DROP TABLE IF EXISTS `xingchen_official_prompt`;
CREATE TABLE `xingchen_official_prompt`
(
    `id`             bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `name`           varchar(255) NOT NULL COMMENT 'Prompt name',
    `prompt_key`     varchar(255) NOT NULL COMMENT 'Prompt unique identifier key',
    `uid`            varchar(128) NOT NULL DEFAULT '0' COMMENT 'User ID',
    `type`           tinyint      NOT NULL DEFAULT '0' COMMENT 'Prompt type',
    `latest_version` varchar(50)           DEFAULT '' COMMENT 'Latest version number',
    `model_config`   json         NOT NULL COMMENT 'Model configuration information (JSON format)',
    `prompt_text`    json         NOT NULL COMMENT 'Prompt text content (JSON format)',
    `prompt_input`   json         NOT NULL COMMENT 'Prompt input variable configuration (JSON format)',
    `status`         tinyint      NOT NULL DEFAULT '0' COMMENT 'Status: 0-normal, 1-disabled',
    `is_delete`      tinyint      NOT NULL DEFAULT '0' COMMENT 'Whether deleted: 0-no, 1-yes',
    `commit_time`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Commit time',
    `create_time`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_prompt_key` (`prompt_key`),
    KEY              `idx_uid` (`uid`),
    KEY              `idx_type` (`type`),
    KEY              `idx_status` (`status`),
    KEY              `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Xingchen official Prompt table';

DROP TABLE IF EXISTS `xingchen_prompt_manage`;
CREATE TABLE `xingchen_prompt_manage`
(
    `id`              bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `name`            varchar(500) NOT NULL COMMENT 'Prompt name',
    `prompt_key`      varchar(255) NOT NULL COMMENT 'Prompt unique identifier key',
    `uid`             varchar(128) NOT NULL COMMENT 'User ID',
    `type`            tinyint      NOT NULL DEFAULT '0' COMMENT 'Prompt type',
    `latest_version`  varchar(50)           DEFAULT '' COMMENT 'Latest version number',
    `current_version` varchar(50)           DEFAULT '' COMMENT 'Current version number',
    `model_config`    json         NOT NULL COMMENT 'Model configuration information (JSON format)',
    `prompt_text`     json         NOT NULL COMMENT 'Prompt text content (JSON format)',
    `prompt_input`    json         NOT NULL COMMENT 'Prompt input variable configuration (JSON format)',
    `status`          tinyint      NOT NULL DEFAULT '0' COMMENT 'Status: 0-Normal, 1-Disabled',
    `is_delete`       tinyint      NOT NULL DEFAULT '0' COMMENT 'Is deleted: 0-No, 1-Yes',
    `commit_time`     datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Commit time',
    `create_time`     datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`     datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_prompt_key_uid` (`prompt_key`,`uid`),
    KEY               `idx_uid` (`uid`),
    KEY               `idx_type` (`type`),
    KEY               `idx_status` (`status`),
    KEY               `idx_latest_version` (`latest_version`),
    KEY               `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Xingchen Prompt management table';

DROP TABLE IF EXISTS `xingchen_prompt_version`;
CREATE TABLE `xingchen_prompt_version`
(
    `id`           bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `prompt_id`    varchar(50)  NOT NULL COMMENT 'Associated Prompt ID',
    `uid`          varchar(128) NOT NULL COMMENT 'User ID',
    `version`      varchar(50)  NOT NULL COMMENT 'Version number',
    `version_desc` text COMMENT 'Version description',
    `commit_time`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Commit time',
    `commit_user`  varchar(128) NOT NULL COMMENT 'Commit user ID',
    `model_config` json         NOT NULL COMMENT 'Model configuration information (JSON format)',
    `prompt_text`  json         NOT NULL COMMENT 'Prompt text content (JSON format)',
    `prompt_input` json         NOT NULL COMMENT 'Prompt input variable configuration (JSON format)',
    `is_delete`    tinyint      NOT NULL DEFAULT '0' COMMENT 'Is deleted: 0-No, 1-Yes',
    `create_time`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY            `idx_prompt_id` (`prompt_id`),
    KEY            `idx_uid` (`uid`),
    KEY            `idx_version` (`version`),
    KEY            `idx_commit_user` (`commit_user`),
    KEY            `idx_commit_time` (`commit_time`),
    KEY            `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Xingchen Prompt version management table';

DROP TABLE IF EXISTS `z-bot_model_config_copy`;
CREATE TABLE `z-bot_model_config_copy`
(
    `id`           bigint NOT NULL AUTO_INCREMENT,
    `bot_id`       bigint NOT NULL COMMENT 'Bot ID',
    `model_config` text   NOT NULL COMMENT 'Model configuration',
    `create_time`  timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `z-bot_repo_subscript`;
CREATE TABLE `z-bot_repo_subscript`
(
    `id`          bigint      NOT NULL AUTO_INCREMENT,
    `bot_id`      bigint      NOT NULL COMMENT 'Bot ID',
    `app_id`      varchar(64) NOT NULL COMMENT 'appId',
    `repo_id`     bigint      NOT NULL COMMENT 'repoID',
    `create_time` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `z-workflow_dialog-bak`;
CREATE TABLE `z-workflow_dialog-bak`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `workflow_id` bigint   DEFAULT NULL,
    `question`    text,
    `answer`      text,
    `data`        mediumtext,
    `create_time` datetime DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    KEY           `workflow_id` (`workflow_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `app_mst`;
CREATE TABLE `app_mst` (
  `id`           bigint         NOT NULL        AUTO_INCREMENT,
  `uid`          varchar(128)   NOT NULL        COMMENT 'User ID',
  `app_name`     varchar(128)   DEFAULT NULL    COMMENT 'App name',
  `app_describe` varchar(512)   DEFAULT NULL    COMMENT 'App Describe',
  `app_id`       varchar(128)   DEFAULT NULL    COMMENT 'App ID',
  `app_key`      varchar(128)   DEFAULT NULL    COMMENT 'App Key',
  `app_secret`   varchar(128)   DEFAULT NULL    COMMENT 'App Secret',
  `is_delete`    tinyint        DEFAULT '0'     COMMENT 'Is Delete',
  `create_time`  datetime       DEFAULT NULL    COMMENT 'Create Time',
  `update_time`  datetime       DEFAULT NULL    COMMENT 'Update Time',
  PRIMARY KEY (`id`),
  KEY `idx_uid` (`uid`),
  KEY `idx_app_id` (`app_id`),
  KEY `idx_app_name` (`app_name`)
) ENGINE=InnoDB COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `personality_category`;
CREATE TABLE `personality_category`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary Key ID',
    `name`        varchar(64) NOT NULL COMMENT 'Category Name',
    `sort`        int          NOT NULL DEFAULT '0' COMMENT 'Sort Order',
    `deleted`     int          NOT NULL DEFAULT '0' COMMENT 'Deletion Status (0: normal, 1: deleted)',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
    `update_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update Time',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Personality Category Table';

DROP TABLE IF EXISTS `personality_role`;
CREATE TABLE `personality_role`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary Key ID',
    `name`        varchar(255) NOT NULL COMMENT 'Role Name',
    `description` text COMMENT 'Role Description',
    `head_cover`  varchar(2048) NOT NULL COMMENT 'Head Cover Image',
    `prompt`      text COMMENT 'Role Prompt',
    `cover`       varchar(2048) NOT NULL COMMENT 'Cover Image',
    `sort`        int          NOT NULL DEFAULT '0' COMMENT 'Sort',
    `category_id` bigint       NOT NULL COMMENT 'Category ID',
    `deleted`     int          NOT NULL DEFAULT '0' COMMENT 'Deletion Status (0: normal, 1: deleted)',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation Time',
    `update_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update Time',
    PRIMARY KEY (`id`),
    KEY           `idx_category_id` (`category_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Personality Role Table';

DROP TABLE IF EXISTS `personality_config`;
CREATE TABLE `personality_config`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `bot_id`      bigint       NOT NULL COMMENT 'Bot ID',
    `personality` text COMMENT 'Personality information',
    `scene_type`  int          DEFAULT NULL COMMENT 'Scene type',
    `scene_info`  varchar(1024) COMMENT 'Scene information',
    `config_type` int          NOT NULL COMMENT 'dConfiguration type (distinguish between debug and market)',
    `deleted`     int          NOT NULL DEFAULT '0' COMMENT 'Deletion status 0: normal 1: deleted',
    `enabled`     int          NOT NULL DEFAULT '1' COMMENT 'Whether enabled',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    `update_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY           `idx_bot_id` (`bot_id`) USING BTREE,
    UNIQUE KEY    `idx_bot_id_config_type` (`bot_id`, `config_type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Personality Config Table';

DROP TABLE IF EXISTS `pronunciation_person_config`;
create table pronunciation_person_config
(
    id                 bigint auto_increment comment 'Primary key ID'
        primary key,
    name               varchar(64)                        not null comment 'Pronunciation person name',
    cover_url          varchar(2048)                      null comment 'Pronunciation person cover image URL',
    voice_type         varchar(64)                        null comment 'Pronunciation person parameters',
    sort               int      default 0                 null comment 'Pronunciation person sort',
    speaker_type varchar(64)                        null comment 'Pronunciation person type',
    exquisite          tinyint  default 0                 null comment 'Exquisite pronunciation person (0 = not exquisite, 1 = exquisite)',
    deleted            tinyint  default 0                 null comment 'Deleted status (0 = not deleted, 1 = deleted)',
    create_time        datetime default CURRENT_TIMESTAMP null comment 'Creation time',
    update_time        datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment 'Update time'
)
    comment 'Pronunciation person configuration' charset = utf8mb4;

DROP TABLE IF EXISTS `custom_speaker`;
create table custom_speaker
(
    id          bigint auto_increment
        primary key,
    create_uid  varchar(64)                        not null,
    space_id    bigint                             null,
    name        varchar(64)                        not null,
    task_id     varchar(64)                        not null,
    asset_id    varchar(64)                        null,
    deleted     tinyint  default 0                 not null,
    create_time datetime default CURRENT_TIMESTAMP null comment 'create time',
    update_time datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment 'update time',
    constraint uni_task_id
        unique (task_id),
    KEY `idx_asset_id` (`asset_id`),
    KEY `idx_bot_id` (`space_id`)
);

