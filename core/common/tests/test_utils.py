"""
Tests for utility functions
"""

import base64
from unittest.mock import Mock, patch
from urllib.parse import urlparse

from common.utils.hmac_auth import HMACAuth


class TestHMACAuth:
    """Test HMACAuth class"""

    def test_build_auth_params_basic(self) -> None:
        """Test basic auth params building"""
        url = "https://api.example.com/test"
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            # Mock datetime to return a fixed time
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            params = HMACAuth.build_auth_params(url, method, api_key, api_secret)

            assert "host" in params
            assert "date" in params
            assert "authorization" in params
            assert params["host"] == "api.example.com"

    def test_build_auth_params_different_methods(self) -> None:
        """Test auth params with different HTTP methods"""
        url = "https://api.example.com/test"
        api_key = "test_key"
        api_secret = "test_secret"

        methods = ["GET", "POST", "PUT", "DELETE"]

        for method in methods:
            with patch("common.utils.hmac_auth.datetime") as mock_datetime:
                mock_now = Mock()
                mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
                mock_datetime.now.return_value = mock_now

                params = HMACAuth.build_auth_params(url, method, api_key, api_secret)

                assert "host" in params
                assert "date" in params
                assert "authorization" in params

    def test_build_auth_params_different_urls(self) -> None:
        """Test auth params with different URLs"""
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        urls = [
            "https://api.example.com/test",
            "https://api.example.com/v1/users",
            "https://api.example.com/v1/users/123",
            "http://localhost:8080/api/test",
        ]

        for url in urls:
            with patch("common.utils.hmac_auth.datetime") as mock_datetime:
                mock_now = Mock()
                mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
                mock_datetime.now.return_value = mock_now

                params = HMACAuth.build_auth_params(url, method, api_key, api_secret)

                assert "host" in params
                assert "date" in params
                assert "authorization" in params

                # Check host extraction
                parsed_url = urlparse(url)
                assert params["host"] == parsed_url.hostname

    def test_build_auth_request_url(self) -> None:
        """Test building auth request URL"""
        url = "https://api.example.com/test"
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            auth_url = HMACAuth.build_auth_request_url(url, method, api_key, api_secret)

            assert auth_url.startswith(url)
            assert "?" in auth_url
            assert "host=" in auth_url
            assert "date=" in auth_url
            assert "authorization=" in auth_url

    def test_build_auth_header_basic(self) -> None:
        """Test basic auth header building"""
        url = "https://api.example.com/test"
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            headers = HMACAuth.build_auth_header(url, method, api_key, api_secret)

            assert "Method" in headers
            assert "Host" in headers
            assert "Date" in headers
            assert "Digest" in headers
            assert "Authorization" in headers

            assert headers["Method"] == method
            assert headers["Host"] == "api.example.com"

    def test_build_auth_header_different_methods(self) -> None:
        """Test auth header with different HTTP methods"""
        url = "https://api.example.com/test"
        api_key = "test_key"
        api_secret = "test_secret"

        methods = ["GET", "POST", "PUT", "DELETE"]

        for method in methods:
            with patch("common.utils.hmac_auth.datetime") as mock_datetime:
                mock_now = Mock()
                mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
                mock_datetime.now.return_value = mock_now

                headers = HMACAuth.build_auth_header(url, method, api_key, api_secret)

                assert headers["Method"] == method
                assert "Authorization" in headers

    def test_authorization_format(self) -> None:
        """Test authorization header format"""
        url = "https://api.example.com/test"
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            headers = HMACAuth.build_auth_header(url, method, api_key, api_secret)
            auth_header = headers["Authorization"]

            # Check authorization header format
            assert "api_key=" in auth_header
            assert "algorithm=" in auth_header
            assert "headers=" in auth_header
            assert "signature=" in auth_header
            assert f'api_key="{api_key}"' in auth_header
            assert 'algorithm="hmac-sha256"' in auth_header

    def test_digest_format(self) -> None:
        """Test digest header format"""
        url = "https://api.example.com/test"
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            headers = HMACAuth.build_auth_header(url, method, api_key, api_secret)
            digest = headers["Digest"]

            # Check digest format
            assert digest.startswith("SHA256=")
            assert len(digest) > 7  # Should have base64 encoded content

    def test_signature_consistency(self) -> None:
        """Test signature consistency for same inputs"""
        url = "https://api.example.com/test"
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            # Generate auth params twice
            params1 = HMACAuth.build_auth_params(url, method, api_key, api_secret)
            params2 = HMACAuth.build_auth_params(url, method, api_key, api_secret)

            # Should be identical for same inputs
            assert params1["host"] == params2["host"]
            assert params1["date"] == params2["date"]
            assert params1["authorization"] == params2["authorization"]

    def test_empty_credentials(self) -> None:
        """Test with empty credentials"""
        url = "https://api.example.com/test"
        method = "GET"
        api_key = ""
        api_secret = ""

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            # Should not raise exception
            params = HMACAuth.build_auth_params(url, method, api_key, api_secret)
            assert "authorization" in params

            headers = HMACAuth.build_auth_header(url, method, api_key, api_secret)
            assert "Authorization" in headers

    def test_hmac_algorithm(self) -> None:
        """Test HMAC algorithm implementation"""
        url = "https://api.example.com/test"
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            params = HMACAuth.build_auth_params(url, method, api_key, api_secret)

            # Decode authorization to check signature
            auth_str = base64.b64decode(params["authorization"]).decode("utf-8")
            assert 'api_key="test_key"' in auth_str
            assert 'algorithm="hmac-sha256"' in auth_str
            assert 'headers="host date request-line"' in auth_str
            assert "signature=" in auth_str

    def test_url_parsing_edge_cases(self) -> None:
        """Test URL parsing edge cases"""
        method = "GET"
        api_key = "test_key"
        api_secret = "test_secret"

        edge_case_urls = [
            "https://api.example.com/",
            "https://api.example.com",
            "https://api.example.com:8080/test",
            "https://api.example.com/test?param=value",
            "https://api.example.com/test#fragment",
        ]

        for url in edge_case_urls:
            with patch("common.utils.hmac_auth.datetime") as mock_datetime:
                mock_now = Mock()
                mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
                mock_datetime.now.return_value = mock_now

                # Should not raise exception
                params = HMACAuth.build_auth_params(url, method, api_key, api_secret)
                assert "host" in params
                assert "date" in params
                assert "authorization" in params


