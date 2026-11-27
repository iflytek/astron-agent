from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("agents", "0004_sandbox_directory")]

    operations = [
        migrations.AddField(
            model_name="agentrun",
            name="steering",
            field=models.JSONField(default=dict),
        ),
    ]
