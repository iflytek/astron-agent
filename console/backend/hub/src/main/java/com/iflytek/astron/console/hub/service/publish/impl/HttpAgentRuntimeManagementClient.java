package com.iflytek.astron.console.hub.service.publish.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.service.publish.AgentRuntimeInternalKeyProvider;
import com.iflytek.astron.console.hub.service.publish.AgentRuntimeManagementClient;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class HttpAgentRuntimeManagementClient implements AgentRuntimeManagementClient {

    private static final MediaType JSON_MEDIA_TYPE =
            MediaType.parse("application/json; charset=utf-8");
    private final OkHttpClient httpClient;
    private final String managementUrl;
    private final AgentRuntimeInternalKeyProvider keyProvider;

    @Autowired
    public HttpAgentRuntimeManagementClient(
            AgentRuntimeInternalKeyProvider keyProvider,
            @Value("${agent.runtime.management-url:http://agent-runtime-api:8790/internal/v1}") String managementUrl) {
        this(new OkHttpClient(), managementUrl, keyProvider);
    }

    HttpAgentRuntimeManagementClient(
            OkHttpClient httpClient,
            String managementUrl,
            String configuredKey,
            String keyFile) {
        this(
                httpClient,
                managementUrl,
                new AgentRuntimeInternalKeyProvider(configuredKey, keyFile));
    }

    private HttpAgentRuntimeManagementClient(
            OkHttpClient httpClient,
            String managementUrl,
            AgentRuntimeInternalKeyProvider keyProvider) {
        this.httpClient = httpClient;
        this.managementUrl = StringUtils.removeEnd(managementUrl, "/");
        this.keyProvider = keyProvider;
    }

    @Override
    public RuntimeRelease publish(
            String agentId,
            String spaceId,
            String version,
            String mode,
            JSONObject snapshot,
            String appId) {
        String key = keyProvider.getRequired();
        JSONObject releaseRequest = new JSONObject();
        releaseRequest.put("agent_id", agentId);
        releaseRequest.put("space_id", spaceId);
        releaseRequest.put("version", version);
        releaseRequest.put("mode", mode);
        releaseRequest.put("snapshot", snapshot);
        releaseRequest.put("is_default", true);
        JSONObject release = post("/agent-releases", releaseRequest, key);

        JSONObject bindingRequest = new JSONObject();
        bindingRequest.put("app_id", appId);
        bindingRequest.put("agent_id", agentId);
        bindingRequest.put("space_id", spaceId);
        bindingRequest.put("enabled", true);
        try {
            post("/app-bindings", bindingRequest, key);
        } catch (RuntimeException bindingFailure) {
            try {
                post(
                        "/agent-releases/" + release.getString("release_id") + "/disable",
                        new JSONObject(),
                        key);
            } catch (RuntimeException compensationFailure) {
                bindingFailure.addSuppressed(compensationFailure);
                log.error(
                        "Agent Runtime release compensation failed, releaseId={}",
                        release.getString("release_id"));
            }
            throw bindingFailure;
        }

        return new RuntimeRelease(
                release.getString("release_id"), release.getString("version"));
    }

    @Override
    public void disable(String releaseId) {
        post(
                "/agent-releases/" + releaseId + "/disable",
                new JSONObject(),
                keyProvider.getRequired());
    }

    private JSONObject post(String path, JSONObject body, String key) {
        Request request = new Request.Builder()
                .url(managementUrl + path)
                .header(AgentRuntimeInternalKeyProvider.HEADER, key)
                .post(RequestBody.create(body.toJSONString(), JSON_MEDIA_TYPE))
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            ResponseBody responseBody = response.body();
            String raw = responseBody == null ? "" : responseBody.string();
            if (!response.isSuccessful()) {
                log.error(
                        "Agent Runtime management request failed, path={}, status={}",
                        path,
                        response.code());
                throw new IllegalStateException("Agent Runtime rejected management request");
            }
            JSONObject parsed = JSON.parseObject(raw);
            if (parsed == null) {
                throw new IllegalStateException("Agent Runtime returned an empty response");
            }
            return parsed;
        } catch (IOException exception) {
            log.error(
                    "Agent Runtime management request failed, path={}, errorType={}",
                    path,
                    exception.getClass().getSimpleName());
            throw new IllegalStateException("Agent Runtime management request failed", exception);
        }
    }

}
