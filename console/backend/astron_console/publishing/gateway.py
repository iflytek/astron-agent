"""Gateway identity attestation; raw application credentials never reach core services."""

import hashlib
import hmac
import time

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse
from django.views.decorators.http import require_GET

from .tenant import authenticate

PUBLIC_PATHS = {
    "/workflow/v1/chat/completions",
    "/workflow/v1/resume",
    "/workflow/v1/stop",
    "/agent/v1/chat/completions",
}


@require_GET
def workflow_auth(request):
    uri = request.headers.get("X-Original-URI", "")
    path = uri.split("?", 1)[0]
    method = request.headers.get("X-Original-Method")
    if method != "POST" or path not in PUBLIC_PATHS or "#" in uri:
        return HttpResponse(status=401, headers={"Cache-Control": "no-store"})
    try:
        app = authenticate(request.headers.get("Authorization"))
    except PermissionDenied:
        return HttpResponse(status=401, headers={"Cache-Control": "no-store"})
    key = settings.WORKFLOW_INTERNAL_API_KEY
    if not key or len(key) < 32 or "CHANGE_ME" in key:
        return HttpResponse(status=503, headers={"Cache-Control": "no-store"})
    if any(char in app.app_id for char in "\r\n"):
        return HttpResponse(status=401, headers={"Cache-Control": "no-store"})
    timestamp = str(int(time.time()))
    signature = hmac.new(
        key.encode(), f"POST\n{path}\n{app.app_id}\n{timestamp}".encode(), hashlib.sha256
    ).hexdigest()
    return HttpResponse(
        status=204,
        headers={
            "Cache-Control": "no-store",
            "X-Consumer-Username": app.app_id,
            "X-Workflow-Gateway-Timestamp": timestamp,
            "X-Workflow-Gateway-Signature": signature,
        },
    )
