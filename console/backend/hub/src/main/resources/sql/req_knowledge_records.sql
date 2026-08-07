SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `req_knowledge_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `uid` varchar(128) DEFAULT NULL,
  `req_id` bigint(20) DEFAULT NULL COMMENT '用户提问的主键, 对应用户提问表的主键id',
  `req_message` varchar(8000) DEFAULT NULL COMMENT '用户提问的内容',
  `knowledge` varchar(4096) DEFAULT NULL COMMENT '检索出的知识',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `chat_id` bigint(20) DEFAULT NULL COMMENT '聊天窗口id, chat_list主键',
  PRIMARY KEY (`id`),
  KEY `idx_uid_req` (`uid`,`req_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='知识检索结果记录表';

SET FOREIGN_KEY_CHECKS = 1;