class TestHMACAuthIntegration:
    """Test HMACAuth integration scenarios"""

    def test_complete_auth_flow(self) -> None:
        """Test complete authentication flow"""
        url = "https://api.example.com/v1/users"
        method = "POST"
        api_key = "my_api_key"
        api_secret = "my_secret_key"

        with patch("common.utils.hmac_auth.datetime") as mock_datetime:
            mock_now = Mock()
            mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
            mock_datetime.now.return_value = mock_now

            # Test both methods
            params = HMACAuth.build_auth_params(url, method, api_key, api_secret)
            headers = HMACAuth.build_auth_header(url, method, api_key, api_secret)
            auth_url = HMACAuth.build_auth_request_url(url, method, api_key, api_secret)

            # All should contain authentication information
            assert "authorization" in params
            assert "Authorization" in headers
            assert "authorization=" in auth_url

            # Host should be consistent
            assert params["host"] == headers["Host"]
            assert params["host"] == "api.example.com"

    def test_different_credentials(self) -> None:
        """Test with different credential combinations"""
        url = "https://api.example.com/test"
        method = "GET"

        credential_sets = [
            ("key1", "secret1"),
            ("key2", "secret2"),
            ("long_api_key_12345", "very_long_secret_key_67890"),
            ("special-chars!@#", "special-secret$%^"),
        ]

        for api_key, api_secret in credential_sets:
            with patch("common.utils.hmac_auth.datetime") as mock_datetime:
                mock_now = Mock()
                mock_now.timetuple.return_value = (2023, 1, 1, 12, 0, 0, 0, 1, 0)
                mock_datetime.now.return_value = mock_now

                params = HMACAuth.build_auth_params(url, method, api_key, api_secret)
                headers = HMACAuth.build_auth_header(url, method, api_key, api_secret)

                # Should work with any credentials
                assert "authorization" in params
                assert "Authorization" in headers

                # API key should be in authorization
                auth_str = base64.b64decode(params["authorization"]).decode("utf-8")
                assert f'api_key="{api_key}"' in auth_str
