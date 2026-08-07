from pydantic import BaseModel, Field

from workflow.consts.engine.error_handler import ErrorHandler


class RetryConfig(BaseModel):
    """
    Configuration for node retry mechanism.

    :param timeout: Maximum timeout in seconds for node execution
    :param should_retry: Whether to enable retry mechanism
    :param max_retries: Maximum number of retry attempts
    :param error_strategy: Error handling strategy when retry fails
    :param custom_output: Custom output to return when retry fails
    """

    timeout: float = Field(default=60, alias="timeout")
    should_retry: bool = Field(default=False, alias="shouldRetry")
    max_retries: int = Field(default=0, alias="maxRetries")
    error_strategy: int = Field(
        default=ErrorHandler.Interrupted.value, alias="errorStrategy"
    )
    custom_output: dict = Field(default_factory=dict, alias="customOutput")
