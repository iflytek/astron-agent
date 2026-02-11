"""
ApiService module for registering API services.
"""

from typing import Any, Callable, List, Optional, Type

from plugin.aitools.api.decorators.api_meta import ApiMeta, BodyT, HeadersT, QueryT, Tag
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException


def api_service(
    *,
    method: str,
    path: str,
    headers: Optional[Type[HeadersT]] = None,
    query: Optional[Type[QueryT]] = None,
    body: Optional[Type[BodyT]] = None,
    response: Optional[Type[Any]] = None,
    summary: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[List[Tag]] = None,
    deprecated: bool = False,
) -> Callable:
    """
    Declare an API service.
    """

    method = method.upper()

    if method not in {"GET", "POST", "PUT", "DELETE", "PATCH"}:
        raise ServiceException.from_error_code(
            CodeEnums.ServiceParamsError, extra_message="Invalid method"
        )

    if not path.startswith("/"):
        raise ServiceException.from_error_code(
            CodeEnums.ServiceParamsError, extra_message="Invalid path"
        )

    def decorator(func: Callable) -> Callable:
        # GET method does not support body
        if method == "GET" and body is not None:
            raise ServiceException.from_error_code(CodeEnums.RouteGetMethodParamsError)

        meta = ApiMeta(
            method=method,
            path=path,
            headers=headers,
            query=query,
            body=body,
            response=response,
            summary=summary,
            description=description,
            tags=tags,
            deprecated=deprecated,
        )

        # Bounding the meta to the function
        setattr(func, "__api_meta__", meta)

        return func

    return decorator
