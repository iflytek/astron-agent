from typing import Set

from pydantic import BaseModel


class MsgOrEndDepInfo(BaseModel):
    """
    Dependency information for message or end nodes.
    """

    node_dep: Set[str]
    data_dep: Set[str]
    data_dep_path_info: dict[str, bool]
