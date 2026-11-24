"""Authoritative workflow identity; callers never select an owner's credentials."""

from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404

from astron_console.accounts.models import User
from astron_console.spaces.permissions import (
    ResourceScope,
    require_resource_access,
    space_membership,
)

from .models import Workflow

READ = "WorkflowController_detail_GET"
EXECUTE = "WorkflowController_build_POST"


def active_scope(uid, space_id):
    user = User.objects.filter(pk=uid, is_active=True).first()
    if user is None or not user.account_enabled:
        raise PermissionDenied
    eid = None
    if space_id is not None:
        space, _ = space_membership(str(uid), space_id)
        eid = space.enterprise_id
    return ResourceScope(str(uid), space_id, eid)


def get_workflow(scope, id_or_flow_id, permission=READ):
    key = str(id_or_flow_id or "")
    if not key or len(key) > 255:
        raise ValidationError("工作流标识无效")
    # flow IDs can be numeric. Prefer the explicit business identity.
    row = (
        Workflow.objects.filter(pk=id_or_flow_id, deleted=False).first()
        if isinstance(id_or_flow_id, int)
        else None
    )
    row = row or Workflow.objects.filter(flow_id=key, deleted=False).first()
    if row is None and key.isdigit():
        row = Workflow.objects.filter(pk=int(key), deleted=False).first()
    if row is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=row.uid, space_id=row.space_id, permission_key=permission
    )
    return row
