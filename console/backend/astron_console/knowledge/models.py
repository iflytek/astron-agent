"""Resource metadata mapped to the existing Console tables; identifiers are never remapped."""

from django.db import models
from django.utils import timezone

from astron_console.fields import StoredBooleanField


class Repo(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=64, null=True, blank=True)
    user_id = models.CharField(max_length=128, null=True, blank=True)
    app_id = models.CharField(max_length=20, null=True, blank=True)
    outer_repo_id = models.CharField(max_length=50, null=True, blank=True)
    core_repo_id = models.CharField(max_length=50, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    icon = models.CharField(max_length=255, null=True, blank=True)
    color = models.CharField(max_length=10, null=True, blank=True)
    status = models.IntegerField(null=True, default=0)
    embedded_model = models.CharField(max_length=20, null=True, blank=True)
    index_type = models.IntegerField(null=True)
    visibility = models.IntegerField(null=True, default=0)
    source = models.IntegerField(null=True, default=0)
    enable_audit = StoredBooleanField(default=False)
    deleted = StoredBooleanField(default=False)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)
    is_top = StoredBooleanField(default=False)
    tag = models.CharField(max_length=64, null=True, blank=True)
    space_id = models.BigIntegerField(null=True)
    ragflow_dataset_id = models.CharField(max_length=64, null=True, blank=True)

    class Meta:
        db_table = "repo"


class Document(models.Model):
    id = models.BigAutoField(primary_key=True)
    repo_id = models.BigIntegerField(null=True)
    uuid = models.CharField(max_length=64, null=True, blank=True)
    uid = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=512, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    size = models.BigIntegerField(null=True)
    char_count = models.BigIntegerField(null=True)
    type = models.CharField(max_length=64, null=True, blank=True)
    status = models.IntegerField(null=True)
    enabled = models.IntegerField(null=True, default=0)
    slice_config = models.CharField(max_length=500, null=True, blank=True)
    current_slice_config = models.CharField(max_length=500, null=True, blank=True)
    pid = models.BigIntegerField(null=True, default=-1)
    reason = models.TextField(null=True, blank=True)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)
    source = models.CharField(max_length=64, null=True, blank=True)
    space_id = models.BigIntegerField(null=True)
    last_uuid = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "file_info_v2"


class Directory(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    parent_id = models.BigIntegerField(null=True)
    is_file = StoredBooleanField(default=False)
    app_id = models.CharField(max_length=10, null=True, blank=True)
    file_id = models.BigIntegerField(null=True)
    comment = models.CharField(max_length=255, null=True, blank=True)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)
    hit_count = models.IntegerField(null=True, default=0)
    status = StoredBooleanField(default=False)

    class Meta:
        db_table = "file_directory_tree"


