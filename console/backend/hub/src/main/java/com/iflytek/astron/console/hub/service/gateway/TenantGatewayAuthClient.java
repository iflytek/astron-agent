package com.iflytek.astron.console.hub.service.gateway;

import java.util.Optional;

public interface TenantGatewayAuthClient {

    Optional<String> verify(String apiKey, String apiSecret);
}
