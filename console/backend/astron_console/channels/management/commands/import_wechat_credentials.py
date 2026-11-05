"""Import a deliberately decoded legacy credential without loading Java objects."""

import json
import sys

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from astron_console.channels.models import WechatCredential
from astron_console.channels.wechat import save_credentials


class Command(BaseCommand):
    help = "Read trusted JSON from stdin: appid plus refreshToken, or empty appid plus ticket."

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace", action="store_true", help="Replace an existing encrypted row."
        )

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            value = json.loads(sys.stdin.read(8193))
        except (ValueError, UnicodeError):
            raise CommandError("凭据输入必须是受信JSON，不支持Java序列化数据") from None
        if not isinstance(value, dict) or set(value) - {"appid", "ticket", "refreshToken"}:
            raise CommandError("凭据字段无效")
        appid = value.get("appid")
        if not isinstance(appid, str) or len(appid) > 100:
            raise CommandError("appid无效")
        field = "refreshToken" if appid else "ticket"
        secret = value.get(field)
        if not isinstance(secret, str) or not 1 <= len(secret) <= 4096 or not secret.isprintable():
            raise CommandError("凭据字段无效")
        if (
            WechatCredential.objects.select_for_update().filter(pk=appid).exists()
            and not options["replace"]
        ):
            raise CommandError("已有加密凭据；如确需替换请显式指定 --replace")
        save_credentials(appid, {field: secret})
        self.stdout.write(self.style.SUCCESS("凭据已加密导入；原Redis值未修改"))
