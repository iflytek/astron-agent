-- Migration script for init_model

DROP TABLE IF EXISTS `base_model_map`;
CREATE TABLE `base_model_map`
(
    `id`              int unsigned NOT NULL AUTO_INCREMENT,
    `create_time`     datetime NOT NULL                                             DEFAULT CURRENT_TIMESTAMP,
    `domain`          varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    `base_model_id`   bigint                                                        DEFAULT NULL,
    `base_model_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `chat_req_model`;
CREATE TABLE `chat_req_model`
(
    `id`          int          NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) NOT NULL COMMENT 'User ID',
    `chat_id`     bigint                DEFAULT NULL COMMENT 'Chat window ID',
    `chat_req_id` bigint       NOT NULL COMMENT 'Chat request ID',
    `type`        tinyint      NOT NULL DEFAULT '1' COMMENT 'Multimodal type, refer to MultiModelEnum',
    `url`         varchar(2048)         DEFAULT NULL COMMENT 'Resource URL',
    `status`      tinyint      NOT NULL DEFAULT '0' COMMENT 'Review status',
    `need_his`    tinyint               DEFAULT '1' COMMENT 'Whether to concatenate history: 0 no, 1 yes',
    `img_desc`    varchar(2048)         DEFAULT NULL COMMENT 'Image and other multimodal input description',
    `intention`   varchar(255)          DEFAULT NULL COMMENT 'Image intention: document for documents, universal for natural images',
    `ocr_result`  text COMMENT 'OCR recognition result',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Modification time',
    `data_id`     varchar(64)           DEFAULT NULL COMMENT 'Multimodal image ID, stores sse ID here, identifies which image for engineering institute',
    PRIMARY KEY (`id`, `create_time`),
    KEY           `idx_uid` (`uid`),
    KEY           `idx_req_id` (`chat_req_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Multimodal request table';

DROP TABLE IF EXISTS `chat_resp_model`;
CREATE TABLE `chat_resp_model`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) NOT NULL COMMENT 'User ID',
    `chat_id`     bigint                DEFAULT NULL COMMENT 'Chat window ID',
    `req_id`      bigint       NOT NULL COMMENT 'Chat question ID, multimodal records may be stored before answers, so use req ID for association',
    `content`     varchar(8000)         DEFAULT NULL COMMENT 'Multimodal return content',
    `type`        varchar(32)  NOT NULL DEFAULT 'text' COMMENT 'Multimodal output type: text, image, audio, video',
    `need_his`    tinyint               DEFAULT '1' COMMENT 'Whether to concatenate history: 0 no, 1 yes',
    `url`         text COMMENT 'Multimodal resource URL address',
    `status`      tinyint      NOT NULL DEFAULT '0' COMMENT 'Resource status: 0 available, 1 unavailable',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Modification time',
    `data_id`     varchar(64)           DEFAULT NULL COMMENT 'Large model generated resource ID, to be passed back for concatenating history',
    `water_url`   text COMMENT 'Watermarked resource URL',
    PRIMARY KEY (`id`, `create_time`),
    KEY           `idx_uid` (`uid`),
    KEY           `idx_chat_id` (`chat_id`),
    KEY           `idx_create_time` (`create_time`),
    KEY           `idx_req_id` (`req_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Multimodal response record table';

DROP TABLE IF EXISTS `model`;
CREATE TABLE `model`
(
    `id`                bigint       NOT NULL AUTO_INCREMENT COMMENT 'Shelf model ID',
    `name`              varchar(255)          DEFAULT NULL COMMENT 'Model name',
    `desc`              varchar(1024)         DEFAULT NULL COMMENT 'Model description, text description below model plaza card and name',
    `source`            int                   DEFAULT NULL COMMENT 'Model source: 1 self-developed, 2 open source, 3 third party',
    `uid`               varchar(128) NOT NULL COMMENT 'User ID',
    `type`              int                   DEFAULT NULL COMMENT 'Model type: 1 text interaction, 2 voice, 3 interaction, 4 multimodal',
    `url`               varchar(255)          DEFAULT NULL COMMENT 'Model call address',
    `domain`            varchar(100)          DEFAULT NULL COMMENT 'model',
    `api_key`           varchar(255)          DEFAULT NULL,
    `sub_type`          bigint                DEFAULT NULL COMMENT 'Model subtype: 1 image generation, 2 image understanding, 3 super-human synthesis, 4 image classification',
    `content`           text COMMENT 'Model details text',
    `is_deleted`        bit(1)       NOT NULL DEFAULT b'0' COMMENT 'Whether deleted: 0 not deleted, 1 deleted',
    `image_url`         varchar(255)          DEFAULT NULL,
    `doc_url`           varchar(255)          DEFAULT NULL,
    `remark`            varchar(255)          DEFAULT NULL,
    `sort`              int                   DEFAULT '0' COMMENT 'Sort order',
    `channel`           varchar(255)          DEFAULT '0' COMMENT 'Model channel',
    `tag`               varchar(255)          DEFAULT NULL COMMENT 'Tag',
    `color`             varchar(100)          DEFAULT NULL COMMENT 'Color',
    `create_time`       datetime              DEFAULT NULL,
    `update_time`       datetime              DEFAULT NULL,
    `config`            text COMMENT 'Model configuration',
    `space_id`          bigint                DEFAULT NULL COMMENT 'Space ID',
    `enable`            bit(1)                DEFAULT b'1' COMMENT 'Whether enabled',
    `status`            int                   DEFAULT NULL,
    `accelerator_count` int                   DEFAULT NULL COMMENT 'Performance configuration',
    `replica_count`     int                   DEFAULT NULL COMMENT 'Replica configuration',
    `model_path`        varchar(100)          DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `model_category`;
CREATE TABLE `model_category`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `pid`         bigint       NOT NULL,
    `key`         varchar(100) NOT NULL DEFAULT '',
    `name`        varchar(255) NOT NULL,
    `is_delete`   tinyint unsigned NOT NULL DEFAULT '0',
    `create_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `sort_order`  int          NOT NULL DEFAULT '0' COMMENT 'Sort order',
    PRIMARY KEY (`id`) USING BTREE,
    KEY           `idx_key_pid_delete` (`key`,`pid`,`is_delete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `model_category_rel`;
CREATE TABLE `model_category_rel`
(
    `id`          bigint   NOT NULL AUTO_INCREMENT,
    `model_id`    bigint   NOT NULL,
    `category_id` bigint   NOT NULL,
    `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_model_id_category_id` (`model_id`,`category_id`),
    KEY           `idx_category` (`category_id`),
    KEY           `idx_model` (`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `model_common`;
CREATE TABLE `model_common`
(
    `id`             bigint       NOT NULL AUTO_INCREMENT,
    `name`           varchar(128) NOT NULL DEFAULT '',
    `desc`           varchar(500)          DEFAULT NULL COMMENT 'Description',
    `intro`          varchar(255) NOT NULL DEFAULT '' COMMENT 'Introduction',
    `user_name`      varchar(64)  NOT NULL DEFAULT '' COMMENT 'User name',
    `user_avatar`    varchar(255) NOT NULL DEFAULT '' COMMENT 'User avatar',
    `service_id`     varchar(128) NOT NULL DEFAULT '',
    `server_id`      varchar(128) NOT NULL DEFAULT '',
    `domain`         varchar(128) NOT NULL DEFAULT '',
    `lic_channel`    varchar(128) NOT NULL DEFAULT '',
    `llm_source`     varchar(128) NOT NULL DEFAULT '',
    `url`            varchar(128) NOT NULL DEFAULT '',
    `model_type`     tinyint      NOT NULL DEFAULT '0',
    `type`           tinyint      NOT NULL DEFAULT '0',
    `source`         tinyint      NOT NULL DEFAULT '0',
    `is_think`       tinyint      NOT NULL DEFAULT '0',
    `multi_mode`     tinyint      NOT NULL DEFAULT '0',
    `is_delete`      tinyint      NOT NULL DEFAULT '0',
    `create_by`      bigint       NOT NULL DEFAULT '0',
    `create_time`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_by`      bigint       NOT NULL DEFAULT '0',
    `update_time`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `uid`            varchar(128)          DEFAULT NULL COMMENT 'User control ID',
    `disclaimer`     varchar(2048)         DEFAULT '' COMMENT 'Disclaimer',
    `config`         text COMMENT 'Model configuration information',
    `shelf_status`   int                   DEFAULT '0' COMMENT 'Shelf status: 0 on shelf, 1 pending removal, 2 removed',
    `shelf_off_time` datetime              DEFAULT NULL COMMENT 'Removal time',
    `http_url`       varchar(100)          DEFAULT NULL COMMENT 'HTTP address',
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `model_custom_category`;
CREATE TABLE `model_custom_category`
(
    `id`           bigint       NOT NULL AUTO_INCREMENT,
    `owner_uid`    varchar(128) NOT NULL COMMENT 'Creator',
    `key`          varchar(100) NOT NULL DEFAULT '' COMMENT 'model_category / scene',
    `name`         varchar(255) NOT NULL,
    `pid`          bigint                DEFAULT NULL COMMENT 'Optional: attach to an official node',
    `normalized`   varchar(255) GENERATED ALWAYS AS (lower(trim(`name`))) VIRTUAL,
    `audit_status` tinyint unsigned NOT NULL DEFAULT '1' COMMENT '1=effective, 0=blocked, 2=pending review',
    `is_delete`    tinyint unsigned NOT NULL DEFAULT '0',
    `create_time`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY            `idx_key_status` (`key`,`audit_status`),
    KEY            `idx_owner` (`owner_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `model_custom_category_rel`;
CREATE TABLE `model_custom_category_rel`
(
    `id`          bigint   NOT NULL AUTO_INCREMENT,
    `model_id`    bigint   NOT NULL,
    `custom_id`   bigint   NOT NULL,
    `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_model_custom` (`model_id`,`custom_id`),
    KEY           `idx_custom` (`custom_id`),
    CONSTRAINT `fk_rel_custom` FOREIGN KEY (`custom_id`) REFERENCES `model_custom_category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `model_list_config`;
CREATE TABLE `model_list_config`
(
    `id`            int unsigned NOT NULL AUTO_INCREMENT,
    `create_time`   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `node_type`     varchar(255)       DEFAULT NULL,
    `name`          varchar(255)       DEFAULT NULL,
    `description`   varchar(255)       DEFAULT NULL,
    `tag`           varchar(255)       DEFAULT NULL,
    `deleted`       bit(1)             DEFAULT b'0',
    `base_model_id` bigint             DEFAULT NULL,
    `recommended`   bit(1)             DEFAULT b'0',
    `domain`        varchar(255)       DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

