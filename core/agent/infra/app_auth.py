import base64
import datetime
import hashlib
import hmac
import json
import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

import aiohttp
from common.otlp.trace.span import Span
from pydantic import BaseModel, Field

from agent.exceptions.middleware_exc import AppAuthFailedExc
from agent.infra.credentials import credential_from_env_or_file

APP_AUTH_API_KEY_PLACEHOLDERS = (
    "YOUR_APP_AUTH_API_KEY",
    "xxxx",
    "7b709739e8da44536127a333c7603a83",
)
APP_AUTH_SECRET_PLACEHOLDERS = (
    "YOUR_APP_AUTH_SECRET",
    "xxxx",
    "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy",
)
APP_AUTH_CREDENTIAL_MIN_LENGTH = 32
APP_AUTH_CREDENTIAL_MAX_LENGTH = 50
TENANT_INTERNAL_API_KEY_HEADER = "X-Tenant-Internal-Key"


def http_date(dt: datetime.datetime) -> str:
    """
    Return a string representation of a date according to RFC 1123
    (HTTP/1.1).

    The supplied date must be in UTC.

    """
    weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dt.weekday()]
    month = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ][dt.month - 1]
    return (
        f"{weekday}, {dt.day:02d} {month} {dt.year:04d} "
        f"{dt.hour:02d}:{dt.minute:02d}:{dt.second:02d} GMT"
    )


def hashlib_256(res: str) -> str:
    m = hashlib.sha256(bytes(res.encode(encoding="utf-8"))).digest()
    result = "SHA256=" + base64.b64encode(m).decode(encoding="utf-8")
    return result


@dataclass
class AuthConfig:  # pylint: disable=too-many-instance-attributes
    """Authentication configuration"""

    host: str
    route: str
    prot: str
    api_key: str
    secret: str
    method: str = "GET"
    algorithm: str = "hmac-sha256"
    http_proto: str = "HTTP/1.1"

    @property
    def url(self) -> str:
        return f"{self.prot}://{self.host}{self.route}"


class APPAuth:

    def __init__(self) -> None:
        self.config = AuthConfig(
            host=os.getenv("APP_AUTH_HOST", "") or "",
            route=os.getenv("APP_AUTH_ROUTER", "") or "",
            prot=os.getenv("APP_AUTH_PROT", "") or "",
            api_key=credential_from_env_or_file(
                "APP_AUTH_API_KEY",
                "APP_AUTH_API_KEY_FILE",
                min_length=APP_AUTH_CREDENTIAL_MIN_LENGTH,
                max_length=APP_AUTH_CREDENTIAL_MAX_LENGTH,
                placeholders=APP_AUTH_API_KEY_PLACEHOLDERS,
            ),
            secret=credential_from_env_or_file(
                "APP_AUTH_SECRET",
                "APP_AUTH_SECRET_FILE",
                min_length=APP_AUTH_CREDENTIAL_MIN_LENGTH,
                max_length=APP_AUTH_CREDENTIAL_MAX_LENGTH,
                placeholders=APP_AUTH_SECRET_PLACEHOLDERS,
            ),
        )
        # Set current time
        self.date = http_date(datetime.datetime.utcnow())

    def generate_signature(self, digest: str) -> str:
        signature_str = "host: " + self.config.host + "\n"
        signature_str += "date: " + self.date + "\n"
        signature_str += (
            f"{self.config.method} {self.config.route} {self.config.http_proto}\n"
        )
        signature_str += "digest: " + digest
        signature = hmac.new(
            bytes(self.config.secret, encoding="UTF-8"),
            bytes(signature_str, encoding="UTF-8"),
            digestmod=hashlib.sha256,
        ).digest()
        result = base64.b64encode(signature)
        return result.decode(encoding="utf-8")

    def init_header(self, data: str) -> Dict[str, str]:
        digest = hashlib_256(data)
        sign = self.generate_signature(digest)
        auth_header = (
            f'api_key="{self.config.api_key}", '
            f'algorithm="{self.config.algorithm}", '
            f'headers="host date request-line digest", '
            f'signature="{sign}"'
        )
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Method": "GET",
            "Host": self.config.host,
            "Date": self.date,
            "Digest": digest,
            "Authorization": auth_header,
            TENANT_INTERNAL_API_KEY_HEADER: self.config.secret,
        }
        return headers

    async def app_detail(self, app_id: str) -> Optional[Dict[str, Any]]:
        headers = self.init_header("")
        async with aiohttp.ClientSession() as session:
            timeout = aiohttp.ClientTimeout(total=3)
            async with session.get(
                self.config.url,
                params={"app_ids": app_id + ","},
                headers=headers,
                timeout=timeout,
            ) as response:
                response.raise_for_status()
                if response.status == 200:
                    result = await response.json()
                    return dict(result)

                raise AppAuthFailedExc("response code is {response.status}")


class MaasAuth(BaseModel):
    app_id: str
    model_name: str

    app_id_not_found_msg: str = Field(
        default="Cannot find appid authentication information"
    )

    async def sk(self, span: Span) -> str:
        with span.start("QueryAppIdSk") as sp:
            app_detail = await APPAuth().app_detail(self.app_id)

            sp.add_info_events(
                {
                    "kong-app-detail": json.dumps(
                        {
                            "available": app_detail is not None,
                            "code": (
                                app_detail.get("code")
                                if isinstance(app_detail, dict)
                                else None
                            ),
                            "result_count": (
                                len(app_detail.get("data", []))
                                if isinstance(app_detail, dict)
                                and isinstance(app_detail.get("data", []), list)
                                else 0
                            ),
                        },
                        ensure_ascii=False,
                    )
                }
            )

            if app_detail is None:
                raise AppAuthFailedExc(self.app_id_not_found_msg)

            if app_detail.get("code") != 0:
                raise AppAuthFailedExc(app_detail.get("message", ""))

            data = app_detail.get("data", [])
            if not data or data[0].get("is_disable"):
                raise AppAuthFailedExc(self.app_id_not_found_msg)

            auth_list = data[0].get("auth_list", [])
            if len(auth_list) == 0:
                raise AppAuthFailedExc(self.app_id_not_found_msg)

            api_key = auth_list[0].get("api_key")
            api_secret = auth_list[0].get("api_secret")
            if not api_key or not api_secret:
                raise AppAuthFailedExc(self.app_id_not_found_msg)

            kong_sk = f"{api_key}:{api_secret}"

            sp.add_info_events({"kong-sk-retrieved": True})

            return kong_sk
