"""RPA Service Health Check API"""

from fastapi import APIRouter

health_router = APIRouter(tags=["rpa health check api"])


@health_router.get("/ping")
async def pong() -> str:
    """Liveness probe: return "pong" when the service is up."""
    return "pong"
