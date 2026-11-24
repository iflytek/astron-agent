"""Store account avatars in the Console bucket under profile-specific keys."""

import logging
import re
import uuid
from io import BytesIO

from django.core.exceptions import ValidationError
from PIL import Image, ImageOps

from astron_console.knowledge import storage
from astron_console.knowledge.clients import ResourceServiceError

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
AVATAR_PATH = "/console-api/user-info/avatar/"
AVATAR_NAME = re.compile(r"[0-9a-f]{32}\.png")
LEGACY_DEFAULTS = {
    "https://cdn.casbin.org/img/casbin.svg",
    "http://cdn.casbin.org/img/casbin.svg",
}


def display_url(value):
    return value if value and value not in LEGACY_DEFAULTS else ""


def object_key(profile_id, name):
    if not AVATAR_NAME.fullmatch(name):
        return None
    return f"account-avatars/{profile_id}/{name}"


def stored_key(profile_id, url):
    prefix = f"{AVATAR_PATH}{profile_id}/"
    if url and url.startswith(prefix):
        return object_key(profile_id, url.removeprefix(prefix))
    return None


def prepare(upload):
    if not 0 < upload.size <= MAX_UPLOAD_BYTES:
        raise ValidationError("请选择不超过 5 MB 的图片")
    encoded = BytesIO()
    try:
        with Image.open(upload, formats=("JPEG", "PNG", "WEBP")) as image:
            if image.width * image.height > 16_000_000:
                raise ValidationError("图片尺寸过大，请缩小后重试")
            ImageOps.exif_transpose(image, in_place=True)
            image.thumbnail((512, 512))
            with image.convert("RGBA") as avatar:
                avatar.info.clear()
                avatar.save(encoded, format="PNG")
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError):
        raise ValidationError("请选择有效的 PNG、JPEG 或 WebP 图片") from None
    size = encoded.tell()
    encoded.seek(0)
    return encoded, size


def upload(profile_id, encoded, size):
    name = f"{uuid.uuid4().hex}.png"
    key = object_key(profile_id, name)
    try:
        storage.put(key, encoded, size, "image/png")
    except ResourceServiceError:
        remove(key)
        raise
    return f"{AVATAR_PATH}{profile_id}/{name}", key


def remove(key):
    try:
        storage.remove(key)
    except ResourceServiceError:
        logger.warning("Unable to remove account avatar object %s", key)
