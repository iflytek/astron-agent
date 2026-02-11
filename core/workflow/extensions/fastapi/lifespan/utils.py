import json

from fastapi import FastAPI
from fastapi.routing import APIRoute
from loguru import logger


async def print_routes(app: FastAPI) -> None:
    """
    Log all registered routes during application startup.

    This function collects information about all registered routes
    and logs them in JSON format for debugging and monitoring purposes.
    """
    route_infos = []
    for route in app.routes:
        if isinstance(route, APIRoute):
            route_infos.append(
                {
                    "path": route.path,
                    "name": route.name,
                    "methods": list(route.methods),
                }
            )
        else:
            route_infos.append(
                {
                    "path": getattr(route, "path", "unknown"),
                    "name": getattr(route, "name", "unknown"),
                    "methods": "N/A",
                }
            )
    logger.info("Registered routes:")
    for route_info in route_infos:
        logger.info(json.dumps(route_info, ensure_ascii=False))
