package com.iflytek.astron.console.hub.config.security;

import com.iflytek.astron.console.commons.security.WorkflowInternalApiKey;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.filter.OncePerRequestFilter;

/** Restricts the model credential broker to the authenticated workflow service. */
public class WorkflowModelRuntimeAuthenticationFilter extends OncePerRequestFilter {
    public static final String READER_ROLE = "ROLE_WORKFLOW_MODEL_RUNTIME_READER";
    private final String configuredKey;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public WorkflowModelRuntimeAuthenticationFilter(String configuredKey,
            AuthenticationEntryPoint authenticationEntryPoint) {
        this.configuredKey = configuredKey;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (!WorkflowInternalApiKey.matches(configuredKey, request.getHeader(WorkflowInternalApiKey.HEADER))) {
            authenticationEntryPoint.commence(request, response,
                    new BadCredentialsException("Invalid workflow service credential"));
            return;
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "workflow-model-runtime-reader", null,
                List.of(new SimpleGrantedAuthority(READER_ROLE))));
        SecurityContextHolder.setContext(context);
        filterChain.doFilter(request, response);
    }
}
