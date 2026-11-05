"""Validate Core's wire contract before a publication or approval becomes active."""

import json
from unittest.mock import patch

import httpx
from django.core.exceptions import ValidationError
from django.db import DataError, connection
from django.test import TransactionTestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.definitions import READ, WRITE
from astron_console.publishing import services, tenant
from astron_console.publishing.legacy import adopt_legacy
from astron_console.publishing.models import (
    App,
    AppOperation,
    Approval,
    LegacyMarket,
    LegacyPublicationIssue,
    Publication,
)
from astron_console.resources.common import UpstreamError
from astron_console.spaces.models import Space, SpaceMember, SpacePermission
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.authorization import EXECUTE
from astron_console.workflows.management_views import WRITE as WORKFLOW_WRITE
from astron_console.workflows.management_views import create_workflow
from astron_console.workflows.models import WorkflowVersion


@override_settings(
    ROOT_URLCONF="astron_console.publishing.tests.test_publishing",
    WORKFLOW_URL="https://workflow.internal",
    WORKFLOW_INTERNAL_API_KEY="workflow-test-key",
    TENANT_INTERNAL_API_KEY="t" * 40,
)
class PublicationValidationTests(TransactionTestCase):
    def setUp(self):
        self.owner = User.objects.create_user(id="validation-owner", username="validation-owner")
        self.member = User.objects.create_user(id="validation-member", username="validation-member")
        for user in (self.owner, self.member):
            UserProfile.objects.create(uid=user.pk, username=user.username)
        self.space = Space.objects.create(name="validation", uid=self.owner.pk)
        SpaceMember.objects.create(space_id=self.space.pk, uid=self.owner.pk, role=1)
        SpaceMember.objects.create(space_id=self.space.pk, uid=self.member.pk, role=3)
        for permission in (READ, WRITE, EXECUTE, WORKFLOW_WRITE):
            SpacePermission.objects.update_or_create(
                permission_key=permission, defaults={"owner": True, "admin": True, "member": True}
            )
        self.scope = ResourceScope(self.owner.pk, self.space.pk, None)
        self.workflow = create_workflow(self.scope, {"name": "validated workflow"})
        self.bot = services.bind_workflow(self.scope, self.workflow.pk)
        self.response_code = 0
        self.transport_error = False
        self.requests = []
        original_client = httpx.Client

        def handle(request):
            self.assertFalse(connection.in_atomic_block, "Network validation held a transaction")
            self.assertEqual(
                str(request.url), "https://workflow.internal/workflow/v1/console/validate"
            )
            self.assertEqual(request.headers["X-Workflow-Internal-Key"], "workflow-test-key")
            self.assertEqual(request.headers["X-Consumer-Username"], self.workflow.app_id)
            payload = json.loads(request.content)
            self.assertEqual(set(payload), {"protocol"})
            self.requests.append(payload)
            if self.transport_error:
                raise httpx.ConnectError("service unavailable", request=request)
            return httpx.Response(200, json={"code": self.response_code})

        self.transport = httpx.MockTransport(handle)
        self.mock_client = patch(
            "astron_console.workflows.validation.httpx.Client",
            side_effect=lambda **kwargs: original_client(transport=self.transport, **kwargs),
        )
        self.mock_client.start()
        self.addCleanup(self.mock_client.stop)

    def legacy_release(self, bot=None, workflow=None):
        bot, workflow = bot or self.bot, workflow or self.workflow
        version = WorkflowVersion.objects.create(
            flow_id=workflow.flow_id,
            version_num="retained-release",
            data=workflow.data,
            publish_channel=1,
            publish_result="成功",
        )
        LegacyMarket.objects.create(bot_id=bot.pk, uid=self.owner.pk, bot_status=1)
        return version

    def test_empty_graph_engine_rejection_cannot_create_approval_or_replace_channel(self):
        original = services.submit(self.scope, self.bot.pk, "MARKET")
        self.workflow.data = json.dumps({"nodes": [], "edges": []})
        self.workflow.save(update_fields=["data"])
        self.response_code = 40001
        with self.assertRaisesMessage(ValidationError, "工作流校验失败"):
            services.submit(self.scope, self.bot.pk, "MARKET")
        member_scope = ResourceScope(self.member.pk, self.space.pk, None)
        with self.assertRaisesMessage(ValidationError, "工作流校验失败"):
            services.submit(member_scope, self.bot.pk, "MARKET")
        self.assertFalse(Approval.objects.exists())
        self.assertEqual(Publication.objects.get().candidate_id, original["candidateId"])
        self.assertEqual(len(self.requests), 3)
        self.assertEqual(self.requests[-1]["protocol"]["data"]["nodes"], [])

    def test_approval_revalidates_candidate_and_preserves_previous_on_rejection(self):
        previous = services.submit(self.scope, self.bot.pk, "MARKET")
        member_scope = ResourceScope(self.member.pk, self.space.pk, None)
        submitted = services.submit(member_scope, self.bot.pk, "MARKET")
        approval = Approval.objects.get(pk=submitted["approvalId"])
        self.response_code = 40001
        self.client.force_login(self.owner)
        response = self.client.post(
            f"/publish/approvals/{approval.pk}/approve",
            data="{}",
            content_type="application/json",
            HTTP_SPACE_ID=str(self.space.pk),
        )
        self.assertEqual(response.status_code, 400)
        approval.refresh_from_db()
        self.assertEqual(approval.approval_status, "PENDING")
        self.assertEqual(Publication.objects.get().candidate_id, previous["candidateId"])
        self.response_code = 0
        response = self.client.post(
            f"/publish/approvals/{approval.pk}/approve",
            data="{}",
            content_type="application/json",
            HTTP_SPACE_ID=str(self.space.pk),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Publication.objects.get().candidate_id, approval.candidate_id)

    def test_legacy_release_checks_engine_and_retries_after_recovery(self):
        self.workflow.data = json.dumps({"nodes": [], "edges": []})
        version = self.legacy_release()
        self.response_code = 40001
        self.assertEqual(adopt_legacy()["unresolved"], 1)
        self.assertFalse(Publication.objects.exists())
        self.assertEqual(LegacyPublicationIssue.objects.filter(resolved=False).count(), 1)
        self.response_code = 0
        self.assertEqual(adopt_legacy()["imported"], 1)
        self.assertEqual(Publication.objects.get().candidate.version_id, version.pk)

    def test_unavailable_core_stops_repeated_batch_waits_without_marking_success(self):
        self.legacy_release()
        other = create_workflow(self.scope, {"name": "second"})
        other_bot = services.bind_workflow(self.scope, other.pk)
        self.legacy_release(other_bot, other)
        self.transport_error = True
        self.assertEqual(adopt_legacy(), {"imported": 0, "existing": 0, "unresolved": 2})
        self.assertEqual(len(self.requests), 1)
        self.assertEqual(LegacyPublicationIssue.objects.filter(resolved=False).count(), 2)
        self.assertFalse(Publication.objects.exists())

    def test_app_lengths_checked_before_tenant_and_db_failure_is_not_retried(self):
        with patch("astron_console.publishing.tenant.call") as remote:
            for name, description in (("n" * 129, ""), ("ok", "d" * 513)):
                with self.assertRaises(ValidationError):
                    tenant.create_app(self.owner.pk, name, description)
            remote.assert_not_called()
            self.assertFalse(AppOperation.objects.exists())
        results = [
            {"app_id": "created-remotely"},
            [{"auth_list": [{"api_key": "key", "api_secret": "secret"}]}],
        ]
        with patch("astron_console.publishing.tenant.call", side_effect=results) as remote:
            with patch(
                "astron_console.publishing.tenant.App.objects.create",
                side_effect=DataError("local write failed"),
            ):
                with self.assertRaises(UpstreamError):
                    tenant.create_app(self.owner.pk, "n" * 128, "d" * 512, "operation")
            self.assertEqual(AppOperation.objects.get().status, "UNKNOWN")
            self.assertEqual(AppOperation.objects.get().app_id, "created-remotely")
            self.assertFalse(App.objects.exists())
            with self.assertRaises(ValidationError):
                tenant.create_app(self.owner.pk, "n" * 128, "d" * 512, "operation")
            self.assertEqual(remote.call_count, 2)

    def test_approval_text_respects_retained_512_column_before_remote_validation(self):
        with self.assertRaises(ValidationError):
            services.submit(self.scope, self.bot.pk, "MARKET", reason="x" * 513)
        self.assertEqual(self.requests, [])
        member_scope = ResourceScope(self.member.pk, self.space.pk, None)
        submitted = services.submit(member_scope, self.bot.pk, "MARKET", reason="x" * 512)
        self.client.force_login(self.owner)
        response = self.client.post(
            f"/publish/approvals/{submitted['approvalId']}/approve",
            data=json.dumps({"reviewComment": "x" * 513}),
            content_type="application/json",
            HTTP_SPACE_ID=str(self.space.pk),
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(self.requests), 1)
        self.assertFalse(Publication.objects.exists())
