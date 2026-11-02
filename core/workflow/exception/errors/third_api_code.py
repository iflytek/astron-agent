"""
Third-party API error code definitions.

This module defines error codes returned by various third-party services
that are integrated with the workflow system. These codes represent the
raw error responses from external APIs before they are converted to
internal system error codes for consistent handling.

The error codes in this module are the original error codes returned by
external services and are used as input to the CodeConvert utility for
mapping to internal system error codes. This separation ensures that
external service changes don't directly impact the internal error handling
system.

Supported third-party services:
- Spark AI models and engines (comprehensive error coverage)
- Image generation services (format, schema, and audit errors)
- SparkLink tool services (initialization, protocol, and execution errors)
- Code execution environments (pod readiness and execution failures)
- Content audit services (compliance and violation detection)

Error Code Ranges by Service:
- Code execution: 1, 10405 (pod and execution errors)
- Image generation: 10003-10022 (format, schema, capacity, audit errors)
- SparkLink tools: 30001-30600 (initialization, protocol, execution errors)
- Spark models: 10000-11203 (WebSocket, auth, rate limiting, engine errors)
- Audit services: 999999 (internal audit service errors)

These codes are systematically organized to facilitate error mapping and
provide clear categorization for different types of external service failures.
"""

from enum import Enum


class ThirdApiCodeEnum(Enum):
    """
    Enumeration of third-party API error codes.

    Each error code is defined as a tuple containing:
    - code: Integer error code from third-party service
    - msg: Human-readable error message from the external service

    Error codes are organized by service type with specific ranges:
    - Code execution errors (10405, 1): Pod readiness and execution failures
    - Image generation errors (10003-10022): AI image generation service errors
    - SparkLink tool errors (30001-30600): External tool integration errors
    - Spark model errors (10000-11203): AI model service errors including WebSocket,
                                        auth, and rate limiting
    - Audit errors (999999): Content audit service internal errors

    These codes are used as input to the CodeConvert utility for mapping
    to internal system error codes.
    """

    SUCCESS = (0, "Success")

    # Code execution errors
    CODE_EXECUTE_POD_NOT_READY_ERROR = (
        10405,
        "Pod is not ready yet, please try again later",
    )
    CODE_EXECUTE_ERROR = (1, "exec code error::exit status 1")
    CODE_EXECUTE_LINUXSERRROR = (10407, "linux_user_error")
    CODE_EXECUTE_NOAVAILABLEINSTANCE = (10406, "no_available_instance")

    # SparkLink related errors
    SPARK_LINK_APP_INIT_ERROR = (30001, "Initialization failed")
    SPARK_LINK_COMMON_ERROR = (30100, "General error")
    SPARK_LINK_JSON_PROTOCOL_PARSER_ERROR = (30200, "JSON protocol parsing failed")
    SPARK_LINK_JSON_SCHEMA_VALIDATE_ERROR = (30201, "Protocol validation failed")
    SPARK_LINK_OPENAPI_SCHEMA_VALIDATE_ERROR = (
        30300,
        "OpenAPI protocol parsing failed",
    )
    SPARK_LINK_OPENAPI_SCHEMA_BODY_TYPE_NOT_SUPPORT_ERROR = (
        30301,
        "Body type not supported",
    )
    SPARK_LINK_OPENAPI_SCHEMA_SERVER_NOT_EXIST_ERROR = (30302, "Server does not exist")
    SPARK_LINK_OFFICIAL_THIRD_API_REQUEST_FAILED_ERROR = (
        30400,
        "Official tool request failed",
    )
    SPARK_LINK_THIRD_API_REQUEST_FAILED_ERROR = (
        30403,
        "Third-party tool request failed",
    )
    SPARK_LINK_TOOL_NOT_EXIST_ERROR = (30500, "Tool does not exist")
    SPARK_LINK_OPERATION_ID_NOT_EXIST_ERROR = (30600, "Operation does not exist")

    # Audit related errors
    AUDIT_ERROR = (999999, "Server internal error")

    @property
    def code(self) -> int:
        """
        Get the numeric error code from third-party service.

        Returns the original integer error code as returned by the external API.
        This code is used as input to the CodeConvert utility for mapping to
        internal system error codes. The codes are organized by service type
        with specific ranges to facilitate error categorization and mapping.

        :return: Integer error code as returned by the external API
        """
        return self.value[0]

    @property
    def msg(self) -> str:
        """
        Get the error message from third-party service.

        Returns the original error message as returned by the external API.
        This message provides the raw error description from the third-party
        service and is used for reference during error mapping and debugging.
        The messages are typically in the language and format provided by
        the external service.

        :return: Error message as returned by the external API
        """
        return self.value[1]
