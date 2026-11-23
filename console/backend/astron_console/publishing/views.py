"""Authenticated release management and safe market projections."""

import secrets
from collections import defaultdict
from datetime import timedelta

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import models, transaction
from django.http import Http404
from django.utils import timezone
from django.views.decorators.cache import never_cache

from astron_console.accounts.deployment import public_origin
from astron_console.agents.models import Agent, AgentFavorite, AgentRun, AgentVersion
from astron_console.http import api_endpoint
from astron_console.resources.common import number, serialize, text, upstream_errors
from astron_console.spaces.permissions import resolve_scope, scope_queryset
from astron_console.workflows.models import Workflow, WorkflowRun, WorkflowVersion
from astron_console.workflows.protocol import schema as workflow_schema

from . import services, tenant
from .models import (
    App,
    Approval,
    BotType,
    ConversationStats,
    LegacyMarket,
    Publication,
    ShareRecord,
    WorkflowBot,
)


def paginated(query, payload, serializer):
    current = number(payload.get("page", payload.get("current")), 1)
    size = number(payload.get("size", payload.get("pageSize")), 20, 100)
    total = query.count()
    records = [serializer(row) for row in query[(current - 1) * size : current * size]]
    return {
        "records": records,
        "pageData": records,
        "page": current,
        "current": current,
        "size": size,
        "total": total,
        "totalCount": total,
        "totalPages": (total + size - 1) // size,
        "pages": (total + size - 1) // size,
        "hasNext": current * size < total,
        "hasPrevious": current > 1,
    }


def projection(publication, uid=None):
    candidate = publication.candidate
    config = candidate.definition
    return {
        "botId": candidate.bot_id,
        "id": candidate.bot_id,
        "botName": config.get("botName", ""),
        "agentName": config.get("botName", ""),
        "botDesc": config.get("botDesc", ""),
        "agentDesc": config.get("botDesc", ""),
        "avatar": config.get("avatar", ""),
        "botType": (
            config.get("workflowCategory")
            if candidate.resource_kind == "workflow"
            else config.get("botType", 1)
        ),
        "version": 1 if candidate.resource_kind == "agent" else 3,
        "versionId": candidate.version_id,
        "publicationId": publication.pk,
        "prologue": config.get("prologue", ""),
        "isFavorite": bool(
            uid and AgentFavorite.objects.filter(uid=uid, bot_id=candidate.bot_id).exists()
        ),
    }


def bot_data(bot):
    publications = list(
        Publication.objects.filter(bot_id=bot.pk, active=True).select_related("candidate")
    )
    legacy = LegacyMarket.objects.filter(bot_id=bot.pk, is_delete=0).first()
    from .models import LegacyPublicationIssue

    issues = list(
        LegacyPublicationIssue.objects.filter(bot_id=bot.pk, resolved=False).values(
            "source", "reason"
        )
    )
    workflow = None
    if bot.version != 1:
        binding = WorkflowBot.objects.filter(bot_id=bot.pk).first()
        workflow = Workflow.objects.filter(
            flow_id=binding.flow_id if binding else bot.maas_bot_id, deleted=False
        ).first()
    return {
        "legacyPublicationIssues": issues,
        "botId": bot.pk,
        "botName": workflow.name if workflow else bot.bot_name,
        "botDesc": workflow.description if workflow else bot.bot_desc,
        "resourceKind": "workflow" if bot.version != 1 else "agent",
        "resourceId": workflow.flow_id if workflow else str(bot.pk),
        "workflowId": workflow.pk if workflow else None,
        "avatar": workflow.avatar_icon if workflow else bot.avatar,
        "version": bot.version,
        "botType": bot.bot_type,
        "botStatus": 1 if publications else 0,
        "publishChannels": [row.channel for row in publications],
        "publications": [
            {
                "id": row.pk,
                "channel": row.channel,
                "versionId": row.candidate.version_id,
                "targetId": row.target_id,
                "updatedTime": row.update_time,
                "hasFrozenDependencies": "executionSnapshots" in row.candidate.definition,
            }
            for row in publications
        ],
        "pendingApprovals": list(
            Approval.objects.filter(
                resource_id=str(bot.pk),
                space_id=bot.space_id,
                deleted=0,
                approval_status="PENDING",
            ).values("id", "publish_type", "target_id")
        ),
        "legacyPublicationNeedsReview": bool(legacy and legacy.bot_status and not publications),
    }


