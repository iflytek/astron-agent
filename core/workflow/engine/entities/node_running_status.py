from asyncio import Event

from pydantic import Field


class NodeRunningStatus:
    """
    Tracks the execution status of a node using asyncio Events.
    """

    # Thread started
    start_with_thread: Event = Field(default_factory=Event)
    # Pre-processing, typically used for message nodes or end nodes driven by engine for early execution
    pre_processing: Event = Field(default_factory=Event)
    # Currently processing
    processing: Event = Field(default_factory=Event)
    # Execution completed
    complete: Event = Field(default_factory=Event)

    """
    Node will not execute
    When complete = true and not_run = true, it means the node logic runs but actually doesn't execute
    """
    not_run: Event = Field(default_factory=Event)

    def __init__(self) -> None:
        """
        Initialize all status events for the node.
        """
        self.start_with_thread = Event()
        self.pre_processing = Event()
        self.processing = Event()
        self.complete = Event()
        self.not_run = Event()
