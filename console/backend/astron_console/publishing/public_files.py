"""Private files belong to publication callers, never to the publishing resource owner."""

import io

from django.core.exceptions import PermissionDenied, ValidationError
from django.http import FileResponse, Http404

from astron_console.agents import files
from astron_console.agents.models import Agent, AgentFile
from astron_console.http import api_endpoint
from astron_console.knowledge import storage
from astron_console.knowledge.clients import ResourceServiceError
from astron_console.resources.common import UpstreamError, upstream_errors
from astron_console.spaces.permissions import ResourceScope, resolve_scope

from .models import PublicFileGrant, PublicRunGrant, ShareRecord
from .runtime_authorization import check_grant
from .services import require_publication
from .tenant import authenticate


def file_data(row):
    return {
        **files.file_data(row),
        "fileId": row.pk,
        "downloadUrl": f"/console-api/published/{row.agent_id}/files/{row.pk}",
    }


def check_file_grant(grant):
    require_publication(publication_id=grant.publication_id)
    if (
        grant.share_id
        and not ShareRecord.objects.filter(
            pk=grant.share_id, is_act=1, base_id=grant.publication.bot_id
        ).exists()
    ):
        raise PermissionDenied


def authorize_caller(request, grant):
    if grant.identity_kind == "console":
        scope = resolve_scope(request)
        if scope.uid != grant.caller_uid or scope.space_id != grant.caller_space_id:
            raise PermissionDenied
    elif grant.identity_kind == "api":
        app = authenticate(request.headers.get("Authorization"))
        if not grant.app_id or app.app_id != grant.app_id:
            raise PermissionDenied
    else:
        # WeChat's customer-service channel does not receive browser-readable private URLs.
        raise PermissionDenied


@api_endpoint(["POST"])
@upstream_errors
def upload(request, bot_id):
    from .public_runtime import browser_publication

    publication, share_id = browser_publication(request, bot_id)
    if publication.candidate.resource_kind != "agent" or not publication.candidate.definition.get(
        "supportUpload"
    ):
        raise ValidationError("此已发布Agent未启用文件输入")
    caller = resolve_scope(request)
    agent = Agent.objects.get(pk=bot_id, is_delete=0)
    try:
        row = files.store_file(request.FILES.get("file"), agent, caller)
    except ResourceServiceError:
        raise UpstreamError("文件存储失败") from None
    try:
        PublicFileGrant.objects.create(
            file=row,
            publication=publication,
            candidate=publication.candidate,
            caller_uid=caller.uid,
            caller_space_id=caller.space_id,
            share_id=share_id,
        )
    except Exception:
        storage.remove(row.object_key, row.bucket)
        row.delete()
        raise
    return file_data(row)


def authorize_inputs(publication, caller_uid, caller_space_id, file_ids):
    if (
        not isinstance(file_ids, list)
        or len(file_ids) > 10
        or any(not isinstance(item, str) for item in file_ids)
    ):
        raise ValidationError("文件列表无效，最多10个文件")
    if file_ids and not publication.candidate.definition.get("supportUpload"):
        raise ValidationError("此已发布Agent未启用文件输入")
    rows = []
    for identifier in dict.fromkeys(file_ids):
        grant = (
            PublicFileGrant.objects.select_related("file", "publication")
            .filter(
                file_id=identifier,
                publication=publication,
                caller_uid=caller_uid,
                caller_space_id=caller_space_id,
                identity_kind="console",
                file__direction="input",
            )
            .first()
        )
        if grant is None:
            raise PermissionDenied
        check_file_grant(grant)
        rows.append(grant.file)
    return rows


@api_endpoint(["GET"], authenticated=False)
@upstream_errors
def download(request, bot_id, file_id):
    row = AgentFile.objects.filter(pk=file_id, agent_id=bot_id).first()
    if row is None:
        raise Http404
    if row.direction == "input":
        grant = PublicFileGrant.objects.select_related("publication").filter(file=row).first()
        if grant is None:
            raise Http404
        check_file_grant(grant)
    else:
        grant = PublicRunGrant.objects.filter(
            run_id=row.run_id, caller_uid=row.uid, caller_space_id=row.space_id
        ).first()
        if grant is None or grant.candidate.bot_id != bot_id:
            raise Http404
        check_grant(grant)
    authorize_caller(request, grant)
    try:
        body = storage.read(row.object_key, row.bucket)
    except ResourceServiceError:
        raise UpstreamError("文件读取失败") from None
    return FileResponse(
        io.BytesIO(body), as_attachment=True, filename=row.name, content_type=row.content_type
    )


