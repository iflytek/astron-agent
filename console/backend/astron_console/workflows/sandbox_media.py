"""Copy generated built-in media into the current workflow's Docker directory."""

import asyncio
import base64
import json
import logging
import re

from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404

from astron_console.knowledge import storage
from astron_console.knowledge.clients import ResourceServiceError
from astron_console.publishing.runtime_authorization import grant_for_root
from astron_console.resources.common import UpstreamError
from astron_console.resources.local_sandbox import (
    MAX_DOWNLOAD_BYTES,
    available,
    request_runner,
    sandbox_identity,
)
from astron_console.resources.sandbox import agent_sandbox_selection

from .authorization import EXECUTE, active_scope, get_workflow
from .execution_context import checked_root, graph_nodes
from .protocol import authorized_plugin
from .runtime_models import WorkflowRun

logger = logging.getLogger(__name__)
MEDIA_TYPES = {
    "builtin:aitools.image_generate": ("image_generate", "image_url", ".jpg"),
    "builtin:aitools.smarttts": ("smarttts", "voice_url", ".MP3"),
}
UUID4 = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")


def media_object_key(tool, outputs):
    media_type = MEDIA_TYPES.get(tool.tool_tag)
    if media_type is None:
        return None
    operation, field, extension = media_type
    endpoint = f"{settings.AITOOLS_BASE_URL.rstrip('/')}/aitools/v1/{operation}"
    if tool.end_point != endpoint or (tool.method or "").lower() != "post":
        return None
    data = outputs.get("data")
    if not isinstance(data, dict) or outputs.get("code", 0) != 0:
        return None
    url = data.get(field)
    if not isinstance(url, str):
        return None
    if not settings.OSS_REMOTE_ENDPOINT or not settings.WORKFLOW_MEDIA_BUCKET:
        return None
    prefix = f"{settings.OSS_REMOTE_ENDPOINT.rstrip('/')}/{settings.WORKFLOW_MEDIA_BUCKET}/"
    if not url.startswith(prefix):
        return None
    key = url.removeprefix(prefix)
    if not key.endswith(extension) or not UUID4.fullmatch(key.removesuffix(extension)):
        return None
    return key


def resolve_media(run, node_id, outputs):
    if not str(node_id).startswith("plugin::") or run.kind == "published" or not available():
        return
    if isinstance(outputs, str):
        try:
            outputs = json.loads(outputs)
        except ValueError:
            return
    if not isinstance(outputs, dict) or not isinstance(outputs.get("data"), dict):
        return
    try:
        root = checked_root(run.context_id)
        if grant_for_root(root) is not None:
            return
        scope = active_scope(run.uid, run.space_id)
        if (root.uid, root.space_id) != (scope.uid, scope.space_id):
            return
        if not WorkflowRun.objects.filter(
            pk=run.pk, status__in=("running", "resuming"), cancel_requested=False
        ).exists():
            return
        if agent_sandbox_selection(scope).get("provider") != "docker":
            return
        workflow = get_workflow(scope, run.workflow_id, EXECUTE)
        node = next((node for node in graph_nodes(run.graph) if node.get("id") == node_id), None)
        if node is None:
            return
        tool = authorized_plugin(scope, node["data"]["nodeParam"])
        key = media_object_key(tool, outputs)
        if key:
            return key, sandbox_identity(workflow)
    except (PermissionDenied, ValidationError, Http404) as exc:
        logger.warning(
            "Sandbox media authorization failed run=%s error_type=%s", run.pk, type(exc).__name__
        )
    return None


def copy_media(key, identity):
    contents = storage.read(key, settings.WORKFLOW_MEDIA_BUCKET, limit=MAX_DOWNLOAD_BYTES)
    request_runner(
        "write",
        kind="workflow",
        **identity,
        files=[{"path": f"output/{key}", "content": base64.b64encode(contents).decode()}],
    )


async def archive_node_files(run, node_id, outputs):
    media = await sync_to_async(resolve_media)(run, node_id, outputs)
    if media is None:
        return
    try:
        await asyncio.to_thread(copy_media, *media)
    except (Http404, ValidationError, UpstreamError, ResourceServiceError) as exc:
        logger.warning(
            "Sandbox media archive skipped run=%s error_type=%s", run.pk, type(exc).__name__
        )
