"""Custom exceptions for configuration and task management."""


class ConfigNotFoundException(Exception):
    """Exception raised when the configuration file is not found."""

    def __init__(self, path: str) -> None:
        self.message = f"Configuration file not found at path: {path}"
        super().__init__(self.message)

    def __str__(self) -> str:
        return f"[Exception] {self.message}"


class EnvNotFoundException(Exception):
    """Exception raised when the environment is not found."""

    def __init__(self, env_key: str) -> None:
        self.message = f"Environment not found at key: {env_key}"
        super().__init__(self.message)

    def __str__(self) -> str:
        return f"[Exception] {self.message}"


class InvalidConfigException(Exception):
    """Exception raised for invalid configuration."""

    def __init__(self, details: str) -> None:
        self.message = f"Invalid configuration: {details}"
        super().__init__(self.message)

    def __str__(self) -> str:
        return f"[Exception] {self.message}"


class CreatTaskException(Exception):
    """Exception raised when task creation fails."""

    def __init__(self, details: str) -> None:
        self.message = f"Task creation failed: {details}"
        super().__init__(self.message)

    def __str__(self) -> str:
        return f"[Exception] {self.message}"


class QueryTaskException(Exception):
    """Exception raised when querying task status fails."""

    def __init__(self, details: str) -> None:
        self.message = f"Querying task status failed: {details}"
        super().__init__(self.message)

    def __str__(self) -> str:
        return f"[Exception] {self.message}"