def upload_identity(run, values):
    """Validate a trusted artifact callback against the exact frozen public run."""
    grant = PublicRunGrant.objects.select_related("candidate").filter(run_id=run.pk).first()
    if grant is None:
        return None
    check_grant(grant)
    from astron_console.workflows.execution_context import checked_root

    checked_root(grant.root_id)
    if (
        grant.caller_uid != values.get("uid")
        or str(grant.candidate.space_id or "") != str(values.get("spaceId") or "")
        or str(grant.candidate.bot_id) != str(values.get("agentId"))
    ):
        raise PermissionDenied
    if run.session.uid != grant.caller_uid or run.session.space_id != grant.caller_space_id:
        raise PermissionDenied
    return (
        grant,
        ResourceScope(grant.caller_uid, grant.caller_space_id, None),
        Agent.objects.get(pk=grant.candidate.bot_id, is_delete=0),
    )


@api_endpoint(["GET"], authenticated=False)
@upstream_errors
def workflow_download(request, artifact_id):
    from astron_console.knowledge.files import artifact_location
    from astron_console.knowledge.models import Artifact

    row = Artifact.objects.filter(pk=artifact_id, deleted=False).first()
    grant = workflow_grant(row.run_id) if row else None
    if grant is None or row.uid != grant.caller_uid or row.space_id != grant.caller_space_id:
        raise Http404
    check_grant(grant)
    authorize_caller(request, grant)
    bucket, key = artifact_location(row)
    try:
        body = storage.read(key, bucket)
    except ResourceServiceError:
        raise UpstreamError("产物读取失败") from None
    return FileResponse(
        io.BytesIO(body), as_attachment=True, filename=row.file_name, content_type=row.content_type
    )


def workflow_upload_identity(values, *, console=False):
    """Modern callbacks cannot downgrade into the retained legacy upload route."""
    from astron_console.workflows.authorization import EXECUTE, active_scope, get_workflow
    from astron_console.workflows.execution_context import checked_root, graph_nodes
    from astron_console.workflows.models import WorkflowRun

    run_id = values.get("runId")
    run = WorkflowRun.objects.filter(pk=run_id).first() if run_id else None
    if not console:
        if run is not None or values.get("rootId"):
            raise PermissionDenied
        # Old Core callbacks predate durable Console runs. Keep their existing
        # service-token + workflow-owner boundary, including in-flight runs.
        return None
    if (
        run is None
        or not values.get("rootId")
        or values["rootId"] != run.context_id
        or run.status not in {"running", "resuming"}
        or run.cancel_requested
    ):
        raise PermissionDenied
    checked_root(run.context_id)
    scope = active_scope(run.uid, run.space_id)
    workflow = get_workflow(scope, run.workflow_id, EXECUTE)
    if str(values.get("flowId") or "") != str(workflow.flow_id):
        raise PermissionDenied
    grant = (
        PublicRunGrant.objects.select_related("candidate").filter(root_id=run.context_id).first()
    )
    if grant:
        check_grant(grant)
    caller = grant.caller_uid if grant else run.uid
    if caller != values.get("uid") or str(run.space_id or "") != str(values.get("spaceId") or ""):
        raise PermissionDenied
    node = next(
        (node for node in graph_nodes(run.graph) if node.get("id") == values.get("nodeId")),
        None,
    )
    if node is None:
        raise PermissionDenied
    if values.get("source", "skill_sandbox") == "code_sandbox":
        if not node["id"].startswith("ifly-code::"):
            raise PermissionDenied
    else:
        if not node["id"].startswith("agent::"):
            raise PermissionDenied
        resolved = run.resolved_agents.get(node["id"])
        if resolved:
            from astron_console.agents.models import AgentVersion

            config = AgentVersion.objects.get(
                pk=resolved["versionId"], agent_id=resolved["agentId"]
            ).definition
        else:
            from astron_console.workflows.execution_context import inline_definition

            config = inline_definition(node)
        if str(values.get("skillId", "")) not in {str(x) for x in config.get("skills", [])}:
            raise PermissionDenied
    return grant, scope, run


def workflow_grant(run_id):
    from astron_console.workflows.models import WorkflowRun

    run = WorkflowRun.objects.filter(pk=run_id).first() if run_id else None
    return (
        PublicRunGrant.objects.select_related("candidate").filter(root_id=run.context_id).first()
        if run
        else None
    )
