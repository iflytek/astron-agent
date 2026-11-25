"""WeChat's official encrypted callback and component API protocols.

WeChat publishes protocol examples rather than a supported Python component SDK.
AES is provided by cryptography; HTTP serialization/transport is provided by HTTPX.
"""

import base64
import hashlib
import hmac
import os
import struct
import time
from urllib.parse import quote

import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from django.conf import settings
from django.core.exceptions import ValidationError

from astron_console.resources.common import UpstreamError


def configuration():
    names = (
        "WECHAT_COMPONENT_APPID",
        "WECHAT_COMPONENT_SECRET",
        "WECHAT_TOKEN",
        "WECHAT_ENCODING_AES_KEY",
    )
    values = {key: getattr(settings, key, "") for key in names}
    if not all(values.values()):
        raise UpstreamError("微信开放平台凭据未配置")
    return values


def signature(token, timestamp, nonce, encrypted=""):
    return hashlib.sha1("".join(sorted((token, timestamp, nonce, encrypted))).encode()).hexdigest()


def decrypt(encrypted):
    cfg = configuration()
    try:
        key = base64.b64decode(cfg["WECHAT_ENCODING_AES_KEY"] + "=", validate=True)
        if len(key) != 32:
            raise ValueError
        raw = base64.b64decode(encrypted, validate=True)
        decryptor = Cipher(algorithms.AES(key), modes.CBC(key[:16])).decryptor()
        plain = decryptor.update(raw) + decryptor.finalize()
        pad = plain[-1]
        if not 1 <= pad <= 32 or plain[-pad:] != bytes([pad]) * pad:
            raise ValueError
        plain = plain[:-pad]
        if len(plain) < 20:
            raise ValueError
        size = struct.unpack("!I", plain[16:20])[0]
        if size > len(plain) - 20 or plain[20 + size :].decode() != cfg["WECHAT_COMPONENT_APPID"]:
            raise ValueError
        return plain[20 : 20 + size].decode()
    except (ValueError, TypeError, UnicodeError, IndexError, struct.error):
        raise ValidationError("微信加密消息无效") from None


def encrypt(message, *, timestamp=None, nonce=""):
    cfg = configuration()
    timestamp = str(timestamp or int(time.time()))
    nonce = str(nonce or os.urandom(8).hex())
    key = base64.b64decode(cfg["WECHAT_ENCODING_AES_KEY"] + "=", validate=True)
    body = (
        os.urandom(16)
        + struct.pack("!I", len(message.encode()))
        + message.encode()
        + cfg["WECHAT_COMPONENT_APPID"].encode()
    )
    pad = 32 - len(body) % 32
    encryptor = Cipher(algorithms.AES(key), modes.CBC(key[:16])).encryptor()
    encrypted = base64.b64encode(
        encryptor.update(body + bytes([pad]) * pad) + encryptor.finalize()
    ).decode()
    return encrypted, signature(cfg["WECHAT_TOKEN"], timestamp, nonce, encrypted), timestamp, nonce


def verify_callback(signed, timestamp, nonce, encrypted):
    cfg = configuration()
    if not all(isinstance(x, str) for x in (signed, timestamp, nonce, encrypted)):
        raise ValidationError("微信签名参数无效")
    if not hmac.compare_digest(signature(cfg["WECHAT_TOKEN"], timestamp, nonce, encrypted), signed):
        raise ValidationError("微信回调签名无效")
    return decrypt(encrypted)


def post(path, body):
    configuration()
    try:
        with httpx.Client(timeout=httpx.Timeout(15, connect=5), follow_redirects=False) as client:
            response = client.post("https://api.weixin.qq.com" + path, json=body)
            response.raise_for_status()
            data = response.json()
        if not isinstance(data, dict) or data.get("errcode", 0) not in (0, "0"):
            raise UpstreamError("微信平台请求失败")
        return data
    except (httpx.HTTPError, ValueError):
        raise UpstreamError("微信平台响应异常") from None


def component_token(ticket):
    cfg = configuration()
    result = post(
        "/cgi-bin/component/api_component_token",
        {
            "component_appid": cfg["WECHAT_COMPONENT_APPID"],
            "component_appsecret": cfg["WECHAT_COMPONENT_SECRET"],
            "component_verify_ticket": ticket,
        },
    )
    if not result.get("component_access_token"):
        raise UpstreamError("微信平台未返回访问凭据")
    return result


def pre_auth_code(token):
    result = post(
        f"/cgi-bin/component/api_create_preauthcode?component_access_token={quote(token)}",
        {"component_appid": configuration()["WECHAT_COMPONENT_APPID"]},
    )
    if not result.get("pre_auth_code"):
        raise UpstreamError("微信平台未返回授权码")
    return result["pre_auth_code"]


def query_authorizer(token, code):
    result = post(
        f"/cgi-bin/component/api_query_auth?component_access_token={quote(token)}",
        {"component_appid": configuration()["WECHAT_COMPONENT_APPID"], "authorization_code": code},
    )
    info = result.get("authorization_info")
    if not isinstance(info, dict) or not all(
        info.get(k)
        for k in ("authorizer_appid", "authorizer_access_token", "authorizer_refresh_token")
    ):
        raise UpstreamError("微信授权响应不完整")
    return info


def refresh_authorizer(token, appid, refresh_token):
    return post(
        f"/cgi-bin/component/api_authorizer_token?component_access_token={quote(token)}",
        {
            "component_appid": configuration()["WECHAT_COMPONENT_APPID"],
            "authorizer_appid": appid,
            "authorizer_refresh_token": refresh_token,
        },
    )


def authorizer_identity(token, appid):
    result = post(
        f"/cgi-bin/component/api_get_authorizer_info?access_token={quote(token, safe='')}",
        {"component_appid": configuration()["WECHAT_COMPONENT_APPID"], "authorizer_appid": appid},
    )
    info = result.get("authorizer_info", {})
    authorization = result.get("authorization_info", {})
    if (
        not isinstance(info, dict)
        or not isinstance(authorization, dict)
        or authorization.get("authorizer_appid") != appid
        or not isinstance(info.get("user_name"), str)
        or not 1 <= len(info["user_name"]) <= 100
    ):
        raise UpstreamError("公众号身份响应无效")
    return info["user_name"]


def send_customer_message(token, openid, text):
    return post(
        f"/cgi-bin/message/custom/send?access_token={quote(token)}",
        {"touser": openid, "msgtype": "text", "text": {"content": text}},
    )
