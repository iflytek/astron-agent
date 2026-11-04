"""Published definition contract for later workflow consumers; no workflow lifecycle."""

from django.core.exceptions import PermissionDenied

from astron_console.accounts.models import User
from astron_console.http import api_endpoint
from astron_console.resources.sandbox import no_store, service_auth
from astron_console.spaces.permissions import ResourceScope, identifier, space_membership

from .definitions import resolve_version


@api_endpoint(["GET"], authenticated=False)
def resolve(request):
    service_auth(request, "WORKFLOW_INTERNAL_API_KEY", "X-Workflow-Internal-Key")
    uid = request.GET.get("uid")
    user = User.objects.filter(pk=uid, is_active=True).first()
    if not user or not user.account_enabled:
        raise PermissionDenied
    sid = identifier(request.GET.get("spaceId"))
    eid = None
    if sid:
        space, _ = space_membership(uid, sid)
        eid = space.enterprise_id
    scope = ResourceScope(uid, sid, eid)
    return no_store(
        resolve_version(
            scope,
            identifier(request.GET.get("agentId"), required=True),
            identifier(request.GET.get("versionId")),
        )
    )
