"""Unit tests for URL utility functions.

This module contains comprehensive tests for URL validation functionality
including various URL formats and edge cases.
"""

from typing import Any

import pytest
from plugin.rpa.utils.urls.url_util import is_valid_url


class TestIsValidUrl:
    """Test class for is_valid_url function."""

    def test_is_valid_url_with_http_scheme(self) -> None:
        """Test is_valid_url with valid HTTP URLs."""
        # Test cases with HTTP scheme
        valid_http_urls = [
            "http://example.com",
            "http://www.example.com",
            "http://example.com/path",
            "http://example.com:8080",
            "http://example.com/path?query=value",
            "http://example.com/path#fragment",
            "http://sub.example.com",
            "http://192.168.1.1",
            "http://localhost",
        ]

        for url in valid_http_urls:
            # Assert
            assert is_valid_url(url) is True, f"URL should be valid: {url}"

    def test_is_valid_url_with_https_scheme(self) -> None:
        """Test is_valid_url with valid HTTPS URLs."""
        # Test cases with HTTPS scheme
        valid_https_urls = [
            "https://example.com",
            "https://www.example.com",
            "https://example.com/secure/path",
            "https://example.com:443",
            "https://api.example.com/v1/endpoint",
            "https://sub.domain.example.com",
            "https://192.168.1.1:8443",
            "https://localhost:3000",
        ]

        for url in valid_https_urls:
            # Assert
            assert is_valid_url(url) is True, f"URL should be valid: {url}"

    def test_is_valid_url_with_other_schemes(self) -> None:
        """Test is_valid_url with other valid URL schemes."""
        # Test cases with various schemes
        valid_other_urls = [
            "ftp://files.example.com",
            "ftps://secure.files.example.com",
            "file://localhost/path/to/file",
            "ws://websocket.example.com",
            "wss://secure.websocket.example.com",
        ]

        for url in valid_other_urls:
            # Assert
            assert is_valid_url(url) is True, f"URL should be valid: {url}"

    def test_is_valid_url_with_invalid_urls(self) -> None:
        """Test is_valid_url with invalid URLs."""
        # Test cases with invalid URLs
        invalid_urls = [
            "not-a-url",
            "http://",
            "https://",
            "://example.com",
            "example.com",  # Missing scheme
            "www.example.com",  # Missing scheme
            "http:/example.com",  # Single slash
            "http:///example.com",  # Triple slash
            "",  # Empty string
            "   ",  # Whitespace only
            "http:// example.com",  # Space in URL
            "http://",  # No domain
            "://",  # No scheme or domain
        ]

        for url in invalid_urls:
            # Assert
            assert is_valid_url(url) is False, f"URL should be invalid: {url}"

    def test_is_valid_url_with_none_input(self) -> None:
        """Test is_valid_url with None input."""
        # Act & Assert
        assert is_valid_url(None) is False

    def test_is_valid_url_with_empty_string(self) -> None:
        """Test is_valid_url with empty string."""
        # Act & Assert
        assert is_valid_url("") is False

    def test_is_valid_url_with_complex_urls(self) -> None:
        """Test is_valid_url with complex URL structures."""
        # Complex but valid URLs
        complex_valid_urls = [
            "https://user:password@example.com:8080/path/to/resource?param1=value1&param2=value2#section",
            "http://subdomain.example.co.uk/api/v2/users?filter[status]=active&sort=name",
            "https://api.example.com/v1/users/123/profile?include=avatar,settings",
            "ftp://user@files.example.com:21/directory/file.txt",
            "https://example.com/path%20with%20spaces",
            "http://[2001:db8::1]:8080/path",  # IPv6
            "https://xn--nxasmq6b.xn--o3cw4h/path",  # Internationalized domain
        ]

        for url in complex_valid_urls:
            # Assert
            assert is_valid_url(url) is True, f"Complex URL should be valid: {url}"

    def test_is_valid_url_with_malformed_urls(self) -> None:
        """Test is_valid_url with malformed URLs."""
        # Malformed URLs that should be invalid
        malformed_urls = [
            "http:///",
            "https:///",
            "http://.",
            "http://..",
            "http://../",
            "http://?",
            "http://#",
            "http:// ",
            "http://[",
            "http://]",
            "://example.com",
            "http//example.com",  # Missing colon
            "httpss://example.com",  # Invalid scheme
        ]

        for url in malformed_urls:
            # Assert
            assert is_valid_url(url) is False, f"Malformed URL should be invalid: {url}"

    def test_is_valid_url_edge_cases(self) -> None:
        """Test is_valid_url with edge cases."""
        # Edge cases
        edge_cases = [
            ("http://example", True),  # No TLD but valid
            ("http://localhost", True),  # Localhost
            ("http://127.0.0.1", True),  # IP address
            ("http://example.com.", True),  # Trailing dot
            ("http://EXAMPLE.COM", True),  # Uppercase domain
            ("HTTP://EXAMPLE.COM", True),  # Uppercase scheme
        ]

        for url, expected in edge_cases:
            # Assert
            assert (
                is_valid_url(url) is expected
            ), f"URL {url} should be {'valid' if expected else 'invalid'}"

    def test_is_valid_url_with_unicode(self) -> None:
        """Test is_valid_url with Unicode characters."""
        # Unicode URLs (should handle gracefully)
        unicode_urls = ["https://例え.テスト", "http://müller.com", "https://тест.рф"]

        for url in unicode_urls:
            # Act
            result = is_valid_url(url)
            # Assert - should not raise an exception
            assert isinstance(
                result, bool
            ), f"Should return boolean for Unicode URL: {url}"

    def test_is_valid_url_exception_handling(self) -> None:
        """Test is_valid_url handles exceptions gracefully."""
        # Test with values that might cause exceptions
        problematic_values = [
            123,  # Integer
            [],  # List
            {},  # Dictionary
            object(),  # Object
        ]

        for value in problematic_values:
            # Act & Assert - should not raise exception
            result = is_valid_url(value)  # type: ignore[arg-type]
            assert (
                result is False
            ), f"Should return False for non-string input: {type(value)}"

    def test_is_valid_url_with_ports(self) -> None:
        """Test is_valid_url with various port configurations."""
        # URLs with ports
        port_urls = [
            ("http://example.com:80", True),
            ("https://example.com:443", True),
            ("http://example.com:8080", True),
            ("https://example.com:8443", True),
            ("http://example.com:0", True),
            ("http://example.com:65535", True),
            ("http://example.com:99999", True),  # Invalid port but still parsed
        ]

        for url, expected in port_urls:
            # Assert
            assert (
                is_valid_url(url) is expected
            ), f"URL with port {url} should be {'valid' if expected else 'invalid'}"

    def test_is_valid_url_return_type(self) -> None:
        """Test that is_valid_url always returns a boolean."""
        # Test various inputs to ensure boolean return
        test_inputs: list[Any] = [
            "https://example.com",
            "invalid-url",
            None,
            "",
            123,
            [],
        ]

        for input_value in test_inputs:
            # Act
            result = is_valid_url(input_value)  # type: ignore[arg-type]
            # Assert
            assert isinstance(
                result, bool
            ), f"Should return boolean for input: {input_value}"
