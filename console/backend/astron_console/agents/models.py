"""Agent definitions retain their business IDs and all existing configuration columns."""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Agent(models.Model):
    id = models.AutoField(primary_key=True)
    uid = models.CharField(max_length=128, null=True)
    space_id = models.BigIntegerField(null=True)
    bot_name = models.CharField(max_length=48, null=True)
    bot_desc = models.CharField(max_length=255, null=True)
    bot_type = models.SmallIntegerField(null=True, default=1)
    avatar = models.CharField(max_length=1024, null=True, default="")
    pc_background = models.CharField(max_length=512, null=True, default="")
    app_background = models.CharField(max_length=512, null=True, default="")
    background_color = models.SmallIntegerField(null=True, default=0)
    prompt = models.CharField(max_length=2048, null=True, default="")
    prologue = models.CharField(max_length=512, null=True, default="")
    is_delete = models.SmallIntegerField(null=True, default=0)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)
    support_context = models.SmallIntegerField(default=1)
    bot_template = models.CharField(max_length=255, null=True, default="")
    prompt_type = models.PositiveSmallIntegerField(default=0)
    input_example = models.CharField(max_length=600, null=True, default="")
    botweb_status = models.SmallIntegerField(default=0)
    # This is the pre-existing product kind, not a release revision.
    version = models.IntegerField(null=True, default=1)
    support_document = models.SmallIntegerField(null=True, default=0)
    support_system = models.SmallIntegerField(null=True, default=0)
    prompt_system = models.SmallIntegerField(null=True, default=0)
    support_upload = models.SmallIntegerField(default=0)
    bot_name_en = models.CharField(max_length=48, null=True)
    bot_desc_en = models.CharField(max_length=500, null=True)
    client_type = models.SmallIntegerField(default=0)
    vcn_cn = models.CharField(max_length=32, null=True)
    vcn_en = models.CharField(max_length=32, null=True)
    vcn_speed = models.SmallIntegerField(default=50)
    is_sentence = models.SmallIntegerField(default=0)
    opened_tool = models.CharField(max_length=128, null=True, default="")
    mcp_server_urls = models.TextField(null=True)
    skills = models.TextField(null=True)
    tools = models.TextField(null=True)
    workflows = models.TextField(null=True)
    client_hide = models.CharField(max_length=10, null=True, default="")
    virtual_bot_type = models.SmallIntegerField(null=True)
    virtual_agent_id = models.BigIntegerField(null=True)
    style = models.IntegerField(null=True)
    background = models.CharField(max_length=512, null=True)
    virtual_character = models.CharField(max_length=512, null=True)
    model = models.CharField(max_length=32, null=True, default="")
    maas_bot_id = models.CharField(max_length=50, null=True)
    prologue_en = models.CharField(max_length=1024, null=True)
    input_example_en = models.CharField(max_length=1024, null=True)
    model_id = models.BigIntegerField(null=True)

    class Meta:
        db_table = "chat_bot_base"


class AgentState(models.Model):
    agent_id = models.IntegerField(primary_key=True)
    config = models.JSONField(default=dict)
    published_version_id = models.BigIntegerField(null=True)
    revision = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "console_agent_state"


class AgentVersion(models.Model):
    agent_id = models.IntegerField(db_index=True)
    schema_version = models.PositiveSmallIntegerField(default=1)
    definition = models.JSONField()
    created_by = models.CharField(max_length=128)
    create_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_agent_version"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Agent版本快照不可修改")
        return super().save(*args, **kwargs)


class AgentFavorite(models.Model):
    uid = models.CharField(max_length=128)
    bot_id = models.IntegerField()
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "bot_favorite"


class PromptSection(models.Model):
    bot_id = models.IntegerField()
    prompt_key = models.CharField(max_length=255, null=True)
    prompt_value = models.TextField(null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "chat_bot_prompt_struct"


class Personality(models.Model):
    bot_id = models.BigIntegerField()
    personality = models.TextField(null=True)
    scene_type = models.IntegerField(null=True)
    scene_info = models.TextField(null=True)
    config_type = models.IntegerField(default=0)
    deleted = models.IntegerField(default=0)
    enabled = models.IntegerField(default=1)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "personality_config"


class DatasetRelation(models.Model):
    bot_id = models.BigIntegerField()
    dataset_id = models.BigIntegerField(null=True)
    dataset_index = models.CharField(max_length=255, null=True)
    is_act = models.IntegerField(default=1, null=True)
    uid = models.CharField(max_length=128, null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        abstract = True


class AgentDataset(DatasetRelation):
    class Meta:
        db_table = "bot_dataset"


class AgentDatasetMaas(DatasetRelation):
    class Meta:
        db_table = "bot_dataset_maas"


class MemoryConfig(models.Model):
    bot_id = models.IntegerField()
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(default=0)
    provider = models.CharField(max_length=32, default="MEM0")
    enabled = models.SmallIntegerField(default=0)
    auto_search = models.SmallIntegerField(default=1)
    api_key_ciphertext = models.TextField(null=True)
    search_top_k = models.IntegerField(default=5)
    min_score = models.DecimalField(max_digits=6, decimal_places=4, default=0)
    is_delete = models.SmallIntegerField(default=0)
    delete_time = models.BigIntegerField(default=0)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "agent_memory_config"
        unique_together = [("bot_id", "uid", "space_id", "provider", "delete_time")]


from .conversation_models import AgentFile, AgentRun, AgentSession  # noqa: E402,F401
