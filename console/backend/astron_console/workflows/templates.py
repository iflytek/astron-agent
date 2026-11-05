"""Portable workflow DSL and scoped templates; import never grants resource access."""

import json

import yaml
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404, HttpResponse

from astron_console.agents.definitions import get_scoped_agent
from astron_console.http import api_endpoint
from astron_console.resources.common import number, parsed, scope_for, serialize
from astron_console.spaces.permissions import require_resource_access, scope_queryset

from .authorization import READ
from .management_views import CREATE, WRITE, create_workflow, get_by_id, workflow_data
from .models import TemplateGroup, WorkflowTemplate
from .protocol import authorized_params, clean_config, iter_nodes, normalize_graph


class PortableLoader(yaml.SafeLoader):
    """No YAML aliases: portable graph values must form a finite JSON tree."""

    def compose_node(self, parent, index):
        if self.check_event(yaml.AliasEvent):
            raise ValidationError("工作流YAML不支持别名")
        return super().compose_node(parent, index)


def parse_yaml(content):
    if len(content) > 5 * 1024 * 1024:
        raise ValidationError("工作流导入文件超过5MB")
    try:
        value = yaml.load(content, Loader=PortableLoader)
        # JSON serialization also excludes YAML dates, non-string map keys and recursive objects.
        value = json.loads(json.dumps(value, allow_nan=False))
    except (yaml.YAMLError, ValueError, TypeError, RecursionError) as exc:
        raise ValidationError("工作流文件不是有效的YAML/JSON") from exc
    if not isinstance(value, dict) or not isinstance(value.get("flowMeta"), dict):
        raise ValidationError("工作流文件缺少flowMeta")
    if value["flowMeta"].get("dslVersion", "v1") != "v1":
        raise ValidationError("不支持此工作流DSL版本")
    value["flowData"] = normalize_graph(value.get("flowData"))
    return value


def export_value(row):
    graph = normalize_graph(row.data)
    manifest = []
    for node in iter_nodes(graph):
        params = node["data"]["nodeParam"]
        model = params.get("modelConfig")
        if isinstance(model, dict):
            model.pop("api", None)
            model.pop("url", None)
        params.pop("url", None)
        params.pop("serverUrl", None)
        params.pop("mcpServerUrl", None)
        plugin = params.get("plugin")
        if isinstance(plugin, dict):
            if plugin.get("mcpServerUrls") or plugin.get("mcp_server_urls"):
                manifest.append(
                    {
                        "type": "mcp",
                        "nodeId": node["id"],
                        "status": "unresolved",
                        "message": "旧直连MCP需要重新绑定授权资源",
                    }
                )
                params["unresolvedMcpBinding"] = True
            plugin.pop("mcpServerUrls", None)
            plugin.pop("mcp_server_urls", None)
            for skill in plugin.get("skills", []):
                if isinstance(skill, dict):
                    skill.pop("download_url", None)
                    skill.pop("downloadUrl", None)
                    skill.pop("resources", None)
        for key, kind in [
            ("agentId", "agent"),
            ("modelId", "model"),
            ("pluginId", "tool"),
            ("flowId", "workflow"),
            ("dbId", "database"),
        ]:
            if params.get(key):
                manifest.append({"type": kind, "nodeId": node["id"], "sourceId": str(params[key])})
    return {
        "flowMeta": {
            "dslVersion": "v1",
            "name": row.name,
            "description": row.description,
            "avatarIcon": row.avatar_icon,
            "avatarColor": row.avatar_color,
            "edgeType": row.edge_type,
            "category": row.category,
            "advancedConfig": clean_config(parsed(row.advanced_config)),
        },
        "dependencyManifest": manifest,
        "flowData": graph,
    }


def export_yaml(row):
    return yaml.safe_dump(export_value(row), allow_unicode=True, sort_keys=False)


