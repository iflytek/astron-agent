"""Historical releases never inherit media configuration from a newer canvas draft."""

import json
from unittest.mock import patch

from django.test import TestCase

from astron_console.accounts.models import User, UserProfile
from astron_console.channels.models import WorkflowMediaConfig
from astron_console.publishing import services
from astron_console.publishing.legacy import adopt_legacy
from astron_console.publishing.models import LegacyMarket, LegacyPublicationIssue, Publication
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.management_views import create_workflow
from astron_console.workflows.models import WorkflowVersion


class LegacyMediaTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(id="media-owner", username="media-owner")
        UserProfile.objects.create(uid=user.pk, username=user.username)
        self.scope = ResourceScope(user.pk, None, None)
        validator = patch("astron_console.publishing.services.validate_graph")
        self.validate = validator.start()
        self.addCleanup(validator.stop)

    def release(self, *, bot_type=3, workflow_type=None):
        workflow = create_workflow(self.scope, {"name": "retained media"})
        workflow.type = workflow_type
        workflow.save(update_fields=["type"])
        bot = services.bind_workflow(self.scope, workflow.pk)
        bot.version = bot_type
        bot.save(update_fields=["version"])
        version = WorkflowVersion.objects.create(
            flow_id=workflow.flow_id,
            version_num="released",
            data=workflow.data,
            publish_channel=1,
            publish_result="成功",
        )
        LegacyMarket.objects.create(bot_id=bot.pk, uid=self.scope.uid, bot_status=1)
        return bot, workflow, version

    def media(self, workflow, version_num, config):
        return WorkflowMediaConfig.objects.create(
            flow_id=workflow.flow_id, version_num=version_num, config=json.dumps(config)
        )

    def test_selected_historical_version_preserves_avatar_and_voice_not_draft(self):
        bot, workflow, version = self.release(bot_type=4, workflow_type=4)
        archived = {"interactType": 1, "sceneId": "old-avatar", "vcn": "old-voice"}
        self.media(workflow, version.version_num, archived)
        self.media(workflow, "-1", {"sceneId": "new-avatar", "vcn": "new-voice"})
        self.assertEqual(adopt_legacy(), {"imported": 1, "existing": 0, "unresolved": 0})
        candidate = Publication.objects.get(bot_id=bot.pk).candidate
        self.assertEqual(candidate.version_id, version.pk)
        self.assertEqual(candidate.definition["talkAgentConfig"], archived)
        self.assertEqual(self.validate.call_count, 1)

    def test_missing_media_for_retained_talk_bot_or_canvas_is_explicitly_unresolved(self):
        for bot_type, workflow_type in ((4, None), (3, 4)):
            self.release(bot_type=bot_type, workflow_type=workflow_type)
        self.assertEqual(adopt_legacy(), {"imported": 0, "existing": 0, "unresolved": 2})
        self.assertFalse(Publication.objects.exists())
        self.assertEqual(LegacyPublicationIssue.objects.filter(resolved=False).count(), 2)
        self.assertTrue(
            all("媒体配置存档" in row.reason for row in LegacyPublicationIssue.objects.all())
        )
        self.validate.assert_not_called()

    def test_draft_media_is_evidence_but_never_a_replacement_for_missing_archive(self):
        bot, workflow, _ = self.release()
        draft = self.media(workflow, "-1", {"sceneId": "draft-avatar", "vcn": "draft-voice"})
        self.assertEqual(adopt_legacy()["unresolved"], 1)
        self.assertFalse(Publication.objects.exists())
        self.assertIn("不能使用当前草稿", LegacyPublicationIssue.objects.get(bot_id=bot.pk).reason)
        draft.refresh_from_db()
        self.assertEqual(json.loads(draft.config)["vcn"], "draft-voice")

    def test_invalid_selected_media_archive_is_preserved_and_not_treated_as_empty(self):
        bot, workflow, version = self.release(bot_type=4)
        row = self.media(workflow, version.version_num, ["invalid-shape"])
        self.assertEqual(adopt_legacy()["unresolved"], 1)
        self.assertFalse(Publication.objects.exists())
        self.assertIn("存档无效", LegacyPublicationIssue.objects.get(bot_id=bot.pk).reason)
        row.refresh_from_db()
        self.assertEqual(json.loads(row.config), ["invalid-shape"])
