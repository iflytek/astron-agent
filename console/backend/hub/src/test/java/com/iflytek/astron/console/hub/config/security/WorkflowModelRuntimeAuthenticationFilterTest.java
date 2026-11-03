package com.iflytek.astron.console.hub.config.security;

import com.iflytek.astron.console.commons.security.WorkflowInternalApiKey;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WorkflowModelRuntimeAuthenticationFilterTest {
    private static final String TOKEN = "0123456789abcdef0123456789abcdef";

    @AfterEach
    void cleanContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validInternalTokenAuthenticatesOnlyTheBrokerRole() throws Exception {
        AuthenticationEntryPoint entryPoint = mock(AuthenticationEntryPoint.class);
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(WorkflowInternalApiKey.HEADER, TOKEN);
        new WorkflowModelRuntimeAuthenticationFilter(TOKEN, entryPoint)
                .doFilter(request, new MockHttpServletResponse(), chain);
        verify(chain).doFilter(any(), any());
        verifyNoInteractions(entryPoint);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting(Object::toString)
                .containsExactly("ROLE_WORKFLOW_MODEL_RUNTIME_READER");
    }

    @Test
    void bearerTokensAndWrongInternalKeysCannotReachTheBroker() throws Exception {
        for (String candidate : new String[] {"", "wrong", "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY"}) {
            AuthenticationEntryPoint entryPoint = mock(AuthenticationEntryPoint.class);
            FilterChain chain = mock(FilterChain.class);
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", "Bearer user-token");
            request.addHeader(WorkflowInternalApiKey.HEADER, candidate);
            new WorkflowModelRuntimeAuthenticationFilter(TOKEN, entryPoint)
                    .doFilter(request, new MockHttpServletResponse(), chain);
            verify(entryPoint).commence(any(), any(), any());
            verifyNoInteractions(chain);
        }
    }
}
