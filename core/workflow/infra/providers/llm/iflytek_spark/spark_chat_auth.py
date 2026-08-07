"""
HMAC authentication module for iFlytek Spark Chat API.

This module implements the HMAC-SHA256 authentication mechanism required
for accessing the Spark Chat WebSocket API endpoints.
"""

import base64
import datetime
import hashlib
import hmac
from time import mktime
from urllib.parse import urlencode, urlparse
from wsgiref.handlers import format_date_time


class SparkChatHmacAuth:
    """
    HMAC authentication handler for Spark Chat API.

    This class handles the generation of authenticated URLs for Spark Chat API
    using HMAC-SHA256 signature mechanism as required by iFlytek's API.
    """

    def __init__(self, url: str, api_key: str, api_secret: str):
        """
        Initialize the HMAC authentication handler.

        :param url: The base URL for the Spark Chat API endpoint
        :param api_key: The API key for authentication
        :param api_secret: The API secret for HMAC signature generation
        """
        self.url = url
        self.api_key = api_key
        self.api_secret = api_secret

    def create_url(self) -> str:
        """
        Create an authenticated URL for Spark Chat API access.

        This method implements the HMAC-SHA256 authentication flow:
        1. Parse the URL to extract host and path
        2. Generate RFC1123 formatted timestamp
        3. Create signature string with host, date, and request line
        4. Generate HMAC-SHA256 signature using the API secret
        5. Encode authorization header with base64
        6. Append authentication parameters to the URL

        :return: Authenticated URL with HMAC signature parameters
        """
        # Parse URL information
        parsed_url = urlparse(url=self.url)
        host = parsed_url.netloc
        path = parsed_url.path

        # Generate RFC1123 formatted timestamp
        now = datetime.datetime.now()
        date = format_date_time(mktime(now.timetuple()))

        # Construct signature string
        signature_origin = "host: " + host + "\n"
        signature_origin += "date: " + date + "\n"
        signature_origin += "GET " + path + " HTTP/1.1"

        # Generate HMAC-SHA256 signature
        signature_sha = hmac.new(
            self.api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).digest()

        # Generate authorization information
        signature_sha_base64 = base64.b64encode(signature_sha).decode(encoding="utf-8")
        algorithm = 'algorithm="hmac-sha256"'
        header_text = 'headers="host date request-line"'
        authorization_origin = f'api_key="{self.api_key}", {algorithm}, {header_text}, signature="{signature_sha_base64}"'

        authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode(
            encoding="utf-8"
        )

        # Combine authentication parameters into dictionary
        v = {"authorization": authorization, "date": date, "host": host}
        # Append authentication parameters to generate final URL
        url = self.url + "?" + urlencode(v)

        return url
