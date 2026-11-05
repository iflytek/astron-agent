"""Workflow management APIs retaining the existing canvas and business IDs."""

import json
import logging
import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.http import Http404
from django.utils import timezone

from astron_console.http import api_endpoint
from astron_console.resources.common import number, page, parsed, scope_for, serialize, text
from astron_console.resources.models import ConfigInfo
from astron_console.spaces.permissions import require_resource_access, scope_queryset

from .authorization import READ, get_workflow
from .models import Workflow, WorkflowDialog, WorkflowVersion
from .protocol import clean_config, iter_nodes, normalize_graph, starter_graph

logger = logging.getLogger(__name__)
WRITE = "WorkflowController_update_PUT"
CREATE = "WorkflowController_create_POST"
LIST = "WorkflowController_list_GET"


def get_by_id(scope, key, permission=READ):
    row = Workflow.objects.filter(pk=number(key), deleted=False).first()
    if row is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=row.uid, space_id=row.space_id, permission_key=permission
    )
    return row


def public_graph(value):
    graph = normalize_graph(value)
    for node in iter_nodes(graph):
        params = node["data"]["nodeParam"]
        params.pop("url", None)
        params.pop("serverUrl", None)
        params.pop("mcpServerUrl", None)
        if isinstance(params.get("modelConfig"), dict):
            params["modelConfig"].pop("api", None)
        plugin = params.get("plugin")
        if isinstance(plugin, dict):
            urls = plugin.pop("mcpServerUrls", plugin.pop("mcp_server_urls", []))
            if urls:
                plugin["configuredMcpCount"] = len(urls) if isinstance(urls, list) else 1
            for skill in plugin.get("skills", []):
                if isinstance(skill, dict):
                    skill.pop("downloadUrl", None)
                    skill.pop("download_url", None)
                    skill.pop("resources", None)
    return graph


def preserve_bindings(graph, old_value):
    # A public read omits credential-bearing direct endpoints. An ordinary canvas save
    # must not clear those retained bindings; explicit IDs (including []) replace them.
    previous = (
        {node["id"]: node for node in iter_nodes(normalize_graph(old_value))} if old_value else {}
    )
    for node in iter_nodes(graph):
        plugin = node["data"]["nodeParam"].get("plugin")
        if not isinstance(plugin, dict):
            continue
        plugin.pop("configuredMcpCount", None)
        old = previous.get(node["id"], {}).get("data", {}).get("nodeParam", {}).get("plugin", {})
        url_keys = ("mcpServerUrls", "mcp_server_urls")
        id_keys = ("mcpServerIds", "mcp_server_ids")
        changed_ids = any(key in plugin and plugin[key] != old.get(key) for key in id_keys)
        if not any(key in plugin for key in url_keys) and not changed_ids:
            for key in (*url_keys, *id_keys):
                if key in old and key not in plugin:
                    plugin[key] = old[key]
    return graph


def workflow_data(row):
    from astron_console.channels.workflow_media import read_draft

    result = serialize(row, exclude=("published_data", "bak"))
    result["data"] = json.dumps(public_graph(row.data or starter_graph()), ensure_ascii=False)
    result["ext"] = clean_config(parsed(row.ext))
    result["advancedConfig"] = clean_config(parsed(row.advanced_config))
    result["flowConfig"] = json.dumps(read_draft(row), ensure_ascii=False)
    return result


def payload_graph(payload, default=None):
    return normalize_graph(payload.get("data", default if default is not None else starter_graph()))


