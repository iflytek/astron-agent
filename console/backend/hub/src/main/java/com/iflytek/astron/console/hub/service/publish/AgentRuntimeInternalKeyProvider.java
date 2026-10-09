package com.iflytek.astron.console.hub.service.publish;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Resolves the dedicated Agent Runtime management credential without logging it. */
@Component
public class AgentRuntimeInternalKeyProvider {

    public static final String HEADER = "X-Runtime-Internal-Key";

    private final String configuredKey;
    private final String keyFile;

    public AgentRuntimeInternalKeyProvider(
            @Value("${agent.runtime.internal-api-key:}") String configuredKey,
            @Value("${agent.runtime.internal-api-key-file:}") String keyFile) {
        this.configuredKey = configuredKey;
        this.keyFile = keyFile;
    }

    public String getRequired() {
        String key = StringUtils.trimToEmpty(configuredKey);
        if (StringUtils.isBlank(key) && StringUtils.isNotBlank(keyFile)) {
            key = readSecret(Path.of(keyFile));
        }
        if (key.length() < 32) {
            throw new IllegalStateException("Agent Runtime internal key is not configured");
        }
        return key;
    }

    public boolean matches(String supplied) {
        if (StringUtils.isBlank(supplied)) {
            return false;
        }
        try {
            return MessageDigest.isEqual(
                    getRequired().getBytes(StandardCharsets.UTF_8),
                    supplied.getBytes(StandardCharsets.UTF_8));
        } catch (IllegalStateException exception) {
            return false;
        }
    }

    private String readSecret(Path path) {
        try {
            if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || Files.size(path) > 4096) {
                return "";
            }
            return Files.readString(path, StandardCharsets.UTF_8).trim();
        } catch (IOException exception) {
            return "";
        }
    }
}
