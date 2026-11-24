"""Private files belong to publication callers, never to the publishing resource owner."""

import hashlib
import io
import logging
import re
import uuid
from datetime import timedelta
from pathlib import PurePosixPath

from django.core.exceptions import PermissionDenied, ValidationError
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.http import FileResponse, Http404
from minio.commonconfig import ENABLED, Filter
from minio.error import MinioException, S3Error
from minio.lifecycleconfig import Expiration, LifecycleConfig, Rule
from urllib3.exceptions import HTTPError

from astron_console.agents import files
from astron_console.agents.models import Agent, AgentFile
from astron_console.http import api_endpoint
from astron_console.knowledge import storage
from astron_console.knowledge.clients import ResourceServiceError
from astron_console.resources.common import UpstreamError, text, upstream_errors
from astron_console.spaces.permissions import ResourceScope, resolve_scope

from .models import PublicFileGrant, PublicRunGrant, ShareRecord
from .runtime_authorization import check_grant
from .services import require_publication
from .tenant import authenticate

logger = logging.getLogger(__name__)
WORKFLOW_FILE_PREFIX = "workflow-upload:"
WORKFLOW_FILE_KEY_PREFIX = "published-workflow-inputs/"
WORKFLOW_FILE_DOWNLOAD_RE = re.compile(
    rf"https?://[^/\s]+/[^/\s]+/{WORKFLOW_FILE_KEY_PREFIX}[0-9a-f]{{32}}/input\.[a-z0-9]+\?[^\s<>\"']+"
)
# Reserve space under the reverse proxy's 20 MiB multipart request limit.
WORKFLOW_FILE_MAX_BYTES = 19 * 1024 * 1024
WORKFLOW_FILE_LIFECYCLE_RULE = "expire-published-workflow-inputs"
WORKFLOW_FILE_EXTENSIONS = {
    "image": {"jpg", "jpeg", "png", "bmp"},
    "pdf": {"pdf"},
    "doc": {"doc", "docx"},
    "ppt": {"ppt", "pptx"},
    "excel": {"xls", "xlsx", "csv"},
    "txt": {"txt"},
    "audio": {"wav", "mp3", "flac", "m4a", "aac", "ogg", "wma", "midi"},
    "video": {"mp4", "avi", "mov", "wmv", "flv", "mkv"},
    "subtitle": {"srt", "vtt", "ass", "ssa"},
}


def workflow_input_bucket():
    digest = hashlib.sha256(storage.bucket().encode()).hexdigest()[:20]
    return f"astron-workflow-input-{digest}"


def ensure_workflow_input_bucket(bucket):
    sdk = storage.client()
    if not sdk.bucket_exists(bucket):
        try:
            sdk.make_bucket(bucket)
        except S3Error as exc:
            if exc.code != "BucketAlreadyOwnedByYou":
                raise
    lifecycle = sdk.get_bucket_lifecycle(bucket)
    if lifecycle is None:
        sdk.set_bucket_lifecycle(
            bucket,
            LifecycleConfig(
                [
                    Rule(
                        ENABLED,
                        rule_filter=Filter(prefix=WORKFLOW_FILE_KEY_PREFIX),
                        rule_id=WORKFLOW_FILE_LIFECYCLE_RULE,
                        expiration=Expiration(days=2),
                    ),
                ]
            ),
        )
    elif not any(
        rule.rule_id == WORKFLOW_FILE_LIFECYCLE_RULE
        and rule.status == ENABLED
        and rule.rule_filter is not None
        and rule.rule_filter.prefix == WORKFLOW_FILE_KEY_PREFIX
        and rule.expiration is not None
        and rule.expiration.days == 2
        for rule in lifecycle.rules
    ):
        raise ResourceServiceError("工作流输入文件存储桶缺少过期规则")


def workflow_file_fields(candidate):
    start = next(
        (
            node
            for node in candidate.definition.get("graph", {}).get("nodes", [])
            if node["id"].startswith("node-start::")
        ),
        {},
    )
    return {
        item["name"]: item
        for item in start.get("data", {}).get("outputs", [])
        if item.get("fileType") == "file"
    }


def workflow_file_binding(publication_id, candidate_id, uid, space_id, share_id, field):
    return [publication_id, candidate_id, uid, space_id, share_id, field]


