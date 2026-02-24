## Summary

- Added generic OAuth2 outbound authentication support in `link` with backward compatibility preserved.
- Introduced JWT validation utilities and optional inbound JWT middleware behind feature flags.
- Hardened auth schema parsing/validation and standardized error mapping for malformed/unsupported auth configs.
- Added focused unit tests and implementation documentation for OAuth2/JWT integration and contribution compliance.

## What Changed

### Core auth capabilities

- Added OAuth2 token client with:
  - async token retrieval
  - in-memory token cache with expiration guard
  - per-key lock to deduplicate concurrent refresh
  - lazy cleanup of expired cache entries on access
  - stale lock cleanup for expired/unused cache keys
  - support for token endpoint auth methods: `client_secret_post`, `client_secret_basic`, `none`
  - support for configurable `grant_type` and audience/scope
- Added JWT validator module with:
  - shared-secret (`HS*`) and JWKS (`RS*/ES*`) validation
  - JWKS fetch cache and key selection by `kid`
  - issuer/audience/exp/nbf/iat claim checks
- Added optional FastAPI JWT middleware:
  - gated by `JWT_AUTH_ENABLE`
  - supports excluded paths and configurable auth header
  - returns standardized 401 payload on validation failure

### Integration changes

- Updated HTTP execution auth flow:
  - preserved existing `apiKey` behavior
  - added OAuth2 flow support from OpenAPI extensions and env indirection
  - supports direct token injection (`x-access-token`/`x-access-token-env`)
  - supports token type override (`x-token-type`)
  - falls back to operation-level security scopes when `x-scope` is absent
  - improved malformed/unsupported auth error mapping to OpenAPI auth error code
- Updated OpenAPI parser to preserve operation-level `security` scopes for downstream auth processing.

### Configuration and constants

- Added OAuth2/JWT related env keys and exported constants.
- Updated runtime config template and dependency configuration (`PyJWT[crypto]`).

## Files

### Modified tracked files

- `core/plugin/link/app/start_server.py`
- `core/plugin/link/config.env`
- `core/plugin/link/consts/const.py`
- `core/plugin/link/consts/keys/common_keys.py`
- `core/plugin/link/pyproject.toml`
- `core/plugin/link/service/community/tools/http/execution_server.py`
- `core/plugin/link/utils/errors/code.py`
- `core/plugin/link/utils/open_api_schema/schema_parser.py`

### Added new files

- `core/plugin/link/utils/auth/__init__.py`
- `core/plugin/link/utils/auth/oauth2_client.py`
- `core/plugin/link/utils/auth/jwt_validator.py`
- `core/plugin/link/utils/security/jwt_auth_middleware.py`
- `core/plugin/link/tests/unit/test_auth_oauth2_client.py`
- `core/plugin/link/tests/unit/test_auth_jwt_validator.py`
- `core/plugin/link/tests/unit/test_security_jwt_middleware.py`
- `core/plugin/link/tests/unit/test_execution_server_oauth2_auth.py`

## Compatibility Impact

- Existing `apiKey` auth path remains unchanged.
- New OAuth2 logic applies only when operation security is declared as OAuth2.
- Inbound JWT enforcement remains disabled by default (`JWT_AUTH_ENABLE=0`).

## Security Considerations

- Secrets are resolved via env/env-indirection; avoid embedding plaintext secrets in OpenAPI and commits.
- Middleware sanitizes auth validation response details.
- Added explicit validation for unsupported auth schema/auth methods.

## Testing

Executed locally:

- `pytest -q core/plugin/link/tests/unit/test_auth_oauth2_client.py core/plugin/link/tests/unit/test_auth_jwt_validator.py core/plugin/link/tests/unit/test_security_jwt_middleware.py core/plugin/link/tests/unit/test_execution_server_oauth2_auth.py`
- Result: `18 passed, 1 skipped` (execution_server OAuth2 auth tests skipped in current env due OTLP runtime dependency)
- `pytest -q core/plugin/link/tests/unit/test_execution_server_oauth2_auth.py -rs`
- Result: `1 skipped` (`execution_server imports OTLP runtime dependencies`)

## Rollback Plan

- Revert this PR commit set.
- Keep/restore `JWT_AUTH_ENABLE=0`.
- Remove OAuth2-specific OpenAPI extension fields for affected tools.

## Risk / Follow-up

- Built-in token acquisition currently supports `client_credentials`; other grant types should use pre-issued token injection.
- In-memory cache growth risk is mitigated by lazy eviction of expired token entries and associated stale locks during access.
- Future enhancement: retry/backoff and circuit breaker for token/JWKS network failures.
