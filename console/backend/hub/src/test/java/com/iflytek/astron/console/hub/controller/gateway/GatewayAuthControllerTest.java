package com.iflytek.astron.console.hub.controller.gateway;

import com.iflytek.astron.console.hub.service.gateway.GatewayAuthException;
import com.iflytek.astron.console.hub.service.gateway.GatewayAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GatewayAuthControllerTest {

    private final GatewayAuthService gatewayAuthService = mock(GatewayAuthService.class);
    private final GatewayAuthController controller = new GatewayAuthController(gatewayAuthService);

    @Test
    void authWorkflowReturnsNoContentAndTrustedConsumerHeader() {
        when(gatewayAuthService.authenticateWorkflow("Bearer key:secret")).thenReturn("app-123");

        ResponseEntity<Void> response = controller.authWorkflow("Bearer key:secret");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals("app-123", response.getHeaders().getFirst("X-Consumer-Username"));
        assertEquals("no-store", response.getHeaders().getCacheControl());
    }

    @Test
    void authWorkflowReturnsUnauthorizedWhenCredentialInvalid() {
        when(gatewayAuthService.authenticateWorkflow(null)).thenThrow(new GatewayAuthException("invalid credential"));

        ResponseEntity<Void> response = controller.authWorkflow(null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNull(response.getHeaders().getFirst("X-Consumer-Username"));
        assertEquals("no-store", response.getHeaders().getCacheControl());
    }
}
