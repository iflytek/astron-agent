package com.iflytek.astron.console.hub.controller.gateway;

import com.iflytek.astron.console.hub.service.gateway.GatewayAuthException;
import com.iflytek.astron.console.hub.service.gateway.GatewayAuthService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/gateway/auth")
public class GatewayAuthController {

    private static final String CONSUMER_USERNAME_HEADER = "X-Consumer-Username";

    private final GatewayAuthService gatewayAuthService;

    public GatewayAuthController(GatewayAuthService gatewayAuthService) {
        this.gatewayAuthService = gatewayAuthService;
    }

    @GetMapping("/workflow")
    public ResponseEntity<Void> authWorkflow(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        try {
            String appId = gatewayAuthService.authenticateWorkflow(authorizationHeader);
            return ResponseEntity.noContent()
                    .cacheControl(CacheControl.noStore())
                    .header(CONSUMER_USERNAME_HEADER, appId)
                    .build();
        } catch (GatewayAuthException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .cacheControl(CacheControl.noStore())
                    .build();
        }
    }
}
