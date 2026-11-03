"""Console settings. Production secrets and infrastructure are explicit."""

import os
from pathlib import Path
from urllib.parse import quote

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def secret(name):
    value = os.environ.get(name, "")
    filename = os.environ.get(f"{name}_FILE")
    if filename:
        value = Path(filename).read_text().strip()
    return value


SECRET_KEY = secret("CONSOLE_SECRET_KEY")
if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("CONSOLE_SECRET_KEY must contain at least 50 characters")
DEBUG = False
# Container probes use loopback even when only the public hostname is configured.
ALLOWED_HOSTS = ["localhost", "127.0.0.1"] + [
    host.strip() for host in os.environ.get("CONSOLE_ALLOWED_HOSTS", "").split(",") if host.strip()
]
ROOT_URLCONF = "astron_console.urls"
ASGI_APPLICATION = "astron_console.asgi.application"
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "astron_console.accounts",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "astron_console.accounts.middleware.AccountStatusMiddleware",
]
AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["astron_console.accounts.backends.AccountBackend"]
PASSWORD_HASHERS = ["django.contrib.auth.hashers.Argon2PasswordHasher"]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
PASSWORD_RESET_TIMEOUT = 3600
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_NAME = "astron_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 86400
SESSION_COOKIE_SECURE = os.environ.get("CONSOLE_COOKIE_SECURE", "true").lower() == "true"
CSRF_COOKIE_NAME = "astron_csrf"
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_TRUSTED_ORIGINS = [
    value for value in os.environ.get("CONSOLE_CSRF_TRUSTED_ORIGINS", "").split(",") if value
]
CSRF_FAILURE_VIEW = "astron_console.accounts.views.csrf_failure"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "no-referrer"
DATA_UPLOAD_MAX_MEMORY_SIZE = 64 * 1024
CONSOLE_PUBLIC_ORIGIN = os.environ.get("CONSOLE_PUBLIC_ORIGIN", "http://localhost:3000").rstrip("/")
CONSOLE_TRUSTED_PROXIES = os.environ.get("CONSOLE_TRUSTED_PROXIES", "").split(",")

if os.environ.get("CONSOLE_DATABASE_ENGINE") == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.environ.get("CONSOLE_SQLITE_PATH", str(BASE_DIR / "console.sqlite3")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "HOST": os.environ.get("MYSQL_HOST", "mysql"),
            "PORT": os.environ.get("MYSQL_PORT", "3306"),
            "NAME": os.environ.get("CONSOLE_MYSQL_DB", "astron_console"),
            "USER": os.environ.get("MYSQL_USER", "root"),
            "PASSWORD": secret("MYSQL_PASSWORD"),
            "OPTIONS": {"charset": "utf8mb4", "init_command": "SET sql_mode='STRICT_TRANS_TABLES'"},
        }
    }
redis_password = quote(secret("REDIS_PASSWORD"), safe="")
redis_auth = f":{redis_password}@" if redis_password else ""
redis_host = os.environ.get("REDIS_HOST", "redis")
redis_port = os.environ.get("REDIS_PORT", "6379")
redis_db = os.environ.get("REDIS_DATABASE_CONSOLE", "0")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": secret("CONSOLE_REDIS_URL")
        or f"redis://{redis_auth}{redis_host}:{redis_port}/{redis_db}",
        "KEY_PREFIX": "astron-console-python",
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
# Existing Console MySQL timestamps are local, timezone-naive values.
USE_TZ = False
APPEND_SLASH = False
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"astron_console": {"handlers": ["console"], "level": "INFO"}},
}
