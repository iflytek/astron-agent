"""API router module for the Astron Agent memory database service.

This module defines the main API router and includes all version 1 sub-routers.
It preserves the existing '/xingchen-db/v1' prefix for memory database endpoints.
"""

from fastapi import APIRouter
from memory.database.api.v1 import (
    create_db_router,
    drop_db_router,
    exec_ddl_router,
    exec_dml_router,
    modify_db_description_router,
)

router = APIRouter(
    prefix="/xingchen-db/v1",
)

router.include_router(create_db_router)
router.include_router(exec_ddl_router)
router.include_router(exec_dml_router)
router.include_router(drop_db_router)
router.include_router(modify_db_description_router)
