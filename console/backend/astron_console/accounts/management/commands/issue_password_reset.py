from urllib.parse import urlencode, urlsplit

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.management.base import BaseCommand, CommandError
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from astron_console.accounts.models import User, UserProfile, normalize_username


class Command(BaseCommand):
    help = "Issue a one-hour reset link after verifying the account owner's identity."

    def add_arguments(self, parser):
        identity = parser.add_mutually_exclusive_group(required=True)
        identity.add_argument("--uid")
        identity.add_argument("--username", help="Original or current login username")
        parser.add_argument("--origin", help="Optional public HTTP(S) origin for a complete link")

    def handle(self, *args, **options):
        uid = options.get("uid")
        if options.get("username"):
            username = options["username"].strip()
            candidates = set(
                UserProfile.objects.filter(username__iexact=username).values_list("uid", flat=True)
            )
            candidates.update(
                User.objects.filter(username=normalize_username(username)).values_list(
                    "id", flat=True
                )
            )
            if len(candidates) > 1:
                raise CommandError("用户名对应多个旧账号，请使用 --uid 明确选择账号")
            uid = next(iter(candidates), None)
        user = User.objects.filter(pk=uid).first()
        if not user or not user.account_enabled:
            raise CommandError("Account does not exist or is disabled")
        public_origin = (options.get("origin") or settings.CONSOLE_PUBLIC_ORIGIN).rstrip("/")
        origin = urlsplit(public_origin)
        if public_origin and (
            origin.scheme not in {"http", "https"}
            or not origin.netloc
            or origin.username
            or origin.password
            or origin.path
            or origin.query
            or origin.fragment
        ):
            raise CommandError("--origin / CONSOLE_PUBLIC_ORIGIN must be an HTTP(S) origin")
        query = urlencode(
            {
                "uid": urlsafe_base64_encode(force_bytes(user.pk)),
                "token": default_token_generator.make_token(user),
            }
        )
        self.stdout.write(f"登录用户名：{user.username}")
        if public_origin:
            self.stdout.write(
                "打开以下链接设置新密码，然后使用上面的用户名登录（链接一小时内有效）："
            )
        else:
            self.stdout.write("在控制台访问地址后追加以下路径设置密码（链接一小时内有效）：")
        # Fragment avoids including the bearer reset credential in HTTP access logs.
        self.stdout.write(f"{public_origin}/reset-password#{query}")
