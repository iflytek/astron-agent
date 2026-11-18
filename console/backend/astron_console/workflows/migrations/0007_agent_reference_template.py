"""Replace the inline Agent editor template without rewriting workflow history."""

import json
from pathlib import Path

from django.db import migrations


def replace_agent_template(apps, schema_editor):
    config = apps.get_model("resources", "ConfigInfo")
    rows = json.loads(Path(__file__).with_name("node_defaults.json").read_text())
    template = next(
        row["value"]
        for row in rows
        if row["category"] == "WORKFLOW_NODE_TEMPLATE"
        and json.loads(row["value"]).get("idType") == "agent"
    )
    query = config.objects.using(schema_editor.connection.alias)
    for row in query.filter(category="WORKFLOW_NODE_TEMPLATE"):
        try:
            value = json.loads(row.value)
        except (ValueError, TypeError):
            continue
        if isinstance(value, dict) and value.get("idType") == "agent":
            row.value = template
            row.save(update_fields=["value"])
    query.filter(category="WORKFLOW_AGENT_STRATEGY").delete()


class Migration(migrations.Migration):
    dependencies = [("workflows", "0006_workflowfavorite")]
    operations = [migrations.RunPython(replace_agent_template, migrations.RunPython.noop)]
