"""Install absent workflow UI definitions without replacing customized configuration."""

import json
from pathlib import Path

from django.db import migrations


def defaults(apps, schema_editor):
    config = apps.get_model("resources", "ConfigInfo")
    query = config.objects.using(schema_editor.connection.alias)
    rows = json.loads(Path(__file__).with_name("node_defaults.json").read_text())
    for row in rows:
        existing = list(query.filter(category=row["category"], code=row["code"]))
        if row["category"] == "WORKFLOW_NODE_TEMPLATE":
            wanted = json.loads(row["value"])["idType"]
            present = False
            for saved in existing:
                try:
                    present |= json.loads(saved.value).get("idType") == wanted
                except (ValueError, AttributeError, TypeError):
                    # Retained broken definitions are not rewritten by migration.
                    continue
            if not present:
                query.create(**row)
        elif not any(saved.name == row["name"] for saved in existing):
            query.create(**row)


class Migration(migrations.Migration):
    dependencies = [("workflows", "0001_initial")]
    operations = [migrations.RunPython(defaults, migrations.RunPython.noop)]
