from enum import Enum


class EndNodeOutputModeEnum(Enum):
    """
    Enumeration of output modes for end nodes.
    """

    VARIABLE_MODE = 0
    PROMPT_MODE = 1
    OLD_PROMPT_MODE = (
        2  # Used for compatibility with old protocol data configured for output
    )
