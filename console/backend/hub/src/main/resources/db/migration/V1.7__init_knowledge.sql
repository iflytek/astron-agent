-- Migration script for init_knowledge

DROP TABLE IF EXISTS `chat_file_req`;
CREATE TABLE `chat_file_req`
(
    `id`            bigint       NOT NULL AUTO_INCREMENT,
    `file_id`       varchar(64)  NOT NULL COMMENT 'Document Q&A file ID',
    `chat_id`       bigint       NOT NULL COMMENT 'Chat ID',
    `req_id`        bigint                DEFAULT NULL COMMENT 'req_id',
    `uid`           varchar(128) NOT NULL COMMENT 'Owner UID',
    `create_time`   datetime              DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`   datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `client_type`   tinyint      NOT NULL DEFAULT '0' COMMENT 'Client type: 0 unknown, 1 PC, 2 H5 mainly for statistics',
    `deleted`       tinyint      NOT NULL DEFAULT '0' COMMENT 'Whether deleted: 0 not deleted, 1 deleted',
    `business_type` tinyint      NOT NULL DEFAULT '0' COMMENT 'Document type: 0 long document, 1 long audio, 2 long video, 3 OCR',
    PRIMARY KEY (`id`),
    KEY             `idx_chatid_uid_fileid` (`chat_id`,`uid`,`file_id`),
    KEY             `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chatfile Q&A binding information';

DROP TABLE IF EXISTS `chat_file_user`;
CREATE TABLE `chat_file_user`
(
    `id`                  bigint       NOT NULL AUTO_INCREMENT,
    `file_id`             varchar(64)           DEFAULT NULL COMMENT 'Document Q&A file ID',
    `uid`                 varchar(128) NOT NULL COMMENT 'Owner UID',
    `file_url`            varchar(1024)         DEFAULT NULL COMMENT 'File URL',
    `file_name`           varchar(128)          DEFAULT NULL COMMENT 'File name',
    `file_size`           bigint                DEFAULT NULL COMMENT 'File size',
    `file_pdf_url`        varchar(1024)         DEFAULT NULL COMMENT 'File PDF URL',
    `create_time`         datetime              DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`         datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `deleted`             tinyint      NOT NULL DEFAULT '0' COMMENT 'Whether deleted: 0 not deleted, 1 deleted',
    `client_type`         tinyint      NOT NULL DEFAULT '0' COMMENT 'Client type: 0 unknown, 1 PC, 2 H5 mainly for statistics',
    `business_type`       tinyint      NOT NULL DEFAULT '0' COMMENT 'Document type: 0 long document, 1 long audio, 2 long video, 3 OCR',
    `display`             tinyint      NOT NULL DEFAULT '0' COMMENT 'Whether to display in history knowledge base: 0 display, 1 not display',
    `file_status`         tinyint      NOT NULL DEFAULT '1' COMMENT 'Document status: 0 unprocessed, 1 processing, 2 completed, 3 failed',
    `file_business_key`   varchar(1024)         DEFAULT NULL COMMENT 'Frontend maintained file unique key',
    `extra_link`          varchar(1024)         DEFAULT NULL COMMENT 'Video external link processing',
    `document_type`       tinyint               DEFAULT '1' COMMENT 'Document classification: 1 Spark document, 2 Zhiwen, see light_app_detail.additional_info field',
    `file_index`          int                   DEFAULT NULL COMMENT 'Daily upload count per user',
    `scene_type_id`       bigint                DEFAULT NULL COMMENT 'File scenario: related to document_scene_type table',
    `icon`                varchar(1024)         DEFAULT NULL COMMENT 'Favorite icon display',
    `collect_origin_from` varchar(1024)         DEFAULT NULL COMMENT 'Favorite content source',
    `task_id`             varchar(100)          DEFAULT NULL COMMENT 'RAG-v2 version task ID',
    PRIMARY KEY (`id`),
    KEY                   `chat_file_user_file_id_IDX` (`file_id`) USING BTREE,
    KEY                   `chat_file_user_uid_IDX` (`uid`) USING BTREE,
    KEY                   `chat_file_user_create_time_IDX` (`create_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User file information';

DROP TABLE IF EXISTS `dataset_file`;
CREATE TABLE `dataset_file`
(
    `id`            bigint        NOT NULL AUTO_INCREMENT COMMENT 'File ID',
    `dataset_id`    bigint        NOT NULL COMMENT 'Dataset ID',
    `dataset_index` varchar(255)           DEFAULT NULL COMMENT 'Dataset index',
    `name`          varchar(128)  NOT NULL COMMENT 'File name',
    `doc_type`      varchar(32)   NOT NULL COMMENT 'File type',
    `doc_url`       varchar(2048) NOT NULL COMMENT 'File URL',
    `s3_url`        varchar(2048)          DEFAULT NULL COMMENT 'S3 file URL',
    `para_count`    int                    DEFAULT NULL COMMENT 'Paragraph count',
    `char_count`    int                    DEFAULT NULL COMMENT 'Character count',
    `status`        tinyint       NOT NULL DEFAULT '0' COMMENT 'Status: -1 deleted, 0 unprocessed, 1 processing, 2 completed, 3 failed',
    `create_time`   datetime               DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`   datetime               DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY             `idx_dataset_id` (`dataset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Private dataset file table';

DROP TABLE IF EXISTS `dataset_info`;
CREATE TABLE `dataset_info`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT COMMENT 'Dataset ID',
    `uid`         varchar(128) NOT NULL COMMENT 'User ID',
    `name`        varchar(128) NOT NULL COMMENT 'Dataset name',
    `description` varchar(256)          DEFAULT NULL COMMENT 'Dataset description',
    `file_num`    int                   DEFAULT NULL COMMENT 'File count',
    `status`      tinyint      NOT NULL DEFAULT '0' COMMENT 'Status: -1 deleted, 0 unprocessed, 1 processing, 2 completed, 3 failed',
    `create_time` datetime              DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time` datetime              DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY           `idx_uid` (`uid`),
    KEY           `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Private dataset information table';

DROP TABLE IF EXISTS `extract_knowledge_task`;
CREATE TABLE `extract_knowledge_task`
(
    `id`          bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `file_id`     bigint       DEFAULT NULL COMMENT 'File ID',
    `task_id`     varchar(64)  DEFAULT NULL COMMENT 'Task ID',
    `status`      int          DEFAULT '0' COMMENT '0: default, 1: success, 2: failed',
    `reason`      text,
    `user_id`     varchar(128) DEFAULT NULL COMMENT 'User ID',
    `create_time` timestamp NULL DEFAULT NULL COMMENT 'Creation time',
    `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `task_status` int          DEFAULT NULL COMMENT 'Task execution status: 0 start parsing, 1 parsing completed, 2 start embedding, 3 embedding completed',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `file_directory_tree`;
CREATE TABLE `file_directory_tree`
(
    `id`          bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key for directory',
    `name`        varchar(255) DEFAULT NULL COMMENT 'Directory name',
    `parent_id`   bigint       DEFAULT NULL COMMENT 'Parent directory ID, -1 for root directory',
    `is_file`     tinyint(1) DEFAULT '0' COMMENT 'Whether it is a file, 0 for false (default folder), 1 for true (file)',
    `app_id`      varchar(10)  DEFAULT NULL COMMENT 'Associated app ID',
    `file_id`     bigint       DEFAULT NULL COMMENT 'Associated file ID, only when is_file is 1',
    `comment`     varchar(255) DEFAULT NULL COMMENT 'Remarks, changes can be synced here',
    `create_time` timestamp NULL DEFAULT NULL COMMENT 'Creation time',
    `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `hit_count`   int          DEFAULT '0' COMMENT 'Hit count',
    `status`      tinyint(1) DEFAULT '0' COMMENT 'Status: 0 slice state, 1 embedding state',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `file_info`;
CREATE TABLE `file_info`
(
    `id`          bigint    NOT NULL AUTO_INCREMENT,
    `app_id`      varchar(10)        DEFAULT NULL,
    `name`        varchar(128)       DEFAULT NULL,
    `address`     varchar(255)       DEFAULT NULL,
    `size`        bigint             DEFAULT NULL,
    `type`        varchar(64)        DEFAULT NULL,
    `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `source_id`   varchar(255)       DEFAULT NULL,
    `status`      int                DEFAULT NULL,
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

DROP TABLE IF EXISTS `file_info_v2`;
CREATE TABLE `file_info_v2`
(
    `id`                   bigint      NOT NULL AUTO_INCREMENT,
    `repo_id`              bigint      NOT NULL COMMENT 'Identifies the folder to which the file belongs',
    `uuid`                 varchar(64)          DEFAULT NULL,
    `uid`                  varchar(255)         DEFAULT NULL COMMENT 'User ID',
    `name`                 varchar(512)         DEFAULT NULL COMMENT 'File name',
    `address`              varchar(255)         DEFAULT NULL COMMENT 'File storage address',
    `size`                 bigint               DEFAULT NULL COMMENT 'File size',
    `char_count`           bigint               DEFAULT NULL COMMENT 'File character length',
    `type`                 varchar(64)          DEFAULT NULL COMMENT 'File type',
    `status`               int                  DEFAULT NULL COMMENT 'File build status: -1 uploaded, 0 parsing, 1 parse failed, 2 parse success, 3 embedding, 4 embed failed, 5 embed success',
    `enabled`              int                  DEFAULT '0' COMMENT '0: disabled, 1: enabled',
    `slice_config`         varchar(500)         DEFAULT NULL COMMENT 'Latest slice configuration',
    `current_slice_config` varchar(500)         DEFAULT NULL COMMENT 'Currently effective slice configuration',
    `pid`                  bigint               DEFAULT '-1' COMMENT 'Identifies the folder to which the file belongs',
    `reason`               text COMMENT 'Failure reason',
    `create_time`          timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `update_time`          timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `source`               varchar(64) NOT NULL DEFAULT 'AIUI-RAG2' COMMENT 'Data source',
    `space_id`             bigint               DEFAULT NULL COMMENT 'Team space ID',
    `last_uuid`            varchar(100)         DEFAULT NULL COMMENT 'UUID generated by CBG parsing, used for preview, updated to uuid after embedding',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `knowledge`;
CREATE TABLE `knowledge` (
                             `id` varchar(64) NOT NULL COMMENT 'Primary key ID',
                             `file_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'User ID',
                             `content` text,
                             `char_count` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
                             `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
                             `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
                             `enabled` bit(1) DEFAULT b'0',
                             `source` bit(1) DEFAULT b'1',
                             `test_hit_count` bigint DEFAULT NULL,
                             `dialog_hit_count` bigint DEFAULT NULL,
                             `core_repo_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
                             `deleted` bit(1) NOT NULL DEFAULT b'0',
                             `created_at` datetime NOT NULL,
                             `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                             `seq_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment sequence ID to preserve insertion order',
                             PRIMARY KEY (`id`),
                             UNIQUE KEY `uk_seq_id` (`seq_id`),
                             KEY `flow_id` (`char_count`) USING BTREE,
                             KEY `idx_file_seq` (`file_id`,`seq_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9660 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `preview_knowledge`;
CREATE TABLE `preview_knowledge` (
                                     `id` varchar(64) NOT NULL COMMENT 'Primary key ID',
                                     `file_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'User ID',
                                     `content` text,
                                     `char_count` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
                                     `deleted` bit(1) NOT NULL DEFAULT b'0',
                                     `created_at` datetime NOT NULL,
                                     `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                                     `seq_id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Auto-increment sequence ID to preserve insertion order',
                                     PRIMARY KEY (`id`),
                                     UNIQUE KEY `uk_seq_id` (`seq_id`),
                                     KEY `flow_id` (`char_count`) USING BTREE,
                                     KEY `idx_file_seq` (`file_id`,`seq_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14591 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `repo`;
CREATE TABLE `repo`
(
    `id`             bigint      NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `name`           varchar(64)          DEFAULT NULL COMMENT 'Robot name',
    `user_id`        varchar(128)         DEFAULT NULL,
    `app_id`         varchar(20)          DEFAULT NULL,
    `outer_repo_id`  varchar(50)          DEFAULT NULL,
    `core_repo_id`   varchar(50)          DEFAULT NULL,
    `description`    varchar(255)         DEFAULT NULL COMMENT 'Description',
    `icon`           varchar(255)         DEFAULT NULL COMMENT 'Avatar icon',
    `color`          varchar(10)          DEFAULT NULL,
    `status`         int                  DEFAULT '0' COMMENT '1: Created 2: Published 3: Offline 4: Deleted',
    `embedded_model` varchar(20)          DEFAULT NULL COMMENT 'Embedded model',
    `index_type`     int                  DEFAULT NULL COMMENT 'Index method 0: High quality 1: Low quality',
    `visibility`     int                  DEFAULT '0' COMMENT 'Visibility 0: Only visible to self 1: Visible to some users',
    `source`         int                  DEFAULT '0' COMMENT 'Source 0: Web created 1: API created',
    `enable_audit`   tinyint(1) DEFAULT '0' COMMENT 'Whether to enable content review 0: Disable 1: Enable (default)',
    `deleted`        tinyint(1) DEFAULT '0' COMMENT 'Whether deleted: 1-Deleted, 0-Not deleted',
    `create_time`    timestamp NULL DEFAULT NULL COMMENT 'Creation time',
    `update_time`    timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `is_top`         bit(1)               DEFAULT b'0',
    `tag`            varchar(64) NOT NULL DEFAULT 'CBG-RAG' COMMENT 'Knowledge base type tag, CBG-RAG: CBG knowledge base, AIUI-RAG2: AIUI knowledge base',
    `space_id`       bigint               DEFAULT NULL COMMENT 'Team space ID',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `req_knowledge_records`;
CREATE TABLE `req_knowledge_records`
(
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `uid`         varchar(128) DEFAULT NULL,
    `req_id`      bigint        DEFAULT NULL COMMENT 'Primary key of user question, corresponding to primary key ID of user question table',
    `req_message` varchar(8000) DEFAULT NULL COMMENT 'User question content',
    `knowledge`   varchar(4096) DEFAULT NULL COMMENT 'Retrieved knowledge',
    `create_time` datetime      DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `chat_id`     bigint        DEFAULT NULL COMMENT 'Chat window ID, chat_list primary key',
    PRIMARY KEY (`id`),
    KEY           `idx_uid_req` (`uid`,`req_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Knowledge retrieval result record table';

DROP TABLE IF EXISTS `upload_doc_task`;
CREATE TABLE `upload_doc_task`
(
    `id`              bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `task_id`         varchar(64) DEFAULT NULL COMMENT 'Task ID',
    `extract_task_id` varchar(64) DEFAULT NULL COMMENT 'Knowledge extraction task ID',
    `file_id`         bigint      DEFAULT NULL COMMENT 'File ID',
    `bot_id`          bigint      DEFAULT NULL COMMENT 'botID',
    `repo_id`         varchar(64) DEFAULT NULL COMMENT 'Knowledge base ID',
    `step`            int         DEFAULT NULL COMMENT 'Processing steps 0: upload file, 1: parse file, 2: embed file, 3: bot bind knowledge base',
    `status`          int         DEFAULT '0' COMMENT '0: in progress, 1: success, 2: failed',
    `reason`          text,
    `app_id`          varchar(60) DEFAULT NULL COMMENT 'User ID',
    `create_time`     timestamp NULL DEFAULT NULL COMMENT 'Creation time',
    `update_time`     timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Modification time',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

