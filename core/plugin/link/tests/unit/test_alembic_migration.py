"""
Unit tests for database migration module

Tests the Alembic auto-migration functionality including:
- Environment variable validation
- Alembic configuration setup
- Database migration execution with Redis distributed lock
- Error handling for various MySQL error codes
"""

import os
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from plugin.link.extensions.database_migration import (
    INIT_VERSION,
    LOCK_KEY,
    LOCK_TTL_SECONDS,
    MYSQL_ERROR_ACCESS_DENIED,
    MYSQL_ERROR_EXECUTE_DENIED,
    MYSQL_ERROR_SELECT_DENIED,
    MYSQL_ERROR_TABLE_EXISTS,
    _build_alembic_config,
    _check_db_url,
    _execute_migration,
    _get_or_create_redis_service,
    _handle_migration_error,
    run_database_migration,
)
from sqlalchemy.exc import OperationalError


class _MockDbError(Exception):
    """Exception class used to carry simulated MySQL error codes."""


@pytest.mark.unit
class TestCheckDbUrl:
    """Test class for _check_db_url function"""

    def test_check_db_url_success_with_all_env_vars(self) -> None:
        """Test env validation passes when all required values are present."""
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "testuser",
            "MYSQL_PASSWORD": "testpass",
            "MYSQL_DB": "testdb",
        }

        with patch.dict(os.environ, env_vars, clear=True):
            _check_db_url()

    @pytest.mark.parametrize(
        "missing_key",
        [
            "MYSQL_HOST",
            "MYSQL_PORT",
            "MYSQL_USER",
            "MYSQL_PASSWORD",
            "MYSQL_DB",
        ],
    )
    def test_check_db_url_missing_required_env(self, missing_key: str) -> None:
        """Test env validation fails when any required MySQL variable is missing."""
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "testuser",
            "MYSQL_PASSWORD": "testpass",
            "MYSQL_DB": "testdb",
        }
        env_vars.pop(missing_key)

        with patch.dict(os.environ, env_vars, clear=True):
            with pytest.raises(ValueError) as exc_info:
                _check_db_url()
            assert "Missing required MySQL environment variables" in str(exc_info.value)
            assert missing_key in str(exc_info.value)


@pytest.mark.unit
class TestBuildAlembicConfig:
    """Test class for _build_alembic_config function"""

    def test_build_alembic_config_success(self, tmp_path: Any) -> None:
        """Test successful Alembic config building with valid paths"""
        # Arrange
        link_dir = tmp_path / "link"
        alembic_dir = link_dir / "alembic"
        alembic_ini = link_dir / "alembic.ini"

        link_dir.mkdir()
        alembic_dir.mkdir()
        alembic_ini.write_text("[alembic]\nscript_location = alembic\n")

        # Act
        config = _build_alembic_config(link_dir)

        # Assert
        assert config is not None
        script_location = config.get_main_option("script_location")
        assert script_location is not None
        assert str(alembic_dir) in script_location

    def test_build_alembic_config_missing_alembic_ini(self, tmp_path: Any) -> None:
        """Test Alembic config building fails when alembic.ini is missing"""
        # Arrange
        link_dir = tmp_path / "link"
        link_dir.mkdir()

        # Act & Assert
        with pytest.raises(FileNotFoundError) as exc_info:
            _build_alembic_config(link_dir)
        assert "alembic.ini not found" in str(exc_info.value)

    def test_build_alembic_config_sets_script_location(self, tmp_path: Any) -> None:
        """Test that Alembic config correctly sets the script location"""
        # Arrange
        link_dir = tmp_path / "link"
        alembic_dir = link_dir / "alembic"
        alembic_ini = link_dir / "alembic.ini"

        link_dir.mkdir()
        alembic_dir.mkdir()
        alembic_ini.write_text("[alembic]\nscript_location = alembic\n")

        # Act
        config = _build_alembic_config(link_dir)
        script_location = config.get_main_option("script_location")

        # Assert
        assert script_location == str(alembic_dir)