@api_endpoint(["GET"])
def bots(request, bot_id=None):
    scope = resolve_scope(request)
    if bot_id is not None:
        return bot_data(services.get_bot(scope, bot_id))
    query = scope_queryset(Agent.objects.filter(is_delete=0), scope)
    search = request.GET.get("search") or request.GET.get("name")
    if search:
        query = query.filter(bot_name__icontains=search)
    if request.GET.get("includeWorkflows") == "true":
        # Read-only union: opening the catalog must not create workflow bindings.
        agents = query.filter(version=1)
        workflows = scope_queryset(Workflow.objects.filter(deleted=False), scope)
        if search:
            workflows = workflows.filter(name__icontains=search)
        kind = request.GET.get("resourceKind")
        if kind == "agent":
            workflows = workflows.none()
        elif kind == "workflow":
            agents = agents.none()
        identities = (
            agents.annotate(resource_kind=models.Value("agent"))
            .values_list("id", "create_time", "resource_kind")
            .union(
                workflows.annotate(resource_kind=models.Value("workflow")).values_list(
                    "id", "create_time", "resource_kind"
                )
            )
            .order_by("-create_time", "-id")
        )

        def resource_data(identity):
            key, _, resource_kind = identity
            if resource_kind == "agent":
                return bot_data(Agent.objects.get(pk=key))
            workflow = workflows.get(pk=key)
            binding = WorkflowBot.objects.filter(flow_id=workflow.flow_id).first()
            bot = Agent.objects.filter(pk=binding.bot_id, is_delete=0).first() if binding else None
            if bot:
                return bot_data(bot)
            return {
                "botId": None,
                "botName": workflow.name,
                "botDesc": workflow.description,
                "resourceKind": "workflow",
                "resourceId": workflow.flow_id,
                "workflowId": workflow.pk,
                "avatar": workflow.avatar_icon or "",
                "publications": [],
                "pendingApprovals": [],
            }

        return paginated(identities, request.GET, resource_data)
    return paginated(query.order_by("-id"), request.GET, bot_data)


@api_endpoint(["POST"])
def publish(request, bot_id):
    scope = resolve_scope(request)
    data = request.payload
    channel = str(data.get("publishType", "")).upper()
    if channel == "BOT_API":
        channel = "API"
    options = data.get("publishData") or {}
    if not isinstance(options, dict):
        raise ValidationError("发布参数无效")
    if channel == "WECHAT":
        raise ValidationError("请先完成微信授权绑定")
    action = data.get("action", "PUBLISH")
    if action == "OFFLINE":
        return services.offline(scope, bot_id, channel, options.get("appId", ""))
    if action != "PUBLISH":
        raise ValidationError("发布操作无效")
    return services.submit(
        scope,
        bot_id,
        channel,
        target_id=options.get("appId", ""),
        version_id=options.get("versionId"),
        reason=options.get("reason", ""),
    )


@api_endpoint(["GET"])
def prepare(request, bot_id):
    bot = services.get_bot(resolve_scope(request), bot_id)
    channel = request.GET.get("type", "MARKET").upper()
    if channel not in {"MARKET", "API", "INTERNAL"}:
        raise ValidationError("该渠道需要独立授权或尚不支持")
    if bot.version == 1:
        versions = AgentVersion.objects.filter(agent_id=bot.pk).order_by("-id")
        serializer = lambda row: {  # noqa: E731
            "id": row.pk,
            "name": f"版本 {row.pk}",
            "createdTime": row.create_time,
        }
    else:
        workflow = services.workflow_for_bot(resolve_scope(request), bot)
        versions = WorkflowVersion.objects.filter(
            flow_id=workflow.flow_id, is_deleted=0, deleted=1
        ).order_by("-id")
        serializer = lambda row: {  # noqa: E731
            "id": row.pk,
            "name": row.name or row.version_num,
            "createdTime": row.created_time,
        }
    return {
        "type": channel,
        "botId": bot.pk,
        "botName": bot.bot_name,
        "requiresApproval": services.requires_approval(resolve_scope(request)),
        "versions": paginated(versions, request.GET, serializer),
        "apps": [
            serialize(row, exclude=("app_key", "app_secret"))
            for row in App.objects.filter(uid=request.user.pk, is_delete=0)
        ]
        if channel == "API"
        else [],
    }


