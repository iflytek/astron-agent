"""Translate the retained canvas contract; graph execution stays in core/workflow."""

import copy

from django.core.exceptions import PermissionDenied, ValidationError

from astron_console.agents.resource_resolution import repo_query, scoped, select, tool_query
from astron_console.knowledge.models import Database, Document
from astron_console.resources.clients import normalize_provider
from astron_console.resources.common import parsed
from astron_console.resources.models import McpConfig, Model, RpaAssistant, RpaField

# Only runtime configuration keys are removed. User variable names and input values stay intact.
CREDENTIAL_KEYS = {
    "apiKey",
    "api_key",
    "apiSecret",
    "api_secret",
    "authInfo",
    "authorization",
    "accessToken",
    "refreshToken",
    "artifactUploadToken",
    "artifact_upload_token",
    "console_context",
    "consoleContext",
    "execution_context",
    "executionContext",
    "runtime_context",
    "runtimeContext",
    "runtimeCredentials",
    "runtime_credentials",
}


def clean_config(value):
    if isinstance(value, dict):
        return {k: clean_config(v) for k, v in value.items() if k not in CREDENTIAL_KEYS}
    if isinstance(value, list):
        return [clean_config(v) for v in value]
    return value


def normalize_graph(value):
    graph = parsed(value)
    if not isinstance(graph, dict):
        raise ValidationError("工作流图必须为对象")
    if not isinstance(graph.get("nodes"), list) or not isinstance(graph.get("edges"), list):
        raise ValidationError("工作流图缺少nodes/edges")
    if len(graph["nodes"]) > 1000 or len(graph["edges"]) > 5000:
        raise ValidationError("工作流图超过大小限制")
    graph = copy.deepcopy(graph)
    seen = set()
    for node in iter_nodes(graph):
        identifier = node.get("id")
        if not isinstance(identifier, str) or "::" not in identifier or identifier in seen:
            raise ValidationError("节点标识缺失、重复或无效")
        seen.add(identifier)
        data = node.get("data")
        if not isinstance(data, dict) or not isinstance(data.get("nodeParam", {}), dict):
            raise ValidationError("节点配置无效")
        data["nodeParam"] = clean_config(data.get("nodeParam", {}))
    for edge in graph["edges"]:
        if not isinstance(edge, dict):
            raise ValidationError("工作流连线无效")
        if (
            edge.get("source", edge.get("sourceNodeId")) not in seen
            or edge.get("target", edge.get("targetNodeId")) not in seen
        ):
            raise ValidationError("连线引用的节点不存在")
    return graph


def iter_nodes(graph):
    """All canvas nodes, including explicitly nested container graphs."""
    for node in graph.get("nodes", []):
        if not isinstance(node, dict):
            raise ValidationError("节点必须为对象")
        yield node
        for key in ("children", "nodes"):
            children = node.get(key)
            if isinstance(children, list):
                yield from iter_nodes({"nodes": children})


def schema(value):
    source = copy.deepcopy(value or {})
    kind = source.get("type", "string")
    result = {
        k: v
        for k, v in source.items()
        if k in {"type", "value", "default", "description", "enum", "items", "required"}
    }
    properties = source.get("properties", [])
    if isinstance(properties, list):
        props = {p["name"]: schema(p) for p in properties if isinstance(p, dict) and p.get("name")}
        required = [p["name"] for p in properties if p.get("name") and p.get("required")]
    elif isinstance(properties, dict):
        props = {key: schema(val) for key, val in properties.items()}
        required = source.get("required", [])
    else:
        raise ValidationError("节点属性schema无效")
    if kind.startswith("array-"):
        subtype = kind.removeprefix("array-")
        result.update(type="array", items={"type": subtype})
        if subtype == "object":
            result["items"].update(properties=props, required=required)
    else:
        result["type"] = "string" if kind == "time" else kind
        if props:
            result["properties"] = props
            result["required"] = required
    return result