@api_endpoint(["POST"])
@upstream_errors
def upload_workflow_input(request, bot_id):
    from .public_runtime import browser_publication

    publication, share_id = browser_publication(request, bot_id)
    if publication.candidate.resource_kind != "workflow":
        raise Http404
    caller = resolve_scope(request)
    field = text(request.payload, "field", required=True, limit=255)
    definition = workflow_file_fields(publication.candidate).get(field)
    if definition is None:
        raise ValidationError("该发布版本未定义此文件输入")
    categories = definition.get("allowedFileType") or []
    category = categories[0] if isinstance(categories, list) and categories else ""
    upload = request.FILES.get("file")
    limit = 3 * 1024 * 1024 if category == "image" else WORKFLOW_FILE_MAX_BYTES
    if not upload or not 0 < upload.size <= limit:
        raise ValidationError(f"请选择不超过{limit // (1024 * 1024)}MB的文件")
    suffix = PurePosixPath(upload.name).suffix.lstrip(".").lower()
    if suffix not in WORKFLOW_FILE_EXTENSIONS.get(category, set()):
        raise ValidationError("文件类型与工作流输入不匹配")
    key = f"{WORKFLOW_FILE_KEY_PREFIX}{uuid.uuid4().hex}/input.{suffix}"
    signer = TimestampSigner(salt="publishing.workflow-input")
    token = signer.sign_object(
        {
            "binding": workflow_file_binding(
                publication.pk,
                publication.candidate_id,
                caller.uid,
                caller.space_id,
                share_id,
                field,
            ),
            "key": key,
        }
    )
    try:
        bucket = workflow_input_bucket()
        ensure_workflow_input_bucket(bucket)
        storage.put(key, upload, upload.size, "application/octet-stream", bucket)
    except (MinioException, HTTPError, OSError, ResourceServiceError) as exc:
        logger.warning("Workflow upload storage unavailable type=%s", type(exc).__name__)
        raise UpstreamError("工作流输入文件存储失败，请重试") from None
    logger.info(
        "Published workflow input uploaded publication=%s candidate=%s size=%s",
        publication.pk,
        publication.candidate_id,
        upload.size,
    )
    return {"reference": WORKFLOW_FILE_PREFIX + token}


def workflow_file_key(reference, binding):
    signer = TimestampSigner(salt="publishing.workflow-input")
    try:
        data = signer.unsign_object(reference.removeprefix(WORKFLOW_FILE_PREFIX), max_age=86400)
    except SignatureExpired:
        raise ValidationError("工作流输入文件已过期，请重新上传") from None
    except BadSignature:
        raise PermissionDenied from None
    if data["binding"] != binding:
        raise PermissionDenied
    return data["key"]


def map_workflow_file_inputs(candidate, inputs, transform):
    if not isinstance(inputs, dict):
        return inputs
    result = inputs.copy()
    fields = workflow_file_fields(candidate)
    for field, value in inputs.items():
        uses_reference = is_workflow_file_reference(value) or (
            isinstance(value, list) and any(is_workflow_file_reference(item) for item in value)
        )
        if not uses_reference:
            continue
        definition = fields.get(field)
        if definition is None:
            raise PermissionDenied
        kind = (definition.get("schema") or {}).get("type", "string")
        if isinstance(value, list) != (kind in {"array", "array-string"}):
            raise ValidationError("工作流文件输入格式无效")
        if isinstance(value, list):
            result[field] = [
                transform(field, item) if is_workflow_file_reference(item) else item
                for item in value
            ]
        else:
            result[field] = transform(field, value)
    return result


def is_workflow_file_reference(value):
    return isinstance(value, str) and value.startswith(WORKFLOW_FILE_PREFIX)


def validate_workflow_file_inputs(publication, uid, space_id, share_id, inputs):
    def validate(field, ref):
        workflow_file_key(
            ref,
            workflow_file_binding(
                publication.pk, publication.candidate_id, uid, space_id, share_id, field
            ),
        )
        return ref

    map_workflow_file_inputs(publication.candidate, inputs, validate)


def resolve_workflow_file_inputs(grant, inputs):
    if grant.identity_kind != "console" or grant.candidate.resource_kind != "workflow":
        return inputs

    def signed_url(field, ref):
        key = workflow_file_key(
            ref,
            workflow_file_binding(
                grant.publication_id,
                grant.candidate_id,
                grant.caller_uid,
                grant.caller_space_id,
                grant.share_id,
                field,
            ),
        )
        try:
            return storage.client().presigned_get_object(
                workflow_input_bucket(), key, expires=timedelta(minutes=35)
            )
        except (MinioException, HTTPError, OSError, ResourceServiceError):
            raise ValidationError("无法读取工作流输入文件，请重新上传") from None

    return map_workflow_file_inputs(grant.candidate, inputs, signed_url)


def hide_workflow_file_references(inputs):
    if isinstance(inputs, dict):
        return {key: hide_workflow_file_references(value) for key, value in inputs.items()}
    if isinstance(inputs, list):
        return [hide_workflow_file_references(value) for value in inputs]
    if is_workflow_file_reference(inputs):
        return "[已上传文件]"
    return (
        WORKFLOW_FILE_DOWNLOAD_RE.sub("[已上传文件]", inputs) if isinstance(inputs, str) else inputs
    )


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
    if publication.candidate.resource_kind != "agent":
        raise ValidationError("此发布类型不支持Agent文件输入")
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
    if file_ids and publication.candidate.resource_kind != "agent":
        raise ValidationError("此发布类型不支持Agent文件输入")
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
            raise PermissionDenied("Agent节点缺少固定引用")
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
