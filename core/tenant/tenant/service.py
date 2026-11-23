"""Application and API key operations against the existing Tenant schema."""

import hmac
import secrets
from datetime import datetime
from typing import Any

from sqlalchemy import Connection, Engine, select
from sqlalchemy.engine import RowMapping

from .database import app_lock, apps, keys

APP_NOT_FOUND = 3003
KEY_EXISTS = 3004
KEY_NOT_FOUND = 3006
NAME_EXISTS = 3007


class BusinessError(Exception):
    """Error returned in the legacy Tenant JSON envelope."""

    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code


def app_summary(app: RowMapping, *, for_list: bool = False) -> dict[str, Any]:
    created = app.registration_time
    return {
        "appid": app.app_id,
        "name": app.app_name or "",
        "dev_id": app.dev_id or 0,
        "cloud_id": app.channel_id or "",
        "source": app.source or "",
        "is_disable": bool(app.is_disable) if for_list else False,
        "desc": app.app_desc or "",
        "create_time": created.isoformat(sep=" ") if for_list and created else "",
    }


def credential(row: RowMapping) -> dict[str, str]:
    return {"api_key": row.api_key, "api_secret": row.api_secret or ""}


def require_app(connection: Connection, app_id: str, message: str) -> dict[str, Any]:
    app = app_lock(connection, app_id)
    if app is None or app["is_delete"] is not False:
        raise BusinessError(APP_NOT_FOUND, message)
    return app


def reject_duplicate_name(
    connection: Connection,
    *,
    name: str,
    dev_id: int,
    channel: str,
    source: str,
    excluding: str | None = None,
) -> None:
    query = select(apps.c.app_id).where(
        apps.c.dev_id == dev_id,
        apps.c.app_name.like(name),
        apps.c.source == source,
        apps.c.channel_id == channel,
        apps.c.is_delete.is_(False),
    )
    if excluding is not None:
        query = query.where(apps.c.app_id != excluding)
    if connection.scalar(query.limit(1).with_for_update()) is not None:
        message = (
            "app name has been exist"
            if excluding
            else f"app name[{name}] has been exist"
        )
        raise BusinessError(NAME_EXISTS, message)


def insert_key(
    connection: Connection, app_id: str, api_key: str = "", api_secret: str = ""
) -> dict[str, str]:
    api_key = api_key or secrets.token_hex(16)
    api_secret = api_secret or secrets.token_urlsafe(24)
    existing = connection.execute(
        select(keys.c.app_id, keys.c.is_delete)
        .where(keys.c.api_key == api_key)
        .with_for_update()
    )
    if any(row.app_id == app_id or row.is_delete is False for row in existing):
        raise BusinessError(KEY_EXISTS, "api key has been exist")
    now = datetime.now().replace(microsecond=0)
    connection.execute(
        keys.insert().values(
            app_id=app_id,
            api_key=api_key,
            api_secret=api_secret,
            source=0,
            is_delete=False,
            registration_time=now,
            update_time=now,
            extend="",
        )
    )
    return {"api_key": api_key, "api_secret": api_secret}


