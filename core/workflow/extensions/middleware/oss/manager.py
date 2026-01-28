"""
OSS Service Manager module.

This module provides concrete implementations of OSS services,
including S3-compatible storage and iFly Gateway Storage clients.
"""

import json
from typing import Optional
from urllib.parse import urlencode

import boto3  # type: ignore
from botocore.exceptions import ClientError  # type: ignore
from common.utils.hmac_auth import HMACAuth
from loguru import logger

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.fastapi.lifespan.http_client import HttpClient
from workflow.extensions.middleware.base import Service
from workflow.extensions.middleware.oss.base import BaseOSSService


class S3Service(BaseOSSService, Service):
    """
    S3-compatible object storage service implementation.

    This class provides file upload functionality using S3-compatible
    storage services with public read access.
    """

    def __init__(
        self,
        endpoint: str,
        access_key_id: str,
        access_key_secret: str,
        bucket_name: str,
        oss_download_host: str,
    ):
        """
        Initialize S3 service client.

        :param endpoint: S3 service endpoint URL
        :param access_key_id: AWS access key ID for authentication
        :param access_key_secret: AWS secret access key for authentication
        :param bucket_name: Default bucket name for file operations
        :param oss_download_host: Host URL for generating download links
        """
        self.endpoint = endpoint
        self.bucket_name = bucket_name
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=access_key_secret,
            verify=False,
        )
        self._ensure_bucket_exists(bucket_name)
        self.bucket_name = bucket_name
        self.oss_download_host = oss_download_host

    def _ensure_bucket_exists(self, bucket_name: str) -> None:
        """
        Ensure the bucket exists. If not, create it.

        :param bucket_name: The name of the bucket to ensure
        :raise Exception: If the bucket creation fails
        """
        try:
            self.client.head_bucket(Bucket=bucket_name)
        except ClientError as e:
            error_code = int(e.response["Error"]["Code"])
            if error_code == 404:

                logger.debug(f"⚠️ Bucket '{bucket_name}' not found. Creating...")
                self.client.create_bucket(Bucket=bucket_name)
                logger.debug(f"✅ Bucket '{bucket_name}' created successfully.")

                # Set the bucket policy to allow public reads
                bucket_policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": f"arn:aws:s3:::{bucket_name}/*",
                        }
                    ],
                }
                # Apply the bucket strategy
                self.client.put_bucket_policy(
                    Bucket=bucket_name, Policy=json.dumps(bucket_policy)
                )
                logger.debug(
                    f"✅ Public read policy applied to bucket '{bucket_name}'."
                )

            else:
                raise

    def upload_file(
        self, filename: str, file_bytes: bytes, bucket_name: Optional[str] = None
    ) -> str:
        """
        Upload a file to S3-compatible storage with public read access.

        :param filename: The name of the file to be uploaded
        :param file_bytes: The binary content of the file to upload
        :param bucket_name: Optional bucket name, uses default if not provided
        :return: The public download URL for the uploaded file
        :raises CustomException: If file upload fails
        """
        if not bucket_name:
            bucket_name = self.bucket_name

        try:
            # Set public read access
            self.client.put_object(
                Bucket=bucket_name, Key=filename, Body=file_bytes, ACL="public-read"
            )
            return f"{self.oss_download_host}/{bucket_name}/{filename}"
        except Exception as e:
            raise CustomException(
                CodeEnum.FILE_STORAGE_ERROR, cause_error=str(e)
            ) from e

    async def upload_file_async(
        self, filename: str, file_bytes: bytes, bucket_name: Optional[str] = None
    ) -> str:
        """
        Upload a file to S3-compatible storage with public read access.

        :param filename: The name of the file to be uploaded
        :param file_bytes: The binary content of the file to upload
        :param bucket_name: Optional bucket name, uses default if not provided
        :return: The public download URL for the uploaded file
        :raises CustomException: If file upload fails
        """
        if not bucket_name:
            bucket_name = self.bucket_name

        try:
            # Set public read access
            self.client.put_object(
                Bucket=bucket_name, Key=filename, Body=file_bytes, ACL="public-read"
            )
            return f"{self.oss_download_host}/{bucket_name}/{filename}"
        except Exception as e:
            raise CustomException(
                CodeEnum.FILE_STORAGE_ERROR, cause_error=str(e)
            ) from e


class IFlyGatewayStorageClient(BaseOSSService, Service):
    """
    iFly Gateway Storage client implementation.

    This class provides file upload functionality using iFly's proprietary
    gateway storage service with HMAC authentication.
    """

    def __init__(
        self,
        endpoint: str,
        access_key_id: str,
        access_key_secret: str,
        bucket_name: str,
        ttl: int,
    ):
        """
        Initialize iFly Gateway Storage client.

        :param endpoint: Gateway storage service endpoint URL
        :param access_key_id: API key for HMAC authentication
        :param access_key_secret: API secret for HMAC authentication
        :param bucket_name: Bucket name for file operations
        :param ttl: Time-to-live for generated download links in seconds
        """
        self.endpoint = endpoint
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret
        self.bucket_name = bucket_name
        self.ttl = ttl

    def upload_file(
        self, filename: str, file_bytes: bytes, bucket_name: Optional[str] = None
    ) -> str:
        """
        Upload a file to iFly Gateway Storage with temporary download link.

        :param filename: The name of the file to be uploaded
        :param file_bytes: The binary content of the file to upload
        :param bucket_name: Optional bucket name, uses default if not provided
        :return: Temporary download link for the uploaded file
        :raises CustomException: If file upload fails or response is invalid
        """
        url = f"{self.endpoint}/api/v1/{self.bucket_name}"
        params = {
            "get_link": "true",
            "link_ttl": self.ttl,
            "filename": filename,
            "expose": "true",
        }
        url = url + "?" + urlencode(params)
        headers = HMACAuth.build_auth_header(
            url,
            method="POST",
            api_key=self.access_key_id,
            api_secret=self.access_key_secret,
        )
        headers["X-TTL"] = str(self.ttl)
        headers["Content-Length"] = str(len(file_bytes))
        try:

            import requests  # type: ignore

            resp = requests.post(url, headers=headers, data=file_bytes)
        except Exception as e:
            logger.error(e)
            return ""
        if resp.status_code != 200:
            raise CustomException(
                CodeEnum.FILE_STORAGE_ERROR,
                cause_error=(
                    f"invoke oss error, "
                    f"status_code: {resp.status_code}, "
                    f"message: {resp.text}"
                ),
            )

        ret = resp.json()
        if ret["code"] != 0:
            raise CustomException(
                CodeEnum.FILE_STORAGE_ERROR,
                cause_error=(
                    f"invoke oss error, "
                    f"status_code: {resp.status_code}, "
                    f"message: {resp.text}"
                ),
            )
        try:
            link = ret["data"]["link"]
        except Exception as e:
            raise CustomException(
                CodeEnum.FILE_STORAGE_ERROR,
                cause_error=(
                    f"invoke oss error, "
                    f"status_code: {resp.status_code}, "
                    f"message: {resp.text},"
                    f"err: {str(e)}"
                ),
            ) from e
        return link

    async def upload_file_async(
        self, filename: str, file_bytes: bytes, bucket_name: Optional[str] = None
    ) -> str:
        """
        Upload a file to iFly Gateway Storage with temporary download link.

        :param filename: The name of the file to be uploaded
        :param file_bytes: The binary content of the file to upload
        :param bucket_name: Optional bucket name, uses default if not provided
        :return: Temporary download link for the uploaded file
        :raises CustomException: If file upload fails or response is invalid
        """
        session = HttpClient.get_session()
        url = f"{self.endpoint}/api/v1/{self.bucket_name}"
        params = {
            "get_link": "true",
            "link_ttl": self.ttl,
            "filename": filename,
            "expose": "true",
        }
        url = url + "?" + urlencode(params)
        headers = HMACAuth.build_auth_header(
            url,
            method="POST",
            api_key=self.access_key_id,
            api_secret=self.access_key_secret,
        )
        headers["X-TTL"] = str(self.ttl)
        headers["Content-Length"] = str(len(file_bytes))
        try:
            async with session.post(url, headers=headers, data=file_bytes) as resp:
                response_text = await resp.text()
                if resp.status != 200:
                    raise CustomException(
                        CodeEnum.FILE_STORAGE_ERROR,
                        cause_error=(
                            f"invoke oss error, "
                            f"status_code: {resp.status}, "
                            f"message: {response_text}"
                        ),
                    )

                ret = json.loads(response_text)
                if ret["code"] != 0:
                    raise CustomException(
                        CodeEnum.FILE_STORAGE_ERROR,
                        cause_error=(
                            f"invoke oss error, "
                            f"status_code: {resp.status}, "
                            f"message: {response_text}"
                        ),
                    )

                try:
                    link = ret["data"]["link"]
                except Exception as e:
                    raise CustomException(
                        CodeEnum.FILE_STORAGE_ERROR,
                        cause_error=(
                            f"invoke oss error, "
                            f"status_code: {resp.status}, "
                            f"message: {response_text}, "
                            f"err: {str(e)}"
                        ),
                    ) from e

                return link

        except Exception as e:
            logger.error(e)
            raise CustomException(
                CodeEnum.FILE_STORAGE_ERROR,
                cause_error=str(e),
            )
