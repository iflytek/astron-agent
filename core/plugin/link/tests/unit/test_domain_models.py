"""
Unit tests for domain.models modules
Tests manager.py and utils.py functionality including database and Redis services
"""

from typing import Any
from unittest.mock import Mock, patch

import pytest
import redis
from plugin.link.domain.models.manager import (
    get_db_engine,
    get_redis_engine,
    init_data_base,
)
from plugin.link.domain.models.utils import (
    DatabaseService,
    RedisService,
    Result,
    session_getter,
)
from sqlalchemy.exc import NoSuchTableError, OperationalError


@pytest.mark.unit
class TestManager:
    """Test class for manager module functions"""

    @patch("plugin.link.domain.models.manager.os.getenv")
    @patch("plugin.link.domain.models.manager.DatabaseService")
    @patch("plugin.link.domain.models.manager.RedisService")
    def test_init_data_base_with_cluster_addr(
        self, mock_redis_service: Any, mock_db_service: Any, mock_getenv: Any
    ) -> None:
        """Test init_data_base with Redis cluster address"""
        # Mock environment variables
        mock_getenv.side_effect = lambda key: {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "test_user",
            "MYSQL_PASSWORD": "test_pass",
            "MYSQL_DB": "test_db",
            "REDIS_CLUSTER_ADDR": "host1:7001,host2:7001",
            "REDIS_PASSWORD": "redis_pass",
        }.get(key)

        mock_db_instance = Mock()
        mock_redis_instance = Mock()
        mock_db_service.return_value = mock_db_instance
        mock_redis_service.return_value = mock_redis_instance

        init_data_base()

        # Verify database service initialization
        expected_db_url = (
            "mysql+pymysql://test_user:test_pass@localhost:3306/test_db?charset=utf8mb4"
        )
        mock_db_service.assert_called_once_with(database_url=expected_db_url)
        mock_db_instance.create_db_and_tables.assert_called_once()

        # Verify Redis service initialization with cluster address
        mock_redis_service.assert_called_once_with(
            cluster_addr="host1:7001,host2:7001", password="redis_pass"
        )

    @patch("plugin.link.domain.models.manager.os.getenv")
    @patch("plugin.link.domain.models.manager.DatabaseService")
    @patch("plugin.link.domain.models.manager.RedisService")
    def test_init_data_base_fallback_to_single_redis(
        self, mock_redis_service: Any, mock_db_service: Any, mock_getenv: Any
    ) -> None:
        """Test init_data_base falls back to single Redis address when cluster not available"""
        # Mock environment variables without cluster address
        mock_getenv.side_effect = lambda key: {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "test_user",
            "MYSQL_PASSWORD": "test_pass",
            "MYSQL_DB": "test_db",
            "REDIS_CLUSTER_ADDR": None,
            "REDIS_ADDR": "redis:6379",
            "REDIS_PASSWORD": "redis_pass",
        }.get(key)

        init_data_base()

        # Verify Redis service uses fallback address
        mock_redis_service.assert_called_once_with(
            cluster_addr="redis:6379", password="redis_pass"
        )

    def test_get_db_engine_returns_singleton(self) -> None:
        """Test get_db_engine returns the global database singleton"""
        with patch("plugin.link.domain.models.manager.data_base_singleton", "mock_db"):
            result = get_db_engine()
            assert result == "mock_db"

    def test_get_redis_engine_returns_singleton(self) -> None:
        """Test get_redis_engine returns the global Redis singleton"""
        with patch("plugin.link.domain.models.manager.redis_singleton", "mock_redis"):
            result = get_redis_engine()
            assert result == "mock_redis"


@pytest.mark.unit
class TestResult:
    """Test class for Result dataclass"""

    def test_result_creation(self) -> None:
        """Test Result dataclass creation and attributes"""
        result = Result(name="test_table", type="table", success=True)

        assert result.name == "test_table"
        assert result.type == "table"
        assert result.success is True

    def test_result_equality(self) -> None:
        """Test Result dataclass equality comparison"""
        result1 = Result(name="test", type="table", success=True)
        result2 = Result(name="test", type="table", success=True)
        result3 = Result(name="test", type="table", success=False)

        assert result1 == result2
        assert result1 != result3

    def test_result_repr(self) -> None:
        """Test Result dataclass string representation"""
        result = Result(name="test_table", type="table", success=True)
        repr_str = repr(result)

        assert "test_table" in repr_str
        assert "table" in repr_str
        assert "True" in repr_str


