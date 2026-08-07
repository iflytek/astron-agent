"""API router module for the Astron Agent service.

This module defines the main API router and includes all version 1 sub-routers.
It sets up the common prefix '/agent/v1' for all agent API endpoints.
"""

from fastapi import APIRouter

from agent.api.v1.skill_sandbox_api import skill_sandbox_router
from agent.api.v1.workflow_agent import workflow_agent_router

router_v1 = APIRouter(
    prefix="/agent/v1",
)
router_v1.include_router(workflow_agent_router)
router_v1.include_router(skill_sandbox_router)
