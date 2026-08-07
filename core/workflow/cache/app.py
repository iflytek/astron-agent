"""
Application cache management module.

This module provides caching functionality for application information,
including retrieval and storage operations for app data.
"""

from workflow.domain.models.ai_app import App
from workflow.extensions.middleware.getters import get_cache_service

# Redis key prefix for application information
REDIS_APP_INFO_HEAD = "workflow:app_info"


def get_app_by_app_id(app_id: str) -> App | None:
    """
    Retrieve application information by application ID from cache.

    :param app_id: Application ID to retrieve
    :return: Application object if found, None otherwise
    """
    key = f"{REDIS_APP_INFO_HEAD}:{app_id}"
    cache_service = get_cache_service()
    app = cache_service[key]
    return app


def set_app_by_app_id(app_id: str, app: App) -> None:
    """
    Store application information in cache by application ID.

    :param app_id: Application ID to store
    :param app: Application object to store
    :return: None
    """
    key = f"{REDIS_APP_INFO_HEAD}:{app_id}"
    cache_service = get_cache_service()
    cache_service.set(key=key, value=app)
