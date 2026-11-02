# pylint: disable=invalid-name
"""
Error code conversion utilities for third-party APIs.

This module provides conversion functions to map third-party API error codes
to internal system error codes for consistent error handling across the
workflow system. It acts as a translation layer between external services
and the internal error management system, ensuring that all errors are
handled uniformly regardless of their source.

Key Features:
- Standardized error code mapping from external services to internal codes
- Support for multiple third-party service types (image generation, tools)
- Fallback handling for unknown or unrecognized error codes
- Consistent error categorization across different service providers
- Integration with the workflow system's error handling framework

The conversion utilities ensure that external service errors are properly
categorized and handled according to the workflow system's error management
standards, providing consistent error reporting and handling across all
integrated services.
"""

from workflow.exception.errors.err_code import CodeEnum
from workflow.exception.errors.third_api_code import ThirdApiCodeEnum


class CodeConvert:
    """
    Third-party API error code conversion utility.

    This class provides static methods to convert error codes from various
    third-party services to internal system error codes. It ensures consistent
    error handling by mapping external service errors to standardized internal
    error codes with appropriate fallback handling for unknown error codes.

    Supported services:
    - Image generation services
    - SparkLink tool services
    """

    @staticmethod
    def sparkLinkCode(code: int) -> CodeEnum:
        """
        Convert SparkLink tool service error codes to internal error codes.

        Maps SparkLink tool service errors to standardized internal error codes.
        This method handles errors from external tool integration services,
        including initialization failures, protocol validation errors, and
        execution problems.

        The method provides comprehensive error mapping for:
        - Tool initialization and setup failures
        - JSON protocol parsing and validation errors
        - OpenAPI schema validation and parsing issues
        - Tool server and operation existence checks
        - Official and third-party tool request failures
        - Tool connection and execution errors

        Returns a generic action error for unrecognized codes to ensure
        consistent error handling across all tool integration scenarios.

        :param code: Third-party SparkLink service error code (integer)
        :return: Corresponding internal error code enum for consistent handling
        """
        match code:
            case ThirdApiCodeEnum.SPARK_LINK_APP_INIT_ERROR.code:
                return CodeEnum.SPARK_LINK_APP_INIT_ERROR
            case ThirdApiCodeEnum.SPARK_LINK_COMMON_ERROR.code:
                return CodeEnum.SPARK_LINK_COMMON_ERROR
            case ThirdApiCodeEnum.SPARK_LINK_JSON_PROTOCOL_PARSER_ERROR.code:
                return CodeEnum.SPARK_LINK_JSON_PROTOCOL_PARSER_ERROR
            case ThirdApiCodeEnum.SPARK_LINK_JSON_SCHEMA_VALIDATE_ERROR.code:
                return CodeEnum.SPARK_LINK_JSON_SCHEMA_VALIDATE_ERROR
            case ThirdApiCodeEnum.SPARK_LINK_OPENAPI_SCHEMA_VALIDATE_ERROR.code:
                return CodeEnum.SPARK_LINK_OPENAPI_SCHEMA_VALIDATE_ERROR
            case (
                ThirdApiCodeEnum.SPARK_LINK_OPENAPI_SCHEMA_BODY_TYPE_NOT_SUPPORT_ERROR.code
            ):
                return CodeEnum.SPARK_LINK_OPENAPI_SCHEMA_BODY_TYPE_NOT_SUPPORT_ERROR
            case ThirdApiCodeEnum.SPARK_LINK_OPENAPI_SCHEMA_SERVER_NOT_EXIST_ERROR.code:
                return CodeEnum.SPARK_LINK_OPENAPI_SCHEMA_SERVER_NOT_EXIST_ERROR
            case (
                ThirdApiCodeEnum.SPARK_LINK_OFFICIAL_THIRD_API_REQUEST_FAILED_ERROR.code
            ):
                return CodeEnum.SPARK_LINK_OFFICIAL_THIRD_API_REQUEST_FAILED_ERROR
            case ThirdApiCodeEnum.SPARK_LINK_THIRD_API_REQUEST_FAILED_ERROR.code:
                return CodeEnum.SPARK_LINK_THIRD_API_REQUEST_FAILED_ERROR
            case ThirdApiCodeEnum.SPARK_LINK_TOOL_NOT_EXIST_ERROR.code:
                return CodeEnum.SPARK_LINK_TOOL_NOT_EXIST_ERROR
            case ThirdApiCodeEnum.SPARK_LINK_OPERATION_ID_NOT_EXIST_ERROR.code:
                return CodeEnum.SPARK_LINK_OPERATION_ID_NOT_EXIST_ERROR
            case _:
                return CodeEnum.SPARK_LINK_ERROR
