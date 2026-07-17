package com.iflytek.astron.console.hub.service.gateway;

import com.iflytek.astron.console.hub.service.gateway.impl.GatewayAuthServiceImpl;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GatewayAuthServiceTest {

    private final TenantGatewayAuthClient tenantClient = mock(TenantGatewayAuthClient.class);
    private final GatewayAuthService service = new GatewayAuthServiceImpl(tenantClient);

    @Test
    void authenticateWorkflowReturnsAppIdWhenTenantAcceptsKeySecret() {
        when(tenantClient.verify("api-key", "api-secret")).thenReturn(Optional.of("app-123"));

        String appId = service.authenticateWorkflow("Bearer api-key:api-secret");

        assertEquals("app-123", appId);
        verify(tenantClient).verify("api-key", "api-secret");
    }

    @Test
    void authenticateWorkflowRejectsMissingAuthorization() {
        assertThrows(GatewayAuthException.class, () -> service.authenticateWorkflow(null));
    }

    @Test
    void authenticateWorkflowRejectsMalformedCredential() {
        assertThrows(GatewayAuthException.class, () -> service.authenticateWorkflow("Bearer api-key-only"));
    }

    @Test
    void authenticateWorkflowRejectsInvalidSecret() {
        when(tenantClient.verify("api-key", "bad-secret")).thenReturn(Optional.empty());

        assertThrows(GatewayAuthException.class, () -> service.authenticateWorkflow("Bearer api-key:bad-secret"));
    }
}
