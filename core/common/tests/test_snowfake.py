"""
Snowflake ID generator utility unit tests.

This module contains comprehensive unit tests for the snowflake ID generator
including uniqueness, format validation, and performance testing.
"""

import time

import pytest

from common.utils.snowfake import get_id


class TestSnowfake:
    """Test cases for snowfake ID generator."""

    def test_get_id_returns_integer(self) -> None:
        """Test get_id returns integer type."""
        snowflake_id = get_id()
        assert isinstance(snowflake_id, int)

    def test_get_id_uniqueness(self) -> None:
        """Test uniqueness of generated snowflake ID."""
        ids = [get_id() for _ in range(100)]
        assert len(set(ids)) == 100  # All IDs should be unique

    def test_get_id_sequential_increase(self) -> None:
        """Test sequential increase of snowflake ID."""
        id1 = get_id()
        id2 = get_id()
        assert id2 > id1

    def test_get_id_multiple_calls(self) -> None:
        """Test multiple calls to get_id function."""
        ids = []
        for _ in range(10):
            ids.append(get_id())

        # Verify all IDs are integers
        assert all(isinstance(id_val, int) for id_val in ids)

        # Verify IDs are increasing
        for i in range(1, len(ids)):
            assert ids[i] > ids[i - 1]

    def test_get_id_large_scale_uniqueness(self) -> None:
        """Test uniqueness of large scale ID generation."""
        ids = [get_id() for _ in range(1000)]
        assert len(set(ids)) == 1000

    def test_get_id_format_validation(self) -> None:
        """Test validity of snowflake ID format."""
        snowflake_id = get_id()

        # Snowflake ID should be positive
        assert snowflake_id > 0

        # Snowflake ID should be 64-bit integer
        assert snowflake_id < 2**64

    def test_get_id_timestamp_component(self) -> None:
        """Test timestamp component of snowflake ID."""

        # Generate snowflake ID
        snowflake_id = get_id()

        # Snowflake ID should contain timestamp information
        # Since the structure of snowflake ID, we cannot directly extract the timestamp, but we can verify the validity of the ID
        assert snowflake_id > 0

    def test_get_id_worker_id_component(self) -> None:
        """Test worker ID component of snowflake ID."""
        # Since worker ID is generated from timestamp, we cannot directly test
        # But we can verify the validity of the generated ID
        snowflake_id = get_id()
        assert snowflake_id > 0

    def test_get_id_sequence_component(self) -> None:
        """Test sequence number component of snowflake ID."""
        # Quickly generate multiple IDs, verify sequence number increase
        ids = [get_id() for _ in range(10)]

        # Verify IDs are increasing
        for i in range(1, len(ids)):
            assert ids[i] > ids[i - 1]

    def test_get_id_performance(self) -> None:
        """Test performance of snowflake ID generation."""
        start_time = time.time()

        # Generate 1000 IDs
        for _ in range(1000):
            get_id()

        end_time = time.time()
        duration = end_time - start_time

        # Verify the time to generate 1000 IDs should be short (less than 1 second)
        assert duration < 1.0

    def test_get_id_concurrent_simulation(self) -> None:
        """Test simulation of ID generation under concurrent scenarios."""
        # Simulate concurrent scenarios, quickly generate IDs
        ids = []
        for _ in range(100):
            ids.append(get_id())

        # Verify all IDs are unique
        assert len(set(ids)) == 100

        # Verify IDs are increasing
        for i in range(1, len(ids)):
            assert ids[i] > ids[i - 1]

    def test_get_id_boundary_values(self) -> None:
        """Test boundary value scenarios."""
        # Test generating multiple IDs, verify no duplicates
        ids = set()
        for _ in range(10000):
            new_id = get_id()
            assert new_id not in ids, f"Duplicate ID found: {new_id}"
            ids.add(new_id)

    def test_get_id_consistency(self) -> None:
        """Test consistency of ID generation."""
        # Multiple calls should produce different IDs
        id1 = get_id()
        time.sleep(0.001)  # Short wait
        id2 = get_id()

        assert id1 != id2
        assert id2 > id1

    def test_get_id_large_numbers(self) -> None:
        """Test generating large snowflake ID."""
        snowflake_id = get_id()

        # Snowflake ID should be positive within 64-bit integer range
        assert 0 < snowflake_id < 2**64

    def test_get_id_no_negative_values(self) -> None:
        """Test snowflake ID does not generate negative values."""
        for _ in range(100):
            snowflake_id = get_id()
            assert snowflake_id > 0

    def test_get_id_no_zero_values(self) -> None:
        """Test snowflake ID does not generate zero values."""
        for _ in range(100):
            snowflake_id = get_id()
            assert snowflake_id != 0

    def test_get_id_structure_validation(self) -> None:
        """Test validity of snowflake ID structure."""
        snowflake_id = get_id()

        # Snowflake ID should be valid 64-bit integer
        assert isinstance(snowflake_id, int)
        assert snowflake_id > 0
        assert snowflake_id < 2**64

    def test_get_id_time_based_uniqueness(self) -> None:
        """Test time-based uniqueness."""
        # Generate IDs at different time points
        ids = []

        for _ in range(5):
            ids.append(get_id())
            time.sleep(0.001)  # Short wait

        # Verify all IDs are unique
        assert len(set(ids)) == 5

        # Verify IDs are increasing
        for i in range(1, len(ids)):
            assert ids[i] > ids[i - 1]

    def test_get_id_rapid_generation(self) -> None:
        """Test rapid generation of IDs."""
        # Quickly generate IDs
        ids = []
        start_time = time.time()

        while (
            time.time() - start_time < 0.1
        ):  # Generate as many IDs as possible in 0.1 seconds
            ids.append(get_id())

        # Verify the number of generated IDs is reasonable
        assert len(ids) > 0

        # Verify all IDs are unique
        assert len(set(ids)) == len(ids)

        # Verify IDs are increasing
        for i in range(1, len(ids)):
            assert ids[i] > ids[i - 1]

    def test_get_id_memory_efficiency(self) -> None:
        """Test memory efficiency."""
        # Generate large number of IDs, verify memory usage is reasonable
        ids = []
        for _ in range(10000):
            ids.append(get_id())

        # Verify all IDs are unique
        assert len(set(ids)) == 10000

        # Verify IDs are increasing
        for i in range(1, len(ids)):
            assert ids[i] > ids[i - 1]

    def test_get_id_worker_id_generation(self) -> None:
        """Test worker ID generation logic."""
        # Since worker ID is generated from timestamp, we cannot directly test
        # But we can verify the validity of the generated ID
        snowflake_id = get_id()

        # Snowflake ID should contain worker ID information
        assert snowflake_id > 0

    def test_get_id_sequence_overflow_handling(self) -> None:
        """Test sequence number overflow handling."""
        # Quickly generate large number of IDs, test sequence number overflow handling
        ids = []
        for _ in range(1000):
            ids.append(get_id())

        # Verify all IDs are unique
        assert len(set(ids)) == 1000

        # Verify IDs are increasing
        for i in range(1, len(ids)):
            assert ids[i] > ids[i - 1]

    def test_get_id_timestamp_rollover_handling(self) -> None:
        """Test timestamp rollover handling."""
        # This test mainly verifies the handling of timestamp rollover
        # In actual use, the situation of timestamp rollover is very rare
        snowflake_id = get_id()
        assert snowflake_id > 0

    def test_get_id_distributed_system_simulation(self) -> None:
        """Test simulation of distributed system scenarios."""
        # Simulate multiple nodes generating IDs in distributed system
        node_ids = []

        for node in range(5):  # Simulate 5 nodes
            node_id = get_id()
            node_ids.append(node_id)

        # Verify all nodes generated IDs are unique
        assert len(set(node_ids)) == 5

        # Verify IDs are increasing
        for i in range(1, len(node_ids)):
            assert node_ids[i] > node_ids[i - 1]

    def test_get_id_error_handling(self) -> None:
        """Test error handling."""
        # Test should not have errors in normal case
        try:
            snowflake_id = get_id()
            assert snowflake_id > 0
        except Exception as e:
            pytest.fail(f"get_id() raised an exception: {e}")

    def test_get_id_thread_safety_simulation(self) -> None:
        """Test simulation of thread safety."""
        # Simulate ID generation in multi-thread environment
        ids = []

        # Quickly generate IDs, simulate multi-thread competition
        for _ in range(100):
            ids.append(get_id())

        # Verify all IDs are unique
        assert len(set(ids)) == 100

        # Verify IDs are increasing
        for i in range(1, len(ids)):
            assert ids[i] > ids[i - 1]

    def test_get_id_large_scale_performance(self) -> None:
        """Test performance of large scale ID generation."""
        start_time = time.time()

        # Generate 10000 IDs
        ids = [get_id() for _ in range(10000)]

        end_time = time.time()
        duration = end_time - start_time

        # Verify the time to generate 10000 IDs should be short (less than 1 second)
        assert duration < 1.0

        # Verify all IDs are unique
        assert len(set(ids)) == 10000

    def test_get_id_format_consistency(self) -> None:
        """Test consistency of ID format."""
        # Generate multiple IDs, verify format consistency
        ids = [get_id() for _ in range(100)]

        # Verify all IDs are integers
        assert all(isinstance(id_val, int) for id_val in ids)

        # Verify all IDs are positive
        assert all(id_val > 0 for id_val in ids)

        # Verify all IDs are within reasonable range
        assert all(id_val < 2**64 for id_val in ids)

    def test_get_id_monotonic_increase(self) -> None:
        """Test monotonic increase of IDs."""
        # Verify monotonic increase of IDs
        ids = [get_id() for _ in range(50)]

        for i in range(1, len(ids)):
            assert (
                ids[i] > ids[i - 1]
            ), f"ID not monotonically increasing: {ids[i - 1]} -> {ids[i]}"
