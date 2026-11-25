"""Console resources mapped to their retained business tables."""

from django.db import models
from django.utils import timezone

from astron_console.fields import StoredBooleanField


class Model(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    desc = models.CharField(max_length=1024, null=True, blank=True)
    source = models.IntegerField(null=True, blank=True)
    uid = models.CharField(max_length=128, default="")
    type = models.IntegerField(null=True, blank=True)
    url = models.CharField(max_length=1024, null=True, blank=True)
    domain = models.CharField(max_length=100, null=True, blank=True)
    api_key = models.CharField(max_length=1024, null=True, blank=True)
    sub_type = models.BigIntegerField(null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    is_deleted = StoredBooleanField(default=False)
    image_url = models.CharField(max_length=255, null=True, blank=True)
    doc_url = models.CharField(max_length=255, null=True, blank=True)
    remark = models.CharField(max_length=255, null=True, blank=True)
    sort = models.IntegerField(null=True, blank=True, default=0)
    channel = models.CharField(max_length=255, null=True, blank=True, default="0")
    tag = models.CharField(max_length=255, null=True, blank=True)
    color = models.CharField(max_length=100, null=True, blank=True)
    create_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    config = models.TextField(null=True, blank=True)
    space_id = models.BigIntegerField(null=True, blank=True)
    enable = StoredBooleanField(null=True, blank=True, default=True)
    status = models.IntegerField(null=True, blank=True)
    accelerator_count = models.IntegerField(null=True, blank=True)
    replica_count = models.IntegerField(null=True, blank=True)
    model_path = models.CharField(max_length=100, null=True, blank=True)
    provider = models.CharField(max_length=32, null=True, blank=True)
    is_think = StoredBooleanField(default=False)
    multi_mode = StoredBooleanField(default=False)

    class Meta:
        db_table = "model"


class OfficialModel(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=128, default="")
    desc = models.CharField(max_length=500, null=True, blank=True)
    intro = models.CharField(max_length=255, default="")
    user_name = models.CharField(max_length=64, default="")
    user_avatar = models.CharField(max_length=255, default="")
    service_id = models.CharField(max_length=128, default="")
    server_id = models.CharField(max_length=128, default="")
    domain = models.CharField(max_length=128, default="")
    lic_channel = models.CharField(max_length=128, default="")
    llm_source = models.CharField(max_length=128, default="")
    url = models.CharField(max_length=128, default="")
    model_type = models.IntegerField(default=0)
    type = models.IntegerField(default=0)
    source = models.IntegerField(default=0)
    is_think = models.IntegerField(default=0)
    multi_mode = models.IntegerField(default=0)
    is_delete = models.IntegerField(default=0)
    create_by = models.BigIntegerField(default=0)
    create_time = models.DateTimeField(default=timezone.now)
    update_by = models.BigIntegerField(default=0)
    update_time = models.DateTimeField(default=timezone.now)
    uid = models.CharField(max_length=128, null=True, blank=True)
    disclaimer = models.CharField(max_length=2048, null=True, blank=True, default="")
    config = models.TextField(null=True, blank=True)
    shelf_status = models.IntegerField(null=True, blank=True, default=0)
    shelf_off_time = models.DateTimeField(null=True, blank=True)
    http_url = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "model_common"


class ModelCategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    pid = models.BigIntegerField()
    key = models.CharField(max_length=100, default="")
    name = models.CharField(max_length=255, default="")
    is_delete = models.IntegerField(default=0)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "model_category"


class ModelCategoryRelation(models.Model):
    id = models.BigAutoField(primary_key=True)
    model_id = models.BigIntegerField()
    category_id = models.BigIntegerField()
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "model_category_rel"


class CustomCategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    owner_uid = models.CharField(max_length=128, default="")
    key = models.CharField(max_length=100, default="")
    name = models.CharField(max_length=255, default="")
    pid = models.BigIntegerField(null=True, blank=True)
    audit_status = models.IntegerField(default=1)
    is_delete = models.IntegerField(default=0)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "model_custom_category"


class CustomCategoryRelation(models.Model):
    id = models.BigAutoField(primary_key=True)
    model_id = models.BigIntegerField()
    custom_id = models.BigIntegerField()
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "model_custom_category_rel"


class ConfigInfo(models.Model):
    id = models.BigAutoField(primary_key=True)
    category = models.CharField(max_length=64, null=True, blank=True)
    code = models.CharField(max_length=128, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    value = models.TextField(null=True, blank=True)
    is_valid = models.IntegerField(null=True, blank=True)
    remarks = models.CharField(max_length=1000, null=True, blank=True)
    create_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, blank=True, default=timezone.now)

    class Meta:
        db_table = "config_info"


class Tool(models.Model):
    id = models.BigAutoField(primary_key=True)
    tool_id = models.CharField(max_length=30, null=True, blank=True)
    name = models.CharField(max_length=64, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    icon = models.CharField(max_length=255, null=True, blank=True)
    user_id = models.CharField(max_length=256, null=True, blank=True)
    app_id = models.CharField(max_length=60, null=True, blank=True)
    end_point = models.TextField(null=True, blank=True)
    method = models.CharField(max_length=255, null=True, blank=True)
    web_schema = models.TextField(null=True, blank=True)
    schema = models.TextField(null=True, blank=True)
    visibility = models.IntegerField(null=True, blank=True, default=0)
    deleted = models.IntegerField(null=True, blank=True, default=0)
    create_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    is_public = StoredBooleanField(null=True, blank=True, default=False)
    favorite_count = models.IntegerField(null=True, blank=True, default=0)
    usage_count = models.IntegerField(null=True, blank=True, default=0)
    tool_tag = models.CharField(max_length=255, null=True, blank=True)
    operation_id = models.CharField(max_length=255, null=True, blank=True)
    creation_method = models.IntegerField(null=True, blank=True, default=0)
    auth_type = models.IntegerField(null=True, blank=True, default=0)
    auth_info = models.CharField(max_length=1024, null=True, blank=True)
    top = models.IntegerField(null=True, blank=True, default=0)
    source = models.IntegerField(null=True, blank=True, default=1)
    display_source = models.CharField(max_length=16, null=True, blank=True, default="1,2")
    avatar_color = models.CharField(max_length=255, null=True, blank=True)
    status = models.IntegerField(default=1)
    version = models.CharField(max_length=100, null=True, blank=True)
    temporary_data = models.TextField(null=True, blank=True)
    space_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "tool_box"


class ToolFavorite(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.CharField(max_length=128, default="")
    tool_id = models.BigIntegerField()
    tool_flag_id = models.CharField(max_length=30, null=True, blank=True)
    created_time = models.DateTimeField(default=timezone.now)
    is_deleted = models.IntegerField(null=True, blank=True, default=0)
    use_flag = models.IntegerField(null=True, blank=True, default=0)
    mcp_tool_id = models.CharField(max_length=100, null=True, blank=True)
    plugin_tool_id = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "user_favorite_tool"


class ToolFeedback(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.CharField(max_length=100, default="")
    tool_id = models.CharField(max_length=100, null=True, blank=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    remark = models.CharField(max_length=1000, null=True, blank=True)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tool_box_feedback"


class ToolHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    tool_id = models.CharField(max_length=100, default="")
    uid = models.CharField(max_length=100, default="")
    type = models.IntegerField()
    create_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tool_box_operate_history"


class McpConfig(models.Model):
    name = models.CharField(max_length=255, blank=True, default="")
    space_id = models.BigIntegerField(null=True, blank=True)
    id = models.BigAutoField(primary_key=True)
    mcp_id = models.CharField(max_length=255, null=True, blank=True)
    server_id = models.CharField(max_length=255, null=True, blank=True)
    sort_link = models.CharField(max_length=1024, null=True, blank=True)
    uid = models.CharField(max_length=128, default="")
    type = models.CharField(max_length=255, null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    is_deleted = StoredBooleanField(default=False)
    create_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    parameters = models.TextField(null=True, blank=True)
    customize = StoredBooleanField(null=True, blank=True)

    class Meta:
        db_table = "mcp_tool_config"


class RpaPlatform(models.Model):
    id = models.BigAutoField(primary_key=True)
    category = models.CharField(max_length=64, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    value = models.TextField(null=True, blank=True)
    is_deleted = models.IntegerField(null=True, blank=True, default=0)
    remarks = models.CharField(max_length=1000, null=True, blank=True)
    icon = models.CharField(max_length=150, null=True, blank=True)
    create_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, blank=True, default=timezone.now)
    path = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "rpa_info"


class RpaAssistant(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.CharField(max_length=64, default="")
    platform_id = models.BigIntegerField()
    assistant_name = models.CharField(max_length=128, default="")
    status = models.IntegerField(default=1)
    remarks = models.CharField(max_length=1000, null=True, blank=True)
    icon = models.CharField(max_length=100, null=True, blank=True)
    robot_count = models.IntegerField(null=True, blank=True)
    space_id = models.BigIntegerField(null=True, blank=True)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)
    user_name = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "rpa_user_assistant"


class RpaField(models.Model):
    id = models.BigAutoField(primary_key=True)
    assistant_id = models.BigIntegerField()
    field_key = models.CharField(max_length=128, default="")
    field_name = models.CharField(max_length=255, null=True, blank=True)
    field_value = models.TextField(default="")
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "rpa_user_assistant_field"


class SandboxConfig(models.Model):
    id = models.BigAutoField(primary_key=True)
    uid = models.CharField(max_length=128, default="")
    space_id = models.BigIntegerField(null=True, blank=True)
    provider = models.CharField(max_length=32, default="e2b")
    enabled = StoredBooleanField(default=False)
    api_key = models.CharField(max_length=1024, null=True, blank=True)
    timeout_seconds = models.IntegerField(default=60)
    allow_internet_access = StoredBooleanField(default=False)
    last_test_status = models.CharField(max_length=32, null=True, blank=True)
    last_test_message = models.CharField(max_length=1024, null=True, blank=True)
    last_test_time = models.DateTimeField(null=True, blank=True)
    deleted = StoredBooleanField(default=False)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "skill_sandbox_config"


class WorkflowScope(models.Model):
    """Read-only ownership for resource brokers; workflow business stays in 04."""

    id = models.BigIntegerField(primary_key=True)
    flow_id = models.CharField(max_length=128)
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    deleted = StoredBooleanField(default=False)
    data = models.TextField(null=True)

    class Meta:
        managed = False
        db_table = "workflow"
