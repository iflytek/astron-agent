import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text

from agent_runtime.api.management import router as management_router
from agent_runtime.api.public import router as public_router
from agent_runtime.db.session import SessionLocal
from agent_runtime.errors import error_detail

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    application = FastAPI(
        title="Astron Agent Runtime",
        version="1.0.0",
        description="Durable asynchronous execution API for published agents",
    )
    application.include_router(public_router)
    application.include_router(management_router)

    @application.get("/health/live", tags=["health"])
    def health_live() -> dict[str, str]:
        return {"status": "UP"}

    @application.get("/health/ready", tags=["health"])
    def health_ready() -> dict[str, str]:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return {"status": "UP"}

    @application.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": error_detail(exc)},
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.info("Runtime request validation failed: %s", exc.errors())
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "INPUT_INVALID",
                    "message": "Request validation failed",
                    "details": exc.errors(),
                }
            },
        )

    return application


app = create_app()
