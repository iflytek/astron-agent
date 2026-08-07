"""URL utility module providing URL validation functionality."""

from typing import Optional
from urllib.parse import urlparse


def is_valid_url(url: Optional[str]) -> bool:
    """Validate whether the given string is a valid URL."""
    try:
        if not url or not isinstance(url, str):
            return False

        # Strip whitespace
        url = url.strip()
        if not url:
            return False

        result = urlparse(url)

        # Must have scheme and netloc
        if not result.scheme or not result.netloc:
            return False

        # Netloc should not be just whitespace, dots, or contain spaces
        netloc = result.netloc.strip()
        if (
            not netloc
            or netloc in [".", ".."]
            or netloc.isspace()
            or " " in result.netloc
        ):
            return False

        # Scheme should be valid (no spaces, from known schemes)
        valid_schemes = {"http", "https", "ftp", "ftps", "file", "ws", "wss"}
        if " " in result.scheme or result.scheme.lower() not in valid_schemes:
            return False

        return True
    except (ValueError, AttributeError, TypeError):
        return False
