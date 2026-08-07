"""
Tests for OTLP args components
"""

import pytest

from common.otlp.args.base import BaseOtlpArgs
from common.otlp.args.metric import OtlpMetricArgs
from common.otlp.args.sid import OtlpSidArgs
from common.otlp.args.trace import OtlpTraceArgs


class TestBaseOtlpArgs:
    """Test BaseOtlpArgs model"""

    def test_init_default(self) -> None:
        """Test initialization with default values"""
        args = BaseOtlpArgs()

        assert args.inited is False
        assert args.otlp_endpoint == ""
        assert args.otlp_service_name == ""
        assert args.otlp_dc == ""

    def test_init_with_values(self) -> None:
        """Test initialization with custom values"""
        args = BaseOtlpArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
        )

        assert args.inited is True
        assert args.otlp_endpoint == "http://localhost:4317"
        assert args.otlp_service_name == "test-service"
        assert args.otlp_dc == "test-dc"

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        args = BaseOtlpArgs(inited=True, otlp_endpoint="http://localhost:4317")
        assert args is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        args = BaseOtlpArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
        )

        data = args.model_dump()
        assert data["inited"] is True
        assert data["otlp_endpoint"] == "http://localhost:4317"
        assert data["otlp_service_name"] == "test-service"
        assert data["otlp_dc"] == "test-dc"

    def test_deserialization(self) -> None:
        """Test model deserialization"""
        data = {
            "inited": True,
            "otlp_endpoint": "http://localhost:4317",
            "otlp_service_name": "test-service",
            "otlp_dc": "test-dc",
        }

        args = BaseOtlpArgs.model_validate(data)
        assert args.inited is True
        assert args.otlp_endpoint == "http://localhost:4317"
        assert args.otlp_service_name == "test-service"
        assert args.otlp_dc == "test-dc"


class TestOtlpMetricArgs:
    """Test OtlpMetricArgs model"""

    def test_init_default(self) -> None:
        """Test initialization with default values"""
        args = OtlpMetricArgs()

        # Check inherited fields
        assert args.inited is False
        assert args.otlp_endpoint == ""
        assert args.otlp_service_name == ""
        assert args.otlp_dc == ""

        # Check metric-specific fields
        assert args.metric_timeout == 0
        assert args.metric_export_interval_millis == 0
        assert args.metric_export_timeout_millis == 0

    def test_init_with_values(self) -> None:
        """Test initialization with custom values"""
        args = OtlpMetricArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
            metric_timeout=5000,
            metric_export_interval_millis=1000,
            metric_export_timeout_millis=2000,
        )

        # Check inherited fields
        assert args.inited is True
        assert args.otlp_endpoint == "http://localhost:4317"
        assert args.otlp_service_name == "test-service"
        assert args.otlp_dc == "test-dc"

        # Check metric-specific fields
        assert args.metric_timeout == 5000
        assert args.metric_export_interval_millis == 1000
        assert args.metric_export_timeout_millis == 2000

    def test_inheritance(self) -> None:
        """Test OtlpMetricArgs inherits from BaseOtlpArgs"""
        args = OtlpMetricArgs()
        assert isinstance(args, BaseOtlpArgs)
        assert isinstance(args, OtlpMetricArgs)

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        args = OtlpMetricArgs(metric_timeout=5000, metric_export_interval_millis=1000)
        assert args is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        args = OtlpMetricArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            metric_timeout=5000,
            metric_export_interval_millis=1000,
            metric_export_timeout_millis=2000,
        )

        data = args.model_dump()
        assert data["inited"] is True
        assert data["otlp_endpoint"] == "http://localhost:4317"
        assert data["metric_timeout"] == 5000
        assert data["metric_export_interval_millis"] == 1000
        assert data["metric_export_timeout_millis"] == 2000