def import_value(scope, value):
    meta = value["flowMeta"]
    payload = {
        key: meta[key]
        for key in [
            "name",
            "description",
            "avatarIcon",
            "avatarColor",
            "edgeType",
            "category",
            "advancedConfig",
        ]
        if meta.get(key) is not None
    }
    payload["name"] = payload.get("name") or "导入工作流"
    payload["data"] = value["flowData"]
    row = create_workflow(scope, payload)
    issues = []
    for node in iter_nodes(payload["data"]):
        try:
            params = node["data"]["nodeParam"]
            if node["id"].startswith("agent::"):
                if params.get("agentId"):
                    get_scoped_agent(scope, params["agentId"])
                else:
                    from astron_console.agents.resource_resolution import resolve_resources

                    from .execution_context import inline_definition

                    resolve_resources(scope, inline_definition(node), runtime=False)
            authorized_params(node, row, scope)
        except (ValidationError, PermissionDenied, Http404):
            issues.append(
                {
                    "nodeId": node["id"],
                    "status": "missing",
                    "type": node["id"].split("::")[0],
                    "message": "依赖不存在或未授权，请重新选择资源",
                }
            )
    result = workflow_data(row)
    result["report"] = {"entries": issues, "hasUnresolvedDependencies": bool(issues)}
    return result


@api_endpoint(["GET"])
def export(request, workflow_id):
    scope = scope_for(request, READ)
    row = get_by_id(scope, workflow_id)
    result = HttpResponse(export_yaml(row), content_type="application/yaml; charset=utf-8")
    result["Content-Disposition"] = f'attachment; filename="workflow-{row.pk}.yaml"'
    return result


@api_endpoint(["POST"])
def import_workflow(request):
    scope = scope_for(request, CREATE)
    file = request.FILES.get("file")
    if file is None:
        raise ValidationError("请选择工作流YAML文件")
    return import_value(scope, parse_yaml(file.read(5 * 1024 * 1024 + 1)))


def template_data(row, scope):
    return {
        "id": row.pk,
        "templateId": row.pk,
        "title": row.title,
        "subtitle": row.subtitle,
        "coverUrl": row.cover_url,
        "groupId": row.group_id,
        "templateSource": "exported",
        "deletable": row.creator_uid == scope.uid,
        "createTime": row.create_time,
        "updateTime": row.update_time,
    }


def get_template(scope, key):
    row = WorkflowTemplate.objects.filter(pk=number(key), is_delete=0).first()
    if row is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=row.creator_uid, space_id=row.space_id, permission_key=READ
    )
    return row


@api_endpoint(["GET"])
def groups(request):
    scope_for(request, READ)
    return [
        serialize(row) for row in TemplateGroup.objects.filter(is_delete=0).order_by("sort_index")
    ]


@api_endpoint(["POST", "GET"])
def listing(request):
    scope = scope_for(request, READ)
    payload = request.payload if request.method == "POST" else request.GET
    query = scope_queryset(
        WorkflowTemplate.objects.filter(is_delete=0), scope, uid_field="creator_uid"
    )
    if payload.get("groupId"):
        query = query.filter(group_id=number(payload["groupId"]))
    return [template_data(row, scope) for row in query.order_by("-id")[:200]]


@api_endpoint(["POST"])
def create_from_template(request):
    scope = scope_for(request, CREATE)
    row = get_template(scope, request.payload.get("templateId"))
    return import_value(scope, parse_yaml(row.snapshot_yaml))


@api_endpoint(["POST"])
def export_template(request):
    scope = scope_for(request, CREATE)
    row = get_by_id(scope, request.payload.get("workflowId"))
    template = WorkflowTemplate.objects.create(
        title=row.name[:128],
        subtitle=row.description,
        cover_url=row.avatar_icon,
        group_id=row.category,
        source_workflow_id=row.pk,
        snapshot_yaml=export_yaml(row),
        creator_uid=scope.uid,
        space_id=scope.space_id,
    )
    return template_data(template, scope)


@api_endpoint(["DELETE"])
def delete_template(request, template_id):
    scope = scope_for(request, WRITE)
    row = get_template(scope, template_id)
    if row.creator_uid != scope.uid:
        raise PermissionDenied
    row.is_delete = 1
    row.save(update_fields=["is_delete"])
    return None
