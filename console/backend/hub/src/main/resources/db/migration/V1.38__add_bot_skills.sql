ALTER TABLE `chat_bot_base`
    ADD COLUMN `skills` text DEFAULT NULL COMMENT 'Selected skills JSON list' AFTER `mcp_server_urls`;