@pytest.mark.unit
class TestSessionGetter:
    """Test class for session_getter context manager"""

    def test_session_getter_normal_operation(self) -> None:
        """Test session_getter context manager with normal operation"""
        mock_db_service = Mock()
        mock_session = Mock()

        with patch(
            "plugin.link.domain.models.utils.Session", return_value=mock_session
        ):
            with session_getter(mock_db_service) as session:
                assert session == mock_session

        mock_session.close.assert_called_once()

    def test_session_getter_with_exception(self) -> None:
        """Test session_getter context manager handles exceptions"""
        mock_db_service = Mock()
        mock_session = Mock()

        with patch(
            "plugin.link.domain.models.utils.Session", return_value=mock_session
        ):
            with pytest.raises(ValueError):
                with session_getter(mock_db_service):
                    raise ValueError("Test exception")

        mock_session.rollback.assert_called_once()
        mock_session.close.assert_called_once()


@pytest.mark.unit
class TestDatabaseService:
    """Test class for DatabaseService"""

    def test_database_service_initialization(self) -> None:
        """Test DatabaseService initialization with default parameters"""
        with patch(
            "plugin.link.domain.models.utils.create_engine"
        ) as mock_create_engine:
            mock_engine = Mock()
            mock_create_engine.return_value = mock_engine

            db_service = DatabaseService("mysql://user:pass@host:port/db")

            assert db_service.database_url == "mysql://user:pass@host:port/db"
            assert db_service.connect_timeout == 10
            assert db_service.pool_size == 200
            assert db_service.max_overflow == 800
            assert db_service.pool_recycle == 3600
            assert db_service.engine == mock_engine

    def test_database_service_custom_parameters(self) -> None:
        """Test DatabaseService initialization with custom parameters"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            db_service = DatabaseService(
                "mysql://user:pass@host:port/db",
                connect_timeout=30,
                pool_size=100,
                max_overflow=400,
                pool_recycle=1800,
            )

            assert db_service.connect_timeout == 30
            assert db_service.pool_size == 100
            assert db_service.max_overflow == 400
            assert db_service.pool_recycle == 1800

    def test_create_engine(self) -> None:
        """Test _create_engine method calls create_engine with correct parameters"""
        with patch(
            "plugin.link.domain.models.utils.create_engine"
        ) as mock_create_engine:
            mock_engine = Mock()
            mock_create_engine.return_value = mock_engine

            DatabaseService("test://url")

            mock_create_engine.assert_called_once_with(
                "test://url",
                connect_args={},
                echo=False,
                pool_size=200,
                max_overflow=800,
                pool_recycle=3600,
            )

    def test_context_manager_enter_exit_success(self) -> None:
        """Test DatabaseService context manager with successful operation"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.Session") as mock_session_class:
                mock_session = Mock()
                mock_session_class.return_value = mock_session

                db_service = DatabaseService("test://url")

                with db_service as session:
                    assert session == mock_session

                mock_session.commit.assert_called_once()
                mock_session.close.assert_called_once()

    def test_context_manager_with_exception(self) -> None:
        """Test DatabaseService context manager handles exceptions"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.Session") as mock_session_class:
                mock_session = Mock()
                mock_session_class.return_value = mock_session

                db_service = DatabaseService("test://url")

                with pytest.raises(ValueError):
                    with db_service:
                        raise ValueError("Test exception")

                mock_session.rollback.assert_called_once()
                mock_session.close.assert_called_once()

    def test_get_session(self) -> None:
        """Test get_session method"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.Session") as mock_session_class:
                mock_session = Mock()
                mock_session_class.return_value.__enter__ = Mock(
                    return_value=mock_session
                )
                mock_session_class.return_value.__exit__ = Mock(return_value=None)

                db_service = DatabaseService("test://url")

                # Test the generator
                session_gen = db_service.get_session()
                session = next(session_gen)
                assert session == mock_session

    def test_check_table_success(self) -> None:
        """Test check_table method with existing table and columns"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.inspect") as mock_inspect:
                mock_inspector = Mock()
                mock_inspector.get_columns.return_value = [
                    {"name": "id"},
                    {"name": "name"},
                    {"name": "description"},
                ]

                # Mock model
                mock_model = Mock()
                # Mock SQLAlchemy inspector for the model
                mock_model_inspector = Mock()
                mock_table = Mock()
                mock_table.name = "test_table"
                mock_model_inspector.local_table = mock_table

                # Mock Pydantic v2 model_fields
                mock_model.model_fields = {
                    "id": None,
                    "name": None,
                    "description": None,
                }

                # Set up inspect to return different mocks for engine vs model
                mock_inspect.side_effect = [mock_inspector, mock_model_inspector]

                db_service = DatabaseService("test://url")
                results = db_service.check_table(mock_model)

                assert len(results) == 4  # 1 table + 3 columns
                assert results[0].name == "test_table"
                assert results[0].type == "table"
                assert results[0].success is True

                for i, column in enumerate(["id", "name", "description"], 1):
                    assert results[i].name == column
                    assert results[i].type == "column"
                    assert results[i].success is True

    def test_check_table_missing_table(self) -> None:
        """Test check_table method with missing table"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.inspect") as mock_inspect:
                mock_inspector = Mock()
                mock_inspector.get_columns.side_effect = NoSuchTableError(
                    "Table not found"
                )

                mock_model = Mock()
                # Mock SQLAlchemy inspector for the model
                mock_model_inspector = Mock()
                mock_table = Mock()
                mock_table.name = "missing_table"
                mock_model_inspector.local_table = mock_table

                # Mock Pydantic v2 model_fields
                mock_model.model_fields = {"id": None}

                # Set up inspect to return different mocks for engine vs model
                mock_inspect.side_effect = [mock_inspector, mock_model_inspector]

                db_service = DatabaseService("test://url")
                results = db_service.check_table(mock_model)

                assert len(results) == 1
                assert results[0].name == "missing_table"
                assert results[0].type == "table"
                assert results[0].success is False

    def test_check_table_missing_columns(self) -> None:
        """Test check_table method with missing columns"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.inspect") as mock_inspect:
                mock_inspector = Mock()
                mock_inspector.get_columns.return_value = [
                    {"name": "id"}
                ]  # Missing 'name' column

                mock_model = Mock()
                # Mock SQLAlchemy inspector for the model
                mock_model_inspector = Mock()
                mock_table = Mock()
                mock_table.name = "test_table"
                mock_model_inspector.local_table = mock_table

                # Mock Pydantic v2 model_fields
                mock_model.model_fields = {"id": None, "name": None}

                # Set up inspect to return different mocks for engine vs model
                mock_inspect.side_effect = [mock_inspector, mock_model_inspector]

                db_service = DatabaseService("test://url")
                results = db_service.check_table(mock_model)

                assert len(results) == 3  # 1 table + 2 columns
                assert results[0].success is True  # Table exists
                assert results[1].success is True  # id column exists
                assert results[2].success is False  # name column missing

    def test_create_db_and_tables_existing_tables(self) -> None:
        """Test create_db_and_tables when tables already exist"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.inspect") as mock_inspect:
                mock_inspector = Mock()
                mock_inspector.get_table_names.return_value = ["tools_schema"]
                mock_inspect.return_value = mock_inspector

                db_service = DatabaseService("test://url")

                # Should return early without creating tables
                db_service.create_db_and_tables()

                # inspect should be called twice (before and after check)
                assert mock_inspect.call_count == 1

    def test_create_db_and_tables_creates_new_tables(self) -> None:
        """Test create_db_and_tables creates new tables when they don't exist"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.inspect") as mock_inspect:
                with patch("plugin.link.domain.models.utils.SQLModel") as mock_sqlmodel:
                    mock_inspector = Mock()
                    mock_inspector.get_table_names.side_effect = [
                        [],
                        ["tools_schema"],
                    ]  # Empty first, populated after
                    mock_inspect.return_value = mock_inspector

                    mock_table = Mock()
                    mock_table.create = Mock()
                    mock_sqlmodel.metadata.sorted_tables = [mock_table]

                    db_service = DatabaseService("test://url")
                    db_service.create_db_and_tables()

                    mock_table.create.assert_called_once()

    def test_create_db_and_tables_handles_operational_error(self) -> None:
        """Test create_db_and_tables handles OperationalError for existing tables"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.inspect") as mock_inspect:
                with patch("plugin.link.domain.models.utils.SQLModel") as mock_sqlmodel:
                    mock_inspector = Mock()
                    mock_inspector.get_table_names.side_effect = [[], ["tools_schema"]]
                    mock_inspect.return_value = mock_inspector

                    mock_table = Mock()
                    mock_table.create.side_effect = OperationalError(
                        "Table exists", None, Exception("Table exists")
                    )
                    mock_sqlmodel.metadata.sorted_tables = [mock_table]

                    db_service = DatabaseService("test://url")

                    # Should not raise exception
                    db_service.create_db_and_tables()

    def test_create_db_and_tables_raises_runtime_error(self) -> None:
        """Test create_db_and_tables raises RuntimeError for other exceptions"""
        with patch("plugin.link.domain.models.utils.create_engine"):
            with patch("plugin.link.domain.models.utils.inspect") as mock_inspect:
                with patch("plugin.link.domain.models.utils.SQLModel") as mock_sqlmodel:
                    mock_inspector = Mock()
                    mock_inspector.get_table_names.return_value = []
                    mock_inspect.return_value = mock_inspector

                    mock_table = Mock()
                    mock_table.create.side_effect = Exception("Unknown error")
                    mock_sqlmodel.metadata.sorted_tables = [mock_table]

                    db_service = DatabaseService("test://url")

                    with pytest.raises(RuntimeError):
                        db_service.create_db_and_tables()


