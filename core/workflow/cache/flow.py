"""
Workflow flow cache management module.

This module provides caching functionality for workflow flow information,
including retrieval, storage, and deletion operations for flow data.
"""

from workflow.domain.models.flow import Flow
from workflow.extensions.middleware.getters import get_cache_service

# Redis key prefix for flow information
REDIS_FLOW_INFO_HEAD = "workflow:flow_info"


def get_flow_by_id(flow_id: str) -> Flow | None:
    """
    Retrieve workflow flow information by flow ID from cache.

    :param flow_id: Flow ID to retrieve
    :return: Flow object if found, None otherwise
    """
    key = f"{REDIS_FLOW_INFO_HEAD}:{flow_id}"
    cache_service = get_cache_service()
    app = cache_service[key]
    return app


def set_flow_by_id(flow_id: str, flow: Flow) -> None:
    """
    Store workflow flow information in cache by flow ID.

    :param flow_id: Flow ID to store
    :param flow: Flow object to store
    :return: None
    """
    key = f"{REDIS_FLOW_INFO_HEAD}:{flow_id}"
    cache_service = get_cache_service()
    cache_service.set(key=key, value=flow)


def del_flow_by_id(flow_id: str) -> None:
    """
    Delete workflow flow information from cache by flow ID.

    :param flow_id: Flow ID to delete
    :return: None
    """
    key = f"{REDIS_FLOW_INFO_HEAD}:{flow_id}"
    cache_service = get_cache_service()
    cache_service.delete(key=key)


def get_flow_by_flow_id_version(flow_id: int, version: str) -> Flow | None:
    """
    Retrieve workflow flow information by flow ID and version from cache.

    :param flow_id: Flow ID to retrieve
    :param version: Version string to retrieve
    :return: Flow object if found, None otherwise
    """
    key = f"{REDIS_FLOW_INFO_HEAD}:{flow_id}:{version}"
    cache_service = get_cache_service()
    app = cache_service[key]
    return app


def set_flow_by_flow_id_version(flow_id: str, version: str, flow: Flow) -> None:
    """
    Store workflow flow information in cache by flow ID and version.

    :param flow_id: Flow ID to store
    :param version: Version string to store
    :param flow: Flow object to store
    :return: None
    """
    key = f"{REDIS_FLOW_INFO_HEAD}:{flow_id}:{version}"
    cache_service = get_cache_service()
    cache_service.set(key=key, value=flow)


def get_flow_by_flow_id_latest(flow_id: str) -> Flow | None:
    """
    Retrieve the latest workflow flow information by flow ID from cache.

    :param flow_id: Flow ID to retrieve
    :return: Latest Flow object if found, None otherwise
    """
    key = f"{REDIS_FLOW_INFO_HEAD}:{flow_id}:latest"
    cache_service = get_cache_service()
    app = cache_service[key]
    return app


def set_flow_by_flow_id_latest(flow_id: str, flow: Flow) -> None:
    """
    Store the latest workflow flow information in cache by flow ID.

    :param flow_id: Flow ID to store
    :param flow: Flow object to store as latest version
    :return: None
    """
    key = f"{REDIS_FLOW_INFO_HEAD}:{flow_id}:latest"
    cache_service = get_cache_service()
    cache_service.set(key=key, value=flow)


def del_flow_by_flow_id_latest_version(flow_id: str) -> None:
    """
    Delete the latest workflow flow information from cache by flow ID.

    :param flow_id: Flow ID to delete latest version
    :return: None
    """
    key = f"{REDIS_FLOW_INFO_HEAD}:{flow_id}:latest"
    cache_service = get_cache_service()
    cache_service.delete(key=key)
