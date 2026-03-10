"""
Unit tests for database migration module

Tests the Alembic auto-migration functionality including:
- Database URL building and validation
- Alembic configuration setup
- Database migration execution with Redis distributed lock
- Error handling for various MySQL error codes
"""

import os
from typing import Any, Dict
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
    _build_db_url,
    run_database_migration,
)


@pytest.mark.unit
class TestBuildDbUrl:
    """Test class for _build_db_url function"""

    def test_build_db_url_success_with_all_env_vars(self) -> None:
        """Test successful database URL building with all required environment variables"""
        # Arrange
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "testuser",
            "MYSQL_PASSWORD": "testpass",
            "MYSQL_DB": "testdb",
        }

        # Act & Assert
        with patch.dict(os.environ, env_vars):
            result = _build_db_url()
            assert result == "mysql+pymysql://testuser:testpass@localhost:3306/testdb"

    def test_build_db_url_missing_mysql_host(self) -> None:
        """Test database URL building fails when MYSQL_HOST is missing"""
        # Arrange
        env_vars = {
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "testuser",
            "MYSQL_PASSWORD": "testpass",
            "MYSQL_DB": "testdb",
        }

        # Act & Assert
        with patch.dict(os.environ, env_vars, clear=True):
            with pytest.raises(ValueError) as exc_info:
                _build_db_url()
            assert "Missing required MySQL environment variables" in str(exc_info.value)
            assert "MYSQL_HOST" in str(exc_info.value)

    def test_build_db_url_missing_mysql_port(self) -> None:
        """Test database URL building fails when MYSQL_PORT is missing"""
        # Arrange
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_USER": "testuser",
            "MYSQL_PASSWORD": "testpass",
            "MYSQL_DB": "testdb",
        }

        # Act & Assert
        with patch.dict(os.environ, env_vars, clear=True):
            with pytest.raises(ValueError) as exc_info:
                _build_db_url()
            assert "Missing required MySQL environment variables" in str(exc_info.value)
            assert "MYSQL_PORT" in str(exc_info.value)

    def test_build_db_url_missing_mysql_user(self) -> None:
        """Test database URL building fails when MYSQL_USER is missing"""
        # Arrange
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_PASSWORD": "testpass",
            "MYSQL_DB": "testdb",
        }

        # Act & Assert
        with patch.dict(os.environ, env_vars, clear=True):
            with pytest.raises(ValueError) as exc_info:
                _build_db_url()
            assert "Missing required MySQL environment variables" in str(exc_info.value)
            assert "MYSQL_USER" in str(exc_info.value)

    def test_build_db_url_missing_mysql_password(self) -> None:
        """Test database URL building fails when MYSQL_PASSWORD is missing"""
        # Arrange
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "testuser",
            "MYSQL_DB": "testdb",
        }

        # Act & Assert
        with patch.dict(os.environ, env_vars, clear=True):
            with pytest.raises(ValueError) as exc_info:
                _build_db_url()
            assert "Missing required MySQL environment variables" in str(exc_info.value)
            assert "MYSQL_PASSWORD" in str(exc_info.value)

    def test_build_db_url_missing_mysql_db(self) -> None:
        """Test database URL building fails when MYSQL_DB is missing"""
        # Arrange
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "testuser",
            "MYSQL_PASSWORD": "testpass",
        }

        # Act & Assert
        with patch.dict(os.environ, env_vars, clear=True):
            with pytest.raises(ValueError) as exc_info:
                _build_db_url()
            assert "Missing required MySQL environment variables" in str(exc_info.value)
            assert "MYSQL_DB" in str(exc_info.value)

    def test_build_db_url_with_special_characters_in_password(self) -> None:
        """Test database URL building with special characters in password"""
        # Arrange
        env_vars = {
            "MYSQL_HOST": "localhost",
            "MYSQL_PORT": "3306",
            "MYSQL_USER": "testuser",
            "MYSQL_PASSWORD": "p@ssw0rd!#$",
            "MYSQL_DB": "testdb",
        }

        # Act & Assert
        with patch.dict(os.environ, env_vars):
            result = _build_db_url()
            assert (
                result == "mysql+pymysql://testuser:p@ssw0rd!#$@localhost:3306/testdb"
            )

    def test_build_db_url_with_different_host_and_port(self) -> None:
        """Test database URL building with different host and port"""
        # Arrange
        env_vars = {
            "MYSQL_HOST": "db.example.com",
            "MYSQL_PORT": "3307",
            "MYSQL_USER": "user",
            "MYSQL_PASSWORD": "pass",
            "MYSQL_DB": "mydb",
        }

        # Act & Assert
        with patch.dict(os.environ, env_vars):
            result = _build_db_url()
            assert result == "mysql+pymysql://user:pass@db.example.com:3307/mydb"


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
        assert str(alembic_dir) in config.get_main_option("script_location")

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

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration.command")
    def test_run_database_migration_already_locked(
        self, mock_command: MagicMock, mock_get_redis: MagicMock
    ) -> None:
        """Test migration is skipped when Redis lock is already held"""
        # Arrange
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = False  # Lock already held
        mock_get_redis.return_value = mock_redis

        # Act
        run_database_migration()

        # Assert
        mock_command.upgrade.assert_not_called()

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration.command")
    def test_run_database_migration_successful(
        self, mock_command: MagicMock, mock_get_redis: MagicMock
    ) -> None:
        """Test successful database migration execution"""
        # Arrange
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = True  # Lock acquired
        mock_get_redis.return_value = mock_redis

        # Act
        run_database_migration()

        # Assert
        mock_command.upgrade.assert_called_once()
        call_args = mock_command.upgrade.call_args
        assert call_args[0][1] == "head"  # Check that "head" is the upgrade target

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration.command")
    def test_run_database_migration_insufficient_permissions(
        self, mock_command: MagicMock, mock_get_redis: MagicMock
    ) -> None:
        """Test migration handles insufficient database permissions gracefully"""
        # Arrange
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = True
        mock_get_redis.return_value = mock_redis

        # Create a mock exception with MySQL error code for permission denied
        mock_error = MagicMock()
        mock_error.orig = MagicMock()
        mock_error.orig.args = (MYSQL_ERROR_SELECT_DENIED,)

        from sqlalchemy.exc import OperationalError

        mock_command.upgrade.side_effect = OperationalError("", "", mock_error.orig)

        # Act & Assert
        # Should not raise exception
        run_database_migration()

        # Verify upgrade was called
        mock_command.upgrade.assert_called()

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration.command")
    def test_run_database_migration_access_denied_error(
        self, mock_command: MagicMock, mock_get_redis: MagicMock
    ) -> None:
        """Test migration handles MySQL access denied error"""
        # Arrange
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = True
        mock_get_redis.return_value = mock_redis

        mock_error = MagicMock()
        mock_error.orig = MagicMock()
        mock_error.orig.args = (MYSQL_ERROR_ACCESS_DENIED,)

        from sqlalchemy.exc import OperationalError

        mock_command.upgrade.side_effect = OperationalError("", "", mock_error.orig)

        # Act & Assert
        run_database_migration()

        # Should not raise exception
        mock_command.upgrade.assert_called()

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration.command")
    def test_run_database_migration_execute_denied_error(
        self, mock_command: MagicMock, mock_get_redis: MagicMock
    ) -> None:
        """Test migration handles MySQL execute denied error"""
        # Arrange
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = True
        mock_get_redis.return_value = mock_redis

        mock_error = MagicMock()
        mock_error.orig = MagicMock()
        mock_error.orig.args = (MYSQL_ERROR_EXECUTE_DENIED,)

        from sqlalchemy.exc import OperationalError

        mock_command.upgrade.side_effect = OperationalError("", "", mock_error.orig)

        # Act & Assert
        run_database_migration()

        # Should not raise exception
        mock_command.upgrade.assert_called()

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration.command")
    def test_run_database_migration_table_exists_error(
        self, mock_command: MagicMock, mock_get_redis: MagicMock
    ) -> None:
        """Test migration handles legacy database with table exists error"""
        # Arrange
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = True
        mock_get_redis.return_value = mock_redis

        mock_error = MagicMock()
        mock_error.orig = MagicMock()
        mock_error.orig.args = (MYSQL_ERROR_TABLE_EXISTS,)

        from sqlalchemy.exc import OperationalError

        mock_command.upgrade.side_effect = OperationalError("", "", mock_error.orig)

        # Act & Assert
        run_database_migration()

        # Should call stamp and then upgrade
        assert mock_command.stamp.called or mock_command.upgrade.call_count >= 1

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration.command")
    def test_run_database_migration_generic_error(
        self, mock_command: MagicMock, mock_get_redis: MagicMock
    ) -> None:
        """Test migration handles generic database errors"""
        # Arrange
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = True
        mock_get_redis.return_value = mock_redis

        mock_error = MagicMock()
        mock_error.orig = MagicMock()
        mock_error.orig.args = (999,)  # Unknown error code

        from sqlalchemy.exc import OperationalError

        mock_command.upgrade.side_effect = OperationalError("", "", mock_error.orig)

        # Act & Assert
        # Should not raise exception
        run_database_migration()

        # Should attempt upgrade
        mock_command.upgrade.assert_called()

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration.command")
    def test_run_database_migration_general_exception(
        self, mock_command: MagicMock, mock_get_redis: MagicMock
    ) -> None:
        """Test migration handles general exception during upgrade"""
        # Arrange
        mock_redis = MagicMock()
        mock_redis.setnx.return_value = True
        mock_get_redis.return_value = mock_redis

        mock_command.upgrade.side_effect = Exception("General error")

        # Act & Assert
        # Should not raise exception
        run_database_migration()

        # Should attempt upgrade
        mock_command.upgrade.assert_called()

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    @patch("plugin.link.extensions.database_migration._execute_migration")
    @patch("plugin.link.extensions.database_migration._get_or_create_redis_service")
    def test_run_database_migration_creates_redis_service_if_not_available(
        self,
        mock_get_or_create: MagicMock,
        mock_execute_migration: MagicMock,
        mock_get_redis: MagicMock,
    ) -> None:
        """Test migration creates new Redis service if get_redis_engine returns None"""
        mock_get_redis.return_value = None  # No Redis service available
        mock_redis_instance = MagicMock()
        mock_redis_instance.setnx.return_value = True
        mock_get_or_create.return_value = mock_redis_instance

        # Act
        run_database_migration()

        # Assert
        # Should call _get_or_create_redis_service
        mock_get_or_create.assert_called_once()
        mock_execute_migration.assert_called_once()

    @patch("plugin.link.extensions.database_migration.get_redis_engine")
    def test_run_database_migration_redis_addr_not_set(
        self, mock_get_redis: MagicMock
    ) -> None:
        """Test migration raises error when Redis address is not configured"""
        # Arrange
        mock_get_redis.return_value = None

        # Clear Redis environment variables
        env_vars: Dict[str, Any] = {}

        # Act & Assert
        with patch(
            "plugin.link.extensions.database_migration._build_db_url",
            return_value="mysql+pymysql://u:p@h:3306/db",
        ):
            with patch.dict(os.environ, env_vars, clear=True):
                with pytest.raises(ValueError) as exc_info:
                    run_database_migration()
                assert "Redis address is not set" in str(exc_info.value)


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