@api_endpoint(["POST"])
@upstream_errors
def create_app(request):
    row = tenant.create_app(
        str(request.user.pk),
        text(request.payload, "appName", required=True, limit=128),
        text(request.payload, "appDescribe", limit=512),
        request.payload.get("requestId"),
    )
    return {"appId": row.app_id, "appName": row.app_name}


@api_endpoint(["GET"])
def apps(request):
    # This dedicated owner-only key management endpoint intentionally exposes keys.
    return [
        serialize(row)
        for row in App.objects.filter(uid=request.user.pk, is_delete=0).order_by("-id")
    ]


@api_endpoint(["POST"])
def create_api(request):
    return services.submit(
        resolve_scope(request),
        request.payload.get("botId"),
        "API",
        target_id=text(request.payload, "appId", required=True),
        version_id=request.payload.get("versionId"),
    )


def example_value(schema, file_type=False):
    if schema.get("enum"):
        return schema["enum"][0]
    kind = schema.get("type")
    if kind == "object":
        return {
            key: example_value(value)
            for key, value in schema.get("properties", {}).items()
            if key in schema.get("required", [])
        }
    if kind == "array":
        return [example_value(schema.get("items") or {}, file_type)]
    if file_type:
        return "https://example.com/file"
    return {"integer": 1, "number": 1.5, "boolean": True, "null": None}.get(kind, "你好")


def api_request_example(candidate):
    if candidate.resource_kind == "agent":
        return {
            "bot_id": candidate.bot_id,
            "user": "your-user-id",
            "stream": True,
            "messages": [{"role": "user", "content": "你好"}],
        }, []
    start = next(
        (
            node
            for node in candidate.definition.get("graph", {}).get("nodes", [])
            if node["id"].startswith("node-start::")
        ),
        {},
    )
    parameters, fields = {}, []
    for output in start.get("data", {}).get("outputs", []):
        name = output["name"]
        schema = output.get("schema") or {}
        required = bool(output.get("required"))
        fields.append(
            {
                "name": name,
                "type": schema.get("type", "string"),
                "required": required,
                "description": output.get("description") or schema.get("description") or "",
            }
        )
        parameters[name] = example_value(workflow_schema(schema), bool(output.get("fileType")))
    return {
        "flow_id": candidate.resource_id,
        "uid": "your-user-id",
        "stream": True,
        "parameters": parameters,
    }, fields


@never_cache
@api_endpoint(["GET"])
def api_info(request):
    bot = services.get_bot(resolve_scope(request), request.GET.get("botId"))
    app_id = text(request.GET, "appId", required="appId" in request.GET, limit=255)
    apps = App.objects.filter(uid=request.user.pk, is_delete=0)
    if app_id:
        apps = apps.filter(app_id=app_id)
    # Retained app rows and Console publications can use different MySQL collations.
    # Compare the publication targets with bound values instead of legacy columns.
    allowed_targets = list(apps.values_list("app_id", flat=True))
    publication = (
        Publication.objects.filter(
            bot_id=bot.pk,
            channel="API",
            active=True,
            candidate__created_by=str(request.user.pk),
            target_id__in=allowed_targets,
        )
        .select_related("candidate")
        .order_by("-id")
        .first()
    )
    if publication is None:
        return None
    app = apps.filter(app_id=publication.target_id).first()
    if app is None:
        return None
    candidate = publication.candidate
    example, inputs = api_request_example(candidate)
    return {
        "botId": bot.pk,
        "botName": candidate.definition.get("botName", bot.bot_name),
        "appName": app.app_name,
        "appId": app.app_id,
        **(
            {"appKey": app.app_key, "appSecret": app.app_secret}
            if request.GET.get("metadataOnly") != "true"
            else {}
        ),
        "serviceUrl": f"{public_origin(request)}/{candidate.resource_kind}/v1/chat/completions",
        "resourceKind": candidate.resource_kind,
        "flowId": candidate.resource_id,
        "versionId": candidate.version_id,
        "requestExample": example,
        "inputs": inputs,
    }