class TestOtlpSidArgs:
    """Test OtlpSidArgs model"""

    def test_init_default(self) -> None:
        """Test initialization with default values"""
        args = OtlpSidArgs()

        # Check inherited fields
        assert args.inited is False
        assert args.otlp_endpoint == ""
        assert args.otlp_service_name == ""
        assert args.otlp_dc == ""

        # Check sid-specific fields
        assert args.sid_sub == "svc"
        assert args.sid_location == ""
        assert args.sid_ip is not None  # Should be set to local_ip
        assert args.sid_local_port == ""

    def test_init_with_values(self) -> None:
        """Test initialization with custom values"""
        args = OtlpSidArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
            sid_sub="custom-svc",
            sid_location="us-west-1",
            sid_ip="192.168.1.100",
            sid_local_port="8080",
        )

        # Check inherited fields
        assert args.inited is True
        assert args.otlp_endpoint == "http://localhost:4317"
        assert args.otlp_service_name == "test-service"
        assert args.otlp_dc == "test-dc"

        # Check sid-specific fields
        assert args.sid_sub == "custom-svc"
        assert args.sid_location == "us-west-1"
        assert args.sid_ip == "192.168.1.100"
        assert args.sid_local_port == "8080"

    def test_inheritance(self) -> None:
        """Test OtlpSidArgs inherits from BaseOtlpArgs"""
        args = OtlpSidArgs()
        assert isinstance(args, BaseOtlpArgs)
        assert isinstance(args, OtlpSidArgs)

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        args = OtlpSidArgs(
            sid_sub="test-svc", sid_location="us-east-1", sid_ip="10.0.0.1"
        )
        assert args is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        args = OtlpSidArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            sid_sub="test-svc",
            sid_location="us-west-1",
            sid_ip="192.168.1.100",
            sid_local_port="8080",
        )

        data = args.model_dump()
        assert data["inited"] is True
        assert data["otlp_endpoint"] == "http://localhost:4317"
        assert data["sid_sub"] == "test-svc"
        assert data["sid_location"] == "us-west-1"
        assert data["sid_ip"] == "192.168.1.100"
        assert data["sid_local_port"] == "8080"

    def test_default_ip_from_local_ip(self) -> None:
        """Test that sid_ip defaults to local_ip value"""
        args = OtlpSidArgs()
        # The sid_ip should be set to the actual local IP
        assert args.sid_ip is not None
        assert isinstance(args.sid_ip, str)
        assert len(args.sid_ip) > 0


class TestOtlpTraceArgs:
    """Test OtlpTraceArgs model"""

    def test_init_default(self) -> None:
        """Test initialization with default values"""
        args = OtlpTraceArgs()

        # Check inherited fields
        assert args.inited is False
        assert args.otlp_endpoint == ""
        assert args.otlp_service_name == ""
        assert args.otlp_dc == ""

        # Check trace-specific fields
        assert args.trace_timeout == 0
        assert args.trace_max_queue_size == 0
        assert args.trace_schedule_delay_millis == 0
        assert args.trace_max_export_batch_size == 0
        assert args.trace_export_timeout_millis == 0

    def test_init_with_values(self) -> None:
        """Test initialization with custom values"""
        args = OtlpTraceArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
            trace_timeout=10000,
            trace_max_queue_size=1000,
            trace_schedule_delay_millis=500,
            trace_max_export_batch_size=100,
            trace_export_timeout_millis=3000,
        )

        # Check inherited fields
        assert args.inited is True
        assert args.otlp_endpoint == "http://localhost:4317"
        assert args.otlp_service_name == "test-service"
        assert args.otlp_dc == "test-dc"

        # Check trace-specific fields
        assert args.trace_timeout == 10000
        assert args.trace_max_queue_size == 1000
        assert args.trace_schedule_delay_millis == 500
        assert args.trace_max_export_batch_size == 100
        assert args.trace_export_timeout_millis == 3000

    def test_inheritance(self) -> None:
        """Test OtlpTraceArgs inherits from BaseOtlpArgs"""
        args = OtlpTraceArgs()
        assert isinstance(args, BaseOtlpArgs)
        assert isinstance(args, OtlpTraceArgs)

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        args = OtlpTraceArgs(trace_timeout=5000, trace_max_queue_size=500)
        assert args is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        args = OtlpTraceArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            trace_timeout=10000,
            trace_max_queue_size=1000,
            trace_schedule_delay_millis=500,
            trace_max_export_batch_size=100,
            trace_export_timeout_millis=3000,
        )

        data = args.model_dump()
        assert data["inited"] is True
        assert data["otlp_endpoint"] == "http://localhost:4317"
        assert data["trace_timeout"] == 10000
        assert data["trace_max_queue_size"] == 1000
        assert data["trace_schedule_delay_millis"] == 500
        assert data["trace_max_export_batch_size"] == 100
        assert data["trace_export_timeout_millis"] == 3000


