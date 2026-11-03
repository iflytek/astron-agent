import os

os.environ.setdefault("CONSOLE_SECRET_KEY", "test-only-key-" * 6)
os.environ["CONSOLE_DATABASE_ENGINE"] = "sqlite"
os.environ["CONSOLE_SQLITE_PATH"] = ":memory:"
os.environ["CONSOLE_COOKIE_SECURE"] = "false"

from .settings import *  # noqa: E402,F403

ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
