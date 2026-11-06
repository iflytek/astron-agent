"""Console settings with automatic IP access and optional deployment overrides."""

import os
from pathlib import Path
from urllib.parse import quote

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def secret(name):
    value = os.environ.get(name, "")
    filename = os.environ.get(f"{name}_FILE")
    if filename:
        value = Path(filename).read_text()
        # Compose writes one final newline. Preserve all bytes of an imported
        # signing key, including intentional surrounding spaces from old envs.
        value = value.removesuffix("\n") if name == "CONSOLE_SECRET_KEY" else value.strip()
    return value


SECRET_KEY = secret("CONSOLE_SECRET_KEY")
if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("CONSOLE_SECRET_KEY must contain at least 50 characters")
DEBUG = False
# Unconfigured installs accept IP literals, validated by DeploymentMiddleware.
# A configured allowlist remains restrictive, including for IP addresses.
CONSOLE_AUTO_ALLOWED_HOSTS = not os.environ.get("CONSOLE_ALLOWED_HOSTS", "").strip()
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]", "console-hub"] + [
    host.strip() for host in os.environ.get("CONSOLE_ALLOWED_HOSTS", "").split(",") if host.strip()
]
if CONSOLE_AUTO_ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["*"]
ROOT_URLCONF = "astron_console.urls"
ASGI_APPLICATION = "astron_console.asgi.application"
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "astron_console.accounts",
    "astron_console.spaces",
    "astron_console.resources",
    "astron_console.knowledge",
    "astron_console.agents",
    "astron_console.workflows",
    "astron_console.publishing",
    "astron_console.channels",
]
MIDDLEWARE = [
    "astron_console.accounts.deployment.DeploymentMiddleware",
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
cookie_policy = os.environ.get("CONSOLE_COOKIE_SECURE", "").strip().lower() or "auto"
if cookie_policy not in {"auto", "true", "false"}:
    raise ImproperlyConfigured("CONSOLE_COOKIE_SECURE must be auto, true, or false")
CONSOLE_AUTO_COOKIE_SECURE = cookie_policy == "auto"
SESSION_COOKIE_SECURE = cookie_policy == "true"
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
CONSOLE_PUBLIC_ORIGIN = os.environ.get("CONSOLE_PUBLIC_ORIGIN", "").strip().rstrip("/")
CONSOLE_TRUSTED_PROXIES = os.environ.get("CONSOLE_TRUSTED_PROXIES", "").split(",")
# DeploymentMiddleware strips this header unless the immediate peer is trusted.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
WECHAT_COMPONENT_APPID = secret("WECHAT_COMPONENT_APPID")
WECHAT_COMPONENT_SECRET = secret("WECHAT_COMPONENT_SECRET")
WECHAT_TOKEN = secret("WECHAT_TOKEN")
WECHAT_ENCODING_AES_KEY = secret("WECHAT_ENCODING_AES_KEY")
WECHAT_REDIRECT_URL = secret("WECHAT_REDIRECT_URL")

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

# Resource services keep their established deployment variables and ownership data.
# Empty optional endpoints are reported by the operation that requires them.
KNOWLEDGE_URL = os.environ.get("KNOWLEDGE_URL") or "http://127.0.0.1:30007/knowledge"
SPARK_DB_URL = os.environ.get("SPARK_DB_URL") or "http://127.0.0.1:7990"
SPARK_DB_TYPE = os.environ.get("SPARK_DB_TYPE", "postgresql")
TENANT_ID = os.environ.get("TENANT_ID", "")
MAAS_APP_ID = os.environ.get("MAAS_APP_ID") or TENANT_ID
RESOURCE_APP_ID = MAAS_APP_ID
RESOURCE_ADMIN_UID = os.environ.get("ADMIN_UID", "9999")
RESOURCE_TOOL_URL = os.environ.get("TOOL_URL") or "http://127.0.0.1:18888"
RESOURCE_LOCAL_MODEL_URL = os.environ.get("LOCAL_MODEL_URL") or "http://127.0.0.1:33778"
RESOURCE_RPA_URL = os.environ.get("RPA_URL") or "https://newapi.iflyrpa.com"
RESOURCE_RPA_EXEC_URL = os.environ.get("TOOL_RPA_URL") or "http://127.0.0.1:17198"
RESOURCE_MCP_CATALOG_URL = os.environ.get("RESOURCE_MCP_CATALOG_URL", "")
RESOURCE_MCP_AUTH_URL = os.environ.get("RESOURCE_MCP_AUTH_URL", "")
RESOURCE_MCP_SHORT_URL = os.environ.get("RESOURCE_MCP_SHORT_URL", "")
RESOURCE_REDIS_URL = CACHES["default"]["LOCATION"]
WORKFLOW_INTERNAL_API_KEY = secret("WORKFLOW_INTERNAL_API_KEY")
SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN = secret("SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN")
SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN = secret("SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN")
OSS_ENDPOINT = os.environ.get("OSS_ENDPOINT", "")
OSS_REMOTE_ENDPOINT = os.environ.get("OSS_REMOTE_ENDPOINT") or OSS_ENDPOINT
OSS_ACCESS_KEY_ID = secret("OSS_ACCESS_KEY_ID")
OSS_ACCESS_KEY_SECRET = secret("OSS_ACCESS_KEY_SECRET")
OSS_BUCKET_CONSOLE = os.environ.get("OSS_BUCKET_CONSOLE", "console-oss")
OSS_PRESIGN_EXPIRY_SECONDS_CONSOLE = int(
    os.environ.get("OSS_PRESIGN_EXPIRY_SECONDS_CONSOLE", "600")
)
SKILL_SANDBOX_ARTIFACT_BUCKET = os.environ.get(
    "SKILL_SANDBOX_ARTIFACT_BUCKET", "workflow-artifacts"
)
SKILL_SANDBOX_ARTIFACT_MAX_ACTIVE_FILES_PER_WORKFLOW = int(
    os.environ.get("SKILL_SANDBOX_ARTIFACT_MAX_ACTIVE_FILES_PER_WORKFLOW", "1000")
)
SKILL_SANDBOX_ARTIFACT_DOWNLOAD_EXPIRY_SECONDS = int(
    os.environ.get("SKILL_SANDBOX_ARTIFACT_DOWNLOAD_EXPIRY_SECONDS", "300")
)
SKILL_SANDBOX_ARTIFACT_ALLOWED_EXTENSIONS = [
    item.strip().lower()
    for item in os.environ.get(
        "SKILL_SANDBOX_ARTIFACT_ALLOWED_EXTENSIONS",
        "txt,md,csv,json,pdf,png,jpg,jpeg,gif,webp,doc,docx,xls,xlsx,ppt,pptx,zip",
    ).split(",")
    if item.strip()
]


def byte_limit(name, default):
    value = os.environ.get(name, default).strip().upper()
    for suffix, multiplier in (("GB", 1024**3), ("MB", 1024**2), ("KB", 1024), ("B", 1)):
        if value.endswith(suffix):
            return int(value[: -len(suffix)]) * multiplier
    return int(value)


SKILL_SANDBOX_ARTIFACT_MAX_FILE_SIZE = byte_limit("SKILL_SANDBOX_ARTIFACT_MAX_FILE_SIZE", "20MB")
SKILL_SANDBOX_ARTIFACT_MAX_ACTIVE_TOTAL_SIZE_PER_WORKFLOW = byte_limit(
    "SKILL_SANDBOX_ARTIFACT_MAX_ACTIVE_TOTAL_SIZE_PER_WORKFLOW", "1GB"
)
# File bodies are streamed to temporary files by Django's official upload handlers.
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
CONSOLE_SPACE_LIMITS = {
    tier: {
        "space_count": int(os.environ.get(f"SPACE_LIMIT_{tier.upper()}_SPACE_COUNT", str(spaces))),
        "user_count": int(os.environ.get(f"SPACE_LIMIT_{tier.upper()}_USER_COUNT", str(users))),
    }
    for tier, spaces, users in (
        ("free", 1, 50),
        ("pro", 10, 100),
        ("team", 10000, 100),
        ("enterprise", 10000, 500),
    )
}

AGENT_URL = os.environ.get("AGENT_URL", "http://core-agent:17870")
AGENT_TIMEOUT_SECONDS = int(os.environ.get("AGENT_TIMEOUT_SECONDS", "600"))

WORKFLOW_URL = os.environ.get("WORKFLOW_URL") or "http://core-workflow:7880"
WORKFLOW_TIMEOUT_SECONDS = int(os.environ.get("WORKFLOW_TIMEOUT_SECONDS", "3600"))

TENANT_URL = os.environ.get("TENANT_URL", "http://core-tenant:5052")
TENANT_INTERNAL_API_KEY = secret("TENANT_INTERNAL_API_KEY") or secret("TENANT_SECRET")