@pytest.mark.unit
class TestRedisService:
    """Test class for RedisService"""

    def test_redis_service_initialization(self) -> None:
        """Test RedisService initialization"""
        with patch(
            "plugin.link.domain.models.utils.RedisService.init_redis_cluster"
        ) as mock_init:
            mock_client = Mock()
            mock_init.return_value = mock_client

            redis_service = RedisService(
                cluster_addr="host:port", password="password", expiration_time=3600
            )

            assert redis_service._client == mock_client
            assert redis_service.expiration_time == 3600
            mock_init.assert_called_once_with("host:port", "password")

    def test_init_redis_cluster_with_cluster_env(self) -> None:
        """Test init_redis_cluster with cluster environment variable"""
        with patch("plugin.link.domain.models.utils.os.getenv") as mock_getenv:
            with patch(
                "plugin.link.domain.models.utils.RedisCluster"
            ) as mock_redis_cluster:
                # Mock environment variable to return cluster address
                mock_getenv.return_value = "host1:7001,host2:7001"
                mock_cluster = Mock()
                mock_redis_cluster.return_value = mock_cluster

                # Create RedisService with cluster address (this will call init_redis_cluster once)
                redis_service = RedisService(
                    cluster_addr="host1:7001,host2:7001", password="password"
                )

                expected_nodes = [
                    {"host": "host1", "port": "7001"},
                    {"host": "host2", "port": "7001"},
                ]
                mock_redis_cluster.assert_called_with(
                    startup_nodes=expected_nodes, password="password"
                )
                assert redis_service._client == mock_cluster

    def test_init_redis_cluster_single_redis(self) -> None:
        """Test init_redis_cluster with single Redis instance"""
        with patch("plugin.link.domain.models.utils.os.getenv") as mock_getenv:
            with patch("plugin.link.domain.models.utils.redis.Redis") as mock_redis:
                mock_getenv.return_value = None  # No cluster env
                mock_client = Mock()
                mock_redis.return_value = mock_client

                # Create RedisService with single Redis address (this will call init_redis_cluster once)
                redis_service = RedisService(
                    cluster_addr="localhost:6379", password="password"
                )

                mock_redis.assert_called_with(
                    host="localhost", port="6379", password="password"
                )
                assert redis_service._client == mock_client

    def test_is_connected_success(self) -> None:
        """Test is_connected method when connection is successful"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.ping.return_value = True

            assert redis_service.is_connected() is True

    def test_is_connected_failure(self) -> None:
        """Test is_connected method when connection fails"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.ping.side_effect = redis.exceptions.ConnectionError()

            assert redis_service.is_connected() is False

    def test_get_existing_key(self) -> None:
        """Test get method with existing key"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.get.return_value = b'{"key": "value"}'

            result = redis_service.get("test_key")

            assert result == {"key": "value"}
            redis_service._client.get.assert_called_once_with("test_key")

    def test_get_nonexistent_key(self) -> None:
        """Test get method with non-existent key"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.get.return_value = None

            result = redis_service.get("nonexistent_key")

            assert result is None

    def test_set_method(self) -> None:
        """Test set method"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(
                cluster_addr="localhost:6379", expiration_time=120
            )
            redis_service._client = Mock()

            test_value = {"key": "value"}
            redis_service.set("test_key", test_value)

            redis_service._client.set.assert_called_once_with(
                "test_key", '{"key": "value"}', ex=120
            )

    def test_upsert_new_key(self) -> None:
        """Test upsert method with new key"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.get.return_value = None

            test_value = {"key": "value"}
            redis_service.upsert("test_key", test_value)

            redis_service._client.set.assert_called_once()

    def test_upsert_existing_dict(self) -> None:
        """Test upsert method with existing dictionary value"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.get.return_value = b'{"existing": "value"}'

            new_value = {"new": "data"}
            redis_service.upsert("test_key", new_value)

            # Should merge dictionaries and set the combined value
            redis_service._client.set.assert_called_once()

    def test_delete_method(self) -> None:
        """Test delete method"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()

            redis_service.delete("test_key")

            redis_service._client.delete.assert_called_once_with("test_key")

    def test_clear_method(self) -> None:
        """Test clear method"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()

            redis_service.clear()

            redis_service._client.flushdb.assert_called_once()

    def test_hash_get_success(self) -> None:
        """Test hash_get method successful retrieval"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.hget.return_value = b'{"field": "value"}'

            result = redis_service.hash_get("test_hash", "test_field")

            assert result == {"field": "value"}
            redis_service._client.hget.assert_called_once_with(
                name="test_hash", key="test_field"
            )

    def test_hash_get_type_error(self) -> None:
        """Test hash_get method handles type errors"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.hget.side_effect = TypeError("Invalid type")

            with pytest.raises(TypeError):
                redis_service.hash_get("test_hash", "test_field")

    def test_hash_del_success(self) -> None:
        """Test hash_del method successful deletion"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.hdel.return_value = 2  # Successfully deleted 2 fields

            success, failed = redis_service.hash_del("test_hash", "field1", "field2")

            assert success is True
            assert failed == {}
            redis_service._client.hdel.assert_called_once_with(
                "test_hash", "field1", "field2"
            )

    def test_hash_get_all_success(self) -> None:
        """Test hash_get_all method successful retrieval"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.hgetall.return_value = {
                b"field1": b'{"value": 1}',
                b"field2": b'{"value": 2}',
            }

            result = redis_service.hash_get_all("test_hash")

            expected = {"field1": {"value": 1}, "field2": {"value": 2}}
            assert result == expected

    def test_hash_get_all_empty(self) -> None:
        """Test hash_get_all method with empty hash"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.hgetall.return_value = {}

            result = redis_service.hash_get_all("test_hash")

            assert result == {}

    def test_contains_method(self) -> None:
        """Test __contains__ method"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.exists.return_value = True

            assert "test_key" in redis_service
            redis_service._client.exists.assert_called_once_with("test_key")

    def test_contains_method_none_key(self) -> None:
        """Test __contains__ method with None key"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")

            assert None not in redis_service

    def test_getitem_method(self) -> None:
        """Test __getitem__ method"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()
            redis_service._client.get.return_value = b'{"key": "value"}'

            result = redis_service["test_key"]

            assert result == {"key": "value"}

    def test_setitem_method(self) -> None:
        """Test __setitem__ method"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()

            redis_service["test_key"] = {"key": "value"}

            redis_service._client.set.assert_called_once()

    def test_delitem_method(self) -> None:
        """Test __delitem__ method"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(cluster_addr="localhost:6379")
            redis_service._client = Mock()

            del redis_service["test_key"]

            redis_service._client.delete.assert_called_once_with("test_key")

    def test_repr_method(self) -> None:
        """Test __repr__ method"""
        with patch("plugin.link.domain.models.utils.RedisService.init_redis_cluster"):
            redis_service = RedisService(
                cluster_addr="localhost:6379", expiration_time=300
            )

            repr_str = repr(redis_service)

            assert "RedisCache(expiration_time=300)" == repr_str
