"""Seed only absent installation catalogs, never replace retained business configuration."""

import json

from django.db import migrations


def defaults(apps, schema_editor):
    Category = apps.get_model("resources", "ModelCategory")
    if not Category.objects.exists():
        catalogs = {
            "modelCategory": ("模型类别", ["文本生成", "多模态", "其他"]),
            "modelScenario": ("模型场景", ["知识问答", "代码生成", "内容创作", "其他"]),
            "languageSupport": ("语言支持", ["中文", "英文", "多语言"]),
            "contextLengthTag": ("上下文长度", ["8k", "32k", "64k", "128k"]),
        }
        for order, (key, (name, children)) in enumerate(catalogs.items()):
            parent = Category.objects.create(pid=0, key=key, name=name, sort_order=order)
            for index, child in enumerate(children):
                Category.objects.create(pid=parent.pk, key=key, name=child, sort_order=index)
    Platform = apps.get_model("resources", "RpaPlatform")
    if not Platform.objects.exists():
        Platform.objects.create(
            category="xiaowu",
            name="晓悟RPA",
            is_deleted=0,
            path="https://www.iflyrpa.com/",
            value=json.dumps(
                [
                    {
                        "key": "API KEY",
                        "name": "apiKey",
                        "desc": "鉴权 token",
                        "type": "string",
                        "required": True,
                    }
                ],
                ensure_ascii=False,
            ),
        )


class Migration(migrations.Migration):
    dependencies = [("resources", "0001_initial")]
    operations = [migrations.RunPython(defaults, migrations.RunPython.noop)]
