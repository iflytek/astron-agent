"""Keep publication resource authority separate from the actual conversation identity."""

from django.core.exceptions import PermissionDenied
from django.http import Http404

from astron_console.accounts.models import User
from astron_console.agents.definitions import get_scoped_agent
from astron_console.spaces.permissions import space_membership
from astron_console.workflows.authorization import active_scope

from .models import App, PublicRunGrant, ShareRecord
from .services import require_publication


def grant_for_root(root):
    return PublicRunGrant.objects.filter(root_id=root.pk).select_related("candidate").first()


def check_grant(grant):
    publication = require_publication(
        publication_id=grant.publication_id, candidate_id=grant.candidate_id
    )
    if grant.app_id and (
        publication.channel != "API"
        or publication.target_id != grant.app_id
        or not App.objects.filter(app_id=grant.app_id, is_delete=0).exists()
    ):
        raise PermissionDenied
    if (
        grant.share_id
        and not ShareRecord.objects.filter(
            pk=grant.share_id, base_id=publication.bot_id, is_act=1
        ).exists()
    ):
        raise PermissionDenied
    if grant.identity_kind == "console":
        user = User.objects.filter(pk=grant.caller_uid, is_active=True).first()
        if user is None or not user.account_enabled:
            raise PermissionDenied
        if grant.caller_space_id is not None:
            space_membership(grant.caller_uid, grant.caller_space_id)
    return publication


def check_root(root):
    grant = grant_for_root(root)
    if grant is not None:
        check_grant(grant)
    return grant


def caller_uid(root):
    grant = check_root(root)
    return grant.caller_uid if grant is not None else root.uid


def memory_scope(root, agent):
    """Only a real Console user with existing Agent access can use their own memory."""
    grant = check_root(root)
    if grant is None:
        return active_scope(root.uid, root.space_id)
    if grant.identity_kind != "console":
        return None
    try:
        scope = active_scope(grant.caller_uid, grant.candidate.space_id)
        get_scoped_agent(scope, agent.pk)
        return scope
    except (PermissionDenied, Http404):
        return None
