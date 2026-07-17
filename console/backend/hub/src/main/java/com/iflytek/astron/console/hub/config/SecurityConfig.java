package com.iflytek.astron.console.hub.config;

import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.hub.config.security.RestfulAccessDeniedHandler;
import com.iflytek.astron.console.hub.config.security.RestfulAuthenticationEntryPoint;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;


@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    private final JwtClaimsFilter jwtClaimsFilter;
    private final RestfulAuthenticationEntryPoint restfulAuthenticationEntryPoint;
    private final RestfulAccessDeniedHandler restfulAccessDeniedHandler;

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
