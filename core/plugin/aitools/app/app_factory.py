"""FastAPI app construction for AITools."""

# pylint: disable=import-outside-toplevel

from contextlib import AbstractAsyncContextManager, asynccontextmanager
from typing import TYPE_CHECKING, AsyncGenerator, Callable

from fastapi import FastAPI
from plugin.aitools.api.middlewares.otlp_middleware import OTLPMiddleware
from plugin.aitools.api.routes.register import register_api_services
from plugin.aitools.const.const import (
    INCLUDE_PATHS_KEY,
    OTLP_ENABLE_KEY,
    SAMPLE_RATE_KEY,
)
from plugin.aitools.utils.env_utils import (
    safe_get_bool_env,
    safe_get_float_env,
    safe_get_list_env,
)

if TYPE_CHECKING:
    from plugin.aitools.app.aitools_server import AIToolsServer


def build_lifespan(
    server: "AIToolsServer | None" = None,
) -> Callable[[FastAPI], AbstractAsyncContextManager[None, bool | None]]:
    """Build lifespan context manager for app startup and shutdown."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        runtime_server = server
        if runtime_server is None:
            from plugin.aitools.app.aitools_server import AIToolsServer

            runtime_server = AIToolsServer()

        await runtime_server.startup_resources(app)
        try:
            yield
        finally:
            await runtime_server.shutdown_resources()

    return lifespan


def aitools_app(server: "AIToolsServer | None" = None) -> FastAPI:
    """Create and configure the AITools FastAPI app."""
    main_app = FastAPI(lifespan=build_lifespan(server))
    register_api_services(main_app.router)

    sample_rate = safe_get_float_env(SAMPLE_RATE_KEY, 1.0)
    include_paths = safe_get_list_env(INCLUDE_PATHS_KEY, ["/aitools/v1"])

    main_app.add_middleware(
        OTLPMiddleware,
        enabled=safe_get_bool_env(OTLP_ENABLE_KEY, False),
        sample_rate=sample_rate,
        include_paths=include_paths,
    )

    return main_app
