"""Install absent 02 UI defaults without changing retained config rows or IDs."""

import json
from pathlib import Path

from django.db import migrations


def defaults(apps, schema_editor):
    Config = apps.get_model("resources", "ConfigInfo")
    query = Config.objects.using(schema_editor.connection.alias)
    # Frozen safe subset of V1.13__insert_config_data.sql. No secrets, workflow
    # node templates, Agent settings, or references to the retired Java runtime.
    rows = json.loads(Path(__file__).with_name("resource_config_defaults.json").read_text())
    for row in rows:
        identity = {"category": row["category"], "code": row["code"]}
        # Catalogs have multiple records per code; singleton rules intentionally
        # match only category/code so customized or disabled values win.
        if row["category"] == "ICON":
            identity["value"] = row["value"]
        elif row["category"] == "COLOR":
            identity["name"] = row["name"]
        if not query.filter(**identity).exists():
            query.create(**row)


class Migration(migrations.Migration):
    dependencies = [("resources", "0002_resource_defaults")]
    operations = [migrations.RunPython(defaults, migrations.RunPython.noop)]