def update_fields(row, payload, scope):
    for key, field, limit in [
        ("name", "name", 255),
        ("description", "description", 512),
        ("avatarIcon", "avatar_icon", 1000),
        ("avatarColor", "avatar_color", 255),
        ("edgeType", "edge_type", 255),
    ]:
        if key in payload:
            setattr(row, field, text(payload, key, required=key == "name", limit=limit))
    if "category" in payload:
        row.category = number(payload["category"]) if payload["category"] else None
    if "data" in payload:
        row.data = json.dumps(
            preserve_bindings(payload_graph(payload), row.data), ensure_ascii=False
        )
    for key, field in [("advancedConfig", "advanced_config"), ("ext", "ext")]:
        if key in payload:
            value = parsed(payload[key])
            if not isinstance(value, dict):
                raise ValidationError(f"{key}必须为对象")
            setattr(row, field, json.dumps(clean_config(value), ensure_ascii=False))
    if "flowConfig" in payload:
        from astron_console.channels.workflow_media import save_draft

        save_draft(scope, row, payload["flowConfig"])
    row.update_time = timezone.now()


def create_workflow(scope, payload):
    row = Workflow(
        uid=scope.uid,
        space_id=scope.space_id,
        app_id=getattr(settings, "RESOURCE_APP_ID", ""),
        flow_id=str(secrets.randbelow(9 * 10**17) + 10**17),
        name=text(payload, "name", required=True, limit=255),
        data=json.dumps(payload_graph(payload), ensure_ascii=False),
    )
    update_fields(row, payload, scope)
    row.save()
    logger.info("Workflow created workflow_id=%s flow_id=%s uid=%s", row.pk, row.flow_id, scope.uid)
    return row


@api_endpoint(["GET"])
def listing(request):
    scope = scope_for(request, LIST)
    query = scope_queryset(Workflow.objects.filter(deleted=False), scope)
    payload = request.GET.dict()
    payload["page"] = payload.get("current", payload.get("page", 1))
    # The canvas resource picker requests up to 999 entries; keep the shared
    # resource API's pagination limit unchanged.
    size = number(payload.get("pageSize"), 20, 1000)
    current = number(payload["page"])
    if payload.get("search"):
        query = query.filter(name__icontains=text(payload, "search", limit=255))
    if payload.get("flowId"):
        query = query.exclude(flow_id=payload["flowId"])
    if payload.get("status") == "1":
        query = query.filter(
            Q(flow_id__in=WorkflowVersion.objects.filter(deleted=1, is_deleted=0).values("flow_id"))
            | (Q(published_data__isnull=False) & ~Q(published_data=""))
        )
    total = query.count()
    return {
        "page": current,
        "pageSize": size,
        "totalCount": total,
        "totalPages": (total + size - 1) // size,
        "pageData": [
            workflow_data(row)
            for row in query.order_by("-top", "-update_time", "-id")[
                (current - 1) * size : current * size
            ]
        ],
    }


@api_endpoint(["GET", "POST", "PUT", "DELETE"])
@transaction.atomic
def collection(request):
    permission = CREATE if request.method == "POST" else READ if request.method == "GET" else WRITE
    scope = scope_for(request, permission)
    if request.method == "POST":
        return workflow_data(create_workflow(scope, request.payload))
    key = request.GET.get("id") or request.payload.get("id")
    row = get_by_id(scope, key, permission)
    if request.method == "DELETE":
        # Keep all historical graph/version/history/artifact rows. Active execution will
        # fail reauthorization; the running stream's cancellation is handled by lifecycle.
        row.deleted = True
        row.update_time = timezone.now()
        row.save(update_fields=["deleted", "update_time"])
        from .models import WorkflowRun

        WorkflowRun.objects.filter(
            workflow_id=row.pk, status__in=["pending", "running", "paused"]
        ).update(cancel_requested=True)
        return None
    if request.method == "PUT":
        row = Workflow.objects.select_for_update().get(pk=row.pk)
        update_fields(row, request.payload, scope)
        row.save()
    return workflow_data(row)


