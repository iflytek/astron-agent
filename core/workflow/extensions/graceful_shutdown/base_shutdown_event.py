from abc import ABC, abstractmethod


class BaseShutdownEvent(ABC):
    """
    Abstract base class for shutdown event management.

    This class defines the interface for checking whether shutdown events
    have been properly cleared, allowing for graceful shutdown coordination
    across different components of the application.
    """

    @abstractmethod
    def is_cleared(self) -> bool:
        """
        Check if all shutdown events have been cleared.

        :return: True if all events are cleared and safe to shutdown, False otherwise
        :raises NotImplementedError: Must be implemented by subclasses
        """
        raise NotImplementedError