class Chunk(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    file_id = models.CharField(max_length=64, null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    char_count = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    description = models.CharField(max_length=512, null=True, blank=True)
    enabled = StoredBooleanField(default=False)
    source = StoredBooleanField(default=False)
    test_hit_count = models.BigIntegerField(null=True)
    dialog_hit_count = models.BigIntegerField(null=True)
    core_repo_name = models.TextField(null=True, blank=True)
    deleted = StoredBooleanField(default=False)
    created_at = models.DateTimeField(null=True, default=timezone.now)
    updated_at = models.DateTimeField(null=True, default=timezone.now)
    seq_id = models.BigIntegerField(null=True)

    class Meta:
        db_table = "knowledge"


class PreviewChunk(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    file_id = models.CharField(max_length=64, null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    char_count = models.CharField(max_length=255, null=True, blank=True)
    deleted = StoredBooleanField(default=False)
    created_at = models.DateTimeField(null=True, default=timezone.now)
    updated_at = models.DateTimeField(null=True, default=timezone.now)
    seq_id = models.BigIntegerField(null=True)

    class Meta:
        db_table = "preview_knowledge"


class ExtractionTask(models.Model):
    id = models.BigAutoField(primary_key=True)
    file_id = models.BigIntegerField(null=True)
    task_id = models.CharField(max_length=64, null=True, blank=True)
    status = models.IntegerField(null=True, default=0)
    reason = models.TextField(null=True, blank=True)
    user_id = models.CharField(max_length=128, null=True, blank=True)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)
    task_status = models.IntegerField(null=True)

    class Meta:
        db_table = "extract_knowledge_task"


class HitHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.CharField(max_length=128, null=True, blank=True)
    repo_id = models.BigIntegerField(null=True)
    query = models.TextField(null=True, blank=True)
    create_time = models.DateTimeField(null=True, default=timezone.now)

    class Meta:
        db_table = "hit_test_history"


class Database(models.Model):
    id = models.BigAutoField(primary_key=True)
    app_id = models.CharField(max_length=100, null=True, blank=True)
    uid = models.CharField(max_length=100, null=True, blank=True)
    db_id = models.BigIntegerField(null=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    avatar_icon = models.CharField(max_length=255, null=True, blank=True)
    avatar_color = models.CharField(max_length=255, null=True, blank=True)
    deleted = models.IntegerField(null=True, default=0)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)
    space_id = models.BigIntegerField(null=True)

    class Meta:
        db_table = "db_info"


class DatabaseTable(models.Model):
    id = models.BigAutoField(primary_key=True)
    db_id = models.BigIntegerField(null=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    deleted = models.IntegerField(null=True, default=0)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)

    class Meta:
        db_table = "db_table"


class DatabaseField(models.Model):
    id = models.BigAutoField(primary_key=True)
    tb_id = models.BigIntegerField(null=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    description = models.CharField(max_length=100, null=True, blank=True)
    default_value = models.CharField(max_length=100, null=True, blank=True)
    is_required = models.IntegerField(null=True, default=0)
    is_system = models.IntegerField(null=True, default=0)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)

    class Meta:
        db_table = "db_table_field"


class SkillFile(models.Model):
    id = models.BigAutoField(primary_key=True)
    uid = models.CharField(max_length=128, null=True, blank=True)
    space_id = models.BigIntegerField(null=True)
    parent_id = models.BigIntegerField(null=True, default=0)
    name = models.CharField(max_length=255, null=True, blank=True)
    entry_type = models.CharField(max_length=16, null=True, blank=True)
    sort_order = models.IntegerField(null=True, default=0)
    object_key = models.CharField(max_length=512, null=True, blank=True)
    content_type = models.CharField(max_length=128, null=True, blank=True)
    file_ext = models.CharField(max_length=32, null=True, blank=True)
    file_size = models.BigIntegerField(null=True, default=0)
    skill_name = models.CharField(max_length=128, null=True, blank=True)
    skill_description = models.CharField(max_length=1024, null=True, blank=True)
    deleted = StoredBooleanField(default=False)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)

    class Meta:
        db_table = "skill_file"


class Artifact(models.Model):
    id = models.BigAutoField(primary_key=True)
    uid = models.CharField(max_length=128, null=True, blank=True)
    space_id = models.BigIntegerField(null=True)
    workflow_id = models.BigIntegerField(null=True)
    run_id = models.CharField(max_length=128, null=True, blank=True)
    node_id = models.CharField(max_length=128, null=True, blank=True)
    skill_id = models.CharField(max_length=128, null=True, blank=True)
    file_name = models.CharField(max_length=255, null=True, blank=True)
    object_key = models.CharField(max_length=512, null=True, blank=True)
    content_type = models.CharField(max_length=128, null=True, blank=True)
    file_size = models.BigIntegerField(null=True, default=0)
    source = models.CharField(max_length=64, null=True, blank=True)
    deleted = StoredBooleanField(default=False)
    create_time = models.DateTimeField(null=True, default=timezone.now)
    update_time = models.DateTimeField(null=True, default=timezone.now)
    bucket_name = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "workflow_artifact"


class WorkflowIdentity(models.Model):
    id = models.BigIntegerField(primary_key=True)
    flow_id = models.CharField(max_length=255)
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    deleted = StoredBooleanField(default=False)

    class Meta:
        managed = False
        db_table = "workflow"
