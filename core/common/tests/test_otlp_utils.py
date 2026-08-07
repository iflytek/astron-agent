"""
Tests for OTLP utility functions
"""

from unittest.mock import Mock, patch

import pytest

from common.otlp.ip import get_host_ip, local_ip
from common.otlp.sid import SidGenerator2, SidInfo, init_sid


class TestIPUtils:
    """Test IP utility functions"""

    def test_get_host_ip_success(self) -> None:
        """Test successful IP retrieval"""
        with patch("socket.socket") as mock_socket:
            # Mock socket behavior
            mock_sock = Mock()
            mock_sock.getsockname.return_value = ("192.168.1.100", 12345)
            mock_socket.return_value = mock_sock

            ip = get_host_ip()

            assert ip == "192.168.1.100"
            mock_sock.connect.assert_called_once_with(("8.8.8.8", 80))
            mock_sock.close.assert_called_once()

    def test_get_host_ip_exception(self) -> None:
        """Test IP retrieval with exception"""
        with patch("socket.socket") as mock_socket:
            # Mock socket to raise exception
            mock_socket.side_effect = Exception("Network error")

            # This will raise an exception due to the finally block
            with pytest.raises(Exception):
                get_host_ip()

    def test_local_ip_initialization(self) -> None:
        """Test local_ip is initialized"""
        # local_ip should be set when module is imported
        assert isinstance(local_ip, str)

    def test_get_host_ip_network_behavior(self) -> None:
        """Test get_host_ip with different network scenarios"""
        test_cases = [
            ("10.0.0.1", "10.0.0.1"),
            ("172.16.0.1", "172.16.0.1"),
            ("192.168.1.1", "192.168.1.1"),
        ]

        for expected_ip, mock_ip in test_cases:
            with patch("socket.socket") as mock_socket:
                mock_sock = Mock()
                mock_sock.getsockname.return_value = (mock_ip, 12345)
                mock_socket.return_value = mock_sock

                ip = get_host_ip()
                assert ip == expected_ip


class TestSidInfo:
    """Test SidInfo model"""

    def test_sid_info_creation(self) -> None:
        """Test SidInfo model creation"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="8080",
        )

        assert sid_info.sub == "test"
        assert sid_info.location == "us-west"
        assert sid_info.index == 1
        assert sid_info.local_ip == "192.168.1.100"
        assert sid_info.local_port == "8080"

    def test_sid_info_validation(self) -> None:
        """Test SidInfo model validation"""
        # Valid data should work
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="8080",
        )
        assert sid_info is not None

    def test_sid_info_serialization(self) -> None:
        """Test SidInfo model serialization"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="8080",
        )

        # Test dict conversion
        data = sid_info.model_dump()
        assert data["sub"] == "test"
        assert data["location"] == "us-west"
        assert data["index"] == 1
        assert data["local_ip"] == "192.168.1.100"
        assert data["local_port"] == "8080"


