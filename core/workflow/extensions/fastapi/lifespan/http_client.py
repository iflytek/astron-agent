import os
from typing import Optional

import aiohttp
from loguru import logger


class HttpClient:
    """
    HTTP client for making requests to external services.
    This class provides a singleton pattern for creating and managing a
    global HTTP session for making requests to external services.
    """

    _session: Optional[aiohttp.ClientSession] = None

    @classmethod
    async def setup(cls) -> None:
        """
        Setup the HTTP client.
        This method is called when the application starts.
        """
        if cls._session is None or cls._session.closed:
            connector = aiohttp.TCPConnector(
                limit=int(
                    os.getenv("HTTP_CLIENT_CONNECTION_POOL_SIZE", 2000)
                ),  # Connection pool size
                ttl_dns_cache=int(
                    os.getenv("HTTP_CLIENT_DNS_CACHE_TIME", 300)
                ),  # DNS cache time
                use_dns_cache=bool(int(os.getenv("HTTP_CLIENT_USE_DNS_CACHE", 1))),
            )
            cls._session = aiohttp.ClientSession(connector=connector)
            logger.info("✅ HTTP client setup successfully")

    @classmethod
    async def close(cls) -> None:
        """
        Close the HTTP client.
        This method is called when the application closes.
        """
        if cls._session and not cls._session.closed:
            await cls._session.close()
            cls._session = None
            logger.info("✅ HTTP client closed successfully")

    @classmethod
    def get_session(cls) -> aiohttp.ClientSession:
        """
        Get the original session object.
        This method is used to get the original session object for making requests.
        """
        if cls._session is None or cls._session.closed:
            raise RuntimeError(
                "HttpClient session is not initialized. Call setup() first."
            )
        return cls._session
