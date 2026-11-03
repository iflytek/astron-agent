package com.iflytek.astron.console.commons.util;

import com.alibaba.fastjson2.JSON;

import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Removes model credentials and server-derived sandbox configuration from workflow JSON.
 */
public final class WorkflowProtocolSanitizer {

    private static final int MAX_EMBEDDED_JSON_DEPTH = 8;

    private static final Set<String> MODEL_NODE_TYPES = Set.of(
            "spark-llm", "agent", "decision-making", "extractor-parameter",
            "question-answer", "knowledge-base");

    private static final Set<String> SYSTEM_SANDBOX_FIELDS = Set.of(
            "enabled", "uid", "spaceid", "workflowid", "runid", "nodeid");

    private static final Set<String> LEGACY_SANDBOX_FIELDS = Set.of(
            "artifactuploadtoken",
            "artifactuploadurl",
            "runtimecredentialtoken",
            "runtimecredentialurl",
            "runtimeconfigtoken",
            "runtimeconfigurl",
            "sandboxapikey",
            "sandboxartifactuploadtoken",
            "sandboxartifactuploadurl",
            "sandboxruntimecredentialtoken",
            "sandboxruntimecredentialurl",
            "sandboxruntimeconfigtoken",
            "sandboxruntimeconfigurl",
            "skillsandboxartifactuploadtoken",
            "skillsandboxartifactuploadurl",
            "skillsandboxruntimecredentialtoken",
            "skillsandboxruntimecredentialurl",
            "skillsandboxruntimeconfigtoken",
            "skillsandboxruntimeconfigurl");

    private WorkflowProtocolSanitizer() {}

    /**
     * Sanitizes JSON for entity storage or outward responses. Invalid JSON fails closed to {@code
     * null}; callers that migrate historical data should use {@link #analyze(String)} and skip invalid
     * rows rather than overwriting them.
     */
    public static String sanitize(String protocolJson) {
        return analyze(protocolJson, SandboxPolicy.REMOVE).sanitizedJson();
    }

    /** Parses and sanitizes a protocol while reporting whether the source was valid JSON. */
    public static SanitizationResult analyze(String protocolJson) {
        return analyze(protocolJson, SandboxPolicy.REMOVE);
    }

    /**
     * Sanitizes a Core system protocol while retaining only the non-secret sandbox execution references
     * needed to run a published version.
     */
    public static String sanitizeSystemProtocol(String protocolJson) {
        return analyzeSystemProtocol(protocolJson).sanitizedJson();
    }

    /** Parses and sanitizes a Core system protocol for historical-data migration. */
    public static SanitizationResult analyzeSystemProtocol(String protocolJson) {
        return analyze(protocolJson, SandboxPolicy.ALLOW_EXECUTION_REFERENCES);
    }

    private static SanitizationResult analyze(String protocolJson, SandboxPolicy sandboxPolicy) {
        if (protocolJson == null) {
            return new SanitizationResult(true, false, null);
        }
        if (protocolJson.isBlank()) {
            return new SanitizationResult(false, false, null);
        }

        final Object root;
        try {
            root = JSON.parse(protocolJson);
        } catch (RuntimeException exception) {
            return new SanitizationResult(false, false, null);
        }
        // Workflow protocols are JSON objects. Reject otherwise-valid scalar and array JSON so a
        // double-encoded historical protocol cannot bypass recursive redaction and be returned
        // verbatim by an entity setter.
        if (!(root instanceof Map<?, ?>)) {
            return new SanitizationResult(false, false, null);
        }

        final boolean changed;
        try {
            changed = removeSensitiveFields(root, sandboxPolicy, 0);
        } catch (SanitizationLimitException exception) {
            return new SanitizationResult(false, false, null);
        }
        String sanitizedJson = changed ? JSON.toJSONString(root) : protocolJson;
        return new SanitizationResult(true, changed, sanitizedJson);
    }

    private static boolean removeSensitiveFields(
            Object root, SandboxPolicy sandboxPolicy, int embeddedJsonDepth) {
        boolean changed = false;
        ArrayDeque<Object> pending = new ArrayDeque<>();
        Set<Object> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        if (root != null) {
            pending.add(root);
        }

        while (!pending.isEmpty()) {
            Object value = pending.removeFirst();
            if (!visited.add(value)) {
                continue;
            }
            if (value instanceof Map<?, ?> map) {
                changed |= removeModelNodeCredentials(map);
                Iterator<? extends Map.Entry<?, ?>> fields = map.entrySet().iterator();
                while (fields.hasNext()) {
                    Map.Entry<?, ?> field = fields.next();
                    String normalizedName = normalizeFieldName(field.getKey());
                    if ("sandbox".equals(normalizedName)) {
                        if (sandboxPolicy == SandboxPolicy.ALLOW_EXECUTION_REFERENCES
                                && field.getValue() instanceof Map<?, ?> sandbox) {
                            changed |= sanitizeSystemSandbox(sandbox);
                        } else {
                            fields.remove();
                            changed = true;
                        }
                    } else if (LEGACY_SANDBOX_FIELDS.contains(normalizedName)) {
                        fields.remove();
                        changed = true;
                    } else {
                        EmbeddedValue embedded = sanitizeEmbeddedValue(
                                field.getValue(), sandboxPolicy, embeddedJsonDepth);
                        if (embedded.changed()) {
                            setMapValue(field, embedded.value());
                            changed = true;
                        }
                        addContainer(pending, embedded.value());
                    }
                }
            } else if (value instanceof List<?> list) {
                for (int index = 0; index < list.size(); index++) {
                    EmbeddedValue embedded = sanitizeEmbeddedValue(
                            list.get(index), sandboxPolicy, embeddedJsonDepth);
                    if (embedded.changed()) {
                        setListValue(list, index, embedded.value());
                        changed = true;
                    }
                    addContainer(pending, embedded.value());
                }
            } else if (value instanceof Collection<?> collection) {
                for (Object item : collection) {
                    // Parsed JSON arrays are Lists. Retain cycle-safe traversal for any other
                    // collection implementation without attempting unsupported in-place replacement.
                    addContainer(pending, item);
                }
            }
        }
        return changed;
    }

