"""Resource payload used by the internal single-command compatibility API."""

from pydantic import BaseModel


class SkillResource(BaseModel):
    path: str
    name: str = ""
    download_url: str = ""
    file_ext: str = ""
    file_size: int = 0
