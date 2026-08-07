package com.iflytek.astron.console.hub.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class WebMvcConfigTest {

    @Test
    void noAuthApisIncludeSkillSandboxArtifactInternalUpload() {
        assertThat(WebMvcConfig.NO_AUTH_REQUIRED_APIS)
                .contains("/workflow/artifacts/internal-upload");
    }
}