def approval_data(row, scope):
    can_review = scope.space_id is not None and not services.requires_approval(scope)
    result = serialize(
        row, exclude=("publish_snapshot", "execution_result", "candidate", "target_hash")
    )
    result.update(
        {
            "candidateId": row.candidate_id,
            "canReview": can_review
            and row.approval_status == "PENDING"
            and row.candidate_id is not None,
            "canCancel": row.requester_uid == scope.uid and row.approval_status == "PENDING",
            "requiresResubmission": row.candidate_id is None,
        }
    )
    return result


@api_endpoint(["GET"])
def approvals(request, approval_id=None):
    scope = resolve_scope(request, require_space=True)
    query = Approval.objects.filter(space_id=scope.space_id, deleted=0)
    if services.requires_approval(scope):
        query = query.filter(requester_uid=scope.uid)
    if approval_id is not None:
        row = query.filter(pk=approval_id).first()
        if row is None:
            raise Http404
        return approval_data(row, scope)
    for key, field in {
        "approvalStatus": "approval_status",
        "publishType": "publish_type",
        "resourceId": "resource_id",
        "requesterUid": "requester_uid",
    }.items():
        if request.GET.get(key):
            query = query.filter(**{field: request.GET[key]})
    return paginated(query.order_by("-id"), request.GET, lambda row: approval_data(row, scope))


@api_endpoint(["POST"])
def decide(request, approval_id, action):
    scope = resolve_scope(request, require_space=True)
    comment = text(request.payload, "reviewComment", limit=512)
    row = Approval.objects.filter(pk=approval_id, space_id=scope.space_id, deleted=0).first()
    if row is None:
        raise Http404
    if row.approval_status != "PENDING":
        raise ValidationError("该申请已处理")
    if action == "approve":
        services.assert_direct_publish(scope)
        if row.candidate_id is None:
            raise ValidationError("旧审批缺少完整内容快照，请重新提交")
        services.validate_candidate_engine(row.candidate)
    return _decide(request, approval_id, action, row.candidate_id, comment)


@transaction.atomic
def _decide(request, approval_id, action, checked_candidate_id, comment):
    scope = resolve_scope(request, require_space=True)
    row = (
        Approval.objects.select_for_update()
        .filter(pk=approval_id, space_id=scope.space_id, deleted=0)
        .first()
    )
    if row is None:
        raise Http404
    if row.approval_status != "PENDING":
        raise ValidationError("该申请已处理")
    if action == "cancel":
        if row.requester_uid != scope.uid:
            raise PermissionDenied
        status = "CANCELED"
    else:
        services.assert_direct_publish(scope)
        if action not in {"approve", "reject"}:
            raise Http404
        status = "REJECTED"
        if action == "approve":
            if row.candidate_id is None:
                raise ValidationError("旧审批缺少完整内容快照，请重新提交")
            # Lock publication resource after the approval, so two decisions cannot race.
            if row.candidate_id != checked_candidate_id:
                raise ValidationError("审批内容已变化，请重新审核")
            services._activate(row.candidate, row.publish_type, row.target_id)
            status = "APPROVED"
            row.executed_time = timezone.now()
        row.reviewer_uid = scope.uid
        row.reviewed_time = timezone.now()
    row.approval_status = status
    row.review_comment = comment
    row.updated_time = timezone.now()
    row.save()
    return {"approvalRequired": False, "approvalId": row.pk, "status": status}


@api_endpoint(["GET"], authenticated=False)
def market_types(request):
    return [serialize(row) for row in BotType.objects.filter(is_act=1).order_by("order_num", "id")]


