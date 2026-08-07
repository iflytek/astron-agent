package com.iflytek.astron.console.toolkit.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@Data
@ConfigurationProperties(prefix = "workflow-trace")
public class WorkflowTraceProperties {
    private String esUrl;
    private String esIndex;
    private String esUsername;
    private String esPassword;
    private int esTimeoutSeconds;
}
