INSERT IGNORE INTO `agent_space_permission`
(`module`, `point`, `description`, `permission_key`, `owner`, `admin`, `member`, `available_expired`, `create_time`, `update_time`)
VALUES
('Workflow', 'Import Workflow', 'Import Workflow', 'WorkflowController_importWorkflow_POST', 1, 1, 1, 0, NOW(), NOW());
