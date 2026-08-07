import os
from typing import Tuple
from urllib.parse import urlparse

from knowledge.exceptions.exception import ProtocolParamException


def get_file_extension_from_url(url: str) -> str:
    # Use urlparse to parse URL
    parsed_url = urlparse(url)
    # Extract path part
    path = parsed_url.path
    # If path ends with slash (e.g., directory), there's no file extension
    if not path or path.endswith("/"):
        raise ProtocolParamException("The file address is incorrect")
    # Use os.path.splitext to split filename and extension
    base_name, extension = os.path.splitext(os.path.basename(path))
    # Return extension (without dot)
    return extension[1:] if extension else ""


def get_file_info_from_url(url: str) -> Tuple[str, str, str]:
    # Use urlparse to parse URL
    parsed_url = urlparse(url)
    # Extract path part
    path = parsed_url.path
    # If path ends with slash (e.g., directory), there's no file extension
    if not path or path.endswith("/"):
        raise ProtocolParamException("The file address is incorrect")
    # Use os.path.splitext to split filename and extension
    file_name = os.path.basename(path)
    file_base_name, extension = os.path.splitext(os.path.basename(path))
    # Return extension (without dot)
    file_extension = extension[1:] if extension else ""

    return file_name, file_base_name, file_extension
