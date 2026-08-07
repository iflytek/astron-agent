package com.iflytek.astron.console.hub.service.gateway.impl;

import com.iflytek.astron.console.hub.service.gateway.GatewayAuthException;
import com.iflytek.astron.console.hub.service.gateway.GatewayAuthService;
import com.iflytek.astron.console.hub.service.gateway.TenantGatewayAuthClient;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class GatewayAuthServiceImpl implements GatewayAuthService {

    private static final String BEARER_PREFIX = "Bearer ";

    private final TenantGatewayAuthClient tenantClient;

    public GatewayAuthServiceImpl(TenantGatewayAuthClient tenantClient) {
        this.tenantClient = tenantClient;
    }

    @Override
    public String authenticateWorkflow(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            throw new GatewayAuthException("missing bearer credential");
        }

        String credential = authorizationHeader.substring(BEARER_PREFIX.length()).trim();
        String[] parts = credential.split(":", -1);
        if (parts.length != 2 || !StringUtils.hasText(parts[0]) || !StringUtils.hasText(parts[1])) {
            throw new GatewayAuthException("malformed bearer credential");
        }

        return tenantClient.verify(parts[0], parts[1])
                .filter(StringUtils::hasText)
                .orElseThrow(() -> new GatewayAuthException("invalid app credential"));
    }
}
