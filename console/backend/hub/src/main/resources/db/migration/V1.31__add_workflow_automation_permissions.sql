INSERT IGNORE INTO `agent_space_permission`
(`module`, `point`, `description`, `permission_key`, `owner`, `admin`, `member`, `available_expired`, `create_time`, `update_time`)
VALUES
('Workflow Automation', 'Workflow Automation List', 'Workflow Automation List', 'WorkflowAutomationController_page_GET', 1, 1, 1, 0, NOW(), NOW()),
('Workflow Automation', 'Workflow Automation Create', 'Workflow Automation Create', 'WorkflowAutomationController_create_POST', 1, 1, 1, 0, NOW(), NOW()),
('Workflow Automation', 'Workflow Automation Update', 'Workflow Automation Update', 'WorkflowAutomationController_update_PUT', 1, 1, 1, 0, NOW(), NOW()),
('Workflow Automation', 'Workflow Automation Enable', 'Workflow Automation Enable', 'WorkflowAutomationController_enable_POST', 1, 1, 1, 0, NOW(), NOW()),
('Workflow Automation', 'Workflow Automation Delete', 'Workflow Automation Delete', 'WorkflowAutomationController_delete_DELETE', 1, 1, 1, 0, NOW(), NOW()),
('Workflow Automation', 'Workflow Automation Runs', 'Workflow Automation Runs', 'WorkflowAutomationController_runs_GET', 1, 1, 1, 0, NOW(), NOW()),
('Workflow Automation', 'Workflow Automation Cron Preview', 'Workflow Automation Cron Preview', 'WorkflowAutomationController_cronPreview_POST', 1, 1, 1, 0, NOW(), NOW()),
('Workflow Automation', 'Workflow Automation Run Now', 'Workflow Automation Run Now', 'WorkflowAutomationController_runNow_POST', 1, 1, 1, 0, NOW(), NOW());