@api_endpoint(["GET", "POST"], authenticated=False)
def market(request):
    payload = request.GET if request.method == "GET" else request.payload
    query = Publication.objects.filter(
        channel="MARKET", active=True, bot_id__in=Agent.objects.filter(is_delete=0).values("id")
    ).select_related("candidate")
    search = payload.get("search") or payload.get("botName")
    if search:
        query = query.filter(candidate__definition__botName__icontains=search)
    category = payload.get("type")
    if category == "uncategorized":
        query = query.filter(
            models.Q(candidate__resource_kind="agent", candidate__definition__botType=None)
            | (
                models.Q(candidate__resource_kind="workflow")
                & (
                    models.Q(candidate__definition__workflowCategory=None)
                    | models.Q(candidate__definition__workflowCategory__isnull=True)
                )
            )
        )
    elif category:
        category = number(category)
        agent_category = models.Q(candidate__definition__botType=category)
        if category == 1:
            # Legacy Agent snapshots default to type 1 in the market projection.
            agent_category |= models.Q(candidate__definition__botType__isnull=True)
        query = query.filter(
            (models.Q(candidate__resource_kind="agent") & agent_category)
            | models.Q(
                candidate__resource_kind="workflow",
                candidate__definition__workflowCategory=category,
            )
        )
    if str(payload.get("favorite", "")).lower() in {"true", "1"}:
        if request.user.is_authenticated:
            query = query.filter(
                bot_id__in=AgentFavorite.objects.filter(uid=request.user.pk).values("bot_id")
            )
        else:
            query = query.none()
    return paginated(
        query.order_by("-update_time"),
        payload,
        lambda row: projection(
            row, str(request.user.pk) if request.user.is_authenticated else None
        ),
    )


@api_endpoint(["GET"], authenticated=False)
def market_detail(request, bot_id):
    return projection(
        services.require_publication(bot_id),
        str(request.user.pk) if request.user.is_authenticated else None,
    )


@api_endpoint(["POST"])
def favorite(request, action):
    bot_id = number(request.payload.get("botId"))
    services.require_publication(bot_id)
    if action == "create":
        AgentFavorite.objects.get_or_create(uid=request.user.pk, bot_id=bot_id)
    elif action == "delete":
        AgentFavorite.objects.filter(uid=request.user.pk, bot_id=bot_id).delete()
    else:
        raise Http404
    return {"botId": bot_id, "favorite": action == "create"}


@api_endpoint(["POST"])
def favorite_list(request):
    ids = AgentFavorite.objects.filter(uid=request.user.pk).values_list("bot_id", flat=True)
    return paginated(
        Publication.objects.filter(bot_id__in=ids, channel="MARKET", active=True)
        .select_related("candidate")
        .order_by("-id"),
        request.payload,
        lambda row: projection(row, str(request.user.pk)),
    )


@api_endpoint(["POST"])
@transaction.atomic
def share_key(request):
    bot_id = number(request.payload.get("relateId", request.payload.get("botId")))
    services.get_bot(resolve_scope(request), bot_id)
    services.require_publication(bot_id)
    if request.payload.get("relateType", 0) not in (0, "0"):
        raise ValidationError("不支持此分享类型")
    Agent.objects.select_for_update().get(pk=bot_id)
    row = ShareRecord.objects.filter(
        uid=request.user.pk, base_id=bot_id, share_type=0, is_act=1
    ).first()
    if row is None:
        row = ShareRecord.objects.create(
            uid=request.user.pk, base_id=bot_id, share_key=secrets.token_urlsafe(32)
        )
    return {"shareAgentKey": row.share_key, "shareKey": row.share_key, "botId": bot_id}


@api_endpoint(["POST"])
def add_shared(request):
    key = text(request.payload, "shareAgentKey", required=True)
    publication = services.require_share(key)
    return {**projection(publication, str(request.user.pk)), "shareAgentKey": key}


