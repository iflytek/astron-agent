import os

from loguru import logger

from common.service.base import ServiceFactory, ServiceType
from common.service.oss.base_oss import BaseOSSService
from common.service.oss.ifly_storage_gateway_service import IFlyGatewayStorageClient
from common.service.oss.s3_service import S3Service


class OSSServiceFactory(ServiceFactory):
    name = ServiceType.OSS_SERVICE  # type: ignore[report-untyped-call]

    def __init__(self) -> None:  # type: ignore[report-untyped-call]
        super().__init__(BaseOSSService)  # type: ignore[arg-type]
        self.client = None

    def create(self):  # type: ignore[override, no-untyped-def]
        logger.debug("Creating OSS Servie")
        oss_type = os.getenv("OSS_TYPE", "ifly_gateway_storage")
        if oss_type == "s3":
            self.client = S3Service(
                endpoint=os.getenv("OSS_ENDPOINT") or "",
                access_key_id=os.getenv("OSS_ACCESS_KEY_ID") or "",
                access_key_secret=os.getenv("OSS_ACCESS_KEY_SECRET") or "",
                bucket_name=os.getenv("OSS_BUCKET_NAME") or "",
                oss_download_host=os.getenv("OSS_DOWNLOAD_HOST") or "",
            )  # type: ignore
        else:
            self.client = IFlyGatewayStorageClient(  # type: ignore[assignment]
                endpoint=os.getenv("OSS_ENDPOINT", ""),
                access_key_id=os.getenv("OSS_ACCESS_KEY_ID", ""),
                access_key_secret=os.getenv("OSS_ACCESS_KEY_SECRET", ""),
                bucket_name=os.getenv("OSS_BUCKET_NAME", ""),
                ttl=int(os.getenv("OSS_TTL", "86400")),
            )
        return self.client
