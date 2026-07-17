ALTER TABLE `chat_bot_base`
    ADD COLUMN `tools` text DEFAULT NULL COMMENT 'Selected plugin tools (tool square) JSON list' AFTER `skills`;
