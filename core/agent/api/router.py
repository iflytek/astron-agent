"""API router module for Xingchen DB service.

This module defines the main API router and includes all version 1 sub-routers.
It sets up the common prefix '/xingchen-db/v1' for all API endpoints.
"""

from fastapi import APIRouter

from agent.api.v1.workflow_agent import workflow_agent_router

router_v1 = APIRouter(
    prefix="/agent/v1",
)
router_v1.include_router(workflow_agent_router)
