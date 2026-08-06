"""Database engine privacy configuration tests."""

from unittest.mock import patch

from workflow.extensions.middleware.database.manager import DatabaseService


def test_create_engine_hides_bound_parameters() -> None:
    service = DatabaseService.__new__(DatabaseService)
    service.pool_size = 10
    service.max_overflow = 20
    service.pool_recycle = 30

    with patch(
        "workflow.extensions.middleware.database.manager.create_engine"
    ) as create_engine:
        getattr(service, "_create_engine")("mysql+pymysql://example/test")

    create_engine.assert_called_once_with(
        "mysql+pymysql://example/test",
        echo=False,
        hide_parameters=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=30,
    )
