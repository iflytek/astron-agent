"""One authorized resource resolver for independent runs and published Agent contracts."""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db.models import Q

from astron_console.http import api_endpoint
from astron_console.knowledge import storage
from astron_console.knowledge.models import Document, Repo, SkillFile
from astron_console.resources.clients import normalize_provider
from astron_console.resources.common import http_url, parsed
from astron_console.resources.models import McpConfig, Model, SandboxConfig, Tool
from astron_console.spaces.models import GroupVisibility
from astron_console.spaces.permissions import require_space_permission, scope_queryset


def scoped(query, scope, permission, owner="uid"):
    if scope.space_id is not None:
        require_space_permission(scope.uid, scope.space_id, permission)
    return scope_queryset(query, scope, uid_field=owner)


def refs(value):
    value = parsed(value, [])
    if not isinstance(value, list) or len(value) > 100:
        raise ValidationError("资源引用必须为不超过100项的列表")
    return value


def reference(value, *keys):
    if isinstance(value, dict):
        for key in (*keys, "id"):
            if value.get(key) not in (None, ""):
                return str(value[key])
        raise ValidationError("资源引用缺少标识")
    if isinstance(value, (str, int)) and not isinstance(value, bool):
        return str(value)
    raise ValidationError("资源引用格式无效")


def select(query, value, *keys, remote=None):
    key = reference(value, *keys)
    condition = Q(pk=int(key)) if key.isdigit() else Q(pk__isnull=True)
    if remote:
        condition |= Q(**{remote: key})
    row = query.filter(condition).order_by("-id").first()
    if row is None:
        # Missing and unauthorized references share the same public failure.
        raise PermissionDenied("资源不存在或未授权")
    return row


def tool_query(scope):
    permission = "ToolBoxController_getDetail_GET"
    owned = scoped(Tool.objects.filter(deleted=0), scope, permission, "user_id")
    shared = GroupVisibility.objects.filter(
        type=2, user_id=scope.uid, space_id=scope.space_id
    ).values("relation_id")
    return Tool.objects.filter(deleted=0).filter(
        Q(pk__in=owned.values("id")) | Q(is_public=True, status=1) | Q(pk__in=shared)
    )


def repo_query(scope):
    owned = scoped(
        Repo.objects.filter(deleted=False), scope, "RepoController_getDetail_GET", "user_id"
    )
    shared = GroupVisibility.objects.filter(
        type=1, user_id=scope.uid, space_id=scope.space_id
    ).values("relation_id")
    return Repo.objects.filter(deleted=False).filter(
        Q(pk__in=owned.values("id")) | Q(pk__in=shared)
    )


def skill_payload(row, scope):
    query = scope_queryset(SkillFile.objects.filter(deleted=False), scope)
    if row.name != "SKILL.md" or row.entry_type != "file" or not row.object_key:
        raise ValidationError("Skill必须引用有效的SKILL.md")
    entries = list(query)
    children = {}
    for item in entries:
        children.setdefault(item.parent_id, []).append(item)
    resources = []

    def visit(parent, prefix, seen):
        if parent in seen:
            raise ValidationError("Skill目录关系无效")
        for item in children.get(parent, []):
            if item.pk == row.pk:
                continue
            if not item.name or "/" in item.name or item.name in (".", ".."):
                raise ValidationError("Skill文件名无效")
            path = prefix + item.name
            if item.entry_type == "folder":
                visit(item.pk, path + "/", seen | {parent})
            elif item.object_key:
                resources.append(
                    {
                        "path": path,
                        "name": item.name,
                        "download_url": storage.download(item.object_key),
                        "file_ext": item.file_ext or "",
                        "file_size": item.file_size or 0,
                    }
                )

    # A root SKILL.md does not gain access to unrelated root skills/files.
    if row.parent_id:
        visit(row.parent_id, "", set())
    sandbox = scope_queryset(
        SandboxConfig.objects.filter(deleted=False, enabled=True), scope
    ).first()
    return {
        "skill_id": str(row.pk),
        "name": row.skill_name or row.name,
        "description": (row.skill_description or "")[:1024],
        "download_url": storage.download(row.object_key),
        "resources": resources,
        "sandbox": {"enabled": bool(sandbox), "space_id": str(scope.space_id or "")},
    }


