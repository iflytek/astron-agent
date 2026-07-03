package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import lombok.RequiredArgsConstructor;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * Synchronous (stream=false) HTTP client for the core workflow chat endpoint. Kept as a separate
 * bean so {@link AgentWorkflowRuntimeService} can be unit-tested with a mock.
 */
@Component
@RequiredArgsConstructor
public class WorkflowChatRunClient {

    private static final MediaType JSON_MEDIA = MediaType.parse("application/json; charset=utf-8");
    private static final OkHttpClient CLIENT = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(180, TimeUnit.SECONDS)
            .callTimeout(180, TimeUnit.SECONDS)
            .build();

    private final CommonConfig commonConfig;

    @Value("${workflow.chatUrl}")
    private String chatUrl;

    /** POST the chat request and return the raw response body (final LLMGenerate JSON frame). */
    public String chat(JSONObject requestBody) throws IOException {
        Request request = new Request.Builder()
                .url(chatUrl)
                .header("X-Consumer-Username", commonConfig.getAppId())
                .header("Authorization", "Bearer " + commonConfig.getApiKey() + ":" + commonConfig.getApiSecret())
                .post(RequestBody.create(requestBody.toJSONString(), JSON_MEDIA))
                .build();
        try (Response response = CLIENT.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Workflow chat HTTP " + response.code());
            }
            return response.body() == null ? "" : response.body().string();
        }
    }
}
