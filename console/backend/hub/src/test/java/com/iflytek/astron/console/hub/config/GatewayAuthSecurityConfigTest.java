package com.iflytek.astron.console.hub.config;

import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.data.UserInfoDataService;
import com.iflytek.astron.console.hub.config.security.RestfulAccessDeniedHandler;
import com.iflytek.astron.console.hub.config.security.RestfulAuthenticationEntryPoint;
import com.iflytek.astron.console.hub.controller.gateway.GatewayAuthController;
import com.iflytek.astron.console.hub.service.gateway.GatewayAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GatewayAuthController.class)
@Import({
        SecurityConfig.class,
        JwtClaimsFilter.class,
        RestfulAuthenticationEntryPoint.class,
        RestfulAccessDeniedHandler.class
})
class GatewayAuthSecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GatewayAuthService gatewayAuthService;

    @MockBean
    private UserInfoDataService userInfoDataService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    void gatewayAuthEndpointAllowsAppCredentialBearerHeaderToReachController() throws Exception {
        when(jwtDecoder.decode(anyString())).thenThrow(new JwtException("app credential is not a jwt"));
        when(gatewayAuthService.authenticateWorkflow("Bearer key:secret")).thenReturn("app-123");

        mockMvc.perform(get("/internal/gateway/auth/workflow")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer key:secret"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("X-Consumer-Username", "app-123"));

        verify(gatewayAuthService).authenticateWorkflow("Bearer key:secret");
        verify(jwtDecoder, never()).decode(anyString());
    }
}
