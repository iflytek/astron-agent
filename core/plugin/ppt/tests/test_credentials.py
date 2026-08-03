import pytest

from zwppt_mcp.credentials import CredentialError, Credentials, load_credentials


class FailingRedis:
    def get(self, key: str) -> str:
        raise AssertionError(f"Redis should not be queried: {key}")


class StaticRedis:
    def __init__(self, value: str | None) -> None:
        self.value = value

    def get(self, key: str) -> str | None:
        assert key == "platform_account_text:iflytek_open_platform"
        return self.value


class RecordingRedisFactory:
    def __init__(self, value: str | None) -> None:
        self.value = value
        self.connection: dict[str, object] | None = None

    def __call__(self, **kwargs: object) -> StaticRedis:
        self.connection = kwargs
        return StaticRedis(self.value)


def test_explicit_environment_credentials_win_over_redis() -> None:
    credentials = load_credentials(
        {
            "AIPPT_APP_ID": "env-app",
            "AIPPT_API_SECRET": "env-secret",
        },
        redis_factory=lambda **_: FailingRedis(),
    )
    assert credentials == Credentials("env-app", "env-secret")


def test_platform_account_credentials_are_loaded_from_console_redis() -> None:
    factory = RecordingRedisFactory(
        '{"platformAppId":"managed-app","platformApiSecret":"managed-secret"}'
    )
    credentials = load_credentials(
        {
            "REDIS_ADDR": "cache.internal:6380",
            "REDIS_PASSWORD": "redis-pass",
            "REDIS_DATABASE_CONSOLE": "1",
        },
        redis_factory=factory,
    )
    assert credentials == Credentials("managed-app", "managed-secret")
    assert factory.connection == {
        "host": "cache.internal",
        "port": 6380,
        "password": "redis-pass",
        "db": 1,
        "decode_responses": True,
    }


def test_missing_credentials_raise_a_secret_safe_error() -> None:
    with pytest.raises(CredentialError, match="PPT credentials are not configured"):
        load_credentials({}, redis_factory=lambda **_: StaticRedis(None))


@pytest.mark.parametrize(
    ("environment", "redis_value"),
    [
        ({"REDIS_ADDR": "not-an-address"}, None),
        ({"REDIS_DATABASE_CONSOLE": "not-a-number"}, None),
        ({}, "not-json"),
        ({}, '{"platformAppId":"managed-app"}'),
    ],
)
def test_resolution_errors_do_not_disclose_credentials(
    environment: dict[str, str], redis_value: str | None
) -> None:
    secret = "must-not-appear"
    environment["AIPPT_API_SECRET"] = secret
    with pytest.raises(CredentialError) as error:
        load_credentials(environment, redis_factory=lambda **_: StaticRedis(redis_value))
    assert str(error.value) == "PPT credentials are not configured"
    assert secret not in str(error.value)
