import abc
from typing import Optional

from common.service.base import ServiceType


class BaseOSSService(abc.ABC):
    """
    Abstract base class for a cache.
    """

    name = ServiceType.OSS_SERVICE

    @abc.abstractmethod
    def upload_file(
        self, filename: str, file_bytes: bytes, bucket_name: Optional[str] = None
    ) -> str:
        raise NotImplementedError
