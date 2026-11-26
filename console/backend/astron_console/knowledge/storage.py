"""MinIO SDK operations using the existing buckets and object keys."""

from datetime import timedelta
from urllib.parse import quote, urlsplit

from django.conf import settings
from minio import Minio
from minio.error import MinioException, S3Error
from urllib3 import PoolManager, Timeout
from urllib3.exceptions import HTTPError

from .clients import ResourceServiceError


def bucket():
    return getattr(settings, "OSS_BUCKET_CONSOLE", "astron-agent")


def client(public=False, *, http_client=None):
    endpoint = getattr(settings, "OSS_REMOTE_ENDPOINT" if public else "OSS_ENDPOINT", "")
    parsed = urlsplit(endpoint)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ResourceServiceError("对象存储尚未配置")
    return Minio(
        parsed.netloc,
        access_key=getattr(settings, "OSS_ACCESS_KEY_ID", ""),
        secret_key=getattr(settings, "OSS_ACCESS_KEY_SECRET", ""),
        secure=parsed.scheme == "https",
        region="us-east-1",
        **({"http_client": http_client} if http_client is not None else {}),
    )


def put(key, stream, size, content_type="application/octet-stream", bucket_name=None):
    try:
        client().put_object(bucket_name or bucket(), key, stream, size, content_type=content_type)
    except (MinioException, HTTPError, OSError):
        raise ResourceServiceError("文件上传失败") from None


def read(key, bucket_name=None, *, limit=None):
    stream = None
    try:
        if limit is None:
            stream = client().get_object(bucket_name or bucket(), key)
            return stream.read()
        with PoolManager(timeout=Timeout(connect=3, read=5), retries=False) as transport:
            stream = client(http_client=transport).get_object(
                bucket_name or bucket(), key, length=limit + 1
            )
            data = stream.read(limit + 1)
        if len(data) > limit:
            raise ResourceServiceError("文件超过读取大小限制")
        return data
    except (MinioException, HTTPError, OSError):
        raise ResourceServiceError("文件读取失败") from None
    finally:
        if stream is not None:
            stream.close()
            stream.release_conn()


def remove(key, bucket_name=None):
    try:
        client().remove_object(bucket_name or bucket(), key)
    except (MinioException, HTTPError, OSError):
        raise ResourceServiceError("文件删除失败") from None


def download(key, bucket_name=None, expiry=300, name=None):
    headers = (
        {"response-content-disposition": "attachment; filename*=UTF-8''" + quote(name)}
        if name
        else None
    )
    try:
        return client(public=True).presigned_get_object(
            bucket_name or bucket(),
            key,
            expires=timedelta(seconds=expiry),
            response_headers=headers,
        )
    except (MinioException, HTTPError, OSError):
        raise ResourceServiceError("无法生成下载链接") from None


def initialize_buckets():
    """Create missing buckets only; existing data and policies belong to the operator."""
    console = bucket()
    artifacts = getattr(settings, "SKILL_SANDBOX_ARTIFACT_BUCKET", "workflow-artifacts")
    if not artifacts or artifacts == console:
        raise ResourceServiceError("产物存储桶必须与Console存储桶不同")
    created = []
    try:
        sdk = client()
        for name in (console, artifacts):
            if sdk.bucket_exists(bucket_name=name):
                continue
            try:
                sdk.make_bucket(bucket_name=name)
                created.append(name)
            except S3Error as exc:
                if exc.code != "BucketAlreadyOwnedByYou":
                    raise
    except (MinioException, HTTPError, OSError, ValueError):
        raise ResourceServiceError("资源存储桶初始化失败") from None
    return created
