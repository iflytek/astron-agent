# Cryptographic mechanisms and deployment limits

This page describes the implementation and its configuration boundaries. It does
not establish the security of operator-supplied credentials, imported keys, or
external services.

## Built-in mechanisms

| Purpose | Implementation |
| --- | --- |
| Tenant API keys and secrets | `core/tenant/tools/generator/app.go` reads `crypto/rand.Reader`; keys use 16 random bytes and secrets use 24 random bytes. Random-source failure stops generation. |
| Persistent service tokens | `PersistentServiceToken` generates 48 random bytes with Java `SecureRandom`, stores them in a deployment-specific file, and compares tokens with `MessageDigest.isEqual`. Explicit operator-provided tokens require separate entropy assessment. |
| Invitation-link encryption | `AESUtil` uses AES-256-GCM, a 12-byte IV from `SecureRandom`, and a 128-bit tag. It accepts a 64-character hexadecimal key. Key ownership and rotation are separate from algorithm/key-length selection. |
| Model credential encryption | `RSAUtil` generates 2048-bit RSA key pairs through Java's cryptography provider. Its existing PKCS#1 v1.5 encryption format is retained for client compatibility; imported key files require operator review. The `ECB` component of Java's RSA transformation name does not describe an AES-ECB operation. |
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