class TestOtlpArgsIntegration:
    """Test OTLP args integration scenarios"""

    def test_all_args_types_creation(self) -> None:
        """Test creation of all OTLP args types"""
        # Test BaseOtlpArgs
        base_args = BaseOtlpArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
        )

        # Test OtlpMetricArgs
        metric_args = OtlpMetricArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
            metric_timeout=5000,
            metric_export_interval_millis=1000,
            metric_export_timeout_millis=2000,
        )

        # Test OtlpSidArgs
        sid_args = OtlpSidArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
            sid_sub="test-svc",
            sid_location="us-west-1",
            sid_ip="192.168.1.100",
            sid_local_port="8080",
        )

        # Test OtlpTraceArgs
        trace_args = OtlpTraceArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
            trace_timeout=10000,
            trace_max_queue_size=1000,
            trace_schedule_delay_millis=500,
            trace_max_export_batch_size=100,
            trace_export_timeout_millis=3000,
        )

        # Verify all instances are created successfully
        assert base_args is not None
        assert metric_args is not None
        assert sid_args is not None
        assert trace_args is not None

        # Verify inheritance relationships
        assert isinstance(metric_args, BaseOtlpArgs)
        assert isinstance(sid_args, BaseOtlpArgs)
        assert isinstance(trace_args, BaseOtlpArgs)

    def test_args_serialization_roundtrip(self) -> None:
        """Test serialization and deserialization roundtrip"""
        # Create original args
        original_args = OtlpMetricArgs(
            inited=True,
            otlp_endpoint="http://localhost:4317",
            otlp_service_name="test-service",
            otlp_dc="test-dc",
            metric_timeout=5000,
            metric_export_interval_millis=1000,
            metric_export_timeout_millis=2000,
        )

        # Serialize to dict
        data = original_args.model_dump()

        # Deserialize from dict
        restored_args = OtlpMetricArgs.model_validate(data)

        # Verify all fields match
        assert restored_args.inited == original_args.inited
        assert restored_args.otlp_endpoint == original_args.otlp_endpoint
        assert restored_args.otlp_service_name == original_args.otlp_service_name
        assert restored_args.otlp_dc == original_args.otlp_dc
        assert restored_args.metric_timeout == original_args.metric_timeout
        assert (
            restored_args.metric_export_interval_millis
            == original_args.metric_export_interval_millis
        )
        assert (
            restored_args.metric_export_timeout_millis
            == original_args.metric_export_timeout_millis
        )

    def test_args_validation_with_invalid_data(self) -> None:
        """Test validation with invalid data"""
        # Test with invalid field types
        with pytest.raises(Exception):  # Pydantic validation error
            OtlpMetricArgs(
                metric_timeout="invalid",  # Should be int
                metric_export_interval_millis="invalid",  # Should be int
            )

    def test_args_field_defaults_consistency(self) -> None:
        """Test that field defaults are consistent across all args types"""
        base_args = BaseOtlpArgs()
        metric_args = OtlpMetricArgs()
        sid_args = OtlpSidArgs()
        trace_args = OtlpTraceArgs()

        # All should have same inherited defaults
        assert (
            base_args.inited
            == metric_args.inited
            == sid_args.inited
            == trace_args.inited
        )
        assert (
            base_args.otlp_endpoint
            == metric_args.otlp_endpoint
            == sid_args.otlp_endpoint
            == trace_args.otlp_endpoint
        )
        assert (
            base_args.otlp_service_name
            == metric_args.otlp_service_name
            == sid_args.otlp_service_name
            == trace_args.otlp_service_name
        )
        assert (
            base_args.otlp_dc
            == metric_args.otlp_dc
            == sid_args.otlp_dc
            == trace_args.otlp_dc
        )

    def test_args_model_config(self) -> None:
        """Test that all args models have proper configuration"""
        # Test that all models can be instantiated
        models = [BaseOtlpArgs(), OtlpMetricArgs(), OtlpSidArgs(), OtlpTraceArgs()]

        for model in models:
            # Test that model has required methods
            assert hasattr(model, "model_dump")
            assert hasattr(model, "model_validate")
            assert hasattr(model.__class__, "model_fields")

            # Test serialization
            data = model.model_dump()
            assert isinstance(data, dict)

            # Test that we can get field information
            fields = model.__class__.model_fields
            assert isinstance(fields, dict)
            assert len(fields) > 0