@api_endpoint(["POST"])
def revoke_share(request):
    key = text(request.payload, "shareAgentKey", required=True)
    row = ShareRecord.objects.filter(uid=request.user.pk, share_key=key, is_act=1).first()
    if row is None:
        raise Http404
    ShareRecord.objects.filter(pk=row.pk).update(is_act=0, update_time=timezone.now())
    return {"revoked": True}


def run_records(bot):
    # Persisted runtime records, never fabricated counters or client-reported completion.
    rows = [
        {
            "id": str(row.pk),
            "uid": row.session.uid,
            "status": row.status,
            "createdTime": row.create_time,
            "versionId": row.version_id,
            "tokens": recorded_tokens(row.events),
        }
        for row in AgentRun.objects.filter(
            session__agent_id=bot.pk, session__kind__in=["chat", "published"]
        )
        .exclude(id__startswith="legacy-")
        .select_related("session")
    ]
    from .models import WorkflowBot

    binding = WorkflowBot.objects.filter(bot_id=bot.pk).first()
    if binding:
        from astron_console.workflows.models import Workflow

        flow = Workflow.objects.filter(flow_id=binding.flow_id).first()
        if flow:
            rows.extend(
                {
                    "id": row.pk,
                    "uid": row.uid,
                    "status": row.status,
                    "createdTime": row.create_time,
                    "versionId": row.version_id,
                    "tokens": recorded_tokens(row.events),
                }
                for row in WorkflowRun.objects.filter(workflow_id=flow.pk)
            )
    from .models import PublicRunGrant

    caller_by_run = dict(
        PublicRunGrant.objects.filter(run_id__in=[row["id"] for row in rows]).values_list(
            "run_id", "caller_uid"
        )
    )
    for row in rows:
        row["uid"] = caller_by_run.get(row["id"], row["uid"])
    return rows


def recorded_tokens(events):
    # Prefer run-wide usage; otherwise count the recorded node terminal usage once.
    total = None
    node_tokens = {}
    for event in events:
        usage = event.get("usage")
        if isinstance(usage, dict) and isinstance(usage.get("total_tokens"), int):
            total = usage["total_tokens"]
        debug = event.get("node_debug") or {}
        value = debug.get("token_cost") or {}
        if isinstance(value, dict) and isinstance(value.get("total_tokens"), int):
            key = debug.get("node_id") or debug.get("id") or len(node_tokens)
            node_tokens[str(key)] = value["total_tokens"]
    return total if total is not None else (sum(node_tokens.values()) if node_tokens else None)


@api_endpoint(["GET"])
def analytics(request, bot_id, kind):
    bot = services.get_bot(resolve_scope(request), bot_id)
    rows = run_records(bot)
    old = list(ConversationStats.objects.filter(bot_id=bot.pk, is_delete=0))
    if kind == "summary":
        return {
            "totalChats": len(rows) + len(old),
            "totalUsers": len({r["uid"] for r in rows} | {r.uid for r in old if r.uid}),
            "totalTokens": sum(r.token_consumed or 0 for r in old)
            + sum(r["tokens"] or 0 for r in rows),
            "usageComplete": all(r["tokens"] is not None for r in rows),
            "completedChats": sum(r["status"] == "completed" for r in rows),
            "failedChats": sum(r["status"] in {"failed", "interrupted"} for r in rows),
        }
    if kind == "timeseries":
        days = number(request.GET.get("days", request.GET.get("overviewDays")), 7, 366)
        start = timezone.now().date() - timedelta(days=days - 1)
        buckets = defaultdict(lambda: {"totalChats": 0, "users": set(), "totalTokens": 0})
        for row in rows:
            day = row["createdTime"].date()
            if day >= start:
                buckets[day]["totalChats"] += 1
                buckets[day]["users"].add(row["uid"])
                buckets[day]["totalTokens"] += row["tokens"] or 0
        for row in old:
            day = row.conversation_date or (row.create_time.date() if row.create_time else None)
            if day and day >= start:
                buckets[day]["totalChats"] += 1
                buckets[day]["users"].add(row.uid)
                buckets[day]["totalTokens"] += row.token_consumed or 0
        return {
            "data": [
                {
                    "date": day.isoformat(),
                    "totalChats": value["totalChats"],
                    "totalUsers": len(value["users"]),
                    "totalTokens": value["totalTokens"],
                }
                for day, value in sorted(buckets.items())
            ]
        }
    if kind == "trace":
        rows.sort(key=lambda r: r["createdTime"], reverse=True)
        current = number(request.GET.get("page"), 1)
        size = number(request.GET.get("size"), 20, 100)
        return {
            "records": [
                {k: v for k, v in row.items() if k not in {"uid", "tokens"}}
                for row in rows[(current - 1) * size : current * size]
            ],
            "total": len(rows),
            "page": current,
            "size": size,
        }
    if kind == "versions":
        from .models import PublicationCandidate

        return paginated(
            PublicationCandidate.objects.filter(bot_id=bot.pk).order_by("-id"),
            request.GET,
            lambda row: {
                "id": row.pk,
                "versionId": row.version_id,
                "name": str(row.version_id),
                "createdTime": row.create_time,
                "resourceKind": row.resource_kind,
            },
        )
    raise Http404


