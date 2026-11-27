import hashlib

from django.db import migrations, models


def populate_directories(apps, schema_editor):
    rows = apps.get_model("agents", "Agent").objects.using(schema_editor.connection.alias)
    batch = []
    for row in rows.only("uid", "space_id").iterator(chunk_size=500):
        scope = (
            f"space-{row.space_id}"
            if row.space_id is not None
            else "user-" + hashlib.sha256(str(row.uid).encode()).hexdigest()
        )
        resource_id = str(row.pk)
        row.sandbox_directory = f"/workspace/agents/{scope}/{resource_id}"
        batch.append(row)
        if len(batch) == 500:
            rows.bulk_update(batch, ["sandbox_directory"])
            batch.clear()
    if batch:
        rows.bulk_update(batch, ["sandbox_directory"])


class Migration(migrations.Migration):
    dependencies = [("agents", "0003_legacy_history")]

    operations = [
        migrations.AddField(
            model_name="agent",
            name="sandbox_directory",
            field=models.CharField(max_length=360, blank=True, default="", editable=False),
        ),
        migrations.AddField(
            model_name="agent",
            name="sandbox_cleanup_pending",
            field=models.BooleanField(default=False, db_index=True, editable=False),
        ),
        migrations.RunPython(populate_directories, migrations.RunPython.noop),
    ]
