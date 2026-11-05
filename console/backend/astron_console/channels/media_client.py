"""iFLYTEK's documented media protocol, including the official voice training API.

The provider publishes a Python demo, not an installable supported Python training SDK.
Use its public HTTP API with HTTPX; no Java service or duplicate speech engine is used.
https://www.xfyun.cn/doc/spark/reproduction.html
"""

import base64
import hashlib
import hmac
import json
import time
from email.utils import formatdate
from urllib.parse import quote, urlencode, urlsplit

import httpx
from django.core.exceptions import ValidationError

from astron_console.resources.common import UpstreamError
from astron_console.resources.platform_accounts import get_platform_config


def platform(kind="iflytek_open_platform", fields=None):
    value = get_platform_config(kind)
    if not all(
        value.get(name)
        for name in (fields or ("platformAppId", "platformApiKey", "platformApiSecret"))
    ):
        raise ValidationError("媒体平台凭据未配置")
    return value


def signed_url(url, key, secret):
    parts = urlsplit(url)
    date = formatdate(usegmt=True)
    canonical = f"host: {parts.netloc}\ndate: {date}\nGET {parts.path} HTTP/1.1"
    signature = base64.b64encode(
        hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).digest()
    ).decode()
    auth = base64.b64encode(
        (
            f'api_key="{key}", algorithm="hmac-sha256", '
            f'headers="host date request-line", signature="{signature}"'
        ).encode()
    ).decode()
    return url + "?" + urlencode({"authorization": auth, "date": date, "host": parts.netloc})


def speech_sign(clone=False):
    value = platform()
    url = (
        "wss://cn-huabei-1.xf-yun.com/v1/private/voice_clone"
        if clone
        else "wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6"
    )
    return {
        "appId": value["platformAppId"],
        "url": signed_url(url, value["platformApiKey"], value["platformApiSecret"]),
        "type": "CLONE" if clone else "ORIGINAL",
    }


def rtasr_sign():
    value = platform(fields=("platformAppId", "sparkRtasrApiKey"))
    timestamp = str(int(time.time()))
    digest = hashlib.md5((value["platformAppId"] + timestamp).encode()).hexdigest()
    signature = base64.b64encode(
        hmac.new(value["sparkRtasrApiKey"].encode(), digest.encode(), hashlib.sha1).digest()
    ).decode()
    return {
        "appid": value["platformAppId"],
        "ts": timestamp,
        "signa": quote(signature, safe=""),
        "url": "wss://rtasr.xfyun.cn/v1/ws",
    }


def avatar_sign():
    value = platform(
        "virtual_man", ("sparkVirtualManAppId", "sparkVirtualManApiKey", "sparkVirtualManApiSecret")
    )
    return signed_url(
        "wss://avatar.cn-huadong-1.xf-yun.com/v1/interact",
        value["sparkVirtualManApiKey"],
        value["sparkVirtualManApiSecret"],
    )


class VoiceTraining:
    def __init__(self):
        value = platform(fields=("platformAppId", "platformApiKey"))
        self.appid = value["platformAppId"]
        self.key = value["platformApiKey"]
        self.token = None

    @staticmethod
    def md5(value):
        return hashlib.md5(value if isinstance(value, bytes) else value.encode()).hexdigest()

    def request(self, path, payload=None, *, file=None):
        try:
            with httpx.Client(
                timeout=httpx.Timeout(40, connect=5), follow_redirects=False
            ) as client:
                if not self.token:
                    timestamp = str(int(time.time() * 1000))
                    body = json.dumps(
                        {
                            "base": {"appid": self.appid, "version": "v1", "timestamp": timestamp},
                            "model": "remote",
                        }
                    )
                    response = client.post(
                        "https://avatar-hci.xfyousheng.com/aiauth/v1/token",
                        content=body.encode(),
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": self.md5(self.md5(self.key + timestamp) + body),
                        },
                    )
                    response.raise_for_status()
                    token = response.json()
                    if token.get("retcode") != "000000" or not token.get("accesstoken"):
                        raise UpstreamError("声音训练鉴权失败")
                    self.token = token["accesstoken"]
                url = "https://opentrain.xfyousheng.com/voice_train/" + path
                if file is None:
                    req = client.build_request(
                        "POST",
                        url,
                        content=json.dumps(payload).encode(),
                        headers={"Content-Type": "application/json"},
                    )
                else:
                    req = client.build_request(
                        "POST",
                        url,
                        data={k: str(v) for k, v in payload.items()},
                        files={"file": (file.name, file, "application/octet-stream")},
                    )
                body = req.read()
                timestamp = str(int(time.time() * 1000))
                req.headers.update(
                    {
                        "X-Time": timestamp,
                        "X-AppId": self.appid,
                        "X-Token": self.token,
                        "X-Sign": self.md5(self.key + timestamp + self.md5(body)),
                    }
                )
                response = client.send(req)
                response.raise_for_status()
                result = response.json()
                if result.get("code") != 0:
                    raise UpstreamError("声音训练请求失败")
                return result.get("data")
        except (httpx.HTTPError, ValueError, TypeError):
            raise UpstreamError("声音训练平台响应异常") from None
