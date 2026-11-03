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
| Request signing | Python `hmac`/`hashlib` and Java's cryptography APIs implement the standard HMAC-SHA-256 signing paths. |
| Console passwords and sessions | Python Console uses Django Argon2 password hashing and database-backed sessions. Persistent `CONSOLE_SECRET_KEY` must be shared by replicas. Password-reset tokens expire and become invalid after successful reset. |

For account setup and legacy identity preservation, see [Python Console](../console/backend/README.md). Java business mechanisms below remain pending their corresponding migration stages; they are not part of the new login path.

## External compatibility paths

The Link plugin's MD5 authorization path is selected by an explicit OpenAPI
header default of `Authorization: MD5`; it is not the general request-signing
default. Other provider-specific request formats retain MD5/HMAC-SHA-1 components
for interoperability. Do not select these formats for new internal authentication
protocols. Use an authenticated HTTPS endpoint, protect the provider credential,
and prefer a stronger protocol when the provider supports one. Compatibility
with a provider does not by itself establish a security-standard exception.

The WeChat adapter retains the platform's SHA-1 signature and AES-CBC message
format. Its active callback path verifies and decrypts inbound messages using
the request's timestamp and nonce. The outbound helper now uses `SecureRandom`
for its 16-character random plaintext prefix; the current callback does not call
that outbound helper. The prefix is distinct from the caller-supplied protocol
nonce. Changing the randomness source preserves the wire format; changing the
signature or cipher requires a compatible platform protocol change.

## Transport and forward secrecy

The Compose service network and example gateway routes use HTTP. Deploy public
endpoints behind a correctly configured TLS terminator, and keep internal service
networks private. Perfect forward secrecy depends on the actual TLS endpoint,
protocol and negotiated cipher suite; it is not enforced by the supplied HTTP
Compose configuration. HTTPS used to download project releases does not establish
forward secrecy for application traffic.

## References and tests

- `WXBizMsgCryptTest` checks reply framing, encryption/decryption compatibility,
  and rejection of a mismatched nonce signature. This is retained Java channel code, pending the publishing migration. Its historical focused command was:

  ```bash
  mvn -pl hub -am -Dtest=WXBizMsgCryptTest -Dsurefire.failIfNoSpecifiedTests=false test
  ```
