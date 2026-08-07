from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient

from common.service.base import ServiceType


class DummyService:
    def __init__(self, ready: bool) -> None:
        self.ready = ready


class DummyConnection:
    def __init__(self) -> None:
        self.executed_sql: list[str] = []

    def __enter__(self) -> "DummyConnection":
        return self

    def __exit__(self, *args: Any) -> None:
        return None

    def execute(self, statement: Any) -> None:
        self.executed_sql.append(str(statement))


class DummyEngine:
    def __init__(self) -> None:
        self.connection = DummyConnection()

    def connect(self) -> DummyConnection:
        return self.connection


class FailingEngine:
    def connect(self) -> DummyConnection:
        raise RuntimeError("database password leaked")


class DummyDatabaseService(DummyService):
    def __init__(self, ready: bool, engine: Any) -> None:
        super().__init__(ready)
        self.engine = engine


class DummyServiceManager:
    def __init__(self, services: dict[Any, DummyService]) -> None:
        self.services = services


def build_client(manager: DummyServiceManager) -> TestClient:
    from common.health import create_health_router

    app = FastAPI()
    app.include_router(create_health_router("test-service", manager))
    return TestClient(app)


def test_liveness_endpoint_reports_process_up() -> None:
    client = build_client(DummyServiceManager({}))

    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"service": "test-service", "status": "UP"}


def test_readiness_endpoint_reports_registered_services() -> None:
    client = build_client(
        DummyServiceManager(
            {
                ServiceType.DATABASE_SERVICE: DummyService(True),
                "cache_service": DummyService(True),
            }
        )
    )

    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "service": "test-service",
        "status": "UP",
        "checks": {
            "cache_service": {"ready": True, "status": "UP"},
            "database_service": {"ready": True, "status": "UP"},
        },
    }


def test_readiness_endpoint_returns_503_when_a_service_is_not_ready() -> None:
    client = build_client(
        DummyServiceManager(
            {
                ServiceType.DATABASE_SERVICE: DummyService(True),
                ServiceType.KAFKA_PRODUCER_SERVICE: DummyService(False),
            }
        )
    )

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["status"] == "DOWN"
    assert response.json()["checks"]["database_service"] == {
        "ready": True,
        "status": "UP",
    }
    assert response.json()["checks"]["kafka_producer_service"] == {
        "ready": False,
        "status": "DOWN",
    }


def test_readiness_endpoint_checks_database_connection() -> None:
    engine = DummyEngine()
    client = build_client(
        DummyServiceManager(
            {
                ServiceType.DATABASE_SERVICE: DummyDatabaseService(True, engine),
            }
        )
    )

    response = client.get("/health/ready")

    assert response.status_code == 200
    assert engine.connection.executed_sql == ["SELECT 1"]
    assert response.json()["checks"]["database_service"] == {
        "database": {"connected": True},
        "ready": True,
        "status": "UP",
    }


def test_readiness_endpoint_returns_503_when_database_connection_fails() -> None:
    client = build_client(
        DummyServiceManager(
            {
                ServiceType.DATABASE_SERVICE: DummyDatabaseService(
                    True, FailingEngine()
                ),
            }
        )
    )

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["checks"]["database_service"] == {
        "database": {"connected": False, "error": "RuntimeError"},
        "ready": True,
        "status": "DOWN",
    }
    assert "password" not in str(response.json()).lower()
