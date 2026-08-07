-- Migration script to add is_think column to model table
ALTER TABLE `model` ADD COLUMN `is_think` tinyint NOT NULL DEFAULT '0' COMMENT 'Whether has thinking capability: 0=no, 1=yes';