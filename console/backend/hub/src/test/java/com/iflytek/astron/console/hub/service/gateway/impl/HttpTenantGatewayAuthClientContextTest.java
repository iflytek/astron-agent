package com.iflytek.astron.console.hub.service.gateway.impl;

import com.iflytek.astron.console.hub.service.gateway.TenantGatewayAuthClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class HttpTenantGatewayAuthClientContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(HttpTenantGatewayAuthClient.class)
            .withPropertyValues("tenant.verify-app-auth=http://core-tenant:5052/v2/app/key/verify");

    @Test
    void createsTenantGatewayAuthClientFromSpringContext() {
        contextRunner.run(context -> assertThat(context).hasSingleBean(TenantGatewayAuthClient.class));
    }
}
