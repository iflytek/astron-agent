ALTER TABLE `mcp_data`
    ADD COLUMN `auth_type` varchar(16) NOT NULL DEFAULT 'none' COMMENT 'MCP authentication type' AFTER `server_url`,
    ADD COLUMN `credential_ciphertext` text DEFAULT NULL COMMENT 'RSA encrypted MCP credential' AFTER `auth_type`;
