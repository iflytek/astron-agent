"""
License cache management module.

This module provides caching functionality for license information,
including retrieval and storage operations for license data.
"""

from workflow.domain.models.license import License
from workflow.extensions.middleware.getters import get_cache_service

# Redis key prefix for license information
REDIS_LICENSE_INFO_HEAD = "workflow:license_info"


def get_license_by_app_id_group_id(app_id: str, group_id: str) -> License | None:
    """
    Retrieve license information by application ID and group ID from cache.

    :param app_id: Application ID to retrieve license for
    :param group_id: Group ID to retrieve license for
    :return: License object if found, None otherwise
    """
    key = f"{REDIS_LICENSE_INFO_HEAD}:{app_id}:{group_id}"
    cache_service = get_cache_service()
    app = cache_service[key]
    return app


def set_license_by_app_id_group_id(app_id: str, group_id: str, app: License) -> None:
    """
    Store license information in cache by application ID and group ID.

    :param app_id: Application ID to store license for
    :param group_id: Group ID to store license for
    :param app: License object to store
    :return: None
    """
    key = f"{REDIS_LICENSE_INFO_HEAD}:{app_id}:{group_id}"
    cache_service = get_cache_service()
    cache_service.set(key=key, value=app)
