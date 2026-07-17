ALTER TABLE `model`
    MODIFY COLUMN `url` varchar(1024) DEFAULT NULL COMMENT 'Model call address',
    MODIFY COLUMN `api_key` varchar(1024) DEFAULT NULL;
