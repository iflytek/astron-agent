"""One publication boundary for immutable candidates, approvals and execution grants."""

import hashlib
import json
import logging
import secrets

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.agents.definitions import READ, WRITE, snapshot_definition, validate_resources
from astron_console.agents.models import Agent, AgentState, AgentVersion
from astron_console.resources.common import number, parsed
from astron_console.spaces.permissions import require_resource_access, space_membership
from astron_console.workflows.authorization import EXECUTE, active_scope, get_workflow
from astron_console.workflows.execution_context import freeze_dependencies, freeze_graph
from astron_console.workflows.models import Workflow, WorkflowVersion
from astron_console.workflows.protocol import clean_config, to_protocol
from astron_console.workflows.validation import validate_graph

from .models import (
    App,
    Approval,
    BotAPI,
    Publication,
    PublicationCandidate,
    ShareRecord,
    WorkflowBot,
)

logger = logging.getLogger(__name__)
CHANNELS = {"MARKET", "API", "INTERNAL", "WECHAT"}


def get_bot(scope, bot_id, permission=READ):
    bot = Agent.objects.filter(pk=number(bot_id), is_delete=0).first()
    if bot is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=bot.uid, space_id=bot.space_id, permission_key=permission
    )
    return bot


def candidate_scope(candidate):
    # The initiating publisher must remain an active member, even when the bot's owner differs.
    return active_scope(candidate.owner_uid, candidate.space_id)


def assert_direct_publish(scope):
    if scope.space_id is not None and space_membership(scope.uid, scope.space_id)[1].role not in (
        1,
        2,
    ):
        raise PermissionDenied("只有空间所有者或管理员可直接发布")


def requires_approval(scope):
    return scope.space_id is not None and space_membership(scope.uid, scope.space_id)[1].role == 3


def workflow_for_bot(scope, bot):
    binding = WorkflowBot.objects.filter(bot_id=bot.pk).order_by("id").first()
    key = binding.flow_id if binding else bot.maas_bot_id
    if not key:
        raise ValidationError("该工作流助手没有有效的工作流绑定")
    return get_workflow(scope, key, EXECUTE)


@transaction.atomic
def _snapshot_candidate(scope, bot_id, version_id=None):
    bot = get_bot(scope, bot_id, WRITE)
    bot = Agent.objects.select_for_update().get(pk=bot.pk)
    require_resource_access(scope, owner_uid=bot.uid, space_id=bot.space_id, permission_key=WRITE)
    if bot.version == 1:
        if version_id is None:
            config = snapshot_definition(bot, scope)
            validate_resources(scope, config)
            version = AgentVersion.objects.create(
                agent_id=bot.pk, definition=config, created_by=scope.uid
            )
        else:
            version = AgentVersion.objects.filter(pk=number(version_id), agent_id=bot.pk).first()
            if version is None:
                raise Http404
            config = version.definition
            validate_resources(scope, config)
        kind, resource_id = "agent", str(bot.pk)
    else:
        workflow = workflow_for_bot(scope, bot)
        workflow = Workflow.objects.select_for_update().get(pk=workflow.pk)
        if version_id is None:
            graph = freeze_graph(scope, workflow.data)
            to_protocol(graph, workflow, scope)
            freeze_dependencies(scope, workflow=workflow, graph=graph)
            version = WorkflowVersion.objects.create(
                flow_id=workflow.flow_id,
                version_num="v" + secrets.token_hex(8),
                name="发布版本",
                data=json.dumps(graph, ensure_ascii=False),
                advanced_config=json.dumps(clean_config(parsed(workflow.advanced_config))),
                bot_id=str(bot.pk),
            )
        else:
            version = (
                WorkflowVersion.objects.filter(
                    pk=number(version_id), flow_id=workflow.flow_id, is_deleted=0
                )
                .exclude(deleted=2)
                .first()
            )
            if version is None:
                raise Http404
            graph = freeze_graph(scope, version.data)
            to_protocol(graph, workflow, scope)
            freeze_dependencies(scope, workflow=workflow, graph=graph)
        config = {
            "graph": graph,
            "advancedConfig": clean_config(parsed(version.advanced_config)),
            "botName": bot.bot_name or "",
            "botDesc": bot.bot_desc or "",
            "avatar": bot.avatar or "",
            "botType": bot.bot_type,
            "prologue": bot.prologue or "",
        }
        from astron_console.channels.workflow_media import freeze_version, read_version

        if version_id is None:
            freeze_version(workflow, version)
        media = read_version(workflow.flow_id, version.version_num)
        if media:
            config["talkAgentConfig"] = clean_config(media)
        kind, resource_id = "workflow", str(workflow.flow_id)
    return PublicationCandidate.objects.create(
        bot_id=bot.pk,
        resource_kind=kind,
        resource_id=resource_id,
        version_id=version.pk,
        definition=config,
        owner_uid=scope.uid,
        space_id=scope.space_id,
        created_by=scope.uid,
    )


def create_candidate(scope, bot_id, version_id=None):
    candidate = _snapshot_candidate(scope, bot_id, version_id)
    validate_candidate_engine(candidate)
    return candidate


