package com.iflytek.astron.console.hub.config.security;

import com.iflytek.astron.console.hub.service.publish.AgentRuntimeInternalKeyProvider;
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

/** Authenticates Agent Runtime before returning a transient model credential. */
public class AgentRuntimeAuthenticationFilter extends OncePerRequestFilter {

    public static final String READER_ROLE = "ROLE_AGENT_RUNTIME_CREDENTIAL_READER";

    private final AgentRuntimeInternalKeyProvider keyProvider;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public AgentRuntimeAuthenticationFilter(
            AgentRuntimeInternalKeyProvider keyProvider,
            AuthenticationEntryPoint authenticationEntryPoint) {
        this.keyProvider = keyProvider;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {
        if (!keyProvider.matches(request.getHeader(AgentRuntimeInternalKeyProvider.HEADER))) {
            authenticationEntryPoint.commence(
                    request,
                    response,
                    new BadCredentialsException("Invalid Agent Runtime credential"));
            return;
        }
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        "agent-runtime-credential-reader",
                        null,
                        List.of(new SimpleGrantedAuthority(READER_ROLE)));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        filterChain.doFilter(request, response);
    }
}
