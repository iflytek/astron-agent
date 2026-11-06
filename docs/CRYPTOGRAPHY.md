# Cryptographic mechanisms and deployment limits

This page describes the implementation and its configuration boundaries. It does
not establish the security of operator-supplied credentials, imported keys, or
external services.

## Built-in mechanisms

| Purpose | Implementation |
| --- | --- |
| Tenant API keys and secrets | `core/tenant/tools/generator/app.go` reads `crypto/rand.Reader`; keys use 16 random bytes and secrets use 24 random bytes. Random-source failure stops generation. |
| Persistent service tokens | Deployment provisions persistent random tokens in existing secret files or environment variables. Python Console reads the same tokens and uses constant-time comparison on its internal resource endpoints; restarting Console does not rotate tokens. |
| Space invitations | Invitations are addressed to a UID and accepted by that authenticated user in a transaction. Console no longer uses encrypted invitation URLs. |
| Model and resource credentials | Python Console preserves the existing database credential values and exposes masked management responses. Provider SDK calls and authorized internal endpoints receive credentials server-side. Browser submissions use the same-origin HTTPS/session/CSRF boundary; the old model RSA transmission protocol is removed. Existing API-key columns and platform JSON remain in their original storage format. |
| Request signing | Python `hmac`/`hashlib` implement the standard HMAC-SHA-256 signing paths. |
| Console passwords and sessions | Python Console uses Django Argon2 password hashing and database-backed sessions. Compose generates the signing key once in `console_signing_secrets` and reuses it; replicas must share that persistent key. Password-reset tokens expire and become invalid after successful reset. |

For account setup and legacy identity preservation, see [Python Console](../console/backend/README.md).

## External compatibility paths

The Link plugin's MD5 authorization path is selected by an explicit OpenAPI
header default of `Authorization: MD5`; it is not the general request-signing
default. Other provider-specific request formats retain MD5/HMAC-SHA-1 components
for interoperability. Do not select these formats for new internal authentication
protocols. Use an authenticated HTTPS endpoint, protect the provider credential,
and prefer a stronger protocol when the provider supports one. Compatibility
with a provider does not by itself establish a security-standard exception.

The WeChat channel must use the platform signature and encrypted-message protocol through its supported SDK. Provider credentials remain server-side. Channel callbacks do not authenticate browser sessions or grant internal service access.

## Transport and forward secrecy

The Compose service network and example gateway routes use HTTP. Deploy public
endpoints behind a correctly configured TLS terminator, and keep internal service
networks private. Perfect forward secrecy depends on the actual TLS endpoint,
protocol and negotiated cipher suite; it is not enforced by the supplied HTTP
Compose configuration. HTTPS used to download project releases does not establish
forward secrecy for application traffic.

## References and tests

Run the Python Console Django tests and the Compose/Helm credential contract checks. Existing credential bytes, UID ownership, private artifact storage, and rejected invalid signatures remain migration invariants.