@api_endpoint(["GET", "POST"])
@transaction.atomic
def clone(request):
    scope = scope_for(request, CREATE)
    row = get_by_id(scope, request.GET.get("id") or request.payload.get("id"))
    payload = workflow_data(row)
    payload = {key: value for key, value in payload.items() if value is not None}
    payload["name"] = row.name[:248] + " 副本"
    payload["data"] = normalize_graph(row.data)
    payload.pop("ext", None)
    from astron_console.channels.workflow_media import record

    if record(row.flow_id) is None:
        payload.pop("flowConfig", None)
    copied = create_workflow(scope, payload)
    copied.type = row.type
    copied.save(update_fields=["type"])
    return workflow_data(copied)


def version_data(row):
    from astron_console.channels.workflow_media import read_version

    result = serialize(row, exclude=("sys_data",))
    result["data"] = json.dumps(public_graph(row.data), ensure_ascii=False)
    result["advancedConfig"] = clean_config(parsed(row.advanced_config))
    result["version"] = row.version_num
    result["flowConfig"] = json.dumps(
        read_version(row.flow_id, row.version_num), ensure_ascii=False
    )
    return result


def get_version(workflow, identifier=None):
    query = WorkflowVersion.objects.filter(flow_id=workflow.flow_id, deleted=1, is_deleted=0)
    if identifier not in (None, ""):
        row = query.filter(version_num=str(identifier)).first()
        if row is None and str(identifier).isdigit():
            row = query.filter(pk=int(identifier)).first()
    else:
        row = query.order_by("-id").first()
    if row is None:
        raise Http404("工作流版本不存在")
    return row


@api_endpoint(["GET", "POST", "DELETE"])
@transaction.atomic
def versions(request):
    scope = scope_for(request, READ if request.method == "GET" else WRITE)
    payload = request.GET if request.method == "GET" else request.payload
    if request.method == "DELETE":
        version = WorkflowVersion.objects.filter(
            pk=number(request.GET.get("id") or payload.get("id"))
        ).first()
        if version is None:
            raise Http404
        get_workflow(scope, version.flow_id, WRITE)
        WorkflowVersion.objects.filter(pk=version.pk).update(deleted=2, is_deleted=1)
        return None
    row = get_workflow(scope, payload.get("flowId"), READ if request.method == "GET" else WRITE)
    if request.method == "GET":
        params = dict(payload.items())
        params["page"] = params.get("current", params.get("page", 1))
        return page(
            WorkflowVersion.objects.filter(flow_id=row.flow_id, deleted=1, is_deleted=0).order_by(
                "-id"
            ),
            params,
            version_data,
        )
    row = Workflow.objects.select_for_update().get(pk=row.pk)
    if "data" in payload or "flowConfig" in payload or "advancedConfig" in payload:
        update_fields(row, payload, scope)
        row.save()
    from .execution_context import freeze_graph

    frozen = freeze_graph(scope, row.data)
    version = WorkflowVersion.objects.create(
        flow_id=row.flow_id,
        version_num="v" + secrets.token_hex(8),
        name=text(payload, "name", limit=100) or "保存版本",
        description=text(payload, "description", limit=100),
        data=json.dumps(frozen, ensure_ascii=False),
        advanced_config=json.dumps(clean_config(parsed(row.advanced_config)), ensure_ascii=False),
    )
    from astron_console.channels.workflow_media import freeze_version

    freeze_version(row, version)
    logger.info("Workflow version created workflow_id=%s version_id=%s", row.pk, version.pk)
    return version_data(version)


@api_endpoint(["POST"])
@transaction.atomic
def restore(request):
    scope = scope_for(request, WRITE)
    payload = request.payload
    if payload.get("id"):
        version = WorkflowVersion.objects.filter(
            pk=number(payload["id"]), deleted=1, is_deleted=0
        ).first()
        if version is None:
            raise Http404
        row = get_workflow(scope, version.flow_id, WRITE)
    else:
        row = get_workflow(scope, payload.get("flowId"), WRITE)
        version = get_version(row, payload.get("versionNum", payload.get("version")))
    row = Workflow.objects.select_for_update().get(pk=row.pk)
    from astron_console.channels.workflow_media import restore_version

    restore_version(scope, row, version)
    row.data = json.dumps(normalize_graph(version.data), ensure_ascii=False)
    if version.advanced_config:
        row.advanced_config = version.advanced_config
    row.update_time = timezone.now()
    row.save(update_fields=["data", "advanced_config", "update_time"])
    return workflow_data(row)


