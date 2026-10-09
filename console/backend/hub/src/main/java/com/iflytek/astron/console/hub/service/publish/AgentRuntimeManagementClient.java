package com.iflytek.astron.console.hub.service.publish;

import com.alibaba.fastjson2.JSONObject;

/** Publishes immutable agent snapshots and application bindings to Agent Runtime. */
public interface AgentRuntimeManagementClient {

    RuntimeRelease publish(
            String agentId,
            String spaceId,
            String version,
            String mode,
            JSONObject snapshot,
            String appId);

    void disable(String releaseId);

    record RuntimeRelease(String releaseId, String version) {}
}
