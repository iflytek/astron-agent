"""Exercise fresh and upgraded Tenant deployments on an isolated MySQL server."""

import os
from collections.abc import Iterator
from dataclasses import replace
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, select

from tenant.api import create_app_server
from tenant.config import (
    BOOTSTRAP_TENANT_ID,
    LEGACY_TENANT_KEY,
    LEGACY_TENANT_SECRET,
    BootstrapCredentials,
    Settings,
    database_settings,
)
from tenant.database import MANAGED_CREDENTIAL, StartupError, apps, keys, open_database
from tenant.schema import INITIAL_SCHEMA

PREFIX = "/v2/app"
OWNER = {"request_id": "create", "dev_id": 22, "cloud_id": "0"}
APP = {"request_id": "change"}


@pytest.fixture
def mysql() -> Iterator[tuple[Settings, Engine]]:
    port = os.getenv("TENANT_TEST_MYSQL_PORT")
    if not port:
        pytest.skip("requires an isolated MySQL server")
    database = f"tenant_test_{uuid4().hex}"
    url, connect_args = database_settings(
        f"(127.0.0.1:{port})/{database}?tls=skip-verify&timeout=2s&readTimeout=2500ms",
        "root",
        os.getenv("TENANT_TEST_MYSQL_PASSWORD") or "unused",
    )
    if not os.getenv("TENANT_TEST_MYSQL_PASSWORD"):
        url = url.set(password="")
        connect_args["password"] = b""
    admin = create_engine(url.set(database=""))
    settings = Settings(
        5052,
        Path("unused"),
        url,
        5,
        2,
        BootstrapCredentials(BOOTSTRAP_TENANT_ID, "K" * 32, "S" * 32),
        connect_args,
    )
    try:
        yield settings, admin
    finally:
        with admin.begin() as connection:
            connection.exec_driver_sql(f"DROP DATABASE IF EXISTS {database}")
        admin.dispose()


def create_demo(client: TestClient, name: str) -> dict:
    response = client.post(PREFIX, json={**OWNER, "app_name": name, "app_desc": "demo"})
    assert response.status_code == 200 and response.json()["code"] == 0
    return response.json()["data"]


def verify(client: TestClient, pair: dict, code: int = 0) -> dict:
    response = client.post(f"{PREFIX}/key/verify", json=pair)
    assert response.status_code == 200 and response.json()["code"] == code
    return response.json()


def test_application_and_key_lifecycle(mysql: tuple[Settings, Engine]) -> None:
    settings, _ = mysql
    with TestClient(
        create_app_server(settings),
        headers={"X-Tenant-Internal-Key": settings.bootstrap.secret},
    ) as client:
        created = create_demo(client, "example")
        app_id = created["app_id"]
        app_ref = {**APP, "app_id": app_id}
        assert (
            len(app_id) == 8
            and len(created["api_key"]) == len(created["api_secret"]) == 32
        )
        second = create_demo(client, "second")
        duplicate = client.post(PREFIX, json={**OWNER, "app_name": "example"})
        assert duplicate.json()["code"] == 3007

        assert verify(client, created)["data"]["appid"] == app_id
        assert (
            client.get(f"{PREFIX}/key/api_key/{created['api_key']}").json()["data"][
                "appid"
            ]
            == app_id
        )
        assert (
            client.put(PREFIX, json={**app_ref, "app_name": "updated"}).json()["code"]
            == 0
        )
        listed = client.get(
            f"{PREFIX}/list", params={"name": "update", "dev_id": 22}
        ).json()["data"]
        assert listed[0]["appid"] == app_id and listed[0]["create_time"]
        assert (
            client.post(f"{PREFIX}/disable", json={**app_ref, "disable": True}).json()[
                "code"
            ]
            == 0
        )
        verify(client, created, 3003)
        assert client.post(f"{PREFIX}/disable", json=app_ref).json()["code"] == 0
        verify(client, created)

        additional = client.post(f"{PREFIX}/key", json=app_ref).json()["data"]
        assert len(client.get(f"{PREFIX}/key/{app_id}").json()["data"]) == 2
        wrong_app = client.request(
            "DELETE",
            f"{PREFIX}/key",
            json={**APP, "app_id": second["app_id"], "api_key": additional["api_key"]},
        )
        assert wrong_app.json()["code"] == 3006
        verify(client, additional)
        assert (
            client.request(
                "DELETE",
                f"{PREFIX}/key",
                json={**app_ref, "api_key": additional["api_key"]},
            ).json()["code"]
            == 0
        )
        verify(client, additional, 3006)
        details = client.get(f"{PREFIX}/details", params={"app_ids": app_id}).json()[
            "data"
        ]
        assert [pair["api_key"] for pair in details[0]["auth_list"]] == [
            created["api_key"]
        ]
        assert client.request("DELETE", PREFIX, json=app_ref).json()["code"] == 0
        verify(client, created, 3006)
        assert (
            client.get(f"{PREFIX}/details", params={"app_ids": app_id}).json()["data"]
            == []
        )


def test_creation_checks_duplicate_name_before_normalizing_channel(
    mysql: tuple[Settings, Engine],
) -> None:
    settings, _ = mysql
    with TestClient(
        create_app_server(settings),
        headers={"X-Tenant-Internal-Key": settings.bootstrap.secret},
    ) as client:
        existing = create_demo(client, "shared")
        response = client.post(
            PREFIX, json={**OWNER, "app_name": "shared", "cloud_id": "admin"}
        ).json()
        assert response["code"] == 0
        assert response["data"]["app_id"] != existing["app_id"]
        assert verify(client, response["data"])["data"]["cloud_id"] == "0"


