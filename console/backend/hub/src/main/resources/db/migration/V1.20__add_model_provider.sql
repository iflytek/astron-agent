ALTER TABLE `model`
    ADD COLUMN `provider` varchar(32) DEFAULT NULL COMMENT 'Third-party model provider'
    AFTER `color`;