def validate_candidate_engine(candidate, *, validation_timeout=60):
    # Remote validation is read-only and occurs before any publication/approval row lock.
    scope = validate_candidate(candidate)
    if candidate.resource_kind == "workflow":
        workflow = get_workflow(scope, candidate.resource_id, EXECUTE)
        validate_graph(candidate.definition["graph"], workflow, scope, timeout=validation_timeout)


def validate_candidate(candidate):
    scope = candidate_scope(candidate)
    bot = get_bot(scope, candidate.bot_id)
    if candidate.resource_kind == "agent":
        version = AgentVersion.objects.filter(pk=candidate.version_id, agent_id=bot.pk).first()
        if version is None or version.definition != candidate.definition:
            raise ValidationError("发布快照已失效")
        validate_resources(scope, candidate.definition)
    else:
        workflow = get_workflow(scope, candidate.resource_id, EXECUTE)
        version = (
            WorkflowVersion.objects.filter(
                pk=candidate.version_id, flow_id=workflow.flow_id, is_deleted=0
            )
            .exclude(deleted=2)
            .first()
        )
        if version is None:
            raise ValidationError("发布工作流版本已失效")
        # Fixed Agent versions are validated by the runtime, not re-selected here.
        to_protocol(candidate.definition["graph"], workflow, scope)
    return scope


def activate(candidate, channel, target_id=""):
    validate_candidate_engine(candidate)
    return _activate(candidate, channel, target_id)


@transaction.atomic
def _activate(candidate, channel, target_id=""):
    channel = channel.upper()
    if channel not in CHANNELS:
        raise ValidationError("不支持此发布渠道")
    Agent.objects.select_for_update().get(pk=candidate.bot_id)
    validate_candidate(candidate)
    if channel == "API":
        app = App.objects.filter(app_id=target_id, uid=candidate.created_by, is_delete=0).first()
        if app is None:
            raise PermissionDenied("发布应用不属于申请人")
    publication, _ = Publication.objects.update_or_create(
        bot_id=candidate.bot_id,
        channel=channel,
        target_id=target_id,
        defaults={"candidate": candidate, "active": True, "update_time": timezone.now()},
    )
    if candidate.resource_kind == "agent":
        AgentState.objects.update_or_create(
            agent_id=candidate.bot_id, defaults={"published_version_id": candidate.version_id}
        )
    else:
        Workflow.objects.filter(flow_id=candidate.resource_id).update(
            published_data=json.dumps(candidate.definition["graph"], ensure_ascii=False), status=1
        )
    if channel == "API":
        BotAPI.objects.update_or_create(
            assistant_id=candidate.resource_id,
            defaults={
                "uid": candidate.created_by,
                "bot_id": candidate.bot_id,
                "app_id": target_id,
                "prompt": "",
                "plugin_id": "",
                "embedding_id": "",
                "assistant_id": candidate.resource_id,
                "api_key": app.app_key,
                "api_secret": app.app_secret,
                "api_path": "/workflow/v1/chat/completions"
                if candidate.resource_kind == "workflow"
                else "/agent/v1/chat/completions",
                "description": candidate.definition.get("botName", ""),
                "update_time": timezone.now(),
            },
        )
    logger.info(
        "Publication activated publication_id=%s candidate_id=%s channel=%s",
        publication.pk,
        candidate.pk,
        channel,
    )
    return publication


def submit(scope, bot_id, channel, *, target_id="", version_id=None, reason=""):
    channel = channel.upper()
    if channel not in CHANNELS:
        raise ValidationError("不支持此发布渠道")
    if not isinstance(reason, str) or len(reason) > 512:
        raise ValidationError("申请理由过长")
    bot = get_bot(scope, bot_id, WRITE)
    if (
        channel == "API"
        and not App.objects.filter(app_id=target_id, uid=scope.uid, is_delete=0).exists()
    ):
        raise PermissionDenied("发布应用不属于申请人")
    pending = requires_approval(scope)
    if pending and channel == "WECHAT":
        raise PermissionDenied
    if pending:
        previous = Approval.objects.filter(
            resource_id=str(bot.pk),
            publish_type=channel,
            target_id=target_id,
            requester_uid=scope.uid,
            space_id=scope.space_id,
            deleted=0,
            approval_status="PENDING",
            candidate__isnull=False,
        ).first()
        if previous:
            return {"approvalRequired": True, "approvalId": previous.pk, "status": "PENDING"}
    candidate = create_candidate(scope, bot.pk, version_id)
    return _submit_candidate(scope, candidate, channel, target_id, reason)


