"""Expand retained MySQL columns without losing their defaults or unrelated data."""

from django.db import migrations, models


def widen_retained_columns(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor != "mysql":
        return
    for name in ("App", "BotAPI", "Approval", "ShareRecord", "WorkflowBot", "BotType"):
        model = apps.get_model("publishing", name)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_DEFAULT, "
                "IS_NULLABLE, COLLATION_NAME, COLUMN_COMMENT "
                "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s",
                [model._meta.db_table],
            )
            columns = {row[0]: row[1:] for row in cursor.fetchall()}
        for field in model._meta.local_fields:
            column = columns.get(field.column)
            if not isinstance(field, models.CharField) or column is None:
                continue
            kind, length, default, nullable, collation, comment = column
            if kind not in {"char", "varchar"} or length >= field.max_length:
                continue
            old_field = field.clone()
            old_field.set_attributes_from_name(field.name)
            old_field.model = model
            old_field.max_length = length
            old_field.null = nullable == "YES"
            old_field.db_collation = collation
            old_field.db_comment = comment or None
            old_field.default = models.NOT_PROVIDED
            old_field.db_default = default if default is not None else models.NOT_PROVIDED
            new_field = old_field.clone()
            new_field.set_attributes_from_name(field.name)
            new_field.model = model
            new_field.max_length = field.max_length
            schema_editor.alter_field(model, old_field, new_field)


class Migration(migrations.Migration):
    atomic = False
    dependencies = [("publishing", "0004_legacymarket_model_legacymarket_model_id_and_more")]
    operations = [migrations.RunPython(widen_retained_columns, migrations.RunPython.noop)]