class TestSidGenerator2:
    """Test SidGenerator2 class"""

    def test_init_valid_ip(self) -> None:
        """Test SidGenerator2 initialization with valid IP"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="8080",
        )

        generator = SidGenerator2(sid_info)
        assert generator.sid_info == sid_info
        assert hasattr(generator, "short_local_ip")

    def test_init_invalid_ip(self) -> None:
        """Test SidGenerator2 initialization with invalid IP"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="invalid-ip",
            local_port="8080",
        )

        with pytest.raises(OSError, match="illegal IP address"):
            SidGenerator2(sid_info)

    def test_init_short_port(self) -> None:
        """Test SidGenerator2 initialization with short port"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="80",  # Too short
        )

        with pytest.raises(ValueError, match="Bad Port"):
            SidGenerator2(sid_info)

    def test_gen_sid_format(self) -> None:
        """Test SID generation format"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="8080",
        )

        generator = SidGenerator2(sid_info)
        sid = generator.gen()

        # SID should contain expected components
        assert "test" in sid  # sub
        assert "us-west" in sid  # location
        assert "@" in sid  # separator
        assert len(sid) > 20  # Should be reasonably long

    def test_gen_sid_uniqueness(self) -> None:
        """Test SID generation produces unique values"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="8080",
        )

        generator = SidGenerator2(sid_info)

        # Generate multiple SIDs with small delay to ensure time difference
        import time

        sids = []
        for _ in range(5):
            sids.append(generator.gen())
            time.sleep(0.001)  # Small delay to ensure different timestamps

        # All SIDs should be unique
        assert len(set(sids)) == len(sids)

    def test_gen_sid_with_different_ips(self) -> None:
        """Test SID generation with different IPs"""
        test_ips = ["192.168.1.100", "10.0.0.1", "172.16.0.1"]

        for ip in test_ips:
            sid_info = SidInfo(
                sub="test", location="us-west", index=1, local_ip=ip, local_port="8080"
            )

            generator = SidGenerator2(sid_info)
            sid = generator.gen()

            # SID should be generated successfully
            assert isinstance(sid, str)
            assert len(sid) > 0

    def test_gen_sid_index_increment(self) -> None:
        """Test SID generation increments index"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=0,
            local_ip="192.168.1.100",
            local_port="8080",
        )

        generator = SidGenerator2(sid_info)

        # Generate multiple SIDs with small delays to ensure different timestamps
        import time

        sid1 = generator.gen()
        time.sleep(0.001)  # Small delay to ensure different timestamp
        sid2 = generator.gen()

        # SIDs should be different (due to timestamp and index increment)
        assert sid1 != sid2


class TestSidModule:
    """Test SID module functions"""

    def test_init_sid(self) -> None:
        """Test init_sid function"""
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="8080",
        )

        init_sid(sid_info)

        # Check that the global variable is set
        from common.otlp.sid import sid_generator2

        assert sid_generator2 is not None
        assert isinstance(sid_generator2, SidGenerator2)
        assert sid_generator2.sid_info == sid_info

    def test_sid_generator2_global(self) -> None:
        """Test sid_generator2 global variable"""
        from common.otlp.sid import sid_generator2

        # After init_sid, should be set
        sid_info = SidInfo(
            sub="test",
            location="us-west",
            index=1,
            local_ip="192.168.1.100",
            local_port="8080",
        )

        init_sid(sid_info)
        assert sid_generator2 is not None


class TestSidIntegration:
    """Test SID integration scenarios"""

    def test_complete_sid_workflow(self) -> None:
        """Test complete SID generation workflow"""
        from common.otlp.sid import sid_generator2

        # Initialize SID generator
        sid_info = SidInfo(
            sub="app",
            location="us-east",
            index=0,
            local_ip="10.0.0.1",
            local_port="9090",
        )

        init_sid(sid_info)

        # Generate SIDs with small delays to ensure uniqueness
        import time

        sids = []
        for _ in range(3):
            sid = sid_generator2.gen()
            sids.append(sid)
            time.sleep(0.001)  # Small delay to ensure different timestamps

        # All SIDs should be unique and valid
        assert len(set(sids)) == 3
        assert all(isinstance(sid, str) for sid in sids)
        assert all(len(sid) > 0 for sid in sids)

    def test_sid_with_real_ip(self) -> None:
        """Test SID generation with real IP (mocked)"""
        with patch("socket.inet_aton") as mock_inet_aton:
            # Mock inet_aton to return valid IP bytes
            mock_inet_aton.return_value = b"\xc0\xa8\x01\x64"  # 192.168.1.100

            sid_info = SidInfo(
                sub="test",
                location="us-west",
                index=1,
                local_ip="192.168.1.100",
                local_port="8080",
            )

            generator = SidGenerator2(sid_info)
            sid = generator.gen()

            # Should generate SID successfully
            assert isinstance(sid, str)
            assert len(sid) > 0