def test_duplicate_app_name_matches_literal_name_in_same_namespace(
    mysql: tuple[Settings, Engine],
) -> None:
    settings, _ = mysql
    with TestClient(
        create_app_server(settings),
        headers={"X-Tenant-Internal-Key": settings.bootstrap.secret},
    ) as client:
        create_demo(client, "sample-1")
        literal = create_demo(client, "sample%")
        duplicate = client.post(PREFIX, json={**OWNER, "app_name": "sample%"})
        assert duplicate.json()["code"] == 3007
        other = client.post(
            PREFIX, json={**OWNER, "app_name": "sample%", "cloud_id": "another-owner"}
        ).json()
        assert other["code"] == 0
        assert other["data"]["app_id"] != literal["app_id"]


def prepare_legacy(settings: Settings, admin: Engine) -> None:
    with admin.begin() as connection:
        connection.exec_driver_sql(f"CREATE DATABASE {settings.database.database}")
    engine = create_engine(settings.database)
    try:
        with engine.begin() as connection:
            for statement in INITIAL_SCHEMA:
                connection.exec_driver_sql(statement)
            connection.execute(
                apps.insert().values(
                    app_id="existing",
                    app_name="Existing app",
                    dev_id=3,
                    is_disable=False,
                    is_delete=False,
                )
            )
            connection.execute(
                keys.insert(),
                [
                    {
                        "app_id": "existing",
                        "api_key": "customer_key",
                        "api_secret": "customer_secret",
                        "is_delete": False,
                    },
                    {
                        "app_id": BOOTSTRAP_TENANT_ID,
                        "api_key": LEGACY_TENANT_KEY,
                        "api_secret": LEGACY_TENANT_SECRET,
                        "is_delete": False,
                    },
                    {
                        "app_id": BOOTSTRAP_TENANT_ID,
                        "api_key": settings.bootstrap.api_key,
                        "api_secret": settings.bootstrap.secret,
                        "is_delete": False,
                    },
                ],
            )
    finally:
        engine.dispose()


def test_legacy_upgrade_and_rotation(mysql: tuple[Settings, Engine]) -> None:
    settings, admin = mysql
    prepare_legacy(settings, admin)
    first_pool = open_database(settings)
    first_pool.dispose()
    rotated = replace(
        settings,
        bootstrap=BootstrapCredentials(BOOTSTRAP_TENANT_ID, "R" * 32, "T" * 32),
    )
    with TestClient(
        create_app_server(rotated),
        headers={"X-Tenant-Internal-Key": rotated.bootstrap.secret},
    ) as client:
        verify(client, {"api_key": "customer_key", "api_secret": "customer_secret"})
        verify(
            client,
            {"api_key": LEGACY_TENANT_KEY, "api_secret": LEGACY_TENANT_SECRET},
            3006,
        )
        verify(
            client,
            {
                "api_key": settings.bootstrap.api_key,
                "api_secret": settings.bootstrap.secret,
            },
            3006,
        )
        result = verify(
            client,
            {
                "api_key": rotated.bootstrap.api_key,
                "api_secret": rotated.bootstrap.secret,
            },
        )
        assert result["data"]["appid"] == BOOTSTRAP_TENANT_ID
    collision = replace(
        rotated,
        bootstrap=BootstrapCredentials(BOOTSTRAP_TENANT_ID, "customer_key", "T" * 32),
    )
    with pytest.raises(StartupError, match="assigned to another"):
        open_database(collision)
    pool = open_database(rotated)
    try:
        with pool.connect() as connection:
            assert (
                connection.exec_driver_sql(
                    "SELECT version FROM schema_migrations"
                ).scalar_one()
                == "20260326_0001"
            )
            assert (
                connection.scalar(
                    select(keys.c["extend"]).where(
                        keys.c.api_key == rotated.bootstrap.api_key
                    )
                )
                == MANAGED_CREDENTIAL
            )
    finally:
        pool.dispose()


def test_mysql_session_settings_and_utf8_password(
    mysql: tuple[Settings, Engine]
) -> None:
    settings, admin = mysql
    username = f"tenant_{uuid4().hex[:16]}"
    password = "连接密码"
    database = settings.database.database
    url, connect_args = database_settings(
        f"(127.0.0.1:{settings.database.port})/{database}"
        "?time_zone=%27%2B00%3A00%27&sql_mode=%27ANSI_QUOTES%27",
        username,
        password,
    )
    with admin.begin() as connection:
        connection.exec_driver_sql(
            "CREATE USER %s@'%%' IDENTIFIED BY %s", (username, password)
        )
    try:
        with admin.begin() as connection:
            connection.exec_driver_sql(
                f"GRANT ALL ON `{database}`.* TO %s@'%%'", (username,)
            )
        pool = open_database(replace(settings, database=url, connect_args=connect_args))
        try:
            with pool.connect() as connection:
                time_zone, mode = connection.exec_driver_sql(
                    "SELECT @@session.time_zone, @@session.sql_mode"
                ).one()
            assert time_zone == "+00:00"
            assert mode == "ANSI_QUOTES"
        finally:
            pool.dispose()
    finally:
        with admin.begin() as connection:
            connection.exec_driver_sql("DROP USER %s@'%%'", (username,))
