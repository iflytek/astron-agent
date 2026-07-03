ALTER TABLE `chat_bot_base`
    ADD COLUMN `workflows` text DEFAULT NULL COMMENT 'Selected workflows (published) JSON list' AFTER `tools`;
