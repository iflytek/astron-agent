"""Provider-independent model output formats."""

from enum import Enum


class RespFormatEnum(Enum):
    TEXT = 0
    MARKDOWN = 1
    JSON = 2