def bot_endpoint(request, bot_id):
    return publish(request, bot_id) if request.method == "POST" else bots(request, bot_id)


@api_endpoint(["POST"])
def workflow_publish(request):
    scope = resolve_scope(request)
    payload = request.payload
    bot = services.bind_workflow(scope, payload.get("flowId") or payload.get("workflowId"))
    return services.submit(
        scope,
        bot.pk,
        payload.get("publishType", "MARKET"),
        target_id=payload.get("appId", ""),
        version_id=payload.get("versionId"),
        reason=payload.get("reason", ""),
    )


@api_endpoint(["POST"])
def workflow_binding(request):
    bot = services.bind_workflow(
        resolve_scope(request), request.payload.get("flowId") or request.payload.get("workflowId")
    )
    return bot_data(bot)


@api_endpoint(["GET"])
def workflow_web(request):
    publication = services.require_publication(bot_id=request.GET.get("botId"))
    config = publication.candidate.definition
    return {
        "botId": publication.bot_id,
        "flowId": publication.candidate.resource_id,
        "advancedConfig": config.get("advancedConfig", {}),
        "config": [node["id"].split("::")[0] for node in config.get("graph", {}).get("nodes", [])],
        "talkAgentConfig": config.get("talkAgentConfig", {}),
    }


@api_endpoint(["GET", "POST"])
def workflow_channel_versions(request):
    payload = request.GET if request.method == "GET" else request.payload
    workflow = services.get_workflow(resolve_scope(request), payload.get("flowId"))
    from .models import WorkflowBot

    binding = WorkflowBot.objects.filter(flow_id=workflow.flow_id).first()
    if not binding:
        return {"records": [], "total": 0}
    return {
        "records": [
            {
                "id": row.candidate.version_id,
                "publishChannel": row.channel,
                "publishResult": "SUCCESS" if row.active else "OFFLINE",
                "version": row.candidate.version_id,
                "publicationId": row.pk,
            }
            for row in Publication.objects.filter(bot_id=binding.bot_id).select_related("candidate")
        ],
        "total": Publication.objects.filter(bot_id=binding.bot_id).count(),
    }


@api_endpoint(["GET"])
def workflow_io(request):
    app_id = request.GET.get("appId")
    if not App.objects.filter(uid=request.user.pk, app_id=app_id, is_delete=0).exists():
        raise PermissionDenied
    records = []
    for publication in Publication.objects.filter(
        channel="API", target_id=app_id, active=True, candidate__resource_kind="workflow"
    ).select_related("candidate"):
        graph = publication.candidate.definition["graph"]
        inputs, outputs = [], []
        for node in graph.get("nodes", []):
            if node["id"].startswith("node-start::"):
                inputs = node["data"].get("outputs", [])
            if node["id"].startswith("node-end::"):
                outputs = node["data"].get("inputs", [])
        records.append(
            {
                "flowId": publication.candidate.resource_id,
                "botId": publication.bot_id,
                "inputs": inputs,
                "outputs": outputs,
            }
        )
    return records
