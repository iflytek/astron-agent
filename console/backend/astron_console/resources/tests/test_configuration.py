import json
from importlib import import_module
from types import SimpleNamespace

from django.apps import apps
from django.db import connection
from django.db.migrations.state import ProjectState
from django.test import TransactionTestCase

from astron_console.accounts.models import User, UserProfile
from astron_console.resources.models import ConfigInfo


class ResourceConfigurationTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="config-owner", username="owner")
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)
        self.client.force_login(self.user)

    def seed(self):
        migration = import_module("astron_console.resources.migrations.0003_resource_configuration")
        migration.defaults(
            ProjectState.from_apps(apps).apps, SimpleNamespace(connection=connection)
        )

    def get_list(self, category, **extra):
        return self.client.get("/config-info/get-list-by-category", {"category": category, **extra})

    def test_empty_installation_supports_upload_reslice_avatars_and_database_settings(self):
        ConfigInfo.objects.all().delete()
        self.seed()
        for source in ("CBG", "AIUI", "SPARK"):
            for prefix, kind in (("DEFAULT_SLICE_RULES", 0), ("CUSTOM_SLICE_RULES", 1)):
                response = self.get_list(f"{prefix}_{source}", code="1")
                self.assertEqual(response.status_code, 200, response.content)
                rows = response.json()["data"]
                self.assertEqual(len(rows), 1)
                rule = json.loads(rows[0]["value"])
                self.assertEqual(rule["type"], kind)
                self.assertEqual(len(rule["lengthRange"]), 2)
                self.assertTrue(rule["seperator"])
            separators = self.get_list(f"CUSTOM_SLICE_SEPERATORS_{source}").json()["data"]
            self.assertTrue(all(item["symbol"] for item in json.loads(separators[0]["value"])))
        icons = self.get_list("ICON", code="1").json()["data"]
        self.assertIn("common", {row["code"] for row in icons})
        self.assertIn("rag", {row["code"] for row in icons})
        self.assertTrue(self.get_list("COLOR").json()["data"])
        for category, code in (
            ("DB_TABLE_TEMPLATE", "TB"),
            ("DB_TABLE_RESERVED_KEYWORD", "reserved_keyword"),
        ):
            response = self.client.get(
                "/config-info/get-by-category-and-code", {"category": category, "code": code}
            )
            self.assertEqual(response.status_code, 200, response.content)
            self.assertTrue(response.json()["data"]["value"])
        self.assertFalse(
            ConfigInfo.objects.filter(
                category__in=["PLATFORM_ACCOUNT", "MODEL_SECRET_KEY", "TEMPLATE"]
            ).exists()
        )

    def test_seeding_keeps_existing_ids_disabled_rules_and_business_values(self):
        ConfigInfo.objects.all().delete()
        retained = ConfigInfo.objects.create(
            id=801,
            category="CUSTOM_SLICE_RULES_CBG",
            code="1",
            name="Company rule",
            value='{"lengthRange":[512,768]}',
            is_valid=0,
            remarks="preserved",
        )
        ConfigInfo.objects.create(
            id=802,
            category="PLATFORM_ACCOUNT",
            code="AI_ABILITY_CHAT",
            value='{"apiKey":"private"}',
            is_valid=1,
        )
        before = list(ConfigInfo.objects.values())
        self.seed()
        self.seed()
        self.assertEqual(list(ConfigInfo.objects.filter(id__in=[801, 802]).values()), before)
        self.assertEqual(ConfigInfo.objects.filter(category=retained.category, code="1").count(), 1)
        self.assertEqual(self.get_list(retained.category).json()["data"], [])
        count = ConfigInfo.objects.count()
        self.seed()
        self.assertEqual(ConfigInfo.objects.count(), count)

    def test_list_preserves_serialized_shape_and_filters_inactive_rows(self):
        item = ConfigInfo.objects.create(
            category="MODEL_DEFAULT_CONFIGS",
            code="mine",
            name="Parameter defaults",
            value='[{"key":"temperature"}]',
            is_valid=1,
        )
        ConfigInfo.objects.create(
            category=item.category, code="inactive", value="hidden", is_valid=0
        )
        response = self.get_list(item.category)
        self.assertEqual(response.status_code, 200)
        rows = response.json()["data"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], item.pk)
        self.assertEqual(rows[0]["value"], item.value)
        self.assertEqual(rows[0]["isValid"], 1)
        self.assertIn("createTime", rows[0])

    def test_unauthenticated_and_secret_categories_cannot_be_read(self):
        for category in (
            "PLATFORM_ACCOUNT",
            "MODEL_SECRET_KEY",
            "TEMPLATE",
            "ICON' OR 1=1 --",
            "icon",
        ):
            ConfigInfo.objects.create(
                category=category, code="secret", value="sensitive-value", is_valid=1
            )
            for endpoint in ("get-list-by-category", "get-by-category-and-code"):
                response = self.client.get(
                    f"/config-info/{endpoint}", {"category": category, "code": "secret"}
                )
                self.assertEqual(response.status_code, 403, response.content)
                self.assertNotIn(b"sensitive-value", response.content)
        self.client.logout()
        self.assertEqual(self.get_list("ICON").status_code, 401)
