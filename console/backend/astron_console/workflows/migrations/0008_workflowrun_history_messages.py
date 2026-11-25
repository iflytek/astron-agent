from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("workflows", "0007_agent_reference_template")]
    operations = [
        migrations.AddField(
            model_name="workflowrun",
            name="history_messages",
            field=models.JSONField(default=list),
        ),
    ]
