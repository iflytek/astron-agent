"""Scoped Agent drafts and immutable release definitions, without an execution loop."""

import json
import logging

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.http import api_endpoint
from astron_console.resources.common import number, page, parsed, scope_for, text
from astron_console.spaces.permissions import require_resource_access, scope_queryset

from .models import (
    Agent,
    AgentDataset,
    AgentDatasetMaas,
    AgentFavorite,
    AgentState,
    AgentVersion,
    Personality,
    PromptSection,
)

logger = logging.getLogger(__name__)
READ = "MyBotController_getBotDetail_POST"
LIST = "MyBotController_getCreatedList_POST"
WRITE = "BotCreateController_updateBot_POST"
CREATE = "BotCreateController_createBot_POST"
DELETE = "MyBotController_deleteBot_POST"


def get_scoped_agent(scope, agent_id, permission=READ):
    agent = Agent.objects.filter(pk=number(agent_id), is_delete=0, version=1).first()
    if agent is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=agent.uid, space_id=agent.space_id, permission_key=permission
    )
    return agent


def get_agent(request, agent_id, permission=READ):
    scope = scope_for(request, permission)
    return get_scoped_agent(scope, agent_id, permission), scope


def definition(agent, *, public_scope=None):
    state = AgentState.objects.filter(agent_id=agent.pk).first()
    extra = state.config if state else {}
    personality = (
        Personality.objects.filter(bot_id=agent.pk, config_type=0, deleted=0)
        .order_by("-update_time", "-id")
        .first()
    )
    sections = list(PromptSection.objects.filter(bot_id=agent.pk).order_by("id"))
    # MAAS runtime used dataset_index as Repo.pk. dataset_id belongs to the
    # legacy dataset metadata and must never accidentally select a same-number Repo.
    maas = AgentDatasetMaas.objects.filter(bot_id=agent.pk, is_act=1).order_by("id")
    repo_ids = list(
        dict.fromkeys(
            int(row.dataset_index)
            if str(row.dataset_index).isdigit()
            else (row.dataset_index or f"legacy-maas:{row.pk}")
            for row in maas
        )
    )
    # Personal Spark datasets have no documented core/agent retrieval mapping.
    # An explicit new selection supersedes execution references, not the retained rows.
    legacy_ids = (
        []
        if "repoIds" in extra
        else list(
            AgentDataset.objects.filter(bot_id=agent.pk, is_act=1)
            .order_by("id")
            .values_list("dataset_id", flat=True)
        )
    )
    result = {
        "id": agent.pk,
        "botName": agent.bot_name or "",
        "botDesc": agent.bot_desc or "",
        "avatar": agent.avatar or "",
        "prompt": agent.prompt or "",
        "promptType": agent.prompt_type,
        "promptSections": [{"key": r.prompt_key, "value": r.prompt_value} for r in sections],
        "prologue": agent.prologue or "",
        "inputExample": agent.input_example or "",
        "modelId": agent.model_id,
        "model": agent.model or "",
        "supportContext": bool(agent.support_context),
        "supportUpload": bool(agent.support_upload),
        "personality": {
            "enabled": bool(personality.enabled),
            "personality": personality.personality or "",
            "sceneType": personality.scene_type,
            "sceneInfo": personality.scene_info or "",
        }
        if personality
        else {"enabled": False, "personality": "", "sceneInfo": ""},
        "tools": parsed(agent.tools, []),
        "skills": parsed(agent.skills, []),
        "mcpServerUrls": [] if "mcpServerIds" in extra else parsed(agent.mcp_server_urls, []),
        "mcpServerIds": extra.get("mcpServerIds", []),
        "repoIds": extra.get("repoIds", repo_ids),
        "legacyDatasetIds": legacy_ids,
        "workflows": parsed(agent.workflows, []),
        "maxLoopCount": extra.get("maxLoopCount", 5),
    }
    if public_scope is not None:
        # Never return retained credentials, MCP bearer URLs, or expiring object URLs.
        result["configuredMcpCount"] = len(result["mcpServerUrls"])
        result["mcpServerUrls"] = []
        from .resource_resolution import select, tool_query

        def safe_refs(values, keys, tool=False):
            output = []
            for value in values:
                if tool:
                    try:
                        # Use exactly the same authorized ID/version resolution as execution.
                        row = select(
                            tool_query(public_scope), value, "toolId", "tool_id", remote="tool_id"
                        )
                        output.append(row.pk)
                    except PermissionDenied:
                        # The definition remains readable; execution still rejects unavailable refs.
                        continue
                else:
                    if isinstance(value, dict):
                        value = next((value[k] for k in keys if value.get(k)), None)
                    if (
                        isinstance(value, (str, int))
                        and not isinstance(value, bool)
                        and str(value).isdigit()
                    ):
                        output.append(int(value))
            return list(dict.fromkeys(output))

        result["tools"] = safe_refs(result["tools"], ("id", "toolId", "tool_id"), True)
        result["skills"] = safe_refs(result["skills"], ("id", "fileId", "skillId", "skill_id"))
        result["workflows"] = []
    return result


