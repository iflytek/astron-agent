"""Test protocol and request validation independently of MySQL."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from tenant.api import create_app_server
from tenant.config import (
    BOOTSTRAP_TENANT_ID,
    BootstrapCredentials,
    Settings,
    database_settings,
)

KEY = "K" * 32
SECRET = "S" * 32
HEADERS = {"X-Tenant-Internal-Key": SECRET}
PREFIX = "/v2/app"


def settings() -> Settings:
    return Settings(
        5052,
        Path("unused.log"),
        database_settings("(localhost:3306)/tenant", "root", "test")[0],
        5,
        2,
        BootstrapCredentials(BOOTSTRAP_TENANT_ID, KEY, SECRET),
    )


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("POST", ""),
        ("PUT", ""),
        ("DELETE", ""),
        ("GET", "/list"),
        ("GET", "/details"),
        ("POST", "/disable"),
        ("POST", "/key"),
        ("DELETE", "/key"),
        ("GET", "/key/app"),
        ("POST", "/key/verify"),
        ("GET", "/key/api_key/key"),
    ],
)
def test_internal_header_is_required(method: str, path: str) -> None:
    client = TestClient(create_app_server(settings()))
    response = client.request(method, PREFIX + path, content="{")
    assert response.status_code == 401
    assert response.json() == {"sid": "", "code": 14003, "message": "unauthorized"}


def test_health_and_invalid_payloads() -> None:
    app = create_app_server(settings())
    app.state.tenant_service = None
    client = TestClient(app, headers=HEADERS)
    assert client.get("/ping", headers={"X-Tenant-Internal-Key": "invalid"}).json() == {
        "message": "pong"
    }
    malformed = client.post(
        PREFIX, content="{", headers={"Content-Type": "application/json"}
    )
    assert malformed.status_code == 400
    assert malformed.json()["code"] == 14001
    incomplete = client.post(
        f"{PREFIX}/key/verify", json={"api_key": KEY, "api_secret": None}
    )
    assert incomplete.status_code == 200
    assert incomplete.json()["message"] == "api_secret must not been empty"
    assert incomplete.json()["sid"]
    assert client.get(f"{PREFIX}/list").json()["code"] == 14001


def test_database_failure_does_not_return_credentials() -> None:
    class BrokenService:
        @staticmethod
        def find_app_for_key(_api_key: str, _api_secret: str) -> dict:
            raise SQLAlchemyError(SECRET)

    app = create_app_server(settings())
    app.state.tenant_service = BrokenService()
    client = TestClient(app, headers=HEADERS)
    response = client.post(
        f"{PREFIX}/key/verify", json={"api_key": KEY, "api_secret": SECRET}
    )
    assert response.status_code == 200
    assert response.json()["code"] == 3002
    assert SECRET not in response.text