    private static EmbeddedValue sanitizeEmbeddedValue(
            Object value, SandboxPolicy sandboxPolicy, int embeddedJsonDepth) {
        if (!(value instanceof String text)) {
            return new EmbeddedValue(value, false);
        }

        final Object decoded;
        try {
            decoded = JSON.parse(text);
        } catch (RuntimeException exception) {
            return new EmbeddedValue(value, false);
        }
        // Only object/array strings are embedded protocol fragments. Scalars such as "true" are
        // ordinary business values and must remain byte-for-byte unchanged.
        if (!(decoded instanceof Map<?, ?>) && !(decoded instanceof Collection<?>)) {
            return new EmbeddedValue(value, false);
        }
        if (embeddedJsonDepth >= MAX_EMBEDDED_JSON_DEPTH) {
            throw new SanitizationLimitException();
        }

        boolean changed = removeSensitiveFields(decoded, sandboxPolicy, embeddedJsonDepth + 1);
        return changed
                ? new EmbeddedValue(JSON.toJSONString(decoded), true)
                : new EmbeddedValue(value, false);
    }

    private static boolean sanitizeSystemSandbox(Map<?, ?> sandbox) {
        boolean changed = false;
        Iterator<? extends Map.Entry<?, ?>> fields = sandbox.entrySet().iterator();
        while (fields.hasNext()) {
            Map.Entry<?, ?> field = fields.next();
            String normalizedName = normalizeFieldName(field.getKey());
            Object value = field.getValue();
            if (!SYSTEM_SANDBOX_FIELDS.contains(normalizedName) || !isScalar(value)) {
                fields.remove();
                changed = true;
            }
        }
        return changed;
    }

    /** Model credentials are runtime-only; other nodes may have unrelated platform credentials. */
    private static boolean removeModelNodeCredentials(Map<?, ?> node) {
        Object id = node.get("id");
        if (!(id instanceof String nodeId)
                || !MODEL_NODE_TYPES.contains(nodeId.split("::", 2)[0])
                || !(node.get("data") instanceof Map<?, ?> data)
                || !(data.get("nodeParam") instanceof Map<?, ?> params)) {
            return false;
        }
        return removeModelCredentials(params);
    }

    /** Shared with Console's protocol builder, so runtime secrets never enter a transport DSL. */
    public static boolean removeModelCredentials(Map<?, ?> params) {
        boolean changed = false;
        Iterator<? extends Map.Entry<?, ?>> fields = params.entrySet().iterator();
        while (fields.hasNext()) {
            Map.Entry<?, ?> field = fields.next();
            String name = normalizeFieldName(field.getKey());
            if ("apikey".equals(name) || "apisecret".equals(name)) {
                fields.remove();
                changed = true;
            } else if ("modelconfig".equals(name) && field.getValue() instanceof Map<?, ?> modelConfig) {
                changed |= removeModelCredentials(modelConfig);
            }
        }
        return changed;
    }

    private static boolean isScalar(Object value) {
        return value == null
                || value instanceof String
                || value instanceof Number
                || value instanceof Boolean;
    }

    private static void addContainer(ArrayDeque<Object> pending, Object value) {
        if (value instanceof Map<?, ?> || value instanceof Collection<?>) {
            pending.addLast(value);
        }
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static void setMapValue(Map.Entry<?, ?> entry, Object value) {
        ((Map.Entry) entry).setValue(value);
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static void setListValue(List<?> list, int index, Object value) {
        ((List) list).set(index, value);
    }

    private static String normalizeFieldName(Object fieldName) {
        if (!(fieldName instanceof String name)) {
            return "";
        }
        String lowerCaseName = name.toLowerCase(Locale.ROOT);
        StringBuilder normalized = new StringBuilder(lowerCaseName.length());
        for (int index = 0; index < lowerCaseName.length(); index++) {
            char character = lowerCaseName.charAt(index);
            if (Character.isLetterOrDigit(character)) {
                normalized.append(character);
            }
        }
        return normalized.toString();
    }

    /** Result used by migrations to distinguish invalid source data from valid sanitized JSON. */
    public record SanitizationResult(boolean validJson, boolean changed, String sanitizedJson) {}

    private record EmbeddedValue(Object value, boolean changed) {}

    private static final class SanitizationLimitException extends RuntimeException {
        private static final long serialVersionUID = 1L;
    }

    private enum SandboxPolicy {
        REMOVE,
        ALLOW_EXECUTION_REFERENCES
    }
}
