import sys
import time

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from api.schemas.completion_chunk import ReasonChatCompletionChunk
from api.v1.bot_config_mgr_api import bot_config_mgr_router
from api.v1.openapi import openapi_router
from api.v1.workflow_agent import workflow_agent_router

# Use unified common package import module
from common_imports import initialize_services, logger, sid_generator2
from infra.config import agent_config

# Remove handler after importing logger to avoid duplicate output
logger.remove()
handler_id = logger.add(sys.stderr, level="ERROR")  # Add a modifiable handler

app = FastAPI()


@app.exception_handler(RequestValidationError)  # type: ignore[misc]
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    try:
        # Safely get the first error message
        errors = exc.errors()
        err = errors[0] if errors else {}
    except (IndexError, AttributeError):
        err = exc.body or {}
    message = f"{err['type']}, {err['loc'][-1]}, {err['msg']}"

    # Generate ID safely - fallback if sid_generator2 not initialized
    request_id = (
        sid_generator2.gen() if sid_generator2 is not None else "validation-error"
    )

    rs = JSONResponse(
        content=ReasonChatCompletionChunk(
            code=40002,
            message=message,
            id=request_id,
            choices=[],
            created=int(time.time()),
            model="",
            object="chat.completion.chunk",
        ).model_dump()
    )
    return rs


app.include_router(openapi_router)
app.include_router(workflow_agent_router)
app.include_router(bot_config_mgr_router)

if __name__ == "__main__":

    # Initialize common services (xingchen_utils initialization)
    # Note: otlp_span_service enables distributed tracing
    services_to_init = [
        "otlp_sid_service",  # Service ID generator for request tracking
        "otlp_metric_service",  # Metrics collection and export
        "otlp_span_service",  # Distributed tracing and span export
        "settings_service",  # Configuration management
    ]

    initialize_services(services=services_to_init)

    uvicorn_server = uvicorn.Server(
        uvicorn.Config(
            app=agent_config.SERVICE_APP,
            host=agent_config.SERVICE_HOST,
            port=agent_config.SERVICE_PORT,
            workers=agent_config.SERVICE_WORKERS,
            reload=agent_config.SERVICE_RELOAD,
            ws_ping_interval=None,
            ws_ping_timeout=None,
        )
    )
    uvicorn_server.run()