def agent_data(agent, scope):
    state = AgentState.objects.filter(agent_id=agent.pk).first()
    return {
        **definition(agent, public_scope=scope),
        "uid": agent.uid,
        "spaceId": agent.space_id,
        "favorite": AgentFavorite.objects.filter(uid=scope.uid, bot_id=agent.pk).exists(),
        "publishedVersionId": state.published_version_id if state else None,
        "revision": state.revision if state else 1,
        "createTime": agent.create_time,
        "updateTime": agent.update_time,
    }


def boolean(payload, key, default):
    value = payload.get(key, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    raise ValidationError(f"{key}必须为布尔值")


def refs(payload, key):
    value = payload[key]
    if not isinstance(value, list) or len(value) > 100:
        raise ValidationError(f"{key}必须为资源ID数组")
    return list(dict.fromkeys(number(item) for item in value))


def validate_resources(scope, config):
    from .resource_resolution import resolve_resources

    resolve_resources(scope, config, runtime=False)


def save_definition(agent, scope, payload):
    allowed = {
        "botName",
        "botDesc",
        "avatar",
        "prompt",
        "modelId",
        "model",
        "supportContext",
        "supportUpload",
        "prologue",
        "inputExample",
        "personality",
        "tools",
        "skills",
        "mcpServerIds",
        "repoIds",
        "maxLoopCount",
        "promptType",
        "promptSections",
        "revision",
    }
    if set(payload) - allowed:
        raise ValidationError("包含不支持的Agent配置字段")
    state, _ = AgentState.objects.get_or_create(agent_id=agent.pk)
    if "revision" in payload and payload["revision"] != state.revision:
        raise ValidationError("Agent已被修改，请刷新后重试")
    config = definition(agent)
    for key, field, limit in [
        ("botName", "bot_name", 48),
        ("botDesc", "bot_desc", 255),
        ("prompt", "prompt", 2048),
        ("avatar", "avatar", 1024),
        ("model", "model", 32),
        ("prologue", "prologue", 512),
        ("inputExample", "input_example", 600),
    ]:
        if key in payload:
            value = text(payload, key, required=key == "botName", limit=limit)
            setattr(agent, field, value)
            config[key] = value
    if not agent.bot_name:
        raise ValidationError("请输入Agent名称")
    if "modelId" in payload:
        agent.model_id = number(payload["modelId"]) if payload["modelId"] is not None else None
        config["modelId"] = agent.model_id
    for key, field in [("supportContext", "support_context"), ("supportUpload", "support_upload")]:
        if key in payload:
            value = boolean(payload, key, False)
            setattr(agent, field, int(value))
            config[key] = value
    for key, field in [("tools", "tools"), ("skills", "skills")]:
        if key in payload:
            value = refs(payload, key)
            config[key] = value
            setattr(agent, field, json.dumps(value))
    for key in ("mcpServerIds", "repoIds"):
        if key in payload:
            state.config[key] = config[key] = refs(payload, key)
            if key == "mcpServerIds":
                config["mcpServerUrls"] = []
            if key == "repoIds":
                config["legacyDatasetIds"] = []
    if "maxLoopCount" in payload:
        state.config["maxLoopCount"] = config["maxLoopCount"] = number(
            payload["maxLoopCount"], maximum=50
        )
    if "promptType" in payload:
        if payload["promptType"] not in (0, 1) or isinstance(payload["promptType"], bool):
            raise ValidationError("提示词类型无效")
        agent.prompt_type = config["promptType"] = payload["promptType"]
    if "promptSections" in payload:
        value = payload["promptSections"]
        if not isinstance(value, list) or len(value) > 20:
            raise ValidationError("结构化提示词无效")
        sections = []
        for item in value:
            if not isinstance(item, dict):
                raise ValidationError("结构化提示词无效")
            sections.append(
                {
                    "key": text(item, "key", required=True, limit=255),
                    "value": text(item, "value", limit=4000),
                }
            )
        config["promptSections"] = sections
    if "personality" in payload:
        value = payload["personality"]
        if not isinstance(value, dict):
            raise ValidationError("人格配置无效")
        scene_type = value.get("sceneType")
        if scene_type is not None and (isinstance(scene_type, bool) or scene_type not in (1, 2)):
            raise ValidationError("人格场景类型无效")
        config["personality"] = {
            "enabled": boolean(value, "enabled", False),
            "personality": text(value, "personality", limit=1000),
            "sceneType": scene_type,
            "sceneInfo": text(value, "sceneInfo", limit=1000),
        }
    # Drafts may be saved before model selection, but every selected reference is authorized.
    validate_resources(scope, config)
    agent.update_time = timezone.now()
    agent.save()
    state.revision += 1
    state.save()
    if "promptSections" in payload:
        PromptSection.objects.filter(bot_id=agent.pk).delete()
        PromptSection.objects.bulk_create(
            [
                PromptSection(bot_id=agent.pk, prompt_key=s["key"], prompt_value=s["value"])
                for s in config["promptSections"]
            ]
        )
    if "personality" in payload:
        p = config["personality"]
        row = Personality.objects.filter(bot_id=agent.pk, config_type=0, deleted=0).first()
        row = row or Personality(bot_id=agent.pk)
        row.personality, row.scene_type, row.scene_info = (
            p["personality"],
            p["sceneType"],
            p["sceneInfo"],
        )
        row.enabled, row.update_time = int(p["enabled"]), timezone.now()
        row.save()
    logger.info(
        "Agent definition saved agent_id=%s uid=%s revision=%s", agent.pk, scope.uid, state.revision
    )
    return agent_data(agent, scope)


@api_endpoint(["GET", "POST"])
@transaction.atomic
def collection(request):
    scope = scope_for(request, LIST if request.method == "GET" else CREATE)
    if request.method == "GET":
        query = scope_queryset(Agent.objects.filter(is_delete=0, version=1), scope)
        if request.GET.get("name"):
            query = query.filter(bot_name__icontains=request.GET["name"])
        if request.GET.get("favorite") == "true":
            query = query.filter(
                pk__in=AgentFavorite.objects.filter(uid=scope.uid).values("bot_id")
            )
        return page(
            query.order_by("-update_time", "-id"), request.GET, lambda a: agent_data(a, scope)
        )
    agent = Agent.objects.create(uid=scope.uid, space_id=scope.space_id)
    return save_definition(agent, scope, request.payload)


@api_endpoint(["GET", "PUT", "DELETE"])
@transaction.atomic
def item(request, agent_id):
    permission = {"GET": READ, "PUT": WRITE, "DELETE": DELETE}[request.method]
    agent, scope = get_agent(request, agent_id, permission)
    agent = Agent.objects.select_for_update().get(pk=agent.pk)
    if request.method == "GET":
        return agent_data(agent, scope)
    if request.method == "DELETE":
        from .conversation_models import AgentRun

        AgentRun.objects.filter(session__agent_id=agent.pk, status="running").update(
            cancel_requested=True
        )
        agent.is_delete = 1
        agent.update_time = timezone.now()
        agent.save(update_fields=["is_delete", "update_time"])
        logger.info("Agent soft deleted agent_id=%s uid=%s", agent.pk, scope.uid)
        return {"deleted": True}
    return save_definition(agent, scope, request.payload)


@api_endpoint(["POST"])
@transaction.atomic
def favorite(request, agent_id):
    agent, scope = get_agent(request, agent_id)
    Agent.objects.select_for_update().get(pk=agent.pk)
    enabled = boolean(request.payload, "favorite", True)
    query = AgentFavorite.objects.filter(uid=scope.uid, bot_id=agent.pk)
    if enabled and not query.exists():
        AgentFavorite.objects.create(uid=scope.uid, bot_id=agent.pk)
    elif not enabled:
        query.delete()
    return {"favorite": enabled}


def version_data(row):
    return {
        "id": row.pk,
        "agentId": row.agent_id,
        "schemaVersion": row.schema_version,
        "definition": row.definition,
        "createdBy": row.created_by,
        "createTime": row.create_time,
    }


def snapshot_definition(agent, scope):
    from .resource_resolution import snapshot_references

    return snapshot_references(scope, definition(agent))


@api_endpoint(["GET", "POST"])
@transaction.atomic
def versions(request, agent_id):
    agent, scope = get_agent(request, agent_id, WRITE if request.method == "POST" else READ)
    agent = Agent.objects.select_for_update().get(pk=agent.pk)
    if request.method == "GET":
        return [
            version_data(row)
            for row in AgentVersion.objects.filter(agent_id=agent.pk).order_by("-id")
        ]
    config = snapshot_definition(agent, scope)
    validate_resources(scope, config)
    row = AgentVersion.objects.create(agent_id=agent.pk, definition=config, created_by=scope.uid)
    logger.info(
        "Agent snapshot created agent_id=%s version_id=%s uid=%s", agent.pk, row.pk, scope.uid
    )
    return version_data(row)


@api_endpoint(["PUT"])
@transaction.atomic
def published(request, agent_id):
    agent, scope = get_agent(request, agent_id, WRITE)
    Agent.objects.select_for_update().get(pk=agent.pk)
    version_id = number(request.payload.get("versionId"))
    row = AgentVersion.objects.filter(pk=version_id, agent_id=agent.pk).first()
    if row is None:
        raise Http404
    validate_resources(scope, row.definition)
    state, _ = AgentState.objects.get_or_create(agent_id=agent.pk)
    state.published_version_id = row.pk
    state.save(update_fields=["published_version_id"])
    logger.info(
        "Agent published pointer changed agent_id=%s version_id=%s uid=%s",
        agent.pk,
        row.pk,
        scope.uid,
    )
    return {"agentId": agent.pk, "versionId": row.pk}


def resolve_version(scope, agent_id, version_id=None):
    agent = get_scoped_agent(scope, agent_id)
    if version_id is None:
        state = AgentState.objects.filter(agent_id=agent.pk).first()
        version_id = state.published_version_id if state else None
    if version_id is None:
        raise ValidationError("Agent尚无已发布版本")
    row = AgentVersion.objects.filter(pk=number(version_id), agent_id=agent.pk).first()
    if row is None:
        raise Http404
    validate_resources(scope, row.definition)
    return {"agentId": agent.pk, "versionId": row.pk, "definition": row.definition}