def resolve_resources(scope, definition, *, runtime=True):
    if runtime and definition.get("legacyDatasetIds"):
        raise ValidationError("旧个人Spark数据集尚未接入统一执行，原配置已保留；请重新选择知识库")
    model_id = definition.get("modelId")
    model = None
    if model_id not in (None, "", 0):
        query = scoped(Model.objects.filter(is_deleted=False), scope, "ModelController_list_POST")
        model = select(query, model_id)
        if runtime and (not model.enable or not model.api_key or not model.url):
            raise ValidationError("模型未启用或配置不完整")
    elif runtime:
        # Do not silently switch a retained Agent to a different model.
        raise ValidationError("请为Agent选择已授权的模型")
    plugin = {
        "tools": [],
        "mcp_server_urls": [],
        "mcp_server_ids": [],
        "knowledge": [],
        "skills": [],
        "workflow_ids": [],
    }
    tools = refs(definition.get("tools"))
    if tools:
        query = tool_query(scope)
        for value in tools:
            row = select(query, value, "toolId", "tool_id", remote="tool_id")
            if runtime:
                if not row.tool_id or not row.version:
                    raise ValidationError("工具缺少已同步版本")
                plugin["tools"].append({"tool_id": row.tool_id, "version": row.version})
    mcp = refs(definition.get("mcpServerIds"))
    if mcp:
        query = scoped(
            McpConfig.objects.filter(is_deleted=False), scope, "ToolBoxController_getDetail_GET"
        )
        for value in mcp:
            row = select(query, value, "mcpId", "mcp_id", remote="mcp_id")
            if runtime:
                if not row.sort_link:
                    raise ValidationError("MCP尚未配置服务地址")
                plugin["mcp_server_urls"].append(http_url(row.sort_link))
    # Retained direct MCP endpoints are resolved only from an authorized definition.
    for value in refs(definition.get("mcpServerUrls")):
        if not isinstance(value, str):
            raise ValidationError("MCP地址无效")
        url = http_url(value)
        if runtime:
            plugin["mcp_server_urls"].append(url)
    skills = refs(definition.get("skills"))
    if skills:
        query = scope_queryset(SkillFile.objects.filter(deleted=False), scope)
        for value in skills:
            row = select(query, value, "fileId", "skillId", "skill_id")
            if row.name != "SKILL.md" or row.entry_type != "file":
                raise ValidationError("Skill必须引用SKILL.md")
            if runtime:
                plugin["skills"].append(skill_payload(row, scope))
    repos = refs(definition.get("repoIds"))
    if repos:
        query = repo_query(scope)
        for value in repos:
            row = select(query, value, "repoId")
            if runtime:
                docs = Document.objects.filter(repo_id=row.pk, enabled=1)
                ids = [value for value in docs.values_list("uuid", flat=True) if value]
                if not row.core_repo_id or not ids:
                    raise ValidationError("知识库没有可检索的已启用文档")
                plugin["knowledge"].append(
                    {
                        "name": row.name or str(row.pk),
                        "description": (row.description or "")[:1024],
                        "repo_type": {"AIUI-RAG2": 1, "CBG-RAG": 2, "Ragflow-RAG": 3}.get(
                            row.tag, 1
                        ),
                        "top_k": 3,
                        "match": {
                            "repo_ids": [row.core_repo_id],
                            "doc_ids": ids,
                            "dataset_ids": [row.ragflow_dataset_id]
                            if row.ragflow_dataset_id
                            else [],
                        },
                    }
                )
    workflows = refs(definition.get("workflows"))
    if workflows:
        from astron_console.workflows.authorization import EXECUTE, get_workflow
        from astron_console.workflows.execution_context import workflow_reference

        for value in workflows:
            workflow = get_workflow(scope, workflow_reference(value), EXECUTE)
            if runtime:
                plugin["workflow_ids"].append(str(workflow.flow_id))
    if not runtime:
        return {}
    return {
        "model_config": {
            "provider": normalize_provider(model.provider),
            "domain": model.domain,
            "api": model.url,
            "api_key": model.api_key,
        },
        "plugin": plugin,
    }