@api_endpoint(["GET"])
def latest(request):
    scope = scope_for(request, READ)
    row = get_workflow(scope, request.GET.get("flowId"))
    version = get_version(row)
    result = workflow_data(row)
    frozen = version_data(version)
    result.update(
        data=frozen["data"],
        flowConfig=frozen["flowConfig"],
        advancedConfig=frozen["advancedConfig"],
        version=version.version_num,
    )
    return result


@api_endpoint(["GET"])
def node_templates(request):
    scope_for(request, READ)
    groups = {}
    for row in ConfigInfo.objects.filter(category="WORKFLOW_NODE_TEMPLATE", is_valid=1).order_by(
        "id"
    ):
        groups.setdefault(row.name, []).append(clean_config(parsed(row.value)))
    return [{"name": name, "nodes": nodes} for name, nodes in groups.items()]


@api_endpoint(["GET"])
def inputs_info(request):
    scope = scope_for(request, READ)
    row = get_workflow(scope, request.GET.get("flowId"))
    version = request.GET.get("version")
    graph = normalize_graph(get_version(row, version).data if version else row.data)
    return next(
        (
            node["data"].get("outputs", [])
            for node in graph["nodes"]
            if node["id"].startswith("node-start::")
        ),
        [],
    )


@api_endpoint(["GET", "POST"])
def dialog(request):
    if request.method == "POST":
        raise ValidationError("运行历史由服务端保存，不接受上传的回答")
    scope = scope_for(request, READ)
    row = get_by_id(scope, request.GET.get("workflowId"))
    kind = number(request.GET.get("type"), 1, 2)
    return [
        serialize(item)
        for item in WorkflowDialog.objects.filter(
            workflow_id=row.pk, uid=scope.uid, type=kind, deleted=False
        ).order_by("id")
    ]


@api_endpoint(["POST"])
def clear_dialog(request):
    scope = scope_for(request, WRITE)
    payload = request.GET if request.method == "GET" else request.payload
    row = get_by_id(scope, payload.get("workflowId"), WRITE)
    WorkflowDialog.objects.filter(
        workflow_id=row.pk, uid=scope.uid, type=number(payload.get("type"), 1, 2)
    ).update(deleted=True)
    from .models import WorkflowRun

    WorkflowRun.objects.filter(workflow_id=row.pk, uid=scope.uid, space_id=scope.space_id).update(
        history_hidden=True
    )
    return None


@api_endpoint(["GET"])
def strategies(request, category):
    scope_for(request, READ)
    return [
        {"name": row.name, "description": row.value, "code": int(row.remarks or "1")}
        for row in ConfigInfo.objects.filter(category=category, is_valid=1)
    ]


@api_endpoint(["POST"])
def build(request):
    from .authorization import EXECUTE
    from .validation import validate_graph

    scope = scope_for(request, EXECUTE)
    payload = request.payload
    row = (
        get_by_id(scope, payload["id"], EXECUTE)
        if payload.get("id")
        else get_workflow(scope, payload.get("flowId"), EXECUTE)
    )
    graph = preserve_bindings(payload_graph(payload, parsed(row.data)), row.data)
    validate_graph(graph, row, scope)
    if "data" in payload:
        require_resource_access(
            scope, owner_uid=row.uid, space_id=row.space_id, permission_key=WRITE
        )
        row.data = json.dumps(graph, ensure_ascii=False)
        row.update_time = timezone.now()
        row.save(update_fields=["data", "update_time"])
    return None
