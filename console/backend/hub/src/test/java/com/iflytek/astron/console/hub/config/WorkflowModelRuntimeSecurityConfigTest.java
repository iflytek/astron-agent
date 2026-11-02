package com.iflytek.astron.console.hub.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.data.UserInfoDataService;
import com.iflytek.astron.console.commons.entity.user.UserInfo;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.hub.config.security.RestfulAccessDeniedHandler;
import com.iflytek.astron.console.hub.config.security.RestfulAuthenticationEntryPoint;
import com.iflytek.astron.console.toolkit.controller.model.WorkflowModelRuntimeController;
import com.iflytek.astron.console.toolkit.service.model.WorkflowModelRuntimeService.RuntimeModelConfig;
import com.iflytek.astron.console.commons.security.WorkflowInternalApiKey;
import com.iflytek.astron.console.toolkit.security.ArtifactUploadTokenProvider;
import com.iflytek.astron.console.toolkit.security.SandboxRuntimeCredentialTokenProvider;
import com.iflytek.astron.console.toolkit.service.model.WorkflowModelRuntimeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(
        controllers = WorkflowModelRuntimeController.class,
        properties = {
                "skill.sandbox.artifact-upload-token=0123456789abcdef0123456789abcdef",
                "skill.sandbox.runtime-credential.token=abcdef0123456789abcdef0123456789",
                "workflow.internal-api-key=abcdef0123456789abcdef0123456789"
        })
@Import({
        SecurityConfig.class,
        JwtClaimsFilter.class,
        RestfulAuthenticationEntryPoint.class,
        RestfulAccessDeniedHandler.class
})
class WorkflowModelRuntimeSecurityConfigTest {

    private static final String VALID_TOKEN = "abcdef0123456789abcdef0123456789";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkflowModelRuntimeService runtimeService;

    @MockBean
    private UserInfoDataService userInfoDataService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @MockBean
    private ArtifactUploadTokenProvider artifactUploadTokenProvider;

    @MockBean
    private SandboxRuntimeCredentialTokenProvider sandboxRuntimeCredentialTokenProvider;

    @Test
    void rejectsCredentialRequestWithoutServiceToken() throws Exception {
        mockMvc.perform(get("/model/internal-runtime-config")
                .param("flowId", "flow-1")
                .param("modelId", "42"))
                .andExpect(status().isUnauthorized());

        verify(runtimeService, never())
                .resolve(any(), eq("flow-1"), eq(42L));
    }

    @Test
    void rejectsCredentialRequestWithWrongServiceToken() throws Exception {
        mockMvc.perform(get("/model/internal-runtime-config")
                .header(
                        WorkflowInternalApiKey.HEADER,
                        "wrong-token")
                .param("flowId", "flow-1")
                .param("modelId", "42"))
                .andExpect(status().isUnauthorized());

        verify(runtimeService, never())
                .resolve(any(), eq("flow-1"), eq(42L));
    }

    @Test
    void returnsOnlyCredentialForValidServiceToken() throws Exception {
        when(runtimeService.resolve(
                        VALID_TOKEN, "flow-1", 42L))
                .thenReturn(new RuntimeModelConfig(42L, "openai", "https://model.example/v1", "model", "model-secret"));

        mockMvc.perform(get("/model/internal-runtime-config")
                        .header(
                                WorkflowInternalApiKey.HEADER,
                                VALID_TOKEN)
                        .param("flowId", "flow-1")
                        .param("modelId", "42"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.data.apiKey").value("model-secret"))
                .andExpect(jsonPath("$.data.provider").value("openai"))
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.modelId").value(42));

        verify(runtimeService)
                .resolve(VALID_TOKEN, "flow-1", 42L);
    }

    @Test
    void jwtOnlyTrailingSlashVariantNeverReturnsRuntimeCredential() throws Exception {
        Instant now = Instant.now();
        Jwt jwt = Jwt.withTokenValue("jwt-only")
                .header("alg", "none")
                .subject("jwt-user")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300))
                .build();
        when(jwtDecoder.decode("jwt-only")).thenReturn(jwt);
        when(userInfoDataService.createOrGetUser(any(UserInfo.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(runtimeService.resolve(
                isNull(), eq("flow-1"), eq(42L)))
                .thenThrow(new BusinessException(ResponseEnum.UNAUTHORIZED));

        MvcResult result = mockMvc.perform(get("/model/internal-runtime-config/")
                .header("Authorization", "Bearer jwt-only")
                .param("flowId", "flow-1")
                .param("modelId", "42"))
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .doesNotContain("model-secret", "\"apiKey\":\"");
    }
}