@api_endpoint(["GET"])
def resources(request, agent_id):
    from .definitions import get_agent

    _, scope = get_agent(request, agent_id)

    def options(query, name="name"):
        return [
            {"id": row.pk, "name": getattr(row, name) or str(row.pk)}
            for row in query.order_by("id")
        ]

    result = {}
    # Lack of one resource permission must not hide otherwise permitted resource types.
    for key, factory, name in [
        (
            "models",
            lambda: scoped(
                Model.objects.filter(is_deleted=False, enable=True),
                scope,
                "ModelController_list_POST",
            ),
            "name",
        ),
        ("tools", lambda: tool_query(scope), "name"),
        (
            "mcp",
            lambda: scoped(
                McpConfig.objects.filter(is_deleted=False), scope, "ToolBoxController_getDetail_GET"
            ),
            "name",
        ),
        (
            "skills",
            lambda: scope_queryset(SkillFile.objects.filter(deleted=False, name="SKILL.md"), scope),
            "skill_name",
        ),
        ("repos", lambda: repo_query(scope), "name"),
    ]:
        try:
            result[key] = options(factory(), name)
        except PermissionDenied:
            result[key] = []
    from astron_console.workflows.authorization import EXECUTE
    from astron_console.workflows.models import Workflow

    try:
        result["workflows"] = options(
            scoped(Workflow.objects.filter(deleted=False), scope, EXECUTE)
        )
    except PermissionDenied:
        result["workflows"] = []
    return result


def snapshot_references(scope, definition):
    """Freeze only authorized references; expiring URLs and runtime credentials stay out."""
    result = dict(definition)
    if result.get("legacyDatasetIds"):
        raise ValidationError("旧个人Spark数据集尚未接入统一执行，原配置已保留；请重新选择知识库")
    resolve_resources(scope, result, runtime=False)
    result["tools"] = [
        select(tool_query(scope), x, "toolId", "tool_id", remote="tool_id").pk
        for x in refs(result.get("tools"))
    ]
    skill_query = scope_queryset(SkillFile.objects.filter(deleted=False), scope)
    result["skills"] = [
        select(skill_query, x, "fileId", "skillId", "skill_id").pk
        for x in refs(result.get("skills"))
    ]
    result["repoIds"] = [
        select(repo_query(scope), x, "repoId").pk for x in refs(result.get("repoIds"))
    ]
    query = scope_queryset(McpConfig.objects.filter(is_deleted=False), scope)
    identifiers = [
        select(query, x, "mcpId", "mcp_id", remote="mcp_id").pk
        for x in refs(result.get("mcpServerIds"))
    ]
    for url in refs(result.get("mcpServerUrls")):
        row = query.filter(sort_link=url).first()
        if row is None:
            # Adopt the retained direct endpoint as a scoped resource, without changing
            # the original Agent's configuration or publishing any credentials.
            row = McpConfig.objects.create(
                uid=scope.uid,
                space_id=scope.space_id,
                name="Agent MCP",
                sort_link=http_url(url),
                customize=True,
            )
        identifiers.append(row.pk)
    result["mcpServerIds"] = list(dict.fromkeys(identifiers))
    result["mcpServerUrls"] = []
    # Keep only authorized workflow identities; runtime resolves the fixed dependency graph.
    result["workflows"] = [reference(x, "flowId", "flow_id") for x in refs(result.get("workflows"))]
    return result
