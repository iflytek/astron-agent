table "agent_table" {
  schema  = schema.rpa
  comment = "RPA Agent配置表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "自增主键"
    auto_increment = true
  }
  column "agent_id" {
    null    = false
    type    = varchar(100)
    comment = "RPA Agent ID"
  }
  column "content" {
    null    = true
    type    = mediumtext
    comment = "Agent配置信息（超长文本）"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "删除标识：0-未删除，1-已删除"
  }
  column "creator_id" {
    null    = true
    type    = varchar(36)
    comment = "创建人ID"
  }
  column "create_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间，插入时自动生成"
  }
  column "updater_id" {
    null    = true
    type    = varchar(36)
    comment = "更新人ID"
  }
  column "update_time" {
    null      = false
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间，更新时自动更新"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "uk_agent_id" {
    unique  = true
    columns = [column.agent_id]
    comment = "AgentId全局唯一"
  }
}
table "alarm_rule" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "enable" {
    null    = true
    type    = tinyint
    comment = "是否启用"
  }
  column "name" {
    null    = true
    type    = varchar(255)
    comment = "规则名"
  }
  column "condition" {
    null    = true
    type    = varchar(100)
    comment = "条件JSON字符串：{\"hours\":23,\"minutes\":59,\"count\":10}"
  }
  column "duration" {
    null    = true
    type    = char(17)
    comment = "HH:MM:SS-HH:MM:SS  时间段（开始-结束）"
  }
  column "role_id" {
    null    = true
    type    = char(36)
    comment = "操作者角色id"
  }
  column "process_id_list" {
    null    = true
    type    = mediumtext
    comment = "processId"
  }
  column "event_module_code" {
    null    = true
    type    = int
    comment = "事件模块代码"
  }
  column "event_module_name" {
    null    = true
    type    = varchar(255)
    comment = "事件模块"
  }
  column "event_type_code" {
    null    = true
    type    = int
    comment = "事件代码"
  }
  column "event_type_name" {
    null    = true
    type    = varchar(255)
    comment = "事件类型"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
}
table "alarm_rule_user" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "alarm_rule_id" {
    null    = true
    type    = bigint
    comment = "alarm_rule表id"
  }
  column "phone" {
    null    = true
    type    = varchar(200)
    comment = "电话"
  }
  column "name" {
    null    = true
    type    = varchar(100)
    comment = "用户姓名"
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
}
table "app_application" {
  schema  = schema.rpa
  comment = "上架/使用审核表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "robot_id" {
    null    = false
    type    = varchar(100)
    comment = "机器人ID"
  }
  column "robot_version" {
    null    = false
    type    = int
    comment = "机器人版本ID"
  }
  column "status" {
    null    = false
    type    = varchar(20)
    comment = "状态: 待审核pending, 已通过approved, 未通过rejected, 已撤销canceled，作废nullify"
  }
  column "application_type" {
    null    = false
    type    = varchar(20)
    comment = "申请类型: release(上架)/use(使用)"
  }
  column "security_level" {
    null    = true
    type    = varchar(10)
    comment = "审核设置的密级red,green,yellow"
  }
  column "allowed_dept" {
    null    = true
    type    = varchar(5000)
    comment = "允许使用的部门ID列表"
  }
  column "expire_time" {
    null    = true
    type    = timestamp
    comment = "使用期限(截止日期)"
  }
  column "audit_opinion" {
    null    = true
    type    = varchar(500)
    comment = "审核意见"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "申请人ID"
  }
  column "create_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者或审核者id"
  }
  column "update_time" {
    null      = false
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "client_deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "客户端的申请记录-是否删除"
  }
  column "cloud_deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "卓越中心的申请记录-是否删除"
  }
  column "default_pass" {
    null    = true
    type    = bool
    comment = "选择绿色密级时，后续更新发版是否默认通过"
  }
  column "market_info" {
    null    = true
    type    = varchar(500)
    comment = "团队市场id等信息，用于第一次发起上架申请，审核通过后自动分享到该市场"
  }
  column "publish_info" {
    null = true
    type = varchar(500)
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_app_robot" {
    columns = [column.robot_id]
  }
}
table "app_application_tenant" {
  schema  = schema.rpa
  comment = "租户是否开启审核配置表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "tenant_id" {
    null = false
    type = varchar(36)
  }
  column "audit_enable" {
    null    = true
    type    = smallint
    comment = "是否开启审核，1开启，0不开启"
  }
  column "audit_enable_time" {
    null = true
    type = timestamp
  }
  column "audit_enable_operator" {
    null = true
    type = char(36)
  }
  column "audit_enable_reason" {
    null = true
    type = varchar(100)
  }
  primary_key {
    columns = [column.tenant_id]
  }
}
table "app_market" {
  schema  = schema.rpa
  comment = "团队市场-团队表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "market_id" {
    null    = true
    type    = varchar(20)
    comment = "团队市场id"
  }
  column "market_name" {
    null    = true
    type    = varchar(60)
    comment = "市场名称"
  }
  column "market_describe" {
    null    = true
    type    = varchar(800)
    comment = "市场描述"
  }
  column "market_type" {
    null    = true
    type    = varchar(10)
    comment = "市场类型：team,official"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "app_market_creator_id_IDX" {
    columns = [column.creator_id]
  }
  index "app_market_market_id_IDX" {
    columns = [column.market_id]
  }
  index "app_market_tenant_id_IDX" {
    columns = [column.tenant_id]
  }
}
table "app_market_classification" {
  schema = schema.rpa
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "name" {
    null    = true
    type    = varchar(64)
    comment = "分类名"
  }
  column "source" {
    null    = true
    type    = bool
    comment = "来源: 0-系统预置, 1-自定义"
  }
  column "sort" {
    null    = true
    type    = int
    comment = "排序"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "creator_id" {
    null = true
    type = char(36)
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null = true
    type = char(36)
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
  }
  primary_key {
    columns = [column.id]
  }
  index "name_IDX" {
    columns = [column.name]
  }
}
table "app_market_classification_map" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "english" {
    null = false
    type = varchar(255)
  }
  column "name" {
    null = false
    type = varchar(255)
  }
}
table "app_market_dict" {
  schema = schema.rpa
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "business_code" {
    null    = true
    type    = varchar(100)
    comment = "业务编码：1、行业类型，2、角色功能marketRoleFunc"
  }
  column "name" {
    null    = true
    type    = varchar(64)
    comment = "行业名称，角色功能名称"
  }
  column "dict_code" {
    null    = true
    type    = varchar(64)
    comment = "行业编码，功能编码"
  }
  column "dict_value" {
    null    = true
    type    = varchar(100)
    comment = "T有权限，F无权限"
  }
  column "user_type" {
    null    = true
    type    = varchar(100)
    comment = "owner,admin,acquirer,author"
  }
  column "description" {
    null    = true
    type    = varchar(256)
    comment = "描述"
  }
  column "seq" {
    null    = true
    type    = int
    comment = "排序"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    default = "73"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    default = "73"
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
  }
  primary_key {
    columns = [column.id]
  }
  index "app_market_dict_dict_code_IDX" {
    columns = [column.dict_code]
  }
}
table "app_market_invite" {
  schema  = schema.rpa
  comment = "团队市场-邀请链接表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "invite_key" {
    null    = true
    type    = varchar(20)
    comment = "邀请链接key"
  }
  column "inviter_id" {
    null    = true
    type    = varchar(50)
    comment = "邀请人id"
  }
  column "market_id" {
    null    = true
    type    = varchar(50)
    comment = "市场id"
  }
  column "current_join_count" {
    null    = true
    type    = int
    comment = "当前已加入人数"
  }
  column "max_join_count" {
    null    = true
    type    = int
    comment = "最大加入人数"
  }
  column "expire_time" {
    null    = true
    type    = timestamp
    comment = "失效时间"
  }
  column "expire_type" {
    null    = true
    type    = varchar(50)
    comment = "失效类型"
  }
  column "creator_id" {
    null    = true
    type    = varchar(50)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = varchar(50)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = int
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "uk_invite_key" {
    unique  = true
    columns = [column.invite_key]
  }
}
table "app_market_resource" {
  schema  = schema.rpa
  comment = "团队市场-资源映射表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "market_id" {
    null    = true
    type    = varchar(20)
    comment = "团队市场id"
  }
  column "app_id" {
    null    = true
    type    = varchar(50)
    comment = "应用id，模板id，组件id"
  }
  column "download_num" {
    null    = true
    type    = bigint
    default = 0
    comment = "下载次数"
  }
  column "check_num" {
    null    = true
    type    = bigint
    default = 0
    comment = "查看次数"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "发布人"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "发布时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "robot_id" {
    null    = true
    type    = varchar(100)
    comment = "机器人id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "app_name" {
    null    = true
    type    = varchar(64)
    comment = "资源名称"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  primary_key {
    columns = [column.id]
  }
  index "app_market_resource_app_id_IDX" {
    columns = [column.app_id]
  }
  index "app_market_resource_creator_id_IDX" {
    columns = [column.creator_id]
  }
  index "app_market_resource_market_id_IDX" {
    columns = [column.market_id]
  }
  index "app_market_resource_tenant_id_IDX" {
    columns = [column.tenant_id]
  }
}
table "app_market_user" {
  schema  = schema.rpa
  comment = "团队市场-人员表，n:n的关系"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "market_id" {
    null    = true
    type    = varchar(20)
    comment = "市场id"
  }
  column "user_type" {
    null    = true
    type    = varchar(10)
    comment = "成员类型：owner,admin,acquirer,author"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "成员id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "加入时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "app_market_user_creator_id_IDX" {
    columns = [column.creator_id]
  }
  index "app_market_user_market_id_IDX" {
    columns = [column.market_id]
  }
  index "app_market_user_tenant_id_IDX" {
    columns = [column.tenant_id]
  }
}
table "app_market_version" {
  schema  = schema.rpa
  comment = "团队市场-应用版本表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "market_id" {
    null    = true
    type    = varchar(100)
    comment = "市场id"
  }
  column "app_id" {
    null = true
    type = varchar(50)
  }
  column "app_version" {
    null    = true
    type    = int
    comment = "应用版本，同机器人版本"
  }
  column "edit_flag" {
    null    = true
    type    = bool
    default = 1
    comment = "自己创建的分享到市场，是否支持编辑/开放源码；0不支持，1支持"
  }
  column "category" {
    null    = true
    type    = varchar(100)
    comment = "分享到市场的机器人行业：政务、医疗、商业等"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "发布人"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "发布时间"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "category_id" {
    null    = true
    type    = bigint
    comment = "分类id"
  }
  primary_key {
    columns = [column.id]
  }
  index "app_market_version_app_id_IDX" {
    columns = [column.app_id]
  }
  index "app_market_version_market_id_IDX" {
    columns = [column.market_id]
  }
  index "idx_app_id_version_deleted" {
    columns = [column.app_id, column.app_version, column.deleted]
  }
  index "idx_market_app_version" {
    columns = [column.market_id, column.app_id, column.app_version]
  }
}
table "atom_like" {
  schema  = schema.rpa
  comment = "原子能力收藏"
  column "id" {
    null           = false
    type           = int
    auto_increment = true
  }
  column "like_id" {
    null = false
    type = varchar(20)
  }
  column "atom_key" {
    null    = false
    type    = varchar(100)
    comment = "原子能力的key，全局唯一"
  }
  column "creator_id" {
    null = false
    type = char(36)
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "is_deleted" {
    null    = false
    type    = bool
    default = 0
  }
  column "updater_id" {
    null = true
    type = char(36)
  }
  column "create_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "update_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
}
table "atom_meta_duplicate_log" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null    = false
    type    = bigint
    default = 0
  }
  column "atom_key" {
    null = true
    type = varchar(100)
  }
  column "version" {
    null    = true
    type    = varchar(20)
    comment = "原子能力版本"
  }
  column "request_body" {
    null    = true
    type    = mediumtext
    comment = "完整请求体"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除"
  }
  column "creator_id" {
    null    = true
    type    = bigint
    default = 73
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null    = true
    type    = bigint
    default = 73
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
}
table "audit_checkpoint" {
  schema  = schema.rpa
  comment = "监控管理统计断点表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "audit_object_type" {
    null    = true
    type    = varchar(36)
    comment = "robot，dept"
  }
  column "last_processed_id" {
    null = true
    type = varchar(36)
  }
  column "audit_status" {
    null    = true
    type    = varchar(20)
    comment = "统计进度：counting, completed, pending,to_count"
  }
  column "count_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "删除标识"
  }
  primary_key {
    columns = [column.id]
  }
}
table "audit_record" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "event_module_code" {
    null = true
    type = int
  }
  column "event_module_name" {
    null    = true
    type    = varchar(255)
    comment = "事件模块"
  }
  column "event_type_code" {
    null = true
    type = int
  }
  column "event_type_name" {
    null    = true
    type    = varchar(255)
    comment = "事件类型"
  }
  column "event_detail" {
    null    = true
    type    = varchar(255)
    comment = "事件详情"
  }
  column "creator_id" {
    null = true
    type = char(36)
  }
  column "creator_name" {
    null = true
    type = varchar(255)
  }
  column "create_time" {
    null      = true
    type      = timestamp
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "process_id_list" {
    null = true
    type = mediumtext
  }
  column "role_id_list" {
    null = true
    type = mediumtext
  }
  primary_key {
    columns = [column.id]
  }
}
table "client_update_version" {
  schema  = schema.rpa
  comment = "客户端版本检查表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "version" {
    null    = false
    type    = char(15)
    comment = "版本"
  }
  column "version_num" {
    null    = false
    type    = mediumint
    comment = "版本数字"
  }
  column "download_url" {
    null    = false
    type    = varchar(255)
    comment = "下载链接"
  }
  column "update_info" {
    null    = true
    type    = mediumtext
    comment = "更新内容"
  }
  column "create_time" {
    null    = true
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "os" {
    null    = true
    type    = varchar(255)
    comment = "系统"
  }
  column "arch" {
    null    = true
    type    = varchar(255)
    comment = "架构"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_version" {
    columns = [column.version]
  }
  index "idx_version_num" {
    columns = [column.version_num]
  }
}
table "cloud_terminal" {
  schema  = schema.rpa
  comment = "终端表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(100)
    comment = "部门全路径id"
  }
  column "name" {
    null    = true
    type    = varchar(100)
    comment = "终端名称"
  }
  column "terminal_mac" {
    null    = true
    type    = varchar(100)
    comment = "设备号，终端唯一标识"
  }
  column "terminal_ip" {
    null    = true
    type    = varchar(100)
    comment = "ip"
  }
  column "terminal_status" {
    null    = true
    type    = varchar(100)
    comment = "当前状态，忙碌busy，空闲free，离线offline"
  }
  column "terminal_des" {
    null    = true
    type    = varchar(100)
    comment = "终端描述"
  }
  column "user_id" {
    null    = true
    type    = char(36)
    comment = "最近登陆用户id"
  }
  column "dept_name" {
    null    = true
    type    = varchar(100)
    comment = "部门名称"
  }
  column "account_last" {
    null    = true
    type    = varchar(100)
    comment = "最近登陆账号"
  }
  column "user_name_last" {
    null    = true
    type    = varchar(100)
    comment = "最近登陆用户名"
  }
  column "time_last" {
    null    = true
    type    = timestamp
    comment = "最近登陆时间"
  }
  column "execute_time_total" {
    null    = true
    type    = bigint
    default = 0
    comment = "单个终端累计执行时长，用于终端列表展示，更新机器人执行记录表时同步更新该表"
  }
  column "execute_num" {
    null    = true
    type    = bigint
    default = 0
    comment = "单个终端累计执行次数，更新机器人执行记录表时同步更新该表"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "终端记录创建时间"
  }
  column "terminal_type" {
    null = true
    type = varchar(50)
  }
  primary_key {
    columns = [column.id]
  }
  index "cloud_terminal_mac_tenant_index" {
    columns = [column.terminal_mac, column.tenant_id]
  }
  index "cloud_terminal_tenant_id_IDX" {
    columns = [column.tenant_id, column.dept_id_path]
  }
  index "cloud_terminal_terminal_mac_IDX" {
    columns = [column.terminal_mac]
  }
  index "cloud_terminal_user_id_IDX" {
    columns = [column.user_id]
  }
}
table "component" {
  schema  = schema.rpa
  comment = "组件表"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "component_id" {
    null    = false
    type    = varchar(100)
    comment = "机器人唯一id，获取的应用id"
  }
  column "name" {
    null    = false
    type    = varchar(100)
    comment = "当前名字，用于列表展示"
  }
  column "creator_id" {
    null    = false
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = false
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "is_shown" {
    null    = false
    type    = bool
    default = 1
    comment = "是否在用户列表页显示 0：不显示，1：显示"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "app_id" {
    null    = true
    type    = varchar(50)
    comment = "appmarketResource中的应用id"
    charset = "utf8mb4"
    collate = "utf8mb4_general_ci"
  }
  column "app_version" {
    null    = true
    type    = int
    comment = "获取的应用：应用市场版本"
  }
  column "market_id" {
    null    = true
    type    = varchar(20)
    comment = "获取的应用：市场id"
    charset = "utf8mb4"
    collate = "utf8mb4_general_ci"
  }
  column "resource_status" {
    null    = true
    type    = varchar(20)
    comment = "资源状态：toObtain, obtained, toUpdate"
  }
  column "data_source" {
    null    = true
    type    = varchar(20)
    comment = "来源：create 自己创建 ； market 市场获取 "
  }
  column "transform_status" {
    null    = true
    type    = varchar(20)
    comment = "editing 编辑中，published 已发版，shared 已上架，locked锁定（无法编辑）"
  }
  primary_key {
    columns = [column.id]
  }
}
table "component_robot_block" {
  schema  = schema.rpa
  comment = "机器人对组件屏蔽表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "robot_id" {
    null    = false
    type    = varchar(100)
    comment = "机器人id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "robot_version" {
    null    = false
    type    = int
    comment = "机器人版本号"
  }
  column "component_id" {
    null    = false
    type    = varchar(100)
    comment = "组件id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  primary_key {
    columns = [column.id]
  }
}
table "component_robot_use" {
  schema  = schema.rpa
  comment = "机器人对组件引用表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "robot_id" {
    null    = false
    type    = varchar(100)
    comment = "机器人id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "robot_version" {
    null    = false
    type    = int
    comment = "机器人版本号"
  }
  column "component_id" {
    null    = false
    type    = varchar(100)
    comment = "组件id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "component_version" {
    null    = false
    type    = int
    comment = "组件版本号"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  primary_key {
    columns = [column.id]
  }
}
table "component_version" {
  schema  = schema.rpa
  comment = "组件版本表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "component_id" {
    null    = false
    type    = varchar(100)
    comment = "机器人id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "version" {
    null    = false
    type    = int
    comment = "版本号"
  }
  column "introduction" {
    null    = true
    type    = longtext
    comment = "简介"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "update_log" {
    null    = true
    type    = longtext
    comment = "更新日志"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "param" {
    null    = true
    type    = text
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "param_detail" {
    null    = true
    type    = text
    comment = "发版时拖的表单参数信息"
    collate = "utf8mb4_unicode_ci"
  }
  column "icon" {
    null    = false
    type    = varchar(30)
    comment = "图标"
  }
  primary_key {
    columns = [column.id]
  }
}
table "consult_form" {
  schema = schema.rpa
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "form_type" {
    null    = true
    type    = tinyint
    comment = "1=专业版 2=企业版 预留 3~99"
  }
  column "company_name" {
    null = false
    type = varchar(128)
  }
  column "contact_name" {
    null = false
    type = varchar(64)
  }
  column "mobile" {
    null = false
    type = varchar(20)
  }
  column "email" {
    null    = true
    type    = varchar(128)
    comment = "非必填"
  }
  column "team_size" {
    null    = true
    type    = varchar(32)
    comment = "人数区间，字典值"
  }
  column "status" {
    null    = false
    type    = tinyint
    default = 0
    comment = "0=待处理 1=已处理 2=已忽略"
  }
  column "remark" {
    null    = true
    type    = varchar(512)
    comment = "客服备注"
  }
  column "created_at" {
    null    = false
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    null      = false
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_created" {
    columns = [column.created_at]
  }
  index "idx_type_status" {
    columns = [column.form_type, column.status]
  }
}
table "contact" {
  schema  = schema.rpa
  comment = "留咨信息表"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键ID"
    auto_increment = true
  }
  column "name" {
    null    = false
    type    = varchar(100)
    comment = "姓名"
  }
  column "phone" {
    null    = false
    type    = varchar(11)
    comment = "手机号"
  }
  column "company_name" {
    null    = false
    type    = varchar(200)
    comment = "企业名称"
  }
  column "company_size" {
    null    = false
    type    = varchar(50)
    comment = "团队规模 参照CompanySizeEnum"
  }
  column "email" {
    null    = true
    type    = varchar(100)
    comment = "邮箱"
  }
  column "demand_desc" {
    null    = true
    type    = text
    comment = "需求描述"
  }
  column "contact_kind" {
    null    = false
    type    = varchar(50)
    comment = "咨询类型 参照ContactKindEnum"
  }
  column "agreement" {
    null    = true
    type    = bool
    default = 1
    comment = "是否同意协议 0-不同意 1-同意"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建人ID"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新人ID"
  }
  column "create_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "更新时间"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0-未删除 1-已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_company_name" {
    columns = [column.company_name]
  }
  index "idx_create_time" {
    columns = [column.create_time]
  }
  index "idx_deleted" {
    columns = [column.deleted]
  }
  index "idx_phone" {
    columns = [column.phone]
  }
}
table "c_atom_meta_new" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "atom_key" {
    null = true
    type = varchar(100)
  }
  column "atom_content" {
    null    = true
    type    = mediumtext
    comment = "原子能力所有配置信息，json"
  }
  column "sort" {
    null    = true
    type    = int
    comment = "原子能力展示顺序"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_atom_key" {
    unique  = true
    columns = [column.atom_key]
    comment = "atom_key索引"
  }
}
table "c_element" {
  schema  = schema.rpa
  comment = "客户端，元素信息"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "element_id" {
    null    = true
    type    = varchar(100)
    comment = "元素id"
  }
  column "element_name" {
    null    = true
    type    = varchar(100)
    comment = "元素名称"
  }
  column "icon" {
    null    = true
    type    = varchar(100)
    comment = "图标"
  }
  column "image_id" {
    null    = true
    type    = varchar(100)
    comment = "图片下载地址"
  }
  column "parent_image_id" {
    null    = true
    type    = varchar(100)
    comment = "元素的父级图片下载地址"
  }
  column "element_data" {
    null    = true
    type    = mediumtext
    comment = "元素内容"
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
  }
  column "creator_id" {
    null = true
    type = char(36)
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null = true
    type = char(36)
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "robot_id" {
    null = true
    type = varchar(100)
  }
  column "robot_version" {
    null = true
    type = int
  }
  column "group_id" {
    null = true
    type = varchar(30)
  }
  column "common_sub_type" {
    null    = true
    type    = varchar(50)
    comment = "cv图像, sigle普通拾取，batch数据抓取"
  }
  column "group_name" {
    null = true
    type = varchar(100)
  }
  column "element_type" {
    null = true
    type = varchar(20)
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_element_id" {
    columns = [column.element_id]
  }
  index "idx_element_name" {
    columns = [column.element_name]
  }
  index "idx_element_robot_version" {
    columns = [column.element_id, column.robot_id, column.robot_version]
  }
  index "idx_group_id" {
    columns = [column.group_id]
  }
  index "idx_robot_info" {
    columns = [column.robot_id, column.robot_version]
  }
}
table "c_global_var" {
  schema  = schema.rpa
  comment = "客户端-全局变量"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "project_id" {
    null = true
    type = varchar(100)
  }
  column "global_id" {
    null = true
    type = varchar(100)
  }
  column "var_name" {
    null = true
    type = varchar(100)
  }
  column "var_type" {
    null = true
    type = varchar(100)
  }
  column "var_value" {
    null = true
    type = varchar(100)
  }
  column "var_describe" {
    null = true
    type = varchar(100)
  }
  column "deleted" {
    null = true
    type = smallint
  }
  column "creator_id" {
    null = true
    type = char(36)
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null = true
    type = char(36)
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "robot_id" {
    null = true
    type = varchar(100)
  }
  column "robot_version" {
    null = true
    type = int
  }
  primary_key {
    columns = [column.id]
  }
}
table "c_group" {
  schema  = schema.rpa
  comment = "元素或图像的分组"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "group_id" {
    null = true
    type = varchar(100)
  }
  column "group_name" {
    null = true
    type = varchar(100)
  }
  column "creator_id" {
    null = true
    type = char(36)
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null = true
    type = char(36)
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
  }
  column "robot_id" {
    null = true
    type = varchar(100)
  }
  column "robot_version" {
    null = true
    type = int
  }
  column "element_type" {
    null    = true
    type    = varchar(20)
    comment = "cv：cv拾取; common:普通元素拾取"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_element_type" {
    columns = [column.element_type]
  }
  index "idx_group_id" {
    columns = [column.group_id]
  }
  index "idx_robot_info" {
    columns = [column.robot_id, column.robot_version]
  }
}
table "c_module" {
  schema  = schema.rpa
  comment = "客户端-python模块数据"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "module_id" {
    null    = true
    type    = varchar(100)
    comment = "流程id"
  }
  column "module_content" {
    null    = true
    type    = mediumtext
    comment = "全量python代码数据"
  }
  column "module_name" {
    null    = true
    type    = varchar(100)
    comment = "python文件名"
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    default = "73"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    default = "73"
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "robot_id" {
    null = true
    type = varchar(100)
  }
  column "robot_version" {
    null = true
    type = int
  }
  column "breakpoint" {
    null    = true
    type    = mediumtext
    comment = "断点信息"
  }
  primary_key {
    columns = [column.id]
  }
  index "c_module_module_id_IDX" {
    columns = [column.module_id]
  }
}
table "c_param" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null    = false
    type    = varchar(20)
    comment = "参数id"
  }
  column "var_direction" {
    null    = true
    type    = int
    comment = "输入/输出"
  }
  column "var_name" {
    null    = true
    type    = varchar(100)
    comment = "参数名称"
  }
  column "var_type" {
    null    = true
    type    = varchar(100)
    comment = "参数类型"
  }
  column "var_value" {
    null    = true
    type    = varchar(1000)
    comment = "参数内容"
  }
  column "var_describe" {
    null    = true
    type    = varchar(100)
    comment = "参数描述"
  }
  column "process_id" {
    null    = true
    type    = varchar(100)
    comment = "流程id"
  }
  column "creator_id" {
    null = true
    type = char(36)
  }
  column "updater_id" {
    null = true
    type = char(36)
  }
  column "create_time" {
    null = true
    type = timestamp
  }
  column "update_time" {
    null = true
    type = timestamp
  }
  column "deleted" {
    null = true
    type = int
  }
  column "robot_id" {
    null = true
    type = varchar(100)
  }
  column "robot_version" {
    null = true
    type = int
  }
  column "module_id" {
    null    = true
    type    = varchar(100)
    comment = "python模块id"
  }
  index "c_param_id_IDX" {
    columns = [column.id]
  }
}
table "c_process" {
  schema  = schema.rpa
  comment = "客户端-流程数据"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "project_id" {
    null    = true
    type    = varchar(100)
    comment = "工程id"
  }
  column "process_id" {
    null    = true
    type    = varchar(100)
    comment = "流程id"
  }
  column "process_content" {
    null    = true
    type    = mediumtext
    comment = "全量流程数据"
  }
  column "process_name" {
    null    = true
    type    = varchar(100)
    comment = "流程名称"
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    default = "73"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    default = "73"
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "robot_id" {
    null = true
    type = varchar(100)
  }
  column "robot_version" {
    null = true
    type = int
  }
  primary_key {
    columns = [column.id]
  }
}
table "c_project" {
  schema  = schema.rpa
  comment = "工程表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "project_id" {
    null = true
    type = varchar(100)
  }
  column "project_name" {
    null    = true
    type    = varchar(200)
    comment = "项目名称"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = datetime
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null    = true
    type    = datetime
    comment = "创建时间"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "逻辑删除 0：未删除 1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
}
table "c_require" {
  schema  = schema.rpa
  comment = "python依赖管理"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "project_id" {
    null = true
    type = varchar(100)
  }
  column "package_name" {
    null    = true
    type    = varchar(100)
    comment = "项目名称"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "package_version" {
    null = true
    type = varchar(20)
  }
  column "mirror" {
    null = true
    type = varchar(100)
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = datetime
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null    = true
    type    = datetime
    comment = "创建时间"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "逻辑删除 0：未删除 1：已删除"
  }
  column "robot_id" {
    null = true
    type = varchar(100)
  }
  column "robot_version" {
    null = true
    type = int
  }
  primary_key {
    columns = [column.id]
  }
}
table "c_smart_version" {
  schema  = schema.rpa
  comment = "智能组件版本表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "自增主键"
    auto_increment = true
  }
  column "smart_id" {
    null    = false
    type    = varchar(100)
    comment = "智能组件Id"
  }
  column "smart_type" {
    null    = true
    type    = varchar(100)
    comment = "智能组件的类型"
  }
  column "content" {
    null    = true
    type    = mediumtext
    comment = "组件内容（超长文本）"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "删除标识：0-未删除，1-已删除"
  }
  column "robot_id" {
    null    = true
    type    = varchar(100)
    comment = "机器人Id"
  }
  column "robot_version" {
    null    = true
    type    = int
    comment = "机器人版本号"
  }
  column "creator_id" {
    null    = true
    type    = varchar(36)
    comment = "创建人ID"
  }
  column "create_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间，插入时自动生成"
  }
  column "updater_id" {
    null    = true
    type    = varchar(36)
    comment = "更新人ID"
  }
  column "update_time" {
    null      = false
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间，更新时自动更新"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_smart_id_robot_id" {
    columns = [column.smart_id, column.robot_id]
  }
}
table "dispatch_day_task_info" {
  schema  = schema.rpa
  comment = "调度模式:终端每日上传的任务情况信息"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "terminal_id" {
    null    = true
    type    = varchar(20)
    comment = "终端id"
  }
  column "task_id" {
    null    = true
    type    = varchar(30)
    comment = "任务ID"
  }
  column "task_name" {
    null    = true
    type    = varchar(30)
    comment = "任务名"
  }
  column "robot_id" {
    null    = true
    type    = varchar(30)
    comment = "机器人ID"
  }
  column "robot_name" {
    null    = true
    type    = varchar(30)
    comment = "机器人名"
  }
  column "status" {
    null    = true
    type    = varchar(10)
    comment = "当前状态 待执行 todo /已执行 done /在执行 doing"
  }
  column "execute_time" {
    null    = true
    type    = varchar(10)
    comment = "任务执行时间"
  }
  column "sort" {
    null    = true
    type    = int
    comment = "排序, 越小越靠前"
  }
  column "tenant_id" {
    null = true
    type = varchar(36)
  }
  column "creator_id" {
    null    = true
    type    = varchar(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = varchar(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_robot_id" {
    columns = [column.robot_id]
  }
  index "idx_task_id" {
    columns = [column.task_id]
  }
}
table "dispatch_task" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "dispatch_task_id" {
    null           = false
    type           = bigint
    comment        = "调度模式计划任务id"
    auto_increment = true
  }
  column "status" {
    null    = false
    type    = varchar(10)
    default = "0"
    comment = "任务状态：启用中active、关闭stop、已过期expired"
  }
  column "name" {
    null    = true
    type    = varchar(50)
    comment = "调度模式计划任务名称"
  }
  column "cron_json" {
    null    = true
    type    = mediumtext
    comment = "构建调度计划任务的灵活参数;定时schedule存计划执行的对应JSON"
  }
  column "type" {
    null    = true
    type    = varchar(10)
    comment = "触发条件：手动触发manual、定时schedule、定时触发trigger"
  }
  column "exceptional" {
    null    = false
    type    = varchar(20)
    default = "stop"
    comment = "报错如何处理：跳过jump、停止stop、重试后跳过retry_jump、重试后停止retry_stop"
  }
  column "retry_num" {
    null    = true
    type    = int
    comment = "只有exceptional为retry时，记录的重试次数"
  }
  column "timeout_enable" {
    null    = true
    type    = smallint
    comment = "是否启用超时时间 1:启用 0:不启用"
  }
  column "timeout" {
    null    = true
    type    = int
    default = 9999
    comment = "超时时间"
  }
  column "queue_enable" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否启用排队 1:启用 0:不启用"
  }
  column "screen_record_enable" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否开启录屏 1:启用 0:不启用"
  }
  column "virtual_desktop_enable" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否开启虚拟桌面 1:启用 0:不启用"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.dispatch_task_id]
  }
}
table "dispatch_task_execute_record" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "dispatch_task_id" {
    null    = true
    type    = bigint
    comment = "调度模式计划任务id"
  }
  column "dispatch_task_execute_id" {
    null    = true
    type    = bigint
    comment = "调度模式计划任务执行id"
  }
  column "count" {
    null    = true
    type    = int
    comment = "执行批次，1，2，3...."
  }
  column "dispatch_task_type" {
    null    = true
    type    = varchar(20)
    comment = "触发条件：手动触发manual、定时schedule、定时触发trigger"
  }
  column "result" {
    null    = true
    type    = varchar(20)
    comment = "执行结果枚举:成功success、失败error、执行中executing、中止cancel、下发失败dispatch_error、执行失败exe_error"
  }
  column "start_time" {
    null    = true
    type    = datetime
    comment = "执行开始时间"
  }
  column "end_time" {
    null    = true
    type    = datetime
    comment = "执行结束时间"
  }
  column "execute_time" {
    null    = true
    type    = bigint
    comment = "执行耗时 单位秒"
  }
  column "terminal_id" {
    null    = true
    type    = char(36)
    comment = "终端唯一标识，如设备mac地址"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "task_detail_json" {
    null    = true
    type    = mediumtext
    comment = "任务详情"
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_dispatch_task_teminal_task_id" {
    columns = [column.dispatch_task_id]
  }
}
table "dispatch_task_robot" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "dispatch_task_id" {
    null    = true
    type    = bigint
    comment = "调度模式计划任务id"
  }
  column "robot_id" {
    null    = true
    type    = varchar(30)
    comment = "机器人ID"
  }
  column "online" {
    null    = true
    type    = tinyint
    comment = "是否启用版本： 0:未启用,1:已启用"
  }
  column "version" {
    null    = true
    type    = int
    comment = "机器人版本"
  }
  column "param_json" {
    null    = true
    type    = mediumtext
    comment = "机器人配置参数"
  }
  column "sort" {
    null    = true
    type    = int
    comment = "排序, 越小越靠前"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_dispatch_task_teminal_task_id" {
    columns = [column.dispatch_task_id]
  }
}
table "dispatch_task_robot_execute_record" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "execute_id" {
    null    = true
    type    = bigint
    comment = "机器人执行id"
  }
  column "dispatch_task_execute_id" {
    null    = true
    type    = bigint
    comment = "调度模式计划任务执行id"
  }
  column "robot_id" {
    null    = true
    type    = varchar(100)
    comment = "机器人id"
  }
  column "robot_version" {
    null    = true
    type    = int
    comment = "机器人版本号"
  }
  column "start_time" {
    null    = true
    type    = timestamp
    comment = "开始时间"
  }
  column "end_time" {
    null    = true
    type    = timestamp
    comment = "结束时间"
  }
  column "execute_time" {
    null    = true
    type    = bigint
    comment = "执行耗时 单位秒"
  }
  column "result" {
    null    = true
    type    = varchar(20)
    comment = "执行结果枚举:：robotFail:失败， robotSuccess:成功，robotCancel:取消(中止)，robotExecute:正在执行"
  }
  column "param_json" {
    null    = true
    type    = mediumtext
    comment = "机器人执行参数"
  }
  column "error_reason" {
    null    = true
    type    = varchar(255)
    comment = "错误原因"
  }
  column "execute_log" {
    null    = true
    type    = longtext
    comment = "日志内容"
  }
  column "video_local_path" {
    null    = true
    type    = varchar(200)
    comment = "视频记录的本地存储路径"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(100)
    comment = "部门全路径编码"
  }
  column "terminal_id" {
    null    = true
    type    = char(36)
    comment = "终端唯一标识，如设备mac地址"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "data_table_path" {
    null    = true
    type    = varchar(255)
    comment = "数据抓取存储位置"
  }
  primary_key {
    columns = [column.id]
  }
}
table "dispatch_task_terminal" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "dispatch_task_id" {
    null    = true
    type    = bigint
    comment = "调度模式计划任务id"
  }
  column "terminal_or_group" {
    null    = true
    type    = varchar(10)
    comment = "触发条件：终端teminal、终端分组group"
  }
  column "execute_method" {
    null    = true
    type    = varchar(10)
    comment = "执行方式：随机一台random_one、全部执行all"
  }
  column "value" {
    null    = true
    type    = mediumtext
    comment = "具体值：存储 list<id> ; 其中终端对应：terminal_id（表terminal） 分组对应：id （terminal_group_name）"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_dispatch_task_teminal_task_id" {
    columns = [column.dispatch_task_id]
  }
}
table "feedback_report" {
  schema  = schema.rpa
  comment = "反馈举报表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键ID"
    auto_increment = true
  }
  column "report_no" {
    null    = false
    type    = varchar(32)
    comment = "唯一编号"
  }
  column "username" {
    null    = false
    type    = varchar(100)
    comment = "用户登录名"
  }
  column "categories" {
    null    = false
    type    = text
    comment = "问题分类列表（JSON格式）"
  }
  column "description" {
    null    = false
    type    = text
    comment = "问题描述"
  }
  column "image_ids" {
    null    = true
    type    = varchar(500)
    comment = "图片文件ID列表（逗号分隔）"
  }
  column "create_time" {
    null    = false
    type    = datetime
    comment = "创建时间"
  }
  column "update_time" {
    null    = true
    type    = datetime
    comment = "更新时间"
  }
  column "deleted" {
    null    = true
    type    = tinyint
    default = 0
    comment = "逻辑删除标志 0:未删除 1:已删除"
  }
  column "processed" {
    null    = true
    type    = tinyint
    default = 0
    comment = "是否已处理 0:未处理 1:已处理"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_create_time" {
    columns = [column.create_time]
  }
  index "idx_processed" {
    columns = [column.processed]
  }
  index "idx_username" {
    columns = [column.username]
  }
  index "uk_report_no" {
    unique  = true
    columns = [column.report_no]
  }
}
table "file" {
  schema  = schema.rpa
  comment = "文件表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = int
    comment        = "主键ID"
    auto_increment = true
  }
  column "file_id" {
    null    = true
    type    = varchar(50)
    comment = "文件对应的uuid"
  }
  column "path" {
    null    = true
    type    = varchar(100)
    comment = "文件在s3上对应的路径"
  }
  column "create_time" {
    null    = true
    type    = datetime
    comment = "创建时间"
  }
  column "update_time" {
    null    = true
    type    = datetime
    comment = "更新时间"
  }
  column "deleted" {
    null    = true
    type    = int
    comment = "逻辑删除标志位"
    default = 0
  }
  column "file_name" {
    null    = true
    type    = varchar(1000)
    comment = "文件真实名称"
  }
  primary_key {
    columns = [column.id]
  }
}
table "his_base" {
  schema  = schema.rpa
  comment = "全部机器人和全部终端趋势表"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(100)
    comment = "部门全路径编码"
  }
  column "execute_success" {
    null    = true
    type    = bigint
    comment = "累计执行成功次数"
  }
  column "execute_fail" {
    null    = true
    type    = bigint
    comment = "累计执行失败次数"
  }
  column "execute_abort" {
    null    = true
    type    = bigint
    comment = "累计执行中止次数"
  }
  column "robot_num" {
    null    = true
    type    = bigint
    comment = "累计机器人总数"
  }
  column "execute_total" {
    null    = true
    type    = bigint
    comment = "机器人累计执行次数"
  }
  column "execute_time_total" {
    null    = true
    type    = bigint
    comment = "全部机器人或全部终端累计执行时长，单位秒，只计算成功的"
  }
  column "execute_success_rate" {
    null     = true
    type     = decimal(5,2)
    unsigned = false
    comment  = "累计执行成功率"
  }
  column "user_num" {
    null    = true
    type    = bigint
    comment = "累计用户数量"
  }
  column "count_time" {
    null    = true
    type    = timestamp
    comment = "统计时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = false
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "terminal" {
    null    = true
    type    = bigint
    comment = "终端数量"
  }
  column "labor_save" {
    null    = true
    type    = bigint
    comment = "节省的人力"
  }
  primary_key {
    columns = [column.id]
  }
}
table "his_data_enum" {
  schema  = schema.rpa
  comment = "监控管理数据概览卡片配置数据枚举"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "parent_code" {
    null = true
    type = varchar(100)
  }
  column "icon" {
    null = true
    type = varchar(100)
  }
  column "field" {
    null = true
    type = varchar(100)
  }
  column "text" {
    null = true
    type = varchar(100)
  }
  column "num" {
    null = true
    type = varchar(100)
  }
  column "unit" {
    null = true
    type = varchar(100)
  }
  column "percent" {
    null = true
    type = varchar(100)
  }
  column "tip" {
    null = true
    type = varchar(100)
  }
  column "order" {
    null = true
    type = bigint
  }
  primary_key {
    columns = [column.id]
  }
}
table "his_robot" {
  schema  = schema.rpa
  comment = "单个机器人趋势表,当日数据"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "execute_num_total" {
    null    = true
    type    = bigint
    comment = "当日执行总次数"
  }
  column "execute_success" {
    null    = true
    type    = bigint
    comment = "每日成功次数"
  }
  column "execute_fail" {
    null    = true
    type    = bigint
    comment = "每日失败次数"
  }
  column "execute_abort" {
    null    = true
    type    = bigint
    comment = "每日中止次数"
  }
  column "execute_success_rate" {
    null     = true
    type     = decimal(5,2)
    unsigned = false
    comment  = "每日成功率"
  }
  column "execute_time" {
    null    = true
    type    = bigint
    comment = "每日执行时长，单位秒"
  }
  column "count_time" {
    null    = true
    type    = timestamp
    comment = "统计时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "robot_id" {
    null = true
    type = varchar(100)
  }
  column "user_id" {
    null    = true
    type    = char(36)
    comment = "用户id"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(100)
    comment = "部门全路径id"
  }
  primary_key {
    columns = [column.id]
  }
}
table "his_terminal" {
  schema  = schema.rpa
  comment = "单个终端趋势表"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(36)
    comment = "部门全路径id"
  }
  column "terminal_id" {
    null    = true
    type    = varchar(100)
    comment = "设备mac"
  }
  column "execute_time" {
    null    = true
    type    = bigint
    comment = "每日执行时长"
  }
  column "execute_num" {
    null    = true
    type    = bigint
    comment = "终端每日执行次数"
  }
  column "count_time" {
    null    = true
    type    = timestamp
    comment = "统计时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "his_terminal_count_time_IDX" {
    columns = [column.count_time]
  }
  index "his_terminal_tenant_id_IDX" {
    columns = [column.tenant_id, column.dept_id_path]
  }
  index "his_terminal_terminal_id_IDX" {
    columns = [column.terminal_id]
  }
}
table "install_package" {
  schema  = schema.rpa
  comment = "安装包表"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键ID"
    auto_increment = true
  }
  column "name" {
    null    = false
    type    = varchar(255)
    comment = "姓名"
  }
  column "download_path" {
    null    = false
    type    = varchar(500)
    comment = "下载链接"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建人ID"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新人ID"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "更新时间"
  }
  column "deleted" {
    null    = true
    type    = tinyint
    default = 0
    comment = "是否删除 0-未删除 1-已删除"
  }
  column "is_online" {
    null    = true
    type    = tinyint
    default = 0
    comment = "是否上线 0-不上线 1-上线"
  }
  primary_key {
    columns = [column.id]
  }
}
table "notify_send" {
  schema  = schema.rpa
  comment = "消息通知-消息表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "user_id" {
    null    = true
    type    = varchar(50)
    comment = "接收者"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "message_info" {
    null    = true
    type    = varchar(100)
    comment = "消息体id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "message_type" {
    null    = true
    type    = varchar(20)
    comment = "消息类型：邀人消息teamMarketInvite，更新消息teamMarketUpdate"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "operate_result" {
    null    = true
    type    = smallint
    comment = "操作结果：未读1， 已读2，已加入3，已拒绝4"
  }
  column "market_id" {
    null    = true
    type    = varchar(500)
    comment = "市场id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "更新时间"
  }
  column "deleted" {
    null    = true
    type    = smallint
    default = 0
    comment = "删除标识"
  }
  column "user_type" {
    null    = true
    type    = varchar(10)
    comment = "成员类型：owner,admin,consumer"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "app_name" {
    null = true
    type = varchar(200)
  }
  primary_key {
    columns = [column.id]
  }
}
table "openapi_auth" {
  schema  = schema.rpa
  comment = "openapi鉴权储存"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "name" {
    null = true
    type = varchar(50)
  }
  column "user_id" {
    null    = true
    type    = char(36)
    comment = "用户id"
  }
  column "api_key" {
    null = true
    type = varchar(100)
  }
  column "prefix" {
    null = true
    type = varchar(10)
  }
  column "created_at" {
    null = true
    type = datetime
  }
  column "updated_at" {
    null = true
    type = datetime
  }
  column "is_active" {
    null = true
    type = bool
  }
  primary_key {
    columns = [column.id]
  }
  index "UNIQUE" {
    unique  = true
    columns = [column.api_key]
  }
}
table "pypi_packages" {
  schema = schema.rpa
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "package_name" {
    null = false
    type = varchar(255)
  }
  column "oss_path" {
    null = false
    type = varchar(255)
  }
  column "visibility" {
    null    = true
    type    = bool
    default = 1
    comment = "visibility 1：公共可见包 2：个人私有包 3：灰度包，部分人可见"
  }
  column "user_id" {
    null    = true
    type    = char(36)
    default = "0"
    comment = "发布用户id"
  }
  column "create_time" {
    null    = true
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "update_time" {
    null      = true
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "unique_key" {
    unique  = true
    columns = [column.package_name, column.visibility, column.user_id]
  }
}
table "renewal_form" {
  schema  = schema.rpa
  comment = "续费表单表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "form_type" {
    null    = false
    type    = tinyint
    comment = "1=专业版 2=企业版 预留 3~99"
  }
  column "company_name" {
    null    = false
    type    = varchar(128)
    comment = "企业名称"
  }
  column "mobile" {
    null    = false
    type    = varchar(20)
    comment = "负责人手机号"
  }
  column "renewal_duration" {
    null    = false
    type    = varchar(32)
    comment = "续费时长"
  }
  column "status" {
    null    = false
    type    = tinyint
    default = 0
    comment = "0=待处理 1=已处理 2=已忽略"
  }
  column "remark" {
    null    = true
    type    = varchar(512)
    comment = "客服备注"
  }
  column "created_at" {
    null    = false
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    null      = false
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_created" {
    columns = [column.created_at]
  }
  index "idx_type_status" {
    columns = [column.form_type, column.status]
  }
}
table "robot_design" {
  schema  = schema.rpa
  comment = "云端机器人表"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "robot_id" {
    null    = true
    type    = varchar(100)
    comment = "机器人唯一id，获取的应用id"
  }
  column "name" {
    null    = true
    type    = varchar(100)
    comment = "当前名字，用于列表展示"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "app_id" {
    null    = true
    type    = varchar(50)
    comment = "appmarketResource中的应用id"
    charset = "utf8mb4"
    collate = "utf8mb4_general_ci"
  }
  column "app_version" {
    null    = true
    type    = int
    comment = "获取的应用：应用市场版本"
  }
  column "market_id" {
    null    = true
    type    = varchar(20)
    comment = "获取的应用：市场id"
    charset = "utf8mb4"
    collate = "utf8mb4_general_ci"
  }
  column "resource_status" {
    null    = true
    type    = varchar(20)
    comment = "资源状态：toObtain, obtained, toUpdate"
  }
  column "data_source" {
    null    = true
    type    = varchar(20)
    comment = "来源：create 自己创建 ； market 市场获取 "
  }
  column "transform_status" {
    null    = true
    type    = varchar(20)
    comment = "editing 编辑中，published 已发版，shared 已上架，locked锁定（无法编辑）"
  }
  column "edit_enable" {
    null    = true
    type    = varchar(100)
    comment = "废弃"
  }
  primary_key {
    columns = [column.id]
  }
}
table "robot_execute" {
  schema  = schema.rpa
  comment = "云端机器人表"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "robot_id" {
    null    = true
    type    = varchar(100)
    comment = "机器人唯一id，获取的应用id"
  }
  column "name" {
    null    = true
    type    = varchar(100)
    comment = "当前名字，用于列表展示"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "app_id" {
    null    = true
    type    = varchar(50)
    comment = "appmarketResource中的应用id"
    charset = "utf8mb4"
    collate = "utf8mb4_general_ci"
  }
  column "app_version" {
    null    = true
    type    = int
    comment = "获取的应用：应用市场版本"
  }
  column "market_id" {
    null    = true
    type    = varchar(20)
    comment = "获取的应用：市场id"
    charset = "utf8mb4"
    collate = "utf8mb4_general_ci"
  }
  column "resource_status" {
    null    = true
    type    = varchar(20)
    comment = "资源状态：toObtain, obtained, toUpdate"
  }
  column "data_source" {
    null    = true
    type    = varchar(20)
    comment = "来源：create 自己创建 ； market 市场获取 "
  }
  column "param_detail" {
    null    = true
    type    = text
    comment = "运行前用户自定义的表单参数"
    charset = "utf8mb4"
    collate = "utf8mb4_unicode_ci"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(200)
    comment = "部门全路径"
  }
  column "type" {
    null    = true
    type    = varchar(10)
    comment = "最新版本机器人的类型，web，other"
  }
  column "latest_release_time" {
    null    = true
    type    = timestamp
    comment = "最新版本发版时间"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_robot_id" {
    columns = [column.robot_id]
  }
}
table "robot_execute_record" {
  schema  = schema.rpa
  comment = "云端机器人执行记录表"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "execute_id" {
    null    = true
    type    = varchar(30)
    comment = "执行id"
  }
  column "robot_id" {
    null    = true
    type    = varchar(100)
    comment = "机器人id"
  }
  column "robot_version" {
    null    = true
    type    = int
    comment = "机器人版本号"
  }
  column "start_time" {
    null    = true
    type    = timestamp
    comment = "开始时间"
  }
  column "end_time" {
    null    = true
    type    = timestamp
    comment = "结束时间"
  }
  column "execute_time" {
    null    = true
    type    = bigint
    comment = "执行耗时 单位秒"
  }
  column "mode" {
    null    = true
    type    = varchar(60)
    comment = "工程列表页PROJECT_LIST ； 工程编辑页EDIT_PAGE； 计划任务启动CRONTAB ； 执行器运行 EXECUTOR"
  }
  column "task_execute_id" {
    null    = true
    type    = varchar(30)
    comment = "计划任务执行id，即schedule_task_execute的execute_id"
  }
  column "result" {
    null    = true
    type    = varchar(20)
    comment = "执行结果：robotFail:失败， robotSuccess:成功，robotCancel:取消(中止)，robotExecute:正在执行"
  }
  column "error_reason" {
    null    = true
    type    = varchar(255)
    comment = "错误原因"
  }
  column "execute_log" {
    null    = true
    type    = longtext
    comment = "日志内容"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "video_local_path" {
    null    = true
    type    = varchar(200)
    comment = "视频记录的本地存储路径"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(100)
    comment = "部门全路径编码"
  }
  column "terminal_id" {
    null    = true
    type    = char(36)
    comment = "终端唯一标识，如设备mac地址"
    charset = "utf8mb4"
    collate = "utf8mb4_general_ci"
  }
  column "data_table_path" {
    null    = true
    type    = varchar(255)
    comment = "数据抓取存储位置"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_rer_task_execute_id" {
    columns = [column.task_execute_id, column.deleted]
  }
  index "idx_robot_id" {
    columns = [column.robot_id]
  }
  index "robot_execute_record_execute_id_IDX" {
    columns = [column.execute_id, column.creator_id, column.tenant_id]
  }
}
table "robot_version" {
  schema  = schema.rpa
  comment = "云端机器人版本表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id"
    auto_increment = true
  }
  column "robot_id" {
    null    = true
    type    = varchar(100)
    comment = "机器人id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "version" {
    null    = true
    type    = int
    comment = "版本号"
  }
  column "introduction" {
    null    = true
    type    = longtext
    comment = "简介"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "update_log" {
    null    = true
    type    = longtext
    comment = "更新日志"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "use_description" {
    null    = true
    type    = longtext
    comment = "使用说明"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "online" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否启用 0:未启用,1:已启用"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "param" {
    null    = true
    type    = text
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "param_detail" {
    null    = true
    type    = text
    comment = "发版时拖的表单参数信息"
    collate = "utf8mb4_unicode_ci"
  }
  column "video_id" {
    null    = true
    type    = varchar(100)
    comment = "视频地址id"
  }
  column "appendix_id" {
    null    = true
    type    = varchar(100)
    comment = "附件地址id"
  }
  column "icon" {
    null    = true
    type    = varchar(100)
    comment = "图标"
  }
  primary_key {
    columns = [column.id]
  }
}
table "sample_templates" {
  schema  = schema.rpa
  comment = "系统预定义的模板库，用于注入用户初始化数据。支持 robot、project、task 等多种类型。"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    comment        = "主键"
    auto_increment = true
  }
  column "sample_id" {
    null    = true
    type    = varchar(100)
    comment = "样例id"
  }
  column "name" {
    null    = false
    type    = varchar(50)
    comment = "模版名称"
  }
  column "type" {
    null    = false
    type    = varchar(20)
    comment = "模板类型：robot_design, robot_execute, schedule_task 等"
  }
  column "version" {
    null    = false
    type    = varchar(20)
    default = "1.0.0"
    comment = "模板语义化版本号（如 1.2.0）"
  }
  column "data" {
    null    = false
    type    = mediumtext
    comment = "模板配置数据（JSON 格式），数据库一行的数据"
  }
  column "description" {
    null    = true
    type    = text
    comment = "模板说明"
  }
  column "is_active" {
    null    = false
    type    = tinyint
    default = 1
    comment = "是否启用（false 则新用户不注入）"
  }
  column "is_deleted" {
    null    = false
    type    = tinyint
    default = 0
    comment = "逻辑删除标记（避免物理删除）"
  }
  column "created_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_time" {
    null      = false
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
}
table "sample_users" {
  schema  = schema.rpa
  comment = "记录用户从系统模板中注入的样例数据，是模板工程的核心中间层。"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    comment        = "主键自增ID"
    auto_increment = true
  }
  column "creator_id" {
    null    = false
    type    = char(36)
    comment = "用户唯一标识（如 UUID）"
  }
  column "tenant_id" {
    null = true
    type = varchar(36)
  }
  column "sample_id" {
    null    = false
    type    = varchar(100)
    comment = "关联 sample_templates.sample_id"
  }
  column "name" {
    null    = false
    type    = varchar(100)
    comment = "用户看到的名称（默认继承模板 name，可自定义）"
  }
  column "data" {
    null    = false
    type    = mediumtext
    comment = "从模板中注入的配置数据（JSON 字符串，由 Java 序列化）"
  }
  column "source" {
    null    = false
    type    = enum("system","user")
    default = "system"
    comment = "来源：system（系统自动注入）或 user（用户手动创建/修改）"
  }
  column "version_injected" {
    null    = false
    type    = varchar(20)
    comment = "注入时所用模板的版本号，用于后续升级判断"
  }
  column "created_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updated_time" {
    null      = false
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "最后更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
}
table "schedule_task" {
  schema  = schema.rpa
  comment = "调度任务"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "task_id" {
    null    = true
    type    = varchar(100)
    comment = "计划任务id"
  }
  column "name" {
    null    = true
    type    = varchar(64)
    comment = "任务名称"
  }
  column "description" {
    null    = true
    type    = varchar(255)
    comment = "描述"
  }
  column "exception_handle_way" {
    null    = true
    type    = varchar(64)
    comment = "异常处理方式：stop停止  skip跳过"
  }
  column "run_mode" {
    null    = true
    type    = varchar(64)
    comment = "执行模式，循环cycle, 定时fixed,自定义custom"
  }
  column "cycle_frequency" {
    null    = true
    type    = varchar(10)
    comment = "循环频率,单位秒，-1为只有一次，3600，，，custom"
  }
  column "cycle_num" {
    null    = true
    type    = varchar(64)
    comment = "自定义循环，循环类型，每1小时，每3小时，，自定义"
  }
  column "cycle_unit" {
    null    = true
    type    = varchar(20)
    comment = "自定义循环，循环单位：minutes, hour"
  }
  column "status" {
    null    = true
    type    = varchar(64)
    comment = "状态：doing执行中 close已结束 ready待执行"
  }
  column "enable" {
    null    = true
    type    = bool
    comment = "启/禁用"
  }
  column "schedule_type" {
    null    = true
    type    = varchar(64)
    comment = "定时方式,day,month,week"
  }
  column "schedule_rule" {
    null    = true
    type    = varchar(255)
    comment = "定时配置（配置对象）"
  }
  column "start_at" {
    null    = true
    type    = datetime
    comment = "开始时间"
  }
  column "end_at" {
    null    = true
    type    = datetime
    comment = "结束时间"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "enable_queue_execution" {
    null    = true
    type    = bool
    comment = "是否排队执行"
  }
  column "cron_expression" {
    null    = true
    type    = varchar(50)
    comment = "cron表达式"
  }
  column "last_time" {
    null    = true
    type    = timestamp
    comment = "上次拉取时的nextTime"
  }
  column "next_time" {
    null    = true
    type    = timestamp
    comment = "下次执行时间"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建人ID"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null = true
    type = smallint
  }
  column "pull_time" {
    null    = true
    type    = timestamp
    comment = "上次拉取时间"
  }
  column "log_enable" {
    null    = true
    type    = varchar(5)
    default = "F"
    comment = "是否开启日志记录"
    charset = "utf8mb4"
    collate = "utf8mb4_general_ci"
  }
  primary_key {
    columns = [column.id]
  }
}
table "schedule_task_execute" {
  schema  = schema.rpa
  comment = "计划任务执行记录"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "task_id" {
    null    = true
    type    = varchar(20)
    comment = "任务ID"
  }
  column "task_execute_id" {
    null    = true
    type    = varchar(20)
    comment = "计划任务执行id"
  }
  column "count" {
    null    = true
    type    = int
    comment = "执行批次，1，2，3...."
  }
  column "result" {
    null    = true
    type    = varchar(20)
    comment = "任务状态枚举    成功  \"success\"     # 启动失败     \"start_error\"     # 执行失败      \"exe_error\"     # 取消     CANCEL = \"cancel\"     # 执行中   \"executing\""
  }
  column "start_time" {
    null    = true
    type    = datetime
    comment = "执行开始时间"
  }
  column "end_time" {
    null    = true
    type    = datetime
    comment = "执行结束时间"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_ste_query" {
    columns = [column.tenant_id, column.creator_id, column.start_time, column.deleted]
  }
  index "idx_ste_status" {
    columns = [column.tenant_id, column.creator_id, column.result, column.start_time, column.deleted]
  }
}
table "schedule_task_pull_log" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null = true
    type = bigint
  }
  column "task_id" {
    null    = true
    type    = varchar(100)
    comment = "计划任务id"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "pull_time" {
    null    = true
    type    = timestamp
    comment = "上次拉取时间"
  }
  column "last_time" {
    null    = true
    type    = timestamp
    comment = "上次拉取时的nextTime"
  }
  column "next_time" {
    null    = true
    type    = timestamp
    comment = "下次执行时间"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建人ID"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
}
table "schedule_task_robot" {
  schema  = schema.rpa
  comment = "计划任务机器人列表"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "task_id" {
    null    = true
    type    = varchar(30)
    comment = "任务ID"
  }
  column "robot_id" {
    null    = true
    type    = varchar(30)
    comment = "机器人ID"
  }
  column "sort" {
    null    = true
    type    = int
    comment = "排序, 越小越靠前"
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "param_json" {
    null    = true
    type    = mediumtext
    comment = "计划任务相关参数"
  }
  primary_key {
    columns = [column.id]
  }
}
table "shared_file" {
  schema  = schema.rpa
  comment = "共享文件表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "id"
    auto_increment = true
  }
  column "file_id" {
    null    = true
    type    = bigint
    comment = "文件对应的uuid"
  }
  column "path" {
    null    = true
    type    = varchar(500)
    comment = "文件在s3上对应的路径"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "更新时间"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "file_name" {
    null    = true
    type    = varchar(1000)
    comment = "文件真实名称"
  }
  column "tags" {
    null    = true
    type    = varchar(512)
    comment = "文件标签名称集合"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者ID"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "file_type" {
    null    = true
    type    = tinyint
    comment = "文件类型: 0-位置类型 1-文本 2-WORD 3-PDF"
  }
  column "file_index_status" {
    null    = true
    type    = tinyint
    comment = "文件向量化状态:1-初始化 2-完成 3-失败"
  }
  column "dept_id" {
    null    = true
    type    = varchar(100)
    comment = "部门id"
  }
  primary_key {
    columns = [column.id]
  }
}
table "shared_file_tag" {
  schema  = schema.rpa
  comment = "共享文件标签表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "tag_id" {
    null           = false
    type           = bigint
    unsigned       = true
    comment        = "标签id"
    auto_increment = true
  }
  column "tag_name" {
    null    = true
    type    = varchar(255)
    comment = "标签真实名称"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "更新时间"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者ID"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者ID"
  }
  primary_key {
    columns = [column.tag_id]
  }
}
table "shared_sub_var" {
  schema  = schema.rpa
  comment = "共享变量-子变量"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    comment        = "子变量id"
    auto_increment = true
  }
  column "shared_var_id" {
    null     = false
    type     = bigint
    unsigned = true
    comment  = "共享变量id"
  }
  column "var_name" {
    null    = true
    type    = varchar(255)
    comment = "子变量名"
  }
  column "var_type" {
    null    = true
    type    = varchar(20)
    comment = "变量类型：text/password/array"
  }
  column "var_value" {
    null    = true
    type    = varchar(750)
    comment = "变量具体值，加密则为密文，否则为明文"
  }
  column "encrypt" {
    null    = true
    type    = bool
    comment = "是否加密:1-加密"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_shared_var_id" {
    columns = [column.shared_var_id]
  }
}
table "shared_var" {
  schema  = schema.rpa
  comment = "共享变量信息"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "shared_var_name" {
    null    = true
    type    = varchar(255)
    comment = "共享变量名"
  }
  column "status" {
    null    = true
    type    = bool
    comment = "启用状态：1启用"
  }
  column "remark" {
    null    = true
    type    = varchar(255)
    comment = "变量说明"
  }
  column "dept_id" {
    null    = true
    type    = char(36)
    comment = "所屬部门ID"
  }
  column "usage_type" {
    null    = true
    type    = varchar(10)
    comment = "可使用账号类别(all/dept/select)：所有人：all、所属部门所有人：dept、指定人：select"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "shared_var_type" {
    null    = true
    type    = varchar(20)
    comment = "共享变量类型：text/password/array/group"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_dept_id_path" {
    columns = [column.dept_id]
  }
}
table "shared_var_key_tenant" {
  schema  = schema.rpa
  comment = "共享变量租户密钥表"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "tenant_id" {
    null = false
    type = varchar(36)
  }
  column "key" {
    null    = true
    type    = varchar(500)
    comment = "共享变量租户密钥"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_tenant_id" {
    columns = [column.tenant_id]
  }
}
table "shared_var_user" {
  schema  = schema.rpa
  comment = "共享变量与用户的映射表；N:N映射"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "shared_var_id" {
    null     = false
    type     = bigint
    unsigned = true
    comment  = "共享变量id"
  }
  column "user_id" {
    null    = true
    type    = char(36)
    comment = "用户id"
  }
  column "user_name" {
    null    = true
    type    = varchar(100)
    comment = "用户姓名"
  }
  column "user_phone" {
    null    = true
    type    = varchar(100)
    comment = "用户手机号"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_shared_var_id" {
    columns = [column.shared_var_id]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
}
table "sms_record" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = int
    comment        = "ID"
    auto_increment = true
  }
  column "receiver" {
    null    = true
    type    = varchar(30)
    comment = "短信接收者"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "send_type" {
    null    = true
    type    = varchar(30)
    comment = "短信类型"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "send_result" {
    null    = true
    type    = varchar(20)
    comment = "发送结果"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "fail_reason" {
    null    = true
    type    = varchar(3000)
    comment = "失败原因"
    charset = "utf8"
    collate = "utf8_general_ci"
  }
  column "create_by" {
    null    = true
    type    = int
    comment = "创建者"
  }
  column "create_time" {
    null    = true
    type    = datetime
    comment = "创建时间"
  }
  column "update_by" {
    null    = true
    type    = int
    comment = "更新者"
  }
  column "update_time" {
    null    = true
    type    = datetime
    comment = "更新时间"
  }
  column "deleted" {
    null    = true
    type    = int
    comment = "是否已删除"
  }
  primary_key {
    columns = [column.id]
  }
}
table "sys_product_version" {
  schema  = schema.rpa
  comment = "产品版本表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键ID"
    auto_increment = true
  }
  column "version_code" {
    null    = false
    type    = varchar(50)
    comment = "版本代码（如：personal, professional, enterprise）"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "删除标识：0-未删除，1-已删除"
  }
  column "create_time" {
    null    = true
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  primary_key {
    columns = [column.id]
  }
  index "uk_version_code" {
    unique  = true
    columns = [column.version_code]
  }
}
table "sys_tenant_config" {
  schema  = schema.rpa
  comment = "租户配置表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键ID"
    auto_increment = true
  }
  column "tenant_id" {
    null    = false
    type    = varchar(64)
    comment = "租户ID"
  }
  column "version_id" {
    null    = false
    type    = bigint
    comment = "版本ID，关联sys_product_version.id"
  }
  column "extra_config_json" {
    null    = false
    type    = text
    comment = "配置快照（JSON格式，只包含type、base、final字段）"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "删除标识：0-未删除，1-已删除"
  }
  column "create_time" {
    null    = true
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "uk_tenant_id" {
    unique  = true
    columns = [column.tenant_id]
  }
}
table "sys_version_default_config" {
  schema  = schema.rpa
  comment = "版本默认配置表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键ID"
    auto_increment = true
  }
  column "version_id" {
    null    = false
    type    = bigint
    comment = "版本ID，关联sys_product_version.id"
  }
  column "resource_code" {
    null    = false
    type    = varchar(100)
    comment = "资源代码（如：designer_count, component_count等）"
  }
  column "resource_type" {
    null    = false
    type    = bool
    comment = "资源类型：1-Quota（配额），2-Switch（开关）"
  }
  column "parent_code" {
    null    = true
    type    = varchar(100)
    comment = "父级资源代码（用于层级关系）"
  }
  column "default_value" {
    null    = false
    type    = int
    comment = "默认值（对于Quota是数量，对于Switch是0或1）"
  }
  column "url_patterns" {
    null    = true
    type    = text
    comment = "URL路由模式（JSON数组格式，如：[\"/api/v1/design/**\"]）"
  }
  column "description" {
    null    = true
    type    = varchar(500)
    comment = "资源描述"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "删除标识：0-未删除，1-已删除"
  }
  column "create_time" {
    null    = true
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_resource_code" {
    columns = [column.resource_code]
  }
  index "idx_version_id" {
    columns = [column.version_id]
  }
}
table "task_mail" {
  schema  = schema.rpa
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "user_id" {
    null = true
    type = char(36)
  }
  column "tenant_id" {
    null = true
    type = char(36)
  }
  column "resource_id" {
    null = true
    type = varchar(255)
  }
  column "email_service" {
    null    = true
    type    = varchar(50)
    comment = "邮箱服务器，163Email、126Email、qqEmail、customEmail"
  }
  column "email_protocol" {
    null    = true
    type    = varchar(50)
    comment = "使用协议，POP3,IMAP"
  }
  column "email_service_address" {
    null    = true
    type    = varchar(255)
    comment = "邮箱服务器地址"
  }
  column "port" {
    null    = true
    type    = varchar(50)
    comment = "邮箱服务器端口"
  }
  column "enable_ssl" {
    null    = true
    type    = bool
    comment = "是否使用SSL"
  }
  column "email_account" {
    null    = true
    type    = varchar(255)
    comment = "邮箱账号"
  }
  column "authorization_code" {
    null    = true
    type    = varchar(255)
    comment = "邮箱授权码"
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除"
  }
  primary_key {
    columns = [column.id]
  }
}
table "terminal" {
  schema  = schema.rpa
  comment = "终端表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null           = false
    type           = bigint
    comment        = "主键id，用于数据定时统计的进度管理"
    auto_increment = true
  }
  column "terminal_id" {
    null    = false
    type    = char(36)
    comment = "终端唯一标识，如设备mac地址"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "dept_id" {
    null    = true
    type    = varchar(100)
    comment = "部门id"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(100)
    comment = "部门全路径id"
  }
  column "name" {
    null    = true
    type    = varchar(200)
    comment = "终端名称"
  }
  column "account" {
    null    = true
    type    = varchar(100)
    comment = "设备账号"
  }
  column "os" {
    null    = true
    type    = varchar(50)
    comment = "操作系统"
  }
  column "ip" {
    null    = true
    type    = varchar(200)
    comment = "ip列表"
  }
  column "actual_client_ip" {
    null    = true
    type    = varchar(100)
    comment = "实际连接源IP，服务端检测后的推荐ip"
  }
  column "custom_ip" {
    null    = true
    type    = varchar(20)
    comment = "用户自定义ip"
  }
  column "port" {
    null    = true
    type    = int
    comment = "端口"
  }
  column "status" {
    null    = true
    type    = varchar(20)
    comment = "当前状态，运行中busy，空闲free，离线offline，单机中standalone"
  }
  column "remark" {
    null    = true
    type    = varchar(100)
    comment = "终端描述"
  }
  column "user_id" {
    null    = true
    type    = varchar(100)
    comment = "最后登录的用户的id，用于根据姓名筛选"
  }
  column "os_name" {
    null    = true
    type    = char(36)
    comment = "信息维护：电脑设备用户名"
  }
  column "os_pwd" {
    null    = true
    type    = varchar(200)
    comment = "信息维护：电脑设备用户密码"
  }
  column "is_dispatch" {
    null    = true
    type    = smallint
    comment = "是否调度模式"
  }
  column "monitor_url" {
    null    = true
    type    = varchar(100)
    comment = "视频监控url"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "终端记录创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = false
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "custom_port" {
    null    = true
    type    = int
    comment = "自定义端口"
  }
  primary_key {
    columns = [column.id]
  }
  index "cloud_terminal_mac_tenant_index" {
    columns = [column.tenant_id]
  }
  index "cloud_terminal_tenant_id_IDX" {
    columns = [column.tenant_id, column.dept_id_path]
  }
  index "cloud_terminal_user_id_IDX" {
    columns = [column.os_name]
  }
}
table "terminal_group" {
  schema  = schema.rpa
  comment = "终端分组-分组与终端的映射表；N:N映射"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "group_id" {
    null    = true
    type    = bigint
    comment = "分组名"
  }
  column "terminal_id" {
    null    = true
    type    = bigint
    comment = "终端id"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_group_id" {
    columns = [column.group_id]
  }
  index "idx_terminal_id" {
    columns = [column.terminal_id]
  }
}
table "terminal_group_info" {
  schema  = schema.rpa
  comment = "终端分组"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "group_name" {
    null    = true
    type    = varchar(100)
    comment = "分组名"
  }
  column "terminal_id" {
    null    = true
    type    = varchar(20)
    comment = "终端id"
  }
  column "dept_id" {
    null    = true
    type    = char(36)
    comment = "所屬部门ID"
  }
  column "usage_type" {
    null    = true
    type    = varchar(10)
    comment = "可使用账号类别(all/dept/select)：所有人：all、所属部门所有人：dept、指定人：select"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_dept_id_path" {
    columns = [column.dept_id]
  }
  index "idx_terminal_id" {
    columns = [column.terminal_id]
  }
}
table "terminal_group_user" {
  schema  = schema.rpa
  comment = "终端分组-分组与用户的映射表；N:N映射"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "group_id" {
    null    = true
    type    = varchar(20)
    comment = "分组名"
  }
  column "user_id" {
    null    = true
    type    = char(36)
    comment = "用户id"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  column "user_name" {
    null    = true
    type    = varchar(100)
    comment = "用户姓名"
  }
  column "user_phone" {
    null    = true
    type    = varchar(100)
    comment = "用户手机号"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_group_id" {
    columns = [column.group_id]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
}
table "terminal_login_history" {
  schema  = schema.rpa
  comment = "终端登录账号历史记录"
  column "id" {
    null           = false
    type           = bigint
    unsigned       = true
    auto_increment = true
  }
  column "terminal_id" {
    null    = true
    type    = varchar(20)
    comment = "终端id"
  }
  column "account" {
    null    = true
    type    = varchar(100)
    comment = "账号"
  }
  column "user_name" {
    null    = true
    type    = varchar(100)
    comment = "用户名"
  }
  column "login_time" {
    null    = true
    type    = timestamp
    comment = "登录时间"
  }
  column "logout_time" {
    null    = true
    type    = timestamp
    comment = "登出时间"
  }
  column "creator_id" {
    null    = true
    type    = bigint
    comment = "创建者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updater_id" {
    null    = true
    type    = bigint
    comment = "更新者id"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
}
table "terminal_login_record" {
  schema  = schema.rpa
  comment = "终端登录账号历史记录"
  charset = "utf8mb4"
  collate = "utf8mb4_bin"
  column "id" {
    null = false
    type = char(36)
  }
  column "login_user_id" {
    null    = true
    type    = char(36)
    comment = "登录用户id"
  }
  column "login_phone" {
    null    = true
    type    = varchar(40)
    comment = "登录手机号"
  }
  column "login_name" {
    null    = true
    type    = varchar(40)
    comment = "登录名称"
  }
  column "login_time" {
    null    = true
    type    = timestamp
    comment = "登录时间"
  }
  column "logout_time" {
    null    = true
    type    = timestamp
    comment = "登出时间"
  }
  column "terminal_id" {
    null    = true
    type    = varchar(20)
    comment = "终端id"
  }
  column "dept_id" {
    null    = true
    type    = char(36)
    comment = "部门id"
  }
  column "dept_id_path" {
    null    = true
    type    = varchar(100)
    comment = "部门全路径id"
  }
  column "ip" {
    null    = true
    type    = varchar(40)
    comment = "登录IP"
  }
  column "user_agent" {
    null    = true
    type    = varchar(512)
    comment = "user-agent"
  }
  column "login_status" {
    null    = false
    type    = int
    comment = "是否登录成功{0:登录失败，1:登录成功}"
  }
  column "remark" {
    null    = true
    type    = varchar(1000)
    comment = "操作描述"
  }
  column "creator_id" {
    null    = true
    type    = char(36)
    comment = "创建者id"
  }
  column "updater_id" {
    null    = true
    type    = char(36)
    comment = "更新者id"
  }
  column "create_time" {
    null    = true
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = timestamp
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "deleted" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除 0：未删除，1：已删除"
  }
  primary_key {
    columns = [column.id]
  }
}
table "trigger_task" {
  schema  = schema.rpa
  comment = "触发器计划任务"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "task_id" {
    null    = true
    type    = bigint
    comment = "触发器计划任务id"
  }
  column "name" {
    null    = true
    type    = varchar(50)
    comment = "触发器计划任务名称"
  }
  column "task_json" {
    null    = true
    type    = mediumtext
    comment = "构建计划任务的灵活参数"
  }
  column "creator_id" {
    null = true
    type = char(36)
  }
  column "updater_id" {
    null = true
    type = char(36)
  }
  column "deleted" {
    null    = false
    type    = bool
    default = 0
  }
  column "create_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
    comment = "更新时间"
  }
  column "task_type" {
    null    = true
    type    = varchar(20)
    comment = "任务类型：定时schedule、邮件mail、文件file、热键hotKey:"
  }
  column "enable" {
    null    = false
    type    = bool
    default = 0
    comment = "是否启用"
  }
  column "exceptional" {
    null    = false
    type    = varchar(20)
    default = "stop"
    comment = "报错如何处理：跳过jump、停止stop"
  }
  column "timeout" {
    null    = true
    type    = int
    default = 9999
    comment = "超时时间"
  }
  column "tenant_id" {
    null    = true
    type    = char(36)
    comment = "租户id"
  }
  column "queue_enable" {
    null    = true
    type    = smallint
    default = 0
    comment = "是否启用排队 1:启用 0:不启用"
  }
  column "retry_num" {
    null    = true
    type    = int
    comment = "只有exceptional为retry时，记录的重试次数"
  }
  primary_key {
    columns = [column.id]
  }
}
table "t_tenant_expiration" {
  schema  = schema.rpa
  comment = "租户到期信息表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null    = false
    type    = varchar(64)
    comment = "主键ID"
  }
  column "tenant_id" {
    null    = false
    type    = varchar(64)
    comment = "租户ID"
  }
  column "expiration_date" {
    null    = true
    type    = varchar(64)
    comment = "到期时间（格式：YYYY-MM-DD，非买断企业版为加密数据，专业版为明文）"
  }
  column "create_time" {
    null    = true
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "is_delete" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除（0-否，1-是）"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_is_delete" {
    columns = [column.is_delete]
  }
  index "idx_tenant_id" {
    columns = [column.tenant_id]
  }
  index "uk_tenant_id" {
    unique  = true
    columns = [column.tenant_id]
  }
}
table "user_blacklist" {
  schema = schema.rpa
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "user_id" {
    null    = false
    type    = varchar(50)
    comment = "用户ID"
  }
  column "username" {
    null    = false
    type    = varchar(100)
    comment = "用户名"
  }
  column "ban_reason" {
    null    = true
    type    = varchar(500)
    comment = "封禁原因"
  }
  column "ban_level" {
    null    = true
    type    = int
    default = 1
    comment = "封禁等级(1,2,3...)"
  }
  column "ban_count" {
    null    = true
    type    = int
    default = 1
    comment = "封禁次数"
  }
  column "ban_duration" {
    null    = true
    type    = bigint
    comment = "封禁时长(秒)"
  }
  column "start_time" {
    null    = false
    type    = datetime
    comment = "封禁开始时间"
  }
  column "end_time" {
    null    = false
    type    = datetime
    comment = "封禁结束时间"
  }
  column "status" {
    null    = true
    type    = tinyint
    default = 1
    comment = "状态(1:生效中, 0:已解封)"
  }
  column "operator" {
    null    = true
    type    = varchar(50)
    comment = "操作人"
  }
  column "create_time" {
    null    = true
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "update_time" {
    null      = true
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_end_time_status" {
    columns = [column.end_time, column.status]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
}
table "user_entitlement" {
  schema  = schema.rpa
  comment = "用户权益表"
  charset = "utf8mb4"
  collate = "utf8mb4_general_ci"
  column "id" {
    null    = false
    type    = varchar(64)
    comment = "主键ID"
  }
  column "user_id" {
    null    = false
    type    = varchar(64)
    comment = "用户ID"
  }
  column "tenant_id" {
    null    = false
    type    = varchar(64)
    comment = "租户ID"
  }
  column "module_designer" {
    null    = true
    type    = bool
    default = 0
    comment = "设计器权限（0-无权限，1-有权限）"
  }
  column "module_executor" {
    null    = true
    type    = bool
    default = 0
    comment = "执行器权限（0-无权限，1-有权限）"
  }
  column "module_console" {
    null    = true
    type    = bool
    default = 0
    comment = "控制台权限（0-无权限，1-有权限）"
  }
  column "module_market" {
    null    = true
    type    = bool
    default = 1
    comment = "团队市场权限（0-无权限，1-有权限，默认1）"
  }
  column "create_time" {
    null    = true
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "update_time" {
    null      = true
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "is_delete" {
    null    = true
    type    = bool
    default = 0
    comment = "是否删除（0-否，1-是）"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_is_delete" {
    columns = [column.is_delete]
  }
  index "idx_tenant_id" {
    columns = [column.tenant_id]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
  index "uk_user_tenant" {
    unique  = true
    columns = [column.user_id, column.tenant_id, column.is_delete]
  }
}
table "astron_agent_auth" {
  schema = schema.rpa
  comment = "星辰Agent鉴权储存"
  charset = "utf8mb4"
  collate = "utf8mb4_0900_ai_ci"
  column "id" {
    null           = false
    type           = int
    auto_increment = true
  }

  column "user_id" {
    null = true
    type = varchar(50)
  }

  column "astron_user_name" {
    null = true
    type = varchar(50)
  }

  column "name" {
    null = true
    type = varchar(50)
  }

  column "app_id" {
    null = true
    type = varchar(50)
  }

  column "api_key" {
    null = true
    type = varchar(100)
  }

  column "api_secret" {
    null = true
    type = varchar(100)
  }

  column "created_at" {
    null = true
    type = datetime
  }

  column "updated_at" {
    null = true
    type = datetime
  }

  column "is_active" {
    null = true
    type = tinyint(1)
  }

  primary_key {
    columns = [column.id]
  }
}
table "openai_workflows" {
  schema  = schema.rpa
  collate = "utf8mb4_0900_ai_ci"
  column "project_id" {
    null    = false
    type    = varchar(100)
    comment = "项目ID（主键）"
  }
  column "name" {
    null    = false
    type    = varchar(100)
    comment = "工作流名称"
  }
  column "description" {
    null    = true
    type    = varchar(500)
    comment = "工作流描述"
  }
  column "version" {
    null    = false
    type    = int
    default = 1
    comment = "工作流版本号"
  }
  column "status" {
    null    = false
    type    = int
    default = 1
    comment = "工作流状态（1=激活，0=禁用）"
  }
  column "user_id" {
    null    = false
    type    = varchar(50)
    comment = "用户ID"
  }
  column "example_project_id" {
    null    = true
    type    = varchar(100)
    comment = "示例用户账号下的project_id，用于执行时映射"
  }
  column "created_at" {
    null    = false
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
    comment = "创建时间"
  }
  column "updated_at" {
    null      = false
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    comment   = "更新时间"
    on_update = sql("CURRENT_TIMESTAMP")
  }
  column "english_name" {
    null    = true
    type    = varchar(100)
    comment = "翻译后的英文名称"
  }
  column "parameters" {
    null    = true
    type    = text
    comment = "存储JSON字符串格式的参数"
  }
  primary_key {
    columns = [column.project_id]
  }
  index "idx_created_at" {
    columns = [column.created_at]
  }
  index "idx_name" {
    columns = [column.name]
  }
  index "idx_status" {
    columns = [column.status]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
}
table "openai_executions" {
  schema  = schema.rpa
  collate = "utf8mb4_0900_ai_ci"
  column "id" {
    null    = false
    type    = varchar(36)
    comment = "执行记录ID（UUID）"
  }
  column "project_id" {
    null    = false
    type    = varchar(100)
    comment = "项目ID（关联工作流）"
  }
  column "status" {
    null    = false
    type    = varchar(20)
    default = "PENDING"
    comment = "执行状态（PENDING/RUNNING/COMPLETED/FAILED/CANCELLED）"
  }
  column "parameters" {
    null    = true
    type    = text
    comment = "执行参数（JSON格式）"
  }
  column "result" {
    null    = true
    type    = text
    comment = "执行结果（JSON格式）"
  }
  column "error" {
    null    = true
    type    = text
    comment = "错误信息"
  }
  column "user_id" {
    null    = false
    type    = varchar(50)
    comment = "用户ID"
  }
  column "exec_position" {
    null    = false
    type    = varchar(50)
    default = "EXECUTOR"
    comment = "执行位置"
  }
  column "recording_config" {
    null    = true
    type    = text
    comment = "录制配置"
  }
  column "version" {
    null    = true
    type    = int
    comment = "工作流版本号"
  }
  column "start_time" {
    null    = false
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
    comment = "开始时间"
  }
  column "end_time" {
    null    = true
    type    = datetime
    comment = "结束时间"
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "openai_executions_ibfk_1" {
    columns     = [column.project_id]
    ref_columns = [table.openai_workflows.column.project_id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_project_id" {
    columns = [column.project_id]
  }
  index "idx_start_time" {
    columns = [column.start_time]
  }
  index "idx_status" {
    columns = [column.status]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
}
table "openapi_users" {
  schema  = schema.rpa
  collate = "utf8mb4_0900_ai_ci"
  column "id" {
    null           = false
    type           = int
    auto_increment = true
  }
  column "user_id" {
    null = false
    type = varchar(50)
  }
  column "phone" {
    null = false
    type = varchar(20)
  }
  column "default_api_key" {
    null = true
    type = varchar(100)
  }
  column "created_at" {
    null    = false
    type    = datetime
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    null      = false
    type      = datetime
    default   = sql("CURRENT_TIMESTAMP")
    on_update = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_phone" {
    columns = [column.phone]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
  index "phone" {
    unique  = true
    columns = [column.phone]
  }
  index "user_id" {
    unique  = true
    columns = [column.user_id]
  }
}
table "point_allocations" {
  schema  = schema.rpa
  collate = "utf8mb4_0900_ai_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "user_id" {
    null = false
    type = varchar(50)
  }
  column "initial_amount" {
    null    = false
    type    = int
    comment = "原始分配数量"
  }
  column "remaining_amount" {
    null    = false
    type    = int
    comment = "当前剩余数量"
  }
  column "allocation_type" {
    null    = false
    type    = varchar(100)
    comment = "积分来源"
  }
  column "priority" {
    null    = false
    type    = int
    default = 0
    comment = "优先级，数值越高优先级越高"
  }
  column "created_at" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "expires_at" {
    null    = false
    type    = datetime
    comment = "积分过期时间"
  }
  column "description" {
    null    = true
    type    = varchar(255)
    comment = "描述"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_expires_at" {
    columns = [column.expires_at]
  }
  index "idx_user_expiry" {
    columns = [column.user_id, column.expires_at]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
}
table "point_consumptions" {
  schema  = schema.rpa
  collate = "utf8mb4_0900_ai_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "transaction_id" {
    null    = false
    type    = bigint
    comment = "关联的交易ID"
  }
  column "allocation_id" {
    null    = false
    type    = bigint
    comment = "关联的分配ID"
  }
  column "amount" {
    null    = false
    type    = int
    comment = "从此分配中使用的积分数量"
  }
  column "created_at" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
}
table "point_transactions" {
  schema  = schema.rpa
  collate = "utf8mb4_0900_ai_ci"
  column "id" {
    null           = false
    type           = bigint
    auto_increment = true
  }
  column "user_id" {
    null = false
    type = varchar(100)
  }
  column "amount" {
    null    = false
    type    = int
    comment = "交易总金额（正数或负数）"
  }
  column "transaction_type" {
    null    = false
    type    = varchar(50)
    comment = "交易类型"
  }
  column "related_entity_type" {
    null    = true
    type    = varchar(50)
    comment = "关联实体类型"
  }
  column "related_entity_id" {
    null    = true
    type    = bigint
    comment = "关联实体ID"
  }
  column "description" {
    null    = true
    type    = varchar(255)
    comment = "描述"
  }
  column "created_at" {
    null    = false
    type    = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_user_id" {
    columns = [column.user_id]
  }
}
schema "rpa" {
  charset = "utf8"
  collate = "utf8_general_ci"
}