@pytest.mark.unit
class TestGetOrCreateRedisService:
    """Test class for _get_or_create_redis_service function"""

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    def test_get_or_create_redis_service_uses_existing_instance(
        self, mock_get_redis: MagicMock
    ) -> None:
        """Test existing Redis engine is reused when available."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis

        result = _get_or_create_redis_service()

        assert result == mock_redis

    @patch("plugin.link.extensions.database_migration.RedisService")
    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    def test_get_or_create_redis_service_creates_from_cluster_addr(
        self, mock_get_redis: MagicMock, mock_redis_service_cls: MagicMock
    ) -> None:
        """Test RedisService is created from REDIS_CLUSTER_ADDR when missing engine."""
        mock_get_redis.return_value = None
        with patch.dict(
            os.environ,
            {"REDIS_CLUSTER_ADDR": "127.0.0.1:6379", "REDIS_PASSWORD": "pwd"},
            clear=True,
        ):
            _get_or_create_redis_service()

        mock_redis_service_cls.assert_called_once_with(
            cluster_addr="127.0.0.1:6379", password="pwd"
        )

    @patch("plugin.link.extensions.database_migration.RedisService")
    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    def test_get_or_create_redis_service_creates_from_standalone_addr(
        self, mock_get_redis: MagicMock, mock_redis_service_cls: MagicMock
    ) -> None:
        """Test RedisService is created from REDIS_ADDR when missing engine."""
        mock_get_redis.return_value = None
        with patch.dict(
            os.environ,
            {"REDIS_ADDR": "127.0.0.1:6380", "REDIS_PASSWORD": "pwd"},
            clear=True,
        ):
            _get_or_create_redis_service()

        mock_redis_service_cls.assert_called_once_with(
            cluster_addr="127.0.0.1:6380", password="pwd"
        )

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    def test_get_or_create_redis_service_raises_when_addr_missing(
        self, mock_get_redis: MagicMock
    ) -> None:
        """Test Redis address is required when no engine exists."""
        mock_get_redis.return_value = None

        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError) as exc_info:
                _get_or_create_redis_service()
            assert "Redis address is not set" in str(exc_info.value)


@pytest.mark.unit
class TestMigrationErrorHandling:
    """Test class for migration error handling internals"""

    @patch("plugin.link.extensions.database_migration.command")
    def test_handle_migration_error_permissions_do_not_retry(
        self, mock_command: MagicMock
    ) -> None:
        """Test permission errors are skipped without stamp/retry."""
        config = MagicMock()
        error = OperationalError("", "", _MockDbError(MYSQL_ERROR_SELECT_DENIED))

        _handle_migration_error(config, error)

        mock_command.stamp.assert_not_called()
        mock_command.upgrade.assert_not_called()

    @patch("plugin.link.extensions.database_migration.command")
    def test_handle_migration_error_table_exists_stamps_and_upgrades(
        self, mock_command: MagicMock
    ) -> None:
        """Test legacy table-exists errors trigger stamp then upgrade."""
        config = MagicMock()
        error = OperationalError("", "", _MockDbError(MYSQL_ERROR_TABLE_EXISTS))

        _handle_migration_error(config, error)

        mock_command.stamp.assert_called_once_with(config, INIT_VERSION)
        mock_command.upgrade.assert_called_once_with(config, "head")


@pytest.mark.unit
class TestExecuteMigration:
    """Test class for _execute_migration function"""

    @patch("plugin.link.extensions.database_migration.command")
    def test_execute_migration_success(self, mock_command: MagicMock) -> None:
        """Test migration upgrade runs to head in success path."""
        config = MagicMock()

        _execute_migration(config)

        mock_command.upgrade.assert_called_once_with(config, "head")

    @patch("plugin.link.extensions.database_migration.command")
    def test_execute_migration_operational_error_table_exists(
        self, mock_command: MagicMock
    ) -> None:
        """Test migration handles table exists by stamp + second upgrade."""
        config = MagicMock()
        mock_command.upgrade.side_effect = [
            OperationalError("", "", _MockDbError(MYSQL_ERROR_TABLE_EXISTS)),
            None,
        ]

        _execute_migration(config)

        assert mock_command.upgrade.call_count == 2
        mock_command.stamp.assert_called_once_with(config, INIT_VERSION)

    @patch("plugin.link.extensions.database_migration.command")
    def test_execute_migration_general_exception(self, mock_command: MagicMock) -> None:
        """Test migration swallows unexpected exceptions."""
        config = MagicMock()
        mock_command.upgrade.side_effect = Exception("General error")

        _execute_migration(config)

        mock_command.upgrade.assert_called_once_with(config, "head")


@pytest.mark.unit
class TestRunDatabaseMigration:
    """Test class for run_database_migration function"""

    @pytest.fixture(autouse=True)
    def _set_mysql_env(self) -> Any:
        """Provide required MySQL env vars for run_database_migration tests."""
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "testuser",
            "MYSQL_PASSWORD": "testpass",
            "MYSQL_DB": "testdb",
        }
        with patch.dict(os.environ, env_vars, clear=False):
            yield

    @patch("plugin.link.extensions.database_migration._execute_migration")
    @patch("plugin.link.extensions.database_migration._get_or_create_redis_service")
    @patch("plugin.link.extensions.database_migration._check_db_url")
    @patch("plugin.link.extensions.database_migration._build_alembic_config")
    def test_run_database_migration_already_locked(
        self,
        mock_build_config: MagicMock,
        mock_check_db_url: MagicMock,
        mock_get_or_create_redis: MagicMock,
        mock_execute_migration: MagicMock,
    ) -> None:
        """Test migration is skipped when Redis lock is already held"""
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = False
        mock_get_or_create_redis.return_value = mock_redis

        run_database_migration()

        mock_build_config.assert_called_once()
        mock_check_db_url.assert_called_once()
        mock_redis.setnx.assert_called_once_with(
            LOCK_KEY, "locked", ex=LOCK_TTL_SECONDS
        )
        mock_execute_migration.assert_not_called()

    @patch("plugin.link.extensions.database_migration._execute_migration")
    @patch("plugin.link.extensions.database_migration._get_or_create_redis_service")
    @patch("plugin.link.extensions.database_migration._check_db_url")
    @patch("plugin.link.extensions.database_migration._build_alembic_config")
    def test_run_database_migration_successful(
        self,
        mock_build_config: MagicMock,
        mock_check_db_url: MagicMock,
        mock_get_or_create_redis: MagicMock,
        mock_execute_migration: MagicMock,
    ) -> None:
        """Test migration executes when lock is acquired."""
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = True
        mock_get_or_create_redis.return_value = mock_redis

        run_database_migration()

        mock_build_config.assert_called_once()
        mock_check_db_url.assert_called_once()
        mock_redis.setnx.assert_called_once_with(
            LOCK_KEY, "locked", ex=LOCK_TTL_SECONDS
        )
        mock_execute_migration.assert_called_once()


@pytest.mark.unit
class TestMigrationConstants:
    """Test class for migration module constants"""

    def test_init_version_is_valid_string(self) -> None:
        """Test that INIT_VERSION is a valid version string"""
        assert isinstance(INIT_VERSION, str)
        assert len(INIT_VERSION) > 0

    def test_lock_key_is_valid_string(self) -> None:
        """Test that LOCK_KEY is a valid string"""
        assert isinstance(LOCK_KEY, str)
        assert len(LOCK_KEY) > 0
        assert LOCK_KEY == "link_database_migration_lock"

    def test_lock_ttl_seconds_is_positive_integer(self) -> None:
        """Test that LOCK_TTL_SECONDS is a positive integer"""
        assert isinstance(LOCK_TTL_SECONDS, int)
        assert LOCK_TTL_SECONDS > 0

    def test_mysql_error_codes_are_valid_integers(self) -> None:
        """Test that MySQL error codes are valid integers"""
        assert isinstance(MYSQL_ERROR_SELECT_DENIED, int)
        assert isinstance(MYSQL_ERROR_ACCESS_DENIED, int)
        assert isinstance(MYSQL_ERROR_EXECUTE_DENIED, int)
        assert isinstance(MYSQL_ERROR_TABLE_EXISTS, int)

    def test_mysql_error_codes_are_unique(self) -> None:
        """Test that MySQL error codes are unique"""
        error_codes = [
            MYSQL_ERROR_SELECT_DENIED,
            MYSQL_ERROR_ACCESS_DENIED,
            MYSQL_ERROR_EXECUTE_DENIED,
            MYSQL_ERROR_TABLE_EXISTS,
        ]
        assert len(error_codes) == len(set(error_codes))

    def test_mysql_error_code_values(self) -> None:
        """Test MySQL error code specific values"""
        assert MYSQL_ERROR_SELECT_DENIED == 1142
        assert MYSQL_ERROR_ACCESS_DENIED == 1227
        assert MYSQL_ERROR_EXECUTE_DENIED == 1370
        assert MYSQL_ERROR_TABLE_EXISTS == 1050
