from typing import Any

from fastapi import HTTPException


class RuntimeApiError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": message},
        )


class RunPaused(RuntimeError):
    """Execution released its worker slot for a durable wait state."""


def error_detail(exc: HTTPException) -> dict[str, Any]:
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return dict(exc.detail)
    return {"code": "REQUEST_FAILED", "message": str(exc.detail)}
