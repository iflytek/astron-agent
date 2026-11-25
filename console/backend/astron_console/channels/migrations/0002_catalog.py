import json
from pathlib import Path

from django.db import migrations


def seed(apps, schema_editor):
    model = apps.get_model("channels", "Pronunciation")
    for row in json.loads((Path(__file__).parent / "pronunciations.json").read_text()):
        if not model.objects.filter(voice_type=row["voice_type"]).exists():
            model.objects.create(**row)


class Migration(migrations.Migration):
    dependencies = [("channels", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
