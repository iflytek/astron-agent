"""
ApiService module for registering API services.
"""

# pylint: disable=too-many-arguments
from typing import Callable, Literal, Optional, Type

from plugin.aitools.api.decorators.api_meta import ApiMeta, BodyT, QueryT, RespT
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import ServiceException


def api_service(
    *,
    method: str,
    path: str,
    query: Optional[Type[QueryT]] = None,
    body: Optional[Type[BodyT]] = None,
    response: Optional[Type[RespT]] = None,
    summary: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[
        Literal["public_cn", "public_global", "local", "intranet", "unclassified"]
    ] = "unclassified",
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
