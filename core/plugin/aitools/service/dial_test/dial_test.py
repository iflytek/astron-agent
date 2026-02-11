"""
Dial test service module providing health checks and service availability monitoring.
"""

# pylint: disable=line-too-long,broad-exception-caught,unused-argument
from typing import Any, Dict, Optional

import requests
from fastapi import Request
from plugin.aitools.api.decorators.api_service import api_service
from pydantic import BaseModel, Field


class DialtestQuery(BaseModel):
    """Dial test query model"""

    test: str = Field(
        ...,
        description="Test type (e.g. ping, tcp, http)",
        examples=["ping", "tcp", "http"],
    )


class DialtestBody(BaseModel):
    """Dial test body model"""

    test: str = Field(
        ...,
        description="Test type (e.g. ping, tcp, http)",
        examples=["ping", "tcp", "http"],
    )


class DialtestHeaders(BaseModel):
    """Dial test headers model"""

    test: str = Field(
        ...,
        description="Test type (e.g. ping, tcp, http)",
        examples=["ping", "tcp", "http"],
    )


@api_service(
    method="POST",
    path="/aitools/v1/dial_test",
    query=DialtestQuery,
    body=DialtestBody,
    headers=DialtestHeaders,
    response=list,
    summary="Dial test service",
    description="Health checks and service availability monitoring.",
    tags=["unclassified"],
    deprecated=False,
)
async def dial_test_servic(
    request: Request,
    query: DialtestQuery,
    body: DialtestBody,
    headers: DialtestHeaders,
) -> list:
    """Dial test service"""
    return ["message", "Dial test service"]
    # return dial_test_main(
    #     method="GET",
    #     url="http://localhost/health",
    #     headers={},
    #     payload={},
    #     _success_code=200,
    #     _call_frequency=1,
    # )


def dial_test_main(
    method: str,
    url: str,
    headers: Dict[str, str],
    payload: Dict[str, Any],
    _success_code: int,
    _call_frequency: int,
) -> Optional[Dict[str, Any]]:
    """Execute HTTP request with specified parameters for dial testing.

    This function performs HTTP requests with comprehensive error handling
    for testing API endpoints. All 6 parameters are necessary for complete
    testing configuration:

    Args:
        method (str): HTTP method (GET, POST, PUT, DELETE) - Required for request type
        url (str): Target URL endpoint - Required for request destination
        headers (dict): HTTP headers dict - Required for authentication/content-type
        payload (dict): Request body data - Required for POST/PUT operations
        success_code (int): Expected success status code - Required for validation
        call_frequency (int): Frequency to call the endpoint - Required for load testing

    Returns:
        dict: JSON response from the API if successful, None if failed

    Note:
        All parameters are essential for comprehensive API testing:
        - method: Determines request behavior
        - url: Specifies target endpoint
        - headers: Provides authentication and metadata
        - payload: Contains request data
        - success_code: Validates response correctness
        - call_frequency: Enables load/stress testing
    """
    try:
        print(f"Sending {method} request to {url}")
        # Use json parameter to ensure payload is serialized correctly as JSON
        response = requests.request(
            method, url, headers=headers, json=payload, timeout=10
        )  # Send request with timeout of 10 seconds
        response.raise_for_status()  # If response status code is not in 200 range, raise HTTPError
        # print("Response received successfully.")
        # print(response.json())
        return response.json()
    except requests.exceptions.Timeout:
        print("The request timed out.")
        return None
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")  # Print HTTPError message
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None
