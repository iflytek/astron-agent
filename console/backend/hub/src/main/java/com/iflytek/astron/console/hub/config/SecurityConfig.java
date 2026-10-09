package com.iflytek.astron.console.hub.config;

import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.hub.config.security.AgentRuntimeAuthenticationFilter;
import com.iflytek.astron.console.hub.config.security.ArtifactUploadTokenAuthenticationFilter;
import com.iflytek.astron.console.hub.config.security.RestfulAccessDeniedHandler;
import com.iflytek.astron.console.hub.config.security.RestfulAuthenticationEntryPoint;
import com.iflytek.astron.console.hub.config.security.SandboxRuntimeCredentialAuthenticationFilter;
import com.iflytek.astron.console.hub.service.publish.AgentRuntimeInternalKeyProvider;
import com.iflytek.astron.console.toolkit.config.properties.SandboxRuntimeCredentialProperties;
import com.iflytek.astron.console.toolkit.config.properties.SkillSandboxArtifactProperties;
import com.iflytek.astron.console.toolkit.security.ArtifactUploadTokenProvider;
import com.iflytek.astron.console.toolkit.security.SandboxRuntimeCredentialTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;


@Configuration
@EnableWebSecurity
@EnableConfigurationProperties({
        SkillSandboxArtifactProperties.class,
        SandboxRuntimeCredentialProperties.class
})
@RequiredArgsConstructor
public class SecurityConfig {
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    private final JwtClaimsFilter jwtClaimsFilter;
    private final RestfulAuthenticationEntryPoint restfulAuthenticationEntryPoint;
    private final RestfulAccessDeniedHandler restfulAccessDeniedHandler;
    private final ArtifactUploadTokenProvider artifactUploadTokenProvider;
    private final SandboxRuntimeCredentialTokenProvider sandboxRuntimeCredentialTokenProvider;
    private final AgentRuntimeInternalKeyProvider agentRuntimeInternalKeyProvider;

    @Bean
    @Order(1)
    public SecurityFilterChain gatewayAuthFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/internal/gateway/auth/**")
                .authorizeHttpRequests(authorize -> authorize
                        .anyRequest()
                        .permitAll())
                .csrf(csrf -> csrf.ignoringRequestMatchers("/internal/gateway/auth/**"))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(formLogin -> formLogin.disable())
                .httpBasic(httpBasic -> httpBasic.disable());

        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain artifactUploadFilterChain(HttpSecurity http) throws Exception {
        ArtifactUploadTokenAuthenticationFilter tokenFilter =
                new ArtifactUploadTokenAuthenticationFilter(
                        artifactUploadTokenProvider, restfulAuthenticationEntryPoint);
        http
                .securityMatcher("/workflow/artifacts/internal-upload")
                .authorizeHttpRequests(authorize -> authorize
                        .anyRequest()
                        .hasRole("ARTIFACT_UPLOADER"))
                .csrf(csrf -> csrf.ignoringRequestMatchers(
                        "/workflow/artifacts/internal-upload"))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(restfulAuthenticationEntryPoint)
                        .accessDeniedHandler(restfulAccessDeniedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .addFilterBefore(tokenFilter, AnonymousAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    @Order(3)
    public SecurityFilterChain sandboxRuntimeCredentialFilterChain(HttpSecurity http)
            throws Exception {
        SandboxRuntimeCredentialAuthenticationFilter tokenFilter =
                new SandboxRuntimeCredentialAuthenticationFilter(
                        sandboxRuntimeCredentialTokenProvider,
                        restfulAuthenticationEntryPoint);
        http
                .securityMatcher("/skill-sandbox/internal-runtime-config")
                .authorizeHttpRequests(authorize -> authorize
                        .anyRequest()
                        .hasRole("SANDBOX_RUNTIME_CREDENTIAL_READER"))
                .csrf(csrf -> csrf.ignoringRequestMatchers(
                        "/skill-sandbox/internal-runtime-config"))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(restfulAuthenticationEntryPoint)
                        .accessDeniedHandler(restfulAccessDeniedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(
                        SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .addFilterBefore(tokenFilter, AnonymousAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    @Order(4)
    public SecurityFilterChain agentRuntimeCredentialFilterChain(HttpSecurity http)
            throws Exception {
        AgentRuntimeAuthenticationFilter tokenFilter =
                new AgentRuntimeAuthenticationFilter(
                        agentRuntimeInternalKeyProvider, restfulAuthenticationEntryPoint);
        http
                .securityMatcher("/internal/agent-runtime/**")
                .authorizeHttpRequests(authorize -> authorize
                        .anyRequest()
                        .hasRole("AGENT_RUNTIME_CREDENTIAL_READER"))
                .csrf(csrf -> csrf.ignoringRequestMatchers("/internal/agent-runtime/**"))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(restfulAuthenticationEntryPoint)
                        .accessDeniedHandler(restfulAccessDeniedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(
                        SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .addFilterBefore(tokenFilter, AnonymousAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    @Order(5)
    public SecurityFilterChain resourceServerFilterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                WebMvcConfig.NO_AUTH_REQUIRED_APIS)
                        .permitAll()
                        .anyRequest()
                        .authenticated() // Other interfaces require authentication
                )
                // Enable OAuth2 resource server support with JWT format tokens
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(Customizer.withDefaults()))
                .csrf(csrf -> csrf.ignoringRequestMatchers(this::shouldIgnoreCsrf))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(restfulAuthenticationEntryPoint)
                        .accessDeniedHandler(restfulAccessDeniedHandler))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Configure stateless session
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(formLogin -> formLogin.disable())
                .httpBasic(httpBasic -> httpBasic.disable())

        ;

        // Add custom Filter to put user uid into HttpServletRequest
        http.addFilterAfter(jwtClaimsFilter, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    // Configure CORS to allow your frontend application to access across domains
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Allow your frontend domain to access, e.g. "http://localhost:3000"
        // configuration.setAllowedOrigins(List.of("http://localhost:3000",
        // "https://your-frontend-domain.com"));
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        // Set to false for OAuth2 Bearer token authentication
        // Bearer tokens are sent via Authorization header, not cookies
        // allowCredentials is only needed for cookie-based authentication
        configuration.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private boolean shouldIgnoreCsrf(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (StringUtils.startsWithIgnoreCase(authorization, "Bearer ")) {
            return true;
        }
        String servletPath = request.getServletPath();
        for (String pathPattern : WebMvcConfig.NO_AUTH_REQUIRED_APIS) {
            if (PATH_MATCHER.match(pathPattern, servletPath)) {
                return true;
            }
        }
        return false;
    }
}
