package com.iflytek.astron.console.hub.controller.gateway;

import com.iflytek.astron.console.commons.security.WorkflowGatewayIdentity;
import com.iflytek.astron.console.commons.security.WorkflowInternalApiKey;
import com.iflytek.astron.console.hub.service.gateway.GatewayAuthException;
import com.iflytek.astron.console.hub.service.gateway.GatewayAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class GatewayAuthControllerTest {

    private static final String INTERNAL_KEY = "0123456789abcdef0123456789abcdef";

    private final GatewayAuthService gatewayAuthService = mock(GatewayAuthService.class);
    private final GatewayAuthController controller =
            new GatewayAuthController(gatewayAuthService, INTERNAL_KEY);

    @Test
    void authWorkflowReturnsNoContentAndTrustedConsumerHeader() {
        when(gatewayAuthService.authenticateWorkflow("Bearer key:secret")).thenReturn("app-123");

        ResponseEntity<Void> response = controller.authWorkflow(
                "Bearer key:secret",
                "/workflow/v1/chat/completions?trace_id=123",
                "POST");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        assertEquals("app-123", response.getHeaders().getFirst("X-Consumer-Username"));
        String timestamp = response.getHeaders().getFirst(
                WorkflowGatewayIdentity.TIMESTAMP_HEADER);
        assertEquals(
                WorkflowGatewayIdentity.sign(
                        INTERNAL_KEY,
                        "POST",
                        "/workflow/v1/chat/completions",
                        "app-123",
                        Long.parseLong(timestamp)),
                response.getHeaders().getFirst(
                        WorkflowGatewayIdentity.SIGNATURE_HEADER));
        assertNull(response.getHeaders().getFirst(WorkflowInternalApiKey.HEADER));
        assertEquals("no-store", response.getHeaders().getCacheControl());
    }

    @Test
    void authWorkflowReturnsUnauthorizedWhenCredentialInvalid() {
        when(gatewayAuthService.authenticateWorkflow(null)).thenThrow(new GatewayAuthException("invalid credential"));

        ResponseEntity<Void> response = controller.authWorkflow(
                null, "/workflow/v1/resume", "POST");

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNull(response.getHeaders().getFirst("X-Consumer-Username"));
        assertNull(response.getHeaders().getFirst(WorkflowInternalApiKey.HEADER));
        assertNull(response.getHeaders().getFirst(
                WorkflowGatewayIdentity.SIGNATURE_HEADER));
        assertEquals("no-store", response.getHeaders().getCacheControl());
    }

    @Test
    void authWorkflowSignsRuntimeReadPath() {
        when(gatewayAuthService.authenticateWorkflow("Bearer key:secret")).thenReturn("app-123");

        ResponseEntity<Void> response = controller.authWorkflow(
                "Bearer key:secret",
                "/openapi/v1/runs/run-123?view=status",
                "GET");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        String timestamp = response.getHeaders().getFirst(
                WorkflowGatewayIdentity.TIMESTAMP_HEADER);
        assertEquals(
                WorkflowGatewayIdentity.sign(
                        INTERNAL_KEY,
                        "GET",
                        "/openapi/v1/runs/run-123",
                        "app-123",
                        Long.parseLong(timestamp)),
                response.getHeaders().getFirst(
                        WorkflowGatewayIdentity.SIGNATURE_HEADER));
    }

    @Test
    void authWorkflowFailsClosedWithoutExposingIdentityWhenInternalKeyIsInvalid() {
        when(gatewayAuthService.authenticateWorkflow("Bearer key:secret"))
                .thenReturn("app-123");
        GatewayAuthController invalidController =
                new GatewayAuthController(gatewayAuthService, "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY");

        ResponseEntity<Void> response =
                invalidController.authWorkflow(
                        "Bearer key:secret", "/workflow/v1/resume", "POST");

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNull(response.getHeaders().getFirst("X-Consumer-Username"));
        assertNull(response.getHeaders().getFirst(WorkflowInternalApiKey.HEADER));
        assertEquals("no-store", response.getHeaders().getCacheControl());
    }

    @Test
    void authWorkflowRejectsNonPublicOriginalRequestBeforeCredentialLookup() {
        ResponseEntity<Void> response = controller.authWorkflow(
                "Bearer key:secret", "/workflow/v1/run", "POST");

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNull(response.getHeaders().getFirst("X-Consumer-Username"));
        assertNull(response.getHeaders()
                .getFirst(
                        WorkflowGatewayIdentity.SIGNATURE_HEADER));
        verifyNoInteractions(gatewayAuthService);
    }
}
