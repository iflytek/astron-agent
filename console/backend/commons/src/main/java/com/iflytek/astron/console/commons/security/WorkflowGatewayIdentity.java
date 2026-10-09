package com.iflytek.astron.console.commons.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.Set;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.lang3.StringUtils;

/** Creates short-lived signed workflow identities without disclosing the shared internal key. */
public final class WorkflowGatewayIdentity {

    public static final String TIMESTAMP_HEADER = "X-Workflow-Gateway-Timestamp";
    public static final String SIGNATURE_HEADER = "X-Workflow-Gateway-Signature";

    private static final String POST = "POST";
    private static final String GET = "GET";
    private static final String HMAC_SHA_256 = "HmacSHA256";
    private static final Set<String> PUBLIC_WORKFLOW_PATHS = Set.of(
            "/workflow/v1/chat/completions", "/workflow/v1/resume");
    private static final Pattern PUBLIC_RUNTIME_PATHS = Pattern.compile(
            "^/openapi/v1/(?:agents/[A-Za-z0-9._~-]+/runs"
                    + "|runs/[A-Za-z0-9._~-]+(?:/events|/resume|/cancel)?"
                    + "|approvals/[A-Za-z0-9._~-]+/decision)$");

    private WorkflowGatewayIdentity() {}

    /**
     * Validate the original public request metadata and return the exact path bound into the signature.
     * Query parameters are deliberately excluded; no decoding or path normalization is performed, so
     * encoded or alternate paths fail closed.
     */
    public static String requireAuthorizedPath(String originalMethod, String originalUri) {
        if ((!POST.equals(originalMethod) && !GET.equals(originalMethod))
                || StringUtils.isEmpty(originalUri)) {
            throw new IllegalArgumentException("unsupported workflow gateway request");
        }
        int queryStart = originalUri.indexOf('?');
        String path = queryStart < 0 ? originalUri : originalUri.substring(0, queryStart);
        if (!isAuthorizedPath(originalMethod, path) || originalUri.indexOf('#') >= 0) {
            throw new IllegalArgumentException("unsupported workflow gateway request");
        }
        return path;
    }

    private static boolean isAuthorizedPath(String method, String path) {
        if (POST.equals(method) && PUBLIC_WORKFLOW_PATHS.contains(path)) {
            return true;
        }
        if (!PUBLIC_RUNTIME_PATHS.matcher(path).matches()) {
            return false;
        }
        if (path.endsWith("/events") || path.matches("^/openapi/v1/runs/[A-Za-z0-9._~-]+$")) {
            return GET.equals(method);
        }
        return POST.equals(method);
    }

    /** Sign {@code method + newline + path + newline + appId + newline + epochSeconds}. */
    public static String sign(
            String configuredKey,
            String method,
            String path,
            String appId,
            long epochSeconds) {
        String internalKey = WorkflowInternalApiKey.requireConfigured(configuredKey);
        if (!isAuthorizedPath(method, path)
                || StringUtils.isBlank(appId)
                || appId.indexOf('\r') >= 0
                || appId.indexOf('\n') >= 0
                || epochSeconds < 0) {
            throw new IllegalArgumentException("invalid workflow gateway identity");
        }
        String payload = method + '\n' + path + '\n' + appId + '\n' + epochSeconds;
        try {
            Mac mac = Mac.getInstance(HMAC_SHA_256);
            mac.init(new SecretKeySpec(
                    internalKey.getBytes(StandardCharsets.UTF_8), HMAC_SHA_256));
            return HexFormat.of()
                    .formatHex(
                            mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException(
                    "Unable to sign workflow gateway identity", exception);
        }
    }
}