class TenantService:
    """Commit writes before reporting success and serialize changes per app."""

    def __init__(self, engine: Engine):
        self.engine = engine

    def create_app(
        self, name: str, description: str, dev_id: int, channel: str, source: str
    ) -> dict:
        app_id = secrets.token_hex(4)
        now = datetime.now().replace(microsecond=0)
        with self.engine.begin() as connection:
            reject_duplicate_name(
                connection, name=name, dev_id=dev_id, channel=channel, source=source
            )
            connection.execute(
                apps.insert().values(
                    app_id=app_id,
                    app_name=name,
                    dev_id=dev_id,
                    channel_id="0" if channel == source else channel,
                    source=source,
                    is_disable=False,
                    app_desc=description,
                    is_delete=False,
                    registration_time=now,
                    update_time=now,
                    extend="",
                )
            )
            return {"app_id": app_id, **insert_key(connection, app_id)}

    def modify_app(self, app_id: str, name: str, description: str, source: str) -> None:
        with self.engine.begin() as connection:
            app = require_app(connection, app_id, f"request app id({app_id}) not found")
            updates: dict[str, Any] = {
                "source": source,
                "update_time": datetime.now().replace(microsecond=0),
            }
            if name:
                reject_duplicate_name(
                    connection,
                    name=name,
                    dev_id=app["dev_id"],
                    channel=app["channel_id"],
                    source=source,
                    excluding=app_id,
                )
                updates["app_name"] = name
            if description:
                updates["app_desc"] = description
            connection.execute(
                apps.update().where(apps.c.app_id == app_id).values(**updates)
            )

    def disable_app(self, app_id: str, disable: bool) -> None:
        with self.engine.begin() as connection:
            require_app(connection, app_id, f"request app id({app_id}) not found")
            connection.execute(
                apps.update()
                .where(apps.c.app_id == app_id, apps.c.is_disable != disable)
                .values(is_disable=disable)
            )

    def delete_app(self, app_id: str) -> None:
        with self.engine.begin() as connection:
            require_app(connection, app_id, "request app_id not found")
            changes = {
                "is_delete": True,
                "update_time": datetime.now().replace(microsecond=0),
            }
            connection.execute(
                apps.update().where(apps.c.app_id == app_id).values(**changes)
            )
            connection.execute(
                keys.update().where(keys.c.app_id == app_id).values(**changes)
            )

    def query_apps(
        self,
        app_ids: list[str],
        name: str,
        dev_id: int,
        cloud_id: str,
        *,
        details: bool,
    ) -> list[dict[str, Any]]:
        query = select(apps).where(apps.c.is_delete.is_(False))
        if app_ids:
            query = query.where(apps.c.app_id.in_(app_ids))
        if name:
            query = query.where(apps.c.app_name.like(f"%{name}%"))
        if dev_id > 0:
            query = query.where(apps.c.dev_id == dev_id)
        if cloud_id:
            query = query.where(apps.c.channel_id == cloud_id)
        with self.engine.connect() as connection:
            matches = connection.execute(query).mappings().all()
            if details:
                return self._details(connection, matches)
            return [app_summary(app, for_list=True) for app in matches]

    @staticmethod
    def _details(
        connection: Connection, matches: list[RowMapping]
    ) -> list[dict[str, Any]]:
        details = {
            app.app_id: {
                "appid": app.app_id,
                "name": app.app_name or "",
                "is_disable": bool(app.is_disable),
                "desc": app.app_desc or "",
            }
            for app in matches
        }
        if details:
            query = select(keys).where(
                keys.c.app_id.in_(details), keys.c.is_delete.is_(False)
            )
            for key in connection.execute(query).mappings():
                details[key.app_id].setdefault("auth_list", []).append(credential(key))
        return list(details.values())

    def add_key(self, app_id: str, api_key: str, api_secret: str) -> dict[str, str]:
        with self.engine.begin() as connection:
            require_app(connection, app_id, "request app_id not found")
            return insert_key(connection, app_id, api_key, api_secret)

    def delete_key(self, app_id: str, api_key: str) -> None:
        with self.engine.begin() as connection:
            require_app(connection, app_id, "request app_id not found")
            result = connection.execute(
                keys.update()
                .where(
                    keys.c.app_id == app_id,
                    keys.c.api_key == api_key,
                    keys.c.is_delete.is_(False),
                )
                .values(
                    is_delete=True, update_time=datetime.now().replace(microsecond=0)
                )
            )
            if result.rowcount == 0:
                raise BusinessError(KEY_NOT_FOUND, "api key not exist")

    def list_keys(self, app_id: str) -> list[dict[str, str]]:
        with self.engine.connect() as connection:
            query = select(keys).where(
                keys.c.app_id == app_id, keys.c.is_delete.is_(False)
            )
            return [credential(row) for row in connection.execute(query).mappings()]

    def find_app_for_key(
        self, api_key: str, api_secret: str | None = None
    ) -> dict[str, Any]:
        query = (
            select(apps, keys.c.api_secret)
            .select_from(keys.outerjoin(apps, apps.c.app_id == keys.c.app_id))
            .where(keys.c.api_key == api_key, keys.c.is_delete.is_(False))
        )
        with self.engine.connect() as connection:
            for row in connection.execute(query).mappings():
                if api_secret is not None and (
                    row.api_secret is None
                    or not hmac.compare_digest(
                        row.api_secret.encode(), api_secret.encode()
                    )
                ):
                    continue
                if row.app_id and row.is_disable is False and row.is_delete is False:
                    return app_summary(row)
                raise BusinessError(APP_NOT_FOUND, "app id not exist")
        if api_secret is not None:
            raise BusinessError(KEY_NOT_FOUND, "api key or secret not exist")
        raise BusinessError(APP_NOT_FOUND, "app id not exist")
