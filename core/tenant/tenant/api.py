"""FastAPI adapters for the existing Tenant HTTP contract."""

import hashlib
import hmac
import logging
import re
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Annotated, Any, Self
from uuid import uuid4

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.exc import SQLAlchemyError

from .config import Settings
from .database import StartupError, open_database
from .service import BusinessError, TenantService

LOGGER = logging.getLogger(__name__)
INTERNAL_KEY_HEADER = "X-Tenant-Internal-Key"
PARAMETER_ERROR = 14001
UNAUTHORIZED = 14003
SYSTEM_ERROR = 3002


def envelope(
    sid: str, code: int = 0, message: str = "success", data: Any = None
) -> dict:
    result = {"sid": sid, "code": code, "message": message}
    if data is not None:
        result["data"] = data
    return result


class TenantRoute(APIRoute):
    """Authenticate a matched route before FastAPI parses its request body."""

    def get_route_handler(self) -> Callable[[Request], Awaitable[Response]]:
        handle_request = super().get_route_handler()

        async def authorized_request(request: Request) -> Response:
            supplied = request.headers.get(INTERNAL_KEY_HEADER, "")
            expected = request.app.state.internal_key_digest
            supplied_digest = hashlib.sha256(supplied.encode()).digest()
            if not supplied or not hmac.compare_digest(supplied_digest, expected):
                return JSONResponse(
                    envelope("", UNAUTHORIZED, "unauthorized"), status_code=401
                )
            request.state.sid = f"app{uuid4().hex}"
            return await handle_request(request)

        return authorized_request


class Input(BaseModel):
    """Legacy JSON null values are treated as missing scalar fields."""

    model_config = ConfigDict(strict=True)

    @model_validator(mode="before")
    @classmethod
    def drop_null_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {
                name.lower(): value for name, value in data.items() if value is not None
            }
        return data

    def require(self, *fields: str) -> None:
        for name in fields:
            if not getattr(self, name):
                raise BusinessError(PARAMETER_ERROR, f"{name} must not been empty")


class CreateApp(Input):
    request_id: str = ""
    app_name: str = ""
    app_desc: str = ""
    dev_id: Annotated[int, Field(ge=-(2**63), le=2**63 - 1)] = 0
    cloud_id: str = ""

    @model_validator(mode="after")
    def validate_app(self) -> Self:
        self.require("request_id", "app_name")
        if self.dev_id <= 0:
            raise BusinessError(PARAMETER_ERROR, "dev_id must been more than zero")
        self.require("cloud_id")
        return self


class AppRef(Input):
    request_id: str = ""
    app_id: str = ""

    @model_validator(mode="after")
    def validate_ref(self) -> Self:
        self.require("request_id", "app_id")
        return self


class ModifyApp(AppRef):
    app_name: str = ""
    app_desc: str = ""
    cloud_id: str = ""


class DisableApp(AppRef):
    disable: bool = False


class CreateKey(AppRef):
    api_key: str = ""
    api_secret: str = ""


class DeleteKey(AppRef):
    api_key: str = ""

    @model_validator(mode="after")
    def validate_key(self) -> Self:
        self.require("api_key")
        return self


class VerifyKey(Input):
    api_key: str = ""
    api_secret: str = ""

    @model_validator(mode="after")
    def validate_pair(self) -> Self:
        self.require("api_key", "api_secret")
        return self


def tenant_service(request: Request) -> TenantService:
    return request.app.state.tenant_service


Service = Annotated[TenantService, Depends(tenant_service)]
router = APIRouter(prefix="/v2/app", route_class=TenantRoute)


def source(request: Request) -> str:
    return request.headers.get("X-Consumer-Username") or "admin"


@router.post("")
def create_app(request: Request, body: CreateApp, service: Service) -> dict:
    result = service.create_app(
        body.app_name, body.app_desc, body.dev_id, body.cloud_id, source(request)
    )
    LOGGER.info("Tenant app created sid=%s", request.state.sid)
    return envelope(request.state.sid, data=result)


