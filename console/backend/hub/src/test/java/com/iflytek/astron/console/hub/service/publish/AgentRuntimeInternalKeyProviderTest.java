package com.iflytek.astron.console.hub.service.publish;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class AgentRuntimeInternalKeyProviderTest {

    private static final String KEY = "0123456789abcdef0123456789abcdef";

    @TempDir
    Path tempDir;

    @Test
    void resolvesConfiguredKeyAndUsesConstantTimeComparison() {
        AgentRuntimeInternalKeyProvider provider =
                new AgentRuntimeInternalKeyProvider(KEY, "");

        assertTrue(provider.matches(KEY));
        assertFalse(provider.matches(KEY + "x"));
        assertFalse(provider.matches(""));
    }

    @Test
    void resolvesKeyFromRegularFile() throws Exception {
        Path keyFile = tempDir.resolve("runtime-key");
        Files.writeString(keyFile, KEY + "\n");
        AgentRuntimeInternalKeyProvider provider =
                new AgentRuntimeInternalKeyProvider("", keyFile.toString());

        assertTrue(provider.matches(KEY));
    }

    @Test
    void failsClosedForMissingOrShortKey() {
        AgentRuntimeInternalKeyProvider provider =
                new AgentRuntimeInternalKeyProvider("too-short", "");

        assertThrows(IllegalStateException.class, provider::getRequired);
        assertFalse(provider.matches("too-short"));
    }
}
