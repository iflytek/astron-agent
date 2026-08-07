ALTER TABLE rpa_user_assistant ADD user_name varchar(100) NULL COMMENT '用户名';

ALTER TABLE workflow ADD `type` INT NULL COMMENT '工作流类型';

ALTER TABLE workflow_version ADD advanced_config text NULL COMMENT '工作流高级配置';