@router.put("")
def modify_app(request: Request, body: ModifyApp, service: Service) -> dict:
    service.modify_app(body.app_id, body.app_name, body.app_desc, source(request))
    return envelope(request.state.sid)


@router.post("/disable")
def disable_app(request: Request, body: DisableApp, service: Service) -> dict:
    service.disable_app(body.app_id, body.disable)
    return envelope(request.state.sid)


@router.delete("")
def delete_app(request: Request, body: AppRef, service: Service) -> dict:
    service.delete_app(body.app_id)
    LOGGER.info("Tenant app deleted sid=%s", request.state.sid)
    return envelope(request.state.sid)


def query_apps(request: Request, service: TenantService, *, details: bool) -> dict:
    # Gin reads the first value for a repeated query parameter.
    params = dict(reversed(request.query_params.multi_items()))
    app_ids, name = params.get("app_ids", ""), params.get("name", "")
    if not app_ids and not name:
        raise BusinessError(
            PARAMETER_ERROR, "name or app_ids param must have at least one"
        )
    dev_id = params.get("dev_id") or "0"
    if (
        not re.fullmatch(r"[+-]?[0-9]{1,19}", dev_id)
        or not -(2**63) <= int(dev_id) < 2**63
    ):
        raise BusinessError(PARAMETER_ERROR, "invalid dev_id")
    result = service.query_apps(
        app_ids.split(",") if app_ids else [],
        name,
        int(dev_id),
        params.get("cloud_id", ""),
        details=details,
    )
    return envelope(request.state.sid, data=result if details else result or None)


@router.get("/list")
def list_apps(request: Request, service: Service) -> dict:
    return query_apps(request, service, details=False)


@router.get("/details")
def app_details(request: Request, service: Service) -> dict:
    return query_apps(request, service, details=True)


@router.post("/key")
def create_key(request: Request, body: CreateKey, service: Service) -> dict:
    result = service.add_key(body.app_id, body.api_key, body.api_secret)
    LOGGER.info("Tenant API key created sid=%s", request.state.sid)
    return envelope(request.state.sid, data=result)


@router.delete("/key")
def delete_key(request: Request, body: DeleteKey, service: Service) -> dict:
    service.delete_key(body.app_id, body.api_key)
    LOGGER.info("Tenant API key deleted sid=%s", request.state.sid)
    return envelope(request.state.sid)


@router.post("/key/verify")
def verify_key(request: Request, body: VerifyKey, service: Service) -> dict:
    result = service.find_app_for_key(body.api_key, body.api_secret)
    return envelope(request.state.sid, data=result)


@router.get("/key/{app_id}")
def list_keys(request: Request, app_id: str, service: Service) -> dict:
    return envelope(request.state.sid, data=service.list_keys(app_id) or None)


@router.get("/key/api_key/{api_key}")
def find_app_for_key(request: Request, api_key: str, service: Service) -> dict:
    return envelope(request.state.sid, data=service.find_app_for_key(api_key))


def create_app_server(settings: Settings) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        try:
            engine = open_database(settings)
        except SQLAlchemyError:
            raise StartupError("Tenant MySQL initialization failed") from None
        app.state.tenant_service = TenantService(engine)
        try:
            yield
        finally:
            engine.dispose()

    app = FastAPI(
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        redirect_slashes=False,
    )
    app.state.internal_key_digest = hashlib.sha256(
        settings.bootstrap.secret.encode()
    ).digest()
    app.include_router(router)

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"message": "pong"}

    @app.exception_handler(BusinessError)
    async def business_error(request: Request, error: BusinessError) -> JSONResponse:
        return JSONResponse(envelope(request.state.sid, error.code, str(error)))

    @app.exception_handler(RequestValidationError)
    async def invalid_body(
        request: Request, _error: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            envelope(request.state.sid, PARAMETER_ERROR, "invalid JSON request"),
            status_code=400,
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, error: SQLAlchemyError) -> JSONResponse:
        LOGGER.error(
            "Tenant database operation failed sid=%s type=%s",
            request.state.sid,
            type(error).__name__,
        )
        return JSONResponse(
            envelope(request.state.sid, SYSTEM_ERROR, "database operation failed")
        )

    return app
