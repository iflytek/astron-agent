from datetime import timedelta

from django.core.exceptions import PermissionDenied
from django.test import Client, TestCase
from django.utils import timezone

from astron_console.accounts.models import User, UserProfile
from astron_console.spaces.models import (
    Application,
    Enterprise,
    EnterpriseMember,
    EnterprisePermission,
    Invitation,
    Notification,
    Space,
    SpaceMember,
    SpacePermission,
    UserNotification,
)
from astron_console.spaces.permissions import ResourceScope, require_resource_access, scope_queryset


class SpacesTests(TestCase):
    def setUp(self):
        self.owner = self.user("owner")
        self.member = self.user("member")
        self.other = self.user("other")
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.owner)
        self.space = Space.objects.create(name="原空间", uid=self.owner.pk)
        SpaceMember.objects.create(space_id=self.space.pk, uid=self.owner.pk, role=1)
        SpaceMember.objects.create(space_id=self.space.pk, uid=self.member.pk, role=3)

    def user(self, uid):
        user = User.objects.create_user(id=uid, username=uid)
        UserProfile.objects.create(uid=uid, username=uid)
        return user

    def call(self, path, data=None, *, user=None, sid=None, eid=None, method="post"):
        if user:
            self.client.force_login(user)
        csrf = self.client.get("/auth/csrf").json()["data"]["csrfToken"]
        headers = {"HTTP_X_CSRFTOKEN": csrf}
        if sid is not None:
            headers["HTTP_SPACE_ID"] = str(sid)
        if eid is not None:
            headers["HTTP_ENTERPRISE_ID"] = str(eid)
        if method == "get":
            return self.client.get(path, data or {}, **headers)
        return getattr(self.client, method)(
            path, data or {}, content_type="application/json", **headers
        )

    def enterprise(self):
        item = Enterprise.objects.create(
            name="原团队", uid=self.owner.pk, expire_time=timezone.now() + timedelta(days=30)
        )
        EnterpriseMember.objects.create(enterprise_id=item.pk, uid=self.owner.pk, role=1)
        EnterpriseMember.objects.create(enterprise_id=item.pk, uid=self.member.pk, role=3)
        return item

    def test_invalid_and_foreign_context(self):
        for sid in ("not-id", "0", "-1", "1.5"):
            self.assertEqual(self.call("/space/detail", sid=sid, method="get").status_code, 400)
        self.assertEqual(
            self.call(
                "/space/detail", user=self.other, sid=self.space.pk, method="get"
            ).status_code,
            403,
        )
        self.assertEqual(
            self.call(
                "/space/detail", user=self.member, sid=self.space.pk, method="get"
            ).status_code,
            200,
        )

    def test_database_permission_override(self):
        SpacePermission.objects.filter(permission_key="SpaceController_detail_GET").update(
            member=False
        )
        self.assertEqual(
            self.call(
                "/space/detail", user=self.member, sid=self.space.pk, method="get"
            ).status_code,
            403,
        )
        self.assertEqual(
            self.call(
                "/space/detail", user=self.owner, sid=self.space.pk, method="get"
            ).status_code,
            200,
        )

    def test_personal_owner_and_no_team_fallback(self):
        personal = ResourceScope(self.owner.pk, None, None)
        require_resource_access(
            personal, owner_uid=self.owner.pk, space_id=None, permission_key="unused"
        )
        with self.assertRaises(PermissionDenied):
            require_resource_access(
                personal, owner_uid=self.other.pk, space_id=None, permission_key="unused"
            )
        with self.assertRaises(PermissionDenied):
            scope_queryset(Space.objects.all(), ResourceScope(self.owner.pk, None, 1))

    def test_create_uses_authenticated_uid(self):
        result = self.call(
            "/space/create-personal-space",
            {"name": "新空间", "uid": self.owner.pk},
            user=self.other,
        )
        self.assertEqual(result.status_code, 200, result.content)
        sid = result.json()["data"]
        self.assertEqual(Space.objects.get(pk=sid).uid, self.other.pk)
        self.assertEqual(SpaceMember.objects.get(space_id=sid, uid=self.other.pk).role, 1)

    def test_csrf_and_no_get_mutations(self):
        result = self.client.post(
            "/space/create-personal-space", {"name": "new"}, content_type="application/json"
        )
        self.assertEqual(result.status_code, 403)
        self.assertEqual(
            self.call("/space/visit-space", {"spaceId": self.space.pk}, method="get").status_code,
            400,
        )
        self.assertEqual(
            self.call("/space/visit-space", {"spaceId": self.space.pk}).status_code, 200
        )

    def test_invitation_accept_is_recipient_only_single_use(self):
        result = self.call(
            "/invite-record/space-invite",
            {"members": [{"uid": self.other.pk, "role": 3}]},
            sid=self.space.pk,
        )
        self.assertEqual(result.status_code, 200, result.content)
        invitation = Invitation.objects.get(invitee_uid=self.other.pk)
        path = f"/invite-record/accept-invite?inviteId={invitation.pk}"
        self.assertEqual(self.call(path, user=self.member).status_code, 403)
        self.assertEqual(self.call(path, user=self.other).status_code, 200)
        self.assertEqual(self.call(path, user=self.other).status_code, 400)
        self.assertEqual(SpaceMember.objects.get(uid=self.other.pk, space_id=self.space.pk).role, 3)
        self.assertTrue(UserNotification.objects.filter(receiver_uid=self.other.pk).exists())

    def test_expired_and_revoked_invitations(self):
        item = Invitation.objects.create(
            type=1,
            space_id=self.space.pk,
            invitee_uid=self.other.pk,
            role=3,
            expire_time=timezone.now() - timedelta(seconds=1),
        )
        path = f"/invite-record/accept-invite?inviteId={item.pk}"
        self.assertEqual(self.call(path, user=self.other).status_code, 400)
        item.expire_time = timezone.now() + timedelta(days=1)
        item.status = 4
        item.save()
        self.assertEqual(self.call(path, user=self.other).status_code, 400)
        self.assertFalse(
            SpaceMember.objects.filter(uid=self.other.pk, space_id=self.space.pk).exists()
        )

    def test_cross_space_invitation_revoke(self):
        foreign = Space.objects.create(name="other", uid=self.other.pk)
        item = Invitation.objects.create(
            type=1,
            space_id=foreign.pk,
            invitee_uid=self.member.pk,
            role=3,
            expire_time=timezone.now() + timedelta(days=1),
        )
        self.assertEqual(
            self.call(
                f"/invite-record/revoke-space-invite?inviteId={item.pk}", sid=self.space.pk
            ).status_code,
            404,
        )
        item.refresh_from_db()
        self.assertEqual(item.status, 1)

    def test_no_self_promotion_or_owner_removal(self):
        self.assertEqual(
            self.call(
                "/space-user/update-role?uid=member&role=1", user=self.member, sid=self.space.pk
            ).status_code,
            403,
        )
        self.assertEqual(
            self.call(
                "/space-user/remove?uid=owner", user=self.owner, sid=self.space.pk, method="delete"
            ).status_code,
            403,
        )
        self.assertEqual(
            self.call("/space-user/quit-space", user=self.owner, sid=self.space.pk).status_code, 403
        )

    def test_removal_revokes_access_preserves_user(self):
        self.assertEqual(
            self.call(
                "/space-user/remove?uid=member", sid=self.space.pk, method="delete"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.call(
                "/space/detail", user=self.member, sid=self.space.pk, method="get"
            ).status_code,
            403,
        )
        self.assertTrue(UserProfile.objects.filter(uid=self.member.pk).exists())

    def test_application_approval_scope(self):
        enterprise = self.enterprise()
        self.space.enterprise_id = enterprise.pk
        self.space.type = 4
        self.space.save()
        SpaceMember.objects.filter(space_id=self.space.pk, uid=self.member.pk).delete()
        result = self.call(
            f"/apply-record/join-enterprise-space?spaceId={self.space.pk}",
            user=self.member,
            eid=enterprise.pk,
        )
        self.assertEqual(result.status_code, 200, result.content)
        item = Application.objects.get(apply_uid=self.member.pk)
        foreign = Space.objects.create(name="foreign", uid=self.owner.pk)
        SpaceMember.objects.create(space_id=foreign.pk, uid=self.owner.pk, role=1)
        path = f"/apply-record/agree-enterprise-space?applyId={item.pk}"
        self.assertEqual(self.call(path, user=self.owner, sid=foreign.pk).status_code, 404)
        result = self.call(path, user=self.owner, sid=self.space.pk, eid=enterprise.pk)
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(
            SpaceMember.objects.get(space_id=self.space.pk, uid=self.member.pk).role, 3
        )

    def test_enterprise_context_mismatch(self):
        enterprise = self.enterprise()
        self.assertEqual(
            self.call(
                "/space/detail", sid=self.space.pk, eid=enterprise.pk, method="get"
            ).status_code,
            403,
        )

    def test_transfer_preserves_one_owner_and_uids(self):
        enterprise = self.enterprise()
        self.space.enterprise_id = enterprise.pk
        self.space.save()
        result = self.call(
            "/space-user/transfer-space?uid=member", sid=self.space.pk, eid=enterprise.pk
        )
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(SpaceMember.objects.filter(space_id=self.space.pk, role=1).count(), 1)
        self.space.refresh_from_db()
        self.assertEqual(self.space.uid, self.member.pk)
        self.assertTrue(UserProfile.objects.filter(uid=self.owner.pk).exists())

    def test_soft_delete_preserves_members(self):
        ids = list(SpaceMember.objects.filter(space_id=self.space.pk).values_list("pk", flat=True))
        result = self.call(f"/space/delete-personal-space?spaceId={self.space.pk}", method="delete")
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(Space.objects.get(pk=self.space.pk).deleted, 1)
        self.assertEqual(
            list(SpaceMember.objects.filter(space_id=self.space.pk).values_list("pk", flat=True)),
            ids,
        )
        self.assertEqual(
            self.call("/space/detail", sid=self.space.pk, method="get").status_code, 404
        )

    def test_notification_visibility_and_broadcast_read(self):
        direct = Notification.objects.create(title="私信", type="SYSTEM", payload={"keep": "value"})
        UserNotification.objects.create(notification_id=direct.pk, receiver_uid=self.member.pk)
        public = Notification.objects.create(title="广播", type="BROADCAST")
        self.assertEqual(self.call("/notifications/unread-count", method="get").json()["data"], 1)
        self.assertEqual(self.call(f"/notifications/{direct.pk}", method="delete").status_code, 404)
        self.call("/notifications/mark-read", {"notificationIds": [public.pk]})
        self.assertEqual(self.call("/notifications/unread-count", method="get").json()["data"], 0)
        self.assertEqual(
            self.call("/notifications/unread-count", user=self.member, method="get").json()["data"],
            2,
        )

    def test_expiry_policy(self):
        enterprise = self.enterprise()
        enterprise.expire_time = timezone.now() - timedelta(days=1)
        enterprise.save()
        self.assertEqual(
            self.call("/enterprise/update-name", {"name": "new"}, eid=enterprise.pk).status_code,
            403,
        )
        EnterprisePermission.objects.filter(
            permission_key="EnterpriseController_detail_GET"
        ).update(available_expired=True)
        self.assertEqual(
            self.call("/enterprise/detail", eid=enterprise.pk, method="get").status_code, 200
        )
