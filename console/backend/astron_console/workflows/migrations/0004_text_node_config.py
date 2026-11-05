import django.utils.timezone
from django.db import migrations, models

import astron_console.fields


def adopt(apps, schema_editor):
    from astron_console.workflows.models import TextNodeConfig

    table = TextNodeConfig._meta.db_table
    if table not in schema_editor.connection.introspection.table_names():
        schema_editor.create_model(TextNodeConfig)


class Migration(migrations.Migration):
    dependencies = [("workflows", "0003_workflowrun_history_hidden")]
    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[migrations.RunPython(adopt, migrations.RunPython.noop)],
            state_operations=[
                migrations.CreateModel(
                    name="TextNodeConfig",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("uid", models.CharField(max_length=128)),
                        ("separator", models.TextField()),
                        ("comment", models.CharField(default="", max_length=255)),
                        ("deleted", astron_console.fields.StoredBooleanField(default=False)),
                        ("create_time", models.DateTimeField(default=django.utils.timezone.now)),
                        ("update_time", models.DateTimeField(default=django.utils.timezone.now)),
                    ],
                    options={"db_table": "text_node_config"},
                )
            ],
        )
    ]