def io_items(items, *, inputs=False):
    if not isinstance(items, list):
        raise ValidationError("节点输入输出必须为列表")
    result = []
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            raise ValidationError("节点输入输出缺少名称")
        converted = schema(item.get("schema"))
        if inputs and "value" not in converted:
            continue
        result.append(
            {
                "id": item.get("id", ""),
                "name": item["name"],
                "schema": converted,
                "required": bool(item.get("required", False)),
                **(
                    {
                        "fileType": item["fileType"],
                        "allowedFileType": item.get("allowedFileType", []),
                    }
                    if item.get("fileType")
                    else {}
                ),
            }
        )
    return result


def authorized_params(node, workflow, scope):
    """Authorize persistent references and provide only nonsecret runtime routing metadata."""
    params = clean_config(copy.deepcopy(node["data"].get("nodeParam", {})))
    kind = node["id"].split("::")[0]
    if params.get("unresolvedMcpBinding"):
        plugin = params.get("plugin") or {}
        if not plugin.get("mcpServerIds") and not plugin.get("mcp_server_ids"):
            raise ValidationError("导入的MCP依赖需要重新绑定")
    params.pop("configs", None)
    params["uid"] = scope.uid
    params["appId"] = workflow.app_id
    params["executionUid"] = scope.uid
    params["executionSpaceId"] = scope.space_id
    if (
        kind in {"spark-llm", "decision-making", "extractor-parameter", "knowledge-pro-base"}
        or (kind == "question-answer" and params.get("directAnswer", {}).get("handleResponse"))
        or (kind != "agent" and params.get("modelId"))
    ):
        model = select(
            scoped(
                Model.objects.filter(is_deleted=False, enable=True),
                scope,
                "ModelController_list_POST",
            ),
            params.get("modelId"),
        )
        if not model.url or not model.api_key:
            raise ValidationError("节点模型未配置")
        params.update(
            modelId=model.pk,
            domain=model.domain,
            url=model.url,
            source=normalize_provider(model.provider),
        )
    if kind == "plugin":
        tool = select(tool_query(scope), params.get("pluginId"), remote="tool_id")
        if params.get("version") and str(params["version"]) != str(tool.version):
            tool = tool_query(scope).filter(tool_id=tool.tool_id, version=params["version"]).first()
        if tool is None or not tool.tool_id or not tool.version:
            raise PermissionDenied("工具版本不存在或未授权")
        if params.get("operationId") != tool.operation_id:
            raise PermissionDenied("工具操作不存在或未授权")
        params.update(pluginId=tool.tool_id, version=tool.version, appId=tool.app_id)
    if kind in {"knowledge-base", "knowledge-expert-base", "knowledge-pro-base"}:
        key = "repoIds" if "repoIds" in params else "repoId"
        refs = params.get(key, [])
        if not isinstance(refs, list) or not refs:
            raise ValidationError("知识节点缺少知识库")
        repos = [select(repo_query(scope), value, remote="core_repo_id") for value in refs]
        authorized_repos = []
        for repo in repos:
            ids = list(
                Document.objects.filter(repo_id=repo.pk, enabled=1)
                .exclude(uuid__isnull=True)
                .exclude(uuid="")
                .values_list("uuid", flat=True)
            )
            if not repo.core_repo_id or not ids:
                raise ValidationError("知识库没有可检索的已启用文档")
            authorized_repos.append(
                {
                    "name": repo.name or str(repo.pk),
                    "description": repo.description or "",
                    "repoId": repo.core_repo_id,
                    "docIds": ids,
                    "datasetId": repo.ragflow_dataset_id or "",
                }
            )
        params.update(
            docIds=[doc for repo in authorized_repos for doc in repo["docIds"]],
            datasetIds=[r.ragflow_dataset_id for r in repos if r.ragflow_dataset_id],
            repos=authorized_repos,
        )
        params[key] = [r.core_repo_id for r in repos]
    if kind == "database":
        db = select(
            scoped(
                Database.objects.filter(deleted=0), scope, "DataBaseController_getDatabaseInfo_GET"
            ),
            params.get("dbId"),
            remote="db_id",
        )
        params["dbId"] = db.db_id or db.pk
    if kind == "mcp":
        mcp = select(
            scoped(
                McpConfig.objects.filter(is_deleted=False), scope, "ToolBoxController_getDetail_GET"
            ),
            params.get("mcpServerId", params.get("serverId")),
            remote="mcp_id",
        )
        params["mcpServerId"] = mcp.mcp_id or str(mcp.pk)
        params["mcpServerUrl"] = mcp.sort_link
    if kind == "rpa":
        assistant = select(
            scoped(
                RpaAssistant.objects.filter(status=1),
                scope,
                "ToolBoxController_getDetail_GET",
                "user_id",
            ),
            params.get("assistantId"),
        )
        fields = dict(
            RpaField.objects.filter(assistant_id=assistant.pk).values_list(
                "field_key", "field_value"
            )
        )
        token = fields.get("apiKey") or fields.get("apiToken") or fields.get("token")
        if not token:
            raise ValidationError("RPA凭据未配置")
        params["header"] = {"apiKey": token}
    if kind == "flow":
        from .authorization import EXECUTE, get_workflow

        child = get_workflow(scope, params.get("flowId"), EXECUTE)
        params.update(flowId=child.flow_id, appId=child.app_id)
    if kind == "ifly-code":
        # Sandbox credentials/limits are obtained by the existing authenticated core client.
        params["executionUid"] = scope.uid
        params["executionSpaceId"] = scope.space_id
        params["flowId"] = workflow.flow_id
    if "topN" in params:
        params["topN"] = str(params["topN"])
    return params


