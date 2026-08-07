ALTER TABLE `chat_bot_base`
    ADD COLUMN `mcp_server_urls` text DEFAULT NULL COMMENT 'Custom MCP server URL list' AFTER `opened_tool`;
