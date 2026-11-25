"""Console adapters to the authoritative knowledge and database core services."""

import logging

import httpx
from django.conf import settings
from django.core.exceptions import ValidationError

from astron_console.accounts.http import response

logger = logging.getLogger(__name__)


class ResourceServiceError(Exception):
    """Safe error; never include upstream payloads or secret-bearing URLs."""


def remote(base, path, *, data=None, files=None, headers=None):
    try:
        with httpx.Client(timeout=httpx.Timeout(180, connect=10), follow_redirects=False) as client:
            args = {"data": data, "files": files} if files else {"json": data}
            result = client.post(base.rstrip("/") + path, headers=headers or {}, **args)
            result.raise_for_status()
            body = result.json()
        if (
            not isinstance(body, dict)
            or isinstance(body.get("code"), bool)
            or body.get("code") != 0
        ):
            raise ResourceServiceError("资源服务拒绝请求")
        return body.get("data")
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Resource service request failed path=%s error=%s", path, type(exc).__name__)
        raise ResourceServiceError("资源服务暂时不可用") from None


def knowledge_headers(tag):
    from astron_console.resources.platform_accounts import get_platform_config

    knowledge = get_platform_config("knowledge_platform")
    headers = {}
    if tag == "Ragflow-RAG":
        config = knowledge.get("ragflow", {})
        for field, header in [
            ("baseUrl", "base-url"),
            ("apiToken", "api-token"),
            ("timeout", "timeout"),
            ("defaultGroup", "default-group"),
        ]:
            if config.get(field) not in (None, ""):
                headers["x-ragflow-" + header] = str(config[field])
        if not headers.get("x-ragflow-api-token") or not headers.get("x-ragflow-base-url"):
            raise ValidationError("请先配置 RAGFlow 平台账号")
    elif tag in ("CBG-RAG", "SparkDesk-RAG"):
        platform = get_platform_config("iflytek_open_platform")
        config = knowledge.get("xinghuo", {})
        for header, value in [
            ("x-xinghuo-dataset-id", config.get("datasetId")),
            ("x-xinghuo-app-id", platform.get("platformAppId")),
            ("x-xinghuo-app-secret", platform.get("platformApiSecret")),
        ]:
            if value:
                headers[header] = str(value)
    return headers


def rag(repo, path, data, files=None):
    return remote(
        getattr(settings, "KNOWLEDGE_URL", "http://knowledge:8000/knowledge"),
        "/v1" + path,
        data=data,
        files=files,
        headers=knowledge_headers(repo.tag),
    )


def database(path, data):
    return remote(
        getattr(settings, "SPARK_DB_URL", "http://database:7990"),
        "/xingchen-db/v1/" + path,
        data=data,
        headers={"X-Consumer-Username": getattr(settings, "TENANT_ID", "")},
    )


def service_errors(view):
    from functools import wraps

    @wraps(view)
    def wrapped(*args, **kwargs):
        try:
            return view(*args, **kwargs)
        except ResourceServiceError as exc:
            return response(message=str(exc), status=502)

    return wrapped