def to_protocol(graph, workflow, scope):
    graph = normalize_graph(graph)
    nodes = []
    for node in iter_nodes(graph):
        data = node["data"]
        retry = copy.deepcopy(data.get("retryConfig") or {})
        if isinstance(retry.get("customOutput"), str) and retry["customOutput"]:
            retry["customOutput"] = parsed(retry["customOutput"])
        nodes.append(
            {
                "id": node["id"],
                "data": {
                    "nodeMeta": {
                        **data.get("nodeMeta", {}),
                        "aliasName": data.get("label", node["id"]),
                        "nodeType": data.get("nodeMeta", {}).get("nodeType", "基础节点"),
                    },
                    "nodeParam": authorized_params(node, workflow, scope),
                    "inputs": io_items(data.get("inputs", []), inputs=True),
                    "outputs": io_items(data.get("outputs", [])),
                    "retryConfig": retry,
                },
            }
        )
    edges = []
    for edge in graph["edges"]:
        handle = edge.get("sourceHandle") or ""
        if not handle.startswith("intent_chain|") and any(
            token in handle for token in ("intent-one-of", "branch_one_of", "fail_one_of")
        ):
            handle = "intent_chain|" + handle
        edges.append(
            {
                "sourceNodeId": edge.get("source", edge.get("sourceNodeId")),
                "targetNodeId": edge.get("target", edge.get("targetNodeId")),
                "sourceHandle": handle,
                "targetHandle": edge.get("targetHandle") or "",
            }
        )
    return {
        "id": workflow.flow_id,
        "name": workflow.name,
        "description": workflow.description,
        "data": {"nodes": nodes, "edges": edges},
    }


def starter_graph():
    import uuid

    start, end = "node-start::" + str(uuid.uuid4()), "node-end::" + str(uuid.uuid4())
    return {
        "nodes": [
            {
                "id": start,
                "type": "custom",
                "position": {"x": 0, "y": 200},
                "data": {
                    "label": "开始",
                    "nodeMeta": {"nodeType": "基础节点"},
                    "nodeParam": {},
                    "inputs": [],
                    "outputs": [
                        {
                            "id": str(uuid.uuid4()),
                            "name": "AGENT_USER_INPUT",
                            "required": True,
                            "schema": {"type": "string", "default": "用户本轮输入"},
                        }
                    ],
                },
            },
            {
                "id": end,
                "type": "custom",
                "position": {"x": 800, "y": 200},
                "data": {
                    "label": "结束",
                    "nodeMeta": {"nodeType": "基础节点"},
                    "nodeParam": {"template": "{{output}}", "outputMode": 1, "streamOutput": False},
                    "inputs": [
                        {
                            "id": str(uuid.uuid4()),
                            "name": "output",
                            "schema": {
                                "type": "string",
                                "value": {
                                    "type": "ref",
                                    "content": {"nodeId": start, "name": "AGENT_USER_INPUT"},
                                },
                            },
                        }
                    ],
                    "outputs": [],
                },
            },
        ],
        "edges": [{"id": str(uuid.uuid4()), "source": start, "target": end}],
    }
