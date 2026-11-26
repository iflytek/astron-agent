import hashlib
import re

from django.db import migrations, models


def populate_directories(apps, schema_editor):
    rows = apps.get_model("workflows", "Workflow").objects.using(schema_editor.connection.alias)
    batch = []
    seen_legacy_directories = set()
    # Preserve an existing directory for its first active owner. Historical
    # duplicates must not be able to delete or access the same directory.
    existing = rows.only("uid", "space_id", "flow_id").order_by("deleted", "pk")
    for row in existing.iterator(chunk_size=500):
        scope = (
            f"space-{row.space_id}"
            if row.space_id is not None
            else "user-" + hashlib.sha256(str(row.uid).encode()).hexdigest()
        )
        flow_id = row.flow_id or ""
        legacy_directory = f"/workspace/workflows/{scope}/{flow_id}"
        if (
            re.fullmatch(r"[A-Za-z0-9_-]{1,255}", flow_id)
            and legacy_directory not in seen_legacy_directories
        ):
            row.sandbox_directory = legacy_directory
            seen_legacy_directories.add(legacy_directory)
        else:
            row.sandbox_directory = f"/workspace/workflows/{scope}/~{row.pk}"
        batch.append(row)
        if len(batch) == 500:
            rows.bulk_update(batch, ["sandbox_directory"])
            batch.clear()
    if batch:
        rows.bulk_update(batch, ["sandbox_directory"])


class Migration(migrations.Migration):
    dependencies = [("workflows", "0008_workflowrun_history_messages")]

    operations = [
        migrations.AddField(
            model_name="workflow",
            name="sandbox_directory",
            field=models.CharField(max_length=360, blank=True, default="", editable=False),
        ),
        migrations.AddField(
            model_name="workflow",
            name="sandbox_cleanup_pending",
            field=models.BooleanField(default=False, db_index=True, editable=False),
        ),
        migrations.RunPython(populate_directories, migrations.RunPython.noop),
    ]
