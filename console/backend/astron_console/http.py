"""HTTP boundary shared by Console resource apps; authentication stays in accounts."""

import json
import logging
from functools import wraps

from django.core.exceptions import PermissionDenied, RequestDataTooBig, ValidationError
from django.http import Http404, HttpResponseBase
from django.views.decorators.http import require_http_methods

from astron_console.accounts.http import response

logger = logging.getLogger(__name__)


def error_response(message, status=400):
    return response(message=message, status=status)


def api_endpoint(methods, *, authenticated=True):
    """Parse request data without bypassing Django's session or CSRF middleware."""

    def decorate(view):
        @require_http_methods(methods)
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            if authenticated and not request.user.is_authenticated:
                return error_response("请先登录", 401)
            try:
                request.payload = {}
                if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
                    if request.content_type in {
                        "multipart/form-data",
                        "application/x-www-form-urlencoded",
                    }:
                        request.payload = request.POST.dict()
                    elif request.body:
                        if request.content_type != "application/json":
                            return error_response("请求必须使用 JSON 或表单格式", 415)
                        try:
                            payload = json.loads(request.body)
                        except (ValueError, UnicodeDecodeError):
                            return error_response("请求必须是有效的 JSON 对象")
                        if not isinstance(payload, dict):
                            return error_response("请求必须是 JSON 对象")
                        request.payload = payload
                result = view(request, *args, **kwargs)
                return result if isinstance(result, HttpResponseBase) else response(result)
            except PermissionDenied:
                return error_response("没有权限执行此操作", 403)
            except Http404:
                return error_response("资源不存在", 404)
            except ValidationError as exc:
                return error_response("；".join(exc.messages))
            except RequestDataTooBig:
                return error_response("请求内容超过大小限制", 413)

        return wrapped

    return decorate
