import importlib
import json
from unittest.mock import patch

from django.apps import apps
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.definitions import READ, WRITE
from astron_console.agents.models import Agent, AgentState
from astron_console.publishing import services, tenant
from astron_console.publishing.models import App, Approval, Publication, PublicRunGrant, ShareRecord
from astron_console.resources.common import UpstreamError
from astron_console.resources.models import Model
from astron_console.spaces.models import Space, SpaceMember, SpacePermission
from astron_console.spaces.permissions import ResourceScope

urlpatterns = [
    path("", include("astron_console.publishing.urls")),
    path("", include("astron_console.agents.definition_urls")),
]


@override_settings(ROOT_URLCONF=__name__, TENANT_INTERNAL_API_KEY="k" * 40)
class PublicationTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(id="owner", username="owner")
        self.member = User.objects.create_user(id="member", username="member")
        for user in [self.owner, self.member]:
            UserProfile.objects.create(uid=user.pk, username=user.username)
        self.model = Model.objects.create(
            uid="owner", name="model", provider="openai", domain="model"
        )
        self.bot = Agent.objects.create(uid="owner", bot_name="original", model_id=self.model.pk)
        self.scope = ResourceScope("owner", None, None)
        self.client.force_login(self.owner)

    def write(self, url, data=None):
        return self.client.post(url, json.dumps(data or {}), content_type="application/json")

    def shared(self):
        self.space = Space.objects.create(name="team", uid="owner")
        SpaceMember.objects.create(space_id=self.space.pk, uid="owner", role=1)
        SpaceMember.objects.create(space_id=self.space.pk, uid="member", role=3)
        for key in [READ, WRITE]:
            SpacePermission.objects.update_or_create(
                permission_key=key, defaults={"owner": True, "admin": True, "member": True}
            )
        self.bot.space_id = self.space.pk
        self.bot.save()
        self.model.space_id = self.space.pk
        self.model.save()
        self.scope = ResourceScope("member", self.space.pk, None)

    def test_atomic_candidate_publication_and_superseded_run(self):
        result = services.submit(self.scope, self.bot.pk, "MARKET")
        publication = Publication.objects.get(pk=result["publicationId"])
        old = publication.candidate
        PublicRunGrant.objects.create(
            run_id="retained", publication=publication, candidate=old, caller_uid="member"
        )
        self.bot.bot_name = "edited"
        self.bot.save()
        services.submit(self.scope, self.bot.pk, "MARKET")
        publication.refresh_from_db()
        self.assertEqual(publication.candidate.definition["botName"], "edited")
        self.assertEqual(
            services.require_publication(
                publication_id=publication.pk, candidate_id=old.pk
            ).candidate.definition["botName"],
            "original",
        )
        old.definition = {}
        with self.assertRaises(ValidationError):
            old.save()
        services.offline(self.scope, self.bot.pk, "MARKET")
        from django.http import Http404

        with self.assertRaises(Http404):
            services.require_publication(publication_id=publication.pk, candidate_id=old.pk)

    def test_approval_freezes_content_and_cannot_bypass_pointer_endpoint(self):
        self.shared()
        result = services.submit(self.scope, self.bot.pk, "MARKET")
        approval = Approval.objects.get(pk=result["approvalId"])
        self.assertFalse(Publication.objects.exists())
        self.bot.bot_name = "unapproved"
        self.bot.save()
        response = self.client.post(
            f"/publish/approvals/{approval.pk}/approve",
            data="{}",
            content_type="application/json",
            HTTP_SPACE_ID=str(self.space.pk),
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Publication.objects.get().candidate.definition["botName"], "original")
        response = self.client.post(
            f"/publish/approvals/{approval.pk}/reject",
            data="{}",
            content_type="application/json",
            HTTP_SPACE_ID=str(self.space.pk),
        )
        self.assertEqual(response.status_code, 400)
        self.client.force_login(self.member)
        response = self.client.put(
            f"/agents/{self.bot.pk}/published-version",
            json.dumps({"versionId": approval.candidate.version_id}),
            content_type="application/json",
            HTTP_SPACE_ID=str(self.space.pk),
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()["data"]["approvalRequired"])

    def test_reject_cancel_and_activation_failure_leave_old_pointer(self):
        old = services.submit(self.scope, self.bot.pk, "MARKET")["versionId"]
        with patch(
            "astron_console.publishing.services.validate_candidate",
            side_effect=ValidationError("denied"),
        ):
            with self.assertRaises(ValidationError):
                services.submit(self.scope, self.bot.pk, "MARKET")
        self.assertEqual(AgentState.objects.get(agent_id=self.bot.pk).published_version_id, old)
        self.shared()
        pending = services.submit(self.scope, self.bot.pk, "MARKET")
        self.client.force_login(self.member)
        response = self.client.post(
            f"/publish/approvals/{pending['approvalId']}/cancel",
            data="{}",
            content_type="application/json",
            HTTP_SPACE_ID=str(self.space.pk),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(AgentState.objects.get(agent_id=self.bot.pk).published_version_id, old)
        with self.assertRaises(PermissionDenied):
            services.offline(self.scope, self.bot.pk, "MARKET")

    def test_app_binding_owner_and_tenant_revocation(self):
        App.objects.create(
            uid="owner", app_id="app", app_name="app", app_key="key", app_secret="secret"
        )
        with patch("astron_console.publishing.tenant.call", return_value={"appid": "app"}):
            self.assertEqual(tenant.authenticate("Bearer key:secret").app_id, "app")
        with patch("astron_console.publishing.tenant.call", side_effect=UpstreamError("disabled")):
            with self.assertRaises(PermissionDenied):
                tenant.authenticate("Bearer key:secret")
        services.submit(self.scope, self.bot.pk, "API", target_id="app")
        self.assertEqual(
            services.require_publication(bot_id=self.bot.pk, channel="API", app_id="app").target_id,
            "app",
        )
        from django.http import Http404

        with self.assertRaises(Http404):
            services.require_publication(bot_id=self.bot.pk, channel="API", app_id="other")

    def test_api_url_uses_public_origin_behind_proxy(self):
        App.objects.create(
            uid="owner", app_id="app", app_name="app", app_key="key", app_secret="secret"
        )
        result = services.submit(self.scope, self.bot.pk, "API", target_id="app")
        candidate = Publication.objects.get(pk=result["publicationId"]).candidate
        for origin in ["http://console.example:18888", "https://console.example"]:
            for kind, prefix in [("agent", "agent"), ("workflow", "workflow")]:
                with self.subTest(origin=origin, kind=kind):
                    # Model a proxy that forwards only the internal host and HTTP scheme.
                    type(candidate).objects.filter(pk=candidate.pk).update(resource_kind=kind)
                    with override_settings(CONSOLE_PUBLIC_ORIGIN=origin):
                        response = self.client.get(
                            "/publish-api/get-bot-api-info", {"botId": self.bot.pk}
                        )
                    self.assertEqual(response.status_code, 200, response.content)
                    self.assertEqual(
                        response.json()["data"]["serviceUrl"],
                        f"{origin}/{prefix}/v1/chat/completions",
                    )

    def test_market_safe_projection_and_share_revocation(self):
        services.submit(self.scope, self.bot.pk, "MARKET")
        result = self.client.get(f"/bot/detail/{self.bot.pk}")
        self.assertEqual(result.status_code, 200)
        self.assertNotIn("prompt", result.json()["data"])
        key = self.write("/share/get-share-key", {"relateId": self.bot.pk}).json()["data"][
            "shareAgentKey"
        ]
        self.assertEqual(services.require_share(key).bot_id, self.bot.pk)
        self.assertEqual(self.write("/share/revoke", {"shareAgentKey": key}).status_code, 200)
        self.assertEqual(ShareRecord.objects.get(share_key=key).is_act, 0)
        self.assertEqual(
            self.write("/share/add-shared-agent", {"shareAgentKey": key}).status_code, 404
        )

    def test_ambiguous_application_creation_never_repeats(self):
        with patch(
            "astron_console.publishing.tenant.call", side_effect=UpstreamError("timeout")
        ) as call:
            with self.assertRaises(UpstreamError):
                tenant.create_app("owner", "new", "description", "idempotency-key")
            with self.assertRaises(ValidationError):
                tenant.create_app("owner", "new", "description", "idempotency-key")
            self.assertEqual(call.call_count, 1)


class AdoptionTests(TransactionTestCase):
    def test_readoption_retains_original_keys_unknown_columns_and_no_duplicate_seed(self):
        App.objects.create(
            id=9001,
            uid="original",
            app_id="old-app",
            app_name="retained",
            app_key="old-key",
            app_secret="old-secret",
        )
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE app_mst ADD COLUMN vendor_extension TEXT")
            cursor.execute("UPDATE app_mst SET vendor_extension = 'keep' WHERE id = 9001")
        migration = importlib.import_module("astron_console.publishing.migrations.0001_initial")
        with connection.schema_editor() as editor:
            migration.adopt_publications(apps, editor)
            migration.adopt_publications(apps, editor)
        row = App.objects.get(pk=9001)
        self.assertEqual(
            (row.uid, row.app_key, row.app_secret), ("original", "old-key", "old-secret")
        )
        with connection.cursor() as cursor:
            cursor.execute("SELECT vendor_extension FROM app_mst WHERE id=9001")
            self.assertEqual(cursor.fetchone()[0], "keep")
            cursor.execute("ALTER TABLE app_mst DROP COLUMN vendor_extension")


@override_settings(ROOT_URLCONF=__name__, WORKFLOW_INTERNAL_API_KEY="i" * 40)
class GatewayAndWorkflowTests(PublicationTests):
    def test_gateway_signature_is_path_and_app_bound(self):
        import hashlib
        import hmac

        app = App.objects.create(
            uid="owner", app_id="app", app_name="app", app_key="k", app_secret="s"
        )
        with (
            patch("astron_console.publishing.gateway.authenticate", return_value=app),
            patch("astron_console.publishing.gateway.time.time", return_value=123456),
        ):
            response = self.client.get(
                "/internal/gateway/auth/workflow",
                HTTP_X_ORIGINAL_METHOD="POST",
                HTTP_X_ORIGINAL_URI="/workflow/v1/resume?x=1",
                HTTP_AUTHORIZATION="Bearer k:s",
            )
            self.assertEqual(response.status_code, 204)
            expected = hmac.new(
                ("i" * 40).encode(), b"POST\n/workflow/v1/resume\napp\n123456", hashlib.sha256
            ).hexdigest()
            self.assertEqual(response["X-Workflow-Gateway-Signature"], expected)
            self.assertEqual(
                self.client.get(
                    "/internal/gateway/auth/workflow",
                    HTTP_X_ORIGINAL_METHOD="POST",
                    HTTP_X_ORIGINAL_URI="/workflow/v1/%72esume",
                ).status_code,
                401,
            )
            self.assertEqual(
                self.client.get(
                    "/internal/gateway/auth/workflow",
                    HTTP_X_ORIGINAL_METHOD="GET",
                    HTTP_X_ORIGINAL_URI="/workflow/v1/resume",
                ).status_code,
                401,
            )

    def test_new_workflow_lazily_gets_one_product_identity(self):
        from astron_console.publishing.models import WorkflowBot
        from astron_console.workflows.management_views import create_workflow

        workflow = create_workflow(self.scope, {"name": "new workflow"})
        first = services.bind_workflow(self.scope, workflow.flow_id)
        second = services.bind_workflow(self.scope, workflow.flow_id)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(first.uid, workflow.uid)
        self.assertEqual(WorkflowBot.objects.filter(flow_id=workflow.flow_id).count(), 1)

    @patch("astron_console.publishing.services.validate_graph")
    def test_legacy_workflow_requires_published_version_not_current_draft(self, validate):
        from astron_console.publishing.legacy import adopt_legacy
        from astron_console.publishing.models import LegacyMarket, LegacyPublicationIssue
        from astron_console.workflows.management_views import create_workflow
        from astron_console.workflows.models import WorkflowVersion

        workflow = create_workflow(self.scope, {"name": "legacy"})
        bot = services.bind_workflow(self.scope, workflow.flow_id)
        LegacyMarket.objects.create(bot_id=bot.pk, uid="owner", bot_status=1, bot_name="published")
        self.assertEqual(adopt_legacy()["unresolved"], 1)
        self.assertFalse(Publication.objects.exists())
        version = WorkflowVersion.objects.create(
            flow_id=workflow.flow_id,
            version_num="old",
            data=workflow.data,
            publish_channel=1,
            publish_result="SUCCESS",
        )
        self.assertEqual(adopt_legacy()["imported"], 1)
        self.assertEqual(Publication.objects.get().candidate.version_id, version.pk)
        self.assertEqual(LegacyPublicationIssue.objects.filter(resolved=False).count(), 0)
        self.assertEqual(adopt_legacy()["existing"], 1)

    @patch("astron_console.publishing.services.validate_graph")
    def test_legacy_market_and_api_use_their_own_successful_release(self, validate):
        from astron_console.publishing.legacy import adopt_legacy
        from astron_console.publishing.models import BotAPI, LegacyMarket
        from astron_console.workflows.management_views import create_workflow
        from astron_console.workflows.models import WorkflowVersion

        workflow = create_workflow(self.scope, {"name": "legacy channels"})
        bot = services.bind_workflow(self.scope, workflow.flow_id)
        App.objects.create(app_id="legacy-app", uid="owner", is_delete=0)
        BotAPI.objects.create(bot_id=bot.pk, app_id="legacy-app", uid="owner")
        LegacyMarket.objects.create(bot_id=bot.pk, uid="owner", bot_status=1)
        api_version = WorkflowVersion.objects.create(
            flow_id=workflow.flow_id,
            version_num="api",
            data=workflow.data,
            publish_channel=2,
            publish_result="成功",
        )
        market_version = WorkflowVersion.objects.create(
            flow_id=workflow.flow_id,
            version_num="market",
            data=workflow.data,
            publish_channel=1,
            publish_result="成功",
        )
        self.assertEqual(adopt_legacy()["imported"], 2)
        self.assertEqual(
            Publication.objects.get(channel="MARKET").candidate.version_id, market_version.pk
        )
        self.assertEqual(
            Publication.objects.get(channel="API").candidate.version_id, api_version.pk
        )


@override_settings(ROOT_URLCONF=__name__)
class LegacyPromptTests(TestCase):
    def test_market_snapshot_preserves_published_prompt_model_and_market_personality(self):
        from astron_console.agents.models import AgentVersion, Personality
        from astron_console.publishing.legacy import adopt_legacy, recorded_definition
        from astron_console.publishing.models import LegacyMarket

        user = User.objects.create_user(id="retained", username="retained")
        UserProfile.objects.create(uid=user.pk, username=user.username)
        model = Model.objects.create(uid=user.pk, name="model", provider="openai", domain="model")
        bot = Agent.objects.create(
            uid=user.pk, bot_name="new draft", prompt="unpublished prompt", model_id=model.pk
        )
        market = LegacyMarket.objects.create(
            bot_id=bot.pk,
            uid=user.pk,
            bot_name="published name",
            prompt="published prompt",
            model_id=model.pk,
            support_context=1,
            bot_status=1,
        )
        Personality.objects.create(bot_id=bot.pk, config_type=0, personality="draft personality")
        Personality.objects.create(
            bot_id=bot.pk, config_type=1, personality="published personality"
        )
        internal = AgentVersion.objects.create(
            agent_id=bot.pk, definition={"prompt": "internal release"}, created_by=user.pk
        )
        AgentState.objects.create(agent_id=bot.pk, published_version_id=internal.pk)
        with self.assertRaisesMessage(ValidationError, "API缺少独立完整发布快照"):
            recorded_definition(bot, market, "API")
        self.assertEqual(adopt_legacy()["imported"], 1)
        self.assertEqual(AgentState.objects.get(agent_id=bot.pk).published_version_id, internal.pk)
        definition = Publication.objects.get().candidate.definition
        self.assertEqual(definition["prompt"], market.prompt)
        self.assertEqual(definition["personality"]["personality"], "published personality")
        self.assertTrue(definition["supportContext"])
        self.assertEqual(Agent.objects.get(pk=bot.pk).prompt, "unpublished prompt")
        self.assertIsNotNone(AgentState.objects.get(agent_id=bot.pk).published_version_id)
