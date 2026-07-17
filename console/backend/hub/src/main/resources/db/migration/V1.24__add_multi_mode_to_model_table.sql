-- Migration script to add multi_mode column to model table
ALTER TABLE `model` ADD COLUMN `multi_mode` tinyint NOT NULL DEFAULT '0' COMMENT 'Whether has multimodal capability: 0=no, 1=yes';