package com.iflytek.astron.console.commons.security;

import org.apache.commons.lang3.StringUtils;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Shared validation and header naming for trusted calls to the core workflow service. */
public final class WorkflowInternalApiKey {

    public static final String HEADER = "X-Workflow-Internal-Key";

    private static final String PLACEHOLDER = "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY";
    private static final int MIN_LENGTH = 32;

    private WorkflowInternalApiKey() {}

    /** Return a normalized credential or fail closed before issuing an internal request. */
    public static String requireConfigured(String configuredValue) {
        String apiKey = StringUtils.trimToEmpty(configuredValue);
        if (apiKey.length() < MIN_LENGTH
                || PLACEHOLDER.equals(apiKey)
                || apiKey.indexOf('\r') >= 0
                || apiKey.indexOf('\n') >= 0) {
            throw new IllegalStateException(
                    "WORKFLOW_INTERNAL_API_KEY must contain a non-default value of at least 32 characters");
        }
        return apiKey;
    }

    /** Match service credentials without accepting an absent or default deployment secret. */
    public static boolean matches(String configuredValue, String candidate) {
        try {
            String expected = requireConfigured(configuredValue);
            return candidate != null && MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8), candidate.getBytes(StandardCharsets.UTF_8));
        } catch (IllegalStateException exception) {
            return false;
        }
    }
}