@transaction.atomic
def _submit_candidate(scope, candidate, channel, target_id, reason):
    bot = Agent.objects.select_for_update().get(pk=candidate.bot_id)
    get_bot(scope, bot.pk, WRITE)
    validate_candidate(candidate)
    pending = requires_approval(scope)
    if pending and channel == "WECHAT":
        raise PermissionDenied
    if (
        channel == "API"
        and not App.objects.filter(app_id=target_id, uid=scope.uid, is_delete=0).exists()
    ):
        raise PermissionDenied("发布应用不属于申请人")
    if pending:
        previous = Approval.objects.filter(
            resource_id=str(bot.pk),
            publish_type=channel,
            target_id=target_id,
            requester_uid=scope.uid,
            space_id=scope.space_id,
            deleted=0,
            approval_status="PENDING",
            candidate__isnull=False,
        ).first()
        if previous:
            return {"approvalRequired": True, "approvalId": previous.pk, "status": "PENDING"}
        approval = Approval.objects.create(
            space_id=scope.space_id,
            resource_id=str(bot.pk),
            resource_name=bot.bot_name,
            publish_type=channel,
            target_id=target_id,
            target_hash=hashlib.sha256(
                f"{bot.pk}:{channel}:{target_id}:{scope.uid}".encode()
            ).hexdigest(),
            requester_uid=scope.uid,
            app_owner_uid=scope.uid if channel == "API" else None,
            request_reason=reason,
            candidate=candidate,
            publish_snapshot=json.dumps({"schemaVersion": 2, "candidateId": candidate.pk}),
        )
        return {"approvalRequired": True, "approvalId": approval.pk, "status": "PENDING"}
    publication = _activate(candidate, channel, target_id)
    return {
        "approvalRequired": False,
        "publicationId": publication.pk,
        "candidateId": candidate.pk,
        "versionId": candidate.version_id,
        "agentId": bot.pk,
        "status": "PUBLISHED",
    }


@transaction.atomic
def offline(scope, bot_id, channel, target_id=""):
    bot = get_bot(scope, bot_id, WRITE)
    Agent.objects.select_for_update().get(pk=bot.pk)
    assert_direct_publish(scope)
    query = Publication.objects.filter(bot_id=bot.pk, channel=channel.upper(), active=True)
    if target_id:
        query = query.filter(target_id=target_id)
    if not query.exists():
        raise ValidationError("该渠道尚未发布")
    query.update(active=False, update_time=timezone.now())
    if not Publication.objects.filter(bot_id=bot.pk, active=True).exists():
        AgentState.objects.filter(agent_id=bot.pk).update(published_version_id=None)
        if bot.version != 1:
            workflow = workflow_for_bot(scope, bot)
            Workflow.objects.filter(pk=workflow.pk).update(status=0)
    return {"status": "OFFLINE"}


def require_publication(
    bot_id=None,
    flow_id=None,
    channel="MARKET",
    app_id=None,
    *,
    publication_id=None,
    candidate_id=None,
):
    query = Publication.objects.select_related("candidate").filter(active=True)
    if publication_id is not None:
        query = query.filter(pk=publication_id)
    else:
        query = query.filter(channel=channel)
    if bot_id is not None:
        query = query.filter(bot_id=number(bot_id))
    if flow_id is not None:
        query = query.filter(
            candidate__resource_kind="workflow", candidate__resource_id=str(flow_id)
        )
    if app_id is not None:
        query = query.filter(channel="API", target_id=app_id)
    publication = query.order_by("-update_time", "-id").first()
    if publication is None:
        raise Http404("发布不可用")
    candidate = publication.candidate
    if candidate_id is not None:
        candidate = PublicationCandidate.objects.filter(
            pk=candidate_id, bot_id=publication.bot_id
        ).first()
        if candidate is None:
            raise PermissionDenied
        # Only a persisted run grant can authorize a superseded candidate.
        from .models import PublicRunGrant

        if (
            candidate.pk != publication.candidate_id
            and not PublicRunGrant.objects.filter(
                publication=publication, candidate=candidate
            ).exists()
        ):
            raise PermissionDenied
        publication.candidate = candidate
    validate_candidate(candidate)
    return publication


def require_share(key):
    record = ShareRecord.objects.filter(share_key=str(key), share_type=0, is_act=1).first()
    if record is None:
        raise Http404("分享已失效")
    return require_publication(bot_id=record.base_id)


@transaction.atomic
def bind_workflow(scope, workflow_id):
    """04 workflows can acquire their product identity without copying or reassigning data."""
    from astron_console.workflows.management_views import WRITE as WORKFLOW_WRITE

    workflow = get_workflow(scope, workflow_id, WORKFLOW_WRITE)
    workflow = Workflow.objects.select_for_update().get(pk=workflow.pk)
    binding = WorkflowBot.objects.filter(flow_id=workflow.flow_id).order_by("id").first()
    if binding:
        return get_bot(scope, binding.bot_id, WRITE)
    bot = Agent.objects.create(
        uid=workflow.uid,
        space_id=workflow.space_id,
        bot_name=workflow.name[:48],
        bot_desc=(workflow.description or "")[:255],
        avatar=workflow.avatar_icon or "",
        version=3,
        maas_bot_id=str(workflow.flow_id),
    )
    WorkflowBot.objects.create(
        bot_id=bot.pk,
        uid=workflow.uid,
        space_id=workflow.space_id,
        flow_id=workflow.flow_id,
        maas_id=workflow.pk,
        name=workflow.name,
        bot_name=bot.bot_name,
    )
    return bot
