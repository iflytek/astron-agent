"""
Base OSS (Object Storage Service) interface module.

This module defines the abstract base class for OSS services,
providing a common interface for different object storage implementations.
"""

import abc
from typing import Optional

from workflow.extensions.middleware.utils import ServiceType


class BaseOSSService(abc.ABC):
    """
    Abstract base class for Object Storage Service implementations.

    This class defines the common interface that all OSS service implementations
    must follow, ensuring consistency across different storage providers.
    """

    name = ServiceType.OSS_SERVICE

    @abc.abstractmethod
    def upload_file(
        self, filename: str, file_bytes: bytes, bucket_name: Optional[str] = None
    ) -> str:
        """
        Upload a file to the object storage service.

        :param filename: The name of the file to be uploaded
        :param file_bytes: The binary content of the file to upload
        :param bucket_name: Optional bucket name, if not provided uses default bucket
        :return: The URL or path to the uploaded file
        :raises NotImplementedError: This method must be implemented by subclasses
        """
        raise NotImplementedError

    @abc.abstractmethod
    async def upload_file_async(
        self, filename: str, file_bytes: bytes, bucket_name: Optional[str] = None
    ) -> str:
        """
        Upload a file to the object storage service.

        :param filename: The name of the file to be uploaded
        :param file_bytes: The binary content of the file to upload
        :param bucket_name: Optional bucket name, if not provided uses default bucket
        :return: The URL or path to the uploaded file
        :raises NotImplementedError: This method must be implemented by subclasses
        """
        raise NotImplementedError
