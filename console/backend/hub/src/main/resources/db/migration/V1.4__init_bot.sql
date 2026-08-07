-- Migration script for init_bot

DROP TABLE IF EXISTS `bot_chat_file_param`;
CREATE TABLE `bot_chat_file_param`
(
    `id`          bigint                                                        NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `uid`         varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'User ID',
    `chat_id`     bigint                                                        NOT NULL COMMENT 'Chat ID',
    `name`        varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Parameter name',
    `file_ids`    json     DEFAULT NULL COMMENT 'File ID list',
    `file_urls`   json     DEFAULT NULL COMMENT 'File URL list',
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `is_delete`   tinyint  DEFAULT '0' COMMENT 'Whether deleted: 0 not deleted, 1 deleted',
    PRIMARY KEY (`id`),
    KEY           `idx_uid` (`uid`),
    KEY           `idx_chat_id` (`chat_id`),
    KEY           `idx_name` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot chat file parameter info table';

DROP TABLE IF EXISTS `bot_conversation_stats`;
CREATE TABLE `bot_conversation_stats`
(
    `id`                bigint                                                        NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
    `uid`               varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'User ID',
    `space_id`          bigint                                                                 DEFAULT NULL COMMENT 'Space ID, NULL for personal agents',
    `bot_id`            int                                                           NOT NULL COMMENT 'Agent ID',
    `chat_id`           bigint                                                        NOT NULL COMMENT 'Conversation ID',
    `sid`               varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci          DEFAULT NULL COMMENT 'Session identifier',
    `token_consumed`    int                                                           NOT NULL DEFAULT '0' COMMENT 'Token count consumed in this conversation',
    `conversation_date` date                                                          NOT NULL COMMENT 'Conversation date',
    `create_time`       datetime                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `is_delete`         tinyint                                                       NOT NULL DEFAULT '0' COMMENT 'Whether deleted: 0=not deleted, 1=deleted',
    PRIMARY KEY (`id`),
    KEY                 `idx_bot_id_date` (`bot_id`,`conversation_date`),
    KEY                 `idx_uid_bot_id` (`uid`,`bot_id`),
    KEY                 `idx_space_id_bot_id` (`space_id`,`bot_id`),
    KEY                 `idx_chat_id` (`chat_id`),
    KEY                 `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot conversation statistics table';

DROP TABLE IF EXISTS `bot_dataset`;
CREATE TABLE `bot_dataset`
(
    `id`            bigint NOT NULL AUTO_INCREMENT,
    `bot_id`        bigint NOT NULL COMMENT 'Corresponding primary key ID of chat_bot_base table',
    `dataset_id`    bigint       DEFAULT NULL COMMENT 'Primary key ID of dataset_info table',
    `dataset_index` varchar(255) DEFAULT NULL COMMENT 'Knowledge database dataset ID',
    `is_act`        tinyint      DEFAULT '1' COMMENT 'Whether effective: 0 inactive, 1 active, 2 under review after market update',
    `create_time`   datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`   datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `uid`           varchar(128) DEFAULT NULL COMMENT 'User ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_id_bot_id` (`id`,`bot_id`),
    KEY             `idx_uid` (`uid`),
    KEY             `idx_is_act` (`is_act`),
    KEY             `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot associated dataset index table';

DROP TABLE IF EXISTS `bot_dataset_maas`;
CREATE TABLE `bot_dataset_maas`
(
    `id`            bigint NOT NULL AUTO_INCREMENT,
    `bot_id`        bigint NOT NULL COMMENT 'Corresponding primary key ID of chat_bot_base table',
    `dataset_id`    bigint       DEFAULT NULL COMMENT 'Primary key ID of dataset_info table',
    `dataset_index` varchar(255) DEFAULT NULL COMMENT 'Knowledge database dataset ID',
    `is_act`        tinyint      DEFAULT '1' COMMENT 'Whether effective: 0 inactive, 1 active, 2 under review after market update',
    `create_time`   datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`   datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `uid`           varchar(128) DEFAULT NULL COMMENT 'User ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_id_bot_id` (`id`,`bot_id`),
    KEY             `idx_uid` (`uid`),
    KEY             `idx_is_act` (`is_act`),
    KEY             `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot associated maas dataset index table';

DROP TABLE IF EXISTS `bot_favorite`;
CREATE TABLE `bot_favorite`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) NOT NULL,
    `bot_id`      int          NOT NULL,
    `create_time` datetime DEFAULT NULL,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY           `idx_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot favorites';

DROP TABLE IF EXISTS `bot_flow_rel`;
CREATE TABLE `bot_flow_rel`
(
    `id`          int unsigned NOT NULL AUTO_INCREMENT,
    `create_time` datetime     DEFAULT CURRENT_TIMESTAMP,
    `flow_id`     varchar(255) DEFAULT NULL,
    `bot_id`      bigint       DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bot_model_bind`;
CREATE TABLE `bot_model_bind`
(
    `id`             bigint       NOT NULL AUTO_INCREMENT,
    `uid`            varchar(128) NOT NULL,
    `bot_id`         bigint                DEFAULT NULL,
    `app_id`         varchar(255) NOT NULL,
    `llm_service_id` varchar(255) NOT NULL,
    `domain`         varchar(255) NOT NULL,
    `patch_id`       varchar(255) NOT NULL DEFAULT '0',
    `model_name`     varchar(255)          DEFAULT NULL,
    `create_time`    datetime              DEFAULT NULL,
    `model_type`     tinyint               DEFAULT '1',
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `bot_id` (`bot_id`,`app_id`(191),`llm_service_id`(191),`domain`(191),`patch_id`(191)) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `bot_model_config`;
CREATE TABLE `bot_model_config`
(
    `id`           bigint NOT NULL AUTO_INCREMENT,
    `bot_id`       bigint NOT NULL COMMENT 'Bot ID',
    `model_config` text   NOT NULL COMMENT 'Model configuration',
    `create_time`  datetime DEFAULT NULL,
    `update_time`  datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bot_offiaccount`;
CREATE TABLE `bot_offiaccount`
(
    `id`           bigint NOT NULL AUTO_INCREMENT,
    `uid`          varchar(128) DEFAULT NULL COMMENT 'User ID',
    `bot_id`       bigint       DEFAULT NULL COMMENT 'Assistant ID',
    `appid`        varchar(100) DEFAULT NULL COMMENT 'WeChat official account app ID',
    `release_type` tinyint      DEFAULT '1' COMMENT 'Release type: 1 WeChat official account',
    `status`       tinyint      DEFAULT '0' COMMENT 'Binding status: 0-unbound, 1-bound, 2-unbound',
    `create_time`  datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`  datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY            `bot_id_index` (`bot_id`),
    KEY            `uid_index` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot and WeChat Official Account binding information';

DROP TABLE IF EXISTS `bot_offiaccount_chat`;
CREATE TABLE `bot_offiaccount_chat`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `app_id`      varchar(64) DEFAULT NULL COMMENT 'WeChat official account app ID',
    `open_id`     varchar(64) DEFAULT NULL COMMENT 'User ID who followed WeChat official account',
    `msg_id`      bigint      DEFAULT NULL COMMENT 'WeChat message ID, equivalent to req_id',
    `req`         text COMMENT 'Message sent by user',
    `resp`        text COMMENT 'Message returned by large model',
    `sid`         varchar(64) DEFAULT NULL COMMENT 'Session identifier',
    `create_time` datetime    DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY           `index_app_id` (`app_id`),
    KEY           `index_open_id` (`open_id`),
    KEY           `index_msg_id` (`msg_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='WeChat Official Account Q&A record table';

DROP TABLE IF EXISTS `bot_offiaccount_record`;
CREATE TABLE `bot_offiaccount_record`
(
    `id`          bigint NOT NULL AUTO_INCREMENT,
    `bot_id`      bigint       DEFAULT NULL COMMENT 'Assistant ID',
    `appid`       varchar(100) DEFAULT NULL COMMENT 'WeChat official account app ID',
    `auth_type`   tinyint      DEFAULT NULL COMMENT 'Operation type: 1 bind, 2 unbind',
    `create_time` datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY           `appid_index` (`appid`),
    KEY           `bot_id_index` (`bot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot publishing operation record table';

DROP TABLE IF EXISTS `bot_repo_rel`;
CREATE TABLE `bot_repo_rel`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `bot_id`      bigint       NOT NULL COMMENT 'Bot ID',
    `app_id`      varchar(64)  NOT NULL COMMENT 'App ID',
    `repo_id`     varchar(200) NOT NULL COMMENT 'Repo ID',
    `file_ids`    varchar(500) DEFAULT NULL COMMENT 'File list',
    `create_time` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bot_tool_rel`;
CREATE TABLE `bot_tool_rel`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `bot_id`      bigint       NOT NULL COMMENT 'Bot ID',
    `tool_id`     varchar(100) NOT NULL COMMENT 'Tool ID',
    `create_time` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bot_type_list`;
CREATE TABLE `bot_type_list`
(
    `id`           int NOT NULL AUTO_INCREMENT COMMENT 'Non-business primary key',
    `type_key`     int          DEFAULT NULL COMMENT 'Assistant type code',
    `type_name`    varchar(255) DEFAULT NULL COMMENT 'Assistant type name',
    `order_num`    int          DEFAULT '0' COMMENT 'Sort order number',
    `show_index`   tinyint      DEFAULT '0' COMMENT 'Whether recommended: 1 recommended, 0 not recommended',
    `is_act`       tinyint      DEFAULT '1' COMMENT 'Enable status: 0 disabled, 1 enabled',
    `create_time`  datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`  datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `icon`         varchar(500) DEFAULT '' COMMENT 'Icon URL',
    `type_name_en` varchar(128) DEFAULT NULL COMMENT 'Assistant type English name',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot type mapping table';

DROP TABLE IF EXISTS `chat_bot_api`;
CREATE TABLE `chat_bot_api`
(
    `id`           bigint        NOT NULL AUTO_INCREMENT,
    `uid`          varchar(128)  NOT NULL COMMENT 'User ID',
    `bot_id`       int           NOT NULL COMMENT 'Assistant ID',
    `assistant_id` varchar(32)   NOT NULL COMMENT 'Engineering assistant ID',
    `app_id`       varchar(32)  DEFAULT NULL COMMENT 'App ID associated with assistant API capability',
    `api_secret`   varchar(64)   NOT NULL COMMENT 'API secret',
    `api_key`      varchar(64)   NOT NULL COMMENT 'API key',
    `api_path`     varchar(32)   NOT NULL COMMENT 'Path of assistant API capability',
    `prompt`       varchar(2048) NOT NULL COMMENT 'Prompt of assistant API capability',
    `plugin_id`    varchar(256)  NOT NULL COMMENT 'Plugin ID, multiple separated by commas',
    `embedding_id` varchar(256)  NOT NULL COMMENT 'Embedding ID, multiple separated by commas',
    `description`  varchar(256) DEFAULT NULL COMMENT 'Description',
    `create_time`  datetime     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`  datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_assistant_id` (`assistant_id`),
    KEY            `idx_bot_id` (`bot_id`),
    KEY            `idx_uid` (`uid`),
    KEY            `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot API capability information table';

DROP TABLE IF EXISTS `chat_bot_base`;
CREATE TABLE `chat_bot_base`
(
    `id`                int     NOT NULL AUTO_INCREMENT COMMENT 'bot_id',
    `uid`               varchar(128)     DEFAULT NULL COMMENT 'User ID',
    `bot_name`          varchar(48)      DEFAULT NULL COMMENT 'Bot name',
    `bot_type`          tinyint          DEFAULT NULL COMMENT 'Bot type: 1 custom assistant, 2 life assistant, 3 workplace assistant, 4 marketing assistant, 5 writing expert, 6 knowledge expert',
    `avatar`            varchar(1024)    DEFAULT NULL COMMENT 'Bot avatar',
    `pc_background`     varchar(512)     DEFAULT '' COMMENT 'PC chat background image',
    `app_background`    varchar(512)     DEFAULT '' COMMENT 'Mobile chat background image',
    `background_color`  tinyint          DEFAULT '0' COMMENT 'Background color depth: 0 light, 1 dark',
    `prompt`            varchar(2048)    DEFAULT NULL COMMENT 'bot_prompt',
    `prologue`          varchar(512)     DEFAULT NULL COMMENT 'Opening words',
    `bot_desc`          varchar(255)     DEFAULT NULL COMMENT 'Bot description',
    `is_delete`         tinyint          DEFAULT '0' COMMENT 'Whether deleted: 0 not deleted, 1 deleted',
    `create_time`       datetime         DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`       datetime         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `support_context`   tinyint NOT NULL DEFAULT '0' COMMENT 'Whether supports multi-turn dialogue: 1 support, 0 not support',
    `bot_template`      varchar(255)     DEFAULT '' COMMENT 'Input template',
    `prompt_type`       tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Instruction type: 0 regular (custom instruction), 1 structured instruction',
    `input_example`     varchar(600)     DEFAULT '' COMMENT 'Input example',
    `botweb_status`     tinyint NOT NULL DEFAULT '0' COMMENT 'Whether to enable standalone assistant application: 0 disabled, 1 enabled',
    `version`           int              DEFAULT '1' COMMENT 'Assistant version number',
    `support_document`  tinyint          DEFAULT '0' COMMENT 'Whether supports files: 0 not support, 1 strictly based on document, 2 can give divergent answers',
    `support_system`    tinyint          DEFAULT '0' COMMENT 'Whether supports system instruction: 0 not support, 1 support',
    `prompt_system`     tinyint          DEFAULT '0' COMMENT 'System instruction status',
    `support_upload`    tinyint NOT NULL DEFAULT '0' COMMENT 'Whether supports document upload: 0 not support, 1 support',
    `bot_name_en`       varchar(48)      DEFAULT NULL COMMENT 'Assistant name English version',
    `bot_desc_en`       varchar(500)     DEFAULT NULL COMMENT 'Assistant description English version',
    `client_type`       tinyint NOT NULL DEFAULT '0' COMMENT 'Client type',
    `vcn_cn`            varchar(32)      DEFAULT NULL COMMENT 'Chinese voice actor',
    `vcn_en`            varchar(32)      DEFAULT NULL COMMENT 'English voice actor',
    `vcn_speed`         tinyint NOT NULL DEFAULT '50' COMMENT 'Voice actor speed',
    `is_sentence`       tinyint NOT NULL DEFAULT '0' COMMENT 'Whether generated in one sentence: 0 no, 1 yes',
    `opened_tool`       varchar(128)     DEFAULT 'ifly_search,text_to_image,codeinterpreter' COMMENT 'Enabled tools, concatenated with commas',
    `client_hide`       varchar(10)      DEFAULT '' COMMENT 'Hidden on some clients',
    `virtual_bot_type`  tinyint          DEFAULT NULL COMMENT 'Virtual personality type',
    `virtual_agent_id`  bigint           DEFAULT NULL COMMENT 'Primary key of virtual_agent_list',
    `style`             int              DEFAULT NULL COMMENT 'Style type: 0 original, 1 business elite, 2 casual moment',
    `background`        varchar(512)     DEFAULT NULL COMMENT 'Background setting',
    `virtual_character` varchar(512)     DEFAULT NULL COMMENT 'Character setting',
    `model`             varchar(32)      DEFAULT 'spark' COMMENT 'Model selected by assistant',
    `maas_bot_id`       varchar(50)      DEFAULT NULL COMMENT 'maas_bot_id',
    `prologue_en`       varchar(1024)    DEFAULT NULL COMMENT 'Opening words - English',
    `input_example_en`  varchar(1024)    DEFAULT NULL COMMENT 'Recommended questions - English',
    `space_id`          bigint           DEFAULT NULL COMMENT 'Space ID',
    `model_id`          bigint           DEFAULT NULL COMMENT 'Custom model ID',
    PRIMARY KEY (`id`),
    KEY                 `idx_create_time` (`create_time`),
    KEY                 `idx_support_context` (`support_context`),
    KEY                 `idx_uid` (`uid`),
    KEY                 `idx_botweb_status` (`botweb_status`),
    KEY                 `idx_space_id` (`space_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User created bot table';

DROP TABLE IF EXISTS `chat_bot_list`;
CREATE TABLE `chat_bot_list`
(
    `id`              int     NOT NULL AUTO_INCREMENT,
    `uid`             varchar(128)     DEFAULT NULL COMMENT 'User ID',
    `market_bot_id`   int              DEFAULT '0' COMMENT 'Market bot ID, 0 for original, other values for referencing other users bots',
    `real_bot_id`     int              DEFAULT '0' COMMENT 'Self-created assistant is 0, only when adding others assistants from market, the original bot_id is added',
    `name`            varchar(48)      DEFAULT NULL COMMENT 'Bot name',
    `bot_type`        tinyint          DEFAULT '1' COMMENT 'Bot type: 1 custom assistant, 2 life assistant, 3 workplace assistant, 4 marketing assistant, 5 writing expert, 6 knowledge expert',
    `avatar`          varchar(1024)    DEFAULT NULL COMMENT 'Bot avatar',
    `prompt`          varchar(2048)    DEFAULT NULL COMMENT 'bot_prompt',
    `bot_desc`        varchar(255)     DEFAULT NULL COMMENT 'Bot description',
    `is_act`          tinyint          DEFAULT '1' COMMENT 'Whether enabled: 0 disabled, 1 enabled',
    `create_time`     datetime         DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`     datetime         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `support_context` tinyint NOT NULL DEFAULT '0' COMMENT 'Whether supports multi-turn dialogue: 1 support, 0 not support',
    PRIMARY KEY (`id`),
    KEY               `idx_act` (`is_act`),
    KEY               `idx_create_time2` (`create_time`),
    KEY               `idx_real_bot_id` (`real_bot_id`),
    KEY               `idx_uid` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User added bot table';

DROP TABLE IF EXISTS `chat_bot_market`;
CREATE TABLE `chat_bot_market`
(
    `id`               int     NOT NULL AUTO_INCREMENT,
    `bot_id`           int                                                          DEFAULT NULL COMMENT 'botId',
    `uid`              varchar(128)                                                 DEFAULT NULL COMMENT 'Publisher UID',
    `bot_name`         varchar(48)                                                  DEFAULT NULL COMMENT 'Bot name, this is a copy, original is with creator',
    `bot_type`         tinyint                                                      DEFAULT '1' COMMENT 'Bot type: 1 custom assistant, 2 life assistant, 3 workplace assistant, 4 marketing assistant, 5 writing expert, 6 knowledge expert',
    `avatar`           varchar(1024)                                                DEFAULT NULL COMMENT 'Bot avatar',
    `pc_background`    varchar(512)                                                 DEFAULT '' COMMENT 'PC chat background image',
    `app_background`   varchar(512)                                                 DEFAULT '' COMMENT 'Mobile chat background image',
    `background_color` tinyint                                                      DEFAULT '0' COMMENT 'Background color depth: 0 light, 1 dark',
    `prompt`           varchar(2048)                                                DEFAULT NULL COMMENT 'bot_prompt',
    `prologue`         varchar(512)                                                 DEFAULT NULL COMMENT 'Opening words',
    `show_others`      tinyint                                                      DEFAULT NULL COMMENT 'Whether to show prompt to others: 1 show, 0 not show',
    `bot_desc`         varchar(255)                                                 DEFAULT NULL COMMENT 'Bot description',
    `bot_status`       tinyint                                                      DEFAULT '1' COMMENT 'Bot status: 0 delisted, 1 under review, 2 approved, 3 rejected, 4 modification under review (to be displayed)',
    `block_reason`     varchar(255)                                                 DEFAULT NULL COMMENT 'Reason for rejection',
    `hot_num`          int                                                          DEFAULT '0' COMMENT 'Popularity, customizable size for sorting',
    `is_delete`        tinyint                                                      DEFAULT '0' COMMENT 'Application history: 0 not deleted, 1 deleted',
    `show_index`       tinyint                                                      DEFAULT '0' COMMENT 'Whether to display on homepage recommendation: 0 not display, 1 display',
    `sort_hot`         int                                                          DEFAULT '0' COMMENT 'Manually set hottest bot position',
    `sort_latest`      int                                                          DEFAULT '0' COMMENT 'Manually set latest bot position',
    `audit_time`       datetime                                                     DEFAULT NULL COMMENT 'Review time',
    `create_time`      datetime                                                     DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`      datetime                                                     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `support_context`  tinyint NOT NULL                                             DEFAULT '0' COMMENT 'Whether supports multi-turn dialogue: 1 support, 0 not support',
    `version`          int                                                          DEFAULT '1' COMMENT 'Corresponding large model version, 13, 65, unit: billion',
    `show_weight`      int                                                          DEFAULT '1' COMMENT 'Homepage recommended assistant weight, larger number comes first',
    `score`            int                                                          DEFAULT NULL COMMENT 'Score given upon approval',
    `client_hide`      varchar(10)                                                  DEFAULT '' COMMENT 'Hidden on some clients',
    `model`            varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Corresponding large model type',
    `opened_tool`      varchar(255)                                                 DEFAULT NULL COMMENT 'Enabled tools',
    `publish_channels` varchar(255)                                                 DEFAULT NULL COMMENT 'Publishing channels: MARKET,API,WECHAT,MCP comma separated',
    `model_id`         bigint                                                       DEFAULT NULL COMMENT 'Custom model ID',
    `support_document`  tinyint NOT NULL                                             DEFAULT '0' COMMENT 'Does it support the knowledge base? 0 - Not supported, 1 - Supported',
    PRIMARY KEY (`id`),
    KEY                `idx_bot_id` (`bot_id`),
    KEY                `idx_create_time3` (`create_time`),
    KEY                `uid_index` (`uid`),
    KEY                `idx_bot_status` (`bot_status`,`bot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bot market table';

DROP TABLE IF EXISTS `chat_bot_prompt_struct`;
CREATE TABLE `chat_bot_prompt_struct`
(
    `id`           bigint                                                         NOT NULL AUTO_INCREMENT,
    `bot_id`       int                                                            NOT NULL COMMENT 'chat_bot_id.id',
    `prompt_key`   varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci   NOT NULL COMMENT 'Custom instruction - key',
    `prompt_value` varchar(2550) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT 'Custom instruction - value',
    `create_time`  datetime                                                                DEFAULT NULL,
    `update_time`  datetime                                                                DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY            `idx_bot_id` (`bot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Structured instruction';

DROP TABLE IF EXISTS `chat_bot_remove`;
CREATE TABLE `chat_bot_remove`
(
    `id`           int NOT NULL AUTO_INCREMENT,
    `bot_id`       int           DEFAULT NULL COMMENT 'botId',
    `uid`          varchar(128)  DEFAULT NULL COMMENT 'Publisher UID',
    `bot_name`     varchar(48)   DEFAULT NULL COMMENT 'Bot name, this is a copy, original is with creator',
    `bot_type`     tinyint       DEFAULT '1' COMMENT 'Bot type: 1 custom assistant, 2 life assistant, 3 workplace assistant, 4 marketing assistant, 5 writing expert, 6 knowledge expert',
    `avatar`       varchar(512)  DEFAULT NULL COMMENT 'Bot avatar URL',
    `prompt`       varchar(2048) DEFAULT NULL COMMENT 'bot_prompt',
    `bot_desc`     varchar(255)  DEFAULT NULL COMMENT 'Bot description',
    `block_reason` varchar(255)  DEFAULT NULL COMMENT 'Reason for rejection',
    `is_delete`    tinyint       DEFAULT '0' COMMENT 'Application history: 0 not deleted, 1 deleted',
    `audit_time`   datetime      DEFAULT NULL COMMENT 'Review time',
    `create_time`  datetime      DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`  datetime      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY            `idx_bot_id` (`bot_id`),
    KEY            `idx_bot_type` (`bot_type`),
    KEY            `idx_create_time4` (`create_time`),
    KEY            `uid_index` (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Delisted bot history table';

DROP TABLE IF EXISTS `create_bot_context`;
CREATE TABLE `create_bot_context`
(
    `chat_id`      varchar(255) NOT NULL,
    `step`         tinyint  DEFAULT NULL,
    `biz_data`     json     DEFAULT NULL,
    `create_time`  datetime DEFAULT NULL,
    `update_time`  datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    `chat_history` text,
    PRIMARY KEY (`chat_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `spark_bot`;
CREATE TABLE `spark_bot`
(
    `id`             bigint      NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `uuid`           varchar(64)          DEFAULT NULL,
    `name`           varchar(64) NOT NULL COMMENT 'Robot name',
    `user_id`        varchar(20)          DEFAULT NULL,
    `app_id`         varchar(50) NOT NULL,
    `description`    varchar(255)         DEFAULT NULL COMMENT 'Description',
    `avatar_icon`    varchar(255)         DEFAULT NULL COMMENT 'Avatar icon',
    `color`          varchar(10)          DEFAULT NULL,
    `floating_icon`  varchar(255)         DEFAULT NULL COMMENT 'Floating window icon',
    `greeting`       varchar(128)         DEFAULT NULL COMMENT 'Greeting',
    `floated`        tinyint(1) DEFAULT '0' COMMENT 'Whether set as floating robot 0: not set, 1: set',
    `deleted`        tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether deleted: 1-deleted, 0-not deleted',
    `create_time`    timestamp NULL DEFAULT NULL COMMENT 'Creation time',
    `update_time`    timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `recommend_ques` text,
    `is_public`      tinyint     NOT NULL DEFAULT '0' COMMENT 'Whether public bot: 0 no, 1 yes',
    `bot_tag`        varchar(100)         DEFAULT NULL COMMENT 'Bot tag',
    `user_count`     int                  DEFAULT '0' COMMENT 'User count',
    `dialog_count`   int                  DEFAULT '0' COMMENT 'Conversation count',
    `favorite_count` int                  DEFAULT '0' COMMENT 'Favorite count',
    `public_id`      bigint               DEFAULT NULL COMMENT 'Public bot ID',
    `app_updatable`  bit(1)               DEFAULT b'0',
    `top`            bit(1)               DEFAULT b'0',
    `eval_set_id`    bigint               DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_favorite_bot`;
CREATE TABLE `user_favorite_bot`
(
    `id`           bigint    NOT NULL AUTO_INCREMENT,
    `user_id`      bigint    NOT NULL,
    `bot_id`       bigint    NOT NULL,
    `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `use_flag`     tinyint            DEFAULT '0',
    `is_deleted`   tinyint            DEFAULT '0',
    PRIMARY KEY (`id`),
    KEY            `idx_user_favorite_bot_user_id` (`user_id`),
    KEY            `idx_user_favorite_bot_bot_id` (`bot_id`),
    CONSTRAINT `user_favorite_bot_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `system_user` (`id`),
    CONSTRAINT `user_favorite_bot_ibfk_2` FOREIGN KEY (`bot_id`) REFERENCES `spark_bot` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bot_template (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Template ID',
    bot_name VARCHAR(32) NOT NULL COMMENT 'Template name',
    bot_desc VARCHAR(200) COMMENT 'Function description',
    bot_template TEXT COMMENT 'Input template',
    bot_type INT NOT NULL COMMENT 'Bot type',
    bot_type_name VARCHAR(50) COMMENT 'Type name',
    input_example TEXT COMMENT 'Input examples (JSON array string)',
    prompt TEXT COMMENT 'Prompt text',
    prompt_struct_list TEXT COMMENT 'Structured prompts (JSON array string)',
    prompt_type INT DEFAULT 0 COMMENT 'Prompt type',
    support_context INT DEFAULT 0 COMMENT 'Support context',
    bot_status INT DEFAULT 1 COMMENT 'Template status: 1-enabled, 0-disabled',
    language VARCHAR(10) DEFAULT 'zh' COMMENT 'Language identifier: zh-Chinese, en-English',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bot_status (bot_status),
    INDEX idx_bot_type (bot_type),
    INDEX idx_language (language),
    INDEX idx_status_lang (bot_status, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bot template table';

