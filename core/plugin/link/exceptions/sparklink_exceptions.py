"""Custom exceptions for SparkLink plugin.

This module defines a hierarchy of custom exceptions used by the SparkLink
plugin to handle various error conditions in a structured way.
"""


class SparkLinkBaseException(Exception):
    """Base exception class for all SparkLink-related errors.

    Provides a structured way to handle errors with error codes,
    prefixes, and detailed error messages.
    """

    def __init__(self, code: int, err_pre: str, err: str) -> None:
        self.code = code
        self.message = f"{err_pre}: {err}"

    def __str__(self) -> str:
        return f"{self.message}"


class CallThirdApiException(SparkLinkBaseException):
    """Exception raised when third-party API calls fail.

    This exception is raised when there are issues calling external APIs
    or services that the SparkLink plugin depends on.
    """

    def __init__(self, code: int, err_pre: str, err: str) -> None:
        super().__init__(code=code, err_pre=err_pre, err=err)


class ToolNotExistsException(SparkLinkBaseException):
    """Exception raised when a requested tool does not exist.

    This exception is raised when attempting to access or use a tool
    that is not available or has not been registered.
    """

    def __init__(self, code: int, err_pre: str, err: str) -> None:
        super().__init__(code=code, err_pre=err_pre, err=err)


class SparkLinkOpenapiSchemaException(SparkLinkBaseException):
    """Exception raised when OpenAPI schema validation fails.

    This exception is raised when there are issues with OpenAPI schema
    parsing, validation, or structure problems.
    """

    def __init__(self, code: int, err_pre: str, err: str) -> None:
        super().__init__(code=code, err_pre=err_pre, err=err)


class SparkLinkJsonSchemaException(SparkLinkBaseException):
    """Exception raised when JSON schema validation fails.

    This exception is raised when JSON data does not conform to the
    expected schema or when schema validation encounters errors.
    """

    def __init__(self, code: int, err_pre: str, err: str) -> None:
        super().__init__(code=code, err_pre=err_pre, err=err)


class SparkLinkFunctionCallException(SparkLinkBaseException):
    """Exception raised when function calls fail or encounter errors.

    This exception is raised when there are issues executing functions
    or methods within the SparkLink plugin framework.
    """

    def __init__(self, code: int, err_pre: str, err: str) -> None:
        super().__init__(code=code, err_pre=err_pre, err=err)


class SparkLinkLLMException(SparkLinkBaseException):
    """Exception raised when LLM (Large Language Model) operations fail.

    This exception is raised when there are issues with LLM interactions,
    such as API calls, response processing, or model-related errors.
    """

    def __init__(self, code: int, err_pre: str, err: str) -> None:
        super().__init__(code=code, err_pre=err_pre, err=err)


class SparkLinkAppIdException(SparkLinkBaseException):
    """Exception raised when application ID validation or processing fails.

    This exception is raised when there are issues with application
    identification, authentication, or authorization processes.
    """

    def __init__(self, code: int, err_pre: str, err: str) -> None:
        super().__init__(code=code, err_pre=err_pre, err=err)


if __name__ == "__main__":
    try:
        raise ToolNotExistsException(code=1, err_pre="x", err="x")
    except SparkLinkBaseException as err:
        print(err.code)
    except Exception as err:
        print(err)
